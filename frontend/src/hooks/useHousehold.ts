import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { Tables } from '../types/database'

type Household = Tables<'households'>
type HouseholdMember = Tables<'household_members'>

export function useHousehold() {
  const [household, setHousehold] = useState<Household | null>(null)
  const [members, setMembers] = useState<HouseholdMember[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      const { data: member } = await supabase
        .from('household_members')
        .select('household_id')
        .eq('user_id', user.id)
        .single()

      if (!member) { setLoading(false); return }

      const [{ data: hh }, { data: mem }] = await Promise.all([
        supabase.from('households').select('*').eq('id', member.household_id).single(),
        supabase.from('household_members').select('*').eq('household_id', member.household_id),
      ])

      setHousehold(hh)
      setMembers(mem || [])
      setLoading(false)
    }
    load()
  }, [])

  return { household, members, loading }
}
