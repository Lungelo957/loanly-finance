import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { HandCoins, Plus } from "lucide-react";
import { PageHeader } from "@/components/app-shell";
import { EmptyState, ErrorState, LoadingState } from "@/components/state-views";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  useBorrowers,
  useBusinessInvalidate,
  useLoans,
  usePayments,
  useRepayments,
  type LoanWithBorrower,
} from "@/lib/business-data";
import { buildSchedule, FREQUENCY_LABEL, type Frequency } from "@/lib/finance";
import { formatCurrency, formatDate, todayISO } from "@/lib/format";

export const Route = createFileRoute("/business/_app/loans")({
  head: () => ({
    meta: [
      { title: "Loans — CashFlow" },
      { name: "description", content: "Create loans and follow every repayment schedule." },
      { property: "og:title", content: "Loans — CashFlow" },
      { property: "og:description", content: "Create loans and follow every repayment schedule." },
    ],
  }),
  component: LoansPage,
});

const statusTone: Record<string, string> = {
  active: "bg-accent text-accent-foreground",
  completed: "bg-success/15 text-success",
  defaulted: "bg-destructive/10 text-destructive",
  cancelled: "bg-muted text-muted-foreground",
};

function LoansPage() {
  const { data: account } = useAccount();
  const businessId = account?.business?.id;
  const invalidate = useBusinessInvalidate(businessId);

  const borrowers = useBorrowers(businessId);
  const loans = useLoans(businessId);
  const repayments = useRepayments(businessId);
  const payments = usePayments(businessId);

  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<LoanWithBorrower | null>(null);
  const [form, setForm] = useState({
    borrower_id: "",
    principal_amount: "",
    interest_rate: "",
    loan_term_months: "",
    repayment_frequency: "monthly" as Frequency,
    start_date: todayISO(),
    notes: "",
  });

  const preview = useMemo(() => {
    const principal = Number(form.principal_amount);
    const term = Number(form.loan_term_months);
    if (!principal || !term) return null;
    return buildSchedule({
      principal,
      interestRate: Number(form.interest_rate) || 0,
      termMonths: term,
      frequency: form.repayment_frequency,
      startDate: form.start_date,
    });
  }, [form]);

  const paidByLoan = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of payments.data ?? []) map.set(p.loan_id, (map.get(p.loan_id) ?? 0) + Number(p.amount));
    return map;
  }, [payments.data]);

  const create = useMutation({
    mutationFn: async () => {
      if (!businessId) throw new Error("no-business");
      if (!form.borrower_id) throw new Error("no-borrower");
      const principal = Number(form.principal_amount);
      const rate = Number(form.interest_rate || 0);
      const term = Number(form.loan_term_months);
      if (!Number.isFinite(principal) || principal <= 0) throw new Error("bad-principal");
      if (!Number.isFinite(rate) || rate < 0) throw new Error("bad-rate");
      if (!Number.isFinite(term) || term < 1) throw new Error("bad-term");

      const schedule = buildSchedule({
        principal,
        interestRate: rate,
        termMonths: term,
        frequency: form.repayment_frequency,
        startDate: form.start_date,
      });

      const { data: loan, error } = await supabase
        .from("loans")
        .insert({
          business_id: businessId,
          borrower_id: form.borrower_id,
          principal_amount: principal,
          interest_rate: rate,
          loan_term_months: Math.round(term),
          repayment_frequency: form.repayment_frequency,
          start_date: form.start_date,
          total_interest: schedule.totalInterest,
          total_repayable: schedule.totalRepayable,
          installment_amount: schedule.installmentAmount,
          installments_count: schedule.installmentsCount,
          notes: form.notes.trim(),
          created_by: account?.userId ?? null,
        })
        .select()
        .single();
      if (error) throw new Error(error.message);

      const { error: scheduleError } = await supabase.from("loan_repayments").insert(
        schedule.rows.map((r) => ({
          business_id: businessId,
          loan_id: loan.id,
          installment_number: r.installment_number,
          due_date: r.due_date,
          amount_due: r.amount_due,
        })),
      );
      if (scheduleError) {
        await supabase.from("loans").delete().eq("id", loan.id);
        throw new Error(scheduleError.message);
      }

      await supabase.from("notifications").insert({
        business_id: businessId,
        user_id: account?.userId ?? null,
        title: "Loan created",
        body: `A loan of ${formatCurrency(principal)} was created.`,
      });
      return loan;
    },
    onSuccess: async () => {
      await invalidate();
      setOpen(false);
      setForm({
        borrower_id: "",
        principal_amount: "",
        interest_rate: "",
        loan_term_months: "",
        repayment_frequency: "monthly",
        start_date: todayISO(),
        notes: "",
      });
      toast.success("Loan created with its repayment schedule.");
    },
    onError: (e) => {
      const map: Record<string, string> = {
        "no-borrower": "Choose a borrower first.",
        "bad-principal": "The loan amount must be greater than zero.",
        "bad-rate": "The interest rate can't be negative.",
        "bad-term": "The loan term must be at least one month.",
      };
      toast.error(map[e.message] ?? friendlyError(e, "We couldn't create this loan."));
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "active" | "completed" | "defaulted" | "cancelled" }) => {
      const { error } = await supabase
        .from("loans")
        .update({ status })
        .eq("id", id)
        .eq("business_id", businessId!);
      if (error) throw new Error(error.message);
    },
    onSuccess: async () => {
      await invalidate();
      toast.success("Loan status updated.");
    },
    onError: (e) => toast.error(friendlyError(e, "We couldn't update this loan.")),
  });

  const detailSchedule = (repayments.data ?? []).filter((r) => r.loan_id === detail?.id);

  return (
    <div>
      <PageHeader
        title="Loans"
        description="Create loans and follow their repayment schedules."
        action={
          <Button size="sm" onClick={() => setOpen(true)} disabled={(borrowers.data ?? []).length === 0}>
            <Plus className="mr-1.5 h-4 w-4" /> New loan
          </Button>
        }
      />

      {loans.isLoading ? (
        <LoadingState label="Loading loans..." />
      ) : loans.error ? (
        <ErrorState message="We couldn't load your loans." onRetry={() => loans.refetch()} />
      ) : (borrowers.data ?? []).length === 0 ? (
        <EmptyState
          icon={<HandCoins className="h-8 w-8" />}
          title="Add a borrower first"
          description="Loans are always linked to a borrower, so start by adding one."
          action={
            <Button asChild size="sm">
              <Link to="/business/borrowers">Go to borrowers</Link>
            </Button>
          }
        />
      ) : (loans.data ?? []).length === 0 ? (
        <EmptyState
          icon={<HandCoins className="h-8 w-8" />}
          title="No loans yet"
          description="Create your first loan and CashFlow will build the repayment schedule for you."
          action={
            <Button size="sm" onClick={() => setOpen(true)}>
              Create loan
            </Button>
          }
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-separate border-spacing-y-2 text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 pb-1 font-medium">Borrower</th>
                <th className="px-4 pb-1 font-medium">Principal</th>
                <th className="px-4 pb-1 font-medium">Repayable</th>
                <th className="px-4 pb-1 font-medium">Outstanding</th>
                <th className="px-4 pb-1 font-medium">Status</th>
                <th className="px-4 pb-1" />
              </tr>
            </thead>
            <tbody>
              {(loans.data ?? []).map((loan) => {
                const paid = paidByLoan.get(loan.id) ?? 0;
                const outstanding = Math.max(0, Number(loan.total_repayable) - paid);
                return (
                  <tr key={loan.id} className="card-surface">
                    <td className="rounded-l-xl px-4 py-3">
                      <p className="font-medium">{loan.borrowers?.full_name ?? "—"}</p>
                      <p className="text-xs text-muted-foreground">
                        {FREQUENCY_LABEL[loan.repayment_frequency as Frequency]} · from {formatDate(loan.start_date)}
                      </p>
                    </td>
                    <td className="px-4 py-3 tabular-nums">{formatCurrency(Number(loan.principal_amount))}</td>
                    <td className="px-4 py-3 tabular-nums">{formatCurrency(Number(loan.total_repayable))}</td>
                    <td className="px-4 py-3 font-medium tabular-nums">{formatCurrency(outstanding)}</td>
                    <td className="px-4 py-3">
                      <Badge className={`capitalize ${statusTone[loan.status] ?? ""}`} variant="secondary">
                        {loan.status}
                      </Badge>
                    </td>
                    <td className="rounded-r-xl px-4 py-3 text-right">
                      <Button variant="ghost" size="sm" onClick={() => setDetail(loan)}>
                        View
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New loan</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              create.mutate();
            }}
          >
            <div className="space-y-2">
              <Label>Borrower</Label>
              <Select
                value={form.borrower_id}
                onValueChange={(v) => setForm((f) => ({ ...f, borrower_id: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a borrower" />
                </SelectTrigger>
                <SelectContent>
                  {(borrowers.data ?? []).map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="principal">Principal amount</Label>
                <Input
                  id="principal"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={form.principal_amount}
                  onChange={(e) => setForm((f) => ({ ...f, principal_amount: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rate">Interest rate (% per year)</Label>
                <Input
                  id="rate"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.interest_rate}
                  onChange={(e) => setForm((f) => ({ ...f, interest_rate: e.target.value }))}
                  required
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="term">Term (months)</Label>
                <Input
                  id="term"
                  type="number"
                  min="1"
                  step="1"
                  value={form.loan_term_months}
                  onChange={(e) => setForm((f) => ({ ...f, loan_term_months: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Repayment frequency</Label>
                <Select
                  value={form.repayment_frequency}
                  onValueChange={(v) => setForm((f) => ({ ...f, repayment_frequency: v as Frequency }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="biweekly">Every 2 weeks</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="start">Start date</Label>
              <Input
                id="start"
                type="date"
                value={form.start_date}
                onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="loan_notes">Notes</Label>
              <Textarea
                id="loan_notes"
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>

            {preview ? (
              <div className="rounded-xl bg-muted p-4 text-sm">
                <p className="font-medium">Schedule preview</p>
                <ul className="mt-2 space-y-1 text-muted-foreground">
                  <li>Interest: {formatCurrency(preview.totalInterest)}</li>
                  <li>Total repayable: {formatCurrency(preview.totalRepayable)}</li>
                  <li>
                    {preview.installmentsCount} instalments of about{" "}
                    {formatCurrency(preview.installmentAmount)}
                  </li>
                </ul>
              </div>
            ) : null}

            <Button type="submit" className="w-full" disabled={create.isPending}>
              {create.isPending ? "Creating loan..." : "Create loan"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{detail?.borrowers?.full_name ?? "Loan"}</DialogTitle>
          </DialogHeader>
          {detail ? (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <Info label="Principal" value={formatCurrency(Number(detail.principal_amount))} />
                <Info label="Interest rate" value={`${Number(detail.interest_rate)}% p.a.`} />
                <Info label="Total interest" value={formatCurrency(Number(detail.total_interest))} />
                <Info label="Total repayable" value={formatCurrency(Number(detail.total_repayable))} />
                <Info label="Instalment" value={formatCurrency(Number(detail.installment_amount))} />
                <Info label="Instalments" value={String(detail.installments_count)} />
              </div>

              <div className="space-y-2">
                <Label>Loan status</Label>
                <Select
                  value={detail.status}
                  onValueChange={(v) =>
                    updateStatus.mutate({
                      id: detail.id,
                      status: v as "active" | "completed" | "defaulted" | "cancelled",
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="defaulted">Defaulted</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <p className="mb-2 font-medium">Repayment schedule</p>
                <div className="max-h-64 overflow-y-auto rounded-xl border border-border">
                  <table className="w-full text-xs">
                    <thead className="bg-muted text-left">
                      <tr>
                        <th className="px-3 py-2 font-medium">#</th>
                        <th className="px-3 py-2 font-medium">Due</th>
                        <th className="px-3 py-2 font-medium">Amount</th>
                        <th className="px-3 py-2 font-medium">Paid</th>
                        <th className="px-3 py-2 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailSchedule.map((r) => (
                        <tr key={r.id} className="border-t border-border">
                          <td className="px-3 py-2">{r.installment_number}</td>
                          <td className="px-3 py-2">{formatDate(r.due_date)}</td>
                          <td className="px-3 py-2 tabular-nums">{formatCurrency(Number(r.amount_due))}</td>
                          <td className="px-3 py-2 tabular-nums">{formatCurrency(Number(r.amount_paid))}</td>
                          <td className="px-3 py-2 capitalize">{r.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted px-3 py-2">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="font-medium tabular-nums">{value}</p>
    </div>
  );
}
