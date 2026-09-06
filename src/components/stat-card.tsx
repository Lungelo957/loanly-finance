import type { LucideIcon } from "lucide-react";

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: string;
  icon?: LucideIcon;
  tone?: "default" | "positive" | "negative" | "gold";
}) {
  const toneClass =
    tone === "positive"
      ? "text-success"
      : tone === "negative"
        ? "text-destructive"
        : tone === "gold"
          ? "text-gold"
          : "text-foreground";
  return (
    <div className="card-surface p-3 sm:p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground sm:text-xs">
          {label}
        </p>
        {Icon ? <Icon className="h-4 w-4 shrink-0 text-muted-foreground" /> : null}
      </div>
      <p className={`mt-2 truncate text-lg font-semibold tabular-nums sm:text-xl ${toneClass}`}>
        {value}
      </p>
    </div>
  );
}
