CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL,
  description TEXT NOT NULL,
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  type TEXT NOT NULL DEFAULT 'expense', -- 'expense' | 'transfer' | 'savings_contribution'
  category_id UUID REFERENCES public.budget_categories(id),
  cost_center_id UUID REFERENCES public.cost_centers(id),
  is_recurring BOOLEAN NOT NULL DEFAULT false,
  recurring_expense_id UUID REFERENCES public.recurring_expenses(id),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.cost_center_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  from_cost_center_id UUID NOT NULL REFERENCES public.cost_centers(id),
  to_cost_center_id UUID REFERENCES public.cost_centers(id), -- NULL = fondo de ahorro
  amount NUMERIC(12,2) NOT NULL,
  notes TEXT,
  transfer_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
