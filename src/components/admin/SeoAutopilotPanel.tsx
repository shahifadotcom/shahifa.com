import { useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Bot, ClipboardList, Copy, Loader2, Rocket, Search, Sparkles, Target } from 'lucide-react';

type Priority = 'high' | 'medium' | 'low';

interface Snapshot {
  totalProducts: number;
  publishedBlogCount: number;
  categoryCount: number;
  missingSlugCount: number;
  missingMetaTitleCount: number;
  missingMetaDescriptionCount: number;
  missingSocialPreviewCount: number;
  productsInSitemap: number;
  categoriesInSitemap: number;
  sitemapGeneratedAt: string | null;
  canonicalUrl: string | null;
}

interface Opportunity {
  title: string;
  impact: string;
  whyItMatters: string;
}

interface TaskItem {
  title: string;
  owner: string;
  priority: Priority;
  timeline: string;
  outcome: string;
}

interface ChannelPlan {
  channel: string;
  playbook: string;
  autopilotAction: string;
}

interface SchemaItem {
  name: string;
  status: 'ready' | 'needs-work' | 'missing';
  action: string;
}

interface Analysis {
  readinessScore: number;
  aiSearchReadinessScore: number;
  summary: string;
  topOpportunities: Opportunity[];
  tasks: TaskItem[];
  channels: ChannelPlan[];
  schemaChecklist: SchemaItem[];
  next7Days: string[];
}

interface SeoAutopilotResponse {
  analysis: Analysis;
  snapshot: Snapshot;
  generatedAt: string;
}

const priorityVariant: Record<Priority, 'default' | 'secondary' | 'outline'> = {
  high: 'default',
  medium: 'secondary',
  low: 'outline',
};

export function SeoAutopilotPanel() {
  const { toast } = useToast();
  const [goal, setGoal] = useState('Get more customers from Google, Bing, and AI search experiences like ChatGPT.');
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<SeoAutopilotResponse | null>(null);

  const sortedTasks = useMemo(() => {
    if (!report) return [];
    const order: Record<Priority, number> = { high: 0, medium: 1, low: 2 };
    return [...report.analysis.tasks].sort((a, b) => order[a.priority] - order[b.priority]);
  }, [report]);

  const runAutopilot = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('seo-autopilot', {
        body: { goal },
      });

      if (error) {
        const status = (error as Error & { context?: { status?: number; body?: string } }).context?.status;
        if (status === 429) {
          throw new Error('Lovable AI is rate limited right now. Please try again shortly.');
        }
        if (status === 402) {
          throw new Error('Lovable AI needs more workspace credits before it can continue.');
        }
        throw error;
      }

      setReport(data as SeoAutopilotResponse);
      toast({
        title: 'SEO autopilot ready',
        description: 'Your store now has an AI action plan for search engine and AI search growth.',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to generate SEO autopilot report';
      toast({
        title: 'Autopilot failed',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const copyReport = async () => {
    if (!report) return;

    const text = [
      `SEO readiness: ${report.analysis.readinessScore}/100`,
      `AI search readiness: ${report.analysis.aiSearchReadinessScore}/100`,
      '',
      report.analysis.summary,
      '',
      'Top opportunities:',
      ...report.analysis.topOpportunities.map((item) => `- ${item.title}: ${item.impact} — ${item.whyItMatters}`),
      '',
      'Tasks:',
      ...report.analysis.tasks.map((task) => `- [${task.priority}] ${task.title} (${task.timeline}) — ${task.outcome}`),
    ].join('\n');

    try {
      await navigator.clipboard.writeText(text);
      toast({ title: 'Copied', description: 'SEO autopilot report copied to clipboard.' });
    } catch {
      toast({ title: 'Copy failed', description: 'Could not copy the report.', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            AI SEO Autopilot
          </CardTitle>
          <CardDescription>
            Generate an AI-powered growth plan for search engines, shopping discovery, and AI answer engines while you sleep.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Main business goal</label>
            <Textarea
              value={goal}
              onChange={(event) => setGoal(event.target.value)}
              rows={3}
              placeholder="Example: Grow organic traffic for product pages and get mentioned more often in AI search answers."
            />
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <Card className="border-dashed">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <Search className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">Search visibility</p>
                    <p className="text-sm text-muted-foreground">Titles, metadata, sitemap freshness, indexability</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-dashed">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <Bot className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">AI search readiness</p>
                    <p className="text-sm text-muted-foreground">Structured data, FAQs, entity trust, answer-ready content</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-dashed">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <Rocket className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">Marketing autopilot</p>
                    <p className="text-sm text-muted-foreground">Content ideas, channel plans, quick wins, next steps</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button onClick={runAutopilot} disabled={loading || !goal.trim()} className="sm:flex-1">
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
              {loading ? 'Building autopilot plan...' : 'Run SEO Autopilot'}
            </Button>
            <Button variant="outline" onClick={copyReport} disabled={!report}>
              <Copy className="mr-2 h-4 w-4" />
              Copy report
            </Button>
          </div>
        </CardContent>
      </Card>

      {report && (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>SEO readiness</CardDescription>
                <CardTitle>{report.analysis.readinessScore}/100</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Progress value={report.analysis.readinessScore} />
                <p className="text-xs text-muted-foreground">How ready your store is for classic search discovery.</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>AI search readiness</CardDescription>
                <CardTitle>{report.analysis.aiSearchReadinessScore}/100</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Progress value={report.analysis.aiSearchReadinessScore} />
                <p className="text-xs text-muted-foreground">How prepared your store is for AI answers and recommendation engines.</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Products with missing SEO fields</CardDescription>
                <CardTitle>
                  {report.snapshot.missingMetaTitleCount + report.snapshot.missingMetaDescriptionCount + report.snapshot.missingSlugCount}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Missing slugs, meta titles, or descriptions reduce visibility and click-through rate.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Sitemap freshness</CardDescription>
                <CardTitle>
                  {report.snapshot.sitemapGeneratedAt ? new Date(report.snapshot.sitemapGeneratedAt).toLocaleDateString() : 'Not ready'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">Products in sitemap: {report.snapshot.productsInSitemap}</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Executive summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm leading-6 text-muted-foreground">{report.analysis.summary}</p>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-lg border p-4">
                  <p className="text-sm font-medium">Products</p>
                  <p className="text-2xl font-bold">{report.snapshot.totalProducts}</p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-sm font-medium">Published blogs</p>
                  <p className="text-2xl font-bold">{report.snapshot.publishedBlogCount}</p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-sm font-medium">Categories</p>
                  <p className="text-2xl font-bold">{report.snapshot.categoryCount}</p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-sm font-medium">Canonical domain</p>
                  <p className="truncate text-sm text-muted-foreground">{report.snapshot.canonicalUrl || 'Not configured'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 xl:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Top growth opportunities</CardTitle>
                <CardDescription>Where AI thinks you can gain customers fastest.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {report.analysis.topOpportunities.map((item) => (
                  <div key={item.title} className="rounded-lg border p-4">
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-medium">{item.title}</p>
                      <Badge variant="secondary">{item.impact}</Badge>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">{item.whyItMatters}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Structured data checklist</CardTitle>
                <CardDescription>Important for Google rich results and AI search citations.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {report.analysis.schemaChecklist.map((item) => (
                  <div key={item.name} className="rounded-lg border p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium">{item.name}</p>
                      <Badge variant={item.status === 'ready' ? 'secondary' : item.status === 'needs-work' ? 'outline' : 'default'}>
                        {item.status}
                      </Badge>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">{item.action}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5" />
                Recommended action queue
              </CardTitle>
              <CardDescription>What to automate or prioritize next.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {sortedTasks.map((task, index) => (
                <div key={`${task.title}-${index}`}>
                  <div className="flex flex-col gap-3 rounded-lg border p-4 md:flex-row md:items-start md:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{task.title}</p>
                        <Badge variant={priorityVariant[task.priority]}>{task.priority}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{task.outcome}</p>
                    </div>
                    <div className="space-y-1 text-sm text-muted-foreground md:text-right">
                      <p>Owner: {task.owner}</p>
                      <p>Timeline: {task.timeline}</p>
                    </div>
                  </div>
                  {index < sortedTasks.length - 1 && <Separator className="my-3" />}
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="grid gap-4 xl:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Channel playbooks</CardTitle>
                <CardDescription>Where to turn SEO wins into customer growth.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {report.analysis.channels.map((channel) => (
                  <div key={channel.channel} className="rounded-lg border p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium">{channel.channel}</p>
                      <Badge variant="outline">Autopilot</Badge>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">{channel.playbook}</p>
                    <p className="mt-2 text-sm font-medium text-foreground">{channel.autopilotAction}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Next 7 days</CardTitle>
                <CardDescription>Short sprint plan to start compounding organic growth.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {report.analysis.next7Days.map((item) => (
                  <div key={item} className="rounded-lg border p-4">
                    <p className="text-sm text-muted-foreground">{item}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}