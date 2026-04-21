// Publish a single social_posts row to all selected platforms / accounts.
// Invoked either directly by an admin (UI "Publish now") or by social-scheduler.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

interface PublishResult {
  account_id: string;
  platform: string;
  ok: boolean;
  remote_post_id?: string;
  error?: string;
}

// ---- Platform publishers --------------------------------------------------

async function publishFacebookPage(
  account: any,
  content: string,
  mediaUrls: string[],
): Promise<{ id: string }> {
  // Use the Page access token (stored in account.access_token after exchange)
  const pageId = account.page_id ?? account.account_id;
  const token = account.access_token;
  const base = `https://graph.facebook.com/v19.0/${pageId}`;

  if (mediaUrls.length === 0) {
    const res = await fetch(`${base}/feed`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: content, access_token: token }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json?.error?.message ?? "Facebook publish failed");
    return { id: json.id };
  }

  // Single image post
  const res = await fetch(`${base}/photos`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      url: mediaUrls[0],
      caption: content,
      access_token: token,
    }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error?.message ?? "Facebook photo failed");
  return { id: json.post_id ?? json.id };
}

async function publishFacebookGroup(
  account: any,
  content: string,
  mediaUrls: string[],
): Promise<{ id: string }> {
  // Note: As of 2024, FB has restricted Groups Publishing API. Best-effort attempt.
  const groupId = account.group_id ?? account.account_id;
  const token = account.access_token;
  const url = `https://graph.facebook.com/v19.0/${groupId}/feed`;
  const body: Record<string, unknown> = {
    message: content,
    access_token: token,
  };
  if (mediaUrls[0]) body.link = mediaUrls[0];
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error?.message ?? "Facebook group publish failed");
  return { id: json.id };
}

async function publishInstagram(
  account: any,
  content: string,
  mediaUrls: string[],
): Promise<{ id: string }> {
  if (mediaUrls.length === 0) {
    throw new Error("Instagram requires at least one image");
  }
  const igUserId = account.account_id;
  const token = account.access_token;

  // 1. Create container
  const createRes = await fetch(
    `https://graph.facebook.com/v19.0/${igUserId}/media`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        image_url: mediaUrls[0],
        caption: content,
        access_token: token,
      }),
    },
  );
  const createJson = await createRes.json();
  if (!createRes.ok) {
    throw new Error(createJson?.error?.message ?? "Instagram container failed");
  }
  const creationId = createJson.id;

  // 2. Publish container
  const pubRes = await fetch(
    `https://graph.facebook.com/v19.0/${igUserId}/media_publish`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ creation_id: creationId, access_token: token }),
    },
  );
  const pubJson = await pubRes.json();
  if (!pubRes.ok) {
    throw new Error(pubJson?.error?.message ?? "Instagram publish failed");
  }
  return { id: pubJson.id };
}

async function publishTwitter(
  account: any,
  content: string,
  _mediaUrls: string[],
): Promise<{ id: string }> {
  // Text-only via Twitter API v2 user context (Bearer = OAuth2 user access token)
  const token = account.access_token;
  const text = content.slice(0, 280);
  const res = await fetch("https://api.twitter.com/2/tweets", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ text }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.detail ?? json?.title ?? "Twitter publish failed");
  return { id: json?.data?.id ?? "" };
}

async function publishTikTok(
  _account: any,
  _content: string,
  _mediaUrls: string[],
): Promise<{ id: string }> {
  // TikTok's content posting requires a video upload flow + draft mode review.
  // Stub: TikTok publishing requires video assets; not supported via image-only posts.
  throw new Error(
    "TikTok publishing requires a video upload — not supported in this version",
  );
}

const PUBLISHERS: Record<
  string,
  (a: any, c: string, m: string[]) => Promise<{ id: string }>
> = {
  facebook_page: publishFacebookPage,
  facebook_group: publishFacebookGroup,
  instagram: publishInstagram,
  twitter: publishTwitter,
  tiktok: publishTikTok,
};

// ---- Main handler ---------------------------------------------------------

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { post_id } = await req.json();
    if (!post_id) {
      return new Response(JSON.stringify({ error: "post_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Authorization: either a logged-in admin or the scheduler (using anon key + system call)
    const authHeader = req.headers.get("Authorization") ?? "";
    const isSystemCall = authHeader.includes(ANON_KEY) || authHeader.includes(SERVICE_ROLE);

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    if (!isSystemCall) {
      const { data: claims } = await userClient.auth.getClaims(
        authHeader.replace("Bearer ", ""),
      );
      if (!claims?.claims?.sub) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: roles } = await userClient
        .from("user_roles")
        .select("role")
        .eq("user_id", claims.claims.sub);
      const isAdmin = (roles ?? []).some((r: any) => r.role === "admin");
      if (!isAdmin) {
        return new Response(JSON.stringify({ error: "Admin only" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Atomic claim: set status=publishing only if not already locked
    const { data: claimed, error: claimErr } = await admin
      .from("social_posts")
      .update({
        status: "publishing",
        locked_at: new Date().toISOString(),
        publish_attempts: undefined as unknown as number, // will set below via rpc-like increment
      })
      .eq("id", post_id)
      .in("status", ["draft", "scheduled", "failed"])
      .is("locked_at", null)
      .select("*")
      .maybeSingle();

    if (claimErr) throw claimErr;
    if (!claimed) {
      return new Response(
        JSON.stringify({ error: "Post not available (already publishing or published)" }),
        {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // increment attempts
    await admin
      .from("social_posts")
      .update({ publish_attempts: (claimed.publish_attempts ?? 0) + 1 })
      .eq("id", claimed.id);

    // Resolve target accounts
    const platforms: string[] = claimed.platforms ?? [];
    const targetIds: string[] = claimed.target_account_ids ?? [];

    let accountQuery = admin
      .from("social_accounts")
      .select("*")
      .eq("is_active", true)
      .in("platform", platforms);
    if (targetIds.length > 0) {
      accountQuery = accountQuery.in("id", targetIds);
    }
    const { data: accounts, error: accErr } = await accountQuery;
    if (accErr) throw accErr;

    const results: PublishResult[] = [];
    for (const acc of accounts ?? []) {
      const fn = PUBLISHERS[acc.platform];
      if (!fn) {
        results.push({
          account_id: acc.id,
          platform: acc.platform,
          ok: false,
          error: "Unsupported platform",
        });
        continue;
      }
      try {
        const { id: remoteId } = await fn(acc, claimed.content, claimed.media_urls ?? []);
        results.push({
          account_id: acc.id,
          platform: acc.platform,
          ok: true,
          remote_post_id: remoteId,
        });
      } catch (e) {
        results.push({
          account_id: acc.id,
          platform: acc.platform,
          ok: false,
          error: (e as Error).message,
        });
      }
    }

    const anyOk = results.some((r) => r.ok);
    const allOk = results.length > 0 && results.every((r) => r.ok);

    const platformPostIds: Record<string, string> = {};
    for (const r of results) {
      if (r.ok && r.remote_post_id) {
        platformPostIds[`${r.platform}:${r.account_id}`] = r.remote_post_id;
      }
    }

    const errorLog = results
      .filter((r) => !r.ok)
      .map((r) => `[${r.platform}] ${r.error}`)
      .join("\n");

    await admin
      .from("social_posts")
      .update({
        status: allOk ? "published" : anyOk ? "published" : "failed",
        published_at: anyOk ? new Date().toISOString() : null,
        platform_post_ids: platformPostIds,
        last_publish_error: errorLog || null,
        locked_at: null,
      })
      .eq("id", claimed.id);

    return new Response(
      JSON.stringify({ ok: anyOk, results, total: results.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("social-publish-post error", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
