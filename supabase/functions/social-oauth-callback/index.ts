// OAuth callback for all social platforms. Public (no JWT) — security via state token.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Platform = "facebook_page" | "facebook_group" | "instagram" | "twitter" | "tiktok";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const stateRaw = url.searchParams.get("state");
  const errorParam = url.searchParams.get("error") || url.searchParams.get("error_description");

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const admin = createClient(supabaseUrl, serviceKey);

  const callbackUrl = `${supabaseUrl}/functions/v1/social-oauth-callback`;
  const appBase = Deno.env.get("APP_BASE_URL") || "";

  const finish = (status: "success" | "error", message: string, redirectAfter?: string | null) => {
    const target = redirectAfter || "/admin/ai-social-manager";
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>OAuth ${status}</title>
      <style>body{font-family:system-ui;background:#0b0b0c;color:#fff;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:24px;text-align:center}
      .card{max-width:480px;background:#161617;border:1px solid #2a2a2c;border-radius:12px;padding:32px}
      h1{margin:0 0 12px;font-size:20px}p{margin:0 0 16px;opacity:.85}a{color:#7aa2ff}</style></head>
      <body><div class="card"><h1>${status === "success" ? "✅ Connected" : "❌ Connection failed"}</h1>
      <p>${escapeHtml(message)}</p>
      <p>You can close this window or <a href="${appBase || ""}${target}">return to the admin</a>.</p>
      <script>setTimeout(()=>{ try { window.opener && window.opener.postMessage({ type:'social-oauth-${status}', message:${JSON.stringify(message)} }, '*'); window.close(); } catch(e){} }, 800);</script>
      </div></body></html>`;
    return new Response(html, { status: 200, headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" } });
  };

  if (errorParam) return finish("error", `Provider returned error: ${errorParam}`);
  if (!code || !stateRaw) return finish("error", "Missing code or state in callback.");

  // Look up state
  const { data: stateRow } = await admin
    .from("oauth_state_tokens")
    .select("*")
    .eq("state", stateRaw)
    .maybeSingle();
  if (!stateRow) return finish("error", "Invalid or expired state token.");
  if (new Date(stateRow.expires_at).getTime() < Date.now()) {
    await admin.from("oauth_state_tokens").delete().eq("state", stateRaw);
    return finish("error", "State token expired. Please retry.", stateRow.redirect_after);
  }

  const platform = stateRow.platform as Platform;
  const credPlatform = platform === "facebook_group" || platform === "instagram" ? "facebook_page" : platform;

  const { data: cred } = await admin
    .from("social_app_credentials")
    .select("*")
    .eq("platform", credPlatform)
    .maybeSingle();
  if (!cred) return finish("error", "App credentials missing on server.", stateRow.redirect_after);

  try {
    if (platform === "facebook_page" || platform === "facebook_group" || platform === "instagram") {
      await handleFacebookFamily(platform, code, cred, callbackUrl, stateRow, admin);
    } else if (platform === "twitter") {
      await handleTwitter(code, cred, callbackUrl, stateRow, admin);
    } else if (platform === "tiktok") {
      await handleTikTok(code, cred, callbackUrl, stateRow, admin);
    } else {
      return finish("error", "Unsupported platform.", stateRow.redirect_after);
    }

    // Cleanup state token
    await admin.from("oauth_state_tokens").delete().eq("state", stateRaw);
    return finish("success", `${platform} accounts connected successfully.`, stateRow.redirect_after);
  } catch (e: any) {
    console.error(`callback error for ${platform}`, e);
    await admin.from("oauth_state_tokens").delete().eq("state", stateRaw);
    return finish("error", e?.message ?? "Token exchange failed.", stateRow.redirect_after);
  }
});

// ---------------- Facebook / Instagram ----------------
async function handleFacebookFamily(
  platform: Platform,
  code: string,
  cred: any,
  callbackUrl: string,
  stateRow: any,
  admin: any,
) {
  // Step 1: short-lived user token
  const tokenUrl = new URL("https://graph.facebook.com/v19.0/oauth/access_token");
  tokenUrl.searchParams.set("client_id", cred.client_id);
  tokenUrl.searchParams.set("client_secret", cred.client_secret);
  tokenUrl.searchParams.set("redirect_uri", callbackUrl);
  tokenUrl.searchParams.set("code", code);
  const tokRes = await fetch(tokenUrl);
  const tokJson = await tokRes.json();
  if (!tokRes.ok) throw new Error(`FB token error: ${JSON.stringify(tokJson)}`);
  const shortLived = tokJson.access_token as string;

  // Step 2: long-lived user token (~60d)
  const llUrl = new URL("https://graph.facebook.com/v19.0/oauth/access_token");
  llUrl.searchParams.set("grant_type", "fb_exchange_token");
  llUrl.searchParams.set("client_id", cred.client_id);
  llUrl.searchParams.set("client_secret", cred.client_secret);
  llUrl.searchParams.set("fb_exchange_token", shortLived);
  const llRes = await fetch(llUrl);
  const llJson = await llRes.json();
  if (!llRes.ok) throw new Error(`FB long-lived token error: ${JSON.stringify(llJson)}`);
  const userToken = llJson.access_token as string;
  const userTokenExpiresIn = (llJson.expires_in as number) || 60 * 24 * 60 * 60;

  // Get the FB user
  const meRes = await fetch(`https://graph.facebook.com/v19.0/me?fields=id,name&access_token=${userToken}`);
  const me = await meRes.json();
  if (!meRes.ok) throw new Error(`FB me error: ${JSON.stringify(me)}`);

  // Step 3: pages (used for facebook_page and to discover IG business accounts)
  const pagesRes = await fetch(
    `https://graph.facebook.com/v19.0/me/accounts?fields=id,name,access_token,instagram_business_account{id,username,profile_picture_url},picture&access_token=${userToken}`,
  );
  const pages = await pagesRes.json();
  if (!pagesRes.ok) throw new Error(`FB pages error: ${JSON.stringify(pages)}`);

  const pageList: any[] = pages.data ?? [];

  if (platform === "facebook_page") {
    for (const p of pageList) {
      await upsertAccount(admin, {
        platform: "facebook_page",
        account_id: p.id,
        page_id: p.id,
        account_name: p.name,
        access_token: p.access_token, // Page tokens are long-lived when derived from a long-lived user token
        token_expires_at: null,
        profile_image_url: p.picture?.data?.url ?? null,
        connected_by: stateRow.admin_user_id,
        metadata: { fb_user_id: me.id, fb_user_name: me.name },
      });
    }
  } else if (platform === "instagram") {
    for (const p of pageList) {
      const ig = p.instagram_business_account;
      if (!ig) continue;
      await upsertAccount(admin, {
        platform: "instagram",
        account_id: ig.id,
        page_id: p.id, // store linked FB page id (needed for publishing API)
        account_name: ig.username || p.name,
        account_username: ig.username ?? null,
        access_token: p.access_token,
        token_expires_at: null,
        profile_image_url: ig.profile_picture_url ?? null,
        connected_by: stateRow.admin_user_id,
        metadata: { fb_user_id: me.id, linked_page_name: p.name },
      });
    }
  } else if (platform === "facebook_group") {
    // Step 4: groups
    const grpRes = await fetch(
      `https://graph.facebook.com/v19.0/me/groups?fields=id,name,picture,member_count&access_token=${userToken}`,
    );
    const grp = await grpRes.json();
    if (!grpRes.ok) throw new Error(`FB groups error: ${JSON.stringify(grp)}`);
    const groups: any[] = grp.data ?? [];
    if (!groups.length) throw new Error("No groups found. The app must be installed in the group by an admin (Meta requirement).");
    for (const g of groups) {
      await upsertAccount(admin, {
        platform: "facebook_group",
        account_id: g.id,
        group_id: g.id,
        account_name: g.name,
        access_token: userToken,
        token_expires_at: new Date(Date.now() + userTokenExpiresIn * 1000).toISOString(),
        profile_image_url: g.picture?.data?.url ?? null,
        connected_by: stateRow.admin_user_id,
        metadata: { fb_user_id: me.id, member_count: g.member_count ?? null },
      });
    }
  }
}

// ---------------- Twitter / X ----------------
async function handleTwitter(code: string, cred: any, callbackUrl: string, stateRow: any, admin: any) {
  if (!stateRow.code_verifier) throw new Error("Missing PKCE verifier");
  const body = new URLSearchParams({
    code,
    grant_type: "authorization_code",
    client_id: cred.client_id,
    redirect_uri: callbackUrl,
    code_verifier: stateRow.code_verifier,
  });

  // Twitter requires Basic auth with client_id:client_secret for confidential apps
  const basic = btoa(`${cred.client_id}:${cred.client_secret}`);
  const tokRes = await fetch("https://api.x.com/2/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${basic}`,
    },
    body,
  });
  const tok = await tokRes.json();
  if (!tokRes.ok) throw new Error(`Twitter token error: ${JSON.stringify(tok)}`);

  // Get user
  const meRes = await fetch("https://api.x.com/2/users/me?user.fields=profile_image_url,username,name", {
    headers: { Authorization: `Bearer ${tok.access_token}` },
  });
  const me = await meRes.json();
  if (!meRes.ok) throw new Error(`Twitter me error: ${JSON.stringify(me)}`);

  await upsertAccount(admin, {
    platform: "twitter",
    account_id: me.data.id,
    account_name: me.data.name,
    account_username: me.data.username,
    access_token: tok.access_token,
    refresh_token: tok.refresh_token ?? null,
    token_expires_at: tok.expires_in ? new Date(Date.now() + tok.expires_in * 1000).toISOString() : null,
    profile_image_url: me.data.profile_image_url ?? null,
    connected_by: stateRow.admin_user_id,
    metadata: { scope: tok.scope ?? null },
  });
}

// ---------------- TikTok ----------------
async function handleTikTok(code: string, cred: any, callbackUrl: string, stateRow: any, admin: any) {
  const body = new URLSearchParams({
    client_key: cred.client_id,
    client_secret: cred.client_secret,
    code,
    grant_type: "authorization_code",
    redirect_uri: callbackUrl,
  });
  const tokRes = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const tok = await tokRes.json();
  if (!tokRes.ok || tok.error) throw new Error(`TikTok token error: ${JSON.stringify(tok)}`);

  // Get user info
  const meRes = await fetch("https://open.tiktokapis.com/v2/user/info/?fields=open_id,union_id,avatar_url,display_name,username", {
    headers: { Authorization: `Bearer ${tok.access_token}` },
  });
  const me = await meRes.json();
  if (!meRes.ok || me.error?.code) throw new Error(`TikTok user info error: ${JSON.stringify(me)}`);
  const u = me.data?.user ?? {};

  await upsertAccount(admin, {
    platform: "tiktok",
    account_id: u.open_id ?? tok.open_id,
    account_name: u.display_name ?? "TikTok account",
    account_username: u.username ?? null,
    access_token: tok.access_token,
    refresh_token: tok.refresh_token ?? null,
    token_expires_at: tok.expires_in ? new Date(Date.now() + tok.expires_in * 1000).toISOString() : null,
    profile_image_url: u.avatar_url ?? null,
    connected_by: stateRow.admin_user_id,
    metadata: { scope: tok.scope ?? null, open_id: tok.open_id, union_id: u.union_id ?? null },
  });
}

// ---------------- Helpers ----------------
async function upsertAccount(admin: any, row: any) {
  const { error } = await admin.from("social_accounts").upsert(
    { ...row, is_active: true, updated_at: new Date().toISOString() },
    { onConflict: "platform,account_id" },
  );
  if (error) throw new Error(`Failed to save account: ${error.message}`);
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
}
