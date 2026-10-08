import { useState, type ReactNode } from "react";
import { Link, useRouter, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { LogOut, Menu, MoreHorizontal, X, type LucideIcon } from "lucide-react";
import { BrandMark } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { signOutAndRedirect } from "@/lib/account";
import { SiteCredit } from "@/components/site-credit";

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

function isActive(pathname: string, to: string) {
  return pathname === to || pathname.startsWith(`${to}/`);
}

export function AppShell({
  items,
  portal,
  userLabel,
  signOutTo,
  children,
}: {
  items: NavItem[];
  portal: string;
  userLabel: string;
  signOutTo: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const handleSignOut = () =>
    signOutAndRedirect(queryClient, () =>
      router.navigate({ to: signOutTo as never, replace: true }),
    );

  const current = items.find((i) => isActive(pathname, i.to));
  const bottomItems = items.slice(0, 4);
  const initial = (userLabel || portal).charAt(0).toUpperCase();

  const nav = (
    <nav aria-label="Main" className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 py-4">
      {items.map((item) => {
        const active = isActive(pathname, item.to);
        return (
          <Link
            key={item.to}
            to={item.to as never}
            onClick={() => setOpen(false)}
            aria-current={active ? "page" : undefined}
            className={`group relative flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
              active
                ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                : "text-sidebar-foreground/75 hover:bg-secondary hover:text-sidebar-accent-foreground"
            }`}
          >
            <span
              className={`absolute inset-y-1.5 left-0 w-[3px] rounded-full bg-sidebar-primary transition-opacity ${
                active ? "opacity-100" : "opacity-0"
              }`}
            />
            <item.icon
              className={`h-[18px] w-[18px] shrink-0 ${active ? "text-sidebar-primary" : "text-muted-foreground group-hover:text-foreground"}`}
            />
            <span className="truncate">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );

  const sidebarBody = (
    <>
      <div className="flex items-center justify-between px-5 py-5">
        <BrandMark to="/" />
        <button
          className="rounded-md p-1 text-muted-foreground hover:text-foreground lg:hidden"
          aria-label="Close menu"
          onClick={() => setOpen(false)}
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="mx-5 rounded-md border border-sidebar-border bg-background px-3 py-2">
        <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">Workspace</p>
        <p className="truncate text-sm font-medium">{portal}</p>
      </div>
      {nav}
      <div className="border-t border-sidebar-border p-3">
        <div className="flex items-center gap-3 px-2 pb-2">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">
            {initial}
          </span>
          <p className="min-w-0 truncate text-xs text-muted-foreground">{userLabel}</p>
        </div>
        <button
          onClick={handleSignOut}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-foreground/80 transition-colors hover:bg-destructive/10 hover:text-destructive"
        >
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen w-full bg-background">
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
        {sidebarBody}
      </aside>

      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
          <div
            className="absolute inset-0 bg-foreground/30 backdrop-blur-[2px] animate-in fade-in-0"
            onClick={() => setOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 flex w-72 max-w-[85%] flex-col bg-sidebar shadow-lift animate-in slide-in-from-left duration-200">
            {sidebarBody}
          </aside>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col lg:pl-64">
        <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur">
          <div className="flex h-14 items-center gap-3 px-4 sm:px-6 lg:h-16 lg:px-8">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              aria-label="Open menu"
              onClick={() => setOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div className="lg:hidden">
              <BrandMark to="/" />
            </div>
            <div className="hidden min-w-0 lg:block">
              <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{portal}</p>
              <p className="truncate text-sm font-medium">{current?.label ?? ""}</p>
            </div>
            <div className="ml-auto hidden items-center gap-3 lg:flex">
              <span className="max-w-[220px] truncate text-xs text-muted-foreground">{userLabel}</span>
              <span className="grid h-8 w-8 place-items-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">
                {initial}
              </span>
            </div>
          </div>
        </header>
        <main
          key={pathname}
          className="page-enter mx-auto w-full min-w-0 max-w-7xl flex-1 px-4 pb-24 pt-6 sm:px-6 lg:px-8 lg:pb-10 lg:pt-8"
        >
          {children}
        </main>
      </div>

      {/* Mobile bottom navigation */}
      <nav
        aria-label="Quick"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur lg:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="grid grid-cols-5">
          {bottomItems.map((item) => {
            const active = isActive(pathname, item.to);
            return (
              <Link
                key={item.to}
                to={item.to as never}
                aria-current={active ? "page" : undefined}
                className={`flex flex-col items-center gap-1 py-2 text-[10px] font-medium ${
                  active ? "text-gold" : "text-muted-foreground"
                }`}
              >
                <item.icon className="h-5 w-5" />
                <span className="max-w-full truncate px-1">{item.label}</span>
              </Link>
            );
          })}
          <button
            onClick={() => setOpen(true)}
            className="flex flex-col items-center gap-1 py-2 text-[10px] font-medium text-muted-foreground"
          >
            <MoreHorizontal className="h-5 w-5" />
            More
          </button>
        </div>
      </nav>
    </div>
  );
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-[28px]">{title}</h1>
        {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {action ? <div className="flex shrink-0 flex-wrap gap-2">{action}</div> : null}
    </div>
  );
}

export function SectionHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="text-base font-semibold sm:text-lg">{title}</h2>
      {action}
    </div>
  );
}
