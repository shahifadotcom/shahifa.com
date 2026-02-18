import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Require authentication - only authenticated users can trigger payment verification
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

    // Validate token with anon client first
    const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = claimsData.claims.sub;

    // Parse and validate input
    const body = await req.json();
    const { transactionId, orderId, amount } = body;

    if (!transactionId || !orderId || typeof amount !== 'number') {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: transactionId, orderId, amount' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(orderId)) {
      return new Response(
        JSON.stringify({ error: 'Invalid orderId format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use service role for DB operations but only after verifying ownership
    const supabaseAdmin = createClient(
      supabaseUrl,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    // Verify the order belongs to the authenticated user before proceeding
    const { data: order, error: orderFetchError } = await supabaseAdmin
      .from('orders')
      .select('id, customer_id, total, payment_status')
      .eq('id', orderId)
      .eq('customer_id', userId)
      .maybeSingle();

    if (orderFetchError || !order) {
      return new Response(
        JSON.stringify({ error: 'Order not found or access denied' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prevent double-payment verification
    if (order.payment_status === 'paid') {
      return new Response(
        JSON.stringify({ success: true, message: 'Order already marked as paid' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Verifying Binance payment: ${transactionId} for order: ${orderId}`);

    const isValidTransaction = await verifyBinanceTransaction(supabaseAdmin, transactionId, amount);

    if (isValidTransaction) {
      const { error: updateError } = await supabaseAdmin
        .from('transaction_verifications')
        .update({
          status: 'verified',
          verified_at: new Date().toISOString()
        })
        .eq('transaction_id', transactionId)
        .eq('order_id', orderId);

      if (updateError) throw updateError;

      const { error: orderError } = await supabaseAdmin
        .from('orders')
        .update({ payment_status: 'paid' })
        .eq('id', orderId);

      if (orderError) throw orderError;

      await supabaseAdmin.functions.invoke('send-whatsapp-message', {
        body: {
          orderId,
          message: 'Payment verified successfully! Your order is being processed.'
        }
      });

      return new Response(JSON.stringify({
        success: true,
        message: 'Payment verified successfully'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    } else {
      await supabaseAdmin
        .from('transaction_verifications')
        .update({
          status: 'failed',
          verified_at: new Date().toISOString()
        })
        .eq('transaction_id', transactionId)
        .eq('order_id', orderId);

      return new Response(JSON.stringify({
        success: false,
        message: 'Payment verification failed'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

  } catch (error) {
    console.error('Error verifying Binance payment:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});

async function verifyBinanceTransaction(
  supabaseAdmin: ReturnType<typeof createClient>,
  transactionId: string,
  expectedAmount: number
): Promise<boolean> {
  try {
    const { data: config } = await supabaseAdmin
      .from('binance_config')
      .select('api_key, api_secret')
      .eq('is_active', true)
      .maybeSingle();

    if (!config) {
      console.log('Binance Pay not configured, skipping verification');
      return false;
    }

    const timestamp = Date.now().toString();
    const nonce = crypto.randomUUID().replace(/-/g, '');
    const payload = JSON.stringify({ prepayId: transactionId });

    const signaturePayload = timestamp + nonce + payload;
    const encoder = new TextEncoder();
    const keyData = encoder.encode(config.api_secret);
    const messageData = encoder.encode(signaturePayload);

    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-512' },
      false,
      ['sign']
    );

    const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
    const signature = Array.from(new Uint8Array(signatureBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    const response = await fetch('https://bpay.binanceapi.com/binancepay/openapi/v2/order/query', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'BinancePay-Timestamp': timestamp,
        'BinancePay-Nonce': nonce,
        'BinancePay-Certificate-SN': config.api_key,
        'BinancePay-Signature': signature.toUpperCase(),
      },
      body: payload
    });

    const result = await response.json();
    console.log('Binance API response status:', result.status);

    return result.status === 'SUCCESS' && result.data?.orderStatus === 'PAID';
  } catch (error) {
    console.error('Binance verification error:', error);
    return false;
  }
}
