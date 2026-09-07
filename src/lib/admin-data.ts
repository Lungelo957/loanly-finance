import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Tables = Database["public"]["Tables"];
export type BusinessRow = Tables["businesses"]["Row"];
export type TicketRow = Tables["support_tickets"]["Row"];
export type BusinessStatus = Database["public"]["Enums"]["business_status"];
export type TicketStatus = Database["public"]["Enums"]["ticket_status"];

export function useAllBusinesses() {
  return useQuery({
    queryKey: ["admin", "businesses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("businesses")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });
}

export function useAllTickets() {
  return useQuery({
    queryKey: ["admin", "tickets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("support_tickets")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });
}

export function usePlatformTotals() {
  return useQuery({
    queryKey: ["admin", "totals"],
    queryFn: async () => {
      const [loans, payments, borrowers] = await Promise.all([
        supabase.from("loans").select("principal_amount, total_repayable, status"),
        supabase.from("payments").select("amount"),
        supabase.from("borrowers").select("id"),
      ]);
      if (loans.error) throw new Error(loans.error.message);
      if (payments.error) throw new Error(payments.error.message);
      if (borrowers.error) throw new Error(borrowers.error.message);
      const loanRows = loans.data ?? [];
      return {
        loanCount: loanRows.length,
        activeLoans: loanRows.filter((l) => l.status === "active").length,
        principal: loanRows.reduce((a, l) => a + Number(l.principal_amount), 0),
        collected: (payments.data ?? []).reduce((a, p) => a + Number(p.amount), 0),
        borrowerCount: (borrowers.data ?? []).length,
      };
    },
  });
}

export function useAdminInvalidate() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ["admin"] });
}
