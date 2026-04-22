
CREATE TABLE IF NOT EXISTS public.social_post_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.social_posts(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES public.social_accounts(id) ON DELETE CASCADE,
  platform social_platform NOT NULL,
  remote_post_id text NOT NULL,
  impressions integer NOT NULL DEFAULT 0,
  reach integer NOT NULL DEFAULT 0,
  likes integer NOT NULL DEFAULT 0,
  comments integer NOT NULL DEFAULT 0,
  shares integer NOT NULL DEFAULT 0,
  clicks integer NOT NULL DEFAULT 0,
  raw_metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT social_post_analytics_unique UNIQUE (post_id, account_id)
);

ALTER TABLE public.social_post_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage analytics select"
  ON public.social_post_analytics FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins manage analytics insert"
  ON public.social_post_analytics FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins manage analytics update"
  ON public.social_post_analytics FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins manage analytics delete"
  ON public.social_post_analytics FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER set_social_post_analytics_updated_at
  BEFORE UPDATE ON public.social_post_analytics
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_social_post_analytics_post ON public.social_post_analytics(post_id);

CREATE TABLE IF NOT EXISTS public.social_auto_reply_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  is_enabled boolean NOT NULL DEFAULT false,
  tone text NOT NULL DEFAULT 'friendly',
  system_prompt text NOT NULL DEFAULT 'You are a helpful social media assistant for our store. Reply briefly (1-2 sentences) and warmly to customer comments. Never invent prices, shipping, or stock — politely direct them to our website.',
  enabled_platforms text[] NOT NULL DEFAULT ARRAY['facebook_page','instagram']::text[],
  reply_only_to_questions boolean NOT NULL DEFAULT false,
  max_replies_per_post integer NOT NULL DEFAULT 50,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.social_auto_reply_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage auto-reply settings"
  ON public.social_auto_reply_settings FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER set_social_auto_reply_settings_updated_at
  BEFORE UPDATE ON public.social_auto_reply_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.social_auto_reply_settings (is_enabled)
SELECT false
WHERE NOT EXISTS (SELECT 1 FROM public.social_auto_reply_settings);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'social-analytics-sync-every-30min') THEN
    PERFORM cron.unschedule('social-analytics-sync-every-30min');
  END IF;
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'social-auto-reply-every-5min') THEN
    PERFORM cron.unschedule('social-auto-reply-every-5min');
  END IF;
END $$;

SELECT cron.schedule(
  'social-analytics-sync-every-30min',
  '*/30 * * * *',
  $cron$
  SELECT net.http_post(
    url := 'https://mofwljpreecqqxkilywh.supabase.co/functions/v1/social-analytics-sync',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1vZndsanByZWVjcXF4a2lseXdoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcxMTk5MDgsImV4cCI6MjA3MjY5NTkwOH0.1kfabhKCzV9P384_J9uWF6wGSRHDTYr_9yUBTvGDAvY"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $cron$
);

SELECT cron.schedule(
  'social-auto-reply-every-5min',
  '*/5 * * * *',
  $cron$
  SELECT net.http_post(
    url := 'https://mofwljpreecqqxkilywh.supabase.co/functions/v1/social-auto-reply',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1vZndsanByZWVjcXF4a2lseXdoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcxMTk5MDgsImV4cCI6MjA3MjY5NTkwOH0.1kfabhKCzV9P384_J9uWF6wGSRHDTYr_9yUBTvGDAvY"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $cron$
);
