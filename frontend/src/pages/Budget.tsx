import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, Check, X, RefreshCw } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useHousehold } from '../hooks/useHousehold'
import { formatCLP } from '../lib/format'
import type { BudgetCategory, CostCenter, RecurringExpense } from '../types/database'

const ICONS = ['🍔', '🎬', '🏥', '🚗', '🏠', '👕', '📚', '✈️', '💊', '🐾', '🎮', '💡', '📱', '🛒', '🍷', '💰']
const COLORS = ['#10b981', '#6366f1', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16']

type Tab = 'categories' | 'recurring'

export function Budget() {
  const { household } = useHousehold()
  const [tab, setTab] = useState<Tab>('categories')
  const [categories, setCategories] = useState<BudgetCategory[]>([])
  const [costCenters, setCostCenters] = useState<CostCenter[]>([])
  const [recurringExpenses, setRecurringExpenses] = useState<(RecurringExpense & { budget_categories: { name: string } })[]>([])
  const [loading, setLoading] = useState(true)
  const [showCatForm, setShowCatForm] = useState(false)
  const [showRecForm, setShowRecForm] = useState(false)
  const [editingCatId, setEditingCatId] = useState<string | null>(null)
  const [applyingRec, setApplyingRec] = useState(false)

  // Category form state
  const [catName, setCatName] = useState('')
  const [catIcon, setCatIcon] = useState(ICONS[0])
  const [catColor, setCatColor] = useState(COLORS[0])
  const [catAmount, setCatAmount] = useState('')
  const [catThreshold, setCatThreshold] = useState('80')
  const [catPoolType, setCatPoolType] = useState<'shared' | 'specific'>('shared')
  const [catCostCenterId, setCatCostCenterId] = useState('')

  // Recurring form state
  const [recDesc, setRecDesc] = useState('')
  const [recAmount, setRecAmount] = useState('')
  const [recCategoryId, setRecCategoryId] = useState('')
  const [recDay, setRecDay] = useState('1')

  async function load() {
    const [{ data: cats }, { data: ccs }, { data: recs }] = await Promise.all([
      supabase.from('budget_categories').select('*').order('sort_order'),
      supabase.from('cost_centers').select('*').order('created_at'),
      supabase.from('recurring_expenses').select('*, budget_categories(name)').order('created_at'),
    ])
    setCategories(cats || [])
    setCostCenters(ccs || [])
    setRecurringExpenses((recs || []) as any)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleSaveCategory(e: React.FormEvent) {
    e.preventDefault()
    if (!household) return

    const payload = {
      name: catName,
      icon: catIcon,
      color: catColor,
      monthly_amount: parseFloat(catAmount) || 0,
      alert_threshold_pct: parseInt(catThreshold) || 80,
      pool_type: catPoolType,
      cost_center_id: catPoolType === 'specific' ? catCostCenterId || null : null,
    }

    if (editingCatId) {
      await supabase.from('budget_categories').update(payload).eq('id', editingCatId)
    } else {
      await supabase.from('budget_categories').insert({
        ...payload,
        household_id: household.id,
        sort_order: categories.length,
      })
    }
    setShowCatForm(false)
    setEditingCatId(null)
    resetCatForm()
    load()
  }

  function resetCatForm() { setCatName(''); setCatIcon(ICONS[0]); setCatColor(COLORS[0]); setCatAmount(''); setCatThreshold('80'); setCatPoolType('shared'); setCatCostCenterId('') }

  function startEditCat(cat: BudgetCategory) {
    setEditingCatId(cat.id)
    setCatName(cat.name)
    setCatIcon(cat.icon || ICONS[0])
    setCatColor(cat.color)
    setCatAmount(String(cat.monthly_amount))
    setCatThreshold(String(cat.alert_threshold_pct))
    setCatPoolType(cat.pool_type as 'shared' | 'specific')
    setCatCostCenterId(cat.cost_center_id || '')
    setShowCatForm(true)
  }

  async function handleDeleteCat(id: string) {
    if (!confirm('¿Eliminar categoría?')) return
    await supabase.from('budget_categories').delete().eq('id', id)
    load()
  }

  async function handleSaveRecurring(e: React.FormEvent) {
    e.preventDefault()
    await supabase.from('recurring_expenses').insert({
      category_id: recCategoryId,
      description: recDesc,
      amount: parseFloat(recAmount),
      day_of_month: parseInt(recDay),
    })
    setShowRecForm(false)
    setRecDesc(''); setRecAmount(''); setRecCategoryId(''); setRecDay('1')
    load()
  }

  async function handleToggleRecurring(id: string, active: boolean) {
    await supabase.from('recurring_expenses').update({ active: !active }).eq('id', id)
    load()
  }

  async function handleDeleteRecurring(id: string) {
    if (!confirm('¿Eliminar gasto recurrente?')) return
    await supabase.from('recurring_expenses').delete().eq('id', id)
    load()
  }

  async function applyRecurring() {
    setApplyingRec(true)
    const res = await supabase.functions.invoke('apply-recurring-expenses', { body: {} })
    if (res.error) alert('Error: ' + res.error.message)
    else alert(`${res.data?.applied ?? 0} gastos recurrentes aplicados.`)
    setApplyingRec(false)
    load()
  }

  if (loading) return <div className="text-slate-400 text-center py-10">Cargando...</div>

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-slate-800">Presupuesto</h1>

      <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
        {(['categories', 'recurring'] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab === t ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}>
            {t === 'categories' ? 'Categorías' : 'Recurrentes'}
          </button>
        ))}
      </div>

      {tab === 'categories' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => { setShowCatForm(true); setEditingCatId(null); resetCatForm() }}
              className="flex items-center gap-1.5 bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-medium">
              <Plus size={16} /> Nueva categoría
            </button>
          </div>

          {showCatForm && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
              <h2 className="font-semibold text-slate-800 mb-4">{editingCatId ? 'Editar' : 'Nueva'} categoría</h2>
              <form onSubmit={handleSaveCategory} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <input type="text" value={catName} onChange={(e) => setCatName(e.target.value)}
                    placeholder="Nombre (ej: Comida)" required
                    className="border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                  <input type="number" value={catAmount} onChange={(e) => setCatAmount(e.target.value)}
                    placeholder="Presupuesto mensual" required
                    className="border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Ícono</label>
                  <div className="flex flex-wrap gap-2">
                    {ICONS.map((ic) => (
                      <button key={ic} type="button" onClick={() => setCatIcon(ic)}
                        className={`w-9 h-9 text-lg rounded-xl border-2 transition-all ${catIcon === ic ? 'border-indigo-500 bg-indigo-50' : 'border-transparent bg-slate-50'}`}>
                        {ic}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Color</label>
                  <div className="flex gap-2 flex-wrap">
                    {COLORS.map((c) => (
                      <button key={c} type="button" onClick={() => setCatColor(c)}
                        className="w-8 h-8 rounded-full border-2 transition-all"
                        style={{ backgroundColor: c, borderColor: catColor === c ? '#1e293b' : 'transparent' }} />
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Alerta al %</label>
                    <input type="number" min="1" max="100" value={catThreshold}
                      onChange={(e) => setCatThreshold(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de pool</label>
                    <select value={catPoolType} onChange={(e) => setCatPoolType(e.target.value as 'shared' | 'specific')}
                      className="w-full border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-400">
                      <option value="shared">Compartido</option>
                      <option value="specific">Centro específico</option>
                    </select>
                  </div>
                </div>

                {catPoolType === 'specific' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Centro de costo</label>
                    <select value={catCostCenterId} onChange={(e) => setCatCostCenterId(e.target.value)} required
                      className="w-full border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-400">
                      <option value="">Seleccionar...</option>
                      {costCenters.map((cc) => <option key={cc.id} value={cc.id}>{cc.name}</option>)}
                    </select>
                  </div>
                )}

                <div className="flex gap-2">
                  <button type="submit" className="flex items-center gap-1 bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-medium">
                    <Check size={15} /> {editingCatId ? 'Guardar' : 'Crear'}
                  </button>
                  <button type="button" onClick={() => { setShowCatForm(false); setEditingCatId(null) }}
                    className="flex items-center gap-1 bg-slate-100 text-slate-600 px-4 py-2 rounded-xl text-sm font-medium">
                    <X size={15} /> Cancelar
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="space-y-2">
            {categories.map((cat) => (
              <div key={cat.id} className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex items-center justify-between"
                style={{ borderLeftColor: cat.color, borderLeftWidth: 3 }}>
                <div className="flex items-center gap-3">
                  <span className="text-xl">{cat.icon}</span>
                  <div>
                    <p className="font-medium text-slate-800">{cat.name}</p>
                    <p className="text-xs text-slate-400">
                      {formatCLP(cat.monthly_amount)}/mes · alerta {cat.alert_threshold_pct}% ·{' '}
                      {cat.pool_type === 'shared' ? 'pool compartido' : `centro específico`}
                    </p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => startEditCat(cat)} className="p-1.5 text-slate-400 hover:text-indigo-600"><Pencil size={15} /></button>
                  <button onClick={() => handleDeleteCat(cat.id)} className="p-1.5 text-slate-400 hover:text-red-600"><Trash2 size={15} /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'recurring' && (
        <div className="space-y-4">
          <div className="flex gap-2 justify-end">
            <button onClick={applyRecurring} disabled={applyingRec}
              className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl text-sm font-medium">
              <RefreshCw size={14} className={applyingRec ? 'animate-spin' : ''} />
              Aplicar al mes actual
            </button>
            <button onClick={() => setShowRecForm(true)}
              className="flex items-center gap-1.5 bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-medium">
              <Plus size={16} /> Nuevo recurrente
            </button>
          </div>

          {showRecForm && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
              <h2 className="font-semibold text-slate-800 mb-4">Nuevo gasto recurrente</h2>
              <form onSubmit={handleSaveRecurring} className="space-y-4">
                <input type="text" value={recDesc} onChange={(e) => setRecDesc(e.target.value)}
                  placeholder="Descripción (ej: Arriendo)" required
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                <div className="grid grid-cols-2 gap-3">
                  <input type="number" value={recAmount} onChange={(e) => setRecAmount(e.target.value)}
                    placeholder="Monto" required
                    className="border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                  <input type="number" min="1" max="28" value={recDay} onChange={(e) => setRecDay(e.target.value)}
                    placeholder="Día del mes" required
                    className="border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                </div>
                <select value={recCategoryId} onChange={(e) => setRecCategoryId(e.target.value)} required
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-400">
                  <option value="">Categoría...</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                </select>
                <div className="flex gap-2">
                  <button type="submit" className="flex items-center gap-1 bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-medium">
                    <Check size={15} /> Crear
                  </button>
                  <button type="button" onClick={() => setShowRecForm(false)}
                    className="flex items-center gap-1 bg-slate-100 text-slate-600 px-4 py-2 rounded-xl text-sm font-medium">
                    <X size={15} /> Cancelar
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="space-y-2">
            {recurringExpenses.map((rec) => (
              <div key={rec.id} className={`bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex items-center justify-between ${!rec.active ? 'opacity-50' : ''}`}>
                <div>
                  <p className="font-medium text-slate-800">{rec.description}</p>
                  <p className="text-xs text-slate-400">
                    {formatCLP(rec.amount)} · día {rec.day_of_month} · {(rec as any).budget_categories?.name}
                    {!rec.active && ' · inactivo'}
                  </p>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => handleToggleRecurring(rec.id, rec.active)}
                    className={`text-xs px-3 py-1.5 rounded-lg font-medium ${rec.active ? 'bg-slate-100 text-slate-600' : 'bg-emerald-50 text-emerald-700'}`}>
                    {rec.active ? 'Pausar' : 'Activar'}
                  </button>
                  <button onClick={() => handleDeleteRecurring(rec.id)} className="p-1.5 text-slate-400 hover:text-red-600"><Trash2 size={15} /></button>
                </div>
              </div>
            ))}
            {recurringExpenses.length === 0 && (
              <p className="text-slate-400 text-center py-6">No hay gastos recurrentes configurados</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
