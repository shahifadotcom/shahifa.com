
CREATE TABLE public.app_themes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  tokens jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_builtin boolean NOT NULL DEFAULT false,
  preview_image_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.active_theme (
  id boolean PRIMARY KEY DEFAULT true CHECK (id = true),
  theme_slug text NOT NULL REFERENCES public.app_themes(slug) ON UPDATE CASCADE,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

ALTER TABLE public.app_themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.active_theme ENABLE ROW LEVEL SECURITY;

CREATE POLICY "themes public read" ON public.app_themes FOR SELECT USING (true);
CREATE POLICY "themes admin insert" ON public.app_themes FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "themes admin update" ON public.app_themes FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "themes admin delete" ON public.app_themes FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'::app_role) AND is_builtin = false);

CREATE POLICY "active theme public read" ON public.active_theme FOR SELECT USING (true);
CREATE POLICY "active theme admin insert" ON public.active_theme FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "active theme admin update" ON public.active_theme FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'::app_role));

CREATE TRIGGER trg_app_themes_updated BEFORE UPDATE ON public.app_themes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed built-in themes
INSERT INTO public.app_themes (slug, name, description, is_builtin, tokens) VALUES
('default', 'Default', 'Original Shahifa theme', true, '{
  "--background":"0 0% 100%",
  "--foreground":"222 47% 11%",
  "--primary":"221 83% 53%",
  "--primary-foreground":"0 0% 100%",
  "--secondary":"210 40% 96%",
  "--accent":"210 40% 96%",
  "--muted":"210 40% 96%",
  "--border":"214 32% 91%",
  "--radius":"0.5rem"
}'::jsonb),
('red-3d', 'Red 3D Compact', 'Current red 3D e-commerce reskin', true, '{
  "--background":"0 0% 100%",
  "--foreground":"0 0% 10%",
  "--primary":"0 84% 47%",
  "--primary-foreground":"0 0% 100%",
  "--navigation":"0 78% 42%",
  "--accent":"0 70% 95%",
  "--secondary":"0 30% 96%",
  "--success":"142 76% 36%",
  "--warning":"38 92% 50%",
  "--border":"0 20% 88%",
  "--radius":"0.5rem"
}'::jsonb),
('aliexpress', 'AliExpress', 'AliExpress-inspired red/orange marketplace look', true, '{
  "--background":"0 0% 100%",
  "--foreground":"0 0% 13%",
  "--primary":"9 96% 46%",
  "--primary-foreground":"0 0% 100%",
  "--secondary":"22 100% 50%",
  "--secondary-foreground":"0 0% 100%",
  "--accent":"0 100% 97%",
  "--accent-foreground":"9 96% 46%",
  "--navigation":"9 96% 46%",
  "--success":"142 70% 40%",
  "--warning":"42 100% 50%",
  "--sale":"9 96% 46%",
  "--muted":"0 0% 96%",
  "--muted-foreground":"0 0% 40%",
  "--border":"0 0% 90%",
  "--radius":"0.375rem",
  "--card":"0 0% 100%",
  "--card-foreground":"0 0% 13%"
}'::jsonb);

INSERT INTO public.active_theme (id, theme_slug) VALUES (true, 'red-3d');

-- Public RPC to fetch active theme tokens
CREATE OR REPLACE FUNCTION public.get_active_theme()
RETURNS TABLE(slug text, name text, tokens jsonb)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT t.slug, t.name, t.tokens
  FROM public.active_theme a
  JOIN public.app_themes t ON t.slug = a.theme_slug
  WHERE a.id = true
  LIMIT 1;
$$;
