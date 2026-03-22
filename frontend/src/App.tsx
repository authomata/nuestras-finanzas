import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './lib/supabase'
import { Layout } from './components/Layout'
import { Auth } from './pages/Auth'
import { Dashboard } from './pages/Dashboard'
import { Transactions } from './pages/Transactions'
import { Budget } from './pages/Budget'
import { CostCenters } from './pages/CostCenters'
import { Savings } from './pages/Savings'
import { Settings } from './pages/Settings'
import type { Session } from '@supabase/supabase-js'

export function App() {
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  const [hasHousehold, setHasHousehold] = useState<boolean | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      if (data.session) checkHousehold(data.session.user.id)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess)
      if (sess) checkHousehold(sess.user.id)
      else setHasHousehold(null)
    })

    return () => subscription.unsubscribe()
  }, [])

  async function checkHousehold(userId: string) {
    const { data } = await supabase
      .from('household_members')
      .select('household_id')
      .eq('user_id', userId)
      .maybeSingle()
    setHasHousehold(!!data)
  }

  // Loading state
  if (session === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-400">
        <span className="text-2xl">💸</span>
      </div>
    )
  }

  if (!session) {
    return <Auth />
  }

  if (hasHousehold === null) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-400">
        Cargando hogar...
      </div>
    )
  }

  if (!hasHousehold) {
    // Signed in but no household — show auth with register/join tabs
    return <Auth />
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="transactions" element={<Transactions />} />
          <Route path="budget" element={<Budget />} />
          <Route path="cost-centers" element={<CostCenters />} />
          <Route path="savings" element={<Savings />} />
          <Route path="settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
