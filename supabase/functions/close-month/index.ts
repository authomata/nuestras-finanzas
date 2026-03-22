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

    const { year, month } = await req.json()

    if (!year || !month) {
      return new Response(JSON.stringify({ error: 'year and month are required' }), { status: 400, headers: corsHeaders })
    }

    // Get household
    const { data: member } = await supabase
      .from('household_members')
      .select('household_id')
      .eq('user_id', user.id)
      .single()

    if (!member) {
      return new Response(JSON.stringify({ error: 'No household found' }), { status: 404, headers: corsHeaders })
    }

    const householdId = member.household_id

    // Get monthly period
    const { data: period, error: periodError } = await supabase
      .from('monthly_periods')
      .select('id, status')
      .eq('household_id', householdId)
      .eq('year', year)
      .eq('month', month)
      .single()

    if (periodError || !period) {
      return new Response(JSON.stringify({ error: 'Monthly period not found' }), { status: 404, headers: corsHeaders })
    }

    if (period.status === 'closed') {
      return new Response(JSON.stringify({ error: 'Month already closed' }), { status: 400, headers: corsHeaders })
    }

    // Get all category snapshots for this month
    const { data: snapshots, error: snapshotError } = await supabase
      .from('budget_category_snapshots')
      .select('id, category_id, allocated_amount, spent_amount')
      .eq('household_id', householdId)
      .eq('year', year)
      .eq('month', month)

    if (snapshotError) throw snapshotError

    // Calculate total surplus (only positive surplus — categories can't go below 0 for savings calc)
    let totalSurplus = 0
    if (snapshots) {
      for (const snap of snapshots) {
        const surplus = snap.allocated_amount - snap.spent_amount
        if (surplus > 0) totalSurplus += surplus
      }
    }

    totalSurplus = parseFloat(totalSurplus.toFixed(2))
    const today = new Date().toISOString().split('T')[0]

    // Transfer surplus to savings if > 0
    if (totalSurplus > 0) {
      // Insert savings entry
      const { error: savingsEntryError } = await supabase
        .from('savings_entries')
        .insert({
          household_id: householdId,
          amount: totalSurplus,
          source_type: 'month_surplus',
          notes: `Excedente de presupuesto ${month}/${year}`,
          entry_date: today,
          created_by: user.id,
        })
      if (savingsEntryError) throw savingsEntryError

      // Update savings fund
      const { data: fund } = await supabase
        .from('savings_fund')
        .select('id, total_balance')
        .eq('household_id', householdId)
        .single()

      if (fund) {
        await supabase
          .from('savings_fund')
          .update({ total_balance: fund.total_balance + totalSurplus })
          .eq('id', fund.id)
      } else {
        await supabase.from('savings_fund').insert({
          household_id: householdId,
          total_balance: totalSurplus,
        })
      }
    }

    // Close the monthly period
    const { error: closeError } = await supabase
      .from('monthly_periods')
      .update({
        status: 'closed',
        surplus_transferred: totalSurplus,
        closed_at: new Date().toISOString(),
      })
      .eq('id', period.id)
    if (closeError) throw closeError

    // Open next month period
    const nextMonth = month === 12 ? 1 : month + 1
    const nextYear = month === 12 ? year + 1 : year

    await supabase
      .from('monthly_periods')
      .upsert(
        { household_id: householdId, year: nextYear, month: nextMonth, status: 'open' },
        { onConflict: 'household_id,year,month', ignoreDuplicates: true }
      )

    // Create snapshots for next month based on current budget categories
    const { data: categories } = await supabase
      .from('budget_categories')
      .select('id, monthly_amount')
      .eq('household_id', householdId)

    if (categories && categories.length > 0) {
      const nextSnapshots = categories.map((cat) => ({
        category_id: cat.id,
        household_id: householdId,
        year: nextYear,
        month: nextMonth,
        allocated_amount: cat.monthly_amount,
        spent_amount: 0,
      }))
      await supabase
        .from('budget_category_snapshots')
        .upsert(nextSnapshots, { onConflict: 'category_id,year,month', ignoreDuplicates: true })
    }

    return new Response(
      JSON.stringify({ success: true, surplus_transferred: totalSurplus }),
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
