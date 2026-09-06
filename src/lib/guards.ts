import { redirect } from "@tanstack/react-router";
import type { QueryClient } from "@tanstack/react-query";
import { accountQuery, canAccessWorkspace, type Account } from "@/lib/account";

/** Business workspace gate — client-only (parent layout sets ssr: false). */
export async function requireBusinessAccess(queryClient: QueryClient): Promise<Account> {
  const account = await queryClient.ensureQueryData(accountQuery);
  if (!account.userId) throw redirect({ to: "/business/login" });
  if (!account.business) {
    if (account.isAdmin) throw redirect({ to: "/admin/dashboard" });
    throw redirect({ to: "/business/pending" });
  }
  if (!canAccessWorkspace(account.business.status)) throw redirect({ to: "/business/pending" });
  return account;
}

/** Platform admin gate — role comes from the database, never from the browser. */
export async function requireAdminAccess(queryClient: QueryClient): Promise<Account> {
  const account = await queryClient.ensureQueryData(accountQuery);
  if (!account.userId) throw redirect({ to: "/admin/login" });
  if (!account.isAdmin) throw redirect({ to: "/business/dashboard" });
  return account;
}
