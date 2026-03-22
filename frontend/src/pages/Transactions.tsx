import { useState, useEffect } from 'react'
import { Plus, Trash2, Filter } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useHousehold } from '../hooks/useHousehold'
import { formatCLP } from '../lib/format'
import { TransactionForm } from '../components/TransactionForm'
import type { BudgetCategory, CostCenter, Transaction } from '../types/database'

type TxWithRels = Transaction & {
  budget_categories: { name: string; icon: string | null } | null
  cost_centers: { name: string; color: string } | null
  profiles: { display_name: string | null } | null
}

export function Transactions() {
  const { household } = useHousehold()
  const [transactions, setTransactions] = useState<TxWithRels[]>([])
  const [categories, setCategories] = useState<BudgetCategory[]>([])
  const [costCenters, setCostCenters] = useState<CostCenter[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [filterCat, setFilterCat] = useState('')

  async function load() {
    const [{ data: txs }, { data: cats }, { data: ccs }] = await Promise.all([
      supabase
        .from('transactions')
        .select('*, budget_categories(name, icon), cost_centers(name, color)')
        .eq('type', 'expense')
        .order('transaction_date', { ascending: false })
        .limit(100),
      supabase.from('budget_categories').select('*').order('sort_order'),
      supabase.from('cost_centers').select('*').order('created_at'),
    ])
    setTransactions((txs || []) as any)
    setCategories(cats || [])
    setCostCenters(ccs || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleDelete(tx: TxWithRels) {
    if (!confirm('¿Eliminar esta transacción?')) return

    await supabase.from('transactions').delete().eq('id', tx.id)

    // Reverse snapshot
    if (tx.category_id) {
      const d = new Date(tx.transaction_date)
      const { data: snap } = await supabase
        .from('budget_category_snapshots')
        .select('id, spent_amount')
        .eq('category_id', tx.category_id)
        .eq('year', d.getFullYear())
        .eq('month', d.getMonth() + 1)
        .maybeSingle()
      if (snap) {
        await supabase.from('budget_category_snapshots')
          .update({ spent_amount: Math.max(0, snap.spent_amount - tx.amount) })
          .eq('id', snap.id)
      }
    }

    // Reverse cost center balance
    if (tx.cost_center_id) {
      const { data: cc } = await supabase.from('cost_centers').select('id, current_balance').eq('id', tx.cost_center_id).single()
      if (cc) await supabase.from('cost_centers').update({ current_balance: cc.current_balance + tx.amount }).eq('id', cc.id)
    }

    load()
  }

  const filtered = filterCat ? transactions.filter((t) => t.category_id === filterCat) : transactions

  // Group by month
  const grouped: Record<string, TxWithRels[]> = {}
  for (const tx of filtered) {
    const d = new Date(tx.transaction_date)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(tx)
  }

  if (loading) return <div className="text-slate-400 text-center py-10">Cargando...</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">Transacciones</h1>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-medium"
        >
          <Plus size={16} /> Nuevo gasto
        </button>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2">
        <Filter size={15} className="text-slate-400" />
        <select
          value={filterCat}
          onChange={(e) => setFilterCat(e.target.value)}
          className="border border-slate-200 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
        >
          <option value="">Todas las categorías</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
        </select>
      </div>

      {filtered.length === 0 && (
        <p className="text-slate-400 text-center py-10">Sin transacciones</p>
      )}

      {Object.entries(grouped)
        .sort(([a], [b]) => b.localeCompare(a))
        .map(([monthKey, txs]) => {
          const [y, m] = monthKey.split('-').map(Number)
          const monthLabel = new Date(y, m - 1, 1).toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })
          const total = txs.reduce((sum, t) => sum + t.amount, 0)

          return (
            <div key={monthKey}>
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-semibold text-slate-500 capitalize">{monthLabel}</h2>
                <span className="text-sm font-semibold text-red-600">-{formatCLP(total)}</span>
              </div>
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 divide-y divide-slate-50">
                {txs.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between px-4 py-3 group">
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{(tx.budget_categories as any)?.icon || '💸'}</span>
                      <div>
                        <p className="text-sm font-medium text-slate-800">{tx.description}</p>
                        <p className="text-xs text-slate-400">
                          {tx.transaction_date} · {(tx.budget_categories as any)?.name || '—'}
                          {tx.cost_center_id && ` · ${(tx.cost_centers as any)?.name}`}
                          {tx.is_recurring && ' · 🔁'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-red-600">-{formatCLP(tx.amount)}</span>
                      <button
                        onClick={() => handleDelete(tx)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-300 hover:text-red-500 transition-opacity"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}

      {showForm && household && (
        <TransactionForm
          categories={categories}
          costCenters={costCenters}
          householdId={household.id}
          onClose={() => setShowForm(false)}
          onSuccess={() => { setShowForm(false); load() }}
        />
      )}
    </div>
  )
}
