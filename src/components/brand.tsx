import { Link } from "@tanstack/react-router";
<<<<<<< HEAD
=======
import markAsset from "@/assets/cashflow-mark.png.asset.json";
import fullAsset from "@/assets/cashflow-logo.png.asset.json";
>>>>>>> fa3c5cea69163a1016824b9ac1a2389d5f99783a

export function Logo({ className = "" }: { className?: string }) {
  return (
    <img
<<<<<<< HEAD
      src="/icons/cashflow-icon1.png"
      alt="CashFlow"
      className={`inline-block h-9 w-9 object-contain ${className}`}
=======
      src={markAsset.url}
      alt="CashFlow"
      className={`inline-block h-9 w-auto object-contain ${className}`}
>>>>>>> fa3c5cea69163a1016824b9ac1a2389d5f99783a
    />
  );
}

export function FullLogo({ className = "" }: { className?: string }) {
  return (
    <img
<<<<<<< HEAD
      src="/icons/cashflow-icon1.png"
      alt="CashFlow"
      className={`inline-block h-16 w-16 object-contain ${className}`}
=======
      src={fullAsset.url}
      alt="CashFlow Loan Manager"
      className={`inline-block h-auto object-contain ${className}`}
>>>>>>> fa3c5cea69163a1016824b9ac1a2389d5f99783a
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
