import { createFileRoute, redirect } from "@tanstack/react-router";
import { accountQuery } from "@/lib/account";

export const Route = createFileRoute("/admin/")({
  // Signed-in administrators go straight to the dashboard, everyone else signs in first.
  beforeLoad: async ({ context }) => {
    const account = await context.queryClient.ensureQueryData(accountQuery);
    if (!account.userId || !account.isAdmin) throw redirect({ to: "/admin/login" });
    throw redirect({ to: "/admin/dashboard" });
  },
  component: () => null,
});
