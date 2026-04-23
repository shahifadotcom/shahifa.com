import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const RequestSchema = z.object({
  goal: z.string().trim().min(10).max(500).optional(),
});

type Snapshot = {
  totalProducts: number;
  publishedBlogCount: number;
  categoryCount: number;
  missingSlugCount: number;
  missingMetaTitleCount: number;
  missingMetaDescriptionCount: number;
  missingSocialPreviewCount: number;
  productsInSitemap: number;
  categoriesInSitemap: number;
  sitemapGeneratedAt: string | null;
  canonicalUrl: string | null;
  siteTitle: string | null;
  siteDescription: string | null;
  siteKeywords: string[];
};

const toolDefinition = {
  type: 'function',
  function: {
    name: 'build_seo_autopilot_plan',
    description: 'Return an actionable SEO and AI search growth plan for an e-commerce store.',
    parameters: {
      type: 'object',
      properties: {
        analysis: {
          type: 'object',
          properties: {
            readinessScore: { type: 'number' },
            aiSearchReadinessScore: { type: 'number' },
            summary: { type: 'string' },
            topOpportunities: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  impact: { type: 'string' },
                  whyItMatters: { type: 'string' },
                },
                required: ['title', 'impact', 'whyItMatters'],
                additionalProperties: false,
              },
              minItems: 3,
              maxItems: 5,
            },
            tasks: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  owner: { type: 'string' },
                  priority: { type: 'string', enum: ['high', 'medium', 'low'] },
                  timeline: { type: 'string' },
                  outcome: { type: 'string' },
                },
                required: ['title', 'owner', 'priority', 'timeline', 'outcome'],
                additionalProperties: false,
              },
              minItems: 4,
              maxItems: 8,
            },
            channels: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  channel: { type: 'string' },
                  playbook: { type: 'string' },
                  autopilotAction: { type: 'string' },
                },
                required: ['channel', 'playbook', 'autopilotAction'],
                additionalProperties: false,
              },
              minItems: 3,
              maxItems: 5,
            },
            schemaChecklist: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  status: { type: 'string', enum: ['ready', 'needs-work', 'missing'] },
                  action: { type: 'string' },
                },
                required: ['name', 'status', 'action'],
                additionalProperties: false,
              },
              minItems: 4,
              maxItems: 6,
            },
            next7Days: {
              type: 'array',
              items: { type: 'string' },
              minItems: 5,
              maxItems: 7,
            },
          },
          required: ['readinessScore', 'aiSearchReadinessScore', 'summary', 'topOpportunities', 'tasks', 'channels', 'schemaChecklist', 'next7Days'],
          additionalProperties: false,
        },
      },
      required: ['analysis'],
      additionalProperties: false,
    },
  },
} as const;

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function getAdminClient(authHeader: string) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl) throw new Error('SUPABASE_URL is not configured');
  if (!supabaseAnonKey) throw new Error('SUPABASE_ANON_KEY is not configured');
  if (!supabaseServiceRoleKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured');

  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: { user }, error: userError } = await userClient.auth.getUser();
  if (userError || !user) {
    return { error: jsonResponse({ error: 'Unauthorized' }, 401) };
  }

  const { data: roleRows, error: roleError } = await userClient
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .eq('role', 'admin')
    .limit(1);

  if (roleError || !roleRows?.length) {
    return { error: jsonResponse({ error: 'Forbidden' }, 403) };
  }

  const serviceClient = createClient(supabaseUrl, supabaseServiceRoleKey);
  return { user, serviceClient };
}

async function buildSnapshot(serviceClient: ReturnType<typeof createClient>): Promise<Snapshot> {
  const [
    productsResult,
    blogsResult,
    categoriesResult,
    sitemapResult,
    seoSettingsResult,
  ] = await Promise.all([
    serviceClient.from('products').select('id, slug, meta_title, meta_description, social_preview_image', { count: 'exact' }),
    serviceClient.from('blog_posts').select('id', { count: 'exact' }).eq('status', 'published'),
    serviceClient.from('categories').select('id', { count: 'exact' }),
    serviceClient.from('sitemap_cache').select('generated_at, products_count, categories_count').order('generated_at', { ascending: false }).limit(1).maybeSingle(),
    serviceClient.from('seo_settings').select('canonical_url, site_title, site_description, site_keywords').limit(1).maybeSingle(),
  ]);

  if (productsResult.error) throw productsResult.error;
  if (blogsResult.error) throw blogsResult.error;
  if (categoriesResult.error) throw categoriesResult.error;
  if (sitemapResult.error && sitemapResult.error.code !== 'PGRST116') throw sitemapResult.error;
  if (seoSettingsResult.error && seoSettingsResult.error.code !== 'PGRST116') throw seoSettingsResult.error;

  const products = productsResult.data ?? [];

  return {
    totalProducts: productsResult.count ?? products.length,
    publishedBlogCount: blogsResult.count ?? 0,
    categoryCount: categoriesResult.count ?? 0,
    missingSlugCount: products.filter((item) => !item.slug?.trim()).length,
    missingMetaTitleCount: products.filter((item) => !item.meta_title?.trim()).length,
    missingMetaDescriptionCount: products.filter((item) => !item.meta_description?.trim()).length,
    missingSocialPreviewCount: products.filter((item) => !item.social_preview_image?.trim()).length,
    productsInSitemap: sitemapResult.data?.products_count ?? 0,
    categoriesInSitemap: sitemapResult.data?.categories_count ?? 0,
    sitemapGeneratedAt: sitemapResult.data?.generated_at ?? null,
    canonicalUrl: seoSettingsResult.data?.canonical_url ?? null,
    siteTitle: seoSettingsResult.data?.site_title ?? null,
    siteDescription: seoSettingsResult.data?.site_description ?? null,
    siteKeywords: seoSettingsResult.data?.site_keywords ?? [],
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    const parsed = RequestSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return jsonResponse({ error: parsed.error.flatten().fieldErrors }, 400);
    }

    const adminContext = await getAdminClient(authHeader);
    if ('error' in adminContext) {
      return adminContext.error;
    }

    const snapshot = await buildSnapshot(adminContext.serviceClient);
    const goal = parsed.data.goal ?? 'Increase organic traffic, shopping visibility, and mentions in AI search answers for this store.';

    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const systemPrompt = `You are an elite ecommerce SEO strategist. Create an execution-focused autopilot plan for search engines and AI search assistants.
Always be specific to the provided store snapshot. Prioritize product discovery, structured data, content depth, internal linking, feed readiness, and answer-engine visibility.
Keep every sentence concise, commercial, and practical.`;

    const userPrompt = `Business goal:\n${goal}\n\nStore snapshot:\n${JSON.stringify(snapshot, null, 2)}\n\nRules:\n- Base all advice on the snapshot numbers and missing fields.
- Mention AI search readiness for tools like ChatGPT, Gemini, and answer engines.
- Recommend only realistic actions an ecommerce admin can act on.
- Emphasize how to win more buyers, not vanity metrics.`;

    const gatewayResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        tools: [toolDefinition],
        tool_choice: { type: 'function', function: { name: 'build_seo_autopilot_plan' } },
      }),
    });

    if (!gatewayResponse.ok) {
      if (gatewayResponse.status === 429) {
        return jsonResponse({ error: 'Rate limits exceeded, please try again later.' }, 429);
      }
      if (gatewayResponse.status === 402) {
        return jsonResponse({ error: 'Payment required, please add funds to your Lovable AI workspace.' }, 402);
      }

      const errorText = await gatewayResponse.text();
      console.error('seo-autopilot AI gateway error:', gatewayResponse.status, errorText);
      return jsonResponse({ error: 'AI gateway error' }, 500);
    }

    const completion = await gatewayResponse.json();
    const toolCall = completion.choices?.[0]?.message?.tool_calls?.[0];
    const argumentsText = toolCall?.function?.arguments;

    if (!argumentsText) {
      console.error('seo-autopilot missing tool call:', JSON.stringify(completion));
      return jsonResponse({ error: 'AI response did not include an action plan.' }, 500);
    }

    const parsedArguments = JSON.parse(argumentsText);

    return jsonResponse({
      analysis: parsedArguments.analysis,
      snapshot: {
        totalProducts: snapshot.totalProducts,
        publishedBlogCount: snapshot.publishedBlogCount,
        categoryCount: snapshot.categoryCount,
        missingSlugCount: snapshot.missingSlugCount,
        missingMetaTitleCount: snapshot.missingMetaTitleCount,
        missingMetaDescriptionCount: snapshot.missingMetaDescriptionCount,
        missingSocialPreviewCount: snapshot.missingSocialPreviewCount,
        productsInSitemap: snapshot.productsInSitemap,
        categoriesInSitemap: snapshot.categoriesInSitemap,
        sitemapGeneratedAt: snapshot.sitemapGeneratedAt,
        canonicalUrl: snapshot.canonicalUrl,
      },
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('seo-autopilot error:', error);
    return jsonResponse({ error: message }, 500);
  }
});