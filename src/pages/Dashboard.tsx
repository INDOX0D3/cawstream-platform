import { EmptyState } from "@/components/EmptyState";
import { StatCard } from "@/components/StatCard";
import { UpgradeDialog } from "@/components/UpgradeDialog";
import { VideoCard } from "@/components/VideoCard";
import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { formatBytes } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { useQuery } from "convex/react";
import {
  Clapperboard,
  Crown,
  Eye,
  Film,
  HardDrive,
  Loader2,
  Play,
  Upload,
} from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { cn } from "@/lib/utils";

const PLAN_NAME: Record<string, string> = {
  free: "Free",
  premium: "Premium",
  platinum: "Platinum",
};

export default function Dashboard() {
  const { user } = useAuth();
  const { t } = useI18n();
  const stats = useQuery(api.videos.getDashboardStats);
  const usage = useQuery(api.videos.getUsage);
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  if (stats === undefined) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const firstName = user?.name?.split(/\s+/)[0] ?? "there";
  const plan = usage?.plan ?? "free";
  const limitBytes = usage?.limitBytes ?? null;
  const usedBytes = usage?.usedBytes ?? 0;
  const freePct = limitBytes ? Math.min(100, (usedBytes / limitBytes) * 100) : 0;
  const limitReached = limitBytes !== null && freePct >= 100;

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
            {t("dash.welcomeBack", { name: firstName })}
          </h2>
        </div>
        <Link to="/dashboard/upload">
          <Button>
            <Upload className="mr-2 size-4" />
            {t("dash.uploadVideo")}
          </Button>
        </Link>
      </div>

      {/* Plan usage banner (free accounts) */}
      {plan === "free" && limitBytes !== null && (
        <div
          className={cn(
            "flex flex-wrap items-center gap-3 rounded-lg border px-4 py-3",
            limitReached
              ? "border-destructive/30 bg-destructive/5"
              : "border-border bg-card",
          )}
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand/15 text-brand">
            <Crown className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2 text-sm">
              <p className="font-medium">
                {limitReached ? t("dash.planUsageFull") : t("dash.planFree")}
              </p>
              <p className="text-xs text-muted-foreground">
                {t("dash.planUsage", {
                  used: formatBytes(usedBytes),
                  limit: formatBytes(limitBytes),
                })}
              </p>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  limitReached ? "bg-destructive" : "bg-brand",
                )}
                style={{ width: `${Math.max(2, freePct)}%` }}
              />
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">{t("dash.planBenefits")}</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setUpgradeOpen(true)}>
            {t("dash.upgrade")}
          </Button>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={t("dash.totalViews")}
          value={stats.totalViews.toLocaleString()}
          icon={Eye}
          hint={t("dash.uniqueHint", { n: stats.uniqueViewers.toLocaleString() })}
        />
        <StatCard
          label={t("dash.videos")}
          value={stats.totalVideos}
          icon={Clapperboard}
          hint={t("dash.readyHint", { n: stats.readyVideos })}
        />
        <StatCard
          label={t("dash.processing")}
          value={stats.processingCount}
          icon={Play}
          hint={t("dash.failedHint", { n: stats.failedCount })}
        />
        <StatCard
          label={t("dash.storage")}
          value={formatBytes(stats.storageBytes)}
          icon={HardDrive}
        />
      </div>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold">{t("dash.recentUploads")}</h3>
          {stats.totalVideos > 0 && (
            <Link
              to="/dashboard/videos"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {t("dash.viewAll")}
            </Link>
          )}
        </div>

        {stats.recentUploads.length === 0 ? (
          <EmptyState
            icon={Film}
            title={t("dash.noVideos")}
            description={t("dash.noVideosDesc")}
            action={
              <Link to="/dashboard/upload">
                <Button>
                  <Upload className="mr-2 size-4" />
                  {t("dash.uploadFirst")}
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

      <UpgradeDialog open={upgradeOpen} onOpenChange={setUpgradeOpen} />
    </div>
  );
}
