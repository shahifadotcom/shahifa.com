
-- Fix overly permissive USING(true) RLS policies

-- 1. advance_payments: Remove the broad "Admin can manage advance payments" USING(true) policy
--    (replaced by the more specific admin/user policies that already exist)
DROP POLICY IF EXISTS "Admin can manage advance payments" ON public.advance_payments;

-- 2. ai_audience_insights: Replace USING(true) with service_role-only
DROP POLICY IF EXISTS "System can manage insights" ON public.ai_audience_insights;
CREATE POLICY "Service role can manage insights"
ON public.ai_audience_insights
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- 3. price_sync_logs: Replace USING(true) with admin-only
DROP POLICY IF EXISTS "Admin can manage price sync logs" ON public.price_sync_logs;
CREATE POLICY "Admin can manage price sync logs"
ON public.price_sync_logs
FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.user_roles
  WHERE user_id = auth.uid() AND role = 'admin'::app_role
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.user_roles
  WHERE user_id = auth.uid() AND role = 'admin'::app_role
));
-- Also allow service role for automated sync operations
CREATE POLICY "Service role can manage price sync logs"
ON public.price_sync_logs
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- 4. server_side_events: Replace USING(true) with service_role-only
DROP POLICY IF EXISTS "System can manage server events" ON public.server_side_events;
CREATE POLICY "Service role can manage server events"
ON public.server_side_events
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- 5. vendor_orders: Replace USING(true) with admin-only
DROP POLICY IF EXISTS "Admin can manage vendor orders" ON public.vendor_orders;
CREATE POLICY "Admin can manage vendor orders"
ON public.vendor_orders
FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.user_roles
  WHERE user_id = auth.uid() AND role = 'admin'::app_role
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.user_roles
  WHERE user_id = auth.uid() AND role = 'admin'::app_role
));
-- Also allow service role for automated order processing
CREATE POLICY "Service role can manage vendor orders"
ON public.vendor_orders
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- 6. vendor_products: Replace broad USING(true) ALL policy; keep public SELECT for storefront
DROP POLICY IF EXISTS "Admin can manage vendor products" ON public.vendor_products;
CREATE POLICY "Admin can manage vendor products"
ON public.vendor_products
FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.user_roles
  WHERE user_id = auth.uid() AND role = 'admin'::app_role
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.user_roles
  WHERE user_id = auth.uid() AND role = 'admin'::app_role
));
-- Allow service role for automated vendor sync
CREATE POLICY "Service role can manage vendor products"
ON public.vendor_products
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- 7. cj_credentials: The "Service role can manage all credentials" USING(true) is too broad
--    Replace with proper service_role check
DROP POLICY IF EXISTS "Service role can manage all credentials" ON public.cj_credentials;
-- "Only service role can access credentials" policy already uses auth.role() = 'service_role', which is correct.
-- That policy covers ALL operations so we just needed to remove the USING(true) duplicate.
