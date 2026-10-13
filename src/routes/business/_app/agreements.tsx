import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { FileText, Plus, Trash2 } from "lucide-react";
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
  useAgreements,
  useBorrowers,
  useBusinessInvalidate,
  useLoans,
  type Agreement,
} from "@/lib/business-data";
import { formatCurrency, formatDate } from "@/lib/format";


export const Route = createFileRoute("/business/_app/agreements")({
  head: () => ({
    meta: [
      { title: "Agreements — CashFlow" },
      { name: "description", content: "Draft and store loan agreements for your borrowers." },
      { property: "og:title", content: "Agreements — CashFlow" },
      { property: "og:description", content: "Draft and store loan agreements for your borrowers." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AgreementsPage,
});

function AgreementsPage() {
  const { data: account } = useAccount();
  const businessId = account?.business?.id;
  const invalidate = useBusinessInvalidate(businessId);

  const agreements = useAgreements(businessId);
  const borrowers = useBorrowers(businessId);
  const loans = useLoans(businessId);

  const [open, setOpen] = useState(false);
  const [viewing, setViewing] = useState<Agreement | null>(null);
  const [form, setForm] = useState({ loan_id: "", title: "", content: "" });

  function draftFromLoan(loanId: string) {
    const loan = (loans.data ?? []).find((l) => l.id === loanId);
    if (!loan) return;
    const borrower = (borrowers.data ?? []).find((b) => b.id === loan.borrower_id);
    const text = [
      `LOAN AGREEMENT`,
      ``,
      `Lender: ${account?.business?.name ?? ""}`,
      `Borrower: ${borrower?.full_name ?? ""}${borrower?.id_number ? ` (ID ${borrower.id_number})` : ""}`,
      `Date: ${formatDate(new Date().toISOString())}`,
      ``,
      `1. The Lender advances a principal amount of ${formatCurrency(Number(loan.principal_amount))} to the Borrower.`,
      `2. Interest is charged at ${Number(loan.interest_rate)}%, giving interest of ${formatCurrency(Number(loan.total_interest))}.`,
      `3. The total amount repayable is ${formatCurrency(Number(loan.total_repayable))}.`,
      `4. The full amount is repayable on or before ${formatDate(loan.due_date ?? loan.start_date)}, being the last day of the month in which the loan was issued.`,
      `5. Late or missed instalments may result in the loan being marked in default.`,
      ``,
      `Signed by the Borrower: ____________________`,
      `Signed for the Lender: ____________________`,
    ].join("\n");
    setForm({
      loan_id: loanId,
      title: `Loan agreement — ${borrower?.full_name ?? "Borrower"}`,
      content: text,
    });
  }

  const save = useMutation({
    mutationFn: async () => {
      if (!businessId) throw new Error("no-business");
      if (!form.title.trim()) throw new Error("no-title");
      const loan = (loans.data ?? []).find((l) => l.id === form.loan_id);
      const { error } = await supabase.from("agreements").insert({
        business_id: businessId,
        loan_id: form.loan_id || null,
        borrower_id: loan?.borrower_id ?? null,
        title: form.title.trim(),
        content: form.content,
        created_by: account?.userId ?? null,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: async () => {
      await invalidate();
      setOpen(false);
      setForm({ loan_id: "", title: "", content: "" });
      toast.success("Agreement saved.");
    },
    onError: (e) =>
      toast.error(
        e.message === "no-title"
          ? "Give the agreement a title."
          : friendlyError(e, "We couldn't save this agreement."),
      ),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("agreements").delete().eq("id", id).eq("business_id", businessId!);
      if (error) throw new Error(error.message);
    },
    onSuccess: async () => {
      await invalidate();
      toast.success("Agreement deleted.");
    },
    onError: (e) => toast.error(friendlyError(e, "We couldn't delete this agreement.")),
  });

  const list = agreements.data ?? [];

  return (
    <div>
      <PageHeader
        title="Agreements"
        description="Generate an agreement from a loan, then keep it on file."
        action={
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" /> New agreement
          </Button>
        }
      />

      {agreements.isLoading ? (
        <LoadingState label="Loading agreements..." />
      ) : agreements.error ? (
        <ErrorState message="We couldn't load your agreements." onRetry={() => agreements.refetch()} />
      ) : list.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-8 w-8" />}
          title="No agreements yet"
          description="Create an agreement from one of your loans to keep a paper trail."
        />
      ) : (
        <div className="card-surface divide-y divide-border">
          {list.map((a) => (
            <div key={a.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{a.title}</p>
                <p className="text-xs text-muted-foreground">Created {formatDate(a.created_at)}</p>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" onClick={() => setViewing(a)}>
                  View
                </Button>
                <Button variant="ghost" size="icon" aria-label="Delete" onClick={() => remove.mutate(a.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New agreement</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              save.mutate();
            }}
          >
            <div className="space-y-2">
              <Label>Linked loan (optional)</Label>
              <Select
                value={form.loan_id}
                onValueChange={(v) => {
                  setForm((f) => ({ ...f, loan_id: v }));
                  draftFromLoan(v);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a loan to draft from" />
                </SelectTrigger>
                <SelectContent>
                  {(loans.data ?? []).map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.borrowers?.full_name ?? "Borrower"} — {formatCurrency(Number(l.principal_amount))}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="a_title">Title</Label>
              <Input
                id="a_title"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="a_content">Agreement text</Label>
              <Textarea
                id="a_content"
                className="min-h-56 font-mono text-xs"
                value={form.content}
                onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
              />
            </div>
            <Button type="submit" className="w-full" disabled={save.isPending}>
              {save.isPending ? "Saving..." : "Save agreement"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{viewing?.title}</DialogTitle>
          </DialogHeader>
          <pre className="whitespace-pre-wrap rounded-xl bg-muted p-4 text-xs leading-relaxed">
            {viewing?.content}
          </pre>
          <Button variant="outline" onClick={() => window.print()}>
            Print
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
