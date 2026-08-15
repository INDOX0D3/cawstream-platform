import { CopyButton } from "@/components/CopyButton";
import { EmptyState } from "@/components/EmptyState";
import { StatusBadge } from "@/components/StatusBadge";
import { VideoCard, type VideoCardVideo } from "@/components/VideoCard";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useApiMutation, useApiQuery } from "@/hooks/use-api";
import { videoUrls } from "@/lib/embed";
import { formatBytes, formatCompact, formatDateTime, formatDuration } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import {
  completeVideoUpload,
  extractMetadata,
  generateSocialThumbnail,
  generateThumbnail,
} from "@/lib/video";
import type { VideoDetail, VideoItem } from "@/lib/types";
import {
  BarChart3,
  Clapperboard,
  Code2,
  Eye,
  FileVideo,
  Loader2,
  Pencil,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type VideoRow = VideoItem;

const FILTERS = ["all", "ready", "processing", "failed"] as const;

export default function Videos() {
  const { t } = useI18n();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("all");
  const [selected, setSelected] = useState<VideoRow | null>(null);
  const videos = useApiQuery<VideoItem[]>(
    "videos/listMine",
    filter === "all" ? {} : { status: filter },
  );

  const filtered = videos?.filter((v: VideoRow) =>
    filter === "all"
      ? true
      : filter === "processing"
        ? ["uploading", "queued", "processing"].includes(v.status)
        : v.status === filter,
  );

  return (
    <div className="space-y-6">
      <Tabs
        value={filter}
        onValueChange={(v) => setFilter(v as (typeof FILTERS)[number])}
        className="w-full"
      >
        <TabsList>
          <TabsTrigger value="all">{t("videos.all")}</TabsTrigger>
          <TabsTrigger value="ready">{t("videos.ready")}</TabsTrigger>
          <TabsTrigger value="processing">{t("videos.processing")}</TabsTrigger>
          <TabsTrigger value="failed">{t("videos.failed")}</TabsTrigger>
        </TabsList>
      </Tabs>

      {videos === undefined ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered && filtered.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((video: VideoRow) => (
            <VideoCard
              key={video._id}
              video={video as VideoCardVideo}
              to={`/v/${video.publicId}`}
              onEdit={() => setSelected(video)}
              showLinks
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={filter === "failed" ? RefreshCw : Clapperboard}
          title={
            filter === "failed"
              ? t("videos.failed")
              : filter === "processing"
                ? t("videos.processing")
                : t("videos.emptyAll")
          }
          description={
            filter === "all"
              ? t("videos.emptyAllDesc")
              : t("videos.emptyFilter")
          }
          action={
            <Link to="/dashboard/upload">
              <Button variant="outline">{t("videos.uploadVideo")}</Button>
            </Link>
          }
        />
      )}

      {selected && (
        <VideoDetailDialog video={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}

function VideoDetailDialog({
  video,
  onClose,
}: {
  video: VideoRow;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const detail: VideoDetail | undefined = useApiQuery<VideoDetail>("videos/getMine", {
    videoId: video._id,
  });
  const updateVideo = useApiMutation("videos/updateVideo");
  const deleteVideo = useApiMutation("videos/deleteVideo");
  const reprocess = useApiMutation<{ videoId: string }, { url: string }>("videos/reprocess");
  const markFailed = useApiMutation("videos/markFailed");

  const [title, setTitle] = useState(video.title);
  const [description, setDescription] = useState(video.description ?? "");
  const [saving, setSaving] = useState(false);
  const [retrying, setRetrying] = useState(false);

  const urls = videoUrls(video.publicId);
  const watchShare = urls.watch;

  const save = async () => {
    if (!title.trim()) {
      toast.error("Title cannot be empty.");
      return;
    }
    setSaving(true);
    try {
      await updateVideo({ videoId: video._id, title, description });
      toast.success(t("videos.updated"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save changes");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteVideo({ videoId: video._id });
      toast.success(t("videos.deleted"));
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete video");
    }
  };

  const handleRetry = async () => {
    setRetrying(true);
    try {
      const { url } = await reprocess({ videoId: video._id });
      // Re-run the real browser pipeline from the stored file: download,
      // extract real metadata, regenerate the thumbnail, then complete.
      const res = await fetch(url);
      if (!res.ok) throw new Error("Could not download the stored file.");
      const blob = await res.blob();
      const file = new File([blob], video.fileName, { type: video.mimeType });
      const meta = await extractMetadata(file);
      let thumbnail: Blob | null = null;
      let social: Blob | null = null;
      try {
        thumbnail = await generateThumbnail(file);
      } catch {
        // a thumbnail is optional — the video can still be marked ready
      }
      try {
        social = await generateSocialThumbnail(file);
      } catch {
        // the play-button poster is optional too
      }
      await completeVideoUpload(video._id, {
        duration: meta.duration,
        width: meta.width,
        height: meta.height,
        codec: meta.codec,
        bitrate: meta.bitrate,
        thumbnail,
        socialThumbnail: social,
      });
      toast.success(t("videos.reprocessed"));
      onClose();
    } catch (error) {
      await markFailed({
        videoId: video._id,
        error: error instanceof Error ? error.message : "Reprocessing failed.",
      });
      toast.error(error instanceof Error ? error.message : "Reprocessing failed");
    } finally {
      setRetrying(false);
    }
  };

  const daily = useMemo<Array<{ date: string; count: number; label: string }>>(
    () =>
      (detail?.stats.daily ?? []).map((d: { date: string; count: number }) => ({
        ...d,
        label: new Date(`${d.date}T00:00:00`).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
        }),
      })),
    [detail?.stats.daily],
  );

  const maxViews = Math.max(1, ...daily.map((d: { date: string; count: number }) => d.count));

  return (
    <>
      <Dialog open onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="pr-10">{video.title}</DialogTitle>
            <DialogDescription>
              {t("videos.dialogDesc", {
                id: video.publicId,
                date: formatDateTime(video._creationTime),
              })}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Eye className="size-4" />
              {t("videos.viewsStats", {
                views: video.views.toLocaleString(),
                n: formatCompact(detail?.stats.uniqueViewers ?? 0),
              })}
            </div>
            <div className="flex items-center justify-end gap-2">
              <StatusBadge status={video.status} />
              {video.duration ? <span>{formatDuration(video.duration)}</span> : null}
            </div>
          </div>

          <Tabs defaultValue="details">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="details">
                <Pencil className="mr-1.5 size-3.5" /> {t("videos.tabDetails")}
              </TabsTrigger>
              <TabsTrigger value="stats">
                <BarChart3 className="mr-1.5 size-3.5" /> {t("videos.tabStats")}
              </TabsTrigger>
              <TabsTrigger value="embed">
                <Code2 className="mr-1.5 size-3.5" /> {t("videos.tabEmbed")}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("videos.title")}</label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("videos.description")}</label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                />
              </div>
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg border p-3">
                  <dt className="text-xs text-muted-foreground">{t("videos.file")}</dt>
                  <dd className="mt-1 truncate font-medium">{video.fileName}</dd>
                </div>
                <div className="rounded-lg border p-3">
                  <dt className="text-xs text-muted-foreground">{t("videos.size")}</dt>
                  <dd className="mt-1 font-medium">{formatBytes(video.sizeBytes)}</dd>
                </div>
                <div className="rounded-lg border p-3">
                  <dt className="text-xs text-muted-foreground">{t("videos.resolution")}</dt>
                  <dd className="mt-1 font-medium">
                    {video.width && video.height ? `${video.width}×${video.height}` : "—"}
                  </dd>
                </div>
                <div className="rounded-lg border p-3">
                  <dt className="text-xs text-muted-foreground">{t("videos.codec")}</dt>
                  <dd className="mt-1 font-medium">{video.codec ?? "—"}</dd>
                </div>
              </dl>
              <div className="flex justify-end gap-2 pt-1">
                {video.status === "failed" && (
                  <Button variant="outline" onClick={handleRetry} disabled={retrying}>
                    {retrying ? (
                      <Loader2 className="mr-2 size-4 animate-spin" />
                    ) : (
                      <RefreshCw className="mr-2 size-4" />
                    )}
                    {t("videos.retry")}
                  </Button>
                )}
                <Button variant="destructive" onClick={() => setConfirmDelete(true)}>
                  <Trash2 className="mr-2 size-4" />
                  {t("videos.delete")}
                </Button>
                <Button onClick={save} disabled={saving}>
                  {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
                  {t("videos.save")}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="stats">
              {daily.length === 0 ? (
                <div className="flex h-52 flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
                  <FileVideo className="size-8 opacity-50" />
                  {t("videos.noViews")}
                </div>
              ) : (
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={daily}>
                      <defs>
                        <linearGradient id="viewsFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--color-brand)" stopOpacity={0.5} />
                          <stop offset="95%" stopColor="var(--color-brand)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 11 }}
                        tickLine={false}
                        axisLine={false}
                        interval="preserveStartEnd"
                      />
                      <YAxis
                        allowDecimals={false}
                        domain={[0, maxViews]}
                        width={28}
                        tick={{ fontSize: 11 }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip
                        formatter={(value) => [`${value} views`, "Views"]}
                        contentStyle={{
                          borderRadius: 8,
                          border: "1px solid var(--border)",
                          fontSize: 12,
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="count"
                        stroke="var(--color-brand)"
                        strokeWidth={2}
                        fill="url(#viewsFill)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </TabsContent>

            <TabsContent value="embed" className="space-y-4">
              <div className="grid gap-2 text-sm">
                <div className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2">
                  <span className="truncate text-muted-foreground">{t("videos.embedLink")}</span>
                  <span className="flex items-center gap-2">
                    <code className="max-w-[220px] truncate text-xs">{urls.embed}</code>
                    <CopyButton value={urls.embed} size="icon" label={t("videos.copyEmbedUrl")} />
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2">
                  <span className="truncate text-muted-foreground">{t("videos.watchPage")}</span>
                  <span className="flex items-center gap-2">
                    <code className="max-w-[220px] truncate text-xs">{watchShare}</code>
                    <CopyButton value={watchShare} size="icon" label={t("videos.copyWatchUrl")} />
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2">
                  <span className="truncate text-muted-foreground">{t("videos.directMp4")}</span>
                  <span className="flex items-center gap-2">
                    <code className="max-w-[220px] truncate text-xs">{urls.mp4}</code>
                    <CopyButton value={urls.mp4} size="icon" label={t("videos.copyMp4Url")} />
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2">
                  <span className="truncate text-muted-foreground">{t("videos.thumbnail")}</span>
                  <span className="flex items-center gap-2">
                    <code className="max-w-[220px] truncate text-xs">{urls.thumb}</code>
                    <CopyButton value={urls.thumb} size="icon" label={t("videos.copyThumbUrl")} />
                  </span>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("videos.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("videos.deleteDesc")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("upload.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={handleDelete}
            >
              {t("videos.deleteConfirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
