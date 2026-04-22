import { useEffect, useState } from "react";
import { Bot, MessageSquare, RefreshCw, Save } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const platforms = [
  { id: "facebook_page", label: "Facebook Pages" },
  { id: "facebook_group", label: "Facebook Groups" },
  { id: "instagram", label: "Instagram" },
];

export default function SocialAutoReplySettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [settingsId, setSettingsId] = useState<string | null>(null);
  const [isEnabled, setIsEnabled] = useState(false);
  const [tone, setTone] = useState("friendly");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [enabledPlatforms, setEnabledPlatforms] = useState<string[]>(["facebook_page", "instagram"]);
  const [replyOnlyToQuestions, setReplyOnlyToQuestions] = useState(false);
  const [maxRepliesPerPost, setMaxRepliesPerPost] = useState(50);

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("social_auto_reply_settings")
        .select("*")
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      if (data) {
        setSettingsId(data.id);
        setIsEnabled(data.is_enabled ?? false);
        setTone(data.tone ?? "friendly");
        setSystemPrompt(data.system_prompt ?? "");
        setEnabledPlatforms(data.enabled_platforms ?? ["facebook_page", "instagram"]);
        setReplyOnlyToQuestions(data.reply_only_to_questions ?? false);
        setMaxRepliesPerPost(data.max_replies_per_post ?? 50);
      }
    } catch (error: any) {
      toast({ title: "Failed to load auto-reply settings", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const togglePlatform = (platformId: string) => {
    setEnabledPlatforms((current) => current.includes(platformId) ? current.filter((item) => item !== platformId) : [...current, platformId]);
  };

  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        id: settingsId ?? undefined,
        is_enabled: isEnabled,
        tone,
        system_prompt: systemPrompt,
        enabled_platforms: enabledPlatforms,
        reply_only_to_questions: replyOnlyToQuestions,
        max_replies_per_post: Math.max(1, maxRepliesPerPost || 1),
      };
      const { error } = await supabase.from("social_auto_reply_settings").upsert(payload);
      if (error) throw error;
      toast({ title: "Auto-reply settings saved" });
      await load();
    } catch (error: any) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const runNow = async () => {
    setRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke("social-auto-reply", { body: {} });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast({ title: "Auto-reply run finished", description: `${(data as any)?.replied ?? 0} comments replied` });
    } catch (error: any) {
      toast({ title: "Run failed", description: error.message, variant: "destructive" });
    } finally {
      setRunning(false);
    }
  };

  if (loading) return <Skeleton className="h-80 w-full" />;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bot className="h-5 w-5" /> AI Auto-Reply
        </CardTitle>
        <CardDescription>
          Polls fresh comments from connected accounts and replies in your chosen tone.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex items-center justify-between rounded-md border p-4">
          <div>
            <div className="font-medium">Enable auto-replies</div>
            <p className="text-sm text-muted-foreground">The bot runs every 5 minutes and only uses connected platform tokens.</p>
          </div>
          <Switch checked={isEnabled} onCheckedChange={setIsEnabled} />
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label>Tone</Label>
            <Input value={tone} onChange={(e) => setTone(e.target.value)} placeholder="friendly" />
          </div>
          <div className="grid gap-2">
            <Label>Max replies per post</Label>
            <Input type="number" min={1} max={200} value={maxRepliesPerPost} onChange={(e) => setMaxRepliesPerPost(Number(e.target.value))} />
          </div>
        </div>

        <div className="grid gap-2">
          <Label>System prompt</Label>
          <Textarea rows={5} value={systemPrompt} onChange={(e) => setSystemPrompt(e.target.value)} />
        </div>

        <div className="space-y-3">
          <Label>Reply platforms</Label>
          <div className="flex flex-wrap gap-3">
            {platforms.map((platform) => (
              <label key={platform.id} className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm cursor-pointer">
                <Checkbox checked={enabledPlatforms.includes(platform.id)} onCheckedChange={() => togglePlatform(platform.id)} />
                <span>{platform.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Checkbox id="questions-only" checked={replyOnlyToQuestions} onCheckedChange={(checked) => setReplyOnlyToQuestions(!!checked)} />
          <Label htmlFor="questions-only" className="cursor-pointer">Only reply to questions</Label>
        </div>

        <div className="flex justify-end gap-2 flex-wrap">
          <Button variant="outline" onClick={runNow} disabled={running}>
            <RefreshCw className={`h-4 w-4 mr-2 ${running ? "animate-spin" : ""}`} /> Run now
          </Button>
          <Button onClick={save} disabled={saving}>
            <Save className="h-4 w-4 mr-2" /> Save settings
          </Button>
        </div>

        <div className="rounded-md border bg-muted/40 p-3 text-sm text-muted-foreground flex items-start gap-2">
          <MessageSquare className="h-4 w-4 mt-0.5" />
          Replies stay short, and the prompt should avoid promises about pricing, stock, or delivery times.
        </div>
      </CardContent>
    </Card>
  );
}
