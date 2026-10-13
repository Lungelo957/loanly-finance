import { queryOptions, useQuery, type QueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type BusinessRow = Database["public"]["Tables"]["businesses"]["Row"];
export type BusinessStatus = Database["public"]["Enums"]["business_status"];

export interface Account {
  userId: string | null;
  email: string | null;
  fullName: string;
  isAdmin: boolean;
  business: BusinessRow | null;
}

export const EMPTY_ACCOUNT: Account = {
  userId: null,
  email: null,
  fullName: "",
  isAdmin: false,
  business: null,
};

/** Resolves the signed-in user, their profile, platform role and their business. */
export async function loadAccount(): Promise<Account> {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return EMPTY_ACCOUNT;

  const [profileRes, rolesRes, memberRes] = await Promise.all([
    supabase.from("profiles").select("full_name, email").eq("id", user.id).maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", user.id),
    supabase
      .from("business_members")
      .select("business_id, businesses(*)")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle(),
  ]);

  const isAdmin = (rolesRes.data ?? []).some((r) => r.role === "system_admin");
  const business = (memberRes.data?.businesses as BusinessRow | null | undefined) ?? null;

  return {
    userId: user.id,
    email: user.email ?? profileRes.data?.email ?? null,
    fullName: profileRes.data?.full_name ?? "",
    isAdmin,
    business,
  };
}

export const accountQuery = queryOptions({
  queryKey: ["account"],
  queryFn: loadAccount,
  staleTime: 30_000,
});

export function useAccount() {
  return useQuery(accountQuery);
}

export function canAccessWorkspace(status: BusinessStatus | undefined | null): boolean {
  return status === "approved" || status === "active";
}

export const STATUS_MESSAGE: Record<BusinessStatus, string> = {
  pending: "Your business registration is pending administrator approval.",
  approved: "Your business is approved.",
  active: "Your business is active.",
  suspended: "Your business account has been suspended. Please contact support.",
  rejected: "Your business registration was not approved.",
};

export async function signOutAndRedirect(queryClient: QueryClient, redirect: () => void) {
  await queryClient.cancelQueries();
  queryClient.clear();
  await supabase.auth.signOut();
  redirect();
}
