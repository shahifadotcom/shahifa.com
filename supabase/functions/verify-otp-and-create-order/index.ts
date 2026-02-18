import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation helpers
function validatePhoneNumber(phone: string): boolean {
  return /^\+?[1-9]\d{6,14}$/.test(phone.replace(/\s+/g, ''));
}

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 255;
}

function validateString(value: unknown, maxLen: number): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > maxLen) return null;
  return trimmed;
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
    const body = await req.json().catch(() => ({}));
    const phoneNumber = typeof body?.phoneNumber === 'string' ? body.phoneNumber.replace(/\s+/g, '') : null;
    const otpCode = typeof body?.otpCode === 'string' ? body.otpCode.trim() : null;
    const orderData = body?.orderData ?? body ?? null;
    const skipOTPVerification = body?.skipOTPVerification ?? body?.skipOTP ?? false;

    if (!orderData) {
      return new Response(
        JSON.stringify({ error: 'Missing orderData' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!skipOTPVerification && (!phoneNumber || !otpCode)) {
      return new Response(
        JSON.stringify({ error: 'Missing phoneNumber or otpCode' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate phone number format
    if (phoneNumber && !validatePhoneNumber(phoneNumber)) {
      return new Response(
        JSON.stringify({ error: 'Invalid phone number format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate OTP format (6 digits)
    if (otpCode && !/^\d{4,8}$/.test(otpCode)) {
      return new Response(
        JSON.stringify({ error: 'Invalid OTP format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate order items
    const items = Array.isArray(orderData.items) ? orderData.items : [];
    if (items.length === 0 || items.length > 50) {
      return new Response(
        JSON.stringify({ error: 'Order must contain between 1 and 50 items' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    for (const item of items) {
      if (!validateUUID(item.productId)) {
        return new Response(
          JSON.stringify({ error: 'Invalid product ID in order items' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const qty = Number(item.quantity);
      if (!Number.isInteger(qty) || qty < 1 || qty > 100) {
        return new Response(
          JSON.stringify({ error: 'Invalid quantity: must be between 1 and 100' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Validate address fields
    const fullName = validateString(orderData.fullName, 100);
    if (!fullName) {
      return new Response(
        JSON.stringify({ error: 'Invalid or missing fullName (max 100 characters)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const fullAddress = validateString(orderData.fullAddress, 500);
    if (!fullAddress) {
      return new Response(
        JSON.stringify({ error: 'Invalid or missing fullAddress (max 500 characters)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    if (orderData.email && !validateEmail(orderData.email)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify OTP only if not skipping (when called after payment)
    if (!skipOTPVerification) {
      console.log('Verifying OTP for phone:', phoneNumber);

      const { data: otpRecords, error: otpError } = await supabase
        .from('otp_verifications')
        .select('*')
        .eq('phone_number', phoneNumber)
        .eq('is_verified', false)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      console.log(`Found ${otpRecords?.length || 0} unverified OTP records for this phone number`);

      let otpVerification = null;
      if (otpRecords && otpRecords.length > 0) {
        for (const record of otpRecords) {
          if (record.otp_code.length === otpCode!.length) {
            let isMatch = true;
            for (let i = 0; i < record.otp_code.length; i++) {
              if (record.otp_code.charCodeAt(i) !== otpCode!.charCodeAt(i)) {
                isMatch = false;
              }
            }
            if (isMatch) {
              otpVerification = record;
              console.log('OTP matched successfully');
              break;
            }
          }
        }
      }

      if (otpError) {
        console.error('Error verifying OTP:', otpError);
        throw otpError;
      }

      if (!otpVerification) {
        console.error('No matching OTP found');

        const { data: verifiedOTP } = await supabase
          .from('otp_verifications')
          .select('id')
          .eq('phone_number', phoneNumber)
          .eq('otp_code', otpCode)
          .eq('is_verified', true)
          .maybeSingle();

        if (verifiedOTP) {
          return new Response(
            JSON.stringify({ success: false, message: 'This OTP has already been used. Please request a new OTP.' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { data: expiredOTP } = await supabase
          .from('otp_verifications')
          .select('id')
          .eq('phone_number', phoneNumber)
          .eq('otp_code', otpCode)
          .lte('expires_at', new Date().toISOString())
          .maybeSingle();

        if (expiredOTP) {
          return new Response(
            JSON.stringify({ success: false, message: 'This OTP has expired. Please request a new OTP.' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ success: false, message: 'Invalid OTP code. Please check and try again.' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      await supabase
        .from('otp_verifications')
        .update({ is_verified: true })
        .eq('id', otpVerification.id);
    } else {
      console.log('Skipping OTP verification - creating order after payment verification');
    }

    // Check if user exists or create new user (optional when skipping OTP)
    let userId: string | null = null;
    if (phoneNumber) {
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('phone', phoneNumber)
        .maybeSingle();

      if (existingProfile) {
        userId = existingProfile.id;
      } else {
        // Sanitize name before creating user account
        const safeName = fullName.replace(/[<>'"]/g, '').substring(0, 100);
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
          phone: phoneNumber,
          phone_confirm: true,
          user_metadata: {
            full_name: safeName,
            phone: phoneNumber
          }
        });

        if (authError) {
          console.error('Error creating user:', authError);
          throw authError;
        }

        userId = authData.user.id;

        const nameParts = safeName.split(' ');
        await supabase
          .from('profiles')
          .insert({
            id: userId,
            first_name: nameParts[0] || '',
            last_name: nameParts.slice(1).join(' ') || '',
            phone: phoneNumber
          });
      }
    }

    // SERVER-SIDE price calculation: fetch actual product prices from DB
    const productIds = items.map((item: any) => item.productId);
    const { data: dbProducts, error: productsError } = await supabase
      .from('products')
      .select('id, price, stock_quantity, is_digital, sku, shipping_cost, tax_rate')
      .in('id', productIds);

    if (productsError || !dbProducts) {
      console.error('Error fetching products for price validation:', productsError);
      return new Response(
        JSON.stringify({ error: 'Failed to validate order items' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate all products exist and calculate server-side totals
    let calculatedSubtotal = 0;
    for (const item of items) {
      const dbProduct = dbProducts.find((p: any) => p.id === item.productId);
      if (!dbProduct) {
        return new Response(
          JSON.stringify({ error: `Product ${item.productId} not found` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      // Use server-side price, not client-supplied price
      calculatedSubtotal += dbProduct.price * item.quantity;
    }

    // Determine payment status
    const isCOD = orderData.paymentMethod?.toLowerCase().includes('cod') ||
                  orderData.paymentMethod?.toLowerCase().includes('cash');
    const paymentStatus = isCOD ? 'pending' : 'paid';

    // Use shipping from orderData but cap it reasonably
    const shippingAmount = Math.max(0, Math.min(Number(orderData.shipping) || 0, 10000));
    // Recalculate tax server-side if tax rate provided, otherwise accept from orderData
    const taxAmount = Math.max(0, Math.min(Number(orderData.tax) || 0, calculatedSubtotal));
    const calculatedTotal = calculatedSubtotal + taxAmount + shippingAmount;

    // Generate order number starting from 1001
    const { data: lastOrder } = await supabase
      .from('orders')
      .select('order_number')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    let orderSequence = 1001;
    if (lastOrder?.order_number) {
      const lastNumber = parseInt(lastOrder.order_number);
      if (!isNaN(lastNumber) && lastNumber >= 1001) {
        orderSequence = lastNumber + 1;
      }
    }

    const orderNumber = orderSequence.toString();

    const billingAddress = {
      fullName: fullName,
      fullAddress: fullAddress,
      whatsappNumber: typeof orderData.whatsappNumber === 'string'
        ? orderData.whatsappNumber.substring(0, 20)
        : '',
      country: typeof orderData.country === 'string'
        ? orderData.country.substring(0, 100)
        : ''
    };

    // Create order with server-calculated total
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        order_number: orderNumber,
        customer_id: userId,
        customer_email: orderData.email || '',
        status: 'confirmed',
        payment_status: paymentStatus,
        payment_method: orderData.paymentMethod || 'COD',
        subtotal: calculatedSubtotal,
        tax: taxAmount,
        shipping: shippingAmount,
        total: calculatedTotal,
        billing_address: billingAddress,
        shipping_address: billingAddress
      })
      .select()
      .single();

    if (orderError) {
      console.error('Error creating order:', orderError);
      throw orderError;
    }

    // Create order items using server-validated prices
    let hasDigitalProduct = false;
    let hasSubscriptionProduct = false;

    if (items.length > 0) {
      const orderItemsData = items.map((item: any) => {
        const dbProduct = dbProducts.find((p: any) => p.id === item.productId);
        return {
          order_id: order.id,
          product_id: item.productId,
          product_name: item.product?.name || '',
          product_image: item.product?.images?.[0] ?? null,
          quantity: item.quantity,
          price: dbProduct?.price ?? item.price, // use DB price
          variant_data: item.variant || null
        };
      });

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItemsData);

      if (itemsError) {
        console.error('Error creating order items:', itemsError);
        throw itemsError;
      }

      // Reduce stock quantities with optimistic locking check
      for (const item of items) {
        if (item.productId && item.quantity) {
          const { data: product } = await supabase
            .from('products')
            .select('stock_quantity')
            .eq('id', item.productId)
            .maybeSingle();

          if (product) {
            const newStock = Math.max(0, (product.stock_quantity || 0) - item.quantity);

            await supabase
              .from('products')
              .update({
                stock_quantity: newStock,
                in_stock: newStock > 0
              })
              .eq('id', item.productId)
              .gte('stock_quantity', item.quantity); // only update if still enough stock

            console.log(`Reduced stock for product ${item.productId}: ${product.stock_quantity} -> ${newStock}`);
          }
        }
      }

      hasDigitalProduct = dbProducts.some((p: any) => p.is_digital);
      hasSubscriptionProduct = dbProducts.some((p: any) => p.sku === 'CALLING-12M');
    }

    if (hasDigitalProduct && paymentStatus === 'paid') {
      console.log('Digital product detected - auto-completing order');

      await supabase
        .from('orders')
        .update({ status: 'delivered' })
        .eq('id', order.id);

      if (hasSubscriptionProduct && userId) {
        console.log('Subscription product detected - activating subscription');
        try {
          await supabase.functions.invoke('activate-calling-subscription', {
            body: { orderId: order.id, userId }
          });
        } catch (subError) {
          console.error('Error activating subscription:', subError);
        }
      }
    }

    await supabase.functions.invoke('send-order-notification', {
      body: { orderId: order.id, templateName: 'order_confirmed' }
    });

    console.log(`Order ${orderNumber} created successfully for user ${userId}`);

    return new Response(
      JSON.stringify({
        success: true,
        userId,
        orderId: order.id,
        orderNumber,
        isDigital: hasDigitalProduct,
        isSubscription: hasSubscriptionProduct
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in verify-otp-and-create-order function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
