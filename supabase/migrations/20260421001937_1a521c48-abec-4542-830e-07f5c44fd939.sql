
-- Enable required extensions for cron-based scheduling
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Add a lock column so the scheduler doesn't double-pick a post that is being published
ALTER TABLE public.social_posts
  ADD COLUMN IF NOT EXISTS locked_at timestamptz,
  ADD COLUMN IF NOT EXISTS publish_attempts int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_publish_error text;

-- Helpful index for the scheduler
CREATE INDEX IF NOT EXISTS social_posts_due_idx
  ON public.social_posts (status, scheduled_for)
  WHERE status = 'scheduled';

-- Schedule the social-scheduler function to run every minute
-- Idempotent: unschedule first if exists
DO $$
BEGIN
  PERFORM cron.unschedule('social-scheduler-every-minute');
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

SELECT cron.schedule(
  'social-scheduler-every-minute',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := 'https://mofwljpreecqqxkilywh.supabase.co/functions/v1/social-scheduler',
    headers := jsonb_build_object(
      'Content-Type','application/json',
      'Authorization','Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1vZndsanByZWVjcXF4a2lseXdoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcxMTk5MDgsImV4cCI6MjA3MjY5NTkwOH0.1kfabhKCzV9P384_J9uWF6wGSRHDTYr_9yUBTvGDAvY'
    ),
    body := jsonb_build_object('triggered_at', now())
  );
  $$
);
