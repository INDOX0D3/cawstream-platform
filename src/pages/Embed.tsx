import { VideoPlayer } from "@/components/VideoPlayer";
import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import { Loader2, PlayCircle } from "lucide-react";
import { useParams } from "react-router";

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
  const payload = useQuery(api.videos.getEmbed, { publicId });

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
