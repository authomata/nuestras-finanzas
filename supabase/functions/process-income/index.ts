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

    const { cost_center_id, amount, entry_date, notes } = await req.json()

    if (!cost_center_id || !amount || amount <= 0) {
      return new Response(JSON.stringify({ error: 'Invalid input' }), { status: 400, headers: corsHeaders })
    }

    // Get cost center (validates access via RLS)
    const { data: costCenter, error: ccError } = await supabase
      .from('cost_centers')
      .select('id, household_id, savings_pct, current_balance, name')
      .eq('id', cost_center_id)
      .single()

    if (ccError || !costCenter) {
      return new Response(JSON.stringify({ error: 'Cost center not found' }), { status: 404, headers: corsHeaders })
    }

    const savingsAmount = parseFloat((amount * costCenter.savings_pct / 100).toFixed(2))
    const netAmount = parseFloat((amount - savingsAmount).toFixed(2))
    const today = entry_date || new Date().toISOString().split('T')[0]

    // 1. Insert income entry
    const { error: incomeError } = await supabase
      .from('income_entries')
      .insert({
        cost_center_id,
        amount,
        savings_amount: savingsAmount,
        notes: notes || null,
        entry_date: today,
        created_by: user.id,
      })
    if (incomeError) throw incomeError

    // 2. Update cost center balance
    const { error: balanceError } = await supabase
      .from('cost_centers')
      .update({ current_balance: costCenter.current_balance + netAmount })
      .eq('id', cost_center_id)
    if (balanceError) throw balanceError

    // 3. Insert savings entry
    const { error: savingsEntryError } = await supabase
      .from('savings_entries')
      .insert({
        household_id: costCenter.household_id,
        amount: savingsAmount,
        source_type: 'income_pct',
        source_cost_center_id: cost_center_id,
        notes: `${costCenter.savings_pct}% de ingreso en ${costCenter.name}`,
        entry_date: today,
        created_by: user.id,
      })
    if (savingsEntryError) throw savingsEntryError

    // 4. Update savings fund balance
    const { data: fund, error: fundError } = await supabase
      .from('savings_fund')
      .select('id, total_balance')
      .eq('household_id', costCenter.household_id)
      .single()

    if (fundError || !fund) {
      // Create fund if it doesn't exist
      await supabase.from('savings_fund').insert({
        household_id: costCenter.household_id,
        total_balance: savingsAmount,
      })
    } else {
      await supabase
        .from('savings_fund')
        .update({ total_balance: fund.total_balance + savingsAmount })
        .eq('id', fund.id)
    }

    // 5. Ensure monthly period exists for this month
    const entryDateObj = new Date(today)
    const year = entryDateObj.getFullYear()
    const month = entryDateObj.getMonth() + 1

    await supabase
      .from('monthly_periods')
      .upsert({ household_id: costCenter.household_id, year, month, status: 'open' }, { onConflict: 'household_id,year,month', ignoreDuplicates: true })

    // 6. Ensure budget_category_snapshots exist for this month
    const { data: categories } = await supabase
      .from('budget_categories')
      .select('id, monthly_amount')
      .eq('household_id', costCenter.household_id)

    if (categories && categories.length > 0) {
      const snapshots = categories.map((cat) => ({
        category_id: cat.id,
        household_id: costCenter.household_id,
        year,
        month,
        allocated_amount: cat.monthly_amount,
        spent_amount: 0,
      }))
      await supabase
        .from('budget_category_snapshots')
        .upsert(snapshots, { onConflict: 'category_id,year,month', ignoreDuplicates: true })
    }

    return new Response(
      JSON.stringify({ success: true, net_amount: netAmount, savings_amount: savingsAmount }),
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
