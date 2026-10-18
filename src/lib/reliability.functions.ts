import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  rateReliability,
  calculateReliabilityMetrics,
  LEVEL_EXPLANATION,
  NO_CONSENT_MESSAGE,
  NO_HISTORY_MESSAGE,
  NOT_PARTICIPATING_MESSAGE,
  UNMATCHED_BORROWER_MESSAGE,
  type ReliabilityMetrics,
  type ReliabilityResult,
} from "@/lib/reliability";

/** Maximum reliability checks a single business may run per rolling hour. */
const HOURLY_SEARCH_LIMIT = 20;

function normalise(value: string | null | undefined): string {
  return (value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s()-]/g, "");
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
    if (error) throw new Error(error.message);
    if (!borrower) throw new Error("Borrower not found.");
    const { data: isActiveMember, error: membershipError } = await supabase.rpc(
      "is_active_business_member",
      { _business_id: borrower.business_id },
    );
    if (membershipError) throw new Error(membershipError.message);
    if (!isActiveMember)
      throw new Error("Only an active member of this borrower's business can record consent.");

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
        .upsert({ identifier_hash: hash }, { onConflict: "identifier_hash" })
        .select("id")
        .single();
      if (existing.error) throw new Error(existing.error.message);
      networkBorrowerId = existing.data.id;
      const linked = await supabaseAdmin
        .from("borrowers")
        .update({ network_borrower_id: networkBorrowerId })
        .eq("id", borrower.id)
        .eq("business_id", borrower.business_id);
      if (linked.error) throw new Error(linked.error.message);
    }

    const now = new Date().toISOString();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: upsertError } = await supabaseAdmin.from("borrower_consents").upsert(
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
    if (upsertError) throw new Error(upsertError.message);

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
    if (error) throw new Error(error.message);
    if (!borrower) throw new Error("Borrower not found.");
    const { data: isActiveMember, error: membershipError } = await supabase.rpc(
      "is_active_business_member",
      { _business_id: borrower.business_id },
    );
    if (membershipError) throw new Error(membershipError.message);
    if (!isActiveMember)
      throw new Error(
        "Only an active member of this borrower's business can run a reliability check.",
      );

    const { data: business, error: bizError } = await supabase
      .from("businesses")
      .select("id, reliability_network_enabled")
      .eq("id", borrower.business_id)
      .maybeSingle();
    if (bizError) throw new Error(bizError.message);
    if (!business?.reliability_network_enabled) {
      return {
        status: "not_participating",
        level: null,
        metrics: null,
        explanation: NOT_PARTICIPATING_MESSAGE,
      };
    }

    const { data: consent, error: consentError } = await supabase
      .from("borrower_consents")
      .select("business_id, network_borrower_id, status")
      .eq("borrower_id", borrower.id)
      .eq("business_id", borrower.business_id)
      .maybeSingle();
    if (consentError) throw new Error(consentError.message);
    if (consent?.status !== "granted") {
      return {
        status: "consent_unavailable",
        level: null,
        metrics: null,
        explanation: NO_CONSENT_MESSAGE,
      };
    }

    const hash = await borrowerFingerprint(borrower);
    if (!hash) {
      return {
        status: "unmatched",
        level: null,
        metrics: null,
        explanation: UNMATCHED_BORROWER_MESSAGE,
      };
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let networkId = borrower.network_borrower_id as string | null;
    if (networkId) {
      const { data: identity, error: identityError } = await supabaseAdmin
        .from("network_borrowers")
        .select("id, identifier_hash")
        .eq("id", networkId)
        .maybeSingle();
      if (identityError) throw new Error(identityError.message);
      if (!identity || identity.identifier_hash !== hash) {
        return {
          status: "unmatched",
          level: null,
          metrics: null,
          explanation: UNMATCHED_BORROWER_MESSAGE,
        };
      }
    } else {
      const { data: identity, error: identityError } = await supabaseAdmin
        .from("network_borrowers")
        .select("id")
        .eq("identifier_hash", hash)
        .maybeSingle();
      if (identityError) throw new Error(identityError.message);
      networkId = identity?.id ?? null;
    }

    if (!networkId) {
      return {
        status: "unmatched",
        level: null,
        metrics: null,
        explanation: UNMATCHED_BORROWER_MESSAGE,
      };
    }

    if (consent.network_borrower_id !== networkId) {
      return {
        status: "consent_unavailable",
        level: null,
        metrics: null,
        explanation: NO_CONSENT_MESSAGE,
      };
    }

    // Rate limiting — protects the network from mass scraping.
    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count, error: searchCountError } = await supabase
      .from("reliability_searches")
      .select("id", { count: "exact", head: true })
      .eq("business_id", borrower.business_id)
      .gte("created_at", since);
    if (searchCountError) throw new Error(searchCountError.message);
    if ((count ?? 0) >= HOURLY_SEARCH_LIMIT) {
      throw new Error("Search limit reached. Please try again later.");
    }

    const logSearch = async (resultType: string) => {
      const { error: logError } = await supabaseAdmin.from("reliability_searches").insert({
        business_id: borrower.business_id,
        user_id: userId,
        network_borrower_id: networkId,
        purpose: "loan_assessment",
        result_type: resultType,
      });
      if (logError) throw new Error(logError.message);
    };

    // Only borrower records from participating businesses with granted consent.
    const { data: peers, error: peerError } = await supabaseAdmin
      .from("borrowers")
      .select("id, business_id, businesses!inner(reliability_network_enabled)")
      .eq("network_borrower_id", networkId)
      .eq("businesses.reliability_network_enabled", true);
    if (peerError) throw new Error(peerError.message);

    const peerBusinessById = new Map((peers ?? []).map((peer) => [peer.id, peer.business_id]));
    if (peerBusinessById.size === 0) {
      await logSearch("unmatched");
      return {
        status: "unmatched",
        level: null,
        metrics: null,
        explanation: UNMATCHED_BORROWER_MESSAGE,
      };
    }

    const { data: consents, error: peerConsentError } = await supabaseAdmin
      .from("borrower_consents")
      .select("borrower_id, business_id, network_borrower_id, status")
      .in("borrower_id", [...peerBusinessById.keys()])
      .eq("network_borrower_id", networkId)
      .eq("status", "granted");
    if (peerConsentError) throw new Error(peerConsentError.message);
    const consentedIds = (consents ?? [])
      .filter((consent) => peerBusinessById.get(consent.borrower_id) === consent.business_id)
      .map((consent) => consent.borrower_id);
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
      .select("id, borrower_id, business_id, total_repayable, due_date, status")
      .in("borrower_id", consentedIds);
    if (loanError) throw new Error(loanError.message);

    const consentedBusinessById = new Map(
      (consents ?? [])
        .filter((consent) => consentedIds.includes(consent.borrower_id))
        .map((consent) => [consent.borrower_id, consent.business_id]),
    );
    const relevant = (loans ?? []).filter(
      (loan) =>
        loan.status !== "cancelled" &&
        consentedBusinessById.get(loan.borrower_id) === loan.business_id,
    );
    if (relevant.length === 0) {
      await logSearch("no_history");
      return { status: "no_history", level: null, metrics: null, explanation: NO_HISTORY_MESSAGE };
    }

    const loanIds = relevant.map((loan) => loan.id);
    const [paymentsResult, repaymentsResult] = await Promise.all([
      supabaseAdmin.from("payments").select("loan_id, amount, payment_date").in("loan_id", loanIds),
      supabaseAdmin
        .from("loan_repayments")
        .select("loan_id, installment_number, due_date, amount_due")
        .in("loan_id", loanIds),
    ]);
    if (paymentsResult.error) throw new Error(paymentsResult.error.message);
    if (repaymentsResult.error) throw new Error(repaymentsResult.error.message);

    const metrics: ReliabilityMetrics = calculateReliabilityMetrics({
      loans: relevant,
      payments: paymentsResult.data ?? [],
      repayments: repaymentsResult.data ?? [],
    });

    const level = rateReliability(metrics);
    await logSearch("history_available");

    return {
      status: "history_available",
      level,
      metrics,
      explanation: LEVEL_EXPLANATION[level],
    };
  });
