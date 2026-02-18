import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Require authentication - this function is called server-to-server from track-event
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

    const { event } = await req.json();

    // Get active platform configurations
    const { data: platforms, error: platformError } = await supabase
      .from('ad_platforms')
      .select('*')
      .eq('is_active', true);

    if (platformError) throw platformError;

    const results = [];

    // Send to each platform
    for (const platform of platforms || []) {
      try {
        let result;
        
        if (platform.platform === 'facebook') {
          result = await sendToFacebook(platform, event);
        } else if (platform.platform === 'tiktok') {
          result = await sendToTikTok(platform, event);
        } else if (platform.platform === 'google_ads') {
          result = await sendToGoogleAds(platform, event);
        }

        results.push({ platform: platform.platform, success: true, result });

        await supabase.from('server_side_events').insert({
          platform: platform.platform,
          event_type: event.event_name,
          event_id: `${platform.platform}_${event.id}`,
          user_data: { user_id: event.user_id },
          custom_data: event.event_data,
          order_id: event.order_id,
          sent_successfully: true,
          platform_response: result,
        });
      } catch (error: any) {
        console.error(`Error sending to ${platform.platform}:`, error);
        results.push({ platform: platform.platform, success: false, error: error.message });

        await supabase.from('server_side_events').insert({
          platform: platform.platform,
          event_type: event.event_name,
          event_id: `${platform.platform}_${event.id}_failed`,
          order_id: event.order_id,
          sent_successfully: false,
          error_message: error.message,
        });
      }
    }

    await supabase
      .from('tracking_events')
      .update({
        platform_sent: results.map(r => r.platform),
      })
      .eq('id', event.id);

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in server-side-tracking:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

async function sendToFacebook(platform: any, event: any) {
  const url = `https://graph.facebook.com/v18.0/${platform.pixel_id}/events`;
  
  const eventData = {
    event_name: mapEventName(event.event_name, 'facebook'),
    event_time: Math.floor(new Date(event.created_at).getTime() / 1000),
    event_id: event.id,
    action_source: 'website',
    user_data: {
      client_ip_address: event.ip_address,
      client_user_agent: event.user_agent,
      ...(event.user_id && { external_id: event.user_id }),
    },
    custom_data: {
      ...event.event_data,
      ...(event.value && { value: event.value, currency: event.currency || 'USD' }),
    },
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      data: [eventData],
      access_token: platform.access_token,
    }),
  });

  return await response.json();
}

async function sendToTikTok(platform: any, event: any) {
  const url = `https://business-api.tiktok.com/open_api/v1.3/event/track/`;
  
  const eventData = {
    event: mapEventName(event.event_name, 'tiktok'),
    event_time: Math.floor(new Date(event.created_at).getTime() / 1000),
    event_id: event.id,
    pixel_code: platform.pixel_id,
    context: {
      user_agent: event.user_agent,
      ip: event.ip_address,
      ...(event.user_id && { external_id: event.user_id }),
    },
    properties: {
      ...event.event_data,
      ...(event.value && { value: event.value, currency: event.currency || 'USD' }),
    },
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Access-Token': platform.access_token,
    },
    body: JSON.stringify({ event_data: [eventData] }),
  });

  return await response.json();
}

async function sendToGoogleAds(platform: any, event: any) {
  const url = `https://googleads.googleapis.com/v14/customers/${platform.ad_account_id}/conversionUploads:uploadClickConversions`;
  
  const conversionData = {
    conversions: [{
      conversion_action: platform.pixel_id,
      conversion_date_time: new Date(event.created_at).toISOString(),
      ...(event.value && { 
        conversion_value: event.value,
        currency_code: event.currency || 'USD',
      }),
      user_identifiers: [
        ...(event.user_id ? [{ hashedEmail: await hashSHA256(event.user_id) }] : []),
      ],
    }],
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${platform.access_token}`,
      'developer-token': Deno.env.get('GOOGLE_ADS_DEVELOPER_TOKEN') || '',
    },
    body: JSON.stringify(conversionData),
  });

  return await response.json();
}

function mapEventName(eventName: string, platform: string): string {
  const mappings: Record<string, Record<string, string>> = {
    facebook: {
      'PageView': 'PageView',
      'ViewContent': 'ViewContent',
      'AddToCart': 'AddToCart',
      'InitiateCheckout': 'InitiateCheckout',
      'Purchase': 'Purchase',
      'Search': 'Search',
    },
    tiktok: {
      'PageView': 'PageView',
      'ViewContent': 'ViewContent',
      'AddToCart': 'AddToCart',
      'InitiateCheckout': 'InitiateCheckout',
      'Purchase': 'CompletePayment',
      'Search': 'Search',
    },
    google_ads: {
      'Purchase': 'conversion',
      'AddToCart': 'add_to_cart',
    },
  };

  return mappings[platform]?.[eventName] || eventName;
}

async function hashSHA256(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
