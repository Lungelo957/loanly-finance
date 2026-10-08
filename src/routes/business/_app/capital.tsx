import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { PiggyBank, Plus } from "lucide-react";
import { PageHeader } from "@/components/app-shell";
import { StatCard } from "@/components/stat-card";
import { EmptyState, ErrorState, LoadingState } from "@/components/state-views";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/lib/account";
import {
  friendlyError,
  useBusinessInvalidate,
  useCapitalEntries,
  useExpenses,
  useLoans,
  usePayments,
  useRepayments,
} from "@/lib/business-data";
import { computeMetrics } from "@/lib/metrics";
import { formatCurrency, formatDate, todayISO } from "@/lib/format";

export const Route = createFileRoute("/business/_app/capital")({
  head: () => ({
    meta: [
      { title: "Capital — CashFlow" },
      { name: "description", content: "Track capital injections, withdrawals and available funds." },
      { property: "og:title", content: "Capital — CashFlow" },
      { property: "og:description", content: "Track capital injections and available funds." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CapitalPage,
});

type EntryType = "initial" | "injection" | "withdrawal";

function CapitalPage() {
  const { data: account } = useAccount();
  const businessId = account?.business?.id;
  const invalidate = useBusinessInvalidate(businessId);

  const capital = useCapitalEntries(businessId);
  const loans = useLoans(businessId);
  const repayments = useRepayments(businessId);
  const payments = usePayments(businessId);
  const expenses = useExpenses(businessId);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    entry_type: "injection" as EntryType,
    amount: "",
    entry_date: todayISO(),
    note: "",
  });

  const create = useMutation({
    mutationFn: async () => {
      const amount = Number(form.amount);
      if (!Number.isFinite(amount) || amount <= 0) throw new Error("invalid-amount");
      if (!businessId) throw new Error("no-business");
      const { data, error } = await supabase
        .from("capital_entries")
        .insert({
          business_id: businessId,
          entry_type: form.entry_type,
          amount,
          entry_date: form.entry_date,
          note: form.note.trim(),
          created_by: account?.userId ?? null,
        })
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: async () => {
      await invalidate();
      setOpen(false);
      setForm({ entry_type: "injection", amount: "", entry_date: todayISO(), note: "" });
      toast.success("Capital entry saved.");
    },
    onError: (e) =>
      toast.error(
        e.message === "invalid-amount"
          ? "Enter an amount greater than zero."
          : friendlyError(e, "We couldn't save that capital entry."),
      ),
  });

  if (capital.isLoading) return <LoadingState label="Loading capital..." />;
  if (capital.error)
    return <ErrorState message="We couldn't load your capital records." onRetry={() => capital.refetch()} />;

  const metrics = computeMetrics({
    capital: capital.data ?? [],
    loans: loans.data ?? [],
    repayments: repayments.data ?? [],
    payments: payments.data ?? [],
    expenses: expenses.data ?? [],
  });

  const entries = capital.data ?? [];

  return (
    <div>
      <PageHeader
        title="Capital"
        description="Every injection and withdrawal that funds your lending."
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-1.5 h-4 w-4" /> Record capital
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Record capital</DialogTitle>
              </DialogHeader>
              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  create.mutate();
                }}
              >
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select
                    value={form.entry_type}
                    onValueChange={(v) => setForm((f) => ({ ...f, entry_type: v as EntryType }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="initial">Initial capital</SelectItem>
                      <SelectItem value="injection">Additional capital</SelectItem>
                      <SelectItem value="withdrawal">Withdrawal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount</Label>
                  <Input
                    id="amount"
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={form.amount}
                    onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="entry_date">Date</Label>
                  <Input
                    id="entry_date"
                    type="date"
                    value={form.entry_date}
                    onChange={(e) => setForm((f) => ({ ...f, entry_date: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="note">Note</Label>
                  <Textarea
                    id="note"
                    value={form.note}
                    onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={create.isPending}>
                  {create.isPending ? "Saving..." : "Save entry"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
        <StatCard label="Total capital" value={formatCurrency(metrics.totalCapital)} icon={PiggyBank} />
        <StatCard label="Deployed" value={formatCurrency(metrics.capitalDeployed)} />
        <StatCard
          label="Available"
          value={formatCurrency(metrics.availableCapital)}
          tone={metrics.availableCapital < 0 ? "negative" : "positive"}
        />
        <StatCard label="Collected" value={formatCurrency(metrics.totalCollected)} />
      </div>

      <div className="mt-8">
        <h2 className="mb-3 text-lg font-semibold">Capital history</h2>
        {entries.length === 0 ? (
          <EmptyState
            icon={<PiggyBank className="h-8 w-8" />}
            title="No capital recorded yet"
            description="Record your starting capital so your available funds are accurate."
          />
        ) : (
          <div className="card-surface divide-y divide-border">
            {entries.map((entry) => (
              <div key={entry.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium capitalize">{entry.entry_type.replace("_", " ")}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(entry.entry_date)}
                    {entry.note ? ` · ${entry.note}` : ""}
                  </p>
                </div>
                <p
                  className={`text-sm font-semibold tabular-nums ${
                    entry.entry_type === "withdrawal" ? "text-destructive" : "text-success"
                  }`}
                >
                  {entry.entry_type === "withdrawal" ? "−" : "+"}
                  {formatCurrency(Number(entry.amount))}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
