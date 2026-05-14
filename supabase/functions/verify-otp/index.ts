import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Rate limit: max 5 failed verification attempts per phone per 15 minutes
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_WINDOW_MINUTES = 15;
const LOCKOUT_DURATION_MINUTES = 60;

const GENERIC_INVALID_ERROR = 'Invalid or expired OTP code';
const TARGET_RESPONSE_MS = 750;

async function padDelay(startedAt: number) {
  const elapsed = Date.now() - startedAt;
  const remaining = TARGET_RESPONSE_MS - elapsed;
  if (remaining > 0) {
    await new Promise((r) => setTimeout(r, remaining + Math.floor(Math.random() * 150)));
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startedAt = Date.now();

  try {
    const { phoneNumber, otpCode } = await req.json();

    if (!phoneNumber || !otpCode) {
      return new Response(
        JSON.stringify({ error: 'Phone number and OTP code are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate inputs
    const cleanPhone = String(phoneNumber).replace(/\s+/g, '');
    const cleanOtp = String(otpCode).trim();

    if (!/^\+?[1-9]\d{6,14}$/.test(cleanPhone) || !/^\d{6}$/.test(cleanOtp)) {
      await padDelay(startedAt);
      return new Response(
        JSON.stringify({ error: GENERIC_INVALID_ERROR }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client (service role)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check for lockout due to too many failed attempts
    const lockoutStart = new Date();
    lockoutStart.setMinutes(lockoutStart.getMinutes() - LOCKOUT_WINDOW_MINUTES);

    const { data: failedAttempts, error: attemptsError } = await supabase
      .from('otp_verifications')
      .select('id')
      .eq('phone_number', cleanPhone)
      .eq('is_verified', false)
      .gte('created_at', lockoutStart.toISOString());

    if (!attemptsError && failedAttempts && failedAttempts.length >= MAX_FAILED_ATTEMPTS) {
      await padDelay(startedAt);
      return new Response(
        JSON.stringify({
          error: 'Too many failed attempts. Please try again later.',
          retryAfter: LOCKOUT_DURATION_MINUTES,
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const nowIso = new Date().toISOString();

    // Fetch latest unverified, unexpired OTP for this phone number
    const { data: record, error: fetchError } = await supabase
      .from('otp_verifications')
      .select('*')
      .eq('phone_number', cleanPhone)
      .eq('is_verified', false)
      .gt('expires_at', nowIso)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fetchError) {
      console.error('Error fetching OTP record:', fetchError);
      await padDelay(startedAt);
      return new Response(
        JSON.stringify({ error: 'Failed to verify OTP' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Run timing-safe compare regardless to keep timing flat
    const enc = new TextEncoder();
    const expected = enc.encode(record ? String(record.otp_code) : '000000');
    const provided = enc.encode(cleanOtp);
    let equal = expected.length === provided.length;
    for (let i = 0; i < expected.length && i < provided.length; i++) {
      equal &&= expected[i] === provided[i];
    }

    if (!record || !equal) {
      await padDelay(startedAt);
      return new Response(
        JSON.stringify({ error: GENERIC_INVALID_ERROR }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Mark OTP as verified
    const { error: updateError } = await supabase
      .from('otp_verifications')
      .update({ is_verified: true })
      .eq('id', record.id);

    if (updateError) {
      console.error('Error updating OTP record:', updateError);
      await padDelay(startedAt);
      return new Response(
        JSON.stringify({ error: 'Failed to verify OTP' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    await padDelay(startedAt);
    return new Response(
      JSON.stringify({ success: true, message: 'OTP verified successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in verify-otp function:', error);
    await padDelay(startedAt);
    return new Response(
      JSON.stringify({ error: 'Unable to process request' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
