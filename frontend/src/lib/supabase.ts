import { createClient } from '@supabase/supabase-js'

// Typed locally via types/database.ts but client is untyped to avoid complex generic inference
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const supabase = createClient<any>(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)
