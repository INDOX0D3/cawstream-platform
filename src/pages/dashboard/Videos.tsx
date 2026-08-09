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
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/convex/_generated/api";
import { embedCode, videoUrls } from "@/lib/embed";
import { formatBytes, formatCompact, formatDateTime, formatDuration } from "@/lib/format";
import { extractMetadata, generateThumbnail, uploadBlob } from "@/lib/video";
import { useMutation, useQuery } from "convex/react";
import type { Id } from "@/convex/_generated/dataModel";
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

type VideoRow = NonNullable<ReturnType<typeof useQuery<typeof api.videos.listMine>>>[number];

const FILTERS = ["all", "ready", "processing", "failed"] as const;

export default function Videos() {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("all");
  const [selected, setSelected] = useState<VideoRow | null>(null);
  const videos = useQuery(api.videos.listMine, { status: filter === "all" ? undefined : filter });

  const filtered = videos?.filter((v) =>
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
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="ready">Ready</TabsTrigger>
          <TabsTrigger value="processing">Processing</TabsTrigger>
          <TabsTrigger value="failed">Failed</TabsTrigger>
        </TabsList>
      </Tabs>

      {videos === undefined ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered && filtered.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((video) => (
            <VideoCard
              key={video._id}
              video={video as VideoCardVideo}
              to={`/v/${video.publicId}`}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={filter === "failed" ? RefreshCw : Clapperboard}
          title={
            filter === "failed"
              ? "No failed videos"
              : filter === "processing"
                ? "Nothing processing right now"
                : "No videos here yet"
          }
          description={
            filter === "all"
              ? "Upload a video and it will show up here as it moves through processing."
              : "Try a different filter or upload a new video."
          }
          action={
            <Link to="/dashboard/upload">
              <Button variant="outline">Upload a video</Button>
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
  const [confirmDelete, setConfirmDelete] = useState(false);
  const detail = useQuery(api.videos.getMine, { videoId: video._id });
  const updateVideo = useMutation(api.videos.updateVideo);
  const deleteVideo = useMutation(api.videos.deleteVideo);
  const reprocess = useMutation(api.videos.reprocess);
  const markFailed = useMutation(api.videos.markFailed);
  const getUploadUrl = useMutation(api.videos.getUploadUrl);
  const completeProcessing = useMutation(api.videos.completeProcessing);

  const [title, setTitle] = useState(video.title);
  const [description, setDescription] = useState(video.description ?? "");
  const [saving, setSaving] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [autoFullEmbed, setAutoFullEmbed] = useState(true); // embeds are fullscreen by default

  const urls = videoUrls(video.publicId);
  const embed = embedCode(video.publicId, 500, { autoFullscreen: autoFullEmbed });

  const save = async () => {
    setSaving(true);
    try {
      await updateVideo({ videoId: video._id, title, description });
      toast.success("Video details updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save changes");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteVideo({ videoId: video._id });
      toast.success("Video deleted");
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
      const meta = await extractMetadata(blob as File);
      let thumbnailStorageId: Id<"_storage"> | undefined;
      try {
        const thumb = await generateThumbnail(blob as File);
        const thumbUrl = await getUploadUrl();
        thumbnailStorageId = (await uploadBlob(thumbUrl, thumb)) as Id<"_storage">;
      } catch {
        // a thumbnail is optional — the video can still be marked ready
      }
      await completeProcessing({
        videoId: video._id,
        thumbnailStorageId,
        duration: meta.duration,
        width: meta.width,
        height: meta.height,
        codec: meta.codec,
        bitrate: meta.bitrate,
      });
      toast.success("Video reprocessed and ready again");
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

  const daily = useMemo(
    () =>
      (detail?.stats.daily ?? []).map((d) => ({
        ...d,
        label: new Date(`${d.date}T00:00:00`).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
        }),
      })),
    [detail?.stats.daily],
  );

  const maxViews = Math.max(1, ...daily.map((d) => d.count));

  return (
    <>
      <Dialog open onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="pr-10">{video.title}</DialogTitle>
            <DialogDescription>
              {video.publicId} · uploaded {formatDateTime(video._creationTime)}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Eye className="size-4" />
              {video.views.toLocaleString()} views ·{" "}
              {formatCompact(detail?.stats.uniqueViewers ?? 0)} unique
            </div>
            <div className="flex items-center justify-end gap-2">
              <StatusBadge status={video.status} />
              {video.duration ? <span>{formatDuration(video.duration)}</span> : null}
            </div>
          </div>

          <Tabs defaultValue="details">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="details">
                <Pencil className="mr-1.5 size-3.5" /> Details
              </TabsTrigger>
              <TabsTrigger value="stats">
                <BarChart3 className="mr-1.5 size-3.5" /> Stats
              </TabsTrigger>
              <TabsTrigger value="embed">
                <Code2 className="mr-1.5 size-3.5" /> Embed
              </TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Title</label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                />
              </div>
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg border p-3">
                  <dt className="text-xs text-muted-foreground">File</dt>
                  <dd className="mt-1 truncate font-medium">{video.fileName}</dd>
                </div>
                <div className="rounded-lg border p-3">
                  <dt className="text-xs text-muted-foreground">Size</dt>
                  <dd className="mt-1 font-medium">{formatBytes(video.sizeBytes)}</dd>
                </div>
                <div className="rounded-lg border p-3">
                  <dt className="text-xs text-muted-foreground">Resolution</dt>
                  <dd className="mt-1 font-medium">
                    {video.width && video.height ? `${video.width}×${video.height}` : "—"}
                  </dd>
                </div>
                <div className="rounded-lg border p-3">
                  <dt className="text-xs text-muted-foreground">Codec</dt>
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
                    Retry processing
                  </Button>
                )}
                <Button variant="destructive" onClick={() => setConfirmDelete(true)}>
                  <Trash2 className="mr-2 size-4" />
                  Delete
                </Button>
                <Button onClick={save} disabled={saving}>
                  {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
                  Save changes
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="stats">
              {daily.length === 0 ? (
                <div className="flex h-52 flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
                  <FileVideo className="size-8 opacity-50" />
                  No views in the last 13 days yet.
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
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <label className="text-sm font-medium">Embed code</label>
                  <label className="flex items-center gap-2 text-xs text-muted-foreground">
                    Start in fullscreen
                    <Switch checked={autoFullEmbed} onCheckedChange={setAutoFullEmbed} />
                  </label>
                </div>
                <pre className="max-h-40 overflow-auto rounded-lg border bg-muted/40 p-3 text-xs leading-5">
                  {embed}
                </pre>
                <CopyButton value={embed} label="Copy embed code" />
              </div>
              <div className="grid gap-2 text-sm">
                <div className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2">
                  <span className="truncate text-muted-foreground">Watch page</span>
                  <span className="flex items-center gap-2">
                    <code className="max-w-[220px] truncate text-xs">{urls.watch}</code>
                    <CopyButton value={urls.watch} size="icon" label="Copy watch URL" />
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2">
                  <span className="truncate text-muted-foreground">Direct MP4</span>
                  <span className="flex items-center gap-2">
                    <code className="max-w-[220px] truncate text-xs">{urls.mp4}</code>
                    <CopyButton value={urls.mp4} size="icon" label="Copy MP4 URL" />
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2">
                  <span className="truncate text-muted-foreground">Thumbnail</span>
                  <span className="flex items-center gap-2">
                    <code className="max-w-[220px] truncate text-xs">{urls.thumb}</code>
                    <CopyButton value={urls.thumb} size="icon" label="Copy thumbnail URL" />
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
            <AlertDialogTitle>Delete this video?</AlertDialogTitle>
            <AlertDialogDescription>
              The file, thumbnail, views and embed links will be permanently
              removed. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={handleDelete}
            >
              Delete video
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
