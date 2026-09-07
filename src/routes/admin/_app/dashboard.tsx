import { createFileRoute, Link } from "@tanstack/react-router";
import { Building2, HandCoins, LifeBuoy, Users } from "lucide-react";
import { PageHeader } from "@/components/app-shell";
import { StatCard } from "@/components/stat-card";
import { ErrorState, LoadingState } from "@/components/state-views";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAllBusinesses, useAllTickets, usePlatformTotals } from "@/lib/admin-data";
import { formatCurrency, formatDate, formatNumber } from "@/lib/format";

export const Route = createFileRoute("/admin/_app/dashboard")({
  head: () => ({
    meta: [
      { title: "Admin dashboard — CashFlow" },
      { name: "description", content: "Platform-wide activity across every CashFlow business." },
      { property: "og:title", content: "Admin dashboard — CashFlow" },
      { property: "og:description", content: "Platform-wide activity across every CashFlow business." },
    ],
  }),
  component: AdminDashboard,
});

function AdminDashboard() {
  const businesses = useAllBusinesses();
  const tickets = useAllTickets();
  const totals = usePlatformTotals();

  if (businesses.isLoading || totals.isLoading) return <LoadingState label="Loading platform stats..." />;
  if (businesses.error || totals.error)
    return (
      <ErrorState
        message="We couldn't load the platform statistics."
        onRetry={() => {
          businesses.refetch();
          totals.refetch();
        }}
      />
    );

  const rows = businesses.data ?? [];
  const pending = rows.filter((b) => b.status === "pending");
  const active = rows.filter((b) => b.status === "active" || b.status === "approved");
  const openTickets = (tickets.data ?? []).filter((t) => t.status === "open" || t.status === "in_progress");

  return (
    <div>
      <PageHeader title="Platform overview" description="Live figures across every business on CashFlow." />

      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
        <StatCard label="Businesses" value={formatNumber(rows.length)} icon={Building2} />
        <StatCard label="Awaiting approval" value={formatNumber(pending.length)} tone="gold" />
        <StatCard label="Active businesses" value={formatNumber(active.length)} tone="positive" />
        <StatCard label="Open tickets" value={formatNumber(openTickets.length)} icon={LifeBuoy} />
        <StatCard label="Borrowers" value={formatNumber(totals.data?.borrowerCount ?? 0)} icon={Users} />
        <StatCard label="Loans" value={formatNumber(totals.data?.loanCount ?? 0)} icon={HandCoins} />
        <StatCard label="Principal lent" value={formatCurrency(totals.data?.principal ?? 0)} />
        <StatCard label="Collected" value={formatCurrency(totals.data?.collected ?? 0)} tone="positive" />
      </div>

      <div className="mt-8">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Awaiting approval</h2>
          <Button asChild variant="outline" size="sm">
            <Link to="/admin/businesses">Manage businesses</Link>
          </Button>
        </div>
        {pending.length === 0 ? (
          <p className="card-surface px-4 py-6 text-sm text-muted-foreground">
            No businesses are waiting for approval right now.
          </p>
        ) : (
          <div className="card-surface divide-y divide-border">
            {pending.map((b) => (
              <div key={b.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{b.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {b.location || "No location"} · registered {formatDate(b.created_at)}
                  </p>
                </div>
                <Badge variant="secondary" className="capitalize">
                  {b.status}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
