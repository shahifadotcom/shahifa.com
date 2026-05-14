import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAX_KEYS_PER_HOUR = 3;
const MAX_FIELD_LENGTH = 200;

function isHttpsHttpUrl(value: string): URL | null {
  try {
    const u = new URL(value);
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
    // Block private/loopback hostnames as basic SSRF/redirect mitigation
    const host = u.hostname.toLowerCase();
    const blocked = [
      'localhost', '127.0.0.1', '0.0.0.0', '::1',
    ];
    if (blocked.includes(host)) return null;
    if (/^10\./.test(host) || /^192\.168\./.test(host) || /^172\.(1[6-9]|2\d|3[0-1])\./.test(host)) return null;
    return u;
  } catch {
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const params = url.searchParams;

    const appName = (params.get('app_name') || 'Unknown App').slice(0, MAX_FIELD_LENGTH);
    const scopeRaw = params.get('scope') || 'read_write';
    const userIdRaw = (params.get('user_id') || '').slice(0, MAX_FIELD_LENGTH);
    const callbackUrlRaw = params.get('callback_url') || '';

    // Validate scope
    const allowedScopes = new Set(['read', 'write', 'read_write']);
    if (!allowedScopes.has(scopeRaw)) {
      return new Response(
        JSON.stringify({ error: 'Invalid scope' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate user_id
    if (!userIdRaw || !/^[A-Za-z0-9._:@-]{3,200}$/.test(userIdRaw)) {
      return new Response(
        JSON.stringify({ error: 'Invalid user_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate callback URL
    const callbackUrl = isHttpsHttpUrl(callbackUrlRaw);
    if (!callbackUrl) {
      return new Response(
        JSON.stringify({ error: 'Invalid callback_url' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Rate limit per external user_id: max 3 keys created in the last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: recentKeys, error: countErr } = await supabase
      .from('woocommerce_api_keys')
      .select('id, created_at')
      .eq('external_user_id', userIdRaw)
      .gte('created_at', oneHourAgo);

    if (countErr) {
      console.error('Error counting recent keys:', countErr);
      return new Response(
        JSON.stringify({ error: 'Internal error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (recentKeys && recentKeys.length >= MAX_KEYS_PER_HOUR) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded. Try again later.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate WooCommerce-style API credentials
    const consumerKey = 'ck_' + crypto.randomUUID().replace(/-/g, '');
    const consumerSecret = 'cs_' + crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '');

    const clientIp = req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || 'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';

    // Store the API key in database
    const { error: insertError } = await supabase
      .from('woocommerce_api_keys')
      .insert({
        user_id: '00000000-0000-0000-0000-000000000000', // System user for external integrations
        app_name: appName,
        api_key: consumerKey,
        api_secret: consumerSecret,
        scope: scopeRaw,
        callback_url: callbackUrl.toString(),
        external_user_id: userIdRaw,
        is_active: true,
      });

    if (insertError) {
      console.error('Error storing API key:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to issue credentials' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('WC API credentials issued', { appName, userIdRaw, clientIp, userAgent });

    // Build callback URL with credentials
    const redirectUrl = new URL(callbackUrl.toString());
    redirectUrl.searchParams.append('success', '1');
    redirectUrl.searchParams.append('user_id', userIdRaw);
    redirectUrl.searchParams.append('consumer_key', consumerKey);
    redirectUrl.searchParams.append('consumer_secret', consumerSecret);
    redirectUrl.searchParams.append('key_permissions', scopeRaw);

    const safeAppName = appName.replace(/[<>&"']/g, '');
    const html = `<!DOCTYPE html>
<html>
  <head>
    <title>Authorization Successful</title>
    <meta http-equiv="refresh" content="0;url=${redirectUrl.toString()}">
  </head>
  <body>
    <h1>Authorization Successful</h1>
    <p>Redirecting back to ${safeAppName}...</p>
    <p>If you are not redirected automatically, <a href="${redirectUrl.toString()}">click here</a>.</p>
  </body>
</html>`;

    return new Response(html, {
      headers: { ...corsHeaders, 'Content-Type': 'text/html' },
    });
  } catch (error) {
    console.error('Error in wc-auth:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to process WooCommerce authorization' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
