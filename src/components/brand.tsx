import { Link } from "@tanstack/react-router";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex h-9 w-9 items-center justify-center rounded-xl gold-gradient ${className}`}>
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 18V9" />
        <path d="M10 18V5" />
        <path d="M16 18v-7" />
        <path d="M3 21h18" />
      </svg>
    </span>
  );
}

export function BrandMark({ to = "/", subtitle }: { to?: string; subtitle?: string }) {
  return (
    <Link to={to} className="inline-flex items-center gap-3">
      <Logo className="text-gold-foreground" />
      <span className="leading-tight">
        <span className="block font-display text-lg font-semibold tracking-tight">CashFlow</span>
        {subtitle ? (
          <span className="block text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{subtitle}</span>
        ) : null}
      </span>
    </Link>
  );
}
