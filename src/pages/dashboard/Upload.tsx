import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { UpgradeDialog } from "@/components/UpgradeDialog";
import { api } from "@/convex/_generated/api";
import { videoUrls } from "@/lib/embed";
import { formatBytes } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import {
  detectVideoType,
  extractMetadata,
  generateSocialThumbnail,
  generateThumbnail,
  uploadBlob,
  validateVideoFile,
  type UploadProgress,
} from "@/lib/video";
import { useMutation, useQuery } from "convex/react";
import type { Id } from "@/convex/_generated/dataModel";
import {
  CheckCircle2,
  CloudUpload,
  Crown,
  FileVideo,
  Loader2,
  Sparkles,
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
  backend?: "browser" | "mux";
  error?: string;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** PUT a blob to a Mux direct-upload URL with real progress events. */
function putBlob(
  uploadUrl: string,
  blob: Blob,
  onProgress?: (p: UploadProgress) => void,
  signal?: AbortSignal,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", uploadUrl);
    if (signal) {
      const abort = () => xhr.abort();
      if (signal.aborted) abort();
      else signal.addEventListener("abort", abort, { once: true });
    }
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress({
          loaded: event.loaded,
          total: event.total,
          percent: Math.min(100, Math.round((event.loaded / event.total) * 100)),
        });
      }
    };
    xhr.onload = () => resolve();
    xhr.onerror = () => reject(new Error("Upload failed — network error."));
    xhr.onabort = () => reject(new DOMException("Upload aborted", "AbortError"));
    xhr.send(blob);
  });
}

export default function Upload() {
  const config = useQuery(api.settings.getPublicConfig);
  const backend = useQuery(api.processor.getBackend);
  const usage = useQuery(api.videos.getUsage);
  const { t } = useI18n();

  const prepareUpload = useMutation(api.videos.prepareUpload);
  const getUploadUrl = useMutation(api.videos.getUploadUrl);
  const finalizeUpload = useMutation(api.videos.finalizeUpload);
  const completeProcessing = useMutation(api.videos.completeProcessing);
  const checkMuxUpload = useMutation(api.processor.checkMuxUpload);
  const cancelUpload = useMutation(api.videos.cancelUpload);
  const markFailed = useMutation(api.videos.markFailed);
  const attachSocialThumb = useMutation(api.videos.attachSocialThumbnail);

  const [title, setTitle] = useState("");
  const [run, setRun] = useState<RunState | null>(null);
  const [dragging, setDragging] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const videoIdRef = useRef<Id<"videos"> | null>(null);

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

        if (prepared.backend === "mux") {
          // ---- Mux pipeline: PUT the file, then poll the transcode.
          setRun((r) =>
            r ? { ...r, phase: "uploading", backend: "mux", detail: "Uploading to Mux…" } : r,
          );
          // The play-button poster is captured locally while the upload runs.
          const socialThumbPromise = generateSocialThumbnail(file).catch(() => null);
          await putBlob(prepared.uploadUrl, file, (p) => {
            setRun((r) => (r ? { ...r, progress: p.percent } : r));
          }, active.signal);

          setRun((r) =>
            r
              ? {
                  ...r,
                  phase: "processing",
                  progress: 100,
                  detail: "Transcoding on Mux (this can take a few minutes)…",
                }
              : r,
          );
          const deadline = Date.now() + 12 * 60 * 1000;
          let ready = false;
          while (Date.now() < deadline) {
            const result = await checkMuxUpload({
              videoId: prepared.videoId,
              muxUploadId: prepared.muxUploadId as string,
            });
            if (result.status === "ready") {
              ready = true;
              break;
            }
            await sleep(4000);
            if (active.signal.aborted) throw new DOMException("Upload aborted", "AbortError");
          }
          if (!ready) {
            await markFailed({ videoId: prepared.videoId, error: "Timed out waiting for Mux." });
            throw new Error("Mux transcoding timed out. Try uploading again.");
          }
          const socialThumb = await socialThumbPromise;
          if (socialThumb) {
            try {
              const socialUrl = await getUploadUrl();
              const socialId = (await uploadBlob(socialUrl, socialThumb)) as Id<"_storage">;
              await attachSocialThumb({ videoId: prepared.videoId, storageId: socialId });
            } catch {
              // the poster is optional — the video still previews with its regular thumb
            }
          }
          setRun((r) =>
            r
              ? { ...r, phase: "done", detail: "Ready", publicId: prepared.publicId }
              : r,
          );
          return;
        }

        // ---- Browser pipeline: upload + real metadata/thumbnail extraction.
        setRun((r) =>
          r ? { ...r, phase: "uploading", backend: "browser", detail: "Uploading…" } : r,
        );
        const uploadPromise = uploadBlob(prepared.uploadUrl, file, (p) => {
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

        const storageId = (await uploadPromise) as Id<"_storage">;
        await finalizeUpload({ videoId: prepared.videoId, storageId });

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
        let thumbnailStorageId: Id<"_storage"> | undefined;
        try {
          const thumbUrl = await getUploadUrl();
          thumbnailStorageId = (await uploadBlob(thumbUrl, thumb)) as Id<"_storage">;
        } catch {
          // thumbnail is optional
        }
        let socialThumbnailStorageId: Id<"_storage"> | undefined;
        if (socialThumb) {
          try {
            const socialUrl = await getUploadUrl();
            socialThumbnailStorageId = (await uploadBlob(socialUrl, socialThumb)) as Id<"_storage">;
          } catch {
            // the play-button poster is optional
          }
        }

        await completeProcessing({
          videoId: prepared.videoId,
          thumbnailStorageId,
          socialThumbnailStorageId,
          duration: meta.duration,
          width: meta.width,
          height: meta.height,
          codec: meta.codec,
          bitrate: meta.bitrate,
          fps: undefined,
        });

        setRun((r) =>
          r
            ? { ...r, phase: "done", detail: "Ready", publicId: prepared.publicId }
            : r,
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
          setRun((r) => (r ? { ...r, phase: "error", error: message } : r));
        }
      }
    },
    [
      run,
      title,
      maxBytes,
      plan,
      limitBytes,
      usedBytes,
      t,
      prepareUpload,
      putBlob,
      checkMuxUpload,
      markFailed,
      uploadBlob,
      extractMetadata,
      generateThumbnail,
      generateSocialThumbnail,
      finalizeUpload,
      getUploadUrl,
      completeProcessing,
      attachSocialThumb,
    ],
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
                {backend === "mux" ? (
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="size-3.5" /> {t("upload.descMux")}
                  </span>
                ) : (
                  <span>
                    {t("upload.descBrowser", { size: formatBytes(maxBytes) })}
                  </span>
                )}
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
                    {run.backend === "mux" ? t("upload.muxPipeline") : t("upload.browserPipeline")} ·{" "}
                    {formatBytes(run.sizeBytes)}
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={cancel} disabled={run.phase === "processing" && run.backend === "mux"}>
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
          <p className="mt-1">
            {backend === "mux" ? t("upload.step2Mux") : t("upload.step2Browser")}
          </p>
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
