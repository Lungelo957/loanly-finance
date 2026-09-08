export type Frequency = "weekly" | "biweekly" | "monthly";

export const FREQUENCY_LABEL: Record<Frequency, string> = {
  weekly: "Weekly",
  biweekly: "Every 2 weeks",
  monthly: "Monthly",
};

/** Payments per month for each frequency (approximate, 4 weeks per month). */
const PER_MONTH: Record<Frequency, number> = {
  weekly: 4,
  biweekly: 2,
  monthly: 1,
};

export interface LoanTerms {
  principal: number;
  /** Annual flat interest rate, percent. */
  interestRate: number;
  termMonths: number;
  frequency: Frequency;
  startDate: string;
}

export interface LoanSchedule {
  totalInterest: number;
  totalRepayable: number;
  installmentsCount: number;
  installmentAmount: number;
  rows: { installment_number: number; due_date: string; amount_due: number }[];
}

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function addMonths(date: Date, months: number) {
  const d = new Date(date);
  const day = d.getDate();
  d.setMonth(d.getMonth() + months);
  if (d.getDate() < day) d.setDate(0);
  return d;
}

/**
 * Flat (simple) interest model:
 *   interest = principal x rate% x years
 *   total    = principal + interest
 *   payment  = total / number of installments
 */
export function buildSchedule(terms: LoanTerms): LoanSchedule {
  const principal = Math.max(0, Number(terms.principal) || 0);
  const rate = Math.max(0, Number(terms.interestRate) || 0);
  const months = Math.max(1, Math.round(Number(terms.termMonths) || 1));
  const years = months / 12;

  const totalInterest = round2(principal * (rate / 100) * years);
  const totalRepayable = round2(principal + totalInterest);

  const installmentsCount = Math.max(1, Math.round(months * PER_MONTH[terms.frequency]));
  const base = Math.floor((totalRepayable / installmentsCount) * 100) / 100;

  const start = new Date(`${terms.startDate}T00:00:00`);
  const rows: LoanSchedule["rows"] = [];
  let allocated = 0;

  for (let i = 1; i <= installmentsCount; i++) {
    const due =
      terms.frequency === "monthly"
        ? addMonths(start, i)
        : addDays(start, i * (terms.frequency === "weekly" ? 7 : 14));
    const amount = i === installmentsCount ? round2(totalRepayable - allocated) : base;
    allocated = round2(allocated + amount);
    rows.push({
      installment_number: i,
      due_date: due.toISOString().slice(0, 10),
      amount_due: amount,
    });
  }

  return {
    totalInterest,
    totalRepayable,
    installmentsCount,
    installmentAmount: base,
    rows,
  };
}

export function outstandingBalance(totalRepayable: number, totalPaid: number): number {
  return round2(Math.max(0, (Number(totalRepayable) || 0) - (Number(totalPaid) || 0)));
}

/* ---------------------------------------------------------------------------
 * Month-end lending model (the default for CashFlow)
 * A loan issued on any day of a month is repaid in full on the LAST calendar
 * day of that same month. Real calendar lengths, including leap years.
 * ------------------------------------------------------------------------ */

/** Last calendar day of the month the given ISO date falls in (YYYY-MM-DD). */
export function monthEndDueDate(issueDateISO: string): string {
  const d = new Date(`${issueDateISO}T00:00:00`);
  if (Number.isNaN(d.getTime())) return issueDateISO;
  // Day 0 of the next month === last day of this month (handles 28/29/30/31).
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  const m = String(last.getMonth() + 1).padStart(2, "0");
  const day = String(last.getDate()).padStart(2, "0");
  return `${last.getFullYear()}-${m}-${day}`;
}

export interface MonthEndLoan {
  principal: number;
  interestRate: number;
  interestAmount: number;
  totalRepayable: number;
  issueDate: string;
  dueDate: string;
}

/** interest = principal x rate%, total = principal + interest. */
export function computeMonthEndLoan(
  principalInput: number | string,
  rateInput: number | string,
  issueDateISO: string,
): MonthEndLoan {
  const principal = Math.max(0, Number(principalInput) || 0);
  const interestRate = Math.max(0, Number(rateInput) || 0);
  const interestAmount = round2(principal * (interestRate / 100));
  return {
    principal,
    interestRate,
    interestAmount,
    totalRepayable: round2(principal + interestAmount),
    issueDate: issueDateISO,
    dueDate: monthEndDueDate(issueDateISO),
  };
}

export type LoanDisplayStatus = "active" | "due" | "overdue" | "paid" | "defaulted" | "cancelled";

/** Live status from the due date and how much has actually been collected. */
export function loanDisplayStatus(
  storedStatus: string,
  dueDateISO: string | null,
  totalRepayable: number,
  totalPaid: number,
  todayISODate: string,
): LoanDisplayStatus {
  if (storedStatus === "cancelled") return "cancelled";
  if (storedStatus === "completed" || outstandingBalance(totalRepayable, totalPaid) <= 0) return "paid";
  if (storedStatus === "defaulted") return "defaulted";
  if (!dueDateISO) return "active";
  if (todayISODate > dueDateISO) return "overdue";
  if (todayISODate === dueDateISO) return "due";
  return "active";
}
