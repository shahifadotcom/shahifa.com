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
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

    // Verify JWT and get user identity
    const anonClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = claimsData.claims.sub;

    const { orderId, amount, customerInfo } = await req.json();

    if (!orderId || typeof amount !== 'number') {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields: orderId, amount' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(orderId)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid orderId format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use service role for privileged DB operations
    const supabaseAdmin = createClient(
      supabaseUrl,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    // Verify the order belongs to the authenticated user
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('id, customer_id, total, payment_status')
      .eq('id', orderId)
      .eq('customer_id', userId)
      .maybeSingle();

    if (orderError || !order) {
      return new Response(
        JSON.stringify({ success: false, error: 'Order not found or access denied' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Initiating SSLCommerz payment for order:', orderId);

    // Get SSLCommerz config
    const { data: config, error: configError } = await supabaseAdmin
      .from('sslcommerz_config')
      .select('*')
      .eq('is_active', true)
      .single();

    if (configError || !config) {
      throw new Error('SSLCommerz is not configured or inactive');
    }

    const baseUrl = config.is_sandbox
      ? 'https://sandbox.sslcommerz.com'
      : 'https://securepay.sslcommerz.com';

    const transactionId = `${orderId}-${Date.now()}`;

    // Prepare SSLCommerz request
    const sslcommerzData = {
      store_id: config.store_id,
      store_passwd: config.store_password,
      total_amount: amount.toString(),
      currency: 'BDT',
      tran_id: transactionId,
      success_url: `${supabaseUrl}/functions/v1/sslcommerz-callback?type=success`,
      fail_url: `${supabaseUrl}/functions/v1/sslcommerz-callback?type=fail`,
      cancel_url: `${supabaseUrl}/functions/v1/sslcommerz-callback?type=cancel`,
      ipn_url: `${supabaseUrl}/functions/v1/sslcommerz-ipn`,
      cus_name: customerInfo?.name || 'Customer',
      cus_email: customerInfo?.email || 'customer@example.com',
      cus_phone: customerInfo?.phone || '01700000000',
      cus_add1: customerInfo?.address || 'Dhaka',
      cus_city: customerInfo?.city || 'Dhaka',
      cus_country: 'Bangladesh',
      shipping_method: 'NO',
      product_name: `Order #${orderId.substring(0, 8)}`,
      product_category: 'General',
      product_profile: 'general',
    };

    console.log('Sending request to SSLCommerz:', baseUrl);

    // Initialize payment session
    const response = await fetch(`${baseUrl}/gwprocess/v4/api.php`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(sslcommerzData).toString(),
    });

    const result = await response.json();
    console.log('SSLCommerz response status:', result.status);

    if (result.status === 'SUCCESS') {
      // Store transaction record
      const { error: txError } = await supabaseAdmin
        .from('sslcommerz_transactions')
        .insert({
          order_id: orderId,
          transaction_id: transactionId,
          session_key: result.sessionkey,
          amount: amount,
          currency: 'BDT',
          status: 'pending',
          response_data: result,
        });

      if (txError) {
        console.error('Error storing transaction:', txError);
      }

      return new Response(
        JSON.stringify({
          success: true,
          gatewayUrl: result.GatewayPageURL,
          transactionId: transactionId,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      throw new Error(result.failedreason || 'Failed to initialize payment');
    }
  } catch (error) {
    console.error('SSLCommerz init error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Payment initialization failed',
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
