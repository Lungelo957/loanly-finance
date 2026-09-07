import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Bell, LifeBuoy, Plus } from "lucide-react";
import { PageHeader } from "@/components/app-shell";
import { EmptyState, ErrorState, LoadingState } from "@/components/state-views";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/lib/account";
import { friendlyError, useBusinessInvalidate, useNotifications, useTickets } from "@/lib/business-data";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/business/_app/support")({
  head: () => ({
    meta: [
      { title: "Support — CashFlow" },
      { name: "description", content: "Raise a support ticket and follow platform notifications." },
      { property: "og:title", content: "Support — CashFlow" },
      { property: "og:description", content: "Raise a support ticket with the CashFlow team." },
    ],
  }),
  component: SupportPage,
});

function SupportPage() {
  const { data: account } = useAccount();
  const businessId = account?.business?.id;
  const invalidate = useBusinessInvalidate(businessId);
  const tickets = useTickets(businessId);
  const notifications = useNotifications(businessId);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ subject: "", message: "" });

  const create = useMutation({
    mutationFn: async () => {
      if (!businessId || !account?.userId) throw new Error("no-business");
      if (!form.subject.trim() || !form.message.trim()) throw new Error("empty");
      const { error } = await supabase.from("support_tickets").insert({
        business_id: businessId,
        user_id: account.userId,
        subject: form.subject.trim(),
        message: form.message.trim(),
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: async () => {
      await invalidate();
      setOpen(false);
      setForm({ subject: "", message: "" });
      toast.success("Ticket sent to the CashFlow team.");
    },
    onError: (e) =>
      toast.error(
        e.message === "empty"
          ? "Add a subject and a message."
          : friendlyError(e, "We couldn't send your ticket."),
      ),
  });

  const list = tickets.data ?? [];

  return (
    <div>
      <PageHeader
        title="Support"
        description="Questions or problems? Send them straight to the CashFlow team."
        action={
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" /> New ticket
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div>
          <h2 className="mb-3 text-lg font-semibold">Your tickets</h2>
          {tickets.isLoading ? (
            <LoadingState label="Loading tickets..." />
          ) : tickets.error ? (
            <ErrorState message="We couldn't load your tickets." onRetry={() => tickets.refetch()} />
          ) : list.length === 0 ? (
            <EmptyState
              icon={<LifeBuoy className="h-8 w-8" />}
              title="No support tickets"
              description="Open a ticket and we'll get back to you."
            />
          ) : (
            <div className="space-y-3">
              {list.map((t) => (
                <div key={t.id} className="card-surface p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium">{t.subject}</p>
                    <Badge variant="secondary" className="capitalize">
                      {t.status.replace("_", " ")}
                    </Badge>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{t.message}</p>
                  {t.admin_response ? (
                    <div className="mt-3 rounded-lg bg-accent p-3 text-sm text-accent-foreground">
                      <p className="text-xs font-semibold uppercase tracking-wide">CashFlow support</p>
                      <p className="mt-1 whitespace-pre-wrap">{t.admin_response}</p>
                    </div>
                  ) : null}
                  <p className="mt-2 text-xs text-muted-foreground">Opened {formatDate(t.created_at)}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <h2 className="mb-3 text-lg font-semibold">Notifications</h2>
          {(notifications.data ?? []).length === 0 ? (
            <EmptyState
              icon={<Bell className="h-8 w-8" />}
              title="Nothing yet"
              description="Approvals, loans and payments will show up here."
            />
          ) : (
            <div className="card-surface divide-y divide-border">
              {(notifications.data ?? []).map((n) => (
                <div key={n.id} className="px-4 py-3">
                  <p className="text-sm font-medium">{n.title}</p>
                  <p className="text-xs text-muted-foreground">{n.body}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">{formatDate(n.created_at)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New support ticket</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              create.mutate();
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                value={form.subject}
                onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                className="min-h-32"
                value={form.message}
                onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={create.isPending}>
              {create.isPending ? "Sending..." : "Send ticket"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
