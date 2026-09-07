import { useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Receipt } from "lucide-react";
import { PageHeader } from "@/components/app-shell";
import { StatCard } from "@/components/stat-card";
import { EmptyState, ErrorState, LoadingState } from "@/components/state-views";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAccount } from "@/lib/account";
import { useLoans, usePayments, useRepayments } from "@/lib/business-data";
import { formatCurrency, formatDate } from "@/lib/format";

export const Route = createFileRoute("/business/_app/collections")({
  head: () => ({
    meta: [
      { title: "Collections — CashFlow" },
      { name: "description", content: "See what is due, overdue and already collected." },
      { property: "og:title", content: "Collections — CashFlow" },
      { property: "og:description", content: "See what is due, overdue and already collected." },
    ],
  }),
  component: CollectionsPage,
});

function CollectionsPage() {
  const { data: account } = useAccount();
  const businessId = account?.business?.id;
  const repayments = useRepayments(businessId);
  const loans = useLoans(businessId);
  const payments = usePayments(businessId);

  const nameByLoan = useMemo(() => {
    const map = new Map<string, string>();
    for (const l of loans.data ?? []) map.set(l.id, l.borrowers?.full_name ?? "Borrower");
    return map;
  }, [loans.data]);

  const today = new Date().toISOString().slice(0, 10);
  const rows = repayments.data ?? [];
  const outstanding = rows.filter((r) => Number(r.amount_paid) < Number(r.amount_due));
  const overdue = outstanding.filter((r) => r.due_date < today);
  const dueToday = outstanding.filter((r) => r.due_date === today);
  const upcoming = outstanding.filter((r) => r.due_date > today);
  const collected = payments.data ?? [];

  if (repayments.isLoading) return <LoadingState label="Loading collections..." />;
  if (repayments.error)
    return <ErrorState message="We couldn't load your collections." onRetry={() => repayments.refetch()} />;

  const remaining = (r: (typeof rows)[number]) => Number(r.amount_due) - Number(r.amount_paid);
  const sum = (list: typeof rows) => list.reduce((a, r) => a + remaining(r), 0);

  return (
    <div>
      <PageHeader title="Collections" description="What's due, what's late and what's in." />

      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
        <StatCard label="Overdue" value={formatCurrency(sum(overdue))} tone={overdue.length ? "negative" : "default"} />
        <StatCard label="Due today" value={formatCurrency(sum(dueToday))} tone="gold" />
        <StatCard label="Upcoming" value={formatCurrency(sum(upcoming))} />
        <StatCard
          label="Collected to date"
          value={formatCurrency(collected.reduce((a, p) => a + Number(p.amount), 0))}
          tone="positive"
        />
      </div>

      <Tabs defaultValue="overdue" className="mt-8">
        <TabsList className="w-full overflow-x-auto sm:w-auto">
          <TabsTrigger value="overdue">Overdue ({overdue.length})</TabsTrigger>
          <TabsTrigger value="today">Due today ({dueToday.length})</TabsTrigger>
          <TabsTrigger value="upcoming">Upcoming ({upcoming.length})</TabsTrigger>
          <TabsTrigger value="collected">Collected ({collected.length})</TabsTrigger>
        </TabsList>

        {(
          [
            ["overdue", overdue, "Nothing overdue", "Every instalment is up to date."],
            ["today", dueToday, "Nothing due today", "No instalments fall due today."],
            ["upcoming", upcoming, "Nothing upcoming", "There are no future instalments scheduled."],
          ] as const
        ).map(([value, list, title, description]) => (
          <TabsContent key={value} value={value} className="mt-4">
            {list.length === 0 ? (
              <EmptyState icon={<Receipt className="h-8 w-8" />} title={title} description={description} />
            ) : (
              <div className="card-surface divide-y divide-border">
                {list.map((r) => (
                  <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{nameByLoan.get(r.loan_id) ?? "Loan"}</p>
                      <p className="text-xs text-muted-foreground">
                        Instalment {r.installment_number} · due {formatDate(r.due_date)}
                      </p>
                    </div>
                    <p className="text-sm font-semibold tabular-nums">{formatCurrency(remaining(r))}</p>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        ))}

        <TabsContent value="collected" className="mt-4">
          {collected.length === 0 ? (
            <EmptyState
              icon={<Receipt className="h-8 w-8" />}
              title="No payments collected yet"
              description="Recorded payments will show up here."
            />
          ) : (
            <div className="card-surface divide-y divide-border">
              {collected.map((p) => (
                <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{nameByLoan.get(p.loan_id) ?? "Loan"}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(p.payment_date)}</p>
                  </div>
                  <p className="text-sm font-semibold tabular-nums text-success">
                    {formatCurrency(Number(p.amount))}
                  </p>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
