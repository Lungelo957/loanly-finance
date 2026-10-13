import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Clock, RefreshCw, ShieldAlert } from "lucide-react";
import { AuthLayout } from "@/components/auth-layout";
import { Button } from "@/components/ui/button";
import { accountQuery, canAccessWorkspace, signOutAndRedirect, STATUS_MESSAGE, useAccount } from "@/lib/account";

export const Route = createFileRoute("/business/pending")({
  beforeLoad: async ({ context }) => {
    const account = await context.queryClient.ensureQueryData(accountQuery);
    if (!account.userId) throw redirect({ to: "/business/login" });
    if (account.business && canAccessWorkspace(account.business.status)) {
      throw redirect({ to: "/business/dashboard" });
    }
  },
  head: () => ({
    meta: [
      { title: "Business approval status — CashFlow" },
      { name: "description", content: "Check your CashFlow business workspace approval status." },
      { property: "og:title", content: "Business approval status — CashFlow" },
      { property: "og:description", content: "Check your CashFlow business workspace approval status." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PendingPage,
});

function PendingPage() {
  const { data: account, isFetching, refetch } = useAccount();
  const router = useRouter();
  const queryClient = useQueryClient();
  const status = account?.business?.status ?? "pending";
  const rejected = status === "rejected" || status === "suspended";

  return (
    <AuthLayout
      portal="Business portal"
      title={rejected ? "Access unavailable" : "Awaiting approval"}
      subtitle={account?.business?.name ?? "Your business"}
    >
      <div className="flex flex-col items-center gap-4 text-center">
        {rejected ? (
          <ShieldAlert className="h-10 w-10 text-destructive" />
        ) : (
          <Clock className="h-10 w-10 text-gold" />
        )}
        <p className="text-sm text-muted-foreground">{STATUS_MESSAGE[status]}</p>
        <div className="flex w-full flex-col gap-2 sm:flex-row">
          <Button variant="outline" className="flex-1" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
            Check again
          </Button>
          <Button
            variant="ghost"
            className="flex-1"
            onClick={() =>
              signOutAndRedirect(queryClient, () =>
                router.navigate({ to: "/business/login", replace: true }),
              )
            }
          >
            Sign out
          </Button>
        </div>
      </div>
    </AuthLayout>
  );
}
