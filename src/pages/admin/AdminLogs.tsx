import { PageHeader } from "@/components/layout/Shell";
import { Badge } from "@/components/ui/badge";
import { useApiQuery } from "@/hooks/use-api";
import { formatDateTime } from "@/lib/format";
import type { LogEntry } from "@/lib/types";
import { Loader2, ScrollText } from "lucide-react";
import { cn } from "@/lib/utils";

const LEVEL_STYLES: Record<string, string> = {
  info: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  warning: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  error: "bg-red-500/15 text-red-700 dark:text-red-300",
};

export default function AdminLogs() {
  const logs = useApiQuery<LogEntry[]>("admin/listLogs");

  if (logs === undefined) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="System logs"
        description="Operational events: processing, uploads, admin actions and mail."
      />

      <div className="overflow-hidden rounded-lg border">
        {logs.length === 0 ? (
          <div className="flex h-40 flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
            <ScrollText className="size-8 opacity-50" />
            No events logged yet.
          </div>
        ) : (
          <div className="divide-y">
            {logs.map((log: LogEntry) => (
              <div key={log._id} className="flex items-start gap-3 px-4 py-3">
                <Badge
                  variant="outline"
                  className={cn(
                    "mt-0.5 w-16 justify-center uppercase",
                    LEVEL_STYLES[log.level] ?? "",
                  )}
                >
                  {log.level}
                </Badge>
                <div className="min-w-0 flex-1">
                  <p className="text-sm">{log.message}</p>
                  {log.context && (
                    <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                      {log.context}
                    </p>
                  )}
                  <p className="mt-0.5 text-xs text-muted-foreground/70">
                    {log.source}
                  </p>
                </div>
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                  {formatDateTime(log.createdAt)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
