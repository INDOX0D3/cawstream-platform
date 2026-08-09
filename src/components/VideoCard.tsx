import { StatusBadge } from "@/components/StatusBadge";
import { formatCompact, formatDuration, formatRelative } from "@/lib/format";
import { Eye, Play } from "lucide-react";
import { Link } from "react-router";
import { cn } from "@/lib/utils";

export interface VideoCardVideo {
  _id: string;
  publicId: string;
  title: string;
  status: string;
  duration?: number | null;
  views: number;
  thumbnailUrl: string | null;
  _creationTime: number;
  error?: string | null;
}

export function VideoCard({
  video,
  to,
  showOwner,
  ownerName,
}: {
  video: VideoCardVideo;
  to: string;
  showOwner?: boolean;
  ownerName?: string;
}) {
  const isReady = video.status === "ready";

  return (
    <Link
      to={to}
      className="group block overflow-hidden rounded-xl border bg-card transition-all hover:-translate-y-0.5 hover:border-border hover:shadow-md"
    >
      <div className="relative aspect-video overflow-hidden bg-muted">
        {video.thumbnailUrl ? (
          <img
            src={video.thumbnailUrl}
            alt=""
            loading="lazy"
            className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex size-full items-center justify-center bg-gradient-to-br from-muted to-muted/40">
            <Play className="size-8 text-muted-foreground/40" />
          </div>
        )}
        {isReady && (
          <span className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
            <span className="flex size-11 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-sm">
              <Play className="ml-0.5 size-5" />
            </span>
          </span>
        )}
        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-2">
          {video.duration && isReady ? (
            <span className="rounded bg-black/70 px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-white">
              {formatDuration(video.duration)}
            </span>
          ) : (
            <StatusBadge status={video.status} className="border-transparent bg-black/70" />
          )}
          <span className="rounded bg-black/70 px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-white/90">
            <Eye className="mr-1 inline size-3 -translate-y-px" />
            {formatCompact(video.views)}
          </span>
        </div>
      </div>
      <div className="p-3">
        <p className="line-clamp-1 text-sm font-medium">{video.title}</p>
        <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
          {showOwner && ownerName ? (
            <>
              <span className="truncate">{ownerName}</span>
              <span aria-hidden>·</span>
            </>
          ) : null}
          <span>{formatRelative(video._creationTime)}</span>
        </p>
        {video.error && (
          <p className={cn("mt-1 line-clamp-1 text-xs text-destructive")}>{video.error}</p>
        )}
      </div>
    </Link>
  );
}
