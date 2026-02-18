import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Allowed event names to prevent arbitrary event injection
const ALLOWED_EVENT_NAMES = new Set([
  'PageView', 'ViewContent', 'AddToCart', 'InitiateCheckout',
  'Purchase', 'Search', 'CompleteRegistration', 'Lead',
]);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Require authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

    // Verify user identity
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');

    const {
      event_name,
      event_data,
      value,
      product_id,
      order_id,
      session_id,
    } = await req.json();

    // Validate event_name against allowlist
    if (!event_name || !ALLOWED_EVENT_NAMES.has(event_name)) {
      return new Response(
        JSON.stringify({ error: 'Invalid event_name' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate value if provided
    if (value !== undefined && (typeof value !== 'number' || value < 0)) {
      return new Response(
        JSON.stringify({ error: 'Invalid value' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract client info
    const userAgent = req.headers.get('user-agent') || '';
    const ipAddress = req.headers.get('x-forwarded-for') || 
                      req.headers.get('x-real-ip') || '';
    const referrer = req.headers.get('referer') || '';

    // Store tracking event scoped to the authenticated user
    const { data: trackingEvent, error: trackError } = await supabase
      .from('tracking_events')
      .insert({
        event_name,
        user_id: user.id,
        session_id,
        event_data,
        product_id,
        order_id,
        value,
        user_agent: userAgent,
        ip_address: ipAddress,
        referrer,
      })
      .select()
      .single();

    if (trackError) {
      console.error('Error storing tracking event:', trackError);
      throw trackError;
    }

    // Send to server-side tracking function for all platforms
    const { error: serverError } = await supabase.functions.invoke(
      'server-side-tracking',
      {
        body: { event: trackingEvent },
        headers: { Authorization: authHeader },
      }
    );

    if (serverError) {
      console.error('Server-side tracking error:', serverError);
    }

    return new Response(
      JSON.stringify({ success: true, event_id: trackingEvent.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in track-event:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
