import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Require authentication
  const authHeader = req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { createClient: createAuthClient } = await import('https://esm.sh/@supabase/supabase-js@2');
  const authCheckClient = createAuthClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!
  );
  const { data: { user }, error: authError } = await authCheckClient.auth.getUser(
    authHeader.replace('Bearer ', '')
  );
  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Verify admin role
  const serviceCheckClient = createAuthClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );
  const { data: roleData } = await serviceCheckClient
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .eq('role', 'admin')
    .maybeSingle();

  if (!roleData) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const { phoneNumber, message, mediaUrl } = await req.json();
    
    if (!phoneNumber || !message) {
      return new Response(
        JSON.stringify({ error: 'Phone number and message are required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const whatsappBridgeUrl = Deno.env.get('WHATSAPP_BRIDGE_URL') || 'http://45.88.191.92:3001';
    
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`Attempting to send WhatsApp message to ${phoneNumber}${mediaUrl ? ' WITH IMAGE: ' + mediaUrl : ''}`);

    let messageSent = false;
    let errorMessage = '';

    try {
      // Prepare payload
      const payload = { phoneNumber, message, mediaUrl };
      console.log('Bridge payload:', JSON.stringify(payload));
      
      // Send message through WhatsApp bridge
      const bridgeResponse = await fetch(`${whatsappBridgeUrl}/send-message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const bridgeData = await bridgeResponse.json().catch(() => ({}));
      
      if (bridgeResponse.ok && bridgeData.success) {
        messageSent = true;
        console.log(`✓ WhatsApp message sent successfully to ${phoneNumber}${mediaUrl ? ' with media' : ''}`);
      } else {
        errorMessage = bridgeData.error || 'Bridge returned error';
        console.error(`✗ Failed to send WhatsApp message: ${errorMessage}`);
      }
    } catch (bridgeError) {
      errorMessage = bridgeError instanceof Error ? bridgeError.message : 'Bridge connection failed';
      console.error(`✗ WhatsApp bridge error: ${errorMessage}`);
    }

    // Log the message attempt
    await supabase
      .from('notification_logs')
      .insert({
        phone_number: phoneNumber,
        message: message,
        status: messageSent ? 'sent' : 'failed',
        error_message: messageSent ? null : errorMessage
      });

    return new Response(
      JSON.stringify({ 
        success: messageSent,
        message: messageSent ? 'WhatsApp message sent successfully' : `Failed to send: ${errorMessage}`,
        details: messageSent ? null : errorMessage
      }),
      { 
        status: messageSent ? 200 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in send-whatsapp-message function:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});