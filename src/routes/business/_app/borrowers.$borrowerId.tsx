import { useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  CircleDollarSign,
  CreditCard,
  FileText,
  Mail,
  MapPin,
  Phone,
  UserRound,
  Wallet,
} from "lucide-react";
import { PageHeader } from "@/components/app-shell";
import { StatCard } from "@/components/stat-card";
import { EmptyState, ErrorState, LoadingState } from "@/components/state-views";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/lib/account";
import type { Borrower, Loan, Payment } from "@/lib/business-data";
import { friendlyError } from "@/lib/business-data";
import { loanDisplayStatus, outstandingBalance } from "@/lib/finance";
import { formatCurrency, formatDate, todayISO } from "@/lib/format";

export const Route = createFileRoute("/business/_app/borrowers/$borrowerId")({
  head: () => ({
    meta: [
      { title: "Borrower profile — CashFlow" },
      { name: "description", content: "Borrower profile, loan history and recorded repayments." },
    ],
  }),
  component: BorrowerProfilePage,
});

type BorrowerProfile = {
  borrower: Borrower | null;
  loans: Loan[];
  payments: Payment[];
};

const statusTone: Record<string, string> = {
  active: "bg-accent text-accent-foreground",
  due: "bg-primary/10 text-primary",
  overdue: "bg-destructive/10 text-destructive",
  paid: "bg-success/15 text-success",
  defaulted: "bg-destructive/10 text-destructive",
  cancelled: "bg-muted text-muted-foreground",
};

function BorrowerProfilePage() {
  const { borrowerId } = Route.useParams();
  const { data: account } = useAccount();
  const businessId = account?.business?.id;
  const today = todayISO();

  const profile = useQuery<BorrowerProfile>({
    queryKey: ["business", businessId, "borrower-profile", borrowerId],
    enabled: !!businessId && !!borrowerId,
    queryFn: async () => {
      if (!businessId) throw new Error("no-business");
      const { data: borrower, error: borrowerError } = await supabase
        .from("borrowers")
        .select("*")
        .eq("id", borrowerId)
        .eq("business_id", businessId)
        .maybeSingle();
      if (borrowerError) throw new Error(borrowerError.message);
      if (!borrower) return { borrower: null, loans: [], payments: [] };

      const { data: loans, error: loansError } = await supabase
        .from("loans")
        .select("*")
        .eq("borrower_id", borrowerId)
        .eq("business_id", businessId)
        .order("start_date", { ascending: false })
        .order("created_at", { ascending: false });
      if (loansError) throw new Error(loansError.message);

      const loanRows = loans ?? [];
      const loanIds = loanRows.map((loan) => loan.id);
      if (loanIds.length === 0) return { borrower, loans: loanRows, payments: [] };

      const { data: payments, error: paymentsError } = await supabase
        .from("payments")
        .select("*")
        .eq("business_id", businessId)
        .in("loan_id", loanIds)
        .order("payment_date", { ascending: false })
        .order("created_at", { ascending: false });
      if (paymentsError) throw new Error(paymentsError.message);

      return { borrower, loans: loanRows, payments: payments ?? [] };
    },
  });

  const paymentTotals = useMemo(() => {
    const totals = new Map<string, number>();
    for (const payment of profile.data?.payments ?? []) {
      totals.set(payment.loan_id, (totals.get(payment.loan_id) ?? 0) + Number(payment.amount));
    }
    return totals;
  }, [profile.data?.payments]);

  const loanStatuses = (profile.data?.loans ?? []).map((loan) => ({
    loan,
    status: loanDisplayStatus(
      loan.status,
      loan.due_date,
      Number(loan.total_repayable),
      paymentTotals.get(loan.id) ?? 0,
      today,
    ),
  }));
  const completedCount = loanStatuses.filter(({ status }) => status === "paid").length;
  const activeCount = loanStatuses.filter(
    ({ status }) => status === "active" || status === "due",
  ).length;
  const overdueCount = loanStatuses.filter(({ status }) => status === "overdue").length;
  const totalPrincipal = (profile.data?.loans ?? []).reduce(
    (sum, loan) => sum + Number(loan.principal_amount),
    0,
  );
  const totalOutstanding = loanStatuses.reduce((sum, { loan, status }) => {
    if (status === "paid" || status === "cancelled") return sum;
    return sum + outstandingBalance(Number(loan.total_repayable), paymentTotals.get(loan.id) ?? 0);
  }, 0);
  const totalReceived = (profile.data?.payments ?? []).reduce(
    (sum, payment) => sum + Number(payment.amount),
    0,
  );
  const onTimePayments = (profile.data?.payments ?? []).filter((payment) => {
    const loan = profile.data?.loans.find((item) => item.id === payment.loan_id);
    return !!loan && payment.payment_date <= loan.due_date;
  }).length;
  const latePayments = (profile.data?.payments ?? []).length - onTimePayments;
  const loanById = new Map((profile.data?.loans ?? []).map((loan) => [loan.id, loan]));

  if (profile.isLoading) return <LoadingState label="Loading borrower profile..." />;
  if (profile.error) {
    return (
      <div className="space-y-4">
        <BackLink />
        <ErrorState
          message={friendlyError(profile.error, "We couldn't load this borrower profile.")}
          onRetry={() => void profile.refetch()}
        />
      </div>
    );
  }
  if (!profile.data?.borrower) {
    return (
      <div className="space-y-4">
        <BackLink />
        <EmptyState
          icon={<UserRound />}
          title="Borrower not found"
          description="This borrower may have been removed or may not belong to your business workspace."
        />
      </div>
    );
  }

  const borrower = profile.data.borrower;

  return (
    <div className="space-y-6">
      <BackLink />
      <PageHeader
        title={borrower.full_name}
        description="Borrower profile and financial history."
        action={
          <Button asChild size="sm" variant="outline">
            <Link to="/business/borrowers" search={{ edit: borrower.id }}>
              <FileText className="h-4 w-4" /> Edit details
            </Link>
          </Button>
        }
      />

      <section
        aria-label="Financial summary"
        className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6"
      >
        <StatCard
          label="Principal borrowed"
          value={formatCurrency(totalPrincipal)}
          icon={Wallet}
          hint={`${profile.data.loans.length} historical loans`}
        />
        <StatCard
          label="Outstanding"
          value={formatCurrency(totalOutstanding)}
          icon={CircleDollarSign}
          tone={totalOutstanding > 0 ? "negative" : "positive"}
          hint="Principal plus interest less payments"
        />
        <StatCard
          label="Completed loans"
          value={String(completedCount)}
          icon={Check}
          tone="positive"
        />
        <StatCard label="Active loans" value={String(activeCount)} icon={CreditCard} />
        <StatCard
          label="Overdue loans"
          value={String(overdueCount)}
          icon={CalendarDays}
          tone="negative"
        />
        <StatCard
          label="Payments recorded"
          value={String(profile.data.payments.length)}
          icon={CircleDollarSign}
          hint={`${formatCurrency(totalReceived)} received`}
        />
      </section>

      <section className="card-surface p-4 sm:p-5" aria-labelledby="borrower-information">
        <h2 id="borrower-information" className="mb-4 text-base font-semibold">
          Borrower information
        </h2>
        <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
          <ProfileField label="Phone number" icon={<Phone />} value={borrower.phone} />
          <ProfileField label="Email" icon={<Mail />} value={borrower.email} />
          <ProfileField
            label="Identification number"
            icon={<UserRound />}
            value={borrower.id_number}
          />
          <ProfileField
            label="Employment"
            icon={<BriefcaseBusiness />}
            value={borrower.employment}
          />
          <ProfileField
            label="Monthly income"
            icon={<CircleDollarSign />}
            value={formatCurrency(Number(borrower.monthly_income))}
          />
          <ProfileField
            label="Home address"
            icon={<MapPin />}
            value={borrower.home_address || borrower.address}
          />
          <ProfileField label="Work address" icon={<MapPin />} value={borrower.work_address} />
          <ProfileField
            label="Other / Rental address"
            icon={<MapPin />}
            value={borrower.other_address}
          />
          <ProfileField label="Notes" icon={<FileText />} value={borrower.notes} />
        </dl>
      </section>

      <section aria-labelledby="loan-history">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h2 id="loan-history" className="text-base font-semibold">
              Loan history
            </h2>
            <p className="text-sm text-muted-foreground">
              Principal, interest, repayments and remaining balances.
            </p>
          </div>
          <p className="text-sm text-muted-foreground">{profile.data.loans.length} loans</p>
        </div>
        {profile.data.loans.length === 0 ? (
          <EmptyState
            title="No loans yet"
            description="Loans issued to this borrower will appear here."
          />
        ) : (
          <div className="card-surface divide-y divide-border">
            {loanStatuses.map(({ loan, status }) => {
              const paid = paymentTotals.get(loan.id) ?? 0;
              const outstanding = outstandingBalance(Number(loan.total_repayable), paid);
              return (
                <article key={loan.id} className="space-y-3 p-4 sm:p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">
                        {formatCurrency(Number(loan.principal_amount))} principal
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {Number(loan.interest_rate)}% interest · initial loan{" "}
                        {formatDate(loan.start_date)} · promised {formatDate(loan.due_date)}
                      </p>
                    </div>
                    <Badge className={`capitalize ${statusTone[status] ?? ""}`} variant="secondary">
                      {status}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                    <Amount label="Interest" value={formatCurrency(Number(loan.total_interest))} />
                    <Amount
                      label="Expected repayment"
                      value={formatCurrency(Number(loan.total_repayable))}
                    />
                    <Amount label="Amount repaid" value={formatCurrency(paid)} />
                    <Amount label="Outstanding" value={formatCurrency(outstanding)} />
                  </div>
                  <Button asChild size="sm" variant="outline">
                    <Link to="/business/loans" search={{ loan: loan.id }}>
                      View loan details
                    </Link>
                  </Button>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section aria-labelledby="payment-history">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h2 id="payment-history" className="text-base font-semibold">
              Payment history
            </h2>
            <p className="text-sm text-muted-foreground">
              {onTimePayments} on-time and {latePayments} late recorded repayments.
            </p>
          </div>
          <p className="text-sm font-medium tabular-nums">
            {formatCurrency(totalReceived)} received
          </p>
        </div>
        {profile.data.payments.length === 0 ? (
          <EmptyState
            title="No payments recorded"
            description="Payments linked to this borrower's loans will appear here."
          />
        ) : (
          <div className="card-surface divide-y divide-border">
            {profile.data.payments.map((payment) => {
              const loan = loanById.get(payment.loan_id);
              return (
                <div
                  key={payment.id}
                  className="flex flex-wrap items-start justify-between gap-3 px-4 py-3 sm:px-5"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium">
                      {loan ? (
                        <Link
                          to="/business/loans"
                          search={{ loan: loan.id }}
                          className="hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          {formatCurrency(Number(loan.principal_amount))} loan · issued{" "}
                          {formatDate(loan.start_date)} · due {formatDate(loan.due_date)}
                        </Link>
                      ) : (
                        "Loan repayment"
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(payment.payment_date)}
                      {payment.reference ? ` · Ref ${payment.reference}` : ""}
                    </p>
                    {payment.notes ? (
                      <p className="mt-1 break-words text-xs text-muted-foreground">
                        {payment.notes}
                      </p>
                    ) : null}
                  </div>
                  <p className="text-sm font-semibold tabular-nums text-success">
                    {formatCurrency(Number(payment.amount))}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function BackLink() {
  return (
    <Button asChild variant="ghost" size="sm" className="-ml-2">
      <Link to="/business/borrowers">
        <ArrowLeft className="h-4 w-4" /> Back to borrowers
      </Link>
    </Button>
  );
}

function ProfileField({
  label,
  icon,
  value,
}: {
  label: string;
  icon: React.ReactNode;
  value: string;
}) {
  return (
    <div className="min-w-0">
      <dt className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        {icon}
        {label}
      </dt>
      <dd className="mt-1 break-words whitespace-pre-wrap text-sm">{value || "Not provided"}</dd>
    </div>
  );
}

function Amount({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-medium tabular-nums">{value}</p>
    </div>
  );
}
