import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ShieldCheck, Search } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { LoadingState, EmptyState } from "@/components/state-views";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/lib/account";
import { useBorrowers, friendlyError } from "@/lib/business-data";
import {
  CONSENT_LABEL,
  LEVEL_LABEL,
  RELIABILITY_DISCLAIMER,
  type ConsentStatus,
  type ReliabilityResult,
} from "@/lib/reliability";
import { checkBorrowerReliability, recordBorrowerConsent } from "@/lib/reliability.functions";

export const Route = createFileRoute("/business/_app/reliability")({
  head: () => ({
    meta: [
      { title: "Borrower reliability — CashFlow" },
      {
        name: "description",
        content: "Check a borrower's repayment reliability across participating CashFlow businesses.",
      },
      { property: "og:title", content: "Borrower reliability — CashFlow" },
      {
        property: "og:description",
        content: "Consent-based repayment reliability summaries for lending decisions.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ReliabilityPage,
});

const LEVEL_TONE: Record<string, string> = {
  excellent: "bg-emerald-100 text-emerald-800",
  good: "bg-green-100 text-green-800",
  fair: "bg-amber-100 text-amber-900",
  poor: "bg-orange-100 text-orange-900",
  high_risk: "bg-red-100 text-red-800",
};

<<<<<<< HEAD
function showReliabilityError(error: unknown, fallback: string) {
  if (import.meta.env.DEV && error instanceof Error) {
    console.error("[Borrower reliability] Request failed", { message: error.message });
    toast.error(error.message);
    return;
  }
  toast.error(friendlyError(error, fallback));
}

=======
>>>>>>> fa3c5cea69163a1016824b9ac1a2389d5f99783a
function ReliabilityPage() {
  const { data: account } = useAccount();
  const businessId = account?.business?.id;
  const queryClient = useQueryClient();
  const { data: borrowers, isLoading } = useBorrowers(businessId);

  const [borrowerId, setBorrowerId] = useState("");
  const [method, setMethod] = useState("Signed loan application form");
  const [result, setResult] = useState<ReliabilityResult | null>(null);

  const consents = useQuery({
    queryKey: ["business", businessId, "consents"],
    enabled: !!businessId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("borrower_consents")
        .select("borrower_id, status, method, granted_at, revoked_at, updated_at")
        .eq("business_id", businessId!);
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });

  const consentFor = (id: string) =>
    (consents.data ?? []).find((c) => c.borrower_id === id)?.status as ConsentStatus | undefined;

  const recordConsent = useServerFn(recordBorrowerConsent);
  const runCheck = useServerFn(checkBorrowerReliability);

  const saveConsent = useMutation({
    mutationFn: async (status: ConsentStatus) => {
      if (!borrowerId) throw new Error("Choose a borrower first.");
      return recordConsent({ data: { borrowerId, status, method } });
    },
    onSuccess: async (r) => {
      setResult(null);
      await queryClient.invalidateQueries({ queryKey: ["business", businessId, "consents"] });
      toast.success(`Data-sharing preference recorded as ${CONSENT_LABEL[r.status as ConsentStatus]}.`);
    },
<<<<<<< HEAD
    onError: (e) => showReliabilityError(e, "We couldn't record that consent."),
=======
    onError: (e) => toast.error(friendlyError(e, "We couldn't record that consent.")),
>>>>>>> fa3c5cea69163a1016824b9ac1a2389d5f99783a
  });

  const check = useMutation({
    mutationFn: async () => {
      if (!borrowerId) throw new Error("Choose a borrower first.");
      return runCheck({ data: { borrowerId } });
    },
    onSuccess: (r) => setResult(r),
<<<<<<< HEAD
    onError: (e) => showReliabilityError(e, "We couldn't complete the reliability check."),
=======
    onError: (e) => toast.error(friendlyError(e, "We couldn't complete the reliability check.")),
>>>>>>> fa3c5cea69163a1016824b9ac1a2389d5f99783a
  });

  if (isLoading) return <LoadingState label="Loading borrowers..." />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Borrower reliability check"
        description="A limited, consent-based repayment summary from participating CashFlow businesses."
      />

      {(borrowers ?? []).length === 0 ? (
        <EmptyState
          icon={<ShieldCheck className="h-6 w-6" />}
          title="No borrowers yet"
          description="Add a borrower first, then record their data-sharing consent and run a reliability check."
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="card-surface space-y-4 p-5">
            <div className="space-y-2">
              <Label htmlFor="borrower">Borrower you are processing</Label>
              <select
                id="borrower"
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={borrowerId}
                onChange={(e) => {
                  setBorrowerId(e.target.value);
                  setResult(null);
                }}
              >
                <option value="">Select a borrower</option>
                {(borrowers ?? []).map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.full_name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                You can only check borrowers you have recorded in your own business.
              </p>
            </div>

            {borrowerId ? (
              <div className="rounded-md border border-border/70 p-3 text-sm">
                <span className="text-muted-foreground">Data sharing preference: </span>
                <span className="font-medium">
                  {CONSENT_LABEL[consentFor(borrowerId) ?? "pending"]}
                </span>
              </div>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="method">How consent was captured</Label>
              <Input
                id="method"
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                placeholder="e.g. Signed loan application form"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                disabled={!borrowerId || saveConsent.isPending}
                onClick={() => saveConsent.mutate("granted")}
              >
                Record consent granted
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={!borrowerId || saveConsent.isPending}
                onClick={() => saveConsent.mutate("denied")}
              >
                Denied
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={!borrowerId || saveConsent.isPending}
                onClick={() => saveConsent.mutate("revoked")}
              >
                Revoke
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              Only record consent you have genuinely obtained from the borrower. Recording it here is a
              technical control, not legal advice.
            </p>

            <Button
              className="w-full"
              disabled={!borrowerId || check.isPending}
              onClick={() => check.mutate()}
            >
              <Search className="mr-2 h-4 w-4" />
              {check.isPending ? "Checking..." : "Check reliability"}
            </Button>
          </div>

          <div className="card-surface p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              CashFlow reliability
            </h2>

            {!result ? (
              <p className="mt-6 text-sm text-muted-foreground">
                Choose a borrower and run a check to see their reliability summary.
              </p>
            ) : result.status !== "history_available" || !result.metrics ? (
              <p className="mt-6 text-sm">{result.explanation}</p>
            ) : (
              <div className="mt-4 space-y-4">
                <Badge className={LEVEL_TONE[result.level ?? "fair"]}>
                  ● {LEVEL_LABEL[result.level!]}
                </Badge>
                <p className="text-sm text-muted-foreground">{result.explanation}</p>
                <dl className="grid grid-cols-2 gap-3 text-sm">
                  <Metric label="Completed loans" value={result.metrics.completedLoans} />
                  <Metric label="On-time repayments" value={result.metrics.paidOnTime} />
                  <Metric label="Late repayments" value={result.metrics.paidLate} />
                  <Metric label="On-time rate" value={`${result.metrics.onTimeRate}%`} />
                  <Metric label="Current active obligations" value={result.metrics.activeObligations} />
                  <Metric
                    label="Current overdue obligations"
                    value={result.metrics.overdueObligations}
                  />
                </dl>
                <p className="text-xs text-muted-foreground">Data sharing: Authorized</p>
              </div>
            )}

            <p className="mt-6 border-t border-border/60 pt-4 text-xs text-muted-foreground">
              {RELIABILITY_DISCLAIMER}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md border border-border/70 p-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-lg font-semibold">{value}</dd>
    </div>
  );
}
