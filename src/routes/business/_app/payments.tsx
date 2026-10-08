import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Banknote, Plus } from "lucide-react";
import { PageHeader } from "@/components/app-shell";
import { EmptyState, ErrorState, LoadingState } from "@/components/state-views";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  useLoans,
  usePayments,
  useRepayments,
} from "@/lib/business-data";
import { formatCurrency, formatDate, todayISO } from "@/lib/format";

export const Route = createFileRoute("/business/_app/payments")({
  head: () => ({
    meta: [
      { title: "Payments — CashFlow" },
      { name: "description", content: "Record repayments and keep balances accurate." },
      { property: "og:title", content: "Payments — CashFlow" },
      { property: "og:description", content: "Record repayments and keep balances accurate." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PaymentsPage,
});

function PaymentsPage() {
  const { data: account } = useAccount();
  const businessId = account?.business?.id;
  const invalidate = useBusinessInvalidate(businessId);

  const loans = useLoans(businessId);
  const payments = usePayments(businessId);
  const repayments = useRepayments(businessId);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    loan_id: "",
    amount: "",
    payment_date: todayISO(),
    reference: "",
    notes: "",
  });

  const loanLabel = useMemo(() => {
    const map = new Map<string, string>();
    for (const l of loans.data ?? []) map.set(l.id, l.borrowers?.full_name ?? "Borrower");
    return map;
  }, [loans.data]);

  const record = useMutation({
    mutationFn: async () => {
      if (!businessId) throw new Error("no-business");
      if (!form.loan_id) throw new Error("no-loan");
      const amount = Number(form.amount);
      if (!Number.isFinite(amount) || amount <= 0) throw new Error("bad-amount");

      const { data: payment, error } = await supabase
        .from("payments")
        .insert({
          business_id: businessId,
          loan_id: form.loan_id,
          amount,
          payment_date: form.payment_date,
          reference: form.reference.trim(),
          notes: form.notes.trim(),
          created_by: account?.userId ?? null,
        })
        .select()
        .single();
      if (error) throw new Error(error.message);

      // Allocate the payment across the loan's outstanding instalments.
      const { data: schedule } = await supabase
        .from("loan_repayments")
        .select("*")
        .eq("loan_id", form.loan_id)
        .eq("business_id", businessId)
        .order("installment_number", { ascending: true });

      let remaining = amount;
      for (const row of schedule ?? []) {
        if (remaining <= 0) break;
        const due = Number(row.amount_due) - Number(row.amount_paid);
        if (due <= 0) continue;
        const applied = Math.min(due, remaining);
        remaining = Math.round((remaining - applied) * 100) / 100;
        const newPaid = Math.round((Number(row.amount_paid) + applied) * 100) / 100;
        const settled = newPaid >= Number(row.amount_due) - 0.001;
        await supabase
          .from("loan_repayments")
          .update({
            amount_paid: newPaid,
            status: settled ? "paid" : "partial",
            paid_date: settled ? form.payment_date : row.paid_date,
          })
          .eq("id", row.id)
          .eq("business_id", businessId);
      }

      // Close the loan once everything has been collected.
      const loan = (loans.data ?? []).find((l) => l.id === form.loan_id);
      if (loan) {
        const collected =
          (payments.data ?? [])
            .filter((p) => p.loan_id === loan.id)
            .reduce((a, p) => a + Number(p.amount), 0) + amount;
        if (collected >= Number(loan.total_repayable) - 0.001 && loan.status === "active") {
          await supabase.from("loans").update({ status: "completed" }).eq("id", loan.id).eq("business_id", businessId);
        }
      }

      await supabase.from("notifications").insert({
        business_id: businessId,
        user_id: account?.userId ?? null,
        title: "Payment recorded",
        body: `${formatCurrency(amount)} received from ${loanLabel.get(form.loan_id) ?? "a borrower"}.`,
      });

      return payment;
    },
    onSuccess: async () => {
      await invalidate();
      setOpen(false);
      setForm({ loan_id: "", amount: "", payment_date: todayISO(), reference: "", notes: "" });
      toast.success("Payment recorded.");
    },
    onError: (e) => {
      const map: Record<string, string> = {
        "no-loan": "Choose the loan this payment belongs to.",
        "bad-amount": "Enter an amount greater than zero.",
      };
      toast.error(map[e.message] ?? friendlyError(e, "We couldn't record this payment."));
    },
  });

  const activeLoans = (loans.data ?? []).filter((l) => l.status === "active");
  const list = payments.data ?? [];
  void repayments;

  return (
    <div>
      <PageHeader
        title="Payments"
        description="Every repayment you have received."
        action={
          <Button size="sm" onClick={() => setOpen(true)} disabled={activeLoans.length === 0}>
            <Plus className="mr-1.5 h-4 w-4" /> Record payment
          </Button>
        }
      />

      {payments.isLoading ? (
        <LoadingState label="Loading payments..." />
      ) : payments.error ? (
        <ErrorState message="We couldn't load your payments." onRetry={() => payments.refetch()} />
      ) : activeLoans.length === 0 && list.length === 0 ? (
        <EmptyState
          icon={<Banknote className="h-8 w-8" />}
          title="No active loans"
          description="Create a loan before recording payments against it."
          action={
            <Button asChild size="sm">
              <Link to="/business/loans">Go to loans</Link>
            </Button>
          }
        />
      ) : list.length === 0 ? (
        <EmptyState
          icon={<Banknote className="h-8 w-8" />}
          title="No payments yet"
          description="Record your first payment and balances update automatically."
          action={
            <Button size="sm" onClick={() => setOpen(true)}>
              Record payment
            </Button>
          }
        />
      ) : (
        <div className="card-surface divide-y divide-border">
          {list.map((p) => (
            <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{loanLabel.get(p.loan_id) ?? "Loan"}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDate(p.payment_date)}
                  {p.reference ? ` · Ref ${p.reference}` : ""}
                </p>
              </div>
              <p className="text-sm font-semibold tabular-nums text-success">
                {formatCurrency(Number(p.amount))}
              </p>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Record payment</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              record.mutate();
            }}
          >
            <div className="space-y-2">
              <Label>Loan</Label>
              <Select value={form.loan_id} onValueChange={(v) => setForm((f) => ({ ...f, loan_id: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a loan" />
                </SelectTrigger>
                <SelectContent>
                  {activeLoans.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.borrowers?.full_name ?? "Borrower"} — {formatCurrency(Number(l.total_repayable))}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="p_amount">Amount</Label>
                <Input
                  id="p_amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={form.amount}
                  onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="p_date">Payment date</Label>
                <Input
                  id="p_date"
                  type="date"
                  value={form.payment_date}
                  onChange={(e) => setForm((f) => ({ ...f, payment_date: e.target.value }))}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="p_ref">Reference</Label>
              <Input
                id="p_ref"
                value={form.reference}
                onChange={(e) => setForm((f) => ({ ...f, reference: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="p_notes">Notes</Label>
              <Textarea
                id="p_notes"
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>
            <Button type="submit" className="w-full" disabled={record.isPending}>
              {record.isPending ? "Recording payment..." : "Record payment"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
