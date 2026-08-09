import { EmptyState } from "@/components/EmptyState";
import { StatCard } from "@/components/StatCard";
import { VideoCard } from "@/components/VideoCard";
import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { formatBytes } from "@/lib/format";
import { useQuery } from "convex/react";
import {
  Clapperboard,
  Eye,
  Film,
  HardDrive,
  Loader2,
  Play,
  Upload,
} from "lucide-react";
import { Link } from "react-router";

export default function Dashboard() {
  const { user } = useAuth();
  const stats = useQuery(api.videos.getDashboardStats);

  if (stats === undefined) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const firstName = user?.name?.split(/\s+/)[0] ?? "there";

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">
            {new Date().toLocaleDateString(undefined, {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight">
            Welcome back, {firstName}
          </h2>
        </div>
        <Link to="/dashboard/upload">
          <Button>
            <Upload className="mr-2 size-4" />
            Upload video
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total views"
          value={stats.totalViews.toLocaleString()}
          icon={Eye}
          hint={`${stats.uniqueViewers.toLocaleString()} unique viewers`}
        />
        <StatCard
          label="Videos"
          value={stats.totalVideos}
          icon={Clapperboard}
          hint={`${stats.readyVideos} ready to play`}
        />
        <StatCard
          label="Processing"
          value={stats.processingCount}
          icon={Play}
          hint={`${stats.failedCount} failed`}
        />
        <StatCard
          label="Storage used"
          value={formatBytes(stats.storageBytes)}
          icon={HardDrive}
        />
      </div>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Recent uploads</h3>
          {stats.totalVideos > 0 && (
            <Link
              to="/dashboard/videos"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              View all
            </Link>
          )}
        </div>

        {stats.recentUploads.length === 0 ? (
          <EmptyState
            icon={Film}
            title="No videos yet"
            description="Upload your first video and it will appear here once processing finishes."
            action={
              <Link to="/dashboard/upload">
                <Button>
                  <Upload className="mr-2 size-4" />
                  Upload your first video
                </Button>
              </Link>
            }
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {stats.recentUploads.map((video) => (
              <VideoCard key={video._id} video={video} to={`/v/${video.publicId}`} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
