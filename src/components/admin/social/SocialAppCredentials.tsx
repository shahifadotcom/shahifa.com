import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Save, Trash2, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const APP_PLATFORMS = [
  {
    id: "facebook_page",
    label: "Meta (Facebook + Instagram)",
    helper: "One Meta App ID/Secret powers Facebook Pages, Facebook Groups, and Instagram Business.",
    consoleUrl: "https://developers.facebook.com/apps/",
  },
  {
    id: "twitter",
    label: "Twitter / X",
    helper: "Use your X Developer App's OAuth 2.0 Client ID & Secret (with PKCE).",
    consoleUrl: "https://developer.x.com/en/portal/dashboard",
  },
  {
    id: "tiktok",
    label: "TikTok",
    helper: "Client Key + Client Secret from your TikTok for Developers app (Login Kit + Content Posting API).",
    consoleUrl: "https://developers.tiktok.com/apps/",
  },
];

interface CredRow {
  id?: string;
  platform: string;
  client_id: string;
  client_secret: string;
  is_active: boolean;
}

const SocialAppCredentials = ({ callbackUrl }: { callbackUrl: string }) => {
  const [rows, setRows] = useState<Record<string, CredRow>>({});
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("social_app_credentials").select("*");
    if (error) {
      toast({ title: "Failed to load credentials", description: error.message, variant: "destructive" });
    }
    const map: Record<string, CredRow> = {};
    APP_PLATFORMS.forEach((p) => {
      const existing = data?.find((d) => d.platform === p.id);
      map[p.id] = existing
        ? { id: existing.id, platform: p.id, client_id: existing.client_id, client_secret: existing.client_secret, is_active: existing.is_active }
        : { platform: p.id, client_id: "", client_secret: "", is_active: true };
    });
    setRows(map);
    setLoading(false);
  };

  const update = (platform: string, patch: Partial<CredRow>) => {
    setRows((r) => ({ ...r, [platform]: { ...r[platform], ...patch } }));
  };

  const save = async (platform: string) => {
    const row = rows[platform];
    if (!row.client_id.trim() || !row.client_secret.trim()) {
      toast({ title: "Client ID and Secret are required", variant: "destructive" });
      return;
    }
    setSavingId(platform);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const payload = {
        platform: row.platform as any,
        client_id: row.client_id.trim(),
        client_secret: row.client_secret.trim(),
        is_active: row.is_active,
        created_by: user?.id ?? null,
      };
      const { error } = row.id
        ? await supabase.from("social_app_credentials").update(payload).eq("id", row.id)
        : await supabase.from("social_app_credentials").insert(payload);
      if (error) throw error;
      toast({ title: "Credentials saved" });
      load();
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    } finally {
      setSavingId(null);
    }
  };

  const remove = async (platform: string) => {
    const row = rows[platform];
    if (!row.id) return;
    if (!confirm(`Delete ${platform} app credentials? Connected accounts will lose the ability to refresh tokens.`)) return;
    const { error } = await supabase.from("social_app_credentials").delete().eq("id", row.id);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Deleted" });
    load();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>OAuth App Credentials</CardTitle>
        <CardDescription>
          Enter the Client ID / Secret from each developer console. Required before connecting accounts.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="rounded-md border bg-muted/40 p-3 text-sm">
          <div className="font-medium mb-1">Redirect / Callback URL (paste this in each provider)</div>
          <code className="block break-all text-xs bg-background border rounded px-2 py-1.5">{callbackUrl}</code>
        </div>

        {APP_PLATFORMS.map((p) => {
          const row = rows[p.id] ?? { platform: p.id, client_id: "", client_secret: "", is_active: true };
          const reveal = revealed[p.id];
          return (
            <div key={p.id} className="border rounded-lg p-4 space-y-3">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <div className="font-semibold flex items-center gap-2">
                    {p.label}
                    {row.id && <Badge variant={row.is_active ? "default" : "secondary"}>{row.is_active ? "Active" : "Inactive"}</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{p.helper}</p>
                  <a href={p.consoleUrl} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">
                    Open developer console →
                  </a>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={row.is_active} onCheckedChange={(v) => update(p.id, { is_active: v })} />
                  <span className="text-xs text-muted-foreground">Enabled</span>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label className="text-xs">Client ID / App ID / Client Key</Label>
                  <Input
                    value={row.client_id}
                    onChange={(e) => update(p.id, { client_id: e.target.value })}
                    disabled={loading}
                    placeholder="••••••••"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-xs">Client Secret</Label>
                  <div className="relative">
                    <Input
                      type={reveal ? "text" : "password"}
                      value={row.client_secret}
                      onChange={(e) => update(p.id, { client_secret: e.target.value })}
                      disabled={loading}
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      onClick={() => setRevealed((r) => ({ ...r, [p.id]: !r[p.id] }))}
                    >
                      {reveal ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                {row.id && (
                  <Button variant="outline" size="sm" onClick={() => remove(p.id)}>
                    <Trash2 className="h-4 w-4 mr-1" /> Delete
                  </Button>
                )}
                <Button size="sm" onClick={() => save(p.id)} disabled={savingId === p.id}>
                  <Save className="h-4 w-4 mr-1" /> Save
                </Button>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};

export default SocialAppCredentials;
