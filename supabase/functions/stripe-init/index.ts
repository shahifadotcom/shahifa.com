import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Verify user identity via JWT
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const authenticatedUserId = claimsData.claims.sub;

    const { orderId, customerEmail, customerName } = await req.json();

    // Validate inputs
    if (!orderId || typeof orderId !== 'string' || !/^[0-9a-f-]{36}$/i.test(orderId)) {
      return new Response(JSON.stringify({ error: 'Invalid order ID' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Use service role client for DB operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify order ownership and get server-side total (never trust client-provided amount)
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, customer_id, total, customer_email')
      .eq('id', orderId)
      .eq('customer_id', authenticatedUserId)
      .single();

    if (orderError || !order) {
      return new Response(JSON.stringify({ error: 'Order not found or access denied' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Use server-side total and email, not client-provided values
    const amount = order.total;
    const verifiedEmail = order.customer_email || customerEmail;

    console.log('Stripe payment init:', { orderId, amount: order.total });

    // Get Stripe config
    const { data: config, error: configError } = await supabase
      .from('stripe_config')
      .select('secret_key, is_active')
      .eq('is_active', true)
      .single();

    if (configError || !config) {
      throw new Error('Stripe is not configured or not active');
    }

    // Create Stripe checkout session
    const stripeResponse = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.secret_key}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        'mode': 'payment',
        'success_url': `${req.headers.get('origin')}/order-success?session_id={CHECKOUT_SESSION_ID}`,
        'cancel_url': `${req.headers.get('origin')}/checkout`,
        'customer_email': verifiedEmail,
        'line_items[0][price_data][currency]': 'usd',
        'line_items[0][price_data][product_data][name]': 'Order Payment',
        'line_items[0][price_data][unit_amount]': Math.round(amount * 100).toString(),
        'line_items[0][quantity]': '1',
        'metadata[order_id]': orderId,
      }).toString(),
    });

    if (!stripeResponse.ok) {
      const errorData = await stripeResponse.json();
      console.error('Stripe API error:', errorData);
      throw new Error(errorData.error?.message || 'Failed to create Stripe session');
    }

    const session = await stripeResponse.json();

    // Store transaction
    await supabase.from('stripe_transactions').insert({
      order_id: orderId,
      payment_intent_id: session.id,
      amount: amount,
      currency: 'usd',
      status: 'pending',
      customer_email: verifiedEmail,
      response_data: session,
    });

    console.log('Stripe session created:', session.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        sessionUrl: session.url,
        sessionId: session.id
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in stripe-init:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
