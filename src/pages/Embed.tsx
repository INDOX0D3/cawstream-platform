import { VideoPlayer } from "@/components/VideoPlayer";
import { useApiQuery } from "@/hooks/use-api";
import { applyVideoMeta } from "@/lib/seo";
import { Loader2, PlayCircle } from "lucide-react";
import { useEffect } from "react";
import { useParams } from "react-router";

interface EmbedPayload {
  video: {
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
    posterUrl: string | null;
    views: number;
    createdAt: number;
  };
  ads: {
    smartlinkEnabled: boolean;
    smartlinkUrl: string;
    socialBarEnabled: boolean;
    socialBarCode: string;
    popunderEnabled: boolean;
    popunderCode: string;
    frequency: "session" | "always";
  };
  player: {
    aspectRatio: string;
    defaultQuality: string;
    autoplay: boolean;
    controls: boolean;
    pictureInPicture: boolean;
    defaultVolume: number;
    showBranding: boolean;
    accentColor: string;
  };
  branding: {
    watermarkEnabled: boolean;
    watermarkText: string;
    watermarkLogoUrl: string;
    watermarkPosition: string;
    watermarkSize: number;
    watermarkOpacity: number;
    watermarkMargin: number;
  };
  site: { name: string; supportEmail: string };
}

/**
 * Minimal chrome-free embed surface used by the iframe embed code.
 *
 * Fullscreen by default: the page fills the entire viewport edge-to-edge
 * (fixed inset-0, black) so opening the URL already looks like a fullscreen
 * video — no web chrome, no page background. The player also requests the
 * native fullscreen API on load; browsers only allow that after a user
 * gesture, so it re-enters fullscreen on the very first tap/click
 * (including pressing play). Append ?autofull=0 to opt out.
 */
export default function Embed() {
  const { publicId = "" } = useParams();
  const autofull = new URLSearchParams(window.location.search).get("autofull");
  const autoFullscreen = autofull !== "0";
  const payload = useApiQuery<EmbedPayload | null>("videos/getEmbed", { publicId });

  // The embed URL is often pasted into chats — keep the document head in sync
  // so JS-rendering crawlers and browsers show a proper video preview.
  useEffect(() => {
    if (!payload) return;
    const origin = window.location.origin;
    applyVideoMeta({
      title: `${payload.video.title} — ${payload.site.name}`,
      description: `Watch "${payload.video.title}" on ${payload.site.name}.`,
      imageUrl: payload.video.posterUrl ?? `${origin}/thumb/${payload.video.publicId}.jpg`,
      url: window.location.href,
      siteName: payload.site.name,
    });
  }, [payload, publicId]);

  if (payload === undefined) {
    return (
      <div className="fixed inset-0 z-0 flex items-center justify-center bg-black">
        <Loader2 className="size-6 animate-spin text-white/60" />
      </div>
    );
  }

  if (payload === null) {
    return (
      <div className="fixed inset-0 z-0 flex flex-col items-center justify-center gap-2 bg-black px-4 text-center">
        <PlayCircle className="size-8 text-white/40" />
        <p className="text-xs text-white/60">This video is unavailable</p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-0 bg-black">
      <VideoPlayer
        video={payload.video}
        ads={payload.ads}
        branding={payload.branding}
        player={payload.player}
        autoFullscreen={autoFullscreen}
        fill
        className="h-full w-full rounded-none"
      />
    </div>
  );
}
