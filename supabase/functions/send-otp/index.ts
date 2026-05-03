import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Rate limit: max 3 OTP sends per phone per hour
const MAX_SENDS_PER_HOUR = 3;
const RATE_LIMIT_WINDOW_MINUTES = 60;

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { phoneNumber } = await req.json();
    
    if (!phoneNumber) {
      return new Response(
        JSON.stringify({ error: 'Phone number is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Validate phone number format (basic validation)
    const cleanPhone = String(phoneNumber).replace(/\s+/g, '');
    if (!/^\+?[1-9]\d{6,14}$/.test(cleanPhone)) {
      return new Response(
        JSON.stringify({ error: 'Invalid phone number format' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check rate limit
    const windowStart = new Date();
    windowStart.setMinutes(windowStart.getMinutes() - RATE_LIMIT_WINDOW_MINUTES);
    
    const { data: rateLimitData, error: rateLimitError } = await supabase
      .from('otp_rate_limits')
      .select('request_count, window_start')
      .eq('phone_number', cleanPhone)
      .gte('window_start', windowStart.toISOString())
      .maybeSingle();

    if (rateLimitError) {
      console.error('Rate limit check error:', rateLimitError);
    }

    if (rateLimitData && rateLimitData.request_count >= MAX_SENDS_PER_HOUR) {
      return new Response(
        JSON.stringify({ 
          error: 'Too many OTP requests. Please try again later.',
          retryAfter: RATE_LIMIT_WINDOW_MINUTES
        }),
        { 
          status: 429, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Update or insert rate limit record
    if (rateLimitData) {
      await supabase
        .from('otp_rate_limits')
        .update({ request_count: rateLimitData.request_count + 1 })
        .eq('phone_number', cleanPhone)
        .gte('window_start', windowStart.toISOString());
    } else {
      // Delete old records for this phone and insert new one
      await supabase
        .from('otp_rate_limits')
        .delete()
        .eq('phone_number', cleanPhone);
      
      await supabase
        .from('otp_rate_limits')
        .insert({
          phone_number: cleanPhone,
          request_count: 1,
          window_start: new Date().toISOString()
        });
    }

    // Generate secure OTP using database function
    const { data: otpData, error: otpError } = await supabase
      .rpc('generate_secure_otp');

    if (otpError) {
      console.error('OTP generation error:', otpError);
      return new Response(
        JSON.stringify({ error: 'Failed to generate OTP' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const otpCode = otpData;
    
    // Set expiration to 10 minutes from now
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10);

    // Store OTP in database
    const { error: otpStoreError } = await supabase
      .from('otp_verifications')
      .insert({
        phone_number: cleanPhone,
        otp_code: otpCode,
        expires_at: expiresAt.toISOString(),
        is_verified: false
      });

    if (otpStoreError) {
      console.error('Error storing OTP:', otpStoreError);
      return new Response(
        JSON.stringify({ error: 'Failed to process OTP request' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Send OTP via WhatsApp directly to bridge
    const whatsappBridgeUrl = Deno.env.get('WHATSAPP_BRIDGE_URL') || 'http://45.88.191.92:3001';
    
    try {
      const whatsappResponse = await fetch(`${whatsappBridgeUrl}/send-message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: cleanPhone,
          message: `Your verification code is: ${otpCode}\n\nThis code expires in 10 minutes. Do not share this code with anyone.`
        })
      });

      const whatsappData = await whatsappResponse.json().catch(() => ({}));
      
      if (!whatsappResponse.ok || !whatsappData.success) {
        console.error('WhatsApp bridge error:', whatsappData);
      } else {
        console.log('WhatsApp OTP sent successfully');
      }
    } catch (whatsappError) {
      console.error('Error sending WhatsApp message:', whatsappError);
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'OTP sent successfully'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in send-otp function:', error);
    return new Response(
      JSON.stringify({ error: 'Unable to process request' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
