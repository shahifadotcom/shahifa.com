import { useEffect, useState } from "react";
import AdminLayout from "@/layouts/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Calendar, BarChart3, MessageSquare, Link2, Settings as SettingsIcon, Plus, Send, X, Loader2, Bot } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import PostComposerDialog from "@/components/admin/social/PostComposerDialog";
import SocialAppCredentials from "@/components/admin/social/SocialAppCredentials";
import ConnectedAccounts from "@/components/admin/social/ConnectedAccounts";
import SocialAnalyticsPanel from "@/components/admin/social/SocialAnalyticsPanel";
import SocialAutoReplySettings from "@/components/admin/social/SocialAutoReplySettings";

const platformLabels: Record<string, string> = {
  facebook_page: "Facebook Page",
  facebook_group: "Facebook Group",
  instagram: "Instagram",
  twitter: "Twitter / X",
  tiktok: "TikTok",
};

const AISocialManager = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ accounts: 0, posts: 0, scheduled: 0, published: 0 });
  const [posts, setPosts] = useState<any[]>([]);
  const [composerOpen, setComposerOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const handlePublishNow = async (postId: string) => {
    setActionLoading(postId);
    try {
      const { data, error } = await supabase.functions.invoke("social-publish-post", {
        body: { post_id: postId },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      const okCount = (data as any)?.results?.filter((r: any) => r.ok).length ?? 0;
      const total = (data as any)?.total ?? 0;
      toast({
        title: (data as any)?.ok ? "Published" : "Publish finished with errors",
        description: `${okCount}/${total} accounts succeeded`,
      });
      await loadData();
    } catch (e: any) {
      toast({ title: "Publish failed", description: e.message, variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancelScheduled = async (postId: string) => {
    if (!confirm("Cancel this scheduled post? It will become a draft.")) return;
    const { error } = await supabase
      .from("social_posts")
      .update({ status: "draft", scheduled_for: null })
      .eq("id", postId);
    if (error) {
      toast({ title: "Cancel failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Schedule cancelled" });
    loadData();
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [accountsRes, postsRes] = await Promise.all([
        supabase.from("social_accounts").select("id"),
        supabase.from("social_posts").select("*").order("created_at", { ascending: false }).limit(20),
      ]);

      const accountCount = accountsRes.data?.length ?? 0;
      const ps = postsRes.data || [];

      setPosts(ps);
      setStats({
        accounts: accountCount,
        posts: ps.length,
        scheduled: ps.filter((p) => p.status === "scheduled").length,
        published: ps.filter((p) => p.status === "published").length,
      });
    } catch (e) {
      console.error("Failed to load social data", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Sparkles className="h-8 w-8 text-primary" />
              AI Social Manager
            </h1>
            <p className="text-muted-foreground mt-1">
              AI-powered multi-platform posting, scheduling, analytics & auto-replies
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard title="Connected Accounts" value={stats.accounts} icon={Link2} loading={loading} />
          <StatCard title="Total Posts" value={stats.posts} icon={MessageSquare} loading={loading} />
          <StatCard title="Scheduled" value={stats.scheduled} icon={Calendar} loading={loading} />
          <StatCard title="Published" value={stats.published} icon={BarChart3} loading={loading} />
        </div>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid grid-cols-2 md:grid-cols-5 w-full">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="accounts">Accounts</TabsTrigger>
            <TabsTrigger value="posts">Posts</TabsTrigger>
            <TabsTrigger value="auto-post">Auto-Post</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Phase 5 Live</CardTitle>
                <CardDescription>
                  OAuth, AI generation, bulk publishing, analytics sync, and AI auto-reply are now wired into the manager.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <PhaseRow done label="Phase 1: Foundation (DB + UI shell)" />
                <PhaseRow done label="Phase 2: AI content & product-action image generation" />
                <PhaseRow done label="Phase 3: OAuth flows (Meta, Twitter/X, TikTok)" />
                <PhaseRow done label="Phase 4: Bulk publishing + cron scheduling" />
                <PhaseRow done label="Phase 5: Analytics sync + AI auto-reply" />
                <Button onClick={() => setComposerOpen(true)} className="w-full mt-2">
                  <Sparkles className="h-4 w-4 mr-2" /> Compose AI post
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="accounts" className="space-y-4">
            <ConnectedAccounts />
            <SocialAppCredentials
              callbackUrl={`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/social-oauth-callback`}
            />
          </TabsContent>

          <TabsContent value="posts">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Posts</CardTitle>
                  <CardDescription>Drafts, scheduled and published posts</CardDescription>
                </div>
                <Button onClick={() => setComposerOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" /> New Post
                </Button>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-24 w-full" />
                ) : posts.length === 0 ? (
                  <EmptyState
                    icon={MessageSquare}
                    title="No posts yet"
                    description="Click 'New Post' to compose your first AI-generated post."
                  />
                ) : (
                  <div className="space-y-2">
                    {posts.map((p) => (
                      <div key={p.id} className="border rounded-md p-3 space-y-2">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge
                              variant={
                                p.status === "published"
                                  ? "default"
                                  : p.status === "failed"
                                  ? "destructive"
                                  : "secondary"
                              }
                            >
                              {p.status}
                            </Badge>
                            {(p.platforms ?? []).map((pl: string) => (
                              <Badge key={pl} variant="outline" className="text-xs">
                                {platformLabels[pl] ?? pl}
                              </Badge>
                            ))}
                            {p.scheduled_for && (
                              <span className="text-xs text-muted-foreground">
                                ⏱ {new Date(p.scheduled_for).toLocaleString()}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            {(p.status === "draft" || p.status === "scheduled" || p.status === "failed") && (
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={actionLoading === p.id}
                                onClick={() => handlePublishNow(p.id)}
                              >
                                {actionLoading === p.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <><Send className="h-3 w-3 mr-1" /> Publish now</>
                                )}
                              </Button>
                            )}
                            {p.status === "scheduled" && (
                              <Button size="sm" variant="ghost" onClick={() => handleCancelScheduled(p.id)}>
                                <X className="h-3 w-3 mr-1" /> Cancel
                              </Button>
                            )}
                          </div>
                        </div>
                        <p className="text-sm line-clamp-2">{p.content}</p>
                        {p.last_publish_error && (
                          <p className="text-xs text-destructive line-clamp-2">{p.last_publish_error}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="auto-post">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <SettingsIcon className="h-5 w-5" />
                  Auto-Post & Scheduling
                </CardTitle>
                <CardDescription>
                  Scheduling is live — a cron job runs every minute and publishes due posts to all selected platforms automatically.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="border rounded-md p-3 text-sm">
                  <strong>How to schedule:</strong> Open the composer, generate captions, pick a date/time, click <em>Schedule</em>. Use <em>Publish now</em> from the Posts tab for instant publishing.
                </div>
                <Button onClick={() => setComposerOpen(true)} className="w-full">
                  <Sparkles className="h-4 w-4 mr-2" /> New scheduled post
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <SocialAnalyticsPanel />
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bot className="h-5 w-5" /> Reply Automation
                </CardTitle>
                <CardDescription>
                  Configure the AI comment bot and trigger a manual run any time.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SocialAutoReplySettings />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <PostComposerDialog
          open={composerOpen}
          onOpenChange={setComposerOpen}
          onSaved={loadData}
        />
      </div>
    </AdminLayout>
  );
};

const StatCard = ({
  title,
  value,
  icon: Icon,
  loading,
}: {
  title: string;
  value: number;
  icon: any;
  loading: boolean;
}) => (
  <Card>
    <CardContent className="p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          {loading ? (
            <Skeleton className="h-8 w-12 mt-1" />
          ) : (
            <p className="text-2xl font-bold">{value}</p>
          )}
        </div>
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
    </CardContent>
  </Card>
);

const EmptyState = ({
  icon: Icon,
  title,
  description,
}: {
  icon: any;
  title: string;
  description: string;
}) => (
  <div className="text-center py-12 border-2 border-dashed rounded-lg">
    <Icon className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
    <h3 className="font-semibold mb-1">{title}</h3>
    <p className="text-sm text-muted-foreground">{description}</p>
  </div>
);

const PhaseRow = ({ label, done }: { label: string; done?: boolean }) => (
  <div className="flex items-center justify-between border rounded-md p-3">
    <span className="text-sm">{label}</span>
    <Badge variant={done ? "default" : "secondary"}>{done ? "Done" : "Pending"}</Badge>
  </div>
);

export default AISocialManager;
