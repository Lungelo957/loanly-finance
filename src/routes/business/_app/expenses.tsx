import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Pencil, Plus, ScrollText, Trash2 } from "lucide-react";
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
import { friendlyError, useBusinessInvalidate, useExpenses, type Expense } from "@/lib/business-data";
import { formatCurrency, formatDate, todayISO } from "@/lib/format";

export const Route = createFileRoute("/business/_app/expenses")({
  head: () => ({
    meta: [
      { title: "Expenses — CashFlow" },
      { name: "description", content: "Track what it costs to run your lending business." },
      { property: "og:title", content: "Expenses — CashFlow" },
      { property: "og:description", content: "Track what it costs to run your lending business." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ExpensesPage,
});

const CATEGORIES = ["general", "salaries", "rent", "transport", "marketing", "legal", "bank charges", "other"];

function ExpensesPage() {
  const { data: account } = useAccount();
  const businessId = account?.business?.id;
  const invalidate = useBusinessInvalidate(businessId);
  const expenses = useExpenses(businessId);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [form, setForm] = useState({
    category: "general",
    amount: "",
    expense_date: todayISO(),
    description: "",
  });

  function openCreate() {
    setEditing(null);
    setForm({ category: "general", amount: "", expense_date: todayISO(), description: "" });
    setOpen(true);
  }

  function openEdit(x: Expense) {
    setEditing(x);
    setForm({
      category: x.category,
      amount: String(x.amount),
      expense_date: x.expense_date,
      description: x.description,
    });
    setOpen(true);
  }

  const save = useMutation({
    mutationFn: async () => {
      if (!businessId) throw new Error("no-business");
      const amount = Number(form.amount);
      if (!Number.isFinite(amount) || amount <= 0) throw new Error("bad-amount");
      const payload = {
        category: form.category,
        amount,
        expense_date: form.expense_date,
        description: form.description.trim(),
      };
      if (editing) {
        const { error } = await supabase
          .from("expenses")
          .update(payload)
          .eq("id", editing.id)
          .eq("business_id", businessId);
        if (error) throw new Error(error.message);
        return;
      }
      const { error } = await supabase
        .from("expenses")
        .insert({ ...payload, business_id: businessId, created_by: account?.userId ?? null });
      if (error) throw new Error(error.message);
    },
    onSuccess: async () => {
      await invalidate();
      setOpen(false);
      toast.success(editing ? "Expense updated." : "Expense saved.");
    },
    onError: (e) =>
      toast.error(
        e.message === "bad-amount"
          ? "Enter an amount greater than zero."
          : friendlyError(e, "We couldn't save this expense."),
      ),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("expenses").delete().eq("id", id).eq("business_id", businessId!);
      if (error) throw new Error(error.message);
    },
    onSuccess: async () => {
      await invalidate();
      toast.success("Expense deleted.");
    },
    onError: (e) => toast.error(friendlyError(e, "We couldn't delete this expense.")),
  });

  const list = expenses.data ?? [];
  const total = list.reduce((a, e) => a + Number(e.amount), 0);

  return (
    <div>
      <PageHeader
        title="Expenses"
        description={`Total recorded: ${formatCurrency(total)}`}
        action={
          <Button size="sm" onClick={openCreate}>
            <Plus className="mr-1.5 h-4 w-4" /> Add expense
          </Button>
        }
      />

      {expenses.isLoading ? (
        <LoadingState label="Loading expenses..." />
      ) : expenses.error ? (
        <ErrorState message="We couldn't load your expenses." onRetry={() => expenses.refetch()} />
      ) : list.length === 0 ? (
        <EmptyState
          icon={<ScrollText className="h-8 w-8" />}
          title="No expenses yet"
          description="Add your running costs so your net cash flow is accurate."
          action={
            <Button size="sm" onClick={openCreate}>
              Add expense
            </Button>
          }
        />
      ) : (
        <div className="card-surface divide-y divide-border">
          {list.map((x) => (
            <div key={x.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium capitalize">{x.category}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {formatDate(x.expense_date)}
                  {x.description ? ` · ${x.description}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <p className="text-sm font-semibold tabular-nums">{formatCurrency(Number(x.amount))}</p>
                <Button variant="ghost" size="icon" aria-label="Edit" onClick={() => openEdit(x)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" aria-label="Delete" onClick={() => remove.mutate(x.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit expense" : "Add expense"}</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              save.mutate();
            }}
          >
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c} className="capitalize">
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="e_amount">Amount</Label>
                <Input
                  id="e_amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={form.amount}
                  onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="e_date">Date</Label>
                <Input
                  id="e_date"
                  type="date"
                  value={form.expense_date}
                  onChange={(e) => setForm((f) => ({ ...f, expense_date: e.target.value }))}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="e_desc">Description</Label>
              <Textarea
                id="e_desc"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            <Button type="submit" className="w-full" disabled={save.isPending}>
              {save.isPending ? "Saving..." : editing ? "Save changes" : "Save expense"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
