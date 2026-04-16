-- Restore base table privileges so RLS policies can grant access.
-- Without GRANTs, even admins get "permission denied for table products".
GRANT SELECT ON public.products TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.products TO authenticated;