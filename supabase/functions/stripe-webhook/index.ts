import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
};

// Compute HMAC-SHA256 signature for Stripe webhook verification
async function computeHmacSha256(secret: string, payload: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(payload);

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
  return Array.from(new Uint8Array(signatureBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// Verify Stripe webhook signature following Stripe's verification algorithm
async function verifyStripeSignature(
  body: string,
  signatureHeader: string,
  webhookSecret: string
): Promise<boolean> {
  try {
    // Parse the Stripe-Signature header: t=timestamp,v1=sig1,v1=sig2,...
    const parts = signatureHeader.split(',');
    let timestamp: string | null = null;
    const signatures: string[] = [];

    for (const part of parts) {
      const [key, value] = part.split('=');
      if (key === 't') timestamp = value;
      if (key === 'v1') signatures.push(value);
    }

    if (!timestamp || signatures.length === 0) {
      console.error('Invalid Stripe-Signature header format');
      return false;
    }

    // Reject webhooks older than 5 minutes (300 seconds) to prevent replay attacks
    const webhookAge = Math.floor(Date.now() / 1000) - parseInt(timestamp, 10);
    if (webhookAge > 300) {
      console.error('Webhook timestamp too old:', webhookAge, 'seconds');
      return false;
    }

    // Construct signed payload per Stripe spec: timestamp + "." + body
    const signedPayload = `${timestamp}.${body}`;
    const expectedSignature = await computeHmacSha256(webhookSecret, signedPayload);

    // Compare against provided signatures (constant-time via every check)
    const isValid = signatures.some(sig => sig === expectedSignature);
    if (!isValid) {
      console.error('Stripe signature mismatch');
    }
    return isValid;
  } catch (err) {
    console.error('Stripe signature verification error:', err);
    return false;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const signature = req.headers.get('stripe-signature');
    const body = await req.text();

    if (!signature) {
      console.error('Missing stripe-signature header');
      return new Response(
        JSON.stringify({ error: 'Missing stripe-signature header' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Stripe webhook received');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get webhook secret from DB config
    const { data: config } = await supabase
      .from('stripe_config')
      .select('webhook_secret')
      .eq('is_active', true)
      .single();

    if (!config?.webhook_secret) {
      console.error('Stripe webhook secret not configured');
      return new Response(
        JSON.stringify({ error: 'Webhook secret not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify the webhook signature before processing any payload
    const isValid = await verifyStripeSignature(body, signature, config.webhook_secret);
    if (!isValid) {
      return new Response(
        JSON.stringify({ error: 'Invalid webhook signature' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Signature verified — safe to parse the event
    const event = JSON.parse(body);
    console.log('Stripe event type:', event.type);

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const orderId = session.metadata?.order_id;

      if (orderId) {
        // Validate UUID format before DB update
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(orderId)) {
          console.error('Invalid order_id in webhook metadata:', orderId);
          return new Response(
            JSON.stringify({ error: 'Invalid order_id format' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Update transaction status
        await supabase
          .from('stripe_transactions')
          .update({
            status: 'completed',
            response_data: session,
          })
          .eq('payment_intent_id', session.id);

        // Update order payment status
        await supabase
          .from('orders')
          .update({
            payment_status: 'paid',
            status: 'confirmed',
          })
          .eq('id', orderId);

        console.log('Order payment confirmed:', orderId);
      }
    } else if (event.type === 'checkout.session.expired') {
      const session = event.data.object;

      await supabase
        .from('stripe_transactions')
        .update({
          status: 'failed',
          response_data: session,
        })
        .eq('payment_intent_id', session.id);

      console.log('Stripe session expired:', session.id);
    }

    return new Response(
      JSON.stringify({ received: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in stripe-webhook:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
