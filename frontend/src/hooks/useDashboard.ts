import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { CostCenter, BudgetCategory, BudgetCategorySnapshot, Transaction } from '../types/database'

interface DashboardData {
  costCenters: CostCenter[]
  categories: BudgetCategory[]
  snapshots: BudgetCategorySnapshot[]
  recentTransactions: (Transaction & { budget_categories: { name: string; icon: string | null } | null })[]
  savingsBalance: number
  currentPeriod: { year: number; month: number; status: string } | null
  alerts: { categoryId: string; name: string; pct: number; threshold: number }[]
}

export function useDashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    try {
      const now = new Date()
      const year = now.getFullYear()
      const month = now.getMonth() + 1

      const [
        { data: costCenters },
        { data: categories },
        { data: snapshots },
        { data: recentTx },
        { data: fund },
        { data: period },
      ] = await Promise.all([
        supabase.from('cost_centers').select('*').order('created_at'),
        supabase.from('budget_categories').select('*').order('sort_order'),
        supabase.from('budget_category_snapshots').select('*').eq('year', year).eq('month', month),
        supabase
          .from('transactions')
          .select('*, budget_categories(name, icon)')
          .eq('type', 'expense')
          .order('transaction_date', { ascending: false })
          .limit(8),
        supabase.from('savings_fund').select('total_balance').single(),
        supabase
          .from('monthly_periods')
          .select('*')
          .eq('year', year)
          .eq('month', month)
          .maybeSingle(),
      ])

      const snapshotsArr = snapshots || []
      const categoriesArr = categories || []

      const alerts = categoriesArr
        .map((cat) => {
          const snap = snapshotsArr.find((s) => s.category_id === cat.id)
          if (!snap || snap.allocated_amount === 0) return null
          const pct = Math.round((snap.spent_amount / snap.allocated_amount) * 100)
          if (pct >= cat.alert_threshold_pct) {
            return { categoryId: cat.id, name: cat.name, pct, threshold: cat.alert_threshold_pct }
          }
          return null
        })
        .filter(Boolean) as DashboardData['alerts']

      setData({
        costCenters: costCenters || [],
        categories: categoriesArr,
        snapshots: snapshotsArr,
        recentTransactions: (recentTx || []) as any,
        savingsBalance: fund?.total_balance ?? 0,
        currentPeriod: period || null,
        alerts,
      })
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  return { data, loading, error, refresh: load }
}
