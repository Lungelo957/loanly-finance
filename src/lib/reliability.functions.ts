import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  rateReliability,
  LEVEL_EXPLANATION,
  NO_CONSENT_MESSAGE,
  NO_HISTORY_MESSAGE,
  NOT_PARTICIPATING_MESSAGE,
  type ReliabilityMetrics,
  type ReliabilityResult,
} from "@/lib/reliability";

/** Maximum reliability checks a single business may run per rolling hour. */
const HOURLY_SEARCH_LIMIT = 20;

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

<<<<<<< HEAD
function throwReliabilityError(
  operation: string,
  error: { code?: string; message: string },
): never {
  console.error("[Borrower reliability] Database operation failed", {
    operation,
    code: error.code,
    message: error.message,
  });
  throw new Error(`${operation}: ${error.message}`);
}

=======
>>>>>>> fa3c5cea69163a1016824b9ac1a2389d5f99783a
function normalise(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase().replace(/[\s()-]/g, "");
}

/**
 * One-way fingerprint of a borrower identifier. The pepper is a server-only
 * secret, so the hash cannot be reversed or recomputed by a client, and the
 * raw identifier is never stored in the network identity table.
 */
async function fingerprint(kind: string, value: string): Promise<string> {
  const pepper = process.env["SUPABASE_SERVICE_ROLE_KEY"] ?? "";
  const data = new TextEncoder().encode(`cashflow:${kind}:${value}:${pepper}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Primary identifier priority: identity number, then phone, then email.
 * Returns null when the borrower has no usable identifier.
 */
async function borrowerFingerprint(borrower: {
  id_number: string | null;
  phone: string | null;
  email: string | null;
}): Promise<string | null> {
  const idNumber = normalise(borrower.id_number);
  if (idNumber.length >= 5) return fingerprint("id", idNumber);
  const phone = normalise(borrower.phone);
  if (phone.length >= 7) return fingerprint("phone", phone.slice(-9));
  const email = normalise(borrower.email);
  if (email.includes("@")) return fingerprint("email", email);
  return null;
}

/** Records / updates the data-sharing consent for one of the caller's own borrowers. */
export const recordBorrowerConsent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { borrowerId: string; status: string; method: string }) => {
    const allowed = ["pending", "granted", "denied", "revoked"];
    if (!input.borrowerId) throw new Error("A borrower is required.");
    if (!allowed.includes(input.status)) throw new Error("Invalid consent status.");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // RLS scopes this read to the caller's own business.
    const { data: borrower, error } = await supabase
      .from("borrowers")
      .select("id, business_id, id_number, phone, email, network_borrower_id")
      .eq("id", data.borrowerId)
      .maybeSingle();
<<<<<<< HEAD
    if (error) throwReliabilityError("borrowers.read", error);
=======
    if (error) throw new Error(error.message);
>>>>>>> fa3c5cea69163a1016824b9ac1a2389d5f99783a
    if (!borrower) throw new Error("Borrower not found.");

    let networkBorrowerId = borrower.network_borrower_id as string | null;

    if (data.status === "granted") {
      const hash = await borrowerFingerprint(borrower);
      if (!hash) {
        throw new Error(
          "Add an identity number, phone number or email to this borrower before recording consent.",
        );
      }
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const existing = await supabaseAdmin
        .from("network_borrowers")
        .select("id")
        .eq("identifier_hash", hash)
        .maybeSingle();
<<<<<<< HEAD
      if (existing.error) throwReliabilityError("network_borrowers.lookup", existing.error);
=======
      if (existing.error) throw new Error(existing.error.message);
>>>>>>> fa3c5cea69163a1016824b9ac1a2389d5f99783a
      if (existing.data) {
        networkBorrowerId = existing.data.id;
      } else {
        const created = await supabaseAdmin
          .from("network_borrowers")
          .insert({ identifier_hash: hash })
          .select("id")
          .single();
<<<<<<< HEAD
        if (created.error) throwReliabilityError("network_borrowers.insert", created.error);
=======
        if (created.error) throw new Error(created.error.message);
>>>>>>> fa3c5cea69163a1016824b9ac1a2389d5f99783a
        networkBorrowerId = created.data.id;
      }
      const linked = await supabaseAdmin
        .from("borrowers")
        .update({ network_borrower_id: networkBorrowerId })
        .eq("id", borrower.id);
<<<<<<< HEAD
      if (linked.error) throwReliabilityError("borrowers.link_network_identity", linked.error);
=======
      if (linked.error) throw new Error(linked.error.message);
>>>>>>> fa3c5cea69163a1016824b9ac1a2389d5f99783a
    }

    const now = new Date().toISOString();
    const { error: upsertError } = await supabase.from("borrower_consents").upsert(
      {
        business_id: borrower.business_id,
        borrower_id: borrower.id,
        network_borrower_id: networkBorrowerId,
        status: data.status as "pending" | "granted" | "denied" | "revoked",
        method: data.method ?? "",
        granted_at: data.status === "granted" ? now : null,
        revoked_at: data.status === "revoked" ? now : null,
        recorded_by: userId,
      },
      { onConflict: "borrower_id" },
    );
<<<<<<< HEAD
    if (upsertError) throwReliabilityError("borrower_consents.upsert", upsertError);
=======
    if (upsertError) throw new Error(upsertError.message);
>>>>>>> fa3c5cea69163a1016824b9ac1a2389d5f99783a

    return { ok: true, status: data.status };
  });

/**
 * Secure cross-business reliability lookup.
 * Verifies: authenticated user -> business membership -> network participation
 * -> borrower identity -> granted consent -> rate limit, before aggregating.
 * Returns aggregated indicators only; never lender identities or amounts.
 */
export const checkBorrowerReliability = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { borrowerId: string }) => {
    if (!input.borrowerId) throw new Error("A borrower is required.");
    return input;
  })
  .handler(async ({ data, context }): Promise<ReliabilityResult> => {
    const { supabase, userId } = context;

    const { data: borrower, error } = await supabase
      .from("borrowers")
      .select("id, business_id, id_number, phone, email, network_borrower_id")
      .eq("id", data.borrowerId)
      .maybeSingle();
<<<<<<< HEAD
    if (error) throwReliabilityError("borrowers.read", error);
=======
    if (error) throw new Error(error.message);
>>>>>>> fa3c5cea69163a1016824b9ac1a2389d5f99783a
    if (!borrower) throw new Error("Borrower not found.");

    const { data: business, error: bizError } = await supabase
      .from("businesses")
      .select("id, reliability_network_enabled")
      .eq("id", borrower.business_id)
      .maybeSingle();
<<<<<<< HEAD
    if (bizError) throwReliabilityError("businesses.read_network_participation", bizError);
=======
    if (bizError) throw new Error(bizError.message);
>>>>>>> fa3c5cea69163a1016824b9ac1a2389d5f99783a
    if (!business?.reliability_network_enabled) {
      return {
        status: "not_participating",
        level: null,
        metrics: null,
        explanation: NOT_PARTICIPATING_MESSAGE,
      };
    }

<<<<<<< HEAD
    const { data: consent, error: consentError } = await supabase
=======
    const { data: consent } = await supabase
>>>>>>> fa3c5cea69163a1016824b9ac1a2389d5f99783a
      .from("borrower_consents")
      .select("status")
      .eq("borrower_id", borrower.id)
      .maybeSingle();
<<<<<<< HEAD
    if (consentError) throwReliabilityError("borrower_consents.read_requester", consentError);
=======
>>>>>>> fa3c5cea69163a1016824b9ac1a2389d5f99783a
    if (consent?.status !== "granted") {
      return {
        status: "consent_unavailable",
        level: null,
        metrics: null,
        explanation: NO_CONSENT_MESSAGE,
      };
    }

    // Rate limiting — protects the network from mass scraping.
    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
<<<<<<< HEAD
    const { count, error: searchCountError } = await supabase
=======
    const { count } = await supabase
>>>>>>> fa3c5cea69163a1016824b9ac1a2389d5f99783a
      .from("reliability_searches")
      .select("id", { count: "exact", head: true })
      .eq("business_id", borrower.business_id)
      .gte("created_at", since);
<<<<<<< HEAD
    if (searchCountError) throwReliabilityError("reliability_searches.count", searchCountError);
=======
>>>>>>> fa3c5cea69163a1016824b9ac1a2389d5f99783a
    if ((count ?? 0) >= HOURLY_SEARCH_LIMIT) {
      throw new Error("Search limit reached. Please try again later.");
    }

    const hash = await borrowerFingerprint(borrower);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let networkId = borrower.network_borrower_id as string | null;
    if (!networkId && hash) {
      const found = await supabaseAdmin
        .from("network_borrowers")
        .select("id")
        .eq("identifier_hash", hash)
        .maybeSingle();
<<<<<<< HEAD
      if (found.error) throwReliabilityError("network_borrowers.lookup", found.error);
=======
>>>>>>> fa3c5cea69163a1016824b9ac1a2389d5f99783a
      networkId = found.data?.id ?? null;
    }

    const logSearch = async (resultType: string) => {
<<<<<<< HEAD
      const { error: logError } = await supabaseAdmin.from("reliability_searches").insert({
=======
      await supabaseAdmin.from("reliability_searches").insert({
>>>>>>> fa3c5cea69163a1016824b9ac1a2389d5f99783a
        business_id: borrower.business_id,
        user_id: userId,
        network_borrower_id: networkId,
        purpose: "loan_assessment",
        result_type: resultType,
      });
<<<<<<< HEAD
      if (logError) throwReliabilityError("reliability_searches.insert", logError);
=======
>>>>>>> fa3c5cea69163a1016824b9ac1a2389d5f99783a
    };

    if (!networkId) {
      await logSearch("no_history");
      return { status: "no_history", level: null, metrics: null, explanation: NO_HISTORY_MESSAGE };
    }

    // Only borrower records from participating businesses with granted consent.
    const { data: peers, error: peerError } = await supabaseAdmin
      .from("borrowers")
      .select("id, business_id, businesses!inner(reliability_network_enabled)")
      .eq("network_borrower_id", networkId)
      .eq("businesses.reliability_network_enabled", true);
<<<<<<< HEAD
    if (peerError) throwReliabilityError("borrowers.read_network_peers", peerError);
=======
    if (peerError) throw new Error(peerError.message);
>>>>>>> fa3c5cea69163a1016824b9ac1a2389d5f99783a

    const peerIds = (peers ?? []).map((p) => p.id);
    if (peerIds.length === 0) {
      await logSearch("no_history");
      return { status: "no_history", level: null, metrics: null, explanation: NO_HISTORY_MESSAGE };
    }

<<<<<<< HEAD
    const { data: consents, error: peerConsentError } = await supabaseAdmin
=======
    const { data: consents } = await supabaseAdmin
>>>>>>> fa3c5cea69163a1016824b9ac1a2389d5f99783a
      .from("borrower_consents")
      .select("borrower_id, status")
      .in("borrower_id", peerIds)
      .eq("status", "granted");
<<<<<<< HEAD
    if (peerConsentError) throwReliabilityError("borrower_consents.read_network_peers", peerConsentError);
=======
>>>>>>> fa3c5cea69163a1016824b9ac1a2389d5f99783a
    const consentedIds = (consents ?? []).map((c) => c.borrower_id);
    if (consentedIds.length === 0) {
      await logSearch("consent_unavailable");
      return {
        status: "consent_unavailable",
        level: null,
        metrics: null,
        explanation: NO_CONSENT_MESSAGE,
      };
    }

    const { data: loans, error: loanError } = await supabaseAdmin
      .from("loans")
      .select("id, total_repayable, due_date, status")
      .in("borrower_id", consentedIds);
<<<<<<< HEAD
    if (loanError) throwReliabilityError("loans.read_network_aggregate", loanError);
=======
    if (loanError) throw new Error(loanError.message);
>>>>>>> fa3c5cea69163a1016824b9ac1a2389d5f99783a

    const relevant = (loans ?? []).filter((l) => l.status !== "cancelled");
    if (relevant.length === 0) {
      await logSearch("no_history");
      return { status: "no_history", level: null, metrics: null, explanation: NO_HISTORY_MESSAGE };
    }

    const { data: payments, error: payError } = await supabaseAdmin
      .from("payments")
      .select("loan_id, amount, payment_date")
      .in(
        "loan_id",
        relevant.map((l) => l.id),
      );
<<<<<<< HEAD
    if (payError) throwReliabilityError("payments.read_network_aggregate", payError);
=======
    if (payError) throw new Error(payError.message);
>>>>>>> fa3c5cea69163a1016824b9ac1a2389d5f99783a

    const paidByLoan = new Map<string, { total: number; last: string }>();
    for (const p of payments ?? []) {
      const current = paidByLoan.get(p.loan_id) ?? { total: 0, last: "" };
      current.total = round2(current.total + Number(p.amount));
      if (p.payment_date > current.last) current.last = p.payment_date;
      paidByLoan.set(p.loan_id, current);
    }

    const today = new Date().toISOString().slice(0, 10);
    let paidOnTime = 0;
    let paidLate = 0;
    let active = 0;
    let overdue = 0;

    for (const loan of relevant) {
      const paid = paidByLoan.get(loan.id) ?? { total: 0, last: "" };
      const outstanding = round2(Number(loan.total_repayable) - paid.total);
      const settled = loan.status === "completed" || outstanding <= 0;
      if (settled) {
        const finalDate = paid.last || loan.due_date;
        if (finalDate && loan.due_date && finalDate > loan.due_date) paidLate += 1;
        else paidOnTime += 1;
      } else if (loan.due_date && today > loan.due_date) {
        overdue += 1;
      } else {
        active += 1;
      }
    }

    const completedLoans = paidOnTime + paidLate;
    const metrics: ReliabilityMetrics = {
      completedLoans,
      paidOnTime,
      paidLate,
      activeObligations: active,
      overdueObligations: overdue,
      onTimeRate: completedLoans === 0 ? 0 : Math.round((paidOnTime / completedLoans) * 1000) / 10,
    };

    const level = rateReliability(metrics);
    await logSearch("history_available");

    return {
      status: "history_available",
      level,
      metrics,
      explanation: LEVEL_EXPLANATION[level],
    };
  });
