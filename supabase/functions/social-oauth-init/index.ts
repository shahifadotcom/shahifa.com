// Initiates an OAuth flow for a given social platform.
// Admin-only. Returns an authorize_url the client should redirect to.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Platform = "facebook_page" | "facebook_group" | "instagram" | "twitter" | "tiktok";

const FB_SCOPES = [
  "pages_show_list",
  "pages_manage_posts",
  "pages_read_engagement",
  "pages_manage_engagement",
  "publish_to_groups",
  "groups_access_member_info",
  "instagram_basic",
  "instagram_content_publish",
  "instagram_manage_comments",
  "business_management",
];
const TWITTER_SCOPES = ["tweet.read", "tweet.write", "users.read", "offline.access"];
const TIKTOK_SCOPES = ["user.info.basic", "video.publish", "video.upload"];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) return json({ error: "Unauthorized" }, 401);

    const { data: roles } = await userClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin");
    if (!roles?.length) return json({ error: "Forbidden" }, 403);

    const body = await req.json();
    const platform = body.platform as Platform;
    const redirect_after = (body.redirect_after as string) || "/admin/ai-social-manager";
    if (!platform) return json({ error: "platform required" }, 400);

    const admin = createClient(supabaseUrl, serviceKey);

    // Look up app credentials for this platform group
    const credPlatform = platform === "facebook_group" || platform === "instagram" ? "facebook_page" : platform;
    const { data: cred, error: credErr } = await admin
      .from("social_app_credentials")
      .select("*")
      .eq("platform", credPlatform)
      .eq("is_active", true)
      .maybeSingle();
    if (credErr || !cred) {
      return json({
        error: `No active app credentials configured for ${credPlatform}. Add Client ID/Secret in the AI Social Manager → Accounts → App Credentials section first.`,
      }, 400);
    }

    // Build callback URL (this edge function's sibling)
    const callbackUrl = `${supabaseUrl}/functions/v1/social-oauth-callback`;

    const state = crypto.randomUUID() + "." + crypto.randomUUID();
    let codeVerifier: string | null = null;
    let authorize_url = "";

    if (platform === "facebook_page" || platform === "facebook_group" || platform === "instagram") {
      const params = new URLSearchParams({
        client_id: cred.client_id,
        redirect_uri: callbackUrl,
        state: `${platform}:${state}`,
        response_type: "code",
        scope: FB_SCOPES.join(","),
      });
      authorize_url = `https://www.facebook.com/v19.0/dialog/oauth?${params}`;
    } else if (platform === "twitter") {
      // PKCE
      codeVerifier = base64UrlEncode(crypto.getRandomValues(new Uint8Array(64)));
      const challenge = await sha256Base64Url(codeVerifier);
      const params = new URLSearchParams({
        response_type: "code",
        client_id: cred.client_id,
        redirect_uri: callbackUrl,
        scope: TWITTER_SCOPES.join(" "),
        state: `${platform}:${state}`,
        code_challenge: challenge,
        code_challenge_method: "S256",
      });
      authorize_url = `https://twitter.com/i/oauth2/authorize?${params}`;
    } else if (platform === "tiktok") {
      const params = new URLSearchParams({
        client_key: cred.client_id,
        scope: TIKTOK_SCOPES.join(","),
        response_type: "code",
        redirect_uri: callbackUrl,
        state: `${platform}:${state}`,
      });
      authorize_url = `https://www.tiktok.com/v2/auth/authorize/?${params}`;
    } else {
      return json({ error: "Unsupported platform" }, 400);
    }

    const { error: stateErr } = await admin.from("oauth_state_tokens").insert({
      state: `${platform}:${state}`,
      platform,
      admin_user_id: user.id,
      code_verifier: codeVerifier,
      redirect_after,
      metadata: { callback_url: callbackUrl },
    });
    if (stateErr) {
      console.error("state insert error", stateErr);
      return json({ error: "Failed to persist state" }, 500);
    }

    return json({ authorize_url, callback_url: callbackUrl });
  } catch (e: any) {
    console.error("oauth-init error", e);
    return json({ error: e?.message ?? "Unknown error" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function base64UrlEncode(bytes: Uint8Array): string {
  let str = "";
  for (const b of bytes) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function sha256Base64Url(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return base64UrlEncode(new Uint8Array(hash));
}
