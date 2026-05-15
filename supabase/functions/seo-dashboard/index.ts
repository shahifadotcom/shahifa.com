import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SITE = 'https://shahifa.com/';
const GATEWAY = 'https://connector-gateway.lovable.dev/google_search_console';

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const { data: roles } = await userClient.from('user_roles')
      .select('role').eq('user_id', user.id).eq('role', 'admin');
    if (!roles?.length) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const GSC_KEY = Deno.env.get('GOOGLE_SEARCH_CONSOLE_API_KEY');
    if (!LOVABLE_API_KEY || !GSC_KEY) {
      return new Response(JSON.stringify({
        connected: false,
        verified: false,
        error: 'Google Search Console not connected',
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const headers = {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'X-Connection-Api-Key': GSC_KEY,
      'Content-Type': 'application/json',
    };

    // List sites
    const sitesRes = await fetch(`${GATEWAY}/webmasters/v3/sites`, { headers });
    const sitesData = await sitesRes.json().catch(() => ({}));
    const sites = (sitesData.siteEntry || []) as Array<{ siteUrl: string; permissionLevel: string }>;
    const verifiedSite = sites.find(s => s.siteUrl === SITE && s.permissionLevel !== 'siteUnverifiedUser');

    let topQueries: any[] = [];
    let totals = { clicks: 0, impressions: 0, ctr: 0, position: 0 };

    if (verifiedSite) {
      const end = new Date();
      const start = new Date();
      start.setDate(end.getDate() - 28);
      const fmt = (d: Date) => d.toISOString().slice(0, 10);

      const encoded = encodeURIComponent(SITE);
      const qRes = await fetch(`${GATEWAY}/webmasters/v3/sites/${encoded}/searchAnalytics/query`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          startDate: fmt(start),
          endDate: fmt(end),
          dimensions: ['query'],
          rowLimit: 10,
        }),
      });
      const qData = await qRes.json().catch(() => ({}));
      topQueries = qData.rows || [];

      const tRes = await fetch(`${GATEWAY}/webmasters/v3/sites/${encoded}/searchAnalytics/query`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          startDate: fmt(start),
          endDate: fmt(end),
          dimensions: [],
        }),
      });
      const tData = await tRes.json().catch(() => ({}));
      if (tData.rows?.[0]) totals = tData.rows[0];
    }

    return new Response(JSON.stringify({
      connected: true,
      verified: !!verifiedSite,
      site: SITE,
      sites: sites.map(s => s.siteUrl),
      totals,
      topQueries,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err: any) {
    console.error('seo-dashboard error', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
