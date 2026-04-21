// Cron-invoked every minute. Finds posts whose scheduled_for has arrived and
// triggers social-publish-post for each one. Public endpoint (verify_jwt = false).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
  const nowIso = new Date().toISOString();

  // Find due, unlocked, scheduled posts. Limit batch to avoid timeouts.
  const { data: due, error } = await admin
    .from("social_posts")
    .select("id")
    .eq("status", "scheduled")
    .is("locked_at", null)
    .lte("scheduled_for", nowIso)
    .order("scheduled_for", { ascending: true })
    .limit(20);

  if (error) {
    console.error("scheduler list error", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!due || due.length === 0) {
    return new Response(
      JSON.stringify({ ok: true, picked: 0, ts: nowIso }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // Fire-and-track each publish call. Use anon key as auth (system call).
  const publishUrl = `${SUPABASE_URL}/functions/v1/social-publish-post`;
  const calls = due.map((row) =>
    fetch(publishUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${ANON_KEY}`,
      },
      body: JSON.stringify({ post_id: row.id }),
    })
      .then(async (r) => ({ id: row.id, status: r.status, ok: r.ok }))
      .catch((e) => ({ id: row.id, status: 0, ok: false, error: String(e) })),
  );

  const settled = await Promise.allSettled(calls);
  const results = settled.map((s) => (s.status === "fulfilled" ? s.value : { error: String(s.reason) }));

  return new Response(
    JSON.stringify({ ok: true, picked: due.length, results, ts: nowIso }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
