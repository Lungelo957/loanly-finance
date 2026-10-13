import type { CapitalEntry, Expense, Loan, Payment, Repayment } from "@/lib/business-data";

export interface Metrics {
  totalCapital: number;
  capitalDeployed: number;
  availableCapital: number;
  outstandingBalance: number;
  totalCollected: number;
  totalExpenses: number;
  netCashFlow: number;
  activeBorrowers: number;
  activeLoans: number;
  overdueLoans: number;
  overdueAmount: number;
  dueThisWeek: number;
}

const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);
const n = (v: unknown) => Number(v ?? 0) || 0;

export function computeMetrics(input: {
  capital: CapitalEntry[];
  loans: Loan[];
  repayments: Repayment[];
  payments: Payment[];
  expenses: Expense[];
}): Metrics {
  const { capital, loans, repayments, payments, expenses } = input;

  const totalCapital = sum(
    capital.map((c) => (c.entry_type === "withdrawal" ? -n(c.amount) : n(c.amount))),
  );

  const activeLoans = loans.filter((l) => l.status === "active");
  const capitalDeployed = sum(activeLoans.map((l) => n(l.principal_amount)));
  const principalLentAll = sum(loans.filter((l) => l.status !== "cancelled").map((l) => n(l.principal_amount)));

  const totalCollected = sum(payments.map((p) => n(p.amount)));
  const totalExpenses = sum(expenses.map((e) => n(e.amount)));

  const paidByLoan = new Map<string, number>();
  for (const p of payments) paidByLoan.set(p.loan_id, (paidByLoan.get(p.loan_id) ?? 0) + n(p.amount));

  const outstandingBalance = sum(
    activeLoans.map((l) => Math.max(0, n(l.total_repayable) - (paidByLoan.get(l.id) ?? 0))),
  );

  const today = new Date().toISOString().slice(0, 10);
  const weekAhead = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);

  const overdueRows = repayments.filter(
    (r) => r.due_date < today && n(r.amount_paid) < n(r.amount_due) && r.status !== "paid",
  );
  const overdueLoanIds = new Set(overdueRows.map((r) => r.loan_id));
  const dueThisWeek = sum(
    repayments
      .filter((r) => r.due_date >= today && r.due_date <= weekAhead && r.status !== "paid")
      .map((r) => n(r.amount_due) - n(r.amount_paid)),
  );

  return {
    totalCapital,
    capitalDeployed,
    availableCapital: totalCapital - principalLentAll + totalCollected - totalExpenses,
    outstandingBalance,
    totalCollected,
    totalExpenses,
    netCashFlow: totalCollected - totalExpenses,
    activeBorrowers: new Set(activeLoans.map((l) => l.borrower_id)).size,
    activeLoans: activeLoans.length,
    overdueLoans: overdueLoanIds.size,
    overdueAmount: sum(overdueRows.map((r) => n(r.amount_due) - n(r.amount_paid))),
    dueThisWeek,
  };
}
