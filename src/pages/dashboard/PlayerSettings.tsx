import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import { useApiMutation, useApiQuery } from "@/hooks/use-api";
import { telegramSubscribeLink } from "@/lib/plans";
import { uploadFormFile } from "@/lib/video";
import { useI18n } from "@/lib/i18n";
import type { PublicConfig, PlayerPrefsUser, User, WatermarkConfig } from "@/lib/types";
import { Crown, Gauge, ImageIcon, Loader2, MonitorPlay, Stamp, Upload, Volume2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

interface PrefsForm {
  autoplay: boolean;
  defaultVolume: number;
  defaultSpeed: number;
  showWatermark: boolean;
}

interface WatermarkForm {
  enabled: boolean;
  text: string;
  logoUrl: string;
  position: string;
  size: number;
  opacity: number;
  margin: number;
}

const PAID_PLANS = ["premium", "platinum"];

export default function PlayerSettings() {
  const { t } = useI18n();
  const siteConfig = useApiQuery<PublicConfig>("settings/getPublicConfig");
  const siteName = siteConfig?.site.name || "Vidood Stream";
  const existing = useApiQuery<PlayerPrefsUser>("playerPrefs/getMyPlayerSettings");
  const update = useApiMutation("playerPrefs/updatePlayerSettings");
  const [form, setForm] = useState<PrefsForm | null>(null);
  const [saving, setSaving] = useState(false);

  // --- Owner brand watermark (paid plans) -----------------------------------
  const me = useApiQuery<User | null>("users/currentUser");
  const isPaid = me !== undefined && me !== null && PAID_PLANS.includes(me.plan);
  const wm = useApiQuery<WatermarkConfig | null>("watermark/getMyWatermark");
  const updateWatermark = useApiMutation<WatermarkForm>("watermark/updateWatermark");
  const [wmForm, setWmForm] = useState<WatermarkForm | null>(null);
  const [savingWm, setSavingWm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const logoInputRef = useRef<HTMLInputElement | null>(null);

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

  useEffect(() => {
    if (wm !== undefined && wmForm === null) {
      setWmForm({
        enabled: wm?.enabled ?? true,
        text: wm?.text ?? "",
        logoUrl: wm?.logoUrl ?? "",
        position: wm?.position ?? "top-right",
        size: wm?.size ?? 14,
        opacity: wm?.opacity ?? 0.65,
        margin: wm?.margin ?? 12,
      });
    }
  }, [wm, wmForm]);

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

  const setWm = <K extends keyof WatermarkForm>(key: K, value: WatermarkForm[K]) =>
    setWmForm((f) => (f ? { ...f, [key]: value } : f));

  const saveWatermark = async () => {
    if (!wmForm) return;
    setSavingWm(true);
    try {
      await updateWatermark(wmForm);
      toast.success(t("watermark.saved"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save watermark");
    } finally {
      setSavingWm(false);
    }
  };

  const handleLogoUpload = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    try {
      const { url } = await uploadFormFile("/api/upload", file, file.name);
      setWm("logoUrl", url);
      toast.success(t("watermark.upload"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setUploading(false);
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

      {/* Brand watermark — Premium / Platinum only */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            {isPaid ? (
              <Crown className="size-4 text-amber-500" />
            ) : (
              <Stamp className="size-4 text-muted-foreground" />
            )}
            {t("watermark.title")}
          </CardTitle>
          <CardDescription>{t("watermark.desc")}</CardDescription>
        </CardHeader>
        <CardContent>
          {isPaid ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold">{t("watermark.enable")}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{t("watermark.enableDesc")}</p>
                </div>
                <Switch
                  checked={wmForm?.enabled ?? false}
                  onCheckedChange={(v) => setWm("enabled", v)}
                />
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="wm-text">{t("watermark.text")}</Label>
                  <Input
                    id="wm-text"
                    placeholder={t("watermark.textPlaceholder")}
                    value={wmForm?.text ?? ""}
                    onChange={(e) => setWm("text", e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    {wmForm?.text || (me?.name ? `Default: ${me.name}` : "")}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>{t("watermark.logo")}</Label>
                  <div className="flex items-center gap-3">
                    <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted">
                      {wmForm?.logoUrl ? (
                        <img src={wmForm.logoUrl} alt="" className="size-full object-contain" />
                      ) : (
                        <ImageIcon className="size-5 text-muted-foreground" />
                      )}
                    </div>
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/svg+xml"
                      className="hidden"
                      onChange={(e) => void handleLogoUpload(e.target.files?.[0])}
                    />
                    <div className="flex flex-col gap-1.5">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={uploading}
                        onClick={() => logoInputRef.current?.click()}
                      >
                        {uploading ? (
                          <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                        ) : (
                          <Upload className="mr-1.5 size-3.5" />
                        )}
                        {t("watermark.upload")}
                      </Button>
                      {wmForm?.logoUrl && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-muted-foreground"
                          onClick={() => setWm("logoUrl", "")}
                        >
                          {t("watermark.remove")}
                        </Button>
                      )}
                    </div>
                  </div>
                  <Input
                    type="url"
                    placeholder="https://…/logo.png"
                    value={wmForm?.logoUrl ?? ""}
                    onChange={(e) => setWm("logoUrl", e.target.value)}
                    className="mt-1.5"
                  />
                  <p className="text-xs text-muted-foreground">{t("watermark.logoDesc")}</p>
                </div>

                <div className="space-y-2">
                  <Label>{t("watermark.position")}</Label>
                  <Select
                    value={wmForm?.position ?? "top-right"}
                    onValueChange={(v) => setWm("position", v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="top-right">Top right</SelectItem>
                      <SelectItem value="top-left">Top left</SelectItem>
                      <SelectItem value="bottom-right">Bottom right</SelectItem>
                      <SelectItem value="bottom-left">Bottom left</SelectItem>
                      <SelectItem value="center">Center</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>{t("watermark.size")}</Label>
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {wmForm?.size ?? 14}px
                    </span>
                  </div>
                  <Slider
                    min={8}
                    max={96}
                    step={1}
                    value={[wmForm?.size ?? 14]}
                    onValueChange={([v]) => setWm("size", v ?? 14)}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>{t("watermark.opacity")}</Label>
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {Math.round((wmForm?.opacity ?? 0.65) * 100)}%
                    </span>
                  </div>
                  <Slider
                    min={0.05}
                    max={1}
                    step={0.05}
                    value={[wmForm?.opacity ?? 0.65]}
                    onValueChange={([v]) => setWm("opacity", v ?? 0.65)}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>{t("watermark.margin")}</Label>
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {wmForm?.margin ?? 12}px
                    </span>
                  </div>
                  <Slider
                    min={0}
                    max={64}
                    step={1}
                    value={[wmForm?.margin ?? 12]}
                    onValueChange={([v]) => setWm("margin", v ?? 12)}
                  />
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <Button onClick={saveWatermark} disabled={savingWm}>
                  {savingWm && <Loader2 className="mr-2 size-4 animate-spin" />}
                  {t("watermark.save")}
                </Button>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed px-4 py-6 text-center">
              <Crown className="mx-auto size-7 text-muted-foreground/60" />
              <p className="mt-2 text-sm font-semibold">{t("watermark.locked")}</p>
              <p className="mx-auto mt-1 max-w-sm text-xs text-muted-foreground">
                {t("watermark.lockedDesc")}
              </p>
              <Button className="mt-4" asChild>
                <a
                  href={telegramSubscribeLink("premium", undefined, siteName)}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Crown className="mr-1.5 size-4" />
                  {t("watermark.upgrade")}
                </a>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
