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
import { Textarea } from "@/components/ui/textarea";
import { useApiMutation, useApiQuery } from "@/hooks/use-api";
import type { AdminSettings } from "@/lib/types";
import { Globe, ImageIcon, Loader2, Stamp, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { uploadFormFile } from "@/lib/video";
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

interface SiteForm {
  name: string;
  metaTitle: string;
  metaDescription: string;
  metaKeywords: string;
  logoUrl: string;
  iconUrl: string;
}

export default function AdminBranding() {
  const settings = useApiQuery<AdminSettings>("settings/getAdminSettings");
  const updateSettings = useApiMutation("settings/updateSettings");

  const [form, setForm] = useState<BrandingForm | null>(null);
  const [siteForm, setSiteForm] = useState<SiteForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [savingSite, setSavingSite] = useState(false);
  const [uploading, setUploading] = useState<"logo" | "icon" | null>(null);
  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const iconInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (settings && form === null) {
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
      setSiteForm({
        name: settings.site.name,
        metaTitle: settings.site.metaTitle,
        metaDescription: settings.site.metaDescription,
        metaKeywords: settings.site.metaKeywords,
        logoUrl: settings.site.logoUrl,
        iconUrl: settings.site.iconUrl,
      });
    }
  }, [settings, form]);

  if (!form || !siteForm) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const set = <K extends keyof BrandingForm>(key: K, value: BrandingForm[K]) =>
    setForm((f) => (f ? { ...f, [key]: value } : f));

  const setSite = <K extends keyof SiteForm>(key: K, value: SiteForm[K]) =>
    setSiteForm((f) => (f ? { ...f, [key]: value } : f));

  const save = async () => {
    setSaving(true);
    try {
      await updateSettings({ section: "branding", value: form });
      toast.success("Branding saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save branding");
    } finally {
      setSaving(false);
    }
  };

  const saveSite = async () => {
    setSavingSite(true);
    try {
      await updateSettings({ section: "site", value: siteForm });
      toast.success("Website & SEO saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save website settings");
    } finally {
      setSavingSite(false);
    }
  };

  /** Upload a file (logo or favicon) to the self-hosted server and store its URL. */
  const handleImageUpload = async (kind: "logo" | "icon", file: File | undefined) => {
    if (!file) return;
    setUploading(kind);
    try {
      const { url } = await uploadFormFile("/api/upload", file, file.name);
      setSite(kind === "logo" ? "logoUrl" : "iconUrl", url);
      toast.success(kind === "logo" ? "Logo uploaded" : "Favicon uploaded");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setUploading(null);
    }
  };

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <PageHeader
        title="Branding"
        description="Site identity, SEO defaults and the watermark shown on every player."
      />

      {/* Website & SEO */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Globe className="size-4 text-muted-foreground" />
            Website & SEO
          </CardTitle>
          <CardDescription>
            The site title, logo and favicon shown across the app, plus the
            meta tags search engines and link previews read.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="site-name">Website title</Label>
            <Input
              id="site-name"
              value={siteForm.name}
              onChange={(e) => setSite("name", e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Shown in the header and as the site name in link previews.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="site-meta-title">Meta title (browser tab / search result)</Label>
            <Input
              id="site-meta-title"
              value={siteForm.metaTitle}
              onChange={(e) => setSite("metaTitle", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="site-description">Meta description</Label>
            <Textarea
              id="site-description"
              rows={3}
              value={siteForm.metaDescription}
              onChange={(e) => setSite("metaDescription", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="site-keywords">Meta keywords</Label>
            <Input
              id="site-keywords"
              placeholder="video hosting, video streaming, video embed"
              value={siteForm.metaKeywords}
              onChange={(e) => setSite("metaKeywords", e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Comma separated.</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Logo */}
            <div className="space-y-2">
              <Label>Site logo</Label>
              <div className="flex items-center gap-3">
                <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted">
                  {siteForm.logoUrl ? (
                    <img src={siteForm.logoUrl} alt="" className="size-full object-contain" />
                  ) : (
                    <ImageIcon className="size-5 text-muted-foreground" />
                  )}
                </div>
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  className="hidden"
                  onChange={(e) => void handleImageUpload("logo", e.target.files?.[0])}
                />
                <div className="flex flex-col gap-1.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={uploading !== null}
                    onClick={() => logoInputRef.current?.click()}
                  >
                    {uploading === "logo" ? (
                      <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                    ) : (
                      <Upload className="mr-1.5 size-3.5" />
                    )}
                    Upload logo
                  </Button>
                  {siteForm.logoUrl && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground"
                      onClick={() => setSite("logoUrl", "")}
                    >
                      Remove
                    </Button>
                  )}
                </div>
              </div>
              <Input
                type="url"
                placeholder="…or paste an image URL"
                value={siteForm.logoUrl}
                onChange={(e) => setSite("logoUrl", e.target.value)}
                className="mt-1.5"
              />
            </div>

            {/* Favicon */}
            <div className="space-y-2">
              <Label>Site icon (favicon)</Label>
              <div className="flex items-center gap-3">
                <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted">
                  {siteForm.iconUrl ? (
                    <img src={siteForm.iconUrl} alt="" className="size-full object-contain" />
                  ) : (
                    <ImageIcon className="size-5 text-muted-foreground" />
                  )}
                </div>
                <input
                  ref={iconInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml,image/x-icon"
                  className="hidden"
                  onChange={(e) => void handleImageUpload("icon", e.target.files?.[0])}
                />
                <div className="flex flex-col gap-1.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={uploading !== null}
                    onClick={() => iconInputRef.current?.click()}
                  >
                    {uploading === "icon" ? (
                      <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                    ) : (
                      <Upload className="mr-1.5 size-3.5" />
                    )}
                    Upload icon
                  </Button>
                  {siteForm.iconUrl && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground"
                      onClick={() => setSite("iconUrl", "")}
                    >
                      Remove
                    </Button>
                  )}
                </div>
              </div>
              <Input
                type="url"
                placeholder="…or paste an image URL"
                value={siteForm.iconUrl}
                onChange={(e) => setSite("iconUrl", e.target.value)}
                className="mt-1.5"
              />
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <Button onClick={saveSite} disabled={savingSite}>
              {savingSite && <Loader2 className="mr-2 size-4 animate-spin" />}
              Save website & SEO
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Site identity</CardTitle>
          <CardDescription>
            Used on the landing page hero and marketing copy.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="brandName">Brand name</Label>
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
