import { PageHeader } from "@/components/layout/Shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { PLAYER_ACCENTS } from "@/components/VideoPlayer";
import { api } from "@/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { Loader2, MonitorPlay } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface PlayerForm {
  aspectRatio: string;
  defaultQuality: string;
  autoplay: boolean;
  controls: boolean;
  pictureInPicture: boolean;
  defaultVolume: number;
  showBranding: boolean;
  accentColor: string;
}

export default function AdminPlayer() {
  const settings = useQuery(api.settings.getAdminSettings);
  const updateSettings = useMutation(api.settings.updateSettings);
  const [form, setForm] = useState<PlayerForm | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings && form === null) {
      setForm({
        aspectRatio: settings.player.aspectRatio,
        defaultQuality: settings.player.defaultQuality,
        autoplay: settings.player.autoplay,
        controls: settings.player.controls,
        pictureInPicture: settings.player.pictureInPicture,
        defaultVolume: settings.player.defaultVolume,
        showBranding: settings.player.showBranding,
        accentColor: settings.player.accentColor,
      });
    }
  }, [settings, form]);

  if (!form) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const set = <K extends keyof PlayerForm>(key: K, value: PlayerForm[K]) =>
    setForm((f) => (f ? { ...f, [key]: value } : f));

  const save = async () => {
    setSaving(true);
    try {
      await updateSettings({ section: "player", value: form });
      toast.success("Player settings saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <PageHeader
        title="Player"
        description="Defaults for every player on the platform — the public player, embeds and watch pages."
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MonitorPlay className="size-4 text-muted-foreground" />
            Player behavior
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Aspect ratio</Label>
              <Select value={form.aspectRatio} onValueChange={(v) => set("aspectRatio", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="16:9">16:9</SelectItem>
                  <SelectItem value="4:3">4:3</SelectItem>
                  <SelectItem value="1:1">1:1</SelectItem>
                  <SelectItem value="21:9">21:9</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Default quality</Label>
              <Select value={form.defaultQuality} onValueChange={(v) => set("defaultQuality", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto (adaptive)</SelectItem>
                  <SelectItem value="source">Source (highest)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Play button color</Label>
            <Select value={form.accentColor} onValueChange={(v) => set("accentColor", v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(PLAYER_ACCENTS).map(([key, accent]) => (
                  <SelectItem key={key} value={key}>
                    <span className="flex items-center gap-2">
                      <span
                        className="size-3 rounded-full border border-black/20"
                        style={{ background: accent.color }}
                      />
                      {accent.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              The accent used by the custom player — play button, seek bar and
              control icons.
            </p>
          </div>

          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold">Player controls</p>
              <p className="text-xs text-muted-foreground">
                Show the custom play, seek and volume bar on the player (the
                accent-colored play button always appears).
              </p>
            </div>
            <Switch checked={form.controls} onCheckedChange={(v) => set("controls", v)} />
          </div>

          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold">Autoplay</p>
              <p className="text-xs text-muted-foreground">
                Begin playback automatically when the page loads.
              </p>
            </div>
            <Switch checked={form.autoplay} onCheckedChange={(v) => set("autoplay", v)} />
          </div>

          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold">Picture-in-picture</p>
              <p className="text-xs text-muted-foreground">
                Allow viewers to float the video in a small window.
              </p>
            </div>
            <Switch
              checked={form.pictureInPicture}
              onCheckedChange={(v) => set("pictureInPicture", v)}
            />
          </div>

          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold">Branding</p>
              <p className="text-xs text-muted-foreground">
                Display the watermark configured in Branding settings.
              </p>
            </div>
            <Switch checked={form.showBranding} onCheckedChange={(v) => set("showBranding", v)} />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Default volume</Label>
              <span className="text-xs tabular-nums text-muted-foreground">
                {Math.round(form.defaultVolume * 100)}%
              </span>
            </div>
            <Slider
              min={0}
              max={1}
              step={0.05}
              value={[form.defaultVolume]}
              onValueChange={([v]) => set("defaultVolume", v ?? 0.8)}
            />
          </div>

          <div className="flex justify-end pt-1">
            <Button onClick={save} disabled={saving}>
              {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
              Save player settings
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
