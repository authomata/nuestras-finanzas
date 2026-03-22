import { useState } from 'react'
import { supabase } from '../lib/supabase'

type Mode = 'login' | 'register' | 'join'

export function Auth() {
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [householdName, setHouseholdName] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError(error.message)
    setLoading(false)
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data, error: signUpError } = await supabase.auth.signUp({ email, password })
    if (signUpError || !data.user) {
      setError(signUpError?.message || 'Error al registrarse')
      setLoading(false)
      return
    }

    // Create household + add user as admin
    const { data: hh, error: hhError } = await supabase
      .from('households')
      .insert({ name: householdName || 'Nuestro Hogar' })
      .select()
      .single()

    if (hhError || !hh) {
      setError('Error al crear el hogar')
      setLoading(false)
      return
    }

    await supabase.from('household_members').insert({
      household_id: hh.id,
      user_id: data.user.id,
      role: 'admin',
      display_name: displayName || email.split('@')[0],
    })

    // Create default savings fund
    await supabase.from('savings_fund').insert({ household_id: hh.id, total_balance: 0 })

    setMessage('¡Cuenta creada! Revisa tu email o ya puedes ingresar.')
    setLoading(false)
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data, error: signUpError } = await supabase.auth.signUp({ email, password })
    if (signUpError || !data.user) {
      setError(signUpError?.message || 'Error al registrarse')
      setLoading(false)
      return
    }

    // Find household by invite code
    const { data: hh, error: hhError } = await supabase
      .from('households')
      .select('id, name')
      .eq('invite_code', inviteCode.trim().toLowerCase())
      .single()

    if (hhError || !hh) {
      setError('Código de invitación inválido')
      setLoading(false)
      return
    }

    const { error: memberError } = await supabase.from('household_members').insert({
      household_id: hh.id,
      user_id: data.user.id,
      role: 'member',
      display_name: displayName || email.split('@')[0],
    })

    if (memberError) {
      setError('Error al unirte al hogar: ' + memberError.message)
      setLoading(false)
      return
    }

    setMessage(`¡Te uniste a "${hh.name}"! Ya puedes ingresar.`)
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-sm p-8">
        <div className="text-center mb-8">
          <div className="text-4xl mb-2">💸</div>
          <h1 className="text-2xl font-bold text-slate-800">Nuestras Finanzas</h1>
          <p className="text-slate-400 text-sm mt-1">Gestión financiera del hogar</p>
        </div>

        {message && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl px-4 py-3 text-sm mb-4">
            {message}
          </div>
        )}

        <div className="flex gap-1 bg-slate-100 rounded-xl p-1 mb-6">
          {(['login', 'register', 'join'] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => { setMode(m); setError(''); setMessage('') }}
              className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                mode === m ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {m === 'login' ? 'Entrar' : m === 'register' ? 'Crear hogar' : 'Unirme'}
            </button>
          ))}
        </div>

        {mode === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4">
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com" required
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="Contraseña" required
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button type="submit" disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl transition-colors">
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        )}

        {mode === 'register' && (
          <form onSubmit={handleRegister} className="space-y-4">
            <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Tu nombre (ej: Andrés)" required
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            <input type="text" value={householdName} onChange={(e) => setHouseholdName(e.target.value)}
              placeholder="Nombre del hogar (ej: Casa de Andrés y Vale)"
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com" required
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="Contraseña" required minLength={6}
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button type="submit" disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl transition-colors">
              {loading ? 'Creando...' : 'Crear hogar'}
            </button>
          </form>
        )}

        {mode === 'join' && (
          <form onSubmit={handleJoin} className="space-y-4">
            <p className="text-xs text-slate-500">Pídele el código de invitación a quien ya creó el hogar (está en Configuración).</p>
            <input type="text" value={inviteCode} onChange={(e) => setInviteCode(e.target.value)}
              placeholder="Código de invitación" required
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Tu nombre" required
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com" required
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="Contraseña" required minLength={6}
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button type="submit" disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl transition-colors">
              {loading ? 'Uniéndome...' : 'Unirme al hogar'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
