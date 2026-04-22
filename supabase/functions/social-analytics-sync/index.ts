import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

type AnalyticsMetrics = {
  impressions: number;
  reach: number;
  likes: number;
  comments: number;
  shares: number;
  clicks: number;
  raw_metrics: Record<string, unknown>;
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function isAuthorized(req: Request) {
  const authHeader = req.headers.get("Authorization") ?? "";
  const isSystemCall = authHeader.includes(ANON_KEY) || authHeader.includes(SERVICE_ROLE);
  if (isSystemCall) return true;
  if (!authHeader.startsWith("Bearer ")) return false;

  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });

  const token = authHeader.replace("Bearer ", "");
  const { data, error } = await userClient.auth.getClaims(token);
  if (error || !data?.claims?.sub) return false;

  const { data: roles } = await userClient
    .from("user_roles")
    .select("role")
    .eq("user_id", data.claims.sub)
    .eq("role", "admin")
    .limit(1);

  return !!roles?.length;
}

async function fetchFacebookMetrics(remotePostId: string, accessToken: string): Promise<AnalyticsMetrics> {
  const [summaryRes, insightsRes] = await Promise.all([
    fetch(`https://graph.facebook.com/v19.0/${remotePostId}?fields=reactions.summary(true),comments.summary(true),shares&access_token=${encodeURIComponent(accessToken)}`),
    fetch(`https://graph.facebook.com/v19.0/${remotePostId}/insights?metric=post_impressions,post_impressions_unique,post_clicks&access_token=${encodeURIComponent(accessToken)}`),
  ]);

  const summaryJson = await summaryRes.json().catch(() => ({}));
  const insightsJson = await insightsRes.json().catch(() => ({}));

  const insightValues = new Map<string, number>();
  for (const item of insightsJson?.data ?? []) {
    const value = Array.isArray(item?.values) ? Number(item.values[0]?.value ?? 0) : 0;
    if (item?.name) insightValues.set(item.name, value);
  }

  return {
    impressions: Number(insightValues.get("post_impressions") ?? 0),
    reach: Number(insightValues.get("post_impressions_unique") ?? 0),
    likes: Number(summaryJson?.reactions?.summary?.total_count ?? 0),
    comments: Number(summaryJson?.comments?.summary?.total_count ?? 0),
    shares: Number(summaryJson?.shares?.count ?? 0),
    clicks: Number(insightValues.get("post_clicks") ?? 0),
    raw_metrics: { summary: summaryJson, insights: insightsJson },
  };
}

async function fetchInstagramMetrics(remotePostId: string, accessToken: string): Promise<AnalyticsMetrics> {
  const res = await fetch(`https://graph.facebook.com/v19.0/${remotePostId}/insights?metric=impressions,reach,likes,comments,shares,saved&access_token=${encodeURIComponent(accessToken)}`);
  const jsonData = await res.json().catch(() => ({}));

  const metricMap = new Map<string, number>();
  for (const item of jsonData?.data ?? []) {
    metricMap.set(item?.name, Number(item?.values?.[0]?.value ?? 0));
  }

  return {
    impressions: Number(metricMap.get("impressions") ?? 0),
    reach: Number(metricMap.get("reach") ?? 0),
    likes: Number(metricMap.get("likes") ?? 0),
    comments: Number(metricMap.get("comments") ?? 0),
    shares: Number(metricMap.get("shares") ?? 0),
    clicks: 0,
    raw_metrics: jsonData,
  };
}

async function fetchTwitterMetrics(remotePostId: string, accessToken: string): Promise<AnalyticsMetrics> {
  const res = await fetch(`https://api.x.com/2/tweets/${remotePostId}?tweet.fields=public_metrics,non_public_metrics`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const jsonData = await res.json().catch(() => ({}));
  const publicMetrics = jsonData?.data?.public_metrics ?? {};
  const privateMetrics = jsonData?.data?.non_public_metrics ?? {};

  return {
    impressions: Number(privateMetrics?.impression_count ?? 0),
    reach: 0,
    likes: Number(publicMetrics?.like_count ?? 0),
    comments: Number(publicMetrics?.reply_count ?? 0),
    shares: Number(publicMetrics?.retweet_count ?? 0),
    clicks: Number(privateMetrics?.url_link_clicks ?? 0),
    raw_metrics: jsonData,
  };
}

async function fetchMetrics(platform: string, remotePostId: string, accessToken: string) {
  if (platform === "facebook_page" || platform === "facebook_group") {
    return await fetchFacebookMetrics(remotePostId, accessToken);
  }
  if (platform === "instagram") {
    return await fetchInstagramMetrics(remotePostId, accessToken);
  }
  if (platform === "twitter") {
    return await fetchTwitterMetrics(remotePostId, accessToken);
  }
  throw new Error(`Analytics sync not supported for ${platform}`);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authorized = await isAuthorized(req);
    if (!authorized) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: posts, error: postsError } = await admin
      .from("social_posts")
      .select("id, platform_post_ids, published_at")
      .eq("status", "published")
      .not("platform_post_ids", "is", null)
      .order("published_at", { ascending: false })
      .limit(100);

    if (postsError) throw postsError;

    const upserts: Record<string, unknown>[] = [];
    const errors: Array<{ post_id: string; platform?: string; error: string }> = [];

    for (const post of posts ?? []) {
      const postIds = (post.platform_post_ids ?? {}) as Record<string, string>;
      for (const [key, remotePostId] of Object.entries(postIds)) {
        const [platform, accountId] = key.split(":");
        if (!platform || !accountId || !remotePostId) continue;

        const { data: account, error: accountError } = await admin
          .from("social_accounts")
          .select("id, platform, access_token")
          .eq("id", accountId)
          .maybeSingle();

        if (accountError || !account?.access_token) {
          errors.push({ post_id: post.id, platform, error: accountError?.message ?? "Missing access token" });
          continue;
        }

        try {
          const metrics = await fetchMetrics(platform, remotePostId, account.access_token);
          upserts.push({
            post_id: post.id,
            account_id: account.id,
            platform,
            remote_post_id: remotePostId,
            ...metrics,
            fetched_at: new Date().toISOString(),
          });
        } catch (error) {
          errors.push({ post_id: post.id, platform, error: (error as Error).message });
        }
      }
    }

    if (upserts.length) {
      const { error: upsertError } = await admin
        .from("social_post_analytics")
        .upsert(upserts, { onConflict: "post_id,account_id" });
      if (upsertError) throw upsertError;
    }

    return json({ ok: true, synced: upserts.length, errors });
  } catch (error) {
    console.error("social-analytics-sync error", error);
    return json({ error: (error as Error).message }, 500);
  }
});
