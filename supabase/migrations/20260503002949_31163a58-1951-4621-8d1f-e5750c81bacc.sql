-- Add restrictive policies blocking non-service-role access to OTP codes/phone numbers
CREATE POLICY "Block non-service-role read access to OTPs"
ON public.otp_verifications
AS RESTRICTIVE
FOR SELECT
TO anon, authenticated
USING (false);

CREATE POLICY "Block non-service-role insert access to OTPs"
ON public.otp_verifications
AS RESTRICTIVE
FOR INSERT
TO anon, authenticated
WITH CHECK (false);

CREATE POLICY "Block non-service-role update access to OTPs"
ON public.otp_verifications
AS RESTRICTIVE
FOR UPDATE
TO anon, authenticated
USING (false)
WITH CHECK (false);

CREATE POLICY "Block non-service-role delete access to OTPs"
ON public.otp_verifications
AS RESTRICTIVE
FOR DELETE
TO anon, authenticated
USING (false);