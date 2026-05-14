-- 1) cj_webhook_logs: remove any policy that grants access when connection_id IS NULL
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT polname FROM pg_policy WHERE polrelid = 'public.cj_webhook_logs'::regclass
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.cj_webhook_logs', pol.polname);
  END LOOP;
END $$;

ALTER TABLE public.cj_webhook_logs ENABLE ROW LEVEL SECURITY;

-- Only service_role can read/write webhook logs
CREATE POLICY "Service role manages cj webhook logs"
ON public.cj_webhook_logs
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Admins can read webhook logs for their own connections (or all if connection_id is NULL but only via service role above)
CREATE POLICY "Admins can read cj webhook logs"
ON public.cj_webhook_logs
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  AND connection_id IS NOT NULL
);

-- 2) notification_logs: lock down INSERT to service_role only; keep admin read
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT polname FROM pg_policy WHERE polrelid = 'public.notification_logs'::regclass
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.notification_logs', pol.polname);
  END LOOP;
END $$;

ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages notification logs"
ON public.notification_logs
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Admins can view notification logs"
ON public.notification_logs
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));