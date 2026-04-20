import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GenerateRequest {
  source: "product" | "blog" | "custom";
  product_id?: string;
  blog_id?: string;
  prompt?: string;
  platforms: string[]; // facebook_page, facebook_group, instagram, twitter, tiktok
  tone?: string; // friendly, professional, witty, hype
  generate_image?: boolean;
  hashtag_count?: number;
}

const PLATFORM_LIMITS: Record<string, number> = {
  twitter: 280,
  instagram: 2200,
  facebook_page: 5000,
  facebook_group: 5000,
  tiktok: 2200,
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      return json({ error: "LOVABLE_API_KEY not configured" }, 500);
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) return json({ error: "Unauthorized" }, 401);

    // Admin check
    const { data: roles } = await userClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin");
    if (!roles?.length) return json({ error: "Forbidden" }, 403);

    const body: GenerateRequest = await req.json();
    const {
      source,
      product_id,
      blog_id,
      prompt,
      platforms,
      tone = "friendly",
      generate_image = false,
      hashtag_count = 5,
    } = body;

    if (!platforms?.length) return json({ error: "platforms required" }, 400);

    const admin = createClient(supabaseUrl, serviceKey);

    // Build context for the prompt
    let context = "";
    let productData: any = null;
    let blogData: any = null;

    if (source === "product" && product_id) {
      const { data } = await admin
        .from("products")
        .select("name, description, price, images, brand, tags")
        .eq("id", product_id)
        .maybeSingle();
      if (!data) return json({ error: "Product not found" }, 404);
      productData = data;
      context = `Product: ${data.name}\nDescription: ${data.description}\nPrice: ${data.price}\nBrand: ${data.brand ?? "N/A"}\nTags: ${(data.tags ?? []).join(", ")}`;
    } else if (source === "blog" && blog_id) {
      const { data } = await admin
        .from("blog_posts")
        .select("title, excerpt, content, tags, slug")
        .eq("id", blog_id)
        .maybeSingle();
      if (!data) return json({ error: "Blog post not found" }, 404);
      blogData = data;
      context = `Blog Title: ${data.title}\nExcerpt: ${data.excerpt ?? ""}\nContent (first 800 chars): ${(data.content ?? "").slice(0, 800)}\nTags: ${(data.tags ?? []).join(", ")}`;
    } else if (source === "custom" && prompt) {
      context = `Topic: ${prompt}`;
    } else {
      return json({ error: "Invalid source / missing fields" }, 400);
    }

    // Per-platform caption generation via tool calling for structured output
    const systemPrompt = `You are an expert social media manager. Generate platform-tailored captions in a ${tone} tone. Each caption must respect the platform character limit and feel native to that platform. Include ${hashtag_count} relevant trending hashtags per caption (except Twitter where 2-3 is ideal). Add a clear CTA when relevant.`;

    const userPrompt = `Generate social media captions for the following platforms: ${platforms.join(", ")}.

CONTEXT:
${context}

Limits:
${platforms.map((p) => `- ${p}: ${PLATFORM_LIMITS[p] ?? 2200} chars`).join("\n")}

Return one optimized caption per platform.`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "return_captions",
              description: "Return platform-specific captions",
              parameters: {
                type: "object",
                properties: {
                  captions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        platform: { type: "string" },
                        caption: { type: "string" },
                        hashtags: { type: "array", items: { type: "string" } },
                      },
                      required: ["platform", "caption", "hashtags"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["captions"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "return_captions" } },
      }),
    });

    if (!aiResp.ok) {
      const t = await aiResp.text();
      console.error("AI gateway error", aiResp.status, t);
      if (aiResp.status === 429) return json({ error: "AI rate limit exceeded, try again later." }, 429);
      if (aiResp.status === 402) return json({ error: "AI credits exhausted. Add funds in Settings → Workspace → Usage." }, 402);
      return json({ error: "AI generation failed" }, 500);
    }

    const aiJson = await aiResp.json();
    const toolCall = aiJson.choices?.[0]?.message?.tool_calls?.[0];
    let captions: any[] = [];
    try {
      const parsed = JSON.parse(toolCall?.function?.arguments ?? "{}");
      captions = parsed.captions ?? [];
    } catch (e) {
      console.error("Failed to parse AI tool call args", e);
      return json({ error: "Invalid AI response" }, 500);
    }

    // Optional: generate "product-in-action" image
    let generated_image_url: string | null = null;
    if (generate_image) {
      let imagePrompt = "";
      if (source === "product" && productData) {
        imagePrompt = `A high-quality lifestyle photograph of "${productData.name}" being actively used in a real-world scenario showing the practical job/benefit it solves. Clean, modern, vibrant, social-media optimized, square 1:1. Show a happy person interacting with the product naturally.`;
      } else if (source === "blog" && blogData) {
        imagePrompt = `A modern social media graphic representing the blog post titled "${blogData.title}". Eye-catching, vibrant, minimal text overlay, square 1:1.`;
      } else {
        imagePrompt = `Modern eye-catching social media graphic for: ${prompt}. Square 1:1, vibrant, professional.`;
      }

      try {
        const imgResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash-image",
            messages: [{ role: "user", content: imagePrompt }],
            modalities: ["image", "text"],
          }),
        });

        if (imgResp.ok) {
          const imgJson = await imgResp.json();
          const dataUrl = imgJson.choices?.[0]?.message?.images?.[0]?.image_url?.url;
          if (dataUrl?.startsWith("data:image/")) {
            // Upload to product-images bucket (re-using existing public bucket)
            const base64 = dataUrl.split(",")[1];
            const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
            const filename = `social/${user.id}/${crypto.randomUUID()}.png`;
            const { error: upErr } = await admin.storage
              .from("product-images")
              .upload(filename, bytes, { contentType: "image/png", upsert: false });
            if (!upErr) {
              const { data: pub } = admin.storage.from("product-images").getPublicUrl(filename);
              generated_image_url = pub.publicUrl;
            } else {
              console.error("Image upload failed", upErr);
            }
          }
        } else {
          console.error("Image gen failed", await imgResp.text());
        }
      } catch (e) {
        console.error("Image gen exception", e);
      }
    }

    return json({
      captions,
      generated_image_url,
      source,
      product_id: product_id ?? null,
      blog_id: blog_id ?? null,
    });
  } catch (e: any) {
    console.error("ai-social-generate error", e);
    return json({ error: e?.message ?? "Unknown error" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
