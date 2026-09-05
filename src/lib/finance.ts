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
