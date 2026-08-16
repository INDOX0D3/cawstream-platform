import { useState } from "react";
import { Link } from "react-router-dom";
import { Play, Eye } from "lucide-react";
import type { Video } from "../lib/types";
import { formatViews } from "../lib/format";

export default function VideoCard({ video }: { video: Video }) {
  const [imgOk, setImgOk] = useState(true);
  const initials = video.title
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <Link to={`/watch/${video.id}`} className="group block focus:outline-none">
      <div className="relative aspect-video overflow-hidden rounded-xl bg-ink-800 ring-1 ring-line transition duration-300 group-hover:ring-line-strong">
        {video.poster && imgOk ? (
          <img
            src={video.poster}
            alt={video.title}
            loading="lazy"
            onError={() => setImgOk(false)}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-ink-700 via-ink-800 to-ink-900">
            <span className="font-display text-3xl font-bold tracking-tight text-ember-400/70">
              {initials}
            </span>
          </div>
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/65 via-black/5 to-transparent" />
        {video.duration && (
          <span className="absolute bottom-2 right-2 rounded-md bg-black/80 px-1.5 py-0.5 font-mono text-[11px] font-medium text-mist-200">
            {video.duration}
          </span>
        )}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 transition duration-300 group-hover:opacity-100">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-ember-500 text-ink-950 shadow-lg shadow-ember-600/30 transition group-hover:scale-110">
            <Play className="ml-0.5 h-5 w-5 fill-current" />
          </span>
        </div>
      </div>

      <h3 className="mt-3 line-clamp-1 text-[15px] font-semibold text-mist-100 transition group-hover:text-ember-300">
        {video.title}
      </h3>
      <p className="mt-1 flex items-center gap-1.5 text-[13px] text-mist-400">
        <span className="rounded bg-ink-800 px-1.5 py-0.5 text-[11px] font-medium text-mist-300">
          {video.category}
        </span>
        <Eye className="h-3.5 w-3.5" />
        {formatViews(video.views)} views
      </p>
    </Link>
  );
}
