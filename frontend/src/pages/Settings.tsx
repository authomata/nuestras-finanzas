import { useState, useEffect } from 'react'
import { Copy, Check, LogOut } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useHousehold } from '../hooks/useHousehold'

export function Settings() {
  const { household, members } = useHousehold()
  const [copiedCode, setCopiedCode] = useState(false)
  const [householdName, setHouseholdName] = useState('')
  const [saving, setSaving] = useState(false)
  const [currentUser, setCurrentUser] = useState<string | null>(null)

  useEffect(() => {
    if (household) setHouseholdName(household.name)
    supabase.auth.getUser().then(({ data }) => setCurrentUser(data.user?.id || null))
  }, [household])

  async function saveHouseholdName(e: React.FormEvent) {
    e.preventDefault()
    if (!household) return
    setSaving(true)
    await supabase.from('households').update({ name: householdName }).eq('id', household.id)
    setSaving(false)
  }

  async function copyInviteCode() {
    if (!household?.invite_code) return
    await navigator.clipboard.writeText(household.invite_code)
    setCopiedCode(true)
    setTimeout(() => setCopiedCode(false), 2000)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-slate-800">Configuración</h1>

      {/* Household name */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
        <h2 className="font-semibold text-slate-800 mb-4">Nombre del hogar</h2>
        <form onSubmit={saveHouseholdName} className="flex gap-2">
          <input
            type="text"
            value={householdName}
            onChange={(e) => setHouseholdName(e.target.value)}
            className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
          <button type="submit" disabled={saving}
            className="bg-indigo-600 disabled:opacity-50 text-white px-4 py-2.5 rounded-xl text-sm font-medium">
            {saving ? '...' : 'Guardar'}
          </button>
        </form>
      </div>

      {/* Invite code */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
        <h2 className="font-semibold text-slate-800 mb-1">Código de invitación</h2>
        <p className="text-sm text-slate-400 mb-4">Comparte este código con tu pareja para que se una al hogar</p>
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 font-mono text-slate-800 tracking-widest text-lg">
            {household?.invite_code || '—'}
          </div>
          <button onClick={copyInviteCode}
            className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors">
            {copiedCode ? <><Check size={15} className="text-emerald-600" /> Copiado</> : <><Copy size={15} /> Copiar</>}
          </button>
        </div>
      </div>

      {/* Members */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
        <h2 className="font-semibold text-slate-800 mb-4">Miembros</h2>
        <div className="space-y-2">
          {members.map((member) => (
            <div key={member.id} className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center font-semibold text-sm">
                  {(member.display_name || '?').charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-800">{member.display_name || 'Sin nombre'}</p>
                  <p className="text-xs text-slate-400">{member.role}</p>
                </div>
              </div>
              {member.user_id === currentUser && (
                <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-1 rounded-lg">Tú</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Logout */}
      <button onClick={handleLogout}
        className="w-full flex items-center justify-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 py-3 rounded-xl text-sm font-medium transition-colors">
        <LogOut size={16} /> Cerrar sesión
      </button>
    </div>
  )
}
