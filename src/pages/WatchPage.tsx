import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Copy,
  Eye,
  Film,
} from "lucide-react";
import type { Video } from "../lib/types";
import { loadVideos } from "../lib/catalog";
import { embedCode, formatDate, formatViews } from "../lib/format";
import Player from "../components/Player";
import VideoCard from "../components/VideoCard";

export default function WatchPage() {
  const { id } = useParams<{ id: string }>();
  const [videos, setVideos] = useState<Video[] | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadVideos().then(setVideos).catch(() => setVideos([]));
  }, [id]);

  const video = useMemo(
    () => videos?.find((v) => v.id === id) ?? null,
    [videos, id],
  );

  const related = useMemo(() => {
    if (!videos || !video) return [];
    return videos
      .filter((v) => v.id !== video.id && v.category === video.category)
      .concat(videos.filter((v) => v.id !== video.id && v.category !== video.category))
      .slice(0, 5);
  }, [videos, video]);

  if (videos === null) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-24 text-center text-mist-400 sm:px-6">
        Loading…
      </div>
    );
  }

  if (!video) {
    return (
      <div className="mx-auto flex max-w-7xl flex-col items-center px-4 py-24 text-center sm:px-6">
        <Film className="h-10 w-10 text-mist-500" />
        <h1 className="mt-4 font-display text-2xl font-bold text-mist-100">
          Video not found
        </h1>
        <p className="mt-2 text-sm text-mist-400">
          It may have been removed from the catalog.
        </p>
        <Link
          to="/browse"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-ember-500 px-5 py-2.5 text-sm font-bold text-ink-950 transition hover:bg-ember-400"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to browse
        </Link>
      </div>
    );
  }

  const embed = embedCode(window.location.origin, video.id);

  const copyEmbed = async () => {
    try {
      await navigator.clipboard.writeText(embed);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <Link
        to="/browse"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-mist-400 transition hover:text-ember-300"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to browse
      </Link>

      <div className="mt-4 grid gap-8 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0">
          <div className="overflow-hidden rounded-2xl ring-1 ring-line">
            <Player video={video} />
          </div>

          <h1 className="mt-5 font-display text-2xl font-extrabold tracking-tight text-mist-100 sm:text-3xl">
            {video.title}
          </h1>

          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-mist-400">
            <span className="inline-flex items-center gap-1.5">
              <Eye className="h-4 w-4" />
              {formatViews(video.views)} views
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              {formatDate(video.uploadedAt)}
            </span>
            <span className="rounded-md bg-ink-800 px-2 py-0.5 text-xs font-semibold text-ember-300">
              {video.category}
            </span>
          </div>

          {video.tags && video.tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {video.tags.map((t) => (
                <span
                  key={t}
                  className="rounded-full border border-line bg-ink-800/60 px-2.5 py-0.5 text-xs text-mist-300"
                >
                  #{t}
                </span>
              ))}
            </div>
          )}

          <p className="mt-5 max-w-3xl text-[15px] leading-relaxed text-mist-300">
            {video.description || "No description provided."}
          </p>

          <div className="mt-6 rounded-2xl border border-line bg-ink-900/50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-mist-500">
                Embed this video
              </p>
              <button
                onClick={copyEmbed}
                className="inline-flex items-center gap-1.5 rounded-lg border border-line-strong bg-ink-800 px-3 py-1.5 text-xs font-semibold text-mist-200 transition hover:border-ember-500/50 hover:text-ember-300"
              >
                {copied ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-ember-400" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
                {copied ? "Copied" : "Copy embed code"}
              </button>
            </div>
            <pre className="mt-3 overflow-x-auto rounded-xl bg-ink-950 p-3.5 font-mono text-[12px] leading-relaxed text-mist-300">
              {embed}
            </pre>
            <p className="mt-3 text-xs text-mist-500">
              Direct player:{" "}
              <Link
                to={`/e/${video.id}`}
                className="font-semibold text-ember-400 hover:underline"
              >
                /e/{video.id}
              </Link>
            </p>
          </div>
        </div>

        <aside className="min-w-0">
          <h2 className="font-display text-lg font-bold text-mist-100">Related</h2>
          <div className="mt-4 space-y-5">
            {related.map((v) => (
              <VideoCard key={v.id} video={v} />
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
