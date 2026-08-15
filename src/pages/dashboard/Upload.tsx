import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { UpgradeDialog } from "@/components/UpgradeDialog";
import { useApiMutation, useApiQuery } from "@/hooks/use-api";
import { videoUrls } from "@/lib/embed";
import { formatBytes } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import {
  completeVideoUpload,
  detectVideoType,
  extractMetadata,
  generateSocialThumbnail,
  generateThumbnail,
  uploadVideoFile,
  validateVideoFile,
  type UploadProgress,
} from "@/lib/video";
import type { PublicConfig, Usage } from "@/lib/types";
import {
  CheckCircle2,
  CloudUpload,
  Crown,
  FileVideo,
  Loader2,
  UploadCloud,
  XCircle,
} from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Phase = "idle" | "preparing" | "uploading" | "processing" | "done" | "error";

interface RunState {
  phase: Phase;
  progress: number;
  fileName: string;
  sizeBytes: number;
  detail: string;
  publicId?: string;
  error?: string;
}

interface PrepareResult {
  videoId: string;
  publicId: string;
  backend: "browser";
  uploadUrl: string;
  muxUploadId: null;
}

export default function Upload() {
  const config = useApiQuery<PublicConfig>("settings/getPublicConfig");
  const usage = useApiQuery<Usage>("videos/getUsage");
  const { t } = useI18n();

  const prepareUpload = useApiMutation<Record<string, unknown>, PrepareResult>("videos/prepareUpload");
  const cancelUpload = useApiMutation("videos/cancelUpload");
  const markFailed = useApiMutation("videos/markFailed");

  const [title, setTitle] = useState("");
  const [run, setRun] = useState<RunState | null>(null);
  const [dragging, setDragging] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const videoIdRef = useRef<string | null>(null);

  const maxBytes = config?.limits.maxUploadBytes ?? 1024 * 1024 * 1024;
  const plan = usage?.plan ?? "free";
  const limitBytes = usage?.limitBytes ?? null;
  const usedBytes = usage?.usedBytes ?? 0;

  const start = useCallback(
    async (file: File) => {
      if (!file || run) return;

      if (!title.trim()) {
        toast.error(t("upload.titleRequired"));
        return;
      }

      const checked = validateVideoFile(file);
      if (!checked.ok) {
        toast.error(checked.error ?? "Invalid file.");
        return;
      }
      if (file.size > maxBytes) {
        toast.error(`File exceeds the ${Math.round(maxBytes / 1024 / 1024)} MB limit.`);
        return;
      }
      // Free plan: the 500 MB storage cap is also enforced server-side, but we
      // pre-check here so the user sees the upgrade dialog instead of an error.
      if (plan === "free" && limitBytes !== null && file.size + usedBytes > limitBytes) {
        setUpgradeOpen(true);
        toast.error(t("upload.limitError"));
        return;
      }
      const detected = await detectVideoType(file);
      if (!detected) {
        toast.error("Could not verify the file — use an MP4, MOV, MKV or WEBM video.");
        return;
      }

      const active = new AbortController();
      abortRef.current = active;
      setRun({
        phase: "preparing",
        progress: 0,
        fileName: file.name,
        sizeBytes: file.size,
        detail: "Contacting the upload service…",
      });

      try {
        const prepared = await prepareUpload({
          fileName: file.name,
          mimeType: detected,
          sizeBytes: file.size,
          title,
        });
        videoIdRef.current = prepared.videoId;

        // Upload the file to the self-hosted server (real progress + abort).
        setRun((r) =>
          r ? { ...r, phase: "uploading", detail: "Uploading…" } : r,
        );
        const uploadPromise = uploadVideoFile(prepared.uploadUrl, file, (p: UploadProgress) => {
          setRun((r) => (r ? { ...r, progress: p.percent } : r));
        }, active.signal);

        setRun((r) =>
          r ? { ...r, detail: "Reading metadata and capturing a thumbnail…" } : r,
        );
        const [meta, thumb, socialThumb] = await Promise.all([
          extractMetadata(file),
          generateThumbnail(file),
          generateSocialThumbnail(file).catch(() => null),
        ]);

        await uploadPromise;

        setRun((r) =>
          r
            ? {
                ...r,
                phase: "processing",
                progress: 100,
                detail: "Saving the thumbnail…",
              }
            : r,
        );

        await completeVideoUpload(prepared.videoId, {
          duration: meta.duration,
          width: meta.width,
          height: meta.height,
          codec: meta.codec,
          bitrate: meta.bitrate,
          thumbnail: thumb,
          socialThumbnail: socialThumb,
        });

        setRun((r) =>
          r ? { ...r, phase: "done", detail: "Ready", publicId: prepared.publicId } : r,
        );
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          setRun(null);
        } else {
          const message = error instanceof Error ? error.message : "Upload failed.";
          // A server-side rejection due to the free-plan cap should surface the
          // upgrade dialog instead of a bare error.
          if (/storage limit|500 MB/i.test(message)) {
            setUpgradeOpen(true);
          }
          if (videoIdRef.current) {
            try {
              await markFailed({ videoId: videoIdRef.current, error: message });
            } catch {
              // the row may already be gone
            }
          }
          setRun((r) => (r ? { ...r, phase: "error", error: message } : r));
        }
      }
    },
    [run, title, maxBytes, plan, limitBytes, usedBytes, t, prepareUpload, markFailed],
  );

  const cancel = async () => {
    abortRef.current?.abort();
    // Clean up the server-side row so no orphaned "uploading" video remains.
    if (videoIdRef.current) {
      try {
        await cancelUpload({ videoId: videoIdRef.current });
      } catch {
        // the row may already be gone
      }
    }
    videoIdRef.current = null;
    setRun(null);
  };

  const freePct = limitBytes ? Math.min(100, (usedBytes / limitBytes) * 100) : 0;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Plan usage bar */}
      <div className="flex items-center gap-3 rounded-lg border px-4 py-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand/15 text-brand">
          <Crown className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2 text-sm">
            <p className="font-medium">
              {plan === "free" ? t("dash.planFree") : PLAN_NAME[plan]}
            </p>
            {limitBytes !== null ? (
              <p className="text-xs text-muted-foreground">
                {t("dash.planUsage", { used: formatBytes(usedBytes), limit: formatBytes(limitBytes) })}
              </p>
            ) : (
              <p className="text-xs text-emerald-600 dark:text-emerald-400">∞ {t("upload.unlimited")}</p>
            )}
          </div>
          {limitBytes !== null && (
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  freePct >= 100 ? "bg-destructive" : "bg-brand",
                )}
                style={{ width: `${Math.max(2, freePct)}%` }}
              />
            </div>
          )}
        </div>
        {plan === "free" && (
          <Button variant="outline" size="sm" onClick={() => setUpgradeOpen(true)}>
            {t("dash.upgrade")}
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-brand/15 text-brand">
              <UploadCloud className="size-5" />
            </div>
            <div>
              <CardTitle>{t("upload.title")}</CardTitle>
              <CardDescription>
                <span>
                  {t("upload.descBrowser", { size: formatBytes(maxBytes) })}
                </span>
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {run === null ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="videoTitle" className="text-sm font-medium">
                  {t("upload.videoTitle")} <span className="text-destructive">*</span>
                </label>
                <Input
                  id="videoTitle"
                  placeholder={t("upload.titlePlaceholder")}
                  value={title}
                  maxLength={120}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div
                role="button"
                tabIndex={0}
                onClick={() => inputRef.current?.click()}
                onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragging(false);
                  const file = e.dataTransfer.files?.[0];
                  if (file) void start(file);
                }}
                className={cn(
                  "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-14 text-center transition-colors",
                  dragging
                    ? "border-brand bg-brand/5"
                    : "border-border hover:border-brand/60 hover:bg-muted/30",
                )}
              >
                <div className="flex size-14 items-center justify-center rounded-full bg-muted">
                  <CloudUpload className="size-7 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-semibold">{t("upload.drop")}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t("upload.dropHint", { mb: Math.round(maxBytes / 1024 / 1024) })}
                  </p>
                </div>
                <input
                  ref={inputRef}
                  type="file"
                  accept="video/mp4,video/quicktime,video/x-matroska,video/webm,.mp4,.mov,.mkv,.webm"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void start(file);
                    e.target.value = "";
                  }}
                />
              </div>
            </div>
          ) : run.phase === "done" ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <CheckCircle2 className="size-12 text-emerald-500" />
              <p className="text-sm font-semibold">{t("upload.live")}</p>
              {run.publicId && (
                <div className="flex gap-2">
                  <a href={videoUrls(run.publicId).watch} target="_blank" rel="noreferrer">
                    <Button size="sm">{t("upload.watchIt")}</Button>
                  </a>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setRun(null)}
                  >
                    {t("upload.another")}
                  </Button>
                </div>
              )}
            </div>
          ) : run.phase === "error" ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <XCircle className="size-12 text-destructive" />
              <p className="text-sm font-semibold">{t("upload.failed")}</p>
              <p className="max-w-md text-xs text-muted-foreground">{run.error}</p>
              <Button variant="outline" size="sm" onClick={() => setRun(null)}>
                {t("upload.tryAgain")}
              </Button>
            </div>
          ) : (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-3">
                <FileVideo className="size-8 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{run.fileName}</p>
                  <p className="text-xs text-muted-foreground">
                    {t("upload.browserPipeline")} ·{" "}
                    {formatBytes(run.sizeBytes)}
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={cancel}>
                  {t("upload.cancel")}
                </Button>
              </div>

              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-300",
                    run.phase === "uploading"
                      ? "bg-brand"
                      : "bg-muted-foreground/40",
                  )}
                  style={{ width: `${Math.max(4, run.progress)}%` }}
                />
              </div>

              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="size-3.5 animate-spin" />
                <span className="truncate">{run.detail}</span>
                <span className="ml-auto tabular-nums">{run.progress}%</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-3 text-xs text-muted-foreground sm:grid-cols-3">
        <div className="rounded-lg border p-3">
          <p className="font-medium text-foreground">{t("upload.step1")}</p>
          <p className="mt-1">{t("upload.step1Desc")}</p>
        </div>
        <div className="rounded-lg border p-3">
          <p className="font-medium text-foreground">{t("upload.step2")}</p>
          <p className="mt-1">{t("upload.step2Browser")}</p>
        </div>
        <div className="rounded-lg border p-3">
          <p className="font-medium text-foreground">{t("upload.step3")}</p>
          <p className="mt-1">{t("upload.step3Desc")}</p>
        </div>
      </div>

      <UpgradeDialog open={upgradeOpen} onOpenChange={setUpgradeOpen} limitReached />
    </div>
  );
}

const PLAN_NAME: Record<string, string> = {
  free: "Free",
  premium: "Premium",
  platinum: "Platinum",
};
