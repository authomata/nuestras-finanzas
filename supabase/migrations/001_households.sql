CREATE TABLE public.households (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  invite_code TEXT UNIQUE DEFAULT substring(replace(gen_random_uuid()::text, '-', ''), 1, 8),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.household_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member', -- 'admin' | 'member'
  display_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(household_id, user_id)
);
