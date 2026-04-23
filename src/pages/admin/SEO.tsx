import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import AdminLayout from '@/layouts/AdminLayout';
import { SeoAutopilotPanel } from '@/components/admin/SeoAutopilotPanel';
import { Search, Globe, FileText, Zap, Check, X, RefreshCw, Copy, Download } from 'lucide-react';

interface SitemapCache {
  id: string;
  xml_content: string;
  generated_at: string;
  products_count: number;
  categories_count: number;
}

export default function SEO() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [seoSettings, setSeoSettings] = useState<any>(null);
  const [sitemapLoading, setSitemapLoading] = useState(false);
  const [sitemapCache, setSitemapCache] = useState<SitemapCache | null>(null);

  useEffect(() => {
    loadSEOSettings();
    loadSitemapCache();
  }, []);

  const loadSitemapCache = async () => {
    try {
      const { data, error } = await supabase
        .from('sitemap_cache')
        .select('*')
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      if (data) setSitemapCache(data as SitemapCache);
    } catch (error) {
      console.error('Error loading sitemap cache:', error);
    }
  };

  const loadSEOSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('seo_settings')
        .select('*')
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (data) {
        setSeoSettings(data);
      } else {
        // Create default settings
        const { data: newSettings, error: createError } = await supabase
          .from('seo_settings')
          .insert({
            site_title: 'Your E-commerce Store',
            site_description: 'Premium products with worldwide shipping',
            canonical_url: 'https://yourstore.com'
          })
          .select()
          .single();

        if (createError) throw createError;
        setSeoSettings(newSettings);
      }
    } catch (error) {
      console.error('Error loading SEO settings:', error);
      toast({
        title: "Error",
        description: "Failed to load SEO settings",
        variant: "destructive"
      });
    }
  };

  const updateSEOSettings = async (updates: any) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('seo_settings')
        .update(updates)
        .eq('id', seoSettings.id);

      if (error) throw error;

      setSeoSettings({ ...seoSettings, ...updates });
      toast({
        title: "Success",
        description: "SEO settings updated successfully"
      });
    } catch (error) {
      console.error('Error updating SEO settings:', error);
      toast({
        title: "Error",
        description: "Failed to update SEO settings",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const generateSitemap = async () => {
    setSitemapLoading(true);
    try {
      // Call the database function to regenerate sitemap
      const { error } = await supabase.rpc('regenerate_sitemap');
      if (error) throw error;
      
      await loadSitemapCache();
      await loadSEOSettings();
      
      toast({
        title: "Success",
        description: "Sitemap regenerated successfully!"
      });
    } catch (error) {
      console.error('Error generating sitemap:', error);
      toast({
        title: "Error",
        description: "Failed to generate sitemap",
        variant: "destructive"
      });
    } finally {
      setSitemapLoading(false);
    }
  };

  const copySitemapToClipboard = async () => {
    if (!sitemapCache?.xml_content) {
      toast({ title: "No sitemap available", variant: "destructive" });
      return;
    }
    try {
      await navigator.clipboard.writeText(sitemapCache.xml_content);
      toast({
        title: "Copied!",
        description: "Sitemap XML copied to clipboard. Paste it into public/sitemap.xml"
      });
    } catch (error) {
      toast({ title: "Failed to copy", variant: "destructive" });
    }
  };

  const downloadSitemap = () => {
    if (!sitemapCache?.xml_content) return;
    const blob = new Blob([sitemapCache.xml_content], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sitemap.xml';
    a.click();
    URL.revokeObjectURL(url);
  };

  const submitToSearchEngine = async (engine: string) => {
    try {
      let submitUrl = '';
      const sitemapUrl = `${window.location.origin}/sitemap.xml`;

      switch (engine) {
        case 'google':
          submitUrl = `https://www.google.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`;
          break;
        case 'bing':
          submitUrl = `https://www.bing.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`;
          break;
        case 'yandex':
          submitUrl = `https://webmaster.yandex.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`;
          break;
      }

      // Open in new tab for manual submission
      window.open(submitUrl, '_blank');
      
      toast({
        title: "Submission URL opened",
        description: `${engine.charAt(0).toUpperCase() + engine.slice(1)} search engine submission page opened in new tab`
      });
    } catch (error) {
      console.error('Error submitting to search engine:', error);
      toast({
        title: "Error",
        description: "Failed to submit to search engine",
        variant: "destructive"
      });
    }
  };

  if (!seoSettings) {
    return (
      <AdminLayout>
        <div className="p-6">
          <div className="animate-pulse">Loading SEO settings...</div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">SEO & Search Engines</h1>
          <p className="text-muted-foreground">Manage your site's SEO settings and search engine visibility</p>
        </div>

        <Tabs defaultValue="seo" className="space-y-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="seo">SEO Settings</TabsTrigger>
            <TabsTrigger value="sitemap">Sitemap</TabsTrigger>
            <TabsTrigger value="search-engines">Search Engines</TabsTrigger>
            <TabsTrigger value="autopilot">AI Autopilot</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
          </TabsList>

          <TabsContent value="seo" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5" />
                  General SEO Settings
                </CardTitle>
                <CardDescription>
                  Configure your site's basic SEO information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="site_title">Site Title</Label>
                  <Input
                    id="site_title"
                    value={seoSettings.site_title || ''}
                    onChange={(e) => setSeoSettings({ ...seoSettings, site_title: e.target.value })}
                    placeholder="Your E-commerce Store"
                  />
                </div>

                <div>
                  <Label htmlFor="site_description">Site Description</Label>
                  <Textarea
                    id="site_description"
                    value={seoSettings.site_description || ''}
                    onChange={(e) => setSeoSettings({ ...seoSettings, site_description: e.target.value })}
                    placeholder="Premium products with worldwide shipping"
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="canonical_url">Canonical URL</Label>
                  <Input
                    id="canonical_url"
                    value={seoSettings.canonical_url || ''}
                    onChange={(e) => setSeoSettings({ ...seoSettings, canonical_url: e.target.value })}
                    placeholder="https://yourstore.com"
                  />
                </div>

                <div>
                  <Label htmlFor="site_keywords">Site Keywords (comma separated)</Label>
                  <Input
                    id="site_keywords"
                    value={seoSettings.site_keywords?.join(', ') || ''}
                    onChange={(e) => setSeoSettings({ 
                      ...seoSettings, 
                      site_keywords: e.target.value.split(',').map(k => k.trim()) 
                    })}
                    placeholder="ecommerce, products, shopping, store"
                  />
                </div>

                <div>
                  <Label htmlFor="google_analytics_id">Google Analytics ID</Label>
                  <Input
                    id="google_analytics_id"
                    value={seoSettings.google_analytics_id || ''}
                    onChange={(e) => setSeoSettings({ ...seoSettings, google_analytics_id: e.target.value })}
                    placeholder="G-XXXXXXXXXX"
                  />
                </div>

                <Button 
                  onClick={() => updateSEOSettings(seoSettings)} 
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? 'Saving...' : 'Save SEO Settings'}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Robots.txt</CardTitle>
                <CardDescription>
                  Configure how search engines crawl your site
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  value={seoSettings.robots_txt || ''}
                  onChange={(e) => setSeoSettings({ ...seoSettings, robots_txt: e.target.value })}
                  rows={12}
                  className="font-mono text-sm"
                  placeholder="User-agent: *&#10;Allow: /&#10;&#10;Disallow: /admin/&#10;Disallow: /auth/callback&#10;&#10;Sitemap: https://yourstore.com/sitemap.xml"
                />
                <div className="flex gap-2">
                  <Button 
                    onClick={() => updateSEOSettings({ robots_txt: seoSettings.robots_txt })}
                    disabled={loading}
                    className="flex-1"
                  >
                    Update Robots.txt
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => window.open(`${window.location.origin}/robots.txt`, '_blank')}
                  >
                    View Live
                  </Button>
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground">
                    Robots.txt URL: <code className="bg-background px-2 py-1 rounded">{window.location.origin}/robots.txt</code>
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sitemap" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  XML Sitemap (Auto-Generated)
                </CardTitle>
                <CardDescription>
                  Sitemap automatically updates when products or categories change
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="p-4 border rounded-lg text-center">
                    <p className="text-2xl font-bold">{sitemapCache?.products_count || 0}</p>
                    <p className="text-sm text-muted-foreground">Products</p>
                  </div>
                  <div className="p-4 border rounded-lg text-center">
                    <p className="text-2xl font-bold">{sitemapCache?.categories_count || 0}</p>
                    <p className="text-sm text-muted-foreground">Categories</p>
                  </div>
                  <div className="p-4 border rounded-lg text-center">
                    <Badge variant="default" className="mb-1">Auto-Sync</Badge>
                    <p className="text-xs text-muted-foreground">Updates on changes</p>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h3 className="font-medium">Last Generated</h3>
                    <p className="text-sm text-muted-foreground">
                      {sitemapCache?.generated_at 
                        ? new Date(sitemapCache.generated_at).toLocaleString()
                        : 'Never generated'
                      }
                    </p>
                  </div>
                  <Badge variant="default">Active</Badge>
                </div>

                <div className="grid gap-2 md:grid-cols-2">
                  <Button 
                    onClick={generateSitemap}
                    disabled={sitemapLoading}
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${sitemapLoading ? 'animate-spin' : ''}`} />
                    {sitemapLoading ? 'Regenerating...' : 'Force Regenerate'}
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    onClick={() => window.open(`${window.location.origin}/sitemap.xml`, '_blank')}
                  >
                    View Live Sitemap
                  </Button>
                </div>

                <div className="grid gap-2 md:grid-cols-2">
                  <Button variant="secondary" onClick={copySitemapToClipboard}>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy XML to Clipboard
                  </Button>
                  <Button variant="secondary" onClick={downloadSitemap}>
                    <Download className="h-4 w-4 mr-2" />
                    Download sitemap.xml
                  </Button>
                </div>
                  
                <div className="p-3 bg-muted rounded-lg space-y-2">
                  <p className="text-xs text-muted-foreground break-all">
                    Sitemap URL: <code className="bg-background px-2 py-1 rounded">{seoSettings?.canonical_url || window.location.origin}/sitemap.xml</code>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    To update your deployed sitemap, download the file above and replace <code className="bg-background px-1 rounded">public/sitemap.xml</code>
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="search-engines" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="h-5 w-5 text-blue-600" />
                    Google Search Console
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2">
                    {seoSettings.google_search_console_verified ? (
                      <>
                        <Check className="h-4 w-4 text-green-600" />
                        <span className="text-sm">Verified</span>
                      </>
                    ) : (
                      <>
                        <X className="h-4 w-4 text-red-600" />
                        <span className="text-sm">Not verified</span>
                      </>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => submitToSearchEngine('google')}
                      className="w-full"
                    >
                      Submit Sitemap
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => window.open('https://search.google.com/search-console', '_blank')}
                      className="w-full"
                    >
                      Open Console
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="h-5 w-5 text-blue-500" />
                    Bing Webmaster Tools
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2">
                    {seoSettings.bing_webmaster_verified ? (
                      <>
                        <Check className="h-4 w-4 text-green-600" />
                        <span className="text-sm">Verified</span>
                      </>
                    ) : (
                      <>
                        <X className="h-4 w-4 text-red-600" />
                        <span className="text-sm">Not verified</span>
                      </>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => submitToSearchEngine('bing')}
                      className="w-full"
                    >
                      Submit Sitemap
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => window.open('https://www.bing.com/webmasters', '_blank')}
                      className="w-full"
                    >
                      Open Webmaster
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="h-5 w-5 text-red-600" />
                    Yandex Webmaster
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2">
                    {seoSettings.yandex_webmaster_verified ? (
                      <>
                        <Check className="h-4 w-4 text-green-600" />
                        <span className="text-sm">Verified</span>
                      </>
                    ) : (
                      <>
                        <X className="h-4 w-4 text-red-600" />
                        <span className="text-sm">Not verified</span>
                      </>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => submitToSearchEngine('yandex')}
                      className="w-full"
                    >
                      Submit Sitemap
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => window.open('https://webmaster.yandex.com', '_blank')}
                      className="w-full"
                    >
                      Open Webmaster
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>
                  Fast track your SEO setup
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2 md:grid-cols-2">
                  <Button 
                    variant="outline"
                    onClick={() => window.open('https://developers.google.com/search/docs/beginner/seo-starter-guide', '_blank')}
                  >
                    SEO Best Practices
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => window.open('https://schema.org/', '_blank')}
                  >
                    Schema Markup Guide
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => window.open('https://pagespeed.web.dev/', '_blank')}
                  >
                    PageSpeed Insights
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="autopilot" className="space-y-4">
            <SeoAutopilotPanel />
          </TabsContent>

          <TabsContent value="preview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Search Result Preview</CardTitle>
                <CardDescription>
                  Preview how your site will appear in Google search results
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="border rounded-lg p-6 bg-white">
                  <div className="space-y-2">
                    <div className="text-sm text-green-700">
                      {seoSettings.canonical_url || window.location.origin}
                    </div>
                    <div className="text-xl text-blue-600 hover:underline cursor-pointer">
                      {seoSettings.site_title || 'Your Site Title'}
                    </div>
                    <div className="text-sm text-gray-600">
                      {seoSettings.site_description || 'Your site description will appear here. Make it compelling to encourage clicks!'}
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Title Length:</span>
                    <Badge variant={seoSettings?.site_title?.length > 60 ? "destructive" : "default"}>
                      {seoSettings?.site_title?.length || 0} / 60 characters
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Description Length:</span>
                    <Badge variant={seoSettings?.site_description?.length > 160 ? "destructive" : "default"}>
                      {seoSettings?.site_description?.length || 0} / 160 characters
                    </Badge>
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="font-semibold">SEO Tips:</h3>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <Check className="h-4 w-4 mt-0.5 text-green-600" />
                      <span>Keep titles under 60 characters for optimal display</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="h-4 w-4 mt-0.5 text-green-600" />
                      <span>Keep descriptions between 120-160 characters</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="h-4 w-4 mt-0.5 text-green-600" />
                      <span>Include your main keywords naturally</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="h-4 w-4 mt-0.5 text-green-600" />
                      <span>Make titles and descriptions unique and compelling</span>
                    </li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}