/**
 * CawStream public player (used by /v/:publicId watch and /e/:publicId embed).
 *
 * - Direct playback: plain <video> with the stored file URL.
 * - Mux HLS playback: hls.js for browsers that need it, native HLS for Safari.
 * - Server payload includes admin player settings, branding (watermark) and the
 *   video owner's ad configuration — rendered by AdManager inside this player.
 * - A view is recorded (hashed visitor id) the first time playback actually
 *   starts. Never on a paused or failed video.
 */
import { AdManager, type AdsConfig } from "@/components/AdManager";
import { api } from "@/convex/_generated/api";
import { useMutation } from "convex/react";
import Hls from "hls.js";
import { AlertTriangle, Loader2, Play } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { getVisitorId } from "@/lib/visitor";
import { cn } from "@/lib/utils";

export interface PlayerVideo {
  _id: string;
  publicId: string;
  title: string;
  status: string;
  error: string | null;
  duration: number | null;
  width: number | null;
  height: number | null;
  playbackType: "direct" | "hls" | null;
  muxPlaybackId: string | null;
  directUrl: string | null;
  thumbnailUrl: string | null;
  views: number;
  createdAt: number;
}

export interface PlayerBranding {
  watermarkEnabled: boolean;
  watermarkText: string;
  watermarkLogoUrl: string;
  watermarkPosition: string;
  watermarkSize: number;
  watermarkOpacity: number;
  watermarkMargin: number;
}

export interface PlayerPrefs {
  aspectRatio: string;
  defaultQuality: string;
  autoplay: boolean;
  controls: boolean;
  pictureInPicture: boolean;
  defaultVolume: number;
  showBranding: boolean;
}

export interface PlayerUserPrefs {
  autoplay?: boolean;
  defaultVolume?: number;
  defaultSpeed?: number;
  showWatermark?: boolean;
}

const ASPECT_CLASSES: Record<string, string> = {
  "16:9": "aspect-video",
  "4:3": "aspect-[4/3]",
  "1:1": "aspect-square",
  "21:9": "aspect-[21/9]",
};

const POSITION_STYLES: Record<string, CSSProperties> = {
  "top-right": { top: 0, right: 0 },
  "top-left": { top: 0, left: 0 },
  "bottom-right": { bottom: 0, right: 0 },
  "bottom-left": { bottom: 0, left: 0 },
  center: { top: "50%", left: "50%", transform: "translate(-50%, -50%)" },
};

export function VideoPlayer({
  video,
  ads,
  branding,
  player,
  userPrefs,
  className,
}: {
  video: PlayerVideo;
  ads: AdsConfig;
  branding: PlayerBranding;
  player: PlayerPrefs;
  userPrefs?: PlayerUserPrefs;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const recorded = useRef(false);
  const [playing, setPlaying] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [buffering, setBuffering] = useState(false);
  const recordView = useMutation(api.views.recordView);

  const isReady = video.status === "ready";
  const autoplay = userPrefs?.autoplay ?? player.autoplay;
  const showWatermark =
    userPrefs?.showWatermark ?? (player.showBranding && branding.watermarkEnabled);
  const defaultSpeed = userPrefs?.defaultSpeed ?? 1;

  const hlsSrc =
    video.playbackType === "hls" && video.muxPlaybackId
      ? `https://stream.mux.com/${video.muxPlaybackId}.m3u8`
      : null;
  const directSrc = video.playbackType === "direct" ? video.directUrl : null;
  const src = hlsSrc ?? directSrc;

  // Wire up HLS (Mux) playback.
  useEffect(() => {
    if (!isReady || !hlsSrc) return;
    const el = videoRef.current;
    if (!el) return;
    let hls: Hls | null = null;

    if (Hls.isSupported()) {
      hls = new Hls({ enableWorker: true, maxBufferLength: 30 });
      hls.loadSource(hlsSrc);
      hls.attachMedia(el);
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          setLoadError("This stream could not be loaded right now.");
        }
      });
      // Apply the admin default quality: auto ladder or source (highest).
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (player.defaultQuality === "source" && hls) {
          hls.currentLevel = hls.levels.length - 1;
        } else if (hls) {
          hls.currentLevel = -1;
        }
      });
    } else if (el.canPlayType("application/vnd.apple.mpegurl")) {
      el.src = hlsSrc;
    } else {
      setLoadError("Your browser cannot play this HLS stream.");
    }
    return () => {
      hls?.destroy();
    };
  }, [isReady, hlsSrc, player.defaultQuality]);

  const handlePlaying = () => {
    setPlaying(true);
    setBuffering(false);
    if (!recorded.current && isReady) {
      recorded.current = true;
      recordView({ publicId: video.publicId, visitorId: getVisitorId() }).catch(() => {
        // analytics must never break playback
      });
    }
  };

  const togglePlay = () => {
    const el = videoRef.current;
    if (!el) return;
    if (el.paused) void el.play().catch(() => undefined);
    else el.pause();
  };

  // Watermark overlay placement.
  const margin = branding.watermarkMargin;
  const positionStyle: CSSProperties = POSITION_STYLES[branding.watermarkPosition] ?? {
    top: 0,
    right: 0,
  };
  const watermarkStyle: CSSProperties = {
    fontSize: branding.watermarkSize,
    opacity: branding.watermarkOpacity,
    margin: `${margin}px`,
  };

  if (!isReady) {
    return (
      <div
        ref={containerRef}
        className={cn(
          "relative w-full overflow-hidden rounded-lg bg-black",
          ASPECT_CLASSES[player.aspectRatio] ?? "aspect-video",
          className,
        )}
      >
        {video.thumbnailUrl && (
          <img
            src={video.thumbnailUrl}
            alt=""
            className="absolute inset-0 size-full object-cover opacity-40"
          />
        )}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
          {video.status === "failed" ? (
            <>
              <span className="flex size-11 items-center justify-center rounded-full bg-destructive/20 text-destructive">
                <AlertTriangle className="size-5" />
              </span>
              <p className="text-sm font-medium text-white">This video failed to process</p>
              <p className="max-w-md text-xs text-white/60">{video.error ?? "Please try again later."}</p>
            </>
          ) : (
            <>
              <Loader2 className="size-6 animate-spin text-white/70" />
              <p className="text-sm font-medium text-white">
                {video.status === "processing"
                  ? "Processing this video…"
                  : video.status === "queued"
                    ? "Queued for processing…"
                    : "This video is not available yet"}
              </p>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        "group relative w-full overflow-hidden rounded-lg bg-black",
        ASPECT_CLASSES[player.aspectRatio] ?? "aspect-video",
        className,
      )}
    >
      <AdManager ads={ads} playing={playing} containerRef={containerRef} />

      {/* Watermark */}
      {showWatermark && (
        <div className="pointer-events-none absolute z-20 select-none" style={positionStyle}>
          {branding.watermarkLogoUrl ? (
            <img
              src={branding.watermarkLogoUrl}
              alt=""
              style={{ ...watermarkStyle, maxWidth: 160 }}
              className="block"
            />
          ) : (
            <span
              className="block font-semibold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.7)]"
              style={watermarkStyle}
            >
              {branding.watermarkText}
            </span>
          )}
        </div>
      )}

      <video
        ref={videoRef}
        src={src ?? undefined}
        poster={video.thumbnailUrl ?? undefined}
        className="size-full"
        playsInline
        controls={player.controls}
        autoPlay={autoplay}
        muted={autoplay}
        preload={autoplay ? "auto" : "metadata"}
        disablePictureInPicture={!player.pictureInPicture}
        onClick={player.controls ? undefined : togglePlay}
        onPlaying={handlePlaying}
        onWaiting={() => setBuffering(true)}
        onCanPlay={() => setBuffering(false)}
        onPause={() => setPlaying(false)}
        onLoadedMetadata={(e) => {
          const el = e.currentTarget;
          el.volume = Math.min(1, Math.max(0, userPrefs?.defaultVolume ?? player.defaultVolume));
          el.defaultPlaybackRate = defaultSpeed;
        }}
        onError={() => {
          if (directSrc) setLoadError("This video could not be played in your browser.");
        }}
      />

      {/* Buffering overlay */}
      {buffering && !player.controls && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
          <Loader2 className="size-8 animate-spin text-white/80" />
        </div>
      )}

      {/* Minimal control surface when native controls are hidden */}
      {!player.controls && !playing && (
        <button
          type="button"
          aria-label="Play video"
          onClick={togglePlay}
          className="absolute inset-0 z-10 flex items-center justify-center bg-black/30 transition-colors hover:bg-black/20"
        >
          <span className="flex size-16 items-center justify-center rounded-full bg-white/90 text-black shadow-xl transition-transform hover:scale-105">
            <Play className="ml-1 size-7" />
          </span>
        </button>
      )}

      {loadError && (
        <div className="absolute inset-x-0 bottom-0 z-20 flex items-center gap-2 bg-destructive/90 px-3 py-2 text-xs text-white">
          <AlertTriangle className="size-3.5 shrink-0" />
          {loadError}
        </div>
      )}
    </div>
  );
}
