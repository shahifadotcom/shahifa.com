import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { testPhone } = await req.json();
    
    if (!testPhone) {
      return new Response(
        JSON.stringify({ error: 'Test phone number is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const whatsappBridgeUrl = Deno.env.get('WHATSAPP_BRIDGE_URL') || 'http://45.88.191.92:3001';
    
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const testResults = {
      step1_bridge_connection: false,
      step2_send_message: false,
      step3_notification_log: false,
      step4_template_fetch: false,
      errors: [] as string[]
    };

    // Step 1: Test WhatsApp Bridge Connection
    console.log('Step 1: Testing WhatsApp bridge connection...');
    try {
      const statusResponse = await fetch(`${whatsappBridgeUrl}/status`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        testResults.step1_bridge_connection = true;
        console.log('✓ Bridge connected, status:', statusData);
      } else {
        testResults.errors.push(`Bridge returned status ${statusResponse.status}`);
      }
    } catch (error) {
      testResults.errors.push(`Bridge connection failed: ${error.message}`);
    }

    // Step 2: Test Sending WhatsApp Message
    console.log('Step 2: Testing WhatsApp message sending...');
    try {
      const messageResponse = await fetch(`${whatsappBridgeUrl}/send-message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: testPhone,
          message: `🧪 WhatsApp Integration Test\n\nThis is a test message from your e-commerce store.\n\nTimestamp: ${new Date().toISOString()}`
        })
      });

      const messageData = await messageResponse.json().catch(() => ({}));
      
      if (messageResponse.ok && messageData.success) {
        testResults.step2_send_message = true;
        console.log('✓ Message sent successfully');
      } else {
        testResults.errors.push(`Message send failed: ${messageData.error || 'Unknown error'}`);
      }
    } catch (error) {
      testResults.errors.push(`Message sending error: ${error.message}`);
    }

    // Step 3: Test Notification Log Insert
    console.log('Step 3: Testing notification log insert...');
    try {
      const { error: logError } = await supabase
        .from('notification_logs')
        .insert({
          phone_number: testPhone,
          message: 'Test message from test-whatsapp-flow',
          status: testResults.step2_send_message ? 'sent' : 'failed'
        });

      if (!logError) {
        testResults.step3_notification_log = true;
        console.log('✓ Notification log inserted');
      } else {
        testResults.errors.push(`Notification log error: ${logError.message}`);
      }
    } catch (error) {
      testResults.errors.push(`Log insert error: ${error.message}`);
    }

    // Step 4: Test Template Fetch
    console.log('Step 4: Testing notification template fetch...');
    try {
      const { data: template, error: templateError } = await supabase
        .from('notification_templates')
        .select('*')
        .eq('name', 'order_confirmed')
        .maybeSingle();

      if (template) {
        testResults.step4_template_fetch = true;
        console.log('✓ Template fetched:', template.name);
      } else if (templateError) {
        testResults.errors.push(`Template fetch error: ${templateError.message}`);
      } else {
        testResults.errors.push('Template "order_confirmed" not found in database');
      }
    } catch (error) {
      testResults.errors.push(`Template fetch error: ${error.message}`);
    }

    const allPassed = testResults.step1_bridge_connection && 
                      testResults.step2_send_message && 
                      testResults.step3_notification_log && 
                      testResults.step4_template_fetch;

    return new Response(
      JSON.stringify({
        success: allPassed,
        testResults,
        message: allPassed 
          ? '✅ All WhatsApp integration tests passed!' 
          : '⚠️ Some tests failed - check testResults for details',
        whatsappBridgeUrl
      }),
      { 
        status: allPassed ? 200 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Test error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Test execution failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
