import { useState } from 'react'
import { X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { BudgetCategory, CostCenter } from '../types/database'

interface Props {
  categories: BudgetCategory[]
  costCenters: CostCenter[]
  householdId: string
  onClose: () => void
  onSuccess: () => void
}

export function TransactionForm({ categories, costCenters, householdId, onClose, onSuccess }: Props) {
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [costCenterId, setCostCenterId] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const selectedCategory = categories.find((c) => c.id === categoryId)
  const requiresCostCenter = selectedCategory?.pool_type === 'specific'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const numAmount = parseFloat(amount)
    if (!numAmount || numAmount <= 0) { setError('Monto inválido'); return }
    if (!description.trim()) { setError('Ingresa una descripción'); return }
    if (!categoryId) { setError('Selecciona una categoría'); return }

    setLoading(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('No autenticado'); setLoading(false); return }

    const resolvedCostCenterId = requiresCostCenter
      ? (costCenterId || selectedCategory?.cost_center_id || null)
      : (costCenterId || null)

    const { error: txError } = await supabase.from('transactions').insert({
      household_id: householdId,
      amount: numAmount,
      description: description.trim(),
      transaction_date: date,
      type: 'expense',
      category_id: categoryId,
      cost_center_id: resolvedCostCenterId,
      created_by: user.id,
    })

    if (txError) { setError(txError.message); setLoading(false); return }

    // Update snapshot spent_amount
    const now = new Date(date)
    const year = now.getFullYear()
    const month = now.getMonth() + 1

    const { data: snap } = await supabase
      .from('budget_category_snapshots')
      .select('id, spent_amount')
      .eq('category_id', categoryId)
      .eq('year', year)
      .eq('month', month)
      .maybeSingle()

    if (snap) {
      await supabase
        .from('budget_category_snapshots')
        .update({ spent_amount: snap.spent_amount + numAmount })
        .eq('id', snap.id)
    }

    // Deduct from cost center if assigned
    if (resolvedCostCenterId) {
      const { data: cc } = await supabase
        .from('cost_centers')
        .select('id, current_balance')
        .eq('id', resolvedCostCenterId)
        .single()
      if (cc) {
        await supabase
          .from('cost_centers')
          .update({ current_balance: cc.current_balance - numAmount })
          .eq('id', cc.id)
      }
    }

    onSuccess()
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-slate-800">Nuevo gasto</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Monto</label>
            <input
              type="number"
              min="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="25000"
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Descripción</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Supermercado Unimarc"
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Categoría</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              required
            >
              <option value="">Seleccionar...</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Centro de costo {!requiresCostCenter && <span className="text-slate-400">(opcional)</span>}
            </label>
            <select
              value={costCenterId}
              onChange={(e) => setCostCenterId(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              required={requiresCostCenter}
            >
              <option value="">Pool compartido</option>
              {costCenters.map((cc) => (
                <option key={cc.id} value={cc.id}>{cc.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Fecha</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl transition-colors"
          >
            {loading ? 'Guardando...' : 'Registrar gasto'}
          </button>
        </form>
      </div>
    </div>
  )
}
