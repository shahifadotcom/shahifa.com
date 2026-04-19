-- Enum for social platforms
CREATE TYPE public.social_platform AS ENUM ('facebook_page', 'facebook_group', 'instagram', 'twitter', 'tiktok');

-- Enum for post status
CREATE TYPE public.social_post_status AS ENUM ('draft', 'scheduled', 'publishing', 'published', 'failed');

-- Enum for content source type
CREATE TYPE public.social_content_source AS ENUM ('product', 'blog_post', 'custom_prompt', 'ai_generated');

-- 1. Social accounts table
CREATE TABLE public.social_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  platform public.social_platform NOT NULL,
  account_name TEXT NOT NULL,
  account_id TEXT NOT NULL,
  account_username TEXT,
  profile_image_url TEXT,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  page_id TEXT,
  group_id TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB DEFAULT '{}'::jsonb,
  connected_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.social_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage social accounts"
ON public.social_accounts FOR ALL
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role can manage social accounts"
ON public.social_accounts FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- 2. Social posts table
CREATE TABLE public.social_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT,
  content TEXT NOT NULL,
  hashtags TEXT[] DEFAULT '{}'::text[],
  media_urls TEXT[] DEFAULT '{}'::text[],
  platforms public.social_platform[] NOT NULL DEFAULT '{}'::public.social_platform[],
  target_account_ids UUID[] DEFAULT '{}'::uuid[],
  status public.social_post_status NOT NULL DEFAULT 'draft',
  content_source public.social_content_source,
  source_reference_id UUID,
  scheduled_for TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  platform_post_ids JSONB DEFAULT '{}'::jsonb,
  ai_generated BOOLEAN DEFAULT false,
  ai_prompt TEXT,
  error_log TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.social_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage social posts"
ON public.social_posts FOR ALL
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role can manage social posts"
ON public.social_posts FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

CREATE INDEX idx_social_posts_status ON public.social_posts(status);
CREATE INDEX idx_social_posts_scheduled ON public.social_posts(scheduled_for) WHERE status = 'scheduled';

-- 3. Post analytics table
CREATE TABLE public.social_post_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.social_posts(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.social_accounts(id) ON DELETE CASCADE,
  platform public.social_platform NOT NULL,
  platform_post_id TEXT,
  likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  reach INTEGER DEFAULT 0,
  engagement_rate NUMERIC DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  saves INTEGER DEFAULT 0,
  raw_metrics JSONB DEFAULT '{}'::jsonb,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.social_post_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view analytics"
ON public.social_post_analytics FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role can manage analytics"
ON public.social_post_analytics FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

CREATE INDEX idx_social_analytics_post ON public.social_post_analytics(post_id);

-- 4. Auto-post settings table
CREATE TABLE public.social_auto_post_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  frequency_per_day INTEGER NOT NULL DEFAULT 1,
  preferred_times TIME[] DEFAULT ARRAY['10:00:00'::time, '15:00:00'::time, '20:00:00'::time],
  content_sources public.social_content_source[] NOT NULL DEFAULT ARRAY['product'::public.social_content_source],
  enabled_platforms public.social_platform[] NOT NULL DEFAULT '{}'::public.social_platform[],
  target_account_ids UUID[] DEFAULT '{}'::uuid[],
  custom_prompts TEXT[] DEFAULT '{}'::text[],
  generate_product_action_images BOOLEAN DEFAULT true,
  ai_tone TEXT DEFAULT 'engaging',
  include_hashtags BOOLEAN DEFAULT true,
  max_hashtags INTEGER DEFAULT 10,
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.social_auto_post_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage auto-post settings"
ON public.social_auto_post_settings FOR ALL
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role can manage auto-post settings"
ON public.social_auto_post_settings FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- 5. Comment replies table
CREATE TABLE public.social_comment_replies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID REFERENCES public.social_posts(id) ON DELETE CASCADE,
  account_id UUID REFERENCES public.social_accounts(id) ON DELETE CASCADE,
  platform public.social_platform NOT NULL,
  platform_comment_id TEXT NOT NULL,
  commenter_name TEXT,
  commenter_id TEXT,
  comment_text TEXT NOT NULL,
  reply_text TEXT,
  reply_status TEXT NOT NULL DEFAULT 'pending',
  ai_generated BOOLEAN DEFAULT true,
  replied_at TIMESTAMPTZ,
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.social_comment_replies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage comment replies"
ON public.social_comment_replies FOR ALL
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role can manage comment replies"
ON public.social_comment_replies FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

CREATE INDEX idx_comment_replies_status ON public.social_comment_replies(reply_status);
CREATE UNIQUE INDEX idx_comment_replies_unique ON public.social_comment_replies(platform, platform_comment_id);

-- Updated_at triggers
CREATE TRIGGER update_social_accounts_updated_at
BEFORE UPDATE ON public.social_accounts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_social_posts_updated_at
BEFORE UPDATE ON public.social_posts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_social_auto_post_settings_updated_at
BEFORE UPDATE ON public.social_auto_post_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_social_comment_replies_updated_at
BEFORE UPDATE ON public.social_comment_replies
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();