import { PageHeader } from "@/components/layout/Shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useApiMutation, useApiQuery } from "@/hooks/use-api";
import { formatDateTime } from "@/lib/format";
import type { FailedJob, SystemStatus } from "@/lib/types";
import { CheckCircle2, Cpu, Loader2, RefreshCw, Server, XCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function AdminSystem() {
  const status = useApiQuery<SystemStatus>("admin/systemStatus");
  const failedJobs = useApiQuery<FailedJob[]>("jobs/listFailedJobs");
  const retryJob = useApiMutation("jobs/retryJob");
  const [retryingId, setRetryingId] = useState<string | null>(null);

  const retry = async (jobId: string) => {
    setRetryingId(jobId);
    try {
      await retryJob({ jobId });
      toast.success("Job requeued");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not requeue job");
    } finally {
      setRetryingId(null);
    }
  };

  if (!status) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const env = [
    { label: "SQLite database", ok: true },
    { label: "SMTP relay configured", ok: status.environment.smtpConfigured },
    { label: "SMTP verified (test email)", ok: status.environment.smtpVerified },
    { label: "Media storage (local disk)", ok: true },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="System"
        description="Deployment health, environment and processing jobs."
        actions={
          <span className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
            <Cpu className="size-3" />
            {status.backend === "mux" ? "Mux backend" : "Browser backend"}
          </span>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Server className="size-4 text-muted-foreground" />
              Environment
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {env.map((item) => (
              <div key={item.label} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{item.label}</span>
                {item.ok ? (
                  <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="size-4" /> Configured
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <XCircle className="size-4" /> Not set
                  </span>
                )}
              </div>
            ))}
            <div className="flex items-center justify-between border-t pt-3 text-sm">
              <span className="text-muted-foreground">Server port</span>
              <span className="font-medium">{status.environment.port}</span>
            </div>
            <div className="flex items-center justify-between border-t pt-3 text-sm">
              <span className="text-muted-foreground">Storage backend</span>
              <span className="max-w-[260px] text-right text-xs">{status.storageBackend}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Counts</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {(
              [
                ["Users", status.counts.users],
                ["Videos", status.counts.videos],
                ["Views", status.counts.views],
                ["Jobs", status.counts.jobs],
                ["Settings", status.counts.settings],
                ["Logs", status.counts.logs],
              ] as const
            ).map(([label, value]) => (
              <div key={label} className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="mt-1 text-xl font-semibold tabular-nums">{value}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Failed processing jobs</CardTitle>
          <CardDescription>
            Jobs that errored. Requeue resets the job and returns its video to
            the queue.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Video</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Attempts</TableHead>
                <TableHead>Error</TableHead>
                <TableHead>Failed at</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {failedJobs === undefined ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-16 text-center text-muted-foreground">
                    Loading…
                  </TableCell>
                </TableRow>
              ) : failedJobs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-16 text-center text-muted-foreground">
                    No failed jobs — the queue is healthy.
                  </TableCell>
                </TableRow>
              ) : (
                failedJobs.map((job: FailedJob) => (
                  <TableRow key={job.jobId}>
                    <TableCell className="text-sm">
                      {job.video ? (
                        <span className="block max-w-[220px] truncate font-medium">
                          {job.video.title}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">video deleted</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs uppercase text-muted-foreground">
                      {job.jobType}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{job.attempts}</TableCell>
                    <TableCell className="max-w-[280px]">
                      <p className={cn("line-clamp-2 text-xs text-destructive")}>
                        {job.lastError ?? "Unknown error"}
                      </p>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {job.completedAt ? formatDateTime(job.completedAt) : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={retryingId === job.jobId}
                        onClick={() => void retry(job.jobId)}
                      >
                        {retryingId === job.jobId ? (
                          <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                        ) : (
                          <RefreshCw className="mr-1.5 size-3.5" />
                        )}
                        Requeue
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
