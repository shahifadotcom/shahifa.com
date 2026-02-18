import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 255;
}

function validateUUID(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    // Get authenticated user (optional for guest checkout)
    const authHeader = req.headers.get('Authorization');
    let user = null;

    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data } = await supabaseClient.auth.getUser(token);
      user = data.user;
    }

    const orderData = await req.json();

    // Validate required fields
    if (!orderData.customerEmail || !validateEmail(orderData.customerEmail)) {
      return new Response(
        JSON.stringify({ error: 'Valid customer email is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    if (!Array.isArray(orderData.items) || orderData.items.length === 0 || orderData.items.length > 50) {
      return new Response(
        JSON.stringify({ error: 'Order must contain between 1 and 50 items' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate each item has valid UUID productId and quantity
    for (const item of orderData.items) {
      if (!validateUUID(item.productId)) {
        return new Response(
          JSON.stringify({ error: 'Invalid product ID in order items' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const qty = Number(item.quantity);
      if (!Number.isInteger(qty) || qty < 1 || qty > 100) {
        return new Response(
          JSON.stringify({ error: 'Invalid item quantity: must be between 1 and 100' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // SERVER-SIDE price calculation - fetch actual prices from database
    const productIds = orderData.items.map((i: any) => i.productId);
    const { data: dbProducts, error: productsError } = await supabaseAdmin
      .from('products')
      .select('id, name, price, images, stock_quantity')
      .in('id', productIds);

    if (productsError || !dbProducts) {
      console.error('Error fetching products:', productsError);
      return new Response(
        JSON.stringify({ error: 'Failed to validate order products' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Ensure all products exist
    for (const item of orderData.items) {
      const dbProduct = dbProducts.find((p: any) => p.id === item.productId);
      if (!dbProduct) {
        return new Response(
          JSON.stringify({ error: `Product ${item.productId} not found` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Calculate totals server-side using DB prices
    let calculatedSubtotal = 0;
    for (const item of orderData.items) {
      const dbProduct = dbProducts.find((p: any) => p.id === item.productId)!;
      calculatedSubtotal += dbProduct.price * item.quantity;
    }

    const shippingAmount = Math.max(0, Math.min(Number(orderData.shipping) || 0, 10000));
    const taxAmount = Math.max(0, Math.min(Number(orderData.tax) || 0, calculatedSubtotal));
    const calculatedTotal = calculatedSubtotal + taxAmount + shippingAmount;

    const orderNumber = `ORD-${Date.now()}`;

    console.log('Creating order:', { orderNumber, customerEmail: orderData.customerEmail });

    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert({
        order_number: orderNumber,
        customer_id: user?.id || null,
        customer_email: orderData.customerEmail,
        subtotal: calculatedSubtotal,
        tax: taxAmount,
        shipping: shippingAmount,
        total: calculatedTotal,
        billing_address: orderData.billingAddress || {},
        shipping_address: orderData.shippingAddress || {},
        status: 'pending',
        payment_status: 'pending'
      })
      .select()
      .single();

    if (orderError) {
      console.error('Order creation error:', orderError);
      throw orderError;
    }

    console.log('Order created:', order.id);

    // Create order items using server-validated product data
    const orderItems = orderData.items.map((item: any) => {
      const dbProduct = dbProducts.find((p: any) => p.id === item.productId)!;
      return {
        order_id: order.id,
        product_id: item.productId,
        product_name: dbProduct.name,
        product_image: dbProduct.images?.[0] || '',
        quantity: item.quantity,
        price: dbProduct.price, // always use DB price
        variant_data: item.variant || null
      };
    });

    const { error: itemsError } = await supabaseAdmin
      .from('order_items')
      .insert(orderItems);

    if (itemsError) {
      console.error('Order items creation error:', itemsError);
      await supabaseAdmin.from('orders').delete().eq('id', order.id);
      throw itemsError;
    }

    console.log('Order items created for order:', order.id);

    return new Response(
      JSON.stringify({
        success: true,
        orderId: order.id,
        orderNumber: order.order_number,
        message: 'Order created successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('Error in create-order function:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to create order' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
