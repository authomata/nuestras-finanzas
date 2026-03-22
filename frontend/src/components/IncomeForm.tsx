import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { formatCLP } from '../lib/format'
import type { CostCenter } from '../types/database'
import { X } from 'lucide-react'

interface Props {
  costCenter: CostCenter
  onClose: () => void
  onSuccess: () => void
}

export function IncomeForm({ costCenter, onClose, onSuccess }: Props) {
  const [amount, setAmount] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const numericAmount = parseFloat(amount.replace(/\./g, '').replace(',', '.')) || 0
  const savingsPreview = numericAmount * costCenter.savings_pct / 100
  const netPreview = numericAmount - savingsPreview

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (numericAmount <= 0) { setError('Ingresa un monto válido'); return }
    setLoading(true)
    setError('')

    const { data: { session } } = await supabase.auth.getSession()
    const res = await supabase.functions.invoke('process-income', {
      body: { cost_center_id: costCenter.id, amount: numericAmount, notes: notes || null },
    })

    if (res.error) {
      setError(res.error.message || 'Error al registrar el ingreso')
      setLoading(false)
      return
    }

    onSuccess()
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-slate-800">Registrar ingreso</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>

        <p className="text-sm text-slate-500 mb-4">
          Centro: <strong>{costCenter.name}</strong> · {costCenter.savings_pct}% irá al fondo de ahorro
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Monto total</label>
            <input
              type="number"
              min="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="1500000"
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              required
            />
          </div>

          {numericAmount > 0 && (
            <div className="bg-slate-50 rounded-xl p-3 text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Va al fondo de ahorro ({costCenter.savings_pct}%)</span>
                <span className="font-medium text-emerald-600">{formatCLP(savingsPreview)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Disponible para gastos</span>
                <span className="font-semibold text-slate-800">{formatCLP(netPreview)}</span>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Notas (opcional)</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Sueldo de marzo"
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl transition-colors"
          >
            {loading ? 'Registrando...' : 'Registrar ingreso'}
          </button>
        </form>
      </div>
    </div>
  )
}
