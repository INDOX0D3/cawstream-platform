/**
 * CawStream public player (used by /v/:publicId watch and /e/:publicId embed).
 *
 * Fully custom player skin — the browser's native controls are never shown:
 *  - Big accent-colored play button (color chosen in Admin → Player settings)
 *  - Custom control bar: play/pause, buffered seek bar, time, picture-in-picture,
 *    share and settings — auto-hides while playing (fullscreen button is only
 *    shown on the embed surface, not the watch page)
 *  - Keyboard shortcuts (space/k play, ←/→ seek, f fullscreen on embeds)
 *  - Share menu: copy link, copy embed code, native device share
 *  - Settings menu: playback speed and HLS quality ladder
 *
 * Direct playback: plain <video> with the stored file URL.
 * Server payload includes admin player settings, branding (watermark) and the
 * video owner's ad configuration — rendered by AdManager inside this player.
 * A view is recorded (hashed visitor id) the first time playback actually
 * starts. Never on a paused or failed video.
 */
import { AdManager, type AdsConfig } from "@/components/AdManager";
import { copyText } from "@/components/CopyButton";
import { api } from "@/convex/_generated/api";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useMutation } from "convex/react";
import Hls from "hls.js";
import {
  AlertTriangle,
  Code2,
  Link2,
  Loader2,
  Maximize,
  Minimize,
  Pause,
  PictureInPicture2,
  Play,
  Settings,
  Share,
  Share2,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import { toast } from "sonner";
import { formatDuration } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { getVisitorId, viewProof } from "@/lib/visitor";
import { embedCode, videoUrls } from "@/lib/embed";
import { cn } from "@/lib/utils";

/**
 * Accent colors for the custom player skin. Keys must stay in sync with
 * PLAYER_ACCENT_KEYS in src/convex/lib/settingsDefaults.ts.
 */
export const PLAYER_ACCENTS: Record<
  string,
  { label: string; color: string; foreground: string }
> = {
  yellow: { label: "Yellow", color: "#facc15", foreground: "#1c1917" },
  blue: { label: "Blue", color: "#3b82f6", foreground: "#ffffff" },
  orange: { label: "Orange", color: "#f97316", foreground: "#ffffff" },
  red: { label: "Red", color: "#ef4444", foreground: "#ffffff" },
  green: { label: "Green", color: "#22c55e", foreground: "#052e16" },
  white: { label: "White", color: "#ffffff", foreground: "#0a0a0a" },
};

const DEFAULT_ACCENT = "yellow";

const PLAYBACK_SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

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
  accentColor: string;
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

const ICON_BTN =
  "flex size-9 shrink-0 items-center justify-center rounded-full text-white/90 transition-colors hover:bg-white/15 hover:text-white";

export function VideoPlayer({
  video,
  ads,
  branding,
  player,
  userPrefs,
  className,
  autoFullscreen = false,
  fill = false,
  showFullscreen = true,
  adsEnabled = true,
}: {
  video: PlayerVideo;
  ads: AdsConfig;
  branding: PlayerBranding;
  player: PlayerPrefs;
  userPrefs?: PlayerUserPrefs;
  className?: string;
  autoFullscreen?: boolean;
  /** Fill the whole container (viewport) edge-to-edge instead of a fixed aspect box. */
  fill?: boolean;
  /** Show the fullscreen button (and f/double-click shortcuts). Off on the watch page. */
  showFullscreen?: boolean;
  /** Run the owner's ads (popunder/social bar/smartlink). Embed only — the
   *  watch page keeps ads off. */
  adsEnabled?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const seekBarRef = useRef<HTMLDivElement | null>(null);
  const hideTimer = useRef<number | null>(null);
  const lastClick = useRef(0);
  const recorded = useRef(false);
  const autoFullscreenDone = useRef(false);
  const userLeftFullscreen = useRef(false);
  const hlsRef = useRef<Hls | null>(null);

  const [playing, setPlaying] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [buffering, setBuffering] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [bufferedEnd, setBufferedEnd] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPip, setIsPip] = useState(false);
  const [isSeeking, setIsSeeking] = useState(false);
  const [seekPreview, setSeekPreview] = useState<number | null>(null);
  const [controlsShown, setControlsShown] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [speed, setSpeed] = useState(() => userPrefs?.defaultSpeed ?? 1);
  const [levels, setLevels] = useState<Array<{ height?: number; width?: number }>>([]);
  const [currentLevel, setCurrentLevel] = useState(-1);
  const recordView = useMutation(api.views.recordView);
  const { t } = useI18n();

  const isReady = video.status === "ready";
  const autoplay = userPrefs?.autoplay ?? player.autoplay;
  const showWatermark =
    userPrefs?.showWatermark ?? (player.showBranding && branding.watermarkEnabled);
  const defaultSpeed = userPrefs?.defaultSpeed ?? 1;
  const accent = PLAYER_ACCENTS[player.accentColor] ?? PLAYER_ACCENTS[DEFAULT_ACCENT];

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
      hlsRef.current = hls;
      hls.loadSource(hlsSrc);
      hls.attachMedia(el);
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          setLoadError("This stream could not be loaded right now.");
        }
      });
      // Expose the quality ladder and apply the admin default (auto or source).
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (!hls) return;
        setLevels(hls.levels.map((l) => ({ height: l.height, width: l.width })));
        if (player.defaultQuality === "source" && hls.levels.length > 0) {
          hls.currentLevel = hls.levels.length - 1;
          setCurrentLevel(hls.levels.length - 1);
        } else {
          hls.currentLevel = -1;
          setCurrentLevel(-1);
        }
      });
    } else if (el.canPlayType("application/vnd.apple.mpegurl")) {
      el.src = hlsSrc;
    } else {
      setLoadError("Your browser cannot play this HLS stream.");
    }
    return () => {
      hls?.destroy();
      hlsRef.current = null;
    };
  }, [isReady, hlsSrc, player.defaultQuality]);

  // Progress / buffering state from the <video> element.
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    const onTime = () => setCurrentTime(el.currentTime);
    const onProgress = () => {
      if (el.buffered.length) setBufferedEnd(el.buffered.end(el.buffered.length - 1));
    };
    const onDuration = () => {
      if (Number.isFinite(el.duration)) setDuration(el.duration);
    };
    const onEnterPip = () => setIsPip(true);
    const onLeavePip = () => setIsPip(false);
    el.addEventListener("timeupdate", onTime);
    el.addEventListener("progress", onProgress);
    el.addEventListener("durationchange", onDuration);
    el.addEventListener("enterpictureinpicture", onEnterPip);
    el.addEventListener("leavepictureinpicture", onLeavePip);
    return () => {
      el.removeEventListener("timeupdate", onTime);
      el.removeEventListener("progress", onProgress);
      el.removeEventListener("durationchange", onDuration);
      el.removeEventListener("enterpictureinpicture", onEnterPip);
      el.removeEventListener("leavepictureinpicture", onLeavePip);
    };
  }, [src]);

  // Sync fullscreen state (native + Safari prefixed).
  useEffect(() => {
    const onChange = () => {
      const doc = document as Document & { webkitFullscreenElement?: Element };
      const active = document.fullscreenElement ?? doc.webkitFullscreenElement;
      setIsFullscreen(active === containerRef.current);
      if (autoFullscreen && !active) userLeftFullscreen.current = true;
    };
    document.addEventListener("fullscreenchange", onChange);
    document.addEventListener("webkitfullscreenchange", onChange);
    return () => {
      document.removeEventListener("fullscreenchange", onChange);
      document.removeEventListener("webkitfullscreenchange", onChange);
    };
  }, [autoFullscreen]);

  // Auto-enter fullscreen on load; browsers require a gesture, so retry on the
  // first interaction inside the player if the initial request was blocked.
  // On iOS Safari (no element fullscreen) this falls back to the native video
  // fullscreen, so tapping play fills the screen too.
  useEffect(() => {
    if (!autoFullscreen || !isReady) return;
    const container = containerRef.current;
    if (!container) return;

    const enter = () => {
      if (autoFullscreenDone.current || userLeftFullscreen.current) return;
      autoFullscreenDone.current = true;
      const doc = document as Document & { webkitFullscreenElement?: Element };
      if (document.fullscreenElement || doc.webkitFullscreenElement) return;
      const videoEl = videoRef.current;
      if (container.requestFullscreen) {
        container.requestFullscreen().catch(() => {
          autoFullscreenDone.current = false; // blocked — wait for a gesture
        });
      } else if ("webkitRequestFullscreen" in container) {
        (container as unknown as { webkitRequestFullscreen: () => void }).webkitRequestFullscreen();
      } else if (videoEl && "webkitEnterFullscreen" in videoEl) {
        // iOS Safari: fullscreen the <video> element directly.
        try {
          (videoEl as unknown as { webkitEnterFullscreen: () => void }).webkitEnterFullscreen();
        } catch {
          autoFullscreenDone.current = false;
        }
      } else {
        autoFullscreenDone.current = false; // unsupported — give up quietly
      }
    };
    const onGesture = () => enter();

    enter();
    container.addEventListener("pointerdown", onGesture, { once: true });
    container.addEventListener("keydown", onGesture, { once: true });
    return () => {
      container.removeEventListener("pointerdown", onGesture);
      container.removeEventListener("keydown", onGesture);
    };
  }, [autoFullscreen, isReady]);

  // Auto-hide the control bar while playing.
  useEffect(() => {
    if (!player.controls) return;
    setControlsShown(true);
    if (!playing || menuOpen) return;
    hideTimer.current = window.setTimeout(() => setControlsShown(false), 2800);
    return () => {
      if (hideTimer.current) window.clearTimeout(hideTimer.current);
    };
  }, [playing, player.controls, menuOpen]);

  const pokeControls = () => {
    if (!player.controls) return;
    setControlsShown(true);
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
    if (playing && !menuOpen) {
      hideTimer.current = window.setTimeout(() => setControlsShown(false), 2800);
    }
  };

  const onMenuOpenChange = (open: boolean) => {
    setMenuOpen(open);
    if (open) {
      setControlsShown(true);
      if (hideTimer.current) window.clearTimeout(hideTimer.current);
    } else if (playing) {
      setControlsShown(true);
      hideTimer.current = window.setTimeout(() => setControlsShown(false), 2800);
    }
  };

  const copyToClipboard = async (value: string, message: string) => {
    const ok = await copyText(value);
    if (ok) toast.success(message);
    else toast.error(t("copy.failed"));
  };

  const togglePlay = useCallback(() => {
    const el = videoRef.current;
    if (!el) return;
    if (el.paused) void el.play().catch(() => undefined);
    else el.pause();
  }, []);

  const toggleFullscreen = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const doc = document as Document & { webkitFullscreenElement?: Element };
    if (document.fullscreenElement ?? doc.webkitFullscreenElement) {
      if (document.exitFullscreen) void document.exitFullscreen().catch(() => undefined);
      else (document as unknown as { webkitExitFullscreen?: () => void }).webkitExitFullscreen?.();
    } else if (container.requestFullscreen) {
      void container.requestFullscreen().catch(() => undefined);
    } else {
      (container as unknown as { webkitRequestFullscreen?: () => void }).webkitRequestFullscreen?.();
    }
  }, []);

  const togglePip = useCallback(() => {
    const el = videoRef.current;
    if (!el) return;
    const doc = document as Document & { pictureInPictureElement?: Element };
    if (doc.pictureInPictureElement) {
      void doc.exitPictureInPicture?.().catch(() => undefined);
    } else if (el.requestPictureInPicture) {
      void el.requestPictureInPicture().catch(() => undefined);
    }
  }, []);

  const handleVideoClick = () => {
    const now = Date.now();
    if (now - lastClick.current < 300) return; // ignore the first click of a double-click
    lastClick.current = now;
    togglePlay();
  };

  const handlePlaying = async () => {
    setPlaying(true);
    setBuffering(false);
    if (!recorded.current && isReady) {
      recorded.current = true;
      // Anti-bot proof (Platinum owners): a hash computed in the browser proves
      // a real JS engine watched the video, not a script fetching the URL.
      const visitorId = getVisitorId();
      const proof = await viewProof(visitorId).catch(() => undefined);
      recordView({ publicId: video.publicId, visitorId, proof }).catch(() => {
        // analytics must never break playback
      });
    }
  };

  // --- Custom seek bar (pointer-driven) -------------------------------------
  const seekRatioFromEvent = (e: ReactPointerEvent<HTMLDivElement>) => {
    const el = seekBarRef.current;
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    return rect.width > 0 ? Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width)) : 0;
  };
  const applySeek = (ratio: number) => {
    const el = videoRef.current;
    if (el && Number.isFinite(el.duration) && el.duration > 0) {
      el.currentTime = ratio * el.duration;
    }
  };
  const onSeekPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsSeeking(true);
    const ratio = seekRatioFromEvent(e);
    setSeekPreview(ratio);
    applySeek(ratio);
  };
  const onSeekPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!isSeeking) return;
    const ratio = seekRatioFromEvent(e);
    setSeekPreview(ratio);
    applySeek(ratio);
  };
  const onSeekPointerUp = () => {
    setIsSeeking(false);
    setSeekPreview(null);
  };

  const playedPct =
    isSeeking && seekPreview !== null
      ? seekPreview * 100
      : duration > 0
        ? (currentTime / duration) * 100
        : 0;
  const bufferedPct = duration > 0 ? Math.min(100, (bufferedEnd / duration) * 100) : 0;

  // Keyboard shortcuts.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      if (menuOpen) return; // let the settings/share menus handle keys
      const videoEl = videoRef.current;
      if (!videoEl) return;
      switch (e.key) {
        case " ":
        case "k":
        case "K":
          e.preventDefault();
          togglePlay();
          break;
        case "ArrowRight":
          e.preventDefault();
          videoEl.currentTime = Math.min(videoEl.duration || 0, videoEl.currentTime + 5);
          break;
        case "ArrowLeft":
          e.preventDefault();
          videoEl.currentTime = Math.max(0, videoEl.currentTime - 5);
          break;
        case "f":
        case "F":
          if (showFullscreen) toggleFullscreen();
          break;
      }
    };
    el.addEventListener("keydown", onKey);
    return () => el.removeEventListener("keydown", onKey);
  }, [togglePlay, toggleFullscreen, menuOpen]);

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
          fill ? "h-full" : (ASPECT_CLASSES[player.aspectRatio] ?? "aspect-video"),
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
              <p className="text-sm font-medium text-white">{t("player.failedProcess")}</p>
              <p className="max-w-md text-xs text-white/60">{video.error ?? t("player.retryLater")}</p>
            </>
          ) : (
            <>
              <Loader2 className="size-6 animate-spin text-white/70" />
              <p className="text-sm font-medium text-white">
                {video.status === "processing"
                  ? t("player.processing")
                  : video.status === "queued"
                    ? t("player.queued")
                    : t("player.unavailable")}
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
      tabIndex={0}
      onPointerMove={pokeControls}
      onPointerDown={pokeControls}
      className={cn(
        "group relative w-full overflow-hidden rounded-lg bg-black outline-none",
        fill ? "h-full" : (ASPECT_CLASSES[player.aspectRatio] ?? "aspect-video"),
        className,
      )}
    >
      <AdManager
        ads={ads}
        containerRef={containerRef}
        watermarkPosition={branding.watermarkPosition}
        enabled={adsEnabled}
      />

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
        className={cn("size-full", fill && "object-cover")}
        playsInline
        autoPlay={autoplay}
        muted={autoplay}
        preload={autoplay ? "auto" : "metadata"}
        disablePictureInPicture={!player.pictureInPicture}
        onClick={handleVideoClick}
        onDoubleClick={showFullscreen ? () => void toggleFullscreen() : undefined}
        onPlaying={handlePlaying}
        onWaiting={() => setBuffering(true)}
        onCanPlay={() => setBuffering(false)}
        onPause={() => setPlaying(false)}
        onLoadedMetadata={(e) => {
          const el = e.currentTarget;
          const next = Math.min(1, Math.max(0, userPrefs?.defaultVolume ?? player.defaultVolume));
          el.volume = next;
          el.defaultPlaybackRate = defaultSpeed;
        }}
        onError={() => {
          if (directSrc) setLoadError("This video could not be played in your browser.");
        }}
      />

      {/* Buffering overlay */}
      {buffering && playing && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-black/20">
          <Loader2 className="size-10 animate-spin text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.6)]" />
        </div>
      )}

      {/* Big accent-colored play button */}
      {!playing && (
        <button
          type="button"
          aria-label={t("player.play")}
          onClick={togglePlay}
          className="absolute inset-0 z-10 flex items-center justify-center bg-black/25 transition-colors hover:bg-black/15"
        >
          <span
            className="flex size-20 items-center justify-center rounded-full shadow-2xl transition-transform duration-200 hover:scale-110 active:scale-95 sm:size-24"
            style={{
              background: accent.color,
              color: accent.foreground,
              boxShadow: `0 0 0 12px ${accent.color}26, 0 12px 44px ${accent.color}59`,
            }}
          >
            <Play className="ml-1.5 size-9 sm:size-10" fill="currentColor" />
          </span>
        </button>
      )}

      {/* Custom control bar */}
      {player.controls && (
        <div
          className={cn(
            "absolute inset-x-0 bottom-0 z-20 px-3 pb-2.5 pt-10 transition-opacity duration-200",
            "bg-gradient-to-t from-black/85 via-black/40 to-transparent",
            controlsShown ? "opacity-100" : "pointer-events-none opacity-0",
          )}
        >
          {/* Seek bar */}
          <div
            ref={seekBarRef}
            role="slider"
            aria-label={t("player.seek")}
            aria-valuemin={0}
            aria-valuemax={Math.round(duration)}
            aria-valuenow={Math.round(currentTime)}
            tabIndex={0}
            onPointerDown={onSeekPointerDown}
            onPointerMove={onSeekPointerMove}
            onPointerUp={onSeekPointerUp}
            onPointerCancel={onSeekPointerUp}
            className="group/seek relative flex h-4 cursor-pointer touch-none items-center"
          >
            <div className="relative h-1 w-full overflow-hidden rounded-full bg-white/25 transition-[height] duration-100 group-hover/seek:h-1.5">
              <div
                className="absolute inset-y-0 left-0 bg-white/30"
                style={{ width: `${bufferedPct}%` }}
              />
              <div
                className="absolute inset-y-0 left-0 rounded-full"
                style={{ width: `${playedPct}%`, background: accent.color }}
              >
                <span
                  className="absolute right-0 top-1/2 size-3.5 -translate-y-1/2 translate-x-1/2 rounded-full shadow transition-transform group-hover/seek:scale-110"
                  style={{ background: accent.color, boxShadow: "0 0 0 3px rgba(255,255,255,0.35)" }}
                />
              </div>
            </div>
          </div>

          {/* Buttons row */}
          <div className="mt-0.5 flex items-center gap-2">
            <button
              type="button"
              aria-label={playing ? t("player.pause") : t("player.playLabel")}
              onClick={togglePlay}
              className={cn(ICON_BTN, "shadow-lg")}
            >
              {playing ? (
                <Pause className="size-4" fill="currentColor" />
              ) : (
                <Play className="ml-0.5 size-4" fill="currentColor" />
              )}
            </button>

            <span className="text-xs font-medium tabular-nums text-white/90">
              {formatDuration(currentTime)}
              <span className="text-white/50"> / {formatDuration(duration)}</span>
            </span>

            <div className="ml-auto flex items-center gap-1">
              {player.pictureInPicture && document.pictureInPictureEnabled && (
                <button
                  type="button"
                  aria-label={isPip ? t("player.exitPip") : t("player.pip")}
                  onClick={togglePip}
                  className={cn(ICON_BTN, isPip && "bg-white/15 text-white")}
                >
                  <PictureInPicture2 className="size-4" />
                </button>
              )}

              {/* Share */}
              <DropdownMenu onOpenChange={onMenuOpenChange}>
                <DropdownMenuTrigger asChild>
                  <button type="button" aria-label={t("player.share")} className={ICON_BTN}>
                    <Share2 className="size-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuPortal>
                  <DropdownMenuContent side="top" align="end" className="w-60">
                    <DropdownMenuItem
                      onClick={() =>
                        copyToClipboard(videoUrls(video.publicId).watch, t("player.linkCopied"))
                      }
                    >
                      <Link2 className="mr-2 size-4" />
                      {t("player.copyLink")}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => copyToClipboard(embedCode(video.publicId), t("player.embedCopied"))}
                    >
                      <Code2 className="mr-2 size-4" />
                      {t("player.copyEmbed")}
                    </DropdownMenuItem>
                    {typeof navigator !== "undefined" && "share" in navigator && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => {
                            void navigator
                              .share({ title: video.title, url: videoUrls(video.publicId).watch })
                              .catch(() => undefined);
                          }}
                        >
                          <Share className="mr-2 size-4" />
                          {t("player.deviceShare")}
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenuPortal>
              </DropdownMenu>

              {/* Settings */}
              <DropdownMenu onOpenChange={onMenuOpenChange}>
                <DropdownMenuTrigger asChild>
                  <button type="button" aria-label={t("player.settings")} className={ICON_BTN}>
                    <Settings className="size-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuPortal>
                  <DropdownMenuContent side="top" align="end" className="w-56">
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger>{t("player.speed")}</DropdownMenuSubTrigger>
                      <DropdownMenuPortal>
                        <DropdownMenuSubContent>
                          <DropdownMenuRadioGroup
                            value={String(speed)}
                            onValueChange={(v) => {
                              const next = Number(v);
                              setSpeed(next);
                              if (videoRef.current) videoRef.current.playbackRate = next;
                            }}
                          >
                            {PLAYBACK_SPEEDS.map((s) => (
                              <DropdownMenuRadioItem key={s} value={String(s)}>
                                {s}×
                              </DropdownMenuRadioItem>
                            ))}
                          </DropdownMenuRadioGroup>
                        </DropdownMenuSubContent>
                      </DropdownMenuPortal>
                    </DropdownMenuSub>
                    {levels.length > 0 && (
                      <DropdownMenuSub>
                        <DropdownMenuSubTrigger>{t("player.quality")}</DropdownMenuSubTrigger>
                        <DropdownMenuPortal>
                          <DropdownMenuSubContent>
                            <DropdownMenuRadioGroup
                              value={String(currentLevel)}
                              onValueChange={(v) => {
                                const idx = Number(v);
                                setCurrentLevel(idx);
                                if (hlsRef.current) hlsRef.current.currentLevel = idx;
                              }}
                            >
                              <DropdownMenuRadioItem value="-1">{t("player.auto")}</DropdownMenuRadioItem>
                              {levels.map((l, i) => (
                                <DropdownMenuRadioItem key={`${l.height ?? "?"}-${i}`} value={String(i)}>
                                  {l.height ? `${l.height}p` : t("player.level", { n: i + 1 })}
                                </DropdownMenuRadioItem>
                              ))}
                            </DropdownMenuRadioGroup>
                          </DropdownMenuSubContent>
                        </DropdownMenuPortal>
                      </DropdownMenuSub>
                    )}
                  </DropdownMenuContent>
                </DropdownMenuPortal>
              </DropdownMenu>

              {showFullscreen && (
                <button
                  type="button"
                  aria-label={isFullscreen ? t("player.exitFullscreen") : t("player.fullscreen")}
                  onClick={toggleFullscreen}
                  className={ICON_BTN}
                >
                  {isFullscreen ? <Minimize className="size-4" /> : <Maximize className="size-4" />}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {loadError && (
        <div className="absolute inset-x-0 bottom-0 z-30 flex items-center gap-2 bg-destructive/90 px-3 py-2 text-xs text-white">
          <AlertTriangle className="size-3.5 shrink-0" />
          {loadError}
        </div>
      )}
    </div>
  );
}
