/**
 * CashFlow Borrower Reliability System — shared, client-safe definitions.
 *
 * This file holds the ONE canonical rating rule set. No component may
 * re-implement these rules. All numbers are derived from real loan and
 * payment records by the secure server function in reliability.functions.ts.
 */

export type ReliabilityLevel = "excellent" | "good" | "fair" | "poor" | "high_risk";

export interface ReliabilityMetrics {
  completedLoans: number;
  completedRepayments: number;
  paidOnTime: number;
  paidLate: number;
  participatingLenders: number;
  outstandingObligations: number;
  activeObligations: number;
  overdueObligations: number;
  /** Percentage 0-100 of completed repayment obligations paid on or before their due dates. */
  onTimeRate: number;
}

export type ReliabilityStatus =
  "history_available" | "no_history" | "unmatched" | "consent_unavailable" | "not_participating";

export interface ReliabilityResult {
  status: ReliabilityStatus;
  level: ReliabilityLevel | null;
  metrics: ReliabilityMetrics | null;
  /** Plain-English explanation of why this level was given. */
  explanation: string;
}

export const LEVEL_LABEL: Record<ReliabilityLevel, string> = {
  excellent: "Excellent",
  good: "Good",
  fair: "Fair",
  poor: "Poor",
  high_risk: "High Risk",
};

export const LEVEL_EXPLANATION: Record<ReliabilityLevel, string> = {
  excellent: "Very high on-time repayment performance and no current overdue obligations.",
  good: "Mostly on-time repayments and no current overdue obligations.",
  fair: "Mixed repayment history.",
  poor: "Frequent late repayments.",
  high_risk: "Serious repayment problems or current overdue obligations.",
};

/**
 * Transparent, documented rating rules (evaluated in this order):
 *  1. Any current overdue obligation            -> HIGH RISK
 *  2. On-time rate >= 95% and 3+ settled loans  -> EXCELLENT
 *  3. On-time rate >= 80%                       -> GOOD
 *  4. On-time rate >= 60%                       -> FAIR
 *  5. On-time rate >= 40%                       -> POOR
 *  6. Below 40%                                 -> HIGH RISK
 * With fewer than 3 settled loans the best attainable level is GOOD,
 * because there is not enough history for an EXCELLENT rating.
 */
export function rateReliability(m: ReliabilityMetrics): ReliabilityLevel {
  if (m.overdueObligations > 0) return "high_risk";
  if (m.completedLoans === 0) return "fair";
  if (m.onTimeRate >= 95) return m.completedLoans >= 3 ? "excellent" : "good";
  if (m.onTimeRate >= 80) return "good";
  if (m.onTimeRate >= 60) return "fair";
  if (m.onTimeRate >= 40) return "poor";
  return "high_risk";
}

export function calculateReliabilityMetrics(input: {
  loans: Array<{
    id: string;
    business_id: string;
    total_repayable: number;
    due_date: string;
    status: string;
  }>;
  repayments: Array<{
    loan_id: string;
    installment_number: number;
    due_date: string;
    amount_due: number;
  }>;
  payments: Array<{ loan_id: string; amount: number; payment_date: string }>;
  today?: string;
}): ReliabilityMetrics {
  const today = input.today ?? new Date().toISOString().slice(0, 10);
  const epsilon = 0.001;
  const amount = (value: number) => (Number.isFinite(Number(value)) ? Number(value) : 0);
  const paymentsByLoan = new Map<string, typeof input.payments>();
  const repaymentsByLoan = new Map<string, typeof input.repayments>();

  for (const payment of input.payments) {
    const rows = paymentsByLoan.get(payment.loan_id) ?? [];
    rows.push(payment);
    paymentsByLoan.set(payment.loan_id, rows);
  }
  for (const repayment of input.repayments) {
    const rows = repaymentsByLoan.get(repayment.loan_id) ?? [];
    rows.push(repayment);
    repaymentsByLoan.set(repayment.loan_id, rows);
  }

  let completedLoans = 0;
  let completedRepayments = 0;
  let paidOnTime = 0;
  let paidLate = 0;
  let outstandingObligations = 0;
  let overdueObligations = 0;
  const lendersWithOutstandingLoans = new Set<string>();

  for (const loan of input.loans) {
    if (loan.status === "cancelled") continue;

    const loanPayments = (paymentsByLoan.get(loan.id) ?? []).sort((a, b) =>
      a.payment_date.localeCompare(b.payment_date),
    );
    const totalPaid = loanPayments.reduce((total, payment) => total + amount(payment.amount), 0);
    const totalRepayable = amount(loan.total_repayable);
    const balance = Math.max(0, totalRepayable - totalPaid);
    const isSettled = totalRepayable > 0 && balance <= epsilon;
    if (isSettled) completedLoans += 1;

    let loanIsOverdue = false;
    const scheduledRepayments = (repaymentsByLoan.get(loan.id) ?? []).sort(
      (a, b) => a.installment_number - b.installment_number || a.due_date.localeCompare(b.due_date),
    );

    if (scheduledRepayments.length > 0) {
      let paymentIndex = 0;
      let paymentRemaining = 0;
      let paymentDate = "";

      for (const repayment of scheduledRepayments) {
        let remaining = amount(repayment.amount_due);
        let settledDate = "";
        while (remaining > epsilon && paymentIndex < loanPayments.length) {
          if (paymentRemaining <= epsilon) {
            const payment = loanPayments[paymentIndex++];
            paymentRemaining = amount(payment.amount);
            paymentDate = payment.payment_date;
          }
          if (paymentRemaining <= epsilon) continue;
          const applied = Math.min(remaining, paymentRemaining);
          remaining -= applied;
          paymentRemaining -= applied;
          if (remaining <= epsilon) settledDate = paymentDate;
        }

        if (amount(repayment.amount_due) > epsilon && remaining <= epsilon) {
          completedRepayments += 1;
          if (settledDate && settledDate <= repayment.due_date) paidOnTime += 1;
          else if (settledDate) paidLate += 1;
        } else if (remaining > epsilon && repayment.due_date < today) {
          loanIsOverdue = true;
        }
      }
    } else if (isSettled) {
      completedRepayments += 1;
      const finalPaymentDate = loanPayments.at(-1)?.payment_date;
      if (finalPaymentDate && finalPaymentDate <= loan.due_date) paidOnTime += 1;
      else if (finalPaymentDate) paidLate += 1;
    }

    if (balance > epsilon) {
      outstandingObligations += 1;
      lendersWithOutstandingLoans.add(loan.business_id);
      if (loan.due_date < today) loanIsOverdue = true;
      if (loanIsOverdue) overdueObligations += 1;
    }
  }

  const activeObligations = outstandingObligations - overdueObligations;
  return {
    completedLoans,
    completedRepayments,
    paidOnTime,
    paidLate,
    participatingLenders: lendersWithOutstandingLoans.size,
    outstandingObligations,
    activeObligations,
    overdueObligations,
    onTimeRate:
      completedRepayments === 0 ? 0 : Math.round((paidOnTime / completedRepayments) * 1000) / 10,
  };
}

export const RELIABILITY_DISCLAIMER =
  "CashFlow reliability information reflects repayment activity available within participating CashFlow businesses. It may not represent the borrower's complete financial history. It is informational only and is not an official credit score or credit bureau record — the lending decision remains yours.";

export const NO_HISTORY_MESSAGE =
  "No participating CashFlow repayment history was found for this borrower.";

export const UNMATCHED_BORROWER_MESSAGE =
  "This borrower cannot be matched to the reliability network because no usable identifying detail is available.";

export const NO_CONSENT_MESSAGE =
  "Borrower reliability information is unavailable because the required authorization or consent has not been provided.";

export const NOT_PARTICIPATING_MESSAGE =
  "Your business is not currently enabled for the CashFlow Borrower Reliability Network. Contact the platform administrator to request participation.";

export type ConsentStatus = "pending" | "granted" | "denied" | "revoked";

export const CONSENT_LABEL: Record<ConsentStatus, string> = {
  pending: "Pending",
  granted: "Granted",
  denied: "Denied",
  revoked: "Revoked",
};
