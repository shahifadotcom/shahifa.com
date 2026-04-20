
-- Social OAuth app credentials (per platform, admin-managed)
CREATE TABLE IF NOT EXISTS public.social_app_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform public.social_platform NOT NULL UNIQUE,
  client_id text NOT NULL,
  client_secret text NOT NULL,
  extra_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.social_app_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage social app credentials"
  ON public.social_app_credentials
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Service role full access to social app credentials"
  ON public.social_app_credentials
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE TRIGGER trg_social_app_credentials_updated_at
  BEFORE UPDATE ON public.social_app_credentials
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();


-- OAuth state tokens (CSRF protection + PKCE persistence across redirect)
CREATE TABLE IF NOT EXISTS public.oauth_state_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  state text NOT NULL UNIQUE,
  platform public.social_platform NOT NULL,
  admin_user_id uuid NOT NULL,
  code_verifier text,
  redirect_after text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '15 minutes'),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_oauth_state_tokens_state ON public.oauth_state_tokens(state);
CREATE INDEX IF NOT EXISTS idx_oauth_state_tokens_expires_at ON public.oauth_state_tokens(expires_at);

ALTER TABLE public.oauth_state_tokens ENABLE ROW LEVEL SECURITY;

-- No client access; service role only via SECURITY DEFINER edge functions
CREATE POLICY "Service role full access to oauth state tokens"
  ON public.oauth_state_tokens
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
