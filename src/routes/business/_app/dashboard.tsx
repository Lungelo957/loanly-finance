import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  Banknote,
  HandCoins,
  PiggyBank,
  Receipt,
  ScrollText,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { PageHeader } from "@/components/app-shell";
import { StatCard } from "@/components/stat-card";
import { LoadingState, ErrorState, EmptyState } from "@/components/state-views";
import { Button } from "@/components/ui/button";
import { useAccount } from "@/lib/account";
import {
  useCapitalEntries,
  useExpenses,
  useLoans,
  usePayments,
  useRepayments,
} from "@/lib/business-data";
import { computeMetrics } from "@/lib/metrics";
import { formatCurrency, formatDate, formatNumber } from "@/lib/format";

export const Route = createFileRoute("/business/_app/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — CashFlow" },
      { name: "description", content: "Your live lending performance at a glance." },
      { property: "og:title", content: "Dashboard — CashFlow" },
      { property: "og:description", content: "Your live lending performance at a glance." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const { data: account } = useAccount();
  const businessId = account?.business?.id;

  const capital = useCapitalEntries(businessId);
  const loans = useLoans(businessId);
  const repayments = useRepayments(businessId);
  const payments = usePayments(businessId);
  const expenses = useExpenses(businessId);

  const queries = [capital, loans, repayments, payments, expenses];
  const isLoading = queries.some((q) => q.isLoading);
  const error = queries.find((q) => q.error)?.error;

  if (isLoading) return <LoadingState label="Loading dashboard..." />;
  if (error)
    return (
      <ErrorState
        message="We couldn't load your dashboard figures."
        onRetry={() => queries.forEach((q) => q.refetch())}
      />
    );

  const metrics = computeMetrics({
    capital: capital.data ?? [],
    loans: loans.data ?? [],
    repayments: repayments.data ?? [],
    payments: payments.data ?? [],
    expenses: expenses.data ?? [],
  });

  const recentLoans = (loans.data ?? []).slice(0, 5);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div>
      <PageHeader
        title={greeting}
        description={`${account?.business?.name ?? "Your business"} · ${formatCurrency(metrics.outstandingBalance)} outstanding across ${formatNumber(metrics.activeLoans)} active loans.`}
      />

      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
        <StatCard label="Total capital" value={formatCurrency(metrics.totalCapital)} icon={PiggyBank} />
        <StatCard
          label="Available capital"
          value={formatCurrency(metrics.availableCapital)}
          icon={Wallet}
          tone={metrics.availableCapital < 0 ? "negative" : "default"}
        />
        <StatCard label="Capital deployed" value={formatCurrency(metrics.capitalDeployed)} icon={HandCoins} />
        <StatCard
          label="Outstanding balance"
          value={formatCurrency(metrics.outstandingBalance)}
          icon={Receipt}
          tone="gold"
        />
        <StatCard label="Total collected" value={formatCurrency(metrics.totalCollected)} icon={Banknote} tone="positive" />
        <StatCard label="Total expenses" value={formatCurrency(metrics.totalExpenses)} icon={ScrollText} />
        <StatCard
          label="Net cash flow"
          value={formatCurrency(metrics.netCashFlow)}
          icon={TrendingUp}
          tone={metrics.netCashFlow < 0 ? "negative" : "positive"}
        />
        <StatCard label="Active borrowers" value={formatNumber(metrics.activeBorrowers)} icon={Users} />
        <StatCard label="Active loans" value={formatNumber(metrics.activeLoans)} icon={HandCoins} />
        <StatCard
          label="Overdue loans"
          value={formatNumber(metrics.overdueLoans)}
          icon={AlertTriangle}
          tone={metrics.overdueLoans > 0 ? "negative" : "default"}
        />
        <StatCard label="Overdue amount" value={formatCurrency(metrics.overdueAmount)} tone={metrics.overdueAmount > 0 ? "negative" : "default"} />
        <StatCard label="Due next 7 days" value={formatCurrency(metrics.dueThisWeek)} />
      </div>

      <div className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recent loans</h2>
          <Button asChild variant="ghost" size="sm">
            <Link to="/business/loans">View all</Link>
          </Button>
        </div>

        {recentLoans.length === 0 ? (
          <EmptyState
            icon={<HandCoins className="h-8 w-8" />}
            title="No loans yet"
            description="Add a borrower, then create your first loan to start tracking repayments."
            action={
              <Button asChild size="sm">
                <Link to="/business/borrowers">Add a borrower</Link>
              </Button>
            }
          />
        ) : (
          <div className="card-surface divide-y divide-border">
            {recentLoans.map((loan) => (
              <div key={loan.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{loan.borrowers?.full_name ?? "Borrower"}</p>
                  <p className="text-xs text-muted-foreground">
                    Started {formatDate(loan.start_date)} · {loan.status}
                  </p>
                </div>
                <p className="text-sm font-semibold tabular-nums">{formatCurrency(Number(loan.principal_amount))}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
