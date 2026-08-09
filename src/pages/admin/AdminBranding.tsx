import { PageHeader } from "@/components/layout/Shell";
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
import { api } from "@/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { Loader2, Stamp } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface BrandingForm {
  brandName: string;
  brandTagline: string;
  watermarkEnabled: boolean;
  watermarkText: string;
  watermarkLogoUrl: string;
  watermarkPosition: string;
  watermarkSize: number;
  watermarkOpacity: number;
  watermarkMargin: number;
}

export default function AdminBranding() {
  const settings = useQuery(api.settings.getAdminSettings);
  const updateSettings = useMutation(api.settings.updateSettings);
  const [form, setForm] = useState<BrandingForm | null>(null);
  const [siteUrl, setSiteUrl] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings && form === null) {
      setSiteUrl(settings.site.siteUrl);
      setForm({
        brandName: settings.branding.brandName,
        brandTagline: settings.branding.brandTagline,
        watermarkEnabled: settings.branding.watermarkEnabled,
        watermarkText: settings.branding.watermarkText,
        watermarkLogoUrl: settings.branding.watermarkLogoUrl,
        watermarkPosition: settings.branding.watermarkPosition,
        watermarkSize: settings.branding.watermarkSize,
        watermarkOpacity: settings.branding.watermarkOpacity,
        watermarkMargin: settings.branding.watermarkMargin,
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

  const set = <K extends keyof BrandingForm>(key: K, value: BrandingForm[K]) =>
    setForm((f) => (f ? { ...f, [key]: value } : f));

  const save = async () => {
    setSaving(true);
    try {
      await updateSettings({ section: "branding", value: form });
      if (settings) {
        // Site-level fields (used by social preview “Watch now” links).
        await updateSettings({
          section: "site",
          value: {
            name: settings.site.name,
            supportEmail: settings.site.supportEmail,
            siteUrl,
          },
        });
      }
      toast.success("Branding saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save branding");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <PageHeader
        title="Branding"
        description="Site identity and the watermark shown on every player."
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Site identity</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="brandName">Site name</Label>
            <Input
              id="brandName"
              value={form.brandName}
              onChange={(e) => set("brandName", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="brandTagline">Tagline</Label>
            <Input
              id="brandTagline"
              value={form.brandTagline}
              onChange={(e) => set("brandTagline", e.target.value)}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="siteUrl">Site URL (optional)</Label>
            <Input
              id="siteUrl"
              type="url"
              placeholder="https://videos.example.com"
              value={siteUrl}
              onChange={(e) => setSiteUrl(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Base URL used by social preview “Watch now” links (e.g.{" "}
              https://demoy.freebuff.app).
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Stamp className="size-4 text-muted-foreground" />
            Watermark
          </CardTitle>
          <CardDescription>
            Shown on every video player when branding is enabled.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold">Enable watermark</p>
              <p className="text-xs text-muted-foreground">
                Requires “Branding” to be on in Player settings.
              </p>
            </div>
            <Switch
              checked={form.watermarkEnabled}
              onCheckedChange={(v) => set("watermarkEnabled", v)}
            />
          </div>

          <div className={cn("space-y-4 transition-opacity", !form.watermarkEnabled && "opacity-40")}>
            <div className="space-y-2">
              <Label htmlFor="watermarkText">Watermark text</Label>
              <Input
                id="watermarkText"
                value={form.watermarkText}
                onChange={(e) => set("watermarkText", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="watermarkLogoUrl">Watermark logo URL (optional)</Label>
              <Input
                id="watermarkLogoUrl"
                type="url"
                placeholder="https://…/logo.png"
                value={form.watermarkLogoUrl}
                onChange={(e) => set("watermarkLogoUrl", e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Overrides the text. Host the image on a public HTTPS URL.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Position</Label>
              <Select
                value={form.watermarkPosition}
                onValueChange={(v) => set("watermarkPosition", v)}
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
                <Label>Size</Label>
                <span className="text-xs tabular-nums text-muted-foreground">
                  {form.watermarkSize}px
                </span>
              </div>
              <Slider
                min={8}
                max={96}
                step={1}
                value={[form.watermarkSize]}
                onValueChange={([v]) => set("watermarkSize", v ?? 14)}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Opacity</Label>
                <span className="text-xs tabular-nums text-muted-foreground">
                  {Math.round(form.watermarkOpacity * 100)}%
                </span>
              </div>
              <Slider
                min={0.05}
                max={1}
                step={0.05}
                value={[form.watermarkOpacity]}
                onValueChange={([v]) => set("watermarkOpacity", v ?? 0.65)}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Margin</Label>
                <span className="text-xs tabular-nums text-muted-foreground">
                  {form.watermarkMargin}px
                </span>
              </div>
              <Slider
                min={0}
                max={64}
                step={1}
                value={[form.watermarkMargin]}
                onValueChange={([v]) => set("watermarkMargin", v ?? 12)}
              />
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <Button onClick={save} disabled={saving}>
              {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
              Save branding
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
