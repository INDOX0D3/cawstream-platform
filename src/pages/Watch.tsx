import { CopyButton } from "@/components/CopyButton";
import { VideoCard } from "@/components/VideoCard";
import { Logo } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { VideoPlayer, type PlayerUserPrefs } from "@/components/VideoPlayer";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { embedCode } from "@/lib/embed";
import { formatCompact, formatDate } from "@/lib/format";
import { useQuery } from "convex/react";
import { motion } from "framer-motion";
import { Eye, LayoutDashboard, Link2, Loader2, PlayCircle, UserRound } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router";

export default function Watch() {
  const { publicId = "" } = useParams();
  const { isAuthenticated } = useAuth();
  const [autoFullEmbed, setAutoFullEmbed] = useState(true); // embeds are fullscreen by default
  const payload = useQuery(api.videos.getWatch, { publicId });
  const related = useQuery(api.videos.listMoreFrom, { publicId });
  const personal = useQuery(
    api.playerPrefs.getMyPlayerSettings,
    isAuthenticated ? {} : "skip",
  );

  const userPrefs: PlayerUserPrefs | undefined = personal
    ? {
        autoplay: personal.autoplay,
        defaultVolume: personal.defaultVolume,
        defaultSpeed: personal.defaultSpeed,
        showWatermark: personal.showWatermark,
      }
    : undefined;

  if (payload === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (payload === null) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center">
        <PlayCircle className="size-12 text-muted-foreground/50" />
        <div>
          <p className="text-lg font-semibold">Video not found</p>
          <p className="mt-1 text-sm text-muted-foreground">
            It may have been removed or never existed.
          </p>
        </div>
        <Link to="/">
          <Button variant="outline">Back to CawStream</Button>
        </Link>
      </div>
    );
  }

  const { video, ads, player, branding, owner } = payload;

  return (
    <div className="min-h-screen bg-background">
      <header className="flex h-16 items-center border-b px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2">
          <Logo />
        </Link>
        <div className="ml-auto flex items-center gap-2">
          {isAuthenticated ? (
            <Link to="/dashboard">
              <Button variant="outline" size="sm">
                <LayoutDashboard className="mr-1.5 size-3.5" />
                Dashboard
              </Button>
            </Link>
          ) : (
            <Link to="/auth">
              <Button variant="outline" size="sm">
                Sign in
              </Button>
            </Link>
          )}
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6">
        <VideoPlayer
          video={video}
          ads={ads}
          branding={branding}
          player={player}
          userPrefs={userPrefs}
        />

        <div className="mt-6 space-y-5">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">{video.title}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <UserRound className="size-4" />
                {owner.name}
                <span className="text-muted-foreground/70">@{owner.username}</span>
              </span>
              <span className="flex items-center gap-1.5">
                <Eye className="size-4" />
                {formatCompact(video.views)} views
              </span>
              <span>{formatDate(video.createdAt)}</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                navigator.share?.({ title: video.title, url: window.location.href }).catch(() => undefined);
              }}
            >
              <Link2 className="mr-2 size-4" />
              Share
            </Button>
            <label className="flex h-8 items-center gap-2 rounded-lg border px-2.5 text-xs text-muted-foreground">
              <Switch
                checked={autoFullEmbed}
                onCheckedChange={setAutoFullEmbed}
                className="scale-90"
              />
              Fullscreen
            </label>
            <CopyButton
              value={embedCode(video.publicId, 500, { autoFullscreen: autoFullEmbed })}
              label="Embed"
            />
            <CopyButton value={window.location.href} label="Copy link" />
          </div>

          {video.error && video.status === "failed" && (
            <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {video.error}
            </p>
          )}
        </div>

        {related !== undefined && related.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.1 }}
            className="mt-10"
          >
            <h2 className="text-lg font-semibold tracking-tight">
              More from <span className="text-brand">@{owner.username}</span>
            </h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {related.map((item) => (
                <VideoCard
                  key={item._id}
                  video={item}
                  to={`/v/${item.publicId}`}
                />
              ))}
            </div>
          </motion.section>
        )}
      </main>
    </div>
  );
}
