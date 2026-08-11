import { StatusBadge } from "@/components/StatusBadge";
import { CopyButton } from "@/components/CopyButton";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { videoUrls } from "@/lib/embed";
import { formatCompact, formatDuration, formatRelative } from "@/lib/format";
import { useI18n, type DictKey } from "@/lib/i18n";
import { Eye, ImageIcon, Link2, Pencil, Play } from "lucide-react";
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

/** Popover with the ready-to-copy output links for a video (embed link and
 *  thumbnail link). Rendered inside the card when `showLinks` is set — used
 *  on the My Videos grid. */
function CopyLinksPopover({ publicId }: { publicId: string }) {
  const { t } = useI18n();
  const urls = videoUrls(publicId);
  const rows = [
    {
      icon: <Play className="size-3.5" />,
      labelKey: "card.embedLink" as DictKey,
      hintKey: "card.embedHint" as DictKey,
      value: urls.embed,
    },
    {
      icon: <ImageIcon className="size-3.5" />,
      labelKey: "card.thumbLink" as DictKey,
      hintKey: "card.thumbHint" as DictKey,
      value: urls.thumb,
    },
  ];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={t("card.links")}
          title={t("card.links")}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          className="absolute left-2 top-2 z-10 flex size-8 items-center justify-center rounded-full bg-black/60 text-white opacity-0 shadow backdrop-blur-sm transition-opacity hover:bg-black/80 group-hover:opacity-100"
        >
          <Link2 className="size-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 p-3">
        <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t("card.links")}
        </p>
        <div className="space-y-1.5">
          {rows.map((row) => (
            <div
              key={row.labelKey}
              className="flex items-center gap-2 rounded-lg border px-2 py-1.5"
            >
              <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                {row.icon}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-medium">{t(row.labelKey)}</span>
                <span className="block truncate text-[11px] text-muted-foreground">
                  {row.value}
                </span>
              </span>
              <CopyButton value={row.value} size="icon" label={t(row.labelKey)} />
            </div>
          ))}
        </div>
        <p className="mt-2 px-1 text-[11px] text-muted-foreground">{t("card.linksTip")}</p>
      </PopoverContent>
    </Popover>
  );
}

export function VideoCard({
  video,
  to,
  showOwner,
  ownerName,
  onEdit,
  showLinks,
}: {
  video: VideoCardVideo;
  to: string;
  showOwner?: boolean;
  ownerName?: string;
  /** Optional edit action — renders a pencil button on hover (e.g. to rename
   *  the video from My Videos without leaving the grid). */
  onEdit?: () => void;
  /** Renders a copy-links popover (embed / social / thumbnail) on the card. */
  showLinks?: boolean;
}) {
  const isReady = video.status === "ready";
  const { lang } = useI18n();

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
        {showLinks && <CopyLinksPopover publicId={video.publicId} />}
        {onEdit && (
          <button
            type="button"
            aria-label="Edit video details"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onEdit();
            }}
            className="absolute right-2 top-2 z-10 flex size-8 items-center justify-center rounded-full bg-black/60 text-white opacity-0 shadow backdrop-blur-sm transition-opacity hover:bg-black/80 group-hover:opacity-100"
          >
            <Pencil className="size-3.5" />
          </button>
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
          <span>{formatRelative(video._creationTime, lang)}</span>
        </p>
        {video.error && (
          <p className={cn("mt-1 line-clamp-1 text-xs text-destructive")}>{video.error}</p>
        )}
      </div>
    </Link>
  );
}
