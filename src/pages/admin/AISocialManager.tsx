import { useEffect, useState } from "react";
import AdminLayout from "@/layouts/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Calendar, BarChart3, MessageSquare, Link2, Settings as SettingsIcon, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import PostComposerDialog from "@/components/admin/social/PostComposerDialog";

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
  const [accounts, setAccounts] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [composerOpen, setComposerOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [accountsRes, postsRes] = await Promise.all([
        supabase.from("social_accounts").select("*").order("created_at", { ascending: false }),
        supabase.from("social_posts").select("*").order("created_at", { ascending: false }).limit(20),
      ]);

      const accs = accountsRes.data || [];
      const ps = postsRes.data || [];

      setAccounts(accs);
      setPosts(ps);
      setStats({
        accounts: accs.length,
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
                <CardTitle>Phase 1 Foundation Ready</CardTitle>
                <CardDescription>
                  Database tables & UI shell are now live. Next phases will add OAuth, AI generation, publishing, and auto-reply.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <PhaseRow done label="Phase 1: Foundation (DB + UI shell)" />
                <PhaseRow done label="Phase 2: AI content & product-action image generation" />
                <PhaseRow label="Phase 3: OAuth flows (Meta, Twitter/X, TikTok)" />
                <PhaseRow label="Phase 4: Bulk publishing + cron scheduling" />
                <PhaseRow label="Phase 5: Analytics sync + AI auto-reply" />
                <Button onClick={() => setComposerOpen(true)} className="w-full mt-2">
                  <Sparkles className="h-4 w-4 mr-2" /> Compose AI post
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="accounts">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Connected Accounts</CardTitle>
                  <CardDescription>Connect social accounts via OAuth (available in Phase 3)</CardDescription>
                </div>
                <Button disabled>
                  <Plus className="h-4 w-4 mr-2" /> Connect Account
                </Button>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-24 w-full" />
                ) : accounts.length === 0 ? (
                  <EmptyState
                    icon={Link2}
                    title="No accounts connected yet"
                    description="OAuth integrations will be available in Phase 3."
                  />
                ) : (
                  <div className="space-y-2">
                    {accounts.map((a) => (
                      <div key={a.id} className="flex items-center justify-between border rounded-md p-3">
                        <div>
                          <div className="font-medium">{a.account_name}</div>
                          <div className="text-sm text-muted-foreground">
                            {platformLabels[a.platform] || a.platform}
                          </div>
                        </div>
                        <Badge variant={a.is_active ? "default" : "secondary"}>
                          {a.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
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
                      <div key={p.id} className="border rounded-md p-3">
                        <div className="flex items-center justify-between mb-1">
                          <Badge>{p.status}</Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(p.created_at).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm line-clamp-2">{p.content}</p>
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
                  Auto-Post Settings
                </CardTitle>
                <CardDescription>
                  Configure daily auto-posting from products, blog posts, or custom AI prompts (Phase 4)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <EmptyState
                  icon={Calendar}
                  title="Auto-post engine coming soon"
                  description="Cron-based daily posting will be enabled in Phase 4."
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics">
            <Card>
              <CardHeader>
                <CardTitle>Engagement Analytics</CardTitle>
                <CardDescription>Reach, impressions, likes, comments per post (Phase 5)</CardDescription>
              </CardHeader>
              <CardContent>
                <EmptyState
                  icon={BarChart3}
                  title="No analytics data yet"
                  description="Analytics syncing arrives in Phase 5."
                />
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
