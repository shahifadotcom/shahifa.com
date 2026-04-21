import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, Loader2, Image as ImageIcon, Save, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const PLATFORMS = [
  { id: "facebook_page", label: "Facebook Page" },
  { id: "facebook_group", label: "Facebook Group" },
  { id: "instagram", label: "Instagram" },
  { id: "twitter", label: "Twitter / X" },
  { id: "tiktok", label: "TikTok" },
];

const TONES = ["friendly", "professional", "witty", "hype", "educational", "inspirational"];

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved?: () => void;
}

const PostComposerDialog = ({ open, onOpenChange, onSaved }: Props) => {
  const [source, setSource] = useState<"product" | "blog" | "custom">("custom");
  const [productId, setProductId] = useState<string>("");
  const [blogId, setBlogId] = useState<string>("");
  const [prompt, setPrompt] = useState("");
  const [tone, setTone] = useState("friendly");
  const [platforms, setPlatforms] = useState<string[]>(["facebook_page"]);
  const [generateImage, setGenerateImage] = useState(true);
  const [hashtagCount, setHashtagCount] = useState(5);
  const [scheduledFor, setScheduledFor] = useState<string>("");

  const [products, setProducts] = useState<any[]>([]);
  const [blogs, setBlogs] = useState<any[]>([]);

  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [captions, setCaptions] = useState<{ platform: string; caption: string; hashtags: string[] }[]>([]);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    (async () => {
      const [{ data: prodData }, { data: blogData }] = await Promise.all([
        supabase.from("products").select("id, name").order("created_at", { ascending: false }).limit(100),
        supabase.from("blog_posts").select("id, title").eq("status", "published").order("created_at", { ascending: false }).limit(50),
      ]);
      setProducts(prodData ?? []);
      setBlogs(blogData ?? []);
    })();
  }, [open]);

  const togglePlatform = (id: string) => {
    setPlatforms((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  };

  const editCaption = (platform: string, value: string) => {
    setCaptions((cs) => cs.map((c) => (c.platform === platform ? { ...c, caption: value } : c)));
  };

  const handleGenerate = async () => {
    if (!platforms.length) {
      toast({ title: "Pick at least one platform", variant: "destructive" });
      return;
    }
    if (source === "product" && !productId) {
      toast({ title: "Select a product", variant: "destructive" });
      return;
    }
    if (source === "blog" && !blogId) {
      toast({ title: "Select a blog post", variant: "destructive" });
      return;
    }
    if (source === "custom" && !prompt.trim()) {
      toast({ title: "Write a topic / prompt", variant: "destructive" });
      return;
    }

    setGenerating(true);
    setCaptions([]);
    setImageUrl(null);
    try {
      const { data, error } = await supabase.functions.invoke("ai-social-generate", {
        body: {
          source,
          product_id: source === "product" ? productId : undefined,
          blog_id: source === "blog" ? blogId : undefined,
          prompt: source === "custom" ? prompt : undefined,
          platforms,
          tone,
          generate_image: generateImage,
          hashtag_count: hashtagCount,
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setCaptions((data as any).captions ?? []);
      setImageUrl((data as any).generated_image_url ?? null);
      toast({ title: "AI content generated" });
    } catch (e: any) {
      toast({ title: "Generation failed", description: e.message, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async (status: "draft" | "scheduled") => {
    if (!captions.length) {
      toast({ title: "Generate captions first", variant: "destructive" });
      return;
    }
    if (status === "scheduled" && !scheduledFor) {
      toast({ title: "Pick a schedule date/time", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      // Insert ONE row per platform so each can be retried/tracked independently.
      const rows = captions.map((c) => ({
        platforms: [c.platform] as any,
        content: `${c.caption}${c.hashtags?.length ? "\n\n" + c.hashtags.map((h) => (h.startsWith("#") ? h : `#${h}`)).join(" ") : ""}`,
        hashtags: c.hashtags ?? [],
        media_urls: imageUrl ? [imageUrl] : [],
        content_source: (source === "blog" ? "blog_post" : source === "custom" ? "custom_prompt" : "product") as any,
        source_reference_id: source === "product" ? productId : source === "blog" ? blogId : null,
        status: status as any,
        scheduled_for: status === "scheduled" ? new Date(scheduledFor).toISOString() : null,
        created_by: user?.id ?? null,
        ai_generated: true,
        ai_prompt: source === "custom" ? prompt : null,
      }));

      const { error } = await supabase.from("social_posts").insert(rows);
      if (error) throw error;

      toast({ title: status === "scheduled" ? "Post scheduled" : "Saved as draft" });
      onSaved?.();
      onOpenChange(false);
      // reset
      setCaptions([]);
      setImageUrl(null);
      setPrompt("");
      setProductId("");
      setBlogId("");
      setScheduledFor("");
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" /> AI Post Composer
          </DialogTitle>
          <DialogDescription>
            Generate platform-tailored captions + product-action images using AI.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="grid gap-2">
            <Label>Content source</Label>
            <Select value={source} onValueChange={(v: any) => setSource(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="custom">Custom AI prompt</SelectItem>
                <SelectItem value="product">From a product</SelectItem>
                <SelectItem value="blog">From a blog post</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {source === "product" && (
            <div className="grid gap-2">
              <Label>Product</Label>
              <Select value={productId} onValueChange={setProductId}>
                <SelectTrigger><SelectValue placeholder="Select a product" /></SelectTrigger>
                <SelectContent>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {source === "blog" && (
            <div className="grid gap-2">
              <Label>Blog post</Label>
              <Select value={blogId} onValueChange={setBlogId}>
                <SelectTrigger><SelectValue placeholder="Select a blog post" /></SelectTrigger>
                <SelectContent>
                  {blogs.map((b) => (
                    <SelectItem key={b.id} value={b.id}>{b.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {source === "custom" && (
            <div className="grid gap-2">
              <Label>Topic / instructions</Label>
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g. Announce our flash sale on winter jackets, 30% off this weekend"
                rows={3}
              />
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="grid gap-2">
              <Label>Tone</Label>
              <Select value={tone} onValueChange={setTone}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TONES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Hashtag count</Label>
              <Input
                type="number"
                min={0}
                max={15}
                value={hashtagCount}
                onChange={(e) => setHashtagCount(Number(e.target.value))}
              />
            </div>
            <div className="flex items-end gap-2">
              <Checkbox id="genimg" checked={generateImage} onCheckedChange={(v) => setGenerateImage(!!v)} />
              <Label htmlFor="genimg" className="cursor-pointer flex items-center gap-1">
                <ImageIcon className="h-4 w-4" /> Generate product-action image
              </Label>
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Target platforms</Label>
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map((p) => {
                const active = platforms.includes(p.id);
                return (
                  <Badge
                    key={p.id}
                    variant={active ? "default" : "outline"}
                    className="cursor-pointer px-3 py-1.5"
                    onClick={() => togglePlatform(p.id)}
                  >
                    {p.label}
                  </Badge>
                );
              })}
            </div>
          </div>

          <Button onClick={handleGenerate} disabled={generating} className="w-full">
            {generating ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating…</> : <><Sparkles className="h-4 w-4 mr-2" /> Generate with AI</>}
          </Button>

          {imageUrl && (
            <Card>
              <CardContent className="p-3">
                <Label className="mb-2 block">Generated image</Label>
                <img src={imageUrl} alt="AI generated social preview" className="rounded-md max-h-72 object-contain mx-auto" />
              </CardContent>
            </Card>
          )}

          {captions.length > 0 && (
            <div className="space-y-3">
              <Label>Generated captions (editable)</Label>
              {captions.map((c) => (
                <Card key={c.platform}>
                  <CardContent className="p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <Badge>{PLATFORMS.find((p) => p.id === c.platform)?.label ?? c.platform}</Badge>
                      <span className="text-xs text-muted-foreground">{c.caption.length} chars</span>
                    </div>
                    <Textarea
                      value={c.caption}
                      onChange={(e) => editCaption(c.platform, e.target.value)}
                      rows={4}
                    />
                    {c.hashtags?.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {c.hashtags.map((h, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {h.startsWith("#") ? h : `#${h}`}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                <div className="grid gap-2">
                  <Label>Schedule for (optional)</Label>
                  <Input
                    type="datetime-local"
                    value={scheduledFor}
                    onChange={(e) => setScheduledFor(e.target.value)}
                  />
                </div>
                <div className="flex items-end gap-2">
                  <Button variant="outline" onClick={() => handleSave("draft")} disabled={saving} className="flex-1">
                    <Save className="h-4 w-4 mr-2" /> Save Draft
                  </Button>
                  <Button onClick={() => handleSave("scheduled")} disabled={saving || !scheduledFor} className="flex-1">
                    <Calendar className="h-4 w-4 mr-2" /> Schedule
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PostComposerDialog;
