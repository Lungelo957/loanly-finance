import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { LifeBuoy, Search, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/app-shell";
import { EmptyState, ErrorState, LoadingState } from "@/components/state-views";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import {
  useAdminInvalidate,
  useAllBusinesses,
  useAllTickets,
  type TicketRow,
  type TicketStatus,
} from "@/lib/admin-data";
import { friendlyError } from "@/lib/business-data";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/admin/_app/support")({
  head: () => ({
    meta: [
      { title: "Support queue — CashFlow admin" },
      { name: "description", content: "Read, answer, resolve and remove business support tickets." },
      { property: "og:title", content: "Support queue — CashFlow admin" },
      { property: "og:description", content: "Read, answer, resolve and remove support tickets." },
    ],
  }),
  component: AdminSupport,
});

const STATUSES: TicketStatus[] = ["open", "in_progress", "resolved", "closed"];

function AdminSupport() {
  const tickets = useAllTickets();
  const businesses = useAllBusinesses();
  const invalidate = useAdminInvalidate();

  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [viewing, setViewing] = useState<TicketRow | null>(null);
  const [response, setResponse] = useState("");

  const businessName = useMemo(() => {
    const map = new Map<string, string>();
    for (const b of businesses.data ?? []) map.set(b.id, b.name);
    return map;
  }, [businesses.data]);

  const update = useMutation({
    mutationFn: async ({
      id,
      status,
      admin_response,
    }: {
      id: string;
      status?: TicketStatus;
      admin_response?: string;
    }) => {
      const patch: Record<string, unknown> = {};
      if (status) patch["status"] = status;
      if (admin_response !== undefined) patch["admin_response"] = admin_response;
      const { error } = await supabase.from("support_tickets").update(patch).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: async () => {
      await invalidate();
      toast.success("Ticket updated.");
    },
    onError: (e) => toast.error(friendlyError(e, "We couldn't update this ticket.")),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("support_tickets").delete().eq("id", id);
      if (error) throw new Error(error.message);
      const { data } = await supabase.from("support_tickets").select("id").eq("id", id).maybeSingle();
      if (data) throw new Error("not-deleted");
    },
    onSuccess: async () => {
      await invalidate();
      setViewing(null);
      toast.success("Ticket deleted.");
    },
    onError: (e) =>
      toast.error(
        e.message === "not-deleted"
          ? "The ticket could not be removed. Please try again."
          : friendlyError(e, "We couldn't delete this ticket."),
      ),
  });

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (tickets.data ?? []).filter((t) => {
      const matchStatus = filter === "all" || t.status === filter;
      const matchTerm =
        !term ||
        t.subject.toLowerCase().includes(term) ||
        t.message.toLowerCase().includes(term) ||
        (businessName.get(t.business_id) ?? "").toLowerCase().includes(term);
      return matchStatus && matchTerm;
    });
  }, [tickets.data, filter, search, businessName]);

  if (tickets.isLoading) return <LoadingState label="Loading the support queue..." />;
  if (tickets.error)
    return <ErrorState message="We couldn't load the support queue." onRetry={() => tickets.refetch()} />;

  return (
    <div>
      <PageHeader title="Support queue" description="Every ticket raised by a business on CashFlow." />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative sm:max-w-xs sm:flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search tickets"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Tabs value={filter} onValueChange={setFilter} className="min-w-0">
          <TabsList className="w-full overflow-x-auto">
            <TabsTrigger value="all">All</TabsTrigger>
            {STATUSES.map((s) => (
              <TabsTrigger key={s} value={s} className="capitalize">
                {s.replace("_", " ")}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={<LifeBuoy className="h-8 w-8" />}
          title="No tickets here"
          description="Nothing matches this search or filter."
        />
      ) : (
        <div className="space-y-3">
          {rows.map((t) => (
            <div key={t.id} className="card-surface p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-medium">{t.subject}</p>
                  <p className="text-xs text-muted-foreground">
                    {businessName.get(t.business_id) ?? "Business"} · {formatDate(t.created_at)}
                  </p>
                </div>
                <Badge variant="secondary" className="capitalize">
                  {t.status.replace("_", " ")}
                </Badge>
              </div>
              <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{t.message}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setViewing(t);
                    setResponse(t.admin_response);
                  }}
                >
                  Open
                </Button>
                <Select
                  value={t.status}
                  onValueChange={(v) => update.mutate({ id: t.id, status: v as TicketStatus })}
                >
                  <SelectTrigger className="h-9 w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => (
                      <SelectItem key={s} value={s} className="capitalize">
                        {s.replace("_", " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="Delete ticket"
                  onClick={() => remove.mutate(t.id)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{viewing?.subject}</DialogTitle>
          </DialogHeader>
          {viewing ? (
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground">
                {businessName.get(viewing.business_id) ?? "Business"} · opened {formatDate(viewing.created_at)}
              </p>
              <p className="whitespace-pre-wrap rounded-xl bg-muted p-4 text-sm">{viewing.message}</p>
              <Textarea
                className="min-h-32"
                placeholder="Write a reply to this business..."
                value={response}
                onChange={(e) => setResponse(e.target.value)}
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  disabled={update.isPending}
                  onClick={() =>
                    update.mutate(
                      { id: viewing.id, admin_response: response, status: "in_progress" },
                      { onSuccess: () => setViewing(null) },
                    )
                  }
                >
                  Send reply
                </Button>
                <Button
                  variant="outline"
                  disabled={update.isPending}
                  onClick={() =>
                    update.mutate(
                      { id: viewing.id, admin_response: response, status: "resolved" },
                      { onSuccess: () => setViewing(null) },
                    )
                  }
                >
                  Resolve
                </Button>
                <Button variant="ghost" onClick={() => remove.mutate(viewing.id)}>
                  <Trash2 className="mr-1.5 h-4 w-4 text-destructive" /> Delete
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
