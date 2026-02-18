import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Require authentication
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''

    // Verify JWT and extract authenticated user identity
    const anonClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const token = authHeader.replace('Bearer ', '')
    const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(token)
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const authenticatedUserId = claimsData.claims.sub

    // Parse and validate input fields
    const body = await req.json()
    const {
      user_id,
      app_name,
      api_key,
      api_secret,
      scope,
      callback_url,
      external_user_id
    } = body

    // Enforce that the caller can only store keys for their own account
    if (!user_id || user_id !== authenticatedUserId) {
      return new Response(
        JSON.stringify({ error: 'Forbidden: user_id does not match authenticated user' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate required fields
    if (!app_name || typeof app_name !== 'string' || app_name.trim().length === 0 || app_name.length > 255) {
      return new Response(
        JSON.stringify({ error: 'Invalid app_name' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!api_key || typeof api_key !== 'string' || api_key.length > 500) {
      return new Response(
        JSON.stringify({ error: 'Invalid api_key' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!api_secret || typeof api_secret !== 'string' || api_secret.length > 500) {
      return new Response(
        JSON.stringify({ error: 'Invalid api_secret' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate scope to an allowlist
    const ALLOWED_SCOPES = new Set(['read', 'write', 'read_write'])
    const resolvedScope = scope || 'read_write'
    if (!ALLOWED_SCOPES.has(resolvedScope)) {
      return new Response(
        JSON.stringify({ error: 'Invalid scope' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Use service role client for the DB insert (after ownership is verified)
    const supabaseAdmin = createClient(
      supabaseUrl,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    )

    const { error } = await supabaseAdmin
      .from('woocommerce_api_keys')
      .insert({
        user_id: authenticatedUserId,
        app_name: app_name.trim(),
        api_key,
        api_secret,
        scope: resolvedScope,
        callback_url: callback_url || null,
        external_user_id: external_user_id || null,
        is_active: true,
      })

    if (error) {
      console.error('Error storing API key:', error)
      return new Response(
        JSON.stringify({ error: 'Failed to store API key' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`WooCommerce API key stored for app: ${app_name.trim()}, user: ${authenticatedUserId}`)

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in wc-store-api-key:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
