import { useState, useEffect } from 'react'
import { Plus, Pencil, Check, X, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useHousehold } from '../hooks/useHousehold'
import { formatCLP } from '../lib/format'
import type { CostCenter } from '../types/database'
import { IncomeForm } from '../components/IncomeForm'

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16']

export function CostCenters() {
  const { household } = useHousehold()
  const [costCenters, setCostCenters] = useState<CostCenter[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [incomeTarget, setIncomeTarget] = useState<CostCenter | null>(null)

  const [name, setName] = useState('')
  const [color, setColor] = useState(COLORS[0])
  const [savingsPct, setSavingsPct] = useState('10')

  async function load() {
    const { data } = await supabase.from('cost_centers').select('*').order('created_at')
    setCostCenters(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!household) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    if (editingId) {
      await supabase.from('cost_centers').update({
        name, color, savings_pct: parseFloat(savingsPct),
      }).eq('id', editingId)
    } else {
      await supabase.from('cost_centers').insert({
        household_id: household.id,
        name, color, savings_pct: parseFloat(savingsPct), current_balance: 0,
      })
    }
    setShowForm(false)
    setEditingId(null)
    setName('')
    setSavingsPct('10')
    load()
  }

  function startEdit(cc: CostCenter) {
    setEditingId(cc.id)
    setName(cc.name)
    setColor(cc.color)
    setSavingsPct(String(cc.savings_pct))
    setShowForm(true)
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar este centro de costo? No se puede deshacer.')) return
    await supabase.from('cost_centers').delete().eq('id', id)
    load()
  }

  if (loading) return <div className="text-slate-400 text-center py-10">Cargando...</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">Centros de costo</h1>
        <button
          onClick={() => { setShowForm(true); setEditingId(null); setName(''); setSavingsPct('10'); setColor(COLORS[0]) }}
          className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-medium"
        >
          <Plus size={16} /> Nuevo
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
          <h2 className="font-semibold text-slate-800 mb-4">{editingId ? 'Editar' : 'Nuevo'} centro de costo</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <input type="text" value={name} onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Sueldo Andrés" required
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-400" />

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">% al fondo de ahorro al recibir ingreso</label>
              <input type="number" min="0" max="100" step="1" value={savingsPct}
                onChange={(e) => setSavingsPct(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Color</label>
              <div className="flex gap-2 flex-wrap">
                {COLORS.map((c) => (
                  <button key={c} type="button" onClick={() => setColor(c)}
                    className="w-8 h-8 rounded-full border-2 transition-all"
                    style={{ backgroundColor: c, borderColor: color === c ? '#1e293b' : 'transparent' }} />
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <button type="submit" className="flex items-center gap-1 bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-medium">
                <Check size={15} /> {editingId ? 'Guardar' : 'Crear'}
              </button>
              <button type="button" onClick={() => { setShowForm(false); setEditingId(null) }}
                className="flex items-center gap-1 bg-slate-100 text-slate-600 px-4 py-2 rounded-xl text-sm font-medium">
                <X size={15} /> Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {costCenters.length === 0 && !showForm && (
        <p className="text-slate-400 text-center py-10">No hay centros de costo. Crea el primero.</p>
      )}

      <div className="space-y-3">
        {costCenters.map((cc) => (
          <div key={cc.id} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100"
            style={{ borderLeftColor: cc.color, borderLeftWidth: 4 }}>
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-slate-800">{cc.name}</h3>
                <p className="text-xs text-slate-400 mt-0.5">{cc.savings_pct}% al ahorro · Saldo: {formatCLP(cc.current_balance)}</p>
              </div>
              <div className="flex gap-1">
                <button onClick={() => setIncomeTarget(cc)}
                  className="text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-lg font-medium">
                  + Ingreso
                </button>
                <button onClick={() => startEdit(cc)} className="p-1.5 text-slate-400 hover:text-indigo-600">
                  <Pencil size={15} />
                </button>
                <button onClick={() => handleDelete(cc.id)} className="p-1.5 text-slate-400 hover:text-red-600">
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {incomeTarget && (
        <IncomeForm
          costCenter={incomeTarget}
          onClose={() => setIncomeTarget(null)}
          onSuccess={() => { setIncomeTarget(null); load() }}
        />
      )}
    </div>
  )
}
