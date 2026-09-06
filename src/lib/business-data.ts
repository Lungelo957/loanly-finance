import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Tables = Database["public"]["Tables"];
export type Borrower = Tables["borrowers"]["Row"];
export type Loan = Tables["loans"]["Row"];
export type Repayment = Tables["loan_repayments"]["Row"];
export type Payment = Tables["payments"]["Row"];
export type Expense = Tables["expenses"]["Row"];
export type CapitalEntry = Tables["capital_entries"]["Row"];
export type Agreement = Tables["agreements"]["Row"];
export type SupportTicket = Tables["support_tickets"]["Row"];
export type NotificationRow = Tables["notifications"]["Row"];

export type LoanWithBorrower = Loan & { borrowers: { id: string; full_name: string } | null };

function unwrap<T>(result: { data: T | null; error: { message: string } | null }): T {
  if (result.error) throw new Error(result.error.message);
  return (result.data ?? []) as T;
}

export const friendlyError = (error: unknown, fallback: string) => {
  const message = error instanceof Error ? error.message : "";
  if (/row-level security|permission/i.test(message)) {
    return "You don't have permission to do that.";
  }
  if (/network|fetch/i.test(message)) {
    return "Network problem. Check your connection and try again.";
  }
  return fallback;
};

/** Every list query is keyed by business so tenants never share cache entries. */
const key = (businessId: string | undefined, name: string) => ["business", businessId, name];

export function useBorrowers(businessId: string | undefined) {
  return useQuery({
    queryKey: key(businessId, "borrowers"),
    enabled: !!businessId,
    queryFn: async () =>
      unwrap<Borrower[]>(
        await supabase
          .from("borrowers")
          .select("*")
          .eq("business_id", businessId!)
          .order("created_at", { ascending: false }),
      ),
  });
}

export function useLoans(businessId: string | undefined) {
  return useQuery({
    queryKey: key(businessId, "loans"),
    enabled: !!businessId,
    queryFn: async () =>
      unwrap<LoanWithBorrower[]>(
        await supabase
          .from("loans")
          .select("*, borrowers(id, full_name)")
          .eq("business_id", businessId!)
          .order("created_at", { ascending: false }),
      ),
  });
}

export function useRepayments(businessId: string | undefined) {
  return useQuery({
    queryKey: key(businessId, "repayments"),
    enabled: !!businessId,
    queryFn: async () =>
      unwrap<Repayment[]>(
        await supabase
          .from("loan_repayments")
          .select("*")
          .eq("business_id", businessId!)
          .order("due_date", { ascending: true }),
      ),
  });
}

export function usePayments(businessId: string | undefined) {
  return useQuery({
    queryKey: key(businessId, "payments"),
    enabled: !!businessId,
    queryFn: async () =>
      unwrap<Payment[]>(
        await supabase
          .from("payments")
          .select("*")
          .eq("business_id", businessId!)
          .order("payment_date", { ascending: false }),
      ),
  });
}

export function useExpenses(businessId: string | undefined) {
  return useQuery({
    queryKey: key(businessId, "expenses"),
    enabled: !!businessId,
    queryFn: async () =>
      unwrap<Expense[]>(
        await supabase
          .from("expenses")
          .select("*")
          .eq("business_id", businessId!)
          .order("expense_date", { ascending: false }),
      ),
  });
}

export function useCapitalEntries(businessId: string | undefined) {
  return useQuery({
    queryKey: key(businessId, "capital"),
    enabled: !!businessId,
    queryFn: async () =>
      unwrap<CapitalEntry[]>(
        await supabase
          .from("capital_entries")
          .select("*")
          .eq("business_id", businessId!)
          .order("entry_date", { ascending: false }),
      ),
  });
}

export function useAgreements(businessId: string | undefined) {
  return useQuery({
    queryKey: key(businessId, "agreements"),
    enabled: !!businessId,
    queryFn: async () =>
      unwrap<Agreement[]>(
        await supabase
          .from("agreements")
          .select("*")
          .eq("business_id", businessId!)
          .order("created_at", { ascending: false }),
      ),
  });
}

export function useTickets(businessId: string | undefined) {
  return useQuery({
    queryKey: key(businessId, "tickets"),
    enabled: !!businessId,
    queryFn: async () =>
      unwrap<SupportTicket[]>(
        await supabase
          .from("support_tickets")
          .select("*")
          .eq("business_id", businessId!)
          .order("created_at", { ascending: false }),
      ),
  });
}

export function useNotifications(businessId: string | undefined) {
  return useQuery({
    queryKey: key(businessId, "notifications"),
    enabled: !!businessId,
    queryFn: async () =>
      unwrap<NotificationRow[]>(
        await supabase
          .from("notifications")
          .select("*")
          .eq("business_id", businessId!)
          .order("created_at", { ascending: false })
          .limit(30),
      ),
  });
}

/** Invalidate every list belonging to the current business after a write. */
export function useBusinessInvalidate(businessId: string | undefined) {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ["business", businessId] });
}

export function useLogActivity(businessId: string | undefined, userId: string | null) {
  return async (action: string, entity: string, metadata: Record<string, unknown> = {}) => {
    if (!businessId || !userId) return;
    await supabase.from("activity_logs").insert({
      business_id: businessId,
      user_id: userId,
      action,
      entity,
      metadata: metadata as never,
    });
  };
}

export function useNotify(businessId: string | undefined, userId: string | null) {
  return async (title: string, body: string) => {
    if (!businessId || !userId) return;
    await supabase.from("notifications").insert({ business_id: businessId, user_id: userId, title, body });
  };
}

export { useMutation };
