import { useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { BarChart3 } from "lucide-react";
import { PageHeader } from "@/components/app-shell";
import { StatCard } from "@/components/stat-card";
import { EmptyState, ErrorState, LoadingState } from "@/components/state-views";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAccount } from "@/lib/account";
import {
  useBorrowers,
  useCapitalEntries,
  useExpenses,
  useLoans,
  usePayments,
  useRepayments,
} from "@/lib/business-data";
import { computeMetrics } from "@/lib/metrics";
import { formatCurrency, formatDate, formatNumber } from "@/lib/format";

export const Route = createFileRoute("/business/_app/reports")({
  head: () => ({
    meta: [
      { title: "Reports — CashFlow" },
      { name: "description", content: "Loan, borrower, payment, collection and expense reporting." },
      { property: "og:title", content: "Reports — CashFlow" },
      { property: "og:description", content: "Loan, borrower, payment and expense reporting." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ReportsPage,
});

function ReportsPage() {
  const { data: account } = useAccount();
  const businessId = account?.business?.id;

  const borrowers = useBorrowers(businessId);
  const loans = useLoans(businessId);
  const repayments = useRepayments(businessId);
  const payments = usePayments(businessId);
  const expenses = useExpenses(businessId);
  const capital = useCapitalEntries(businessId);

  const queries = [borrowers, loans, repayments, payments, expenses, capital];
  const isLoading = queries.some((q) => q.isLoading);
  const error = queries.find((q) => q.error)?.error;

  const nameByLoan = useMemo(() => {
    const map = new Map<string, string>();
    for (const l of loans.data ?? []) map.set(l.id, l.borrowers?.full_name ?? "Borrower");
    return map;
  }, [loans.data]);

  const byCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of expenses.data ?? []) map.set(e.category, (map.get(e.category) ?? 0) + Number(e.amount));
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [expenses.data]);

  if (isLoading) return <LoadingState label="Building your reports..." />;
  if (error)
    return <ErrorState message="We couldn't build your reports." onRetry={() => queries.forEach((q) => q.refetch())} />;

  const metrics = computeMetrics({
    capital: capital.data ?? [],
    loans: loans.data ?? [],
    repayments: repayments.data ?? [],
    payments: payments.data ?? [],
    expenses: expenses.data ?? [],
  });

  const loanRows = loans.data ?? [];
  const paidByLoan = new Map<string, number>();
  for (const p of payments.data ?? []) paidByLoan.set(p.loan_id, (paidByLoan.get(p.loan_id) ?? 0) + Number(p.amount));

  const loansByBorrower = new Map<string, { count: number; principal: number }>();
  for (const l of loanRows) {
    const current = loansByBorrower.get(l.borrower_id) ?? { count: 0, principal: 0 };
    loansByBorrower.set(l.borrower_id, {
      count: current.count + 1,
      principal: current.principal + Number(l.principal_amount),
    });
  }

  const empty = loanRows.length === 0 && (payments.data ?? []).length === 0 && (expenses.data ?? []).length === 0;

  return (
    <div>
      <PageHeader title="Reports" description="Everything below is calculated from your records." />

      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
        <StatCard label="Principal lent" value={formatCurrency(loanRows.reduce((a, l) => a + Number(l.principal_amount), 0))} />
        <StatCard label="Interest booked" value={formatCurrency(loanRows.reduce((a, l) => a + Number(l.total_interest), 0))} />
        <StatCard label="Collected" value={formatCurrency(metrics.totalCollected)} tone="positive" />
        <StatCard label="Net cash flow" value={formatCurrency(metrics.netCashFlow)} tone={metrics.netCashFlow < 0 ? "negative" : "positive"} />
      </div>

      {empty ? (
        <div className="mt-8">
          <EmptyState
            icon={<BarChart3 className="h-8 w-8" />}
            title="Nothing to report yet"
            description="Once you record loans, payments and expenses your reports fill in automatically."
          />
        </div>
      ) : (
        <Tabs defaultValue="loans" className="mt-8">
          <TabsList className="w-full overflow-x-auto sm:w-auto">
            <TabsTrigger value="loans">Loans</TabsTrigger>
            <TabsTrigger value="borrowers">Borrowers</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
            <TabsTrigger value="collections">Collections</TabsTrigger>
            <TabsTrigger value="expenses">Expenses</TabsTrigger>
            <TabsTrigger value="summary">Summary</TabsTrigger>
          </TabsList>

          <TabsContent value="loans" className="mt-4">
            <ReportTable
              head={["Borrower", "Principal", "Repayable", "Collected", "Status"]}
              rows={loanRows.map((l) => [
                l.borrowers?.full_name ?? "—",
                formatCurrency(Number(l.principal_amount)),
                formatCurrency(Number(l.total_repayable)),
                formatCurrency(paidByLoan.get(l.id) ?? 0),
                l.status,
              ])}
            />
          </TabsContent>

          <TabsContent value="borrowers" className="mt-4">
            <ReportTable
              head={["Borrower", "Loans", "Principal", "Monthly income"]}
              rows={(borrowers.data ?? []).map((b) => [
                b.full_name,
                formatNumber(loansByBorrower.get(b.id)?.count ?? 0),
                formatCurrency(loansByBorrower.get(b.id)?.principal ?? 0),
                formatCurrency(Number(b.monthly_income)),
              ])}
            />
          </TabsContent>

          <TabsContent value="payments" className="mt-4">
            <ReportTable
              head={["Date", "Borrower", "Reference", "Amount"]}
              rows={(payments.data ?? []).map((p) => [
                formatDate(p.payment_date),
                nameByLoan.get(p.loan_id) ?? "—",
                p.reference || "—",
                formatCurrency(Number(p.amount)),
              ])}
            />
          </TabsContent>

          <TabsContent value="collections" className="mt-4">
            <ReportTable
              head={["Due date", "Borrower", "Due", "Paid", "Status"]}
              rows={(repayments.data ?? []).map((r) => [
                formatDate(r.due_date),
                nameByLoan.get(r.loan_id) ?? "—",
                formatCurrency(Number(r.amount_due)),
                formatCurrency(Number(r.amount_paid)),
                r.status,
              ])}
            />
          </TabsContent>

          <TabsContent value="expenses" className="mt-4">
            <ReportTable
              head={["Category", "Total"]}
              rows={byCategory.map(([category, amount]) => [category, formatCurrency(amount)])}
            />
          </TabsContent>

          <TabsContent value="summary" className="mt-4">
            <ReportTable
              head={["Measure", "Value"]}
              rows={[
                ["Total capital", formatCurrency(metrics.totalCapital)],
                ["Capital deployed", formatCurrency(metrics.capitalDeployed)],
                ["Available capital", formatCurrency(metrics.availableCapital)],
                ["Outstanding balance", formatCurrency(metrics.outstandingBalance)],
                ["Total collected", formatCurrency(metrics.totalCollected)],
                ["Total expenses", formatCurrency(metrics.totalExpenses)],
                ["Net cash flow", formatCurrency(metrics.netCashFlow)],
                ["Active loans", formatNumber(metrics.activeLoans)],
                ["Overdue loans", formatNumber(metrics.overdueLoans)],
              ]}
            />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

function ReportTable({ head, rows }: { head: string[]; rows: (string | number)[][] }) {
  if (rows.length === 0) {
    return (
      <EmptyState
        icon={<BarChart3 className="h-8 w-8" />}
        title="No data in this report"
        description="Records you add will appear here automatically."
      />
    );
  }
  return (
    <div className="card-surface overflow-x-auto">
      <table className="w-full min-w-[520px] text-sm">
        <thead className="bg-muted text-left text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            {head.map((h) => (
              <th key={h} className="px-4 py-2 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-t border-border">
              {row.map((cell, j) => (
                <td key={j} className="px-4 py-2.5 capitalize tabular-nums">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
