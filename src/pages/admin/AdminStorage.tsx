import { PageHeader } from "@/components/layout/Shell";
import { StatCard } from "@/components/StatCard";
import { api } from "@/convex/_generated/api";
import { formatBytes } from "@/lib/format";
import { useQuery } from "convex/react";
import { HardDrive, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type StorageRow = NonNullable<
  ReturnType<typeof useQuery<typeof api.admin.storageBreakdown>>
>["perUser"][number];

export default function AdminStorage() {
  const data = useQuery(api.admin.storageBreakdown);

  if (!data) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const maxBytes = Math.max(1, ...data.perUser.map((row: StorageRow) => row.bytes));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Storage"
        description="How much file storage each account is using."
      />

      <StatCard
        label="Total storage in use"
        value={formatBytes(data.totalBytes)}
        icon={HardDrive}
        hint={`${data.perUser.length} account${data.perUser.length === 1 ? "" : "s"} with videos`}
      />

      <div className="rounded-lg border">
        {data.perUser.length === 0 ? (
          <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
            No videos uploaded yet.
          </div>
        ) : (
          <div className="divide-y">
            {data.perUser.map((row: StorageRow) => {
              const percent = Math.max(0.5, (row.bytes / maxBytes) * 100);
              return (
                <div key={row.userId} className="flex items-center gap-4 px-4 py-3">
                  <div className="w-48 min-w-0">
                    <p className="truncate text-sm font-medium">{row.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      @{row.username} · {row.videos} video{row.videos === 1 ? "" : "s"}
                    </p>
                  </div>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-brand transition-all duration-500"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <span className={cn("w-24 text-right text-sm tabular-nums")}>
                    {formatBytes(row.bytes)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        Files are stored in Convex file storage. The storage layer can be moved
        to S3 / R2 / B2 by swapping the helpers in src/convex/lib/storage.ts.
      </p>
    </div>
  );
}
