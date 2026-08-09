import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  icon: Icon,
  hint,
  className,
}: {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  hint?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border bg-card px-5 py-4",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-[13px] font-medium text-muted-foreground">{label}</p>
        {Icon && <Icon className="size-4 text-muted-foreground/70" />}
      </div>
      <p className="mt-1.5 text-2xl font-semibold tracking-tight tabular-nums">
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
