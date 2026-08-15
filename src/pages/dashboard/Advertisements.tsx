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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useApiMutation, useApiQuery } from "@/hooks/use-api";
import { useI18n } from "@/lib/i18n";
import type { AdSettings } from "@/lib/types";
import { ExternalLink, Loader2, Megaphone, MousePointerClick, Popcorn, Share2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface AdsForm {
  smartlinkEnabled: boolean;
  smartlinkUrl: string;
  socialBarEnabled: boolean;
  socialBarCode: string;
  popunderEnabled: boolean;
  popunderCode: string;
  frequency: "session" | "always";
}

const EMPTY: AdsForm = {
  smartlinkEnabled: false,
  smartlinkUrl: "",
  socialBarEnabled: false,
  socialBarCode: "",
  popunderEnabled: false,
  popunderCode: "",
  frequency: "session",
};

export default function Advertisements() {
  const { t } = useI18n();
  const existing = useApiQuery<AdSettings>("ads/getMyAdSettings");
  const updateAdSettings = useApiMutation("ads/updateAdSettings");
  const [form, setForm] = useState<AdsForm | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (existing && form === null) {
      setForm({
        smartlinkEnabled: existing.smartlinkEnabled,
        smartlinkUrl: existing.smartlinkUrl ?? "",
        socialBarEnabled: existing.socialBarEnabled,
        socialBarCode: existing.socialBarCode ?? "",
        popunderEnabled: existing.popunderEnabled,
        popunderCode: existing.popunderCode ?? "",
        frequency: existing.frequency ?? "session",
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

  const set = <K extends keyof AdsForm>(key: K, value: AdsForm[K]) =>
    setForm((f) => (f ? { ...f, [key]: value } : f));

  const save = async () => {
    setSaving(true);
    try {
      await updateAdSettings({
        smartlinkEnabled: form.smartlinkEnabled,
        smartlinkUrl: form.smartlinkUrl,
        socialBarEnabled: form.socialBarEnabled,
        socialBarCode: form.socialBarCode,
        popunderEnabled: form.popunderEnabled,
        popunderCode: form.popunderCode,
        frequency: form.frequency,
      });
      toast.success(t("ads.saved"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save ad settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("ads.title")}</CardTitle>
          <CardDescription>{t("ads.desc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Frequency */}
          <div className="rounded-xl border p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <Popcorn className="size-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold">{t("ads.frequency")}</p>
                  <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
                    {t("ads.frequencyDesc")}
                  </p>
                </div>
              </div>
              <Select
                value={form.frequency}
                onValueChange={(v) => set("frequency", v as AdsForm["frequency"])}
              >
                <SelectTrigger className="w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="session">{t("ads.freqSession")}</SelectItem>
                  <SelectItem value="always">{t("ads.freqAlways")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Smartlink */}
          <div className="rounded-xl border p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <MousePointerClick className="size-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold">{t("ads.smartlink")}</p>
                  <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
                    {t("ads.smartlinkDesc")}
                  </p>
                </div>
              </div>
              <Switch
                checked={form.smartlinkEnabled}
                onCheckedChange={(v) => set("smartlinkEnabled", v)}
              />
            </div>
            <div className={cn("mt-4 transition-opacity", !form.smartlinkEnabled && "opacity-40")}>
              <Label htmlFor="smartlink-url">{t("ads.destUrl")}</Label>
              <Input
                id="smartlink-url"
                type="url"
                placeholder="https://your-site.com"
                value={form.smartlinkUrl}
                disabled={!form.smartlinkEnabled}
                onChange={(e) => set("smartlinkUrl", e.target.value)}
                className="mt-1.5"
              />
            </div>
          </div>

          {/* Social bar */}
          <div className="rounded-xl border p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <Share2 className="size-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold">{t("ads.socialBar")}</p>
                  <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
                    {t("ads.socialBarDesc")}
                  </p>
                </div>
              </div>
              <Switch
                checked={form.socialBarEnabled}
                onCheckedChange={(v) => set("socialBarEnabled", v)}
              />
            </div>
            <div className={cn("mt-4 transition-opacity", !form.socialBarEnabled && "opacity-40")}>
              <Label htmlFor="social-code">{t("ads.bannerCode")}</Label>
              <Textarea
                id="social-code"
                placeholder="<a href='https://…'>Follow us</a>"
                rows={3}
                value={form.socialBarCode}
                disabled={!form.socialBarEnabled}
                onChange={(e) => set("socialBarCode", e.target.value)}
                className="mt-1.5 font-mono text-xs"
              />
            </div>
          </div>

          {/* Popunder */}
          <div className="rounded-xl border p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <Popcorn className="size-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold">{t("ads.popunder")}</p>
                  <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
                    {t("ads.popunderDesc")}
                  </p>
                </div>
              </div>
              <Switch
                checked={form.popunderEnabled}
                onCheckedChange={(v) => set("popunderEnabled", v)}
              />
            </div>
            <div className={cn("mt-4 transition-opacity", !form.popunderEnabled && "opacity-40")}>
              <Label htmlFor="popunder-code">{t("ads.adCode")}</Label>
              <Textarea
                id="popunder-code"
                rows={3}
                value={form.popunderCode}
                disabled={!form.popunderEnabled}
                onChange={(e) => set("popunderCode", e.target.value)}
                className="mt-1.5 font-mono text-xs"
                placeholder="<script src='https://…'></script>"
              />
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 pt-1">
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <ExternalLink className="size-3.5" />
              {t("ads.note")}
            </p>
            <Button onClick={save} disabled={saving}>
              {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
              <Megaphone className="mr-2 size-4" />
              {t("ads.save")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
