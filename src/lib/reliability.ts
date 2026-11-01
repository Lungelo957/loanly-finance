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
  paidOnTime: number;
  paidLate: number;
  activeObligations: number;
  overdueObligations: number;
  /** Percentage 0-100 of settled loans that were settled on or before due date. */
  onTimeRate: number;
}

export type ReliabilityStatus =
  | "history_available"
  | "no_history"
  | "consent_unavailable"
  | "not_participating";

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

export const RELIABILITY_DISCLAIMER =
  "CashFlow reliability information reflects repayment activity available within participating CashFlow businesses. It may not represent the borrower's complete financial history. It is informational only and is not an official credit score or credit bureau record — the lending decision remains yours.";

export const NO_HISTORY_MESSAGE =
  "No participating CashFlow repayment history was found for this borrower.";

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
