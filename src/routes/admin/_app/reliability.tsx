import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingState, ErrorState } from "@/components/state-views";
import { supabase } from "@/integrations/supabase/client";
import { CONSENT_LABEL, type ConsentStatus } from "@/lib/reliability";

export const Route = createFileRoute("/admin/_app/reliability")({
  head: () => ({
    meta: [
      { title: "Reliability network — CashFlow admin" },
      { name: "description", content: "Control which businesses take part in the reliability network." },
      { property: "og:title", content: "Reliability network — CashFlow admin" },
      { property: "og:description", content: "Participation, consent statistics and search activity." },
    ],
  }),
  component: AdminReliabilityPage,
});

function AdminReliabilityPage() {
  const queryClient = useQueryClient();

  const data = useQuery({
    queryKey: ["admin", "reliability"],
    queryFn: async () => {
      const [businesses, consents, searches] = await Promise.all([
        supabase
          .from("businesses")
          .select("id, name, status, reliability_network_enabled")
          .order("name"),
        supabase.from("borrower_consents").select("status"),
        supabase
          .from("reliability_searches")
          .select("id, business_id, created_at, result_type")
          .order("created_at", { ascending: false })
          .limit(25),
      ]);
      if (businesses.error) throw new Error(businesses.error.message);
      if (consents.error) throw new Error(consents.error.message);
      if (searches.error) throw new Error(searches.error.message);
      return {
        businesses: businesses.data ?? [],
        consents: consents.data ?? [],
        searches: searches.data ?? [],
      };
    },
  });

  const toggle = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const { data: row, error } = await supabase
        .from("businesses")
        .update({ reliability_network_enabled: enabled })
        .eq("id", id)
        .select("reliability_network_enabled")
        .single();
      if (error) throw new Error(error.message);
      if (row.reliability_network_enabled !== enabled) throw new Error("Change did not save.");
      return enabled;
    },
    onSuccess: async (enabled) => {
      await queryClient.invalidateQueries({ queryKey: ["admin", "reliability"] });
      toast.success(enabled ? "Business added to the network." : "Business removed from the network.");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not update participation."),
  });

  if (data.isLoading) return <LoadingState label="Loading network activity..." />;
  if (data.error) return <ErrorState message={(data.error as Error).message} onRetry={() => data.refetch()} />;

  const counts = (["granted", "denied", "revoked", "pending"] as ConsentStatus[]).map((s) => ({
    status: s,
    count: (data.data?.consents ?? []).filter((c) => c.status === s).length,
  }));
  const nameOf = (id: string) => data.data?.businesses.find((b) => b.id === id)?.name ?? "Unknown";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Borrower reliability network"
        description="Participation, consent statistics and search activity. No borrower financial details are shown here."
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {counts.map((c) => (
          <div key={c.status} className="card-surface p-4">
            <p className="text-xs text-muted-foreground">{CONSENT_LABEL[c.status]} consents</p>
            <p className="text-2xl font-semibold">{c.count}</p>
          </div>
        ))}
      </div>

      <div className="card-surface overflow-hidden">
        <h2 className="border-b border-border/60 px-5 py-3 text-sm font-semibold">Participating businesses</h2>
        <ul className="divide-y divide-border/60">
          {data.data?.businesses.map((b) => (
            <li key={b.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
              <div>
                <p className="font-medium">{b.name}</p>
                <p className="text-xs text-muted-foreground">{b.status}</p>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant={b.reliability_network_enabled ? "default" : "secondary"}>
                  {b.reliability_network_enabled ? "In network" : "Not participating"}
                </Badge>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={toggle.isPending}
                  onClick={() =>
                    toggle.mutate({ id: b.id, enabled: !b.reliability_network_enabled })
                  }
                >
                  {b.reliability_network_enabled ? "Disable" : "Enable"}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="card-surface overflow-hidden">
        <h2 className="border-b border-border/60 px-5 py-3 text-sm font-semibold">Recent reliability searches</h2>
        {data.data?.searches.length === 0 ? (
          <p className="px-5 py-6 text-sm text-muted-foreground">No searches have been run yet.</p>
        ) : (
          <ul className="divide-y divide-border/60 text-sm">
            {data.data?.searches.map((s) => (
              <li key={s.id} className="flex flex-wrap justify-between gap-2 px-5 py-3">
                <span>{nameOf(s.business_id)}</span>
                <span className="text-muted-foreground">{s.result_type.replace(/_/g, " ")}</span>
                <span className="text-muted-foreground">
                  {new Date(s.created_at).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
