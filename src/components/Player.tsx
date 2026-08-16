import Hls from "hls.js";
import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, Loader2, RotateCcw, VolumeX } from "lucide-react";
import type { Video } from "../lib/types";

interface PlayerProps {
  video: Video;
  /** Attempt muted autoplay (used on the embed page) */
  autoplay?: boolean;
  /** Initial muted state */
  muted?: boolean;
  onEnded?: () => void;
  onFirstPlay?: () => void;
  className?: string;
}

/**
 * Robust video player.
 *
 * Why playback used to get "stuck":
 *  1. Overlays (ads) covering the element and swallowing clicks on the
 *     native play button. Here every overlay is either pointer-events-none
 *     or only rendered at a moment when it cannot block playback.
 *  2. Autoplay being blocked silently. We attempt muted autoplay, and if the
 *     browser refuses we simply leave the native controls (poster + play
 *     button) untouched.
 *  3. HLS errors. hls.js fatal errors are recovered (network retry / media
 *     recovery) and the final fallback is a visible error + retry button.
 */
export default function Player({
  video,
  autoplay = false,
  muted = false,
  onEnded,
  onFirstPlay,
  className,
}: PlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const startedRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isWaiting, setIsWaiting] = useState(false);
  const [needsUnmute, setNeedsUnmute] = useState(false);

  const onEndedRef = useRef(onEnded);
  onEndedRef.current = onEnded;
  const onFirstPlayRef = useRef(onFirstPlay);
  onFirstPlayRef.current = onFirstPlay;

  const isHls = /\.m3u8(\?|$)/i.test(video.src);

  /* ------------------------- source setup ------------------------- */
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    let hls: Hls | null = null;

    setError(null);
    setNeedsUnmute(false);
    setWaitingForBuffer(false);
    startedRef.current = false;

    if (isHls && Hls.isSupported()) {
      hls = new Hls({
        enableWorker: true,
        maxBufferLength: 30,
        backBufferLength: 60,
      });
      hlsRef.current = hls;
      hls.loadSource(video.src);
      hls.attachMedia(el);
      hls.on(Hls.Events.ERROR, (_evt, data) => {
        if (!data.fatal) return;
        if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
          hls?.startLoad();
        } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
          hls?.recoverMediaError();
        } else {
          setError("This stream could not be played.");
        }
      });
    } else {
      el.src = video.src;
    }

    return () => {
      hls?.destroy();
      hlsRef.current = null;
      el.removeAttribute("src");
      el.load();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [video.src]);

  /* ---------------------- muted autoplay attempt ------------------- */
  useEffect(() => {
    const el = videoRef.current;
    if (!el || !autoplay) return;
    const t = window.setTimeout(() => {
      el.muted = true;
      el.play().catch(() => {
        /* browser blocked autoplay — native play button remains, that's fine */
      });
    }, 250);
    return () => window.clearTimeout(t);
  }, [autoplay, video.src]);

  /* --------------------------- events ------------------------------ */
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    const onPlay = () => {
      setIsPlaying(true);
      setError(null);
      if (!startedRef.current) {
        startedRef.current = true;
        onFirstPlayRef.current?.();
      }
    };
    const onPause = () => setIsPlaying(false);
    const onWaiting = () => setWaitingForBuffer(true);
    const onPlaying = () => {
      setWaitingForBuffer(false);
      // Autoplay started muted — offer a tap-to-unmute pill instead of
      // forcing sound on (browsers block unmuted autoplay).
      setNeedsUnmute(el.muted && autoplay);
    };
    const onVolumeChange = () => {
      if (!el.muted) setNeedsUnmute(false);
    };
    const onEnded = () => {
      setIsPlaying(false);
      setWaitingForBuffer(false);
      onEndedRef.current?.();
    };
    const onError = () => {
      if (!isHls && el.currentSrc) {
        setError("This video could not be loaded. Check the file path in the catalog.");
      }
    };

    el.addEventListener("play", onPlay);
    el.addEventListener("pause", onPause);
    el.addEventListener("waiting", onWaiting);
    el.addEventListener("playing", onPlaying);
    el.addEventListener("volumechange", onVolumeChange);
    el.addEventListener("ended", onEnded);
    el.addEventListener("error", onError);
    return () => {
      el.removeEventListener("play", onPlay);
      el.removeEventListener("pause", onPause);
      el.removeEventListener("waiting", onWaiting);
      el.removeEventListener("playing", onPlaying);
      el.removeEventListener("volumechange", onVolumeChange);
      el.removeEventListener("ended", onEnded);
      el.removeEventListener("error", onError);
    };
  }, [autoplay, isHls]);

  const setWaitingForBuffer = useCallback((v: boolean) => setIsWaiting(v), []);

  const handleUnmute = useCallback(() => {
    const el = videoRef.current;
    if (!el) return;
    el.muted = false;
    setNeedsUnmute(false);
    el.play().catch(() => {});
  }, []);

  const handleRetry = useCallback(() => {
    const el = videoRef.current;
    if (!el) return;
    setError(null);
    el.load();
    const tryPlay = () => el.play().catch(() => {});
    if (el.readyState >= 2) tryPlay();
    else el.addEventListener("loadeddata", tryPlay, { once: true });
  }, []);

  return (
    <div className={`relative aspect-video w-full overflow-hidden bg-black ${className ?? ""}`}>
      <video
        ref={videoRef}
        className="h-full w-full"
        controls
        playsInline
        preload="metadata"
        poster={video.poster}
        muted={muted}
      />

      {/* Buffering spinner — never captures pointer events */}
      {isWaiting && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-mist-300/80" />
        </div>
      )}

      {/* Unmute pill — tiny, above the control bar, only while playing */}
      {isPlaying && needsUnmute && (
        <button
          onClick={handleUnmute}
          className="absolute bottom-16 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full border border-line-strong bg-ink-900/90 px-4 py-2 text-sm font-medium text-mist-100 shadow-xl backdrop-blur transition hover:bg-ink-800"
        >
          <VolumeX className="h-4 w-4 text-ember-400" />
          Tap to unmute
        </button>
      )}

      {/* Error panel — only rendered when playback actually failed */}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-ink-950/90 p-6 text-center">
          <AlertTriangle className="h-10 w-10 text-ember-400" />
          <p className="max-w-sm text-sm text-mist-300">{error}</p>
          <button
            onClick={handleRetry}
            className="inline-flex items-center gap-2 rounded-lg bg-ember-500 px-4 py-2 text-sm font-semibold text-ink-950 transition hover:bg-ember-400"
          >
            <RotateCcw className="h-4 w-4" />
            Retry
          </button>
        </div>
      )}
    </div>
  );
}
