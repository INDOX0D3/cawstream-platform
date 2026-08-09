import { cn } from "@/lib/utils";

const VIDEO_STYLES: Record<string, { dot: string; text: string }> = {
  uploading: { dot: "bg-sky-500/80", text: "text-sky-700 dark:text-sky-300" },
  queued: { dot: "bg-amber-500/80", text: "text-amber-700 dark:text-amber-300" },
  processing: { dot: "bg-amber-500/80", text: "text-amber-700 dark:text-amber-300" },
  ready: { dot: "bg-emerald-500/80", text: "text-emerald-700 dark:text-emerald-300" },
  failed: { dot: "bg-red-500/80", text: "text-red-700 dark:text-red-300" },
};

const ACCOUNT_STYLES: Record<string, { dot: string; text: string }> = {
  active: { dot: "bg-emerald-500/80", text: "text-emerald-700 dark:text-emerald-300" },
  suspended: { dot: "bg-red-500/80", text: "text-red-700 dark:text-red-300" },
};

export function StatusBadge({
  status,
  kind = "video",
  className,
}: {
  status: string;
  kind?: "video" | "account";
  className?: string;
}) {
  const styles = kind === "account" ? ACCOUNT_STYLES : VIDEO_STYLES;
  const s = styles[status] ?? { dot: "bg-muted-foreground/50", text: "text-muted-foreground" };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize",
        "border-border/70 bg-muted/30",
        s.text,
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full", s.dot)} />
      {status}
    </span>
  );
}
