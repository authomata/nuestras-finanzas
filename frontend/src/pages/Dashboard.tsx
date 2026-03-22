import { useState } from 'react'
import { PiggyBank, Plus, RotateCcw, Calendar } from 'lucide-react'
import { useDashboard } from '../hooks/useDashboard'
import { useHousehold } from '../hooks/useHousehold'
import { CostCenterCard } from '../components/CostCenterCard'
import { BudgetCategoryBar } from '../components/BudgetCategoryBar'
import { AlertBanner } from '../components/AlertBanner'
import { TransactionForm } from '../components/TransactionForm'
import { formatCLP, formatMonth } from '../lib/format'
import { supabase } from '../lib/supabase'

export function Dashboard() {
  const { data, loading, refresh } = useDashboard()
  const { household } = useHousehold()
  const [showTxForm, setShowTxForm] = useState(false)
  const [closingMonth, setClosingMonth] = useState(false)

  const now = new Date()

  async function handleCloseMonth() {
    if (!confirm(`¿Cerrar el mes de ${formatMonth(now.getFullYear(), now.getMonth() + 1)}? El excedente irá al fondo de ahorro.`)) return
    setClosingMonth(true)
    const res = await supabase.functions.invoke('close-month', {
      body: { year: now.getFullYear(), month: now.getMonth() + 1 },
    })
    if (res.error) alert('Error al cerrar el mes: ' + res.error.message)
    else {
      const surplus = res.data?.surplus_transferred ?? 0
      alert(`Mes cerrado. ${formatCLP(surplus)} transferidos al fondo de ahorro.`)
      refresh()
    }
    setClosingMonth(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400">
        <RotateCcw size={20} className="animate-spin mr-2" /> Cargando...
      </div>
    )
  }

  const { costCenters = [], categories = [], snapshots = [], recentTransactions = [], savingsBalance = 0, currentPeriod, alerts = [] } = data || {}

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">{household?.name || 'Nuestras Finanzas'}</h1>
          <p className="text-sm text-slate-400">{formatMonth(now.getFullYear(), now.getMonth() + 1)}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowTxForm(true)}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
          >
            <Plus size={16} /> Gasto
          </button>
        </div>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && <AlertBanner alerts={alerts} />}

      {/* Savings Fund Summary */}
      <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-5 text-white">
        <div className="flex items-center gap-2 mb-1">
          <PiggyBank size={18} />
          <span className="text-sm font-medium opacity-90">Fondo de ahorro</span>
        </div>
        <p className="text-3xl font-bold">{formatCLP(savingsBalance)}</p>
        <p className="text-sm opacity-70 mt-1">acumulado total</p>
      </div>

      {/* Cost Centers */}
      <div>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Centros de costo</h2>
        <div className="grid gap-3">
          {costCenters.map((cc) => (
            <CostCenterCard key={cc.id} costCenter={cc} onRefresh={refresh} />
          ))}
          {costCenters.length === 0 && (
            <p className="text-slate-400 text-sm py-4 text-center">
              No hay centros de costo. <a href="/cost-centers" className="text-indigo-600 underline">Crear uno</a>
            </p>
          )}
        </div>
      </div>

      {/* Budget Categories */}
      <div>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Presupuesto del mes</h2>
        {categories.length === 0 ? (
          <p className="text-slate-400 text-sm py-4 text-center">
            No hay categorías. <a href="/budget" className="text-indigo-600 underline">Configurar presupuesto</a>
          </p>
        ) : (
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 space-y-4">
            {categories.map((cat) => (
              <BudgetCategoryBar
                key={cat.id}
                category={cat}
                snapshot={snapshots.find((s) => s.category_id === cat.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Recent Transactions */}
      <div>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Últimos gastos</h2>
        {recentTransactions.length === 0 ? (
          <p className="text-slate-400 text-sm py-4 text-center">Sin transacciones este mes</p>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 divide-y divide-slate-50">
            {recentTransactions.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="text-lg">{(tx.budget_categories as any)?.icon || '💸'}</span>
                  <div>
                    <p className="text-sm font-medium text-slate-800">{tx.description}</p>
                    <p className="text-xs text-slate-400">{tx.transaction_date} · {(tx.budget_categories as any)?.name}</p>
                  </div>
                </div>
                <span className="text-sm font-semibold text-red-600">-{formatCLP(tx.amount)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Close Month */}
      {currentPeriod?.status !== 'closed' && (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-700">Cierre de mes</p>
              <p className="text-xs text-slate-400">El excedente del presupuesto irá al fondo de ahorro</p>
            </div>
            <button
              onClick={handleCloseMonth}
              disabled={closingMonth}
              className="flex items-center gap-1.5 bg-slate-700 hover:bg-slate-800 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
            >
              <Calendar size={14} />
              {closingMonth ? 'Cerrando...' : 'Cerrar mes'}
            </button>
          </div>
        </div>
      )}

      {showTxForm && data && household && (
        <TransactionForm
          categories={categories}
          costCenters={costCenters}
          householdId={household.id}
          onClose={() => setShowTxForm(false)}
          onSuccess={() => { setShowTxForm(false); refresh() }}
        />
      )}
    </div>
  )
}
