import { useState, useEffect } from 'react'
import { PiggyBank, ArrowDown, ArrowUp, Minus } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useHousehold } from '../hooks/useHousehold'
import { formatCLP } from '../lib/format'
import type { Tables } from '../types/database'

type SavingsEntry = Tables<'savings_entries'> & { cost_centers: { name: string } | null }

const SOURCE_LABELS: Record<string, string> = {
  income_pct: 'Ahorro de ingreso',
  month_surplus: 'Excedente mensual',
  manual: 'Aporte manual',
  withdrawal: 'Retiro',
}

export function Savings() {
  const { household } = useHousehold()
  const [balance, setBalance] = useState(0)
  const [entries, setEntries] = useState<SavingsEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [showWithdraw, setShowWithdraw] = useState(false)
  const [showManual, setShowManual] = useState(false)

  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [withdrawNotes, setWithdrawNotes] = useState('')
  const [manualAmount, setManualAmount] = useState('')
  const [manualNotes, setManualNotes] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  async function load() {
    const [{ data: fund }, { data: ents }] = await Promise.all([
      supabase.from('savings_fund').select('total_balance').single(),
      supabase
        .from('savings_entries')
        .select('*, cost_centers(name)')
        .order('entry_date', { ascending: false })
        .limit(50),
    ])
    setBalance(fund?.total_balance ?? 0)
    setEntries((ents || []) as any)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleWithdraw(e: React.FormEvent) {
    e.preventDefault()
    const amount = parseFloat(withdrawAmount)
    if (!amount || amount <= 0 || amount > balance) { alert('Monto inválido'); return }
    setActionLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !household) { setActionLoading(false); return }

    await supabase.from('savings_entries').insert({
      household_id: household.id,
      amount: -amount,
      source_type: 'withdrawal',
      notes: withdrawNotes || 'Retiro del fondo',
      entry_date: new Date().toISOString().split('T')[0],
      created_by: user.id,
    })

    const { data: fund } = await supabase.from('savings_fund').select('id, total_balance').eq('household_id', household.id).single()
    if (fund) {
      await supabase.from('savings_fund').update({ total_balance: fund.total_balance - amount }).eq('id', fund.id)
    }

    setShowWithdraw(false)
    setWithdrawAmount('')
    setWithdrawNotes('')
    setActionLoading(false)
    load()
  }

  async function handleManual(e: React.FormEvent) {
    e.preventDefault()
    const amount = parseFloat(manualAmount)
    if (!amount || amount <= 0) { alert('Monto inválido'); return }
    setActionLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !household) { setActionLoading(false); return }

    await supabase.from('savings_entries').insert({
      household_id: household.id,
      amount,
      source_type: 'manual',
      notes: manualNotes || 'Aporte manual',
      entry_date: new Date().toISOString().split('T')[0],
      created_by: user.id,
    })

    const { data: fund } = await supabase.from('savings_fund').select('id, total_balance').eq('household_id', household.id).single()
    if (fund) {
      await supabase.from('savings_fund').update({ total_balance: fund.total_balance + amount }).eq('id', fund.id)
    }

    setShowManual(false)
    setManualAmount('')
    setManualNotes('')
    setActionLoading(false)
    load()
  }

  if (loading) return <div className="text-slate-400 text-center py-10">Cargando...</div>

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-slate-800">Fondo de ahorro</h1>

      {/* Balance */}
      <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-2 mb-2">
          <PiggyBank size={20} />
          <span className="font-medium">Saldo acumulado</span>
        </div>
        <p className="text-4xl font-bold">{formatCLP(balance)}</p>
        <p className="text-sm opacity-70 mt-1">intocable hasta que lo necesiten 🐷</p>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button onClick={() => { setShowManual(true); setShowWithdraw(false) }}
          className="flex-1 flex items-center justify-center gap-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 py-3 rounded-xl text-sm font-medium transition-colors">
          <ArrowUp size={16} /> Aporte manual
        </button>
        <button onClick={() => { setShowWithdraw(true); setShowManual(false) }}
          className="flex-1 flex items-center justify-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 py-3 rounded-xl text-sm font-medium transition-colors">
          <ArrowDown size={16} /> Retirar
        </button>
      </div>

      {showManual && (
        <div className="bg-white rounded-2xl shadow-sm border border-emerald-100 p-5">
          <h2 className="font-semibold text-slate-800 mb-4">Aporte manual</h2>
          <form onSubmit={handleManual} className="space-y-3">
            <input type="number" min="1" value={manualAmount} onChange={(e) => setManualAmount(e.target.value)}
              placeholder="Monto" required
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-400" />
            <input type="text" value={manualNotes} onChange={(e) => setManualNotes(e.target.value)}
              placeholder="Descripción"
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-400" />
            <div className="flex gap-2">
              <button type="submit" disabled={actionLoading}
                className="bg-emerald-600 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-sm font-medium">
                {actionLoading ? 'Guardando...' : 'Guardar'}
              </button>
              <button type="button" onClick={() => setShowManual(false)}
                className="bg-slate-100 text-slate-600 px-4 py-2 rounded-xl text-sm font-medium">
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {showWithdraw && (
        <div className="bg-white rounded-2xl shadow-sm border border-red-100 p-5">
          <h2 className="font-semibold text-slate-800 mb-4">Retirar del fondo</h2>
          <form onSubmit={handleWithdraw} className="space-y-3">
            <input type="number" min="1" max={balance} value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(e.target.value)}
              placeholder={`Máximo ${formatCLP(balance)}`} required
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-red-400" />
            <input type="text" value={withdrawNotes} onChange={(e) => setWithdrawNotes(e.target.value)}
              placeholder="Motivo del retiro (ej: Vacaciones)"
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-red-400" />
            <div className="flex gap-2">
              <button type="submit" disabled={actionLoading}
                className="bg-red-600 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-sm font-medium">
                {actionLoading ? 'Retirando...' : 'Retirar'}
              </button>
              <button type="button" onClick={() => setShowWithdraw(false)}
                className="bg-slate-100 text-slate-600 px-4 py-2 rounded-xl text-sm font-medium">
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* History */}
      <div>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Historial</h2>
        {entries.length === 0 && <p className="text-slate-400 text-center py-6">Sin movimientos aún</p>}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 divide-y divide-slate-50">
          {entries.map((entry) => (
            <div key={entry.id} className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${entry.amount >= 0 ? 'bg-emerald-50' : 'bg-red-50'}`}>
                  {entry.amount >= 0 ? <ArrowUp size={14} className="text-emerald-600" /> : <Minus size={14} className="text-red-600" />}
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-800">{entry.notes || SOURCE_LABELS[entry.source_type] || entry.source_type}</p>
                  <p className="text-xs text-slate-400">
                    {entry.entry_date} · {SOURCE_LABELS[entry.source_type] || entry.source_type}
                    {entry.cost_centers && ` · ${(entry.cost_centers as any).name}`}
                  </p>
                </div>
              </div>
              <span className={`text-sm font-semibold ${entry.amount >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {entry.amount >= 0 ? '+' : ''}{formatCLP(entry.amount)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
