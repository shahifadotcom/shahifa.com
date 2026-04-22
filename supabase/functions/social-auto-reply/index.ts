import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

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

function isQuestion(text: string) {
  return /\?|\b(how|what|when|where|which|can|could|do|does|is|are|price|stock|available|delivery|shipping)\b/i.test(text);
}

async function fetchFacebookComments(remotePostId: string, accessToken: string) {
  const res = await fetch(`https://graph.facebook.com/v19.0/${remotePostId}/comments?fields=id,from{id,name},message,created_time&filter=stream&access_token=${encodeURIComponent(accessToken)}`);
  const jsonData = await res.json().catch(() => ({}));
  return (jsonData?.data ?? []).map((item: any) => ({
    id: item.id,
    text: item.message ?? "",
    commenter_name: item.from?.name ?? "Customer",
    commenter_id: item.from?.id ?? null,
    created_at: item.created_time ?? null,
  }));
}

async function fetchInstagramComments(remotePostId: string, accessToken: string) {
  const res = await fetch(`https://graph.facebook.com/v19.0/${remotePostId}/comments?fields=id,text,from{id,username},timestamp&access_token=${encodeURIComponent(accessToken)}`);
  const jsonData = await res.json().catch(() => ({}));
  return (jsonData?.data ?? []).map((item: any) => ({
    id: item.id,
    text: item.text ?? "",
    commenter_name: item.from?.username ?? "Customer",
    commenter_id: item.from?.id ?? null,
    created_at: item.timestamp ?? null,
  }));
}

async function fetchComments(platform: string, remotePostId: string, accessToken: string) {
  if (platform === "facebook_page" || platform === "facebook_group") {
    return await fetchFacebookComments(remotePostId, accessToken);
  }
  if (platform === "instagram") {
    return await fetchInstagramComments(remotePostId, accessToken);
  }
  return [];
}

async function generateReply(systemPrompt: string, tone: string, commentText: string, commenterName: string) {
  if (!LOVABLE_API_KEY) {
    return `Thanks ${commenterName}! We appreciate your comment.`;
  }

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Tone: ${tone}\nCommenter: ${commenterName}\nComment: ${commentText}\n\nWrite a short reply in 1-2 sentences. No emojis unless naturally appropriate.`,
        },
      ],
    }),
  });

  const jsonData = await response.json().catch(() => ({}));
  const content = jsonData?.choices?.[0]?.message?.content?.trim();
  if (!response.ok || !content) {
    throw new Error(jsonData?.error?.message ?? "AI reply generation failed");
  }
  return content;
}

async function postReply(platform: string, commentId: string, accessToken: string, message: string) {
  const endpoint = platform === "instagram"
    ? `https://graph.facebook.com/v19.0/${commentId}/replies`
    : `https://graph.facebook.com/v19.0/${commentId}/comments`;

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, access_token: accessToken }),
  });
  const jsonData = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(jsonData?.error?.message ?? "Reply publish failed");
  }
  return jsonData;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authorized = await isAuthorized(req);
    if (!authorized) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: settings, error: settingsError } = await admin
      .from("social_auto_reply_settings")
      .select("*")
      .limit(1)
      .maybeSingle();

    if (settingsError) throw settingsError;
    if (!settings?.is_enabled) {
      return json({ ok: true, replied: 0, skipped: 0, message: "Auto-reply disabled" });
    }

    const { data: posts, error: postsError } = await admin
      .from("social_posts")
      .select("id, content, platform_post_ids, published_at")
      .eq("status", "published")
      .not("platform_post_ids", "is", null)
      .order("published_at", { ascending: false })
      .limit(25);

    if (postsError) throw postsError;

    let replied = 0;
    let skipped = 0;
    const errors: Array<{ post_id: string; platform?: string; error: string }> = [];

    for (const post of posts ?? []) {
      const postReplyCount = await admin
        .from("social_comment_replies")
        .select("id", { count: "exact", head: true })
        .eq("post_id", post.id)
        .eq("reply_status", "replied");

      if ((postReplyCount.count ?? 0) >= (settings.max_replies_per_post ?? 50)) {
        skipped += 1;
        continue;
      }

      const postIds = (post.platform_post_ids ?? {}) as Record<string, string>;
      for (const [key, remotePostId] of Object.entries(postIds)) {
        const [platform, accountId] = key.split(":");
        if (!platform || !accountId || !remotePostId) continue;
        if (!(settings.enabled_platforms ?? []).includes(platform)) continue;

        const { data: account, error: accountError } = await admin
          .from("social_accounts")
          .select("id, platform, account_id, access_token")
          .eq("id", accountId)
          .maybeSingle();

        if (accountError || !account?.access_token) {
          errors.push({ post_id: post.id, platform, error: accountError?.message ?? "Missing access token" });
          continue;
        }

        try {
          const comments = await fetchComments(platform, remotePostId, account.access_token);
          for (const comment of comments) {
            if (!comment.text?.trim()) {
              skipped += 1;
              continue;
            }
            if (comment.commenter_id && account.account_id && comment.commenter_id === account.account_id) {
              skipped += 1;
              continue;
            }
            if (settings.reply_only_to_questions && !isQuestion(comment.text)) {
              skipped += 1;
              continue;
            }

            const { data: existing } = await admin
              .from("social_comment_replies")
              .select("id")
              .eq("post_id", post.id)
              .eq("platform", platform)
              .eq("platform_comment_id", comment.id)
              .limit(1)
              .maybeSingle();

            if (existing) {
              skipped += 1;
              continue;
            }

            const replyText = await generateReply(settings.system_prompt, settings.tone, comment.text, comment.commenter_name);

            try {
              await postReply(platform, comment.id, account.access_token, replyText);
              await admin.from("social_comment_replies").insert({
                post_id: post.id,
                account_id: account.id,
                platform,
                platform_comment_id: comment.id,
                commenter_name: comment.commenter_name,
                commenter_id: comment.commenter_id,
                comment_text: comment.text,
                reply_text: replyText,
                reply_status: "replied",
                ai_generated: true,
                replied_at: new Date().toISOString(),
                metadata: { comment_created_at: comment.created_at },
              });
              replied += 1;
            } catch (error) {
              await admin.from("social_comment_replies").insert({
                post_id: post.id,
                account_id: account.id,
                platform,
                platform_comment_id: comment.id,
                commenter_name: comment.commenter_name,
                commenter_id: comment.commenter_id,
                comment_text: comment.text,
                reply_text: replyText,
                reply_status: "failed",
                ai_generated: true,
                error_message: (error as Error).message,
                metadata: { comment_created_at: comment.created_at },
              });
              errors.push({ post_id: post.id, platform, error: (error as Error).message });
            }
          }
        } catch (error) {
          errors.push({ post_id: post.id, platform, error: (error as Error).message });
        }
      }
    }

    return json({ ok: true, replied, skipped, errors });
  } catch (error) {
    console.error("social-auto-reply error", error);
    return json({ error: (error as Error).message }, 500);
  }
});
