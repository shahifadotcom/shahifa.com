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

    // Get active campaigns
    const { data: campaigns } = await supabase
      .from('ai_ad_campaigns')
      .select('*')
      .eq('status', 'active');

    // Get recent tracking events for performance analysis
    const { data: events } = await supabase
      .from('tracking_events')
      .select('*')
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false });

    // Analyze with AI
    const prompt = `You are an AI marketing optimizer. Analyze these campaigns and tracking data:

Campaigns: ${JSON.stringify(campaigns)}
Recent Events (last 7 days): 
- Total events: ${events?.length}
- PageViews: ${events?.filter(e => e.event_name === 'PageView').length}
- AddToCart: ${events?.filter(e => e.event_name === 'AddToCart').length}
- Purchases: ${events?.filter(e => e.event_name === 'Purchase').length}

For each campaign, provide optimization recommendations:
1. Should we increase/decrease budget?
2. Target audience adjustments
3. Creative improvements
4. Which campaigns to pause
5. Expected impact on ROI

Focus on reducing ad costs while maintaining or increasing conversions.

Return as JSON array with campaign_id and optimizations.`;

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
    
    // Parse recommendations
    const jsonMatch = aiResponse.match(/\[[\s\S]*\]/);
    const recommendations = jsonMatch ? JSON.parse(jsonMatch[0]) : [];

    // Apply optimizations
    for (const rec of recommendations) {
      const campaign = campaigns?.find(c => c.id === rec.campaign_id);
      if (!campaign) continue;

      const updates: any = {
        ai_insights: {
          ...campaign.ai_insights,
          last_optimization: new Date().toISOString(),
          recommendation: rec.recommendation,
        },
      };

      if (rec.budget_change) {
        updates.budget_daily = campaign.budget_daily * (1 + rec.budget_change / 100);
      }

      if (rec.should_pause) {
        updates.status = 'paused';
      }

      await supabase
        .from('ai_ad_campaigns')
        .update(updates)
        .eq('id', campaign.id);

      await supabase.from('ai_optimization_logs').insert({
        campaign_id: campaign.id,
        optimization_type: rec.type || 'general',
        changes_made: updates,
        reasoning: rec.reasoning,
        expected_impact: rec.expected_impact,
      });
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        optimizations: recommendations,
        ai_analysis: aiResponse,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in ai-campaign-optimizer:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
