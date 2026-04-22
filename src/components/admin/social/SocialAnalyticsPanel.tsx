import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";
import { BarChart3, Eye, Heart, MessageSquare, RefreshCw, Share2, Sparkles } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const chartConfig = {
  impressions: { label: "Impressions", color: "hsl(var(--primary))" },
  engagement: { label: "Engagement", color: "hsl(var(--success))" },
} satisfies ChartConfig;

const labelMap: Record<string, string> = {
  facebook_page: "Facebook Page",
  facebook_group: "Facebook Group",
  instagram: "Instagram",
  twitter: "Twitter / X",
  tiktok: "TikTok",
};

export default function SocialAnalyticsPanel() {
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [rows, setRows] = useState<any[]>([]);
  const [replies, setReplies] = useState<any[]>([]);

  const load = async () => {
    setLoading(true);
    try {
      const [analyticsRes, repliesRes] = await Promise.all([
        supabase
          .from("social_post_analytics")
          .select("*")
          .order("fetched_at", { ascending: false })
          .limit(100),
        supabase
          .from("social_comment_replies")
          .select("id, platform, reply_status, commenter_name, comment_text, reply_text, created_at")
          .order("created_at", { ascending: false })
          .limit(10),
      ]);

      if (analyticsRes.error) throw analyticsRes.error;
      if (repliesRes.error) throw repliesRes.error;

      setRows(analyticsRes.data ?? []);
      setReplies(repliesRes.data ?? []);
    } catch (error: any) {
      toast({ title: "Failed to load analytics", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const totals = useMemo(() => rows.reduce((acc, row) => ({
    impressions: acc.impressions + (row.impressions ?? 0),
    reach: acc.reach + (row.reach ?? 0),
    likes: acc.likes + (row.likes ?? 0),
    comments: acc.comments + (row.comments ?? 0),
    shares: acc.shares + (row.shares ?? 0),
    clicks: acc.clicks + (row.clicks ?? 0),
  }), { impressions: 0, reach: 0, likes: 0, comments: 0, shares: 0, clicks: 0 }), [rows]);

  const platformData = useMemo(() => {
    const grouped = new Map<string, { platform: string; impressions: number; engagement: number }>();
    for (const row of rows) {
      const current = grouped.get(row.platform) ?? { platform: row.platform, impressions: 0, engagement: 0 };
      current.impressions += row.impressions ?? 0;
      current.engagement += (row.likes ?? 0) + (row.comments ?? 0) + (row.shares ?? 0);
      grouped.set(row.platform, current);
    }
    return Array.from(grouped.values()).map((item) => ({
      ...item,
      platform: labelMap[item.platform] ?? item.platform,
    }));
  }, [rows]);

  const runSync = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("social-analytics-sync", { body: {} });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast({ title: "Analytics synced", description: `${(data as any)?.synced ?? 0} account metrics updated` });
      await load();
    } catch (error: any) {
      toast({ title: "Sync failed", description: error.message, variant: "destructive" });
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return <Skeleton className="h-80 w-full" />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-lg font-semibold">Performance</h3>
          <p className="text-sm text-muted-foreground">Latest synced engagement across connected platforms.</p>
        </div>
        <Button variant="outline" onClick={runSync} disabled={syncing}>
          <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? "animate-spin" : ""}`} /> Sync now
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <MetricCard icon={Eye} label="Impressions" value={totals.impressions} />
        <MetricCard icon={BarChart3} label="Reach" value={totals.reach} />
        <MetricCard icon={Heart} label="Likes" value={totals.likes} />
        <MetricCard icon={MessageSquare} label="Comments" value={totals.comments} />
        <MetricCard icon={Share2} label="Shares" value={totals.shares} />
        <MetricCard icon={Sparkles} label="Clicks" value={totals.clicks} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Platform comparison</CardTitle>
            <CardDescription>Impressions vs engagement by platform</CardDescription>
          </CardHeader>
          <CardContent>
            {platformData.length === 0 ? (
              <EmptyBlock text="Publish a few posts, then run analytics sync to populate this chart." />
            ) : (
              <ChartContainer className="h-[280px] w-full" config={chartConfig}>
                <BarChart data={platformData}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="platform" tickLine={false} axisLine={false} tickMargin={8} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="impressions" radius={4} fill="var(--color-impressions)" />
                  <Bar dataKey="engagement" radius={4} fill="var(--color-engagement)" />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent AI replies</CardTitle>
            <CardDescription>Latest reply attempts from the comment bot</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {replies.length === 0 ? (
              <EmptyBlock text="No auto-replies yet." />
            ) : (
              replies.map((reply) => (
                <div key={reply.id} className="rounded-md border p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-medium">{reply.commenter_name ?? "Customer"}</div>
                    <Badge variant={reply.reply_status === "replied" ? "default" : "destructive"}>{reply.reply_status}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">{reply.comment_text}</p>
                  {reply.reply_text && <p className="text-sm line-clamp-2">{reply.reply_text}</p>}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value }: { icon: any; label: string; value: number }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-2xl font-semibold">{value.toLocaleString()}</p>
          </div>
          <Icon className="h-5 w-5 text-muted-foreground" />
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyBlock({ text }: { text: string }) {
  return <div className="rounded-md border border-dashed px-4 py-8 text-sm text-muted-foreground text-center">{text}</div>;
}
