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
import { api } from "@/convex/_generated/api";
import { useI18n } from "@/lib/i18n";
import { useMutation, useQuery } from "convex/react";
import { Gauge, Loader2, MonitorPlay, Stamp, Volume2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface PrefsForm {
  autoplay: boolean;
  defaultVolume: number;
  defaultSpeed: number;
  showWatermark: boolean;
}

export default function PlayerSettings() {
  const { t } = useI18n();
  const siteConfig = useQuery(api.settings.getPublicConfig);
  const siteName = siteConfig?.site.name || "CawStream";
  const existing = useQuery(api.playerPrefs.getMyPlayerSettings);
  const update = useMutation(api.playerPrefs.updatePlayerSettings);
  const [form, setForm] = useState<PrefsForm | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (existing && form === null) {
      setForm({
        autoplay: existing.autoplay,
        defaultVolume: existing.defaultVolume,
        defaultSpeed: existing.defaultSpeed,
        showWatermark: existing.showWatermark,
      });
    }
  }, [existing, form]);

  if (!form) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const save = async () => {
    setSaving(true);
    try {
      await update({
        autoplay: form.autoplay,
        defaultVolume: form.defaultVolume,
        defaultSpeed: form.defaultSpeed,
        showWatermark: form.showWatermark,
      });
      toast.success(t("playerPrefs.saved"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save preferences");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("playerPrefs.title")}</CardTitle>
          <CardDescription>{t("playerPrefs.desc", { site: siteName })}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                <MonitorPlay className="size-4" />
              </div>
              <div>
                <p className="text-sm font-semibold">{t("playerPrefs.autoplay")}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{t("playerPrefs.autoplayDesc")}</p>
              </div>
            </div>
            <Switch
              checked={form.autoplay}
              onCheckedChange={(v) => setForm((f) => (f ? { ...f, autoplay: v } : f))}
            />
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="flex gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                <Volume2 className="size-4" />
              </div>
              <div>
                <p className="text-sm font-semibold">{t("playerPrefs.volume")}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {Math.round(form.defaultVolume * 100)}%
                </p>
              </div>
            </div>
            <Slider
              className="w-40"
              min={0}
              max={1}
              step={0.05}
              value={[form.defaultVolume]}
              onValueChange={([v]) =>
                setForm((f) => (f ? { ...f, defaultVolume: v ?? 1 } : f))
              }
            />
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="flex gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                <Gauge className="size-4" />
              </div>
              <div>
                <p className="text-sm font-semibold">{t("playerPrefs.speed")}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{t("playerPrefs.speedDesc")}</p>
              </div>
            </div>
            <Select
              value={String(form.defaultSpeed)}
              onValueChange={(v) =>
                setForm((f) => (f ? { ...f, defaultSpeed: Number(v) } : f))
              }
            >
              <SelectTrigger className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[0.5, 0.75, 1, 1.25, 1.5, 2].map((speed) => (
                  <SelectItem key={speed} value={String(speed)}>
                    {speed}×
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="flex gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                <Stamp className="size-4" />
              </div>
              <div>
                <p className="text-sm font-semibold">{t("playerPrefs.watermark")}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{t("playerPrefs.watermarkDesc")}</p>
              </div>
            </div>
            <Switch
              checked={form.showWatermark}
              onCheckedChange={(v) => setForm((f) => (f ? { ...f, showWatermark: v } : f))}
            />
          </div>

          <div className="flex justify-end pt-1">
            <Button onClick={save} disabled={saving}>
              {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
              {t("playerPrefs.save")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
