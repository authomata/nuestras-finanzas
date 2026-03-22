import { formatCLP } from '../lib/format'
import type { BudgetCategory, BudgetCategorySnapshot } from '../types/database'

interface Props {
  category: BudgetCategory
  snapshot: BudgetCategorySnapshot | undefined
}

export function BudgetCategoryBar({ category, snapshot }: Props) {
  const spent = snapshot?.spent_amount ?? 0
  const allocated = snapshot?.allocated_amount ?? category.monthly_amount
  const pct = allocated > 0 ? Math.min(Math.round((spent / allocated) * 100), 100) : 0
  const overBudget = spent > allocated

  const barColor =
    pct >= category.alert_threshold_pct
      ? 'bg-red-500'
      : pct >= 60
      ? 'bg-amber-400'
      : 'bg-emerald-500'

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-1.5 font-medium text-slate-700">
          <span>{category.icon || '💰'}</span>
          {category.name}
        </span>
        <span className={`text-xs ${overBudget ? 'text-red-600 font-semibold' : 'text-slate-500'}`}>
          {formatCLP(spent)} / {formatCLP(allocated)}
        </span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {overBudget && (
        <p className="text-xs text-red-600">Excedido por {formatCLP(spent - allocated)}</p>
      )}
    </div>
  )
}
