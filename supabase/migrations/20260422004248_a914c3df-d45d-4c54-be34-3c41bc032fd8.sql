DROP POLICY IF EXISTS "Public can view store settings" ON public.store_settings;

DROP POLICY IF EXISTS "System can insert optimization logs" ON public.ai_optimization_logs;
CREATE POLICY "Service role can insert optimization logs"
ON public.ai_optimization_logs
FOR INSERT
TO public
WITH CHECK (auth.role() = 'service_role');

ALTER PUBLICATION supabase_realtime DROP TABLE public.sms_transactions;