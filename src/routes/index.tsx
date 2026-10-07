import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BarChart3, ShieldCheck, Users, Wallet } from "lucide-react";
import { BrandMark } from "@/components/brand";
import landingBg from "@/assets/landing-bg.jpg";
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
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
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

const steps = [
  { n: "01", title: "Register your business", body: "Create your workspace and submit it for approval." },
  { n: "02", title: "Add capital & borrowers", body: "Record your lending capital and borrower profiles." },
  { n: "03", title: "Lend & collect", body: "Issue month-end loans and track every repayment." },
];

function Landing() {
  return (
    <div className="landing-dark relative min-h-screen overflow-hidden bg-background text-foreground">
      {/* Background image + lighting */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[100svh] overflow-hidden">
        <img
          src={landingBg}
          alt=""
          width={1920}
          height={1088}
          className="animate-slow-zoom h-full w-full object-cover opacity-60"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/60 to-background" />
        <div className="animate-float-glow absolute -left-32 top-10 h-96 w-96 rounded-full bg-gold/25 blur-3xl" />
        <div
          className="animate-float-glow absolute -right-24 top-1/3 h-80 w-80 rounded-full bg-gold/15 blur-3xl"
          style={{ animationDelay: "-4s" }}
        />
      </div>

      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-4 py-5">
        <BrandMark />
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link to="/business/login">Sign in</Link>
          </Button>
          <Button asChild size="sm" className="shadow-[0_0_24px_-4px_var(--color-gold)]">
            <Link to="/business/register">Get started</Link>
          </Button>
        </div>
      </header>

      <main className="relative z-10">
        <section className="mx-auto flex min-h-[calc(100svh-80px)] max-w-6xl flex-col justify-center px-4 pb-20 pt-8">
          <p className="animate-rise-in inline-flex w-fit items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur-md">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-gold opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-gold" />
            </span>
            Loan management, built for lenders
          </p>
          <h1
            className="animate-rise-in mt-6 max-w-4xl text-4xl font-semibold leading-[1.05] sm:text-7xl"
            style={{ animationDelay: "0.1s" }}
          >
            Run your lending business with <span className="text-shimmer">complete clarity.</span>
          </h1>
          <p
            className="animate-rise-in mt-6 max-w-2xl text-base text-muted-foreground sm:text-lg"
            style={{ animationDelay: "0.2s" }}
          >
            CashFlow brings capital, borrowers, loans, repayments, collections, expenses and
            reporting into one secure workspace — so you always know exactly where your money is.
          </p>
          <div className="animate-rise-in mt-10 flex flex-wrap gap-3" style={{ animationDelay: "0.3s" }}>
            <Button asChild size="lg" className="group shadow-[0_0_40px_-8px_var(--color-gold)]">
              <Link to="/business/register">
                Register your business
                <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="bg-card backdrop-blur-md">
              <Link to="/business/login">Business sign in</Link>
            </Button>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-20">
          <h2 className="text-2xl font-semibold sm:text-3xl">Everything your lending business needs</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f, i) => (
              <div
                key={f.title}
                className="animate-rise-in group relative overflow-hidden rounded-2xl border border-border bg-card p-6 backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-gold/50"
                style={{ animationDelay: `${0.1 * i}s` }}
              >
                <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gold/0 blur-2xl transition-colors duration-500 group-hover:bg-gold/30" />
                <span className="inline-flex rounded-xl bg-accent p-2.5 text-accent-foreground">
                  <f.icon className="h-5 w-5" />
                </span>
                <h3 className="mt-5 text-base font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-24">
          <div className="grid gap-6 rounded-3xl border border-border bg-card p-8 backdrop-blur-md sm:grid-cols-3 sm:p-10">
            {steps.map((s) => (
              <div key={s.n}>
                <span className="text-shimmer font-display text-3xl font-semibold">{s.n}</span>
                <h3 className="mt-3 font-semibold">{s.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{s.body}</p>
              </div>
            ))}
          </div>
          <div className="mt-12 flex flex-col items-center text-center">
            <h2 className="max-w-2xl text-2xl font-semibold sm:text-4xl">
              Ready to see your money clearly?
            </h2>
            <Button asChild size="lg" className="mt-6 shadow-[0_0_40px_-8px_var(--color-gold)]">
              <Link to="/business/register">
                Get started <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-border">
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
