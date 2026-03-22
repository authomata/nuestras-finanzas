import { useState } from 'react'
import { TrendingUp, PiggyBank } from 'lucide-react'
import { formatCLP } from '../lib/format'
import { IncomeForm } from './IncomeForm'
import type { CostCenter } from '../types/database'

interface Props {
  costCenter: CostCenter
  onRefresh: () => void
}

export function CostCenterCard({ costCenter, onRefresh }: Props) {
  const [showIncomeForm, setShowIncomeForm] = useState(false)

  return (
    <div
      className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100"
      style={{ borderLeftColor: costCenter.color, borderLeftWidth: 4 }}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold text-slate-800">{costCenter.name}</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            <PiggyBank size={11} className="inline mr-1" />
            {costCenter.savings_pct}% al ahorro
          </p>
        </div>
        <button
          onClick={() => setShowIncomeForm(true)}
          className="flex items-center gap-1 text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-lg font-medium transition-colors"
        >
          <TrendingUp size={13} />
          Registrar ingreso
        </button>
      </div>

      <p className="text-2xl font-bold text-slate-900">{formatCLP(costCenter.current_balance)}</p>
      <p className="text-xs text-slate-400 mt-0.5">saldo disponible</p>

      {showIncomeForm && (
        <IncomeForm
          costCenter={costCenter}
          onClose={() => setShowIncomeForm(false)}
          onSuccess={() => { setShowIncomeForm(false); onRefresh() }}
        />
      )}
    </div>
  )
}
