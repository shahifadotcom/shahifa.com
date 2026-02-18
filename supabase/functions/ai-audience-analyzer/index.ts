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
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

    // Verify user and check admin role
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

    // Admin-only function
    const { data: roles } = await userClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin');
    if (!roles?.length) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY not configured');
    }

    // Get tracking data and orders
    const { data: events } = await supabase
      .from('tracking_events')
      .select('*')
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

    const { data: orders } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

    // Analyze with Gemini
    const prompt = `Analyze this e-commerce data and provide audience insights:

Events (last 30 days): ${events?.length} total
- PageViews: ${events?.filter(e => e.event_name === 'PageView').length}
- Product Views: ${events?.filter(e => e.event_name === 'ViewContent').length}
- Add to Cart: ${events?.filter(e => e.event_name === 'AddToCart').length}
- Purchases: ${events?.filter(e => e.event_name === 'Purchase').length}

Orders: ${orders?.length}
Average Order Value: $${orders?.reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0) / (orders?.length || 1)}

Provide insights on:
1. Customer demographics (infer from behavior)
2. Top interests and behaviors
3. Best-performing products/categories
4. Optimal times for ads
5. Audience segments to target
6. Lookalike audience recommendations

Return as JSON with insights.`;

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      }
    );

    const geminiData = await geminiResponse.json();
    const aiResponse = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    const insights = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

    await supabase.from('ai_audience_insights').insert({
      insight_type: 'comprehensive',
      audience_data: insights,
      conversion_rate: (orders?.length || 0) / (events?.filter(e => e.event_name === 'ViewContent').length || 1),
      avg_order_value: orders?.reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0) / (orders?.length || 1),
      ai_recommendations: {
        summary: insights.summary || 'AI analysis complete',
        top_segments: insights.segments || [],
      },
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        insights,
        ai_analysis: aiResponse,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in ai-audience-analyzer:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
