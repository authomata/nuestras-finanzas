-- ============================================================
-- Helper function: get household_id for authenticated user
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_user_household_id()
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT household_id
  FROM public.household_members
  WHERE user_id = auth.uid()
  LIMIT 1;
$$;

-- ============================================================
-- households
-- ============================================================
ALTER TABLE public.households ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members can view their household"
  ON public.households FOR SELECT
  USING (id = public.get_user_household_id());

CREATE POLICY "members can update their household"
  ON public.households FOR UPDATE
  USING (id = public.get_user_household_id());

-- ============================================================
-- household_members
-- ============================================================
ALTER TABLE public.household_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members can view household members"
  ON public.household_members FOR SELECT
  USING (household_id = public.get_user_household_id());

CREATE POLICY "members can insert themselves"
  ON public.household_members FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- ============================================================
-- cost_centers
-- ============================================================
ALTER TABLE public.cost_centers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "household cost centers"
  ON public.cost_centers FOR ALL
  USING (household_id = public.get_user_household_id())
  WITH CHECK (household_id = public.get_user_household_id());

-- ============================================================
-- income_entries
-- ============================================================
ALTER TABLE public.income_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "household income entries"
  ON public.income_entries FOR ALL
  USING (
    cost_center_id IN (
      SELECT id FROM public.cost_centers WHERE household_id = public.get_user_household_id()
    )
  )
  WITH CHECK (
    cost_center_id IN (
      SELECT id FROM public.cost_centers WHERE household_id = public.get_user_household_id()
    )
  );

-- ============================================================
-- budget_categories
-- ============================================================
ALTER TABLE public.budget_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "household budget categories"
  ON public.budget_categories FOR ALL
  USING (household_id = public.get_user_household_id())
  WITH CHECK (household_id = public.get_user_household_id());

-- ============================================================
-- recurring_expenses
-- ============================================================
ALTER TABLE public.recurring_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "household recurring expenses"
  ON public.recurring_expenses FOR ALL
  USING (
    category_id IN (
      SELECT id FROM public.budget_categories WHERE household_id = public.get_user_household_id()
    )
  )
  WITH CHECK (
    category_id IN (
      SELECT id FROM public.budget_categories WHERE household_id = public.get_user_household_id()
    )
  );

-- ============================================================
-- transactions
-- ============================================================
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "household transactions"
  ON public.transactions FOR ALL
  USING (household_id = public.get_user_household_id())
  WITH CHECK (household_id = public.get_user_household_id());

-- ============================================================
-- cost_center_transfers
-- ============================================================
ALTER TABLE public.cost_center_transfers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "household transfers"
  ON public.cost_center_transfers FOR ALL
  USING (household_id = public.get_user_household_id())
  WITH CHECK (household_id = public.get_user_household_id());

-- ============================================================
-- savings_fund
-- ============================================================
ALTER TABLE public.savings_fund ENABLE ROW LEVEL SECURITY;

CREATE POLICY "household savings fund"
  ON public.savings_fund FOR ALL
  USING (household_id = public.get_user_household_id())
  WITH CHECK (household_id = public.get_user_household_id());

-- ============================================================
-- savings_entries
-- ============================================================
ALTER TABLE public.savings_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "household savings entries"
  ON public.savings_entries FOR ALL
  USING (household_id = public.get_user_household_id())
  WITH CHECK (household_id = public.get_user_household_id());

-- ============================================================
-- monthly_periods
-- ============================================================
ALTER TABLE public.monthly_periods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "household monthly periods"
  ON public.monthly_periods FOR ALL
  USING (household_id = public.get_user_household_id())
  WITH CHECK (household_id = public.get_user_household_id());

-- ============================================================
-- budget_category_snapshots
-- ============================================================
ALTER TABLE public.budget_category_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "household category snapshots"
  ON public.budget_category_snapshots FOR ALL
  USING (household_id = public.get_user_household_id())
  WITH CHECK (household_id = public.get_user_household_id());
