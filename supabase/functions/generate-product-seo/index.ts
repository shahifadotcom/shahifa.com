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
    // Require authentication - prevents unrestricted AI API usage
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

    // Admin-only — prevents non-admins from consuming AI credits
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

    const { productName, description, category, type } = await req.json();

    // Validate inputs
    if (!productName || typeof productName !== 'string' || productName.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'productName is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    if (productName.length > 200) {
      return new Response(
        JSON.stringify({ error: 'productName too long' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const ALLOWED_TYPES = new Set(['title', 'description', 'tags', 'all']);
    if (!type || !ALLOWED_TYPES.has(type)) {
      return new Response(
        JSON.stringify({ error: 'Invalid type' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    let prompt = '';
    
    if (type === 'title') {
      prompt = `Generate an SEO-optimized, compelling product title for: "${productName}"
      Category: ${category || 'general'}
      Make it catchy, include key features, and keep it under 60 characters.
      Return only the title text, no quotes or formatting.`;
    } else if (type === 'description') {
      prompt = `Generate a detailed, SEO-optimized product description for: "${productName}"
      Current description: ${description || 'None'}
      Category: ${category || 'general'}
      Include benefits, features, and use cases. Make it engaging and informative.
      Return only the description text.`;
    } else if (type === 'tags') {
      prompt = `Generate 5-10 relevant SEO tags for this product: "${productName}"
      Description: ${description || 'None'}
      Category: ${category || 'general'}
      Return as comma-separated values only.`;
    } else if (type === 'all') {
      prompt = `Generate complete SEO-optimized content for this product:
      Product Name: "${productName}"
      Description: ${description || 'None'}
      Category: ${category || 'general'}
      
      Provide as JSON with:
      - title: Catchy, SEO-friendly title (under 60 chars)
      - description: Detailed product description (200-300 words)
      - metaTitle: SEO meta title (under 60 chars)
      - metaDescription: SEO meta description (under 160 chars)
      - tags: Array of 5-10 relevant tags
      - socialPreview: Brief engaging text for social media (under 100 chars)`;
    }

    console.log('Calling Lovable AI Gateway for SEO generation');
    
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: 'You are an SEO expert specializing in e-commerce product optimization. Generate high-quality, conversion-focused content.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1024,
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI Gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted. Please add credits to continue.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error('Failed to generate content');
    }

    const data = await response.json();
    let generatedText = data.choices?.[0]?.message?.content || '';
    
    console.log('AI response received successfully');
    
    let result;
    
    if (type === 'all') {
      const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          result = JSON.parse(jsonMatch[0]);
        } catch {
          result = {
            title: productName,
            description: generatedText,
            metaTitle: productName,
            metaDescription: generatedText.substring(0, 160),
            tags: [],
            socialPreview: generatedText.substring(0, 100)
          };
        }
      } else {
        result = {
          title: productName,
          description: generatedText,
          metaTitle: productName,
          metaDescription: generatedText.substring(0, 160),
          tags: [],
          socialPreview: generatedText.substring(0, 100)
        };
      }
    } else if (type === 'tags') {
      result = generatedText.split(',').map((tag: string) => tag.trim()).filter(Boolean);
    } else {
      result = generatedText.trim();
    }

    return new Response(
      JSON.stringify({ result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
