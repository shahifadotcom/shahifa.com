-- Phase 4 database schema for AliExpress-style features.
-- Run this in the SQL editor of your Lovable Cloud / self-hosted Postgres.
-- Safe to re-run: all statements use IF NOT EXISTS / CREATE OR REPLACE.

-- ---------------- COUPONS ----------------
CREATE TABLE IF NOT EXISTS public.coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  discount_type text NOT NULL CHECK (discount_type IN ('percent','amount')),
  discount_value numeric NOT NULL CHECK (discount_value >= 0),
  min_order numeric,
  max_uses integer,
  used_count integer NOT NULL DEFAULT 0,
  expires_at timestamptz,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.coupons TO anon, authenticated;
GRANT ALL ON public.coupons TO service_role;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "coupons_public_read_active" ON public.coupons;
CREATE POLICY "coupons_public_read_active" ON public.coupons FOR SELECT USING (active = true);
DROP POLICY IF EXISTS "coupons_admin_manage" ON public.coupons;
CREATE POLICY "coupons_admin_manage" ON public.coupons FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ---------------- USER COINS ----------------
CREATE TABLE IF NOT EXISTS public.user_coins (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  balance integer NOT NULL DEFAULT 0,
  last_checkin date,
  streak integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.user_coins TO authenticated;
GRANT ALL ON public.user_coins TO service_role;
ALTER TABLE public.user_coins ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_coins_own_select" ON public.user_coins;
CREATE POLICY "user_coins_own_select" ON public.user_coins FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "user_coins_own_insert" ON public.user_coins;
CREATE POLICY "user_coins_own_insert" ON public.user_coins FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "user_coins_own_update" ON public.user_coins;
CREATE POLICY "user_coins_own_update" ON public.user_coins FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ---------------- FLASH SALES ----------------
CREATE TABLE IF NOT EXISTS public.flash_sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL,
  flash_price numeric NOT NULL,
  stock integer NOT NULL DEFAULT 0,
  sold integer NOT NULL DEFAULT 0,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS flash_sales_window_idx ON public.flash_sales (starts_at, ends_at);
GRANT SELECT ON public.flash_sales TO anon, authenticated;
GRANT ALL ON public.flash_sales TO service_role;
ALTER TABLE public.flash_sales ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "flash_sales_public_read" ON public.flash_sales;
CREATE POLICY "flash_sales_public_read" ON public.flash_sales FOR SELECT USING (true);
DROP POLICY IF EXISTS "flash_sales_admin_manage" ON public.flash_sales;
CREATE POLICY "flash_sales_admin_manage" ON public.flash_sales FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
