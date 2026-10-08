import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { FullLogo } from "@/components/brand";
import { SiteCredit } from "@/components/site-credit";

export function AuthLayout({
  title,
  subtitle,
  children,
  footer,
  portal,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
  portal?: string;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-10">
        <div className="mb-6 flex flex-col items-center gap-2">
          <Link to="/" aria-label="CashFlow home">
            <FullLogo className="w-44 sm:w-52" />
          </Link>
          {portal ? (
            <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{portal}</span>
          ) : null}
        </div>
        <div className="card-surface relative overflow-hidden p-6 shadow-lift sm:p-8 page-enter">
          <span className="absolute inset-x-0 top-0 h-1 gold-gradient" />
          <h1 className="text-2xl font-semibold">{title}</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>
          <div className="mt-6">{children}</div>
        </div>
        {footer ? <div className="mt-6 text-center text-sm text-muted-foreground">{footer}</div> : null}
      </div>
      <footer className="mx-auto w-full max-w-lg px-5 pb-6"><SiteCredit /></footer>
    </div>
  );
}
