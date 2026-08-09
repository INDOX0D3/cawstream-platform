import { VideoPlayer } from "@/components/VideoPlayer";
import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import { Loader2, PlayCircle } from "lucide-react";
import { useParams } from "react-router";

/** Minimal chrome-free embed surface used by the iframe embed code. */
export default function Embed() {
  const { publicId = "" } = useParams();
  const payload = useQuery(api.videos.getEmbed, { publicId });

  if (payload === undefined) {
    return (
      <div className="flex h-full min-h-[200px] w-full items-center justify-center bg-black">
        <Loader2 className="size-6 animate-spin text-white/60" />
      </div>
    );
  }

  if (payload === null) {
    return (
      <div className="flex h-full min-h-[200px] w-full flex-col items-center justify-center gap-2 bg-black px-4 text-center">
        <PlayCircle className="size-8 text-white/40" />
        <p className="text-xs text-white/60">This video is unavailable</p>
      </div>
    );
  }

  return (
    <div className="h-full w-full bg-black">
      <VideoPlayer
        video={payload.video}
        ads={payload.ads}
        branding={payload.branding}
        player={payload.player}
        className="h-full rounded-none"
      />
    </div>
  );
}
