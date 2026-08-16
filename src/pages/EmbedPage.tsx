import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Eye, ExternalLink, X } from "lucide-react";
import type { SiteConfig, Video } from "../lib/types";
import { loadSite, loadVideos } from "../lib/catalog";
import { armPopunder } from "../lib/ads";
import { formatViews } from "../lib/format";
import Player from "../components/Player";

/**
 * /e/:id — the embeddable player.
 *
 * Ads live here and only here by default:
 *  - Popunder: injected into <head> on the first real user gesture. It is a
 *    separate <script> tag that has nothing to do with the <video> element,
 *    so even if the ad script fails, play/pause keeps working.
 *  - End-card: a post-roll overlay rendered only after the video ends, with a
 *    close button. It is never present while the video could be played, so it
 *    can never make the player "stuck".
 */
export default function EmbedPage() {
  const { id } = useParams<{ id: string }>();
  const [videos, setVideos] = useState<Video[] | null>(null);
  const [site, setSite] = useState<SiteConfig | null>(null);
  const [ended, setEnded] = useState(false);
  const [endCardDismissed, setEndCardDismissed] = useState(false);
  const popunderArmedRef = useRef(false);

  useEffect(() => {
    Promise.all([loadVideos(), loadSite()])
      .then(([v, s]) => {
        setVideos(v);
        setSite(s);
      })
      .catch(() => {
        setVideos([]);
        setSite(null);
      });
  }, [id]);

  const video = videos?.find((v) => v.id === id) ?? null;

  useEffect(() => {
    if (video) document.title = `${video.title} — ${site?.name ?? "CawStream"}`;
  }, [video, site]);

  const adsEnabled =
    site?.ad.popunderEnabled && site.ad.enabledPages.includes("embed");

  /* Arm the popunder on first user gesture. Re-arms on remount (StrictMode). */
  useEffect(() => {
    if (!adsEnabled || !site) return;
    if (popunderArmedRef.current) return;
    popunderArmedRef.current = true;
    const off = armPopunder(site.ad.popunderUrl);
    return () => {
      popunderArmedRef.current = false;
      off();
    };
  }, [adsEnabled, site]);

  const overlayEnabled =
    site?.ad.overlayEnabled && site.ad.enabledPages.includes("embed");

  const showEndCard = overlayEnabled && ended && !endCardDismissed;

  if (videos === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-sm text-mist-400">
        Loading…
      </div>
    );
  }

  if (!video) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-black p-6 text-center">
        <p className="font-display text-lg font-bold text-mist-100">Video not found</p>
        <p className="text-sm text-mist-400">This embed link is invalid or the video was removed.</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-black px-3 py-6">
      <div className="w-full max-w-4xl">
        <div className="relative overflow-hidden rounded-xl ring-1 ring-line-strong">
          <Player
            video={video}
            autoplay
            onEnded={() => setEnded(true)}
            onFirstPlay={() => setEnded(false)}
          />

          {/* Post-roll end-card ad — rendered ONLY after the video ended. */}
          {showEndCard && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-ink-950/95 p-6 text-center">
              <p className="max-w-md text-sm leading-relaxed text-mist-200">
                {site?.ad.overlayText || "Advertisement"}
              </p>
              {site?.ad.overlayLink && (
                <a
                  href={site.ad.overlayLink}
                  target="_blank"
                  rel="noopener noreferrer sponsored"
                  className="inline-flex items-center gap-2 rounded-xl bg-ember-500 px-5 py-2.5 text-sm font-bold text-ink-950 transition hover:bg-ember-400"
                >
                  <ExternalLink className="h-4 w-4" />
                  Visit sponsor
                </a>
              )}
              <button
                onClick={() => setEndCardDismissed(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-line-strong bg-ink-800 px-4 py-2 text-xs font-semibold text-mist-300 transition hover:text-mist-100"
              >
                <X className="h-3.5 w-3.5" />
                Close
              </button>
            </div>
          )}
        </div>

        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="truncate text-sm text-mist-300">{video.title}</p>
          <div className="flex shrink-0 items-center gap-3 text-xs text-mist-500">
            <span className="inline-flex items-center gap-1">
              <Eye className="h-3.5 w-3.5" />
              {formatViews(video.views)}
            </span>
            <Link
              to={`/watch/${video.id}`}
              className="font-semibold text-ember-400/90 transition hover:text-ember-300"
            >
              Watch page →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
