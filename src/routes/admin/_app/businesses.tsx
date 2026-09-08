import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Building2, Search } from "lucide-react";
import { PageHeader } from "@/components/app-shell";
import { EmptyState, ErrorState, LoadingState } from "@/components/state-views";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAdminInvalidate, useAllBusinesses, type BusinessStatus } from "@/lib/admin-data";
import { friendlyError } from "@/lib/business-data";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/admin/_app/businesses")({
  head: () => ({
    meta: [
      { title: "Businesses — CashFlow admin" },
      { name: "description", content: "Approve, reject, activate or suspend registered businesses." },
      { property: "og:title", content: "Businesses — CashFlow admin" },
      {
        property: "og:description",
        content: "Approve, reject, activate or suspend registered businesses.",
      },
    ],
  }),
  component: AdminBusinesses,
});

const FILTERS: { value: string; label: string }[] = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "active", label: "Active" },
  { value: "suspended", label: "Suspended" },
  { value: "rejected", label: "Rejected" },
];

function AdminBusinesses() {
  const businesses = useAllBusinesses();
  const invalidate = useAdminInvalidate();
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  const setStatus = useMutation({
    mutationFn: async ({ id, status, name }: { id: string; status: BusinessStatus; name: string }) => {
      const { error } = await supabase.from("businesses").update({ status }).eq("id", id);
      if (error) throw new Error(error.message);
      // Confirm the change landed in the database before we tell anyone it worked.
      const { data, error: checkError } = await supabase
        .from("businesses")
        .select("status, owner_id")
        .eq("id", id)
        .maybeSingle();
      if (checkError || data?.status !== status) throw new Error("not-saved");
      await supabase.from("notifications").insert({
        business_id: id,
        user_id: data.owner_id,
        title: `Business ${status}`,
        body: `${name} has been marked ${status} by the CashFlow team.`,
      });
      return status;
    },
    onSuccess: async (status) => {
      await invalidate();
      toast.success(`Business marked ${status}.`);
    },
    onError: (e) =>
      toast.error(
        e.message === "not-saved"
          ? "The change did not save. Please try again."
          : friendlyError(e, "We couldn't update this business."),
      ),
  });

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (businesses.data ?? []).filter((b) => {
      const matchStatus = filter === "all" || b.status === filter;
      const matchTerm =
        !term || b.name.toLowerCase().includes(term) || b.location.toLowerCase().includes(term);
      return matchStatus && matchTerm;
    });
  }, [businesses.data, filter, search]);

  if (businesses.isLoading) return <LoadingState label="Loading businesses..." />;
  if (businesses.error)
    return <ErrorState message="We couldn't load the businesses." onRetry={() => businesses.refetch()} />;

  return (
    <div>
      <PageHeader title="Businesses" description="Approve, activate or suspend the businesses on CashFlow." />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative sm:max-w-xs sm:flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search by name or location"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Tabs value={filter} onValueChange={setFilter} className="min-w-0">
          <TabsList className="w-full overflow-x-auto">
            {FILTERS.map((f) => (
              <TabsTrigger key={f.value} value={f.value}>
                {f.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={<Building2 className="h-8 w-8" />}
          title="No businesses match"
          description="Try a different search term or status filter."
        />
      ) : (
        <div className="space-y-3">
          {rows.map((b) => (
            <div key={b.id} className="card-surface p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-medium">{b.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {b.location || "No location"} · {b.package} plan · registered {formatDate(b.created_at)}
                  </p>
                </div>
                <Badge variant="secondary" className="capitalize">
                  {b.status}
                </Badge>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {b.status === "pending" ? (
                  <>
                    <Button
                      size="sm"
                      disabled={setStatus.isPending}
                      onClick={() => setStatus.mutate({ id: b.id, status: "approved", name: b.name })}
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={setStatus.isPending}
                      onClick={() => setStatus.mutate({ id: b.id, status: "rejected", name: b.name })}
                    >
                      Reject
                    </Button>
                  </>
                ) : null}
                {b.status !== "active" && b.status !== "pending" ? (
                  <Button
                    size="sm"
                    disabled={setStatus.isPending}
                    onClick={() => setStatus.mutate({ id: b.id, status: "active", name: b.name })}
                  >
                    Activate
                  </Button>
                ) : null}
                {b.status === "active" || b.status === "approved" ? (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={setStatus.isPending}
                    onClick={() => setStatus.mutate({ id: b.id, status: "suspended", name: b.name })}
                  >
                    Suspend
                  </Button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
