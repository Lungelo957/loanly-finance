import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BarChart3, ShieldCheck, Users, Wallet } from "lucide-react";
import { BrandMark } from "@/components/brand";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CashFlow — Loan Management & Financial Software for Lenders" },
      {
        name: "description",
        content:
          "CashFlow gives lending businesses one secure workspace for capital, borrowers, loans, repayment schedules, collections, expenses and reporting.",
      },
      { property: "og:title", content: "CashFlow — Loan Management for Lenders" },
      {
        property: "og:description",
        content:
          "One secure workspace for capital, borrowers, loans, repayments, collections and reporting.",
      },
    ],
  }),
  component: Landing,
});

const features = [
  {
    icon: Wallet,
    title: "Capital control",
    body: "Track every injection and withdrawal, and always know how much capital is available to lend.",
  },
  {
    icon: Users,
    title: "Borrower records",
    body: "A complete profile for every borrower, with contact, employment and income details.",
  },
  {
    icon: BarChart3,
    title: "Loans & schedules",
    body: "Create loans, generate repayment schedules automatically and follow collections day by day.",
  },
  {
    icon: ShieldCheck,
    title: "Isolated & secure",
    body: "Each business only ever sees its own data, enforced at the database level.",
  },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5">
        <BrandMark />
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link to="/business/login">Sign in</Link>
          </Button>
          <Button asChild size="sm">
            <Link to="/business/register">Get started</Link>
          </Button>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-4 pb-16 pt-10 sm:pt-16">
          <p className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-gold" />
            Loan management, built for lenders
          </p>
          <h1 className="mt-5 max-w-3xl text-4xl font-semibold leading-[1.08] sm:text-6xl">
            Run your lending business with complete clarity.
          </h1>
          <p className="mt-5 max-w-2xl text-base text-muted-foreground sm:text-lg">
            CashFlow brings capital, borrowers, loans, repayment schedules, collections, expenses
            and reporting into a single workspace — so you always know exactly where your money is.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link to="/business/register">
                Register your business <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/business/login">Business sign in</Link>
            </Button>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-20">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f) => (
              <div key={f.title} className="card-surface p-5">
                <span className="inline-flex rounded-lg bg-accent p-2 text-accent-foreground">
                  <f.icon className="h-5 w-5" />
                </span>
                <h2 className="mt-4 text-base font-semibold">{f.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} CashFlow</span>
          <Link to="/admin/login" className="hover:text-foreground">
            Platform administrator
          </Link>
        </div>
      </footer>
    </div>
  );
}
