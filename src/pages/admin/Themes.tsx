import { useEffect, useState } from "react";
import AdminLayout from "@/layouts/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Check, Eye, Palette } from "lucide-react";
import { useTheme } from "@/theme/ThemeProvider";

interface ThemeRow {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  tokens: Record<string, string>;
  is_builtin: boolean;
  preview_image_url: string | null;
}

export default function Themes() {
  const [themes, setThemes] = useState<ThemeRow[]>([]);
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const { previewTokens, refresh } = useTheme();
  const [previewing, setPreviewing] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const [{ data: list }, { data: act }] = await Promise.all([
      supabase.from("app_themes").select("*").order("is_builtin", { ascending: false }).order("name"),
      supabase.from("active_theme").select("theme_slug").eq("id", true).maybeSingle(),
    ]);
    setThemes((list as any[]) || []);
    setActiveSlug((act as any)?.theme_slug ?? null);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const activate = async (slug: string) => {
    setBusy(slug);
    const { error } = await supabase
      .from("active_theme")
      .update({ theme_slug: slug, updated_at: new Date().toISOString() })
      .eq("id", true);
    setBusy(null);
    if (error) {
      toast.error("Failed to activate: " + error.message);
      return;
    }
    setActiveSlug(slug);
    setPreviewing(null);
    await refresh();
    toast.success("Theme activated");
  };

  const togglePreview = (t: ThemeRow) => {
    if (previewing === t.slug) {
      previewTokens(null);
      setPreviewing(null);
    } else {
      previewTokens(t.tokens);
      setPreviewing(t.slug);
    }
  };

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Palette className="h-6 w-6" /> Themes
          </h1>
          <p className="text-muted-foreground">
            Switch the storefront look. Preview locally before activating site-wide.
          </p>
        </div>

        {loading ? (
          <p>Loading…</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {themes.map((t) => {
              const isActive = t.slug === activeSlug;
              const isPreviewing = previewing === t.slug;
              const swatches = ["--primary", "--secondary", "--accent", "--navigation", "--background", "--foreground"]
                .map((k) => t.tokens[k])
                .filter(Boolean);
              return (
                <Card key={t.id} className={isActive ? "ring-2 ring-primary" : ""}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          {t.name}
                          {isActive && (
                            <Badge variant="default" className="text-xs">
                              <Check className="h-3 w-3 mr-1" /> Active
                            </Badge>
                          )}
                          {t.is_builtin && (
                            <Badge variant="secondary" className="text-xs">Built-in</Badge>
                          )}
                        </CardTitle>
                        <CardDescription>{t.description}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex gap-1.5">
                      {swatches.map((hsl, i) => (
                        <div
                          key={i}
                          className="h-10 w-10 rounded border"
                          style={{ background: `hsl(${hsl})` }}
                          title={hsl}
                        />
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant={isPreviewing ? "default" : "outline"}
                        onClick={() => togglePreview(t)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        {isPreviewing ? "Stop preview" : "Preview"}
                      </Button>
                      <Button
                        size="sm"
                        disabled={isActive || busy === t.slug}
                        onClick={() => activate(t.slug)}
                      >
                        {busy === t.slug ? "Activating…" : isActive ? "Active" : "Activate"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {previewing && (
          <div className="fixed bottom-4 right-4 bg-card border rounded-lg shadow-lg p-3 flex items-center gap-3 z-50">
            <span className="text-sm">Previewing <b>{previewing}</b> (you only)</span>
            <Button size="sm" variant="outline" onClick={() => { previewTokens(null); setPreviewing(null); }}>
              Reset
            </Button>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
