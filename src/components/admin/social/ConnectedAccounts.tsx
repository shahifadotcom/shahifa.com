import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Link2, Trash2, RefreshCw, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const PLATFORMS = [
  { id: "facebook_page", label: "Facebook Pages" },
  { id: "facebook_group", label: "Facebook Groups" },
  { id: "instagram", label: "Instagram Business" },
  { id: "twitter", label: "Twitter / X" },
  { id: "tiktok", label: "TikTok" },
];

const platformLabel = (p: string) => PLATFORMS.find((x) => x.id === p)?.label ?? p;

const ConnectedAccounts = () => {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [connectingPlatform, setConnectingPlatform] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("social_accounts")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast({ title: "Failed to load accounts", description: error.message, variant: "destructive" });
    setAccounts(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const handler = (e: MessageEvent) => {
      const t = (e.data as any)?.type;
      if (t === "social-oauth-success") {
        toast({ title: "Account connected" });
        load();
      } else if (t === "social-oauth-error") {
        toast({ title: "Connection failed", description: (e.data as any)?.message ?? "", variant: "destructive" });
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  const connect = async (platform: string) => {
    setConnectingPlatform(platform);
    try {
      const { data, error } = await supabase.functions.invoke("social-oauth-init", {
        body: { platform, redirect_after: window.location.pathname },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      const url = (data as any).authorize_url as string;
      const w = window.open(url, "social-oauth", "width=600,height=720");
      if (!w) {
        // popup blocked — fall back to same-window redirect
        window.location.href = url;
      }
    } catch (e: any) {
      toast({ title: "Could not start OAuth", description: e.message, variant: "destructive" });
    } finally {
      setConnectingPlatform(null);
    }
  };

  const disconnect = async (id: string, name: string) => {
    if (!confirm(`Disconnect "${name}"? You can reconnect any time.`)) return;
    const { error } = await supabase.from("social_accounts").update({ is_active: false }).eq("id", id);
    if (error) {
      toast({ title: "Disconnect failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Disconnected" });
    load();
  };

  const remove = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}" permanently? This cannot be undone.`)) return;
    const { error } = await supabase.from("social_accounts").delete().eq("id", id);
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
        <CardTitle className="flex items-center gap-2">
          <Link2 className="h-5 w-5" /> Connect Social Accounts
        </CardTitle>
        <CardDescription>
          OAuth-connect each platform. Make sure App Credentials are saved first.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {PLATFORMS.map((p) => (
            <Button
              key={p.id}
              variant="outline"
              size="sm"
              disabled={connectingPlatform === p.id}
              onClick={() => connect(p.id)}
              className="justify-start"
            >
              <Plus className="h-4 w-4 mr-1" /> {p.label}
            </Button>
          ))}
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold">Connected accounts</h3>
            <Button variant="ghost" size="sm" onClick={load}>
              <RefreshCw className="h-4 w-4 mr-1" /> Refresh
            </Button>
          </div>

          {loading ? (
            <Skeleton className="h-24 w-full" />
          ) : accounts.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-8 border-2 border-dashed rounded-md">
              No accounts connected yet. Pick a platform above to connect.
            </div>
          ) : (
            <div className="space-y-2">
              {accounts.map((a) => (
                <div key={a.id} className="flex items-center justify-between gap-3 border rounded-md p-3 flex-wrap">
                  <div className="flex items-center gap-3 min-w-0">
                    {a.profile_image_url ? (
                      <img
                        src={a.profile_image_url}
                        alt={a.account_name}
                        className="h-10 w-10 rounded-full object-cover bg-muted"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-xs">
                        {a.account_name?.[0] ?? "?"}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="font-medium truncate">{a.account_name}</div>
                      <div className="text-xs text-muted-foreground">
                        {platformLabel(a.platform)}{a.account_username ? ` · @${a.account_username}` : ""}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={a.is_active ? "default" : "secondary"}>
                      {a.is_active ? "Active" : "Disconnected"}
                    </Badge>
                    {a.is_active && (
                      <Button variant="ghost" size="sm" onClick={() => disconnect(a.id, a.account_name)}>
                        Disconnect
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => remove(a.id, a.account_name)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ConnectedAccounts;
