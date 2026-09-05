export function formatCurrency(value: number | null | undefined): string {
  const amount = Number(value ?? 0);
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);
}

export function formatNumber(value: number | null | undefined): string {
  return new Intl.NumberFormat("en-ZA").format(Number(value ?? 0));
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-ZA", { year: "numeric", month: "short", day: "2-digit" });
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}
