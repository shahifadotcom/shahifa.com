
-- Fix 1: Remove overly permissive OTP SELECT policy that exposes otp_code to all authenticated users
DROP POLICY IF EXISTS "Users can check their own OTP status" ON public.otp_verifications;

-- Fix 2: Remove overly permissive OTP UPDATE policy
DROP POLICY IF EXISTS "Users can verify their own phone OTP" ON public.otp_verifications;

-- Fix 3: Restrict INSERT on sslcommerz_transactions to service_role only
DROP POLICY IF EXISTS "System can insert SSLCommerz transactions" ON public.sslcommerz_transactions;
CREATE POLICY "Service role can insert SSLCommerz transactions"
ON public.sslcommerz_transactions
FOR INSERT
WITH CHECK (auth.role() = 'service_role');

-- Fix 4: Restrict INSERT on stripe_transactions to service_role only
DROP POLICY IF EXISTS "System can insert Stripe transactions" ON public.stripe_transactions;
CREATE POLICY "Service role can insert Stripe transactions"
ON public.stripe_transactions
FOR INSERT
WITH CHECK (auth.role() = 'service_role');
