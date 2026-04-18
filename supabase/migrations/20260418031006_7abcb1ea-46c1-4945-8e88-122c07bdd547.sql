-- Delete all but the most recent store_settings row to prevent multi-row update issues
DELETE FROM public.store_settings
WHERE id NOT IN (
  SELECT id FROM public.store_settings
  ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST
  LIMIT 1
);