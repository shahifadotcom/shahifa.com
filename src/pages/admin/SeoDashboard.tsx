import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import AdminLayout from '@/layouts/AdminLayout';
import { Activity, CheckCircle2, AlertTriangle, ExternalLink, RefreshCw, Search, Zap, Image as ImageIcon } from 'lucide-react';

type Vitals = { lcp: number | null; cls: number | null; inp: number | null };

interface GscData {
  connected: boolean;
  verified: boolean;
  site?: string;
  totals?: { clicks: number; impressions: number; ctr: number; position: number };
  topQueries?: Array<{ keys: string[]; clicks: number; impressions: number; ctr: number; position: number }>;
  error?: string;
}

interface Fix {
  id: string;
  title: string;
  impact: 'high' | 'medium' | 'low';
  category: string;
  description: string;
  action: string;
}

const SEED_FIXES: Fix[] = [
  {
    id: 'gsc-verify',
    title: 'Verify domain in Google Search Console',
    impact: 'high',
    category: 'Indexing',
    description: 'GSC ownership unconfirmed — search analytics, sitemap submission, and indexing alerts unavailable.',
    action: 'Use the Verify button in the GSC card to add a meta tag and trigger Google verification.',
  },
  {
    id: 'lcp-hero',
    title: 'Optimize hero image for LCP',
    impact: 'high',
    category: 'Performance',
    description: 'Largest Contentful Paint depends on the hero image. Add explicit width/height, fetchpriority="high", and remove loading="lazy".',
    action: 'Edit src/components/Hero.tsx hero <img> with width, height, and fetchpriority="high".',
  },
  {
    id: 'font-swap',
    title: 'Add font-display: swap',
    impact: 'medium',
    category: 'Performance',
    description: 'Web fonts block first paint. Adding font-display: swap renders fallback while loading.',
    action: 'Add font-display: swap to every @font-face rule in src/index.css.',
  },
  {
    id: 'image-alt',
    title: 'Audit images for descriptive alt text',
    impact: 'medium',
    category: 'Accessibility / SEO',
    description: 'Product and decorative images need accurate alt attributes for image search and a11y.',
    action: 'Review ProductCard, Hero, and slider components for missing/empty alt props.',
  },
];

function impactColor(i: Fix['impact']) {
  return i === 'high' ? 'destructive' : i === 'medium' ? 'default' : 'secondary';
}

function scoreLcp(ms: number | null) {
  if (ms == null) return { label: '—', tone: 'muted' };
  if (ms <= 2500) return { label: 'Good', tone: 'good' };
  if (ms <= 4000) return { label: 'Needs work', tone: 'warn' };
  return { label: 'Poor', tone: 'bad' };
}
function scoreCls(v: number | null) {
  if (v == null) return { label: '—', tone: 'muted' };
  if (v <= 0.1) return { label: 'Good', tone: 'good' };
  if (v <= 0.25) return { label: 'Needs work', tone: 'warn' };
  return { label: 'Poor', tone: 'bad' };
}

export default function SeoDashboard() {
  const [gsc, setGsc] = useState<GscData | null>(null);
  const [loading, setLoading] = useState(true);
  const [vitals, setVitals] = useState<Vitals>({ lcp: null, cls: null, inp: null });
  const [done, setDone] = useState<Set<string>>(new Set());

  useEffect(() => {
    void loadGsc();
    measureVitals();
  }, []);

  const loadGsc = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('seo-dashboard');
      if (error) throw error;
      setGsc(data);
    } catch (e: any) {
      setGsc({ connected: false, verified: false, error: e.message });
    } finally {
      setLoading(false);
    }
  };

  const measureVitals = () => {
    try {
      let clsValue = 0;
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const last = entries[entries.length - 1] as any;
        setVitals(v => ({ ...v, lcp: Math.round(last.renderTime || last.loadTime || last.startTime) }));
      });
      lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });

      const clsObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries() as any[]) {
          if (!entry.hadRecentInput) clsValue += entry.value;
        }
        setVitals(v => ({ ...v, cls: Math.round(clsValue * 1000) / 1000 }));
      });
      clsObserver.observe({ type: 'layout-shift', buffered: true });

      const inpObserver = new PerformanceObserver((list) => {
        let max = 0;
        for (const e of list.getEntries() as any[]) {
          if (e.duration > max) max = e.duration;
        }
        setVitals(v => ({ ...v, inp: Math.max(v.inp || 0, Math.round(max)) }));
      });
      try { inpObserver.observe({ type: 'event', buffered: true, durationThreshold: 16 } as any); } catch {}
    } catch (e) {
      console.warn('PerformanceObserver unsupported', e);
    }
  };

  const toggleDone = (id: string) => {
    setDone(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const lcp = scoreLcp(vitals.lcp);
  const cls = scoreCls(vitals.cls);
  const openFixes = SEED_FIXES.filter(f => !done.has(f.id));
  const sortedFixes = [...openFixes].sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 };
    return order[a.impact] - order[b.impact];
  });

  return (
    <AdminLayout>
      <div className="space-y-6 p-4 md:p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
              <Activity className="h-7 w-7" /> SEO Scan Dashboard
            </h1>
            <p className="text-sm text-muted-foreground">
              Search Console status, Core Web Vitals, and prioritized fixes
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={loadGsc} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
        </div>

        {/* Top status cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Search className="h-4 w-4" /> Google Search Console
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-sm text-muted-foreground">Checking…</p>
              ) : gsc?.verified ? (
                <div className="space-y-1">
                  <Badge variant="default" className="bg-green-600">
                    <CheckCircle2 className="h-3 w-3 mr-1" /> Verified
                  </Badge>
                  <p className="text-xs text-muted-foreground truncate">{gsc.site}</p>
                </div>
              ) : gsc?.connected ? (
                <div className="space-y-2">
                  <Badge variant="destructive">
                    <AlertTriangle className="h-3 w-3 mr-1" /> Not verified
                  </Badge>
                  <p className="text-xs text-muted-foreground">Connected, but the site isn't verified yet.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Badge variant="destructive">Not connected</Badge>
                  <p className="text-xs text-muted-foreground">{gsc?.error || 'Connect in Settings → Connectors.'}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Zap className="h-4 w-4" /> Largest Contentful Paint
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {vitals.lcp != null ? `${(vitals.lcp / 1000).toFixed(2)}s` : '—'}
              </div>
              <Badge variant={lcp.tone === 'good' ? 'default' : lcp.tone === 'warn' ? 'secondary' : 'destructive'}
                className={lcp.tone === 'good' ? 'bg-green-600' : ''}>
                {lcp.label}
              </Badge>
              <Progress className="mt-2" value={vitals.lcp ? Math.min(100, (vitals.lcp / 4000) * 100) : 0} />
              <p className="text-xs text-muted-foreground mt-1">Target: ≤ 2.5s</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <ImageIcon className="h-4 w-4" /> Cumulative Layout Shift
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {vitals.cls != null ? vitals.cls.toFixed(3) : '—'}
              </div>
              <Badge variant={cls.tone === 'good' ? 'default' : cls.tone === 'warn' ? 'secondary' : 'destructive'}
                className={cls.tone === 'good' ? 'bg-green-600' : ''}>
                {cls.label}
              </Badge>
              <Progress className="mt-2" value={vitals.cls != null ? Math.min(100, (vitals.cls / 0.25) * 100) : 0} />
              <p className="text-xs text-muted-foreground mt-1">Target: ≤ 0.1</p>
            </CardContent>
          </Card>
        </div>

        {/* GSC search analytics */}
        {gsc?.verified && gsc.totals && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Search performance — last 28 days</CardTitle>
              <CardDescription>From Google Search Console</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <Stat label="Clicks" value={gsc.totals.clicks?.toLocaleString() || '0'} />
                <Stat label="Impressions" value={gsc.totals.impressions?.toLocaleString() || '0'} />
                <Stat label="CTR" value={`${((gsc.totals.ctr || 0) * 100).toFixed(2)}%`} />
                <Stat label="Avg. position" value={(gsc.totals.position || 0).toFixed(1)} />
              </div>
              {gsc.topQueries && gsc.topQueries.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="py-2 pr-4">Query</th>
                        <th className="py-2 px-2 text-right">Clicks</th>
                        <th className="py-2 px-2 text-right">Impr.</th>
                        <th className="py-2 px-2 text-right">CTR</th>
                        <th className="py-2 pl-2 text-right">Position</th>
                      </tr>
                    </thead>
                    <tbody>
                      {gsc.topQueries.map((q, i) => (
                        <tr key={i} className="border-b last:border-0">
                          <td className="py-2 pr-4">{q.keys[0]}</td>
                          <td className="py-2 px-2 text-right">{q.clicks}</td>
                          <td className="py-2 px-2 text-right">{q.impressions}</td>
                          <td className="py-2 px-2 text-right">{(q.ctr * 100).toFixed(1)}%</td>
                          <td className="py-2 pl-2 text-right">{q.position.toFixed(1)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Prioritized fixes */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Highest-impact fixes</CardTitle>
            <CardDescription>{openFixes.length} open · {done.size} resolved</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {sortedFixes.length === 0 ? (
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" /> All tracked fixes resolved.
              </p>
            ) : sortedFixes.map(fix => (
              <div key={fix.id} className="border rounded-lg p-4 flex flex-col md:flex-row md:items-start gap-3">
                <div className="flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={impactColor(fix.impact)}>{fix.impact}</Badge>
                    <Badge variant="outline">{fix.category}</Badge>
                    <h3 className="font-semibold">{fix.title}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">{fix.description}</p>
                  <p className="text-xs text-muted-foreground"><span className="font-medium">Action:</span> {fix.action}</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => toggleDone(fix.id)}>
                  Mark done
                </Button>
              </div>
            ))}
            {done.size > 0 && (
              <div className="pt-2">
                <p className="text-xs text-muted-foreground mb-2">Resolved</p>
                {SEED_FIXES.filter(f => done.has(f.id)).map(f => (
                  <div key={f.id} className="flex items-center justify-between text-sm py-1">
                    <span className="line-through text-muted-foreground">{f.title}</span>
                    <Button size="sm" variant="ghost" onClick={() => toggleDone(f.id)}>Reopen</Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button variant="outline" asChild>
            <a href="https://search.google.com/search-console" target="_blank" rel="noopener noreferrer">
              Open Search Console <ExternalLink className="h-4 w-4 ml-2" />
            </a>
          </Button>
          <Button variant="outline" asChild>
            <a href="/sitemap.xml" target="_blank" rel="noopener noreferrer">
              View sitemap <ExternalLink className="h-4 w-4 ml-2" />
            </a>
          </Button>
        </div>
      </div>
    </AdminLayout>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border rounded-lg p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-xl font-semibold">{value}</p>
    </div>
  );
}
