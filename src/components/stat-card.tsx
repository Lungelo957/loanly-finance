import type { LucideIcon } from "lucide-react";

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = "default",
  hint,
}: {
  label: string;
  value: string;
  icon?: LucideIcon;
  tone?: "default" | "positive" | "negative" | "gold";
  hint?: string;
}) {
  const toneClass =
    tone === "positive"
      ? "text-success"
      : tone === "negative"
        ? "text-destructive"
        : "text-foreground";
  return (
    <div
      className={`card-surface relative overflow-hidden p-3.5 transition-shadow hover:shadow-lift sm:p-5 ${
        tone === "gold" ? "border-gold/40" : ""
      }`}
    >
      {tone === "gold" ? <span className="absolute inset-x-0 top-0 h-0.5 gold-gradient" /> : null}
      <div className="flex items-center gap-2.5">
        {Icon ? (
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-accent text-accent-foreground sm:h-8 sm:w-8">
            <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </span>
        ) : null}
        <p className="min-w-0 truncate text-[11px] font-medium text-muted-foreground sm:text-xs">{label}</p>
      </div>
      <p className={`mt-3 truncate text-lg font-semibold tabular-nums tracking-tight sm:text-2xl ${toneClass}`}>
        {value}
      </p>
      {hint ? <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
