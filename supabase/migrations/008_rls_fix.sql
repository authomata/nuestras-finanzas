-- Fix: agregar políticas INSERT faltantes en households y savings_fund
-- Sin estas políticas, un usuario nuevo no puede crear su hogar.

-- Cualquier usuario autenticado puede crear un hogar (primera vez)
CREATE POLICY "authenticated users can create households"
  ON public.households FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Cualquier usuario autenticado puede crear el fondo de ahorro de su hogar
CREATE POLICY "authenticated users can create savings fund"
  ON public.savings_fund FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
