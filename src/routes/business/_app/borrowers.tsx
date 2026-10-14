import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Pencil, Plus, Search, Trash2, Users } from "lucide-react";
import { PageHeader } from "@/components/app-shell";
import { EmptyState, ErrorState, LoadingState } from "@/components/state-views";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/lib/account";
import { friendlyError, useBorrowers, useBusinessInvalidate, type Borrower } from "@/lib/business-data";
import { formatCurrency, formatDate } from "@/lib/format";

export const Route = createFileRoute("/business/_app/borrowers")({
  head: () => ({
    meta: [
      { title: "Borrowers — CashFlow" },
      { name: "description", content: "Manage every borrower on your books." },
      { property: "og:title", content: "Borrowers — CashFlow" },
      { property: "og:description", content: "Manage every borrower on your books." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BorrowersPage,
});

const blank = {
  full_name: "",
  phone: "",
  email: "",
  home_address: "",
  work_address: "",
  other_address: "",
  id_number: "",
  employment: "",
  monthly_income: "",
  notes: "",
};

function BorrowersPage() {
  const { data: account } = useAccount();
  const businessId = account?.business?.id;
  const invalidate = useBusinessInvalidate(businessId);
  const borrowers = useBorrowers(businessId);

  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Borrower | null>(null);
  const [toDelete, setToDelete] = useState<Borrower | null>(null);
  const [form, setForm] = useState({ ...blank });

  const set = (k: keyof typeof blank) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  function openCreate() {
    setEditing(null);
    setForm({ ...blank });
    setOpen(true);
  }

  function openEdit(b: Borrower) {
    setEditing(b);
    setForm({
      full_name: b.full_name,
      phone: b.phone,
      email: b.email,
      home_address: b.home_address || b.address,
      work_address: b.work_address,
      other_address: b.other_address,
      id_number: b.id_number,
      employment: b.employment,
      monthly_income: String(b.monthly_income ?? ""),
      notes: b.notes,
    });
    setOpen(true);
  }

  const save = useMutation({
    mutationFn: async () => {
      if (!businessId) throw new Error("no-business");
      if (!form.full_name.trim()) throw new Error("no-name");
      if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) throw new Error("bad-email");
      const income = form.monthly_income === "" ? 0 : Number(form.monthly_income);
      if (!Number.isFinite(income) || income < 0) throw new Error("bad-income");

      const payload = {
        full_name: form.full_name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        address: form.home_address.trim(),
        home_address: form.home_address.trim(),
        work_address: form.work_address.trim(),
        other_address: form.other_address.trim(),
        id_number: form.id_number.trim(),
        employment: form.employment.trim(),
        monthly_income: income,
        notes: form.notes.trim(),
      };

      if (editing) {
        const { data, error } = await supabase
          .from("borrowers")
          .update(payload)
          .eq("id", editing.id)
          .eq("business_id", businessId)
          .select()
          .single();
        if (error) throw new Error(error.message);
        return data;
      }
      const { data, error } = await supabase
        .from("borrowers")
        .insert({ ...payload, business_id: businessId, created_by: account?.userId ?? null })
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: async () => {
      await invalidate();
      setOpen(false);
      toast.success(editing ? "Borrower updated." : "Borrower saved.");
    },
    onError: (e) => {
      const map: Record<string, string> = {
        "no-name": "A borrower needs a full name.",
        "bad-email": "Enter a valid email address.",
        "bad-income": "Monthly income must be a positive number.",
      };
      toast.error(map[e.message] ?? friendlyError(e, "We couldn't save this borrower."));
    },
  });

  const remove = useMutation({
    mutationFn: async (borrower: Borrower) => {
      const { error } = await supabase
        .from("borrowers")
        .delete()
        .eq("id", borrower.id)
        .eq("business_id", businessId!);
      if (error) throw new Error(error.message);
    },
    onSuccess: async () => {
      await invalidate();
      setToDelete(null);
      toast.success("Borrower deleted.");
    },
    onError: (e) =>
      toast.error(
        friendlyError(e, "We couldn't delete this borrower. They may still have loans on record."),
      ),
  });

  const filtered = useMemo(() => {
    const list = borrowers.data ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter((b) =>
      [b.full_name, b.phone, b.email, b.id_number].some((v) => v?.toLowerCase().includes(q)),
    );
  }, [borrowers.data, search]);

  return (
    <div>
      <PageHeader
        title="Borrowers"
        description="Everyone you lend to, in one place."
        action={
          <Button size="sm" onClick={openCreate}>
            <Plus className="mr-1.5 h-4 w-4" /> Add borrower
          </Button>
        }
      />

      <div className="relative mb-4 max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Search by name, phone or ID"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {borrowers.isLoading ? (
        <LoadingState label="Loading borrowers..." />
      ) : borrowers.error ? (
        <ErrorState message="We couldn't load your borrowers." onRetry={() => borrowers.refetch()} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Users className="h-8 w-8" />}
          title={search ? "No matching borrowers" : "No borrowers yet"}
          description={
            search
              ? "Try a different name, phone number or ID."
              : "Add your first borrower to get started."
          }
          action={
            search ? undefined : (
              <Button size="sm" onClick={openCreate}>
                Add borrower
              </Button>
            )
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((b) => (
            <div key={b.id} className="card-surface p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{b.full_name}</p>
                  <p className="truncate text-sm text-muted-foreground">{b.phone || b.email || "No contact"}</p>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" aria-label="Edit" onClick={() => openEdit(b)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" aria-label="Delete" onClick={() => setToDelete(b)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
              <dl className="mt-3 space-y-1 text-xs text-muted-foreground">
                {b.id_number ? <div>ID: {b.id_number}</div> : null}
                {b.employment ? <div>Work: {b.employment}</div> : null}
                {b.home_address ? <div className="break-words"><span className="font-medium text-foreground">Home address:</span> {b.home_address}</div> : null}
                {b.work_address ? <div className="break-words"><span className="font-medium text-foreground">Work address:</span> {b.work_address}</div> : null}
                {b.other_address ? <div className="break-words"><span className="font-medium text-foreground">Other / Rental address:</span> {b.other_address}</div> : null}
                <div>Income: {formatCurrency(Number(b.monthly_income))}/month</div>
                <div>Added {formatDate(b.created_at)}</div>
              </dl>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit borrower" : "Add borrower"}</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              save.mutate();
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="full_name">Full name</Label>
              <Input id="full_name" value={form.full_name} onChange={set("full_name")} required />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone number</Label>
                <Input id="phone" value={form.phone} onChange={set("phone")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="b_email">Email</Label>
                <Input id="b_email" type="email" value={form.email} onChange={set("email")} />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="home_address">Home address</Label>
                <Input id="home_address" value={form.home_address} onChange={set("home_address")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="work_address">Work address</Label>
                <Input id="work_address" value={form.work_address} onChange={set("work_address")} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="other_address">Other / Rental address</Label>
                <Input id="other_address" value={form.other_address} onChange={set("other_address")} />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="id_number">Identification number</Label>
                <Input id="id_number" value={form.id_number} onChange={set("id_number")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="employment">Employment</Label>
                <Input id="employment" value={form.employment} onChange={set("employment")} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="monthly_income">Monthly income</Label>
              <Input
                id="monthly_income"
                type="number"
                min="0"
                step="0.01"
                value={form.monthly_income}
                onChange={set("monthly_income")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" value={form.notes} onChange={set("notes")} />
            </div>
            <Button type="submit" className="w-full" disabled={save.isPending}>
              {save.isPending ? "Saving borrower..." : editing ? "Save changes" : "Save borrower"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {toDelete?.full_name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the borrower and any loans linked to them.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => toDelete && remove.mutate(toDelete)}>
              {remove.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
