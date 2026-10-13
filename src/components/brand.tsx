import { Link } from "@tanstack/react-router";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <img
      src="/icons/cashflow-icon1.png"
      alt="CashFlow"
      className={`inline-block h-9 w-9 object-contain ${className}`}
    />
  );
}

export function FullLogo({ className = "" }: { className?: string }) {
  return (
    <img
      src="/icons/cashflow-icon1.png"
      alt="CashFlow"
      className={`inline-block h-16 w-16 object-contain ${className}`}
    />
  );
}

export function BrandMark({ to = "/", subtitle }: { to?: string; subtitle?: string }) {
  return (
    <Link to={to} className="inline-flex items-center gap-3">
      <Logo />
      <span className="leading-tight">
        <span className="block font-display text-lg font-semibold tracking-tight">CashFlow</span>
        {subtitle ? (
          <span className="block text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{subtitle}</span>
        ) : null}
      </span>
    </Link>
  );
}
