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
import { computeMonthEndLoan, loanDisplayStatus, monthEndDueDate } from "@/lib/finance";
import { formatCurrency, formatDate, todayISO } from "@/lib/format";

export const Route = createFileRoute("/business/_app/loans")({
  head: () => ({
    meta: [
      { title: "Loans — CashFlow" },
      { name: "description", content: "Issue month-end loans and follow every repayment." },
      { property: "og:title", content: "Loans — CashFlow" },
      { property: "og:description", content: "Issue month-end loans and follow every repayment." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LoansPage,
});

const statusTone: Record<string, string> = {
  active: "bg-accent text-accent-foreground",
  due: "bg-primary/10 text-primary",
  overdue: "bg-destructive/10 text-destructive",
  paid: "bg-success/15 text-success",
  defaulted: "bg-destructive/10 text-destructive",
  cancelled: "bg-muted text-muted-foreground",
};

function LoansPage() {
  const { data: account } = useAccount();
  const businessId = account?.business?.id;
  const defaultRate = Number(account?.business?.default_interest_rate ?? 40);
  const invalidate = useBusinessInvalidate(businessId);

  const borrowers = useBorrowers(businessId);
  const loans = useLoans(businessId);
  const repayments = useRepayments(businessId);
  const payments = usePayments(businessId);

  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<LoanWithBorrower | null>(null);
  const emptyForm = () => ({
    borrower_id: "",
    principal_amount: "",
    interest_rate: String(defaultRate),
    issue_date: todayISO(),
    notes: "",
  });
  const [form, setForm] = useState(emptyForm);

  const preview = useMemo(() => {
    const principal = Number(form.principal_amount);
    if (!principal) return null;
    return computeMonthEndLoan(principal, form.interest_rate, form.issue_date);
  }, [form]);

  const paidByLoan = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of payments.data ?? []) map.set(p.loan_id, (map.get(p.loan_id) ?? 0) + Number(p.amount));
    return map;
  }, [payments.data]);

  const today = todayISO();

  const create = useMutation({
    mutationFn: async () => {
      if (!businessId) throw new Error("no-business");
      if (!form.borrower_id) throw new Error("no-borrower");
      const principal = Number(form.principal_amount);
      const rate = Number(form.interest_rate);
      if (!Number.isFinite(principal) || principal <= 0) throw new Error("bad-principal");
      if (!Number.isFinite(rate) || rate < 0) throw new Error("bad-rate");

      const calc = computeMonthEndLoan(principal, rate, form.issue_date);

      const { data: loan, error } = await supabase
        .from("loans")
        .insert({
          business_id: businessId,
          borrower_id: form.borrower_id,
          principal_amount: calc.principal,
          interest_rate: calc.interestRate,
          loan_term_months: 1,
          repayment_frequency: "monthly",
          start_date: calc.issueDate,
          due_date: calc.dueDate,
          total_interest: calc.interestAmount,
          total_repayable: calc.totalRepayable,
          installment_amount: calc.totalRepayable,
          installments_count: 1,
          notes: form.notes.trim(),
          created_by: account?.userId ?? null,
        })
        .select()
        .single();
      if (error) throw new Error(error.message);

      // One single month-end repayment obligation.
      const { error: scheduleError } = await supabase.from("loan_repayments").insert({
        business_id: businessId,
        loan_id: loan.id,
        installment_number: 1,
        due_date: calc.dueDate,
        amount_due: calc.totalRepayable,
      });
      if (scheduleError) {
        await supabase.from("loans").delete().eq("id", loan.id);
        throw new Error(scheduleError.message);
      }

      await supabase.from("notifications").insert({
        business_id: businessId,
        user_id: account?.userId ?? null,
        title: "Loan created",
        body: `A loan of ${formatCurrency(calc.principal)} is repayable by ${formatDate(calc.dueDate)}.`,
      });
      return loan;
    },
    onSuccess: async () => {
      await invalidate();
      setOpen(false);
      setForm(emptyForm());
      toast.success("Loan created and due at the end of the month.");
    },
    onError: (e) => {
      const map: Record<string, string> = {
        "no-borrower": "Choose a borrower first.",
        "bad-principal": "The loan amount must be greater than zero.",
        "bad-rate": "The interest rate can't be negative.",
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
        description="Money lent this month, repayable on the last day of the month."
        action={
          <Button
            size="sm"
            onClick={() => {
              setForm(emptyForm());
              setOpen(true);
            }}
            disabled={(borrowers.data ?? []).length === 0}
          >
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
          description="Create your first loan and CashFlow works out the interest and month-end due date."
          action={
            <Button
              size="sm"
              onClick={() => {
                setForm(emptyForm());
                setOpen(true);
              }}
            >
              Create loan
            </Button>
          }
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] border-separate border-spacing-y-2 text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 pb-1 font-medium">Borrower</th>
                <th className="px-4 pb-1 font-medium">Principal</th>
                <th className="px-4 pb-1 font-medium">Total due</th>
                <th className="px-4 pb-1 font-medium">Outstanding</th>
                <th className="px-4 pb-1 font-medium">Due date</th>
                <th className="px-4 pb-1 font-medium">Status</th>
                <th className="px-4 pb-1" />
              </tr>
            </thead>
            <tbody>
              {(loans.data ?? []).map((loan) => {
                const paid = paidByLoan.get(loan.id) ?? 0;
                const outstanding = Math.max(0, Number(loan.total_repayable) - paid);
                const status = loanDisplayStatus(
                  loan.status,
                  loan.due_date,
                  Number(loan.total_repayable),
                  paid,
                  today,
                );
                return (
                  <tr key={loan.id} className="card-surface">
                    <td className="rounded-l-xl px-4 py-3">
                      <p className="font-medium">{loan.borrowers?.full_name ?? "—"}</p>
                      <p className="text-xs text-muted-foreground">
                        {Number(loan.interest_rate)}% · issued {formatDate(loan.start_date)}
                      </p>
                    </td>
                    <td className="px-4 py-3 tabular-nums">{formatCurrency(Number(loan.principal_amount))}</td>
                    <td className="px-4 py-3 tabular-nums">{formatCurrency(Number(loan.total_repayable))}</td>
                    <td className="px-4 py-3 font-medium tabular-nums">{formatCurrency(outstanding)}</td>
                    <td className="px-4 py-3">{loan.due_date ? formatDate(loan.due_date) : "—"}</td>
                    <td className="px-4 py-3">
                      <Badge className={`capitalize ${statusTone[status] ?? ""}`} variant="secondary">
                        {status}
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
                <Label htmlFor="principal">Loan amount</Label>
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
                <Label htmlFor="rate">Interest rate (%)</Label>
                <Input
                  id="rate"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.interest_rate}
                  onChange={(e) => setForm((f) => ({ ...f, interest_rate: e.target.value }))}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Your default is {defaultRate}%. You can change it for this loan.
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="issue">Loan date</Label>
              <Input
                id="issue"
                type="date"
                value={form.issue_date}
                onChange={(e) => setForm((f) => ({ ...f, issue_date: e.target.value }))}
                required
              />
              <p className="text-xs text-muted-foreground">
                Repayable in full on {formatDate(monthEndDueDate(form.issue_date))}.
              </p>
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
                <p className="font-medium">Summary</p>
                <ul className="mt-2 space-y-1 text-muted-foreground">
                  <li>Loan amount: {formatCurrency(preview.principal)}</li>
                  <li>
                    Interest at {preview.interestRate}%: {formatCurrency(preview.interestAmount)}
                  </li>
                  <li className="font-medium text-foreground">
                    Total repayment: {formatCurrency(preview.totalRepayable)}
                  </li>
                  <li>Due: {formatDate(preview.dueDate)}</li>
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
                <Info label="Loan amount" value={formatCurrency(Number(detail.principal_amount))} />
                <Info label="Interest rate" value={`${Number(detail.interest_rate)}%`} />
                <Info label="Interest" value={formatCurrency(Number(detail.total_interest))} />
                <Info label="Total repayment" value={formatCurrency(Number(detail.total_repayable))} />
                <Info label="Loan date" value={formatDate(detail.start_date)} />
                <Info label="Due date" value={detail.due_date ? formatDate(detail.due_date) : "—"} />
                <Info
                  label="Outstanding"
                  value={formatCurrency(
                    Math.max(0, Number(detail.total_repayable) - (paidByLoan.get(detail.id) ?? 0)),
                  )}
                />
                <Info
                  label="Status"
                  value={loanDisplayStatus(
                    detail.status,
                    detail.due_date,
                    Number(detail.total_repayable),
                    paidByLoan.get(detail.id) ?? 0,
                    today,
                  )}
                />
              </div>

              <div className="space-y-2">
                <Label>Loan record status</Label>
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
                <p className="mb-2 font-medium">Repayment</p>
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
      <p className="font-medium capitalize tabular-nums">{value}</p>
    </div>
  );
}
