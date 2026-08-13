import { PageHeader } from "@/components/layout/Shell";
import { StatCard } from "@/components/StatCard";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/convex/_generated/api";
import { formatBytes } from "@/lib/format";
import { useQuery } from "convex/react";
import {
  AlertTriangle,
  CheckCircle2,
  Clapperboard,
  Cpu,
  Eye,
  HardDrive,
  Loader2,
  Play,
  Users,
} from "lucide-react";

export default function AdminOverview() {
  const data = useQuery(api.admin.overview);
  const siteConfig = useQuery(api.settings.getPublicConfig);

  if (!data) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Platform overview"
        description={`Everything happening across your ${siteConfig?.site.name || "Vidood Stream"} deployment.`}
        actions={
          <Badge variant="outline" className="gap-1.5">
            <Cpu className="size-3" />
            Backend: {data.backend === "mux" ? "Mux cloud" : "Browser pipeline"}
          </Badge>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total users" value={data.users} icon={Users} />
        <StatCard label="Total videos" value={data.videos} icon={Clapperboard} hint={`${data.readyVideos} ready`} />
        <StatCard label="Total views" value={data.views.toLocaleString()} icon={Eye} />
        <StatCard label="Storage" value={formatBytes(data.storageBytes)} icon={HardDrive} />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Play className="size-4 text-amber-500" />
              Processing
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tabular-nums">{data.processingVideos}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Videos currently uploading, queued or transcoding.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <AlertTriangle className="size-4 text-destructive" />
              Failed videos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tabular-nums">{data.failedVideos}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Processing jobs that errored and may need attention.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="size-4 text-emerald-500" />
              Failed jobs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tabular-nums">{data.failedJobs}</p>
            <CardDescription>Requeue them from Admin → System.</CardDescription>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
