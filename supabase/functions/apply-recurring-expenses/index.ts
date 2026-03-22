import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })
    }

    const body = await req.json().catch(() => ({}))
    const year = body.year || new Date().getFullYear()
    const month = body.month || new Date().getMonth() + 1

    const { data: member } = await supabase
      .from('household_members')
      .select('household_id')
      .eq('user_id', user.id)
      .single()

    if (!member) {
      return new Response(JSON.stringify({ error: 'No household found' }), { status: 404, headers: corsHeaders })
    }

    const householdId = member.household_id

    // Get all active recurring expenses for this household
    const { data: recurringExpenses, error: recError } = await supabase
      .from('recurring_expenses')
      .select(`
        id,
        description,
        amount,
        day_of_month,
        category_id,
        budget_categories!inner(id, household_id, cost_center_id, pool_type)
      `)
      .eq('active', true)
      .eq('budget_categories.household_id', householdId)

    if (recError) throw recError
    if (!recurringExpenses || recurringExpenses.length === 0) {
      return new Response(JSON.stringify({ success: true, applied: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    let applied = 0
    const errors: string[] = []

    for (const expense of recurringExpenses) {
      const txDate = `${year}-${String(month).padStart(2, '0')}-${String(expense.day_of_month).padStart(2, '0')}`

      // Check if already applied this month
      const { data: existing } = await supabase
        .from('transactions')
        .select('id')
        .eq('household_id', householdId)
        .eq('recurring_expense_id', expense.id)
        .gte('transaction_date', `${year}-${String(month).padStart(2, '0')}-01`)
        .lte('transaction_date', `${year}-${String(month).padStart(2, '0')}-31`)
        .maybeSingle()

      if (existing) continue // already applied

      const category = expense.budget_categories as any
      const costCenterId = category.pool_type === 'specific' ? category.cost_center_id : null

      // Insert transaction
      const { error: txError } = await supabase
        .from('transactions')
        .insert({
          household_id: householdId,
          amount: expense.amount,
          description: expense.description,
          transaction_date: txDate,
          type: 'expense',
          category_id: expense.category_id,
          cost_center_id: costCenterId,
          is_recurring: true,
          recurring_expense_id: expense.id,
          created_by: user.id,
        })

      if (txError) {
        errors.push(`Error on ${expense.description}: ${txError.message}`)
        continue
      }

      // Update budget_category_snapshot
      const { data: snapshot } = await supabase
        .from('budget_category_snapshots')
        .select('id, spent_amount')
        .eq('category_id', expense.category_id)
        .eq('year', year)
        .eq('month', month)
        .maybeSingle()

      if (snapshot) {
        await supabase
          .from('budget_category_snapshots')
          .update({ spent_amount: snapshot.spent_amount + expense.amount })
          .eq('id', snapshot.id)
      }

      // Deduct from cost center if specific
      if (costCenterId) {
        const { data: cc } = await supabase
          .from('cost_centers')
          .select('id, current_balance')
          .eq('id', costCenterId)
          .single()

        if (cc) {
          await supabase
            .from('cost_centers')
            .update({ current_balance: cc.current_balance - expense.amount })
            .eq('id', costCenterId)
        }
      }

      applied++
    }

    return new Response(
      JSON.stringify({ success: true, applied, errors }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
