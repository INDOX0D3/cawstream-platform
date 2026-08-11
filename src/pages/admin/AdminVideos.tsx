import { PageHeader } from "@/components/layout/Shell";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { api } from "@/convex/_generated/api";
import { formatBytes, formatCompact, formatRelative } from "@/lib/format";
import { useMutation, useQuery } from "convex/react";
import { ExternalLink, Loader2, Play, Trash2 } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";

type VideoRow = NonNullable<ReturnType<typeof useQuery<typeof api.admin.listVideos>>>[number];

export default function AdminVideos() {
  const videos = useQuery(api.admin.listVideos);
  const adminDeleteVideo = useMutation(api.admin.adminDeleteVideo);
  const [deleting, setDeleting] = useState<VideoRow | null>(null);

  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      await adminDeleteVideo({ videoId: deleting._id });
      toast.success("Video deleted");
      setDeleting(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete video");
    }
  };

  if (videos === undefined) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Videos"
        description="Every video on the platform, newest first."
      />

      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Video</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Views</TableHead>
              <TableHead className="text-right">Size</TableHead>
              <TableHead>Uploaded</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {videos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  No videos on the platform yet.
                </TableCell>
              </TableRow>
            ) : (
              videos.map((video: VideoRow) => (
                <TableRow key={video._id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="relative size-16 shrink-0 overflow-hidden rounded-md bg-muted">
                        {video.thumbnailUrl ? (
                          <img
                            src={video.thumbnailUrl}
                            alt=""
                            className="size-full object-cover"
                          />
                        ) : (
                          <div className="flex size-full items-center justify-center">
                            <Play className="size-4 text-muted-foreground/50" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 max-w-[260px]">
                        <p className="truncate text-sm font-medium">{video.title}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {video.publicId}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="text-sm">{video.ownerName}</p>
                    <p className="text-xs text-muted-foreground">@{video.ownerUsername}</p>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={video.status} />
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCompact(video.views)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatBytes(video.sizeBytes)}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatRelative(video._creationTime)}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Link
                        to={`/v/${video.publicId}`}
                        target="_blank"
                        className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        aria-label="Open watch page"
                      >
                        <ExternalLink className="size-4" />
                      </Link>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-destructive hover:text-destructive"
                        onClick={() => setDeleting(video)}
                        aria-label="Delete video"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={deleting !== null} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this video?</AlertDialogTitle>
            <AlertDialogDescription>
              The file, thumbnail and all view records will be permanently
              removed. Embed links will stop working.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={confirmDelete}
            >
              Delete video
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
