import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BarChart3, ShieldCheck, Users, Wallet, Check, LockKeyhole, ChevronRight } from "lucide-react";
import { BrandMark } from "@/components/brand";
import landingBg from "@/assets/landing-light.jpg";
import { Button } from "@/components/ui/button";
import { SiteCredit } from "@/components/site-credit";

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
    <div className="min-h-screen bg-background text-foreground">
      <header className="relative z-10 border-b border-border bg-card/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 py-5 sm:px-8">
          <BrandMark />
          <nav aria-label="Account" className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm"><Link to="/business/login">Sign in</Link></Button>
            <Button asChild size="sm" className="hidden sm:inline-flex"><Link to="/business/register">Get started <ArrowRight /></Link></Button>
          </nav>
        </div>
      </header>
      <main>
        <section className="landing-hero relative isolate overflow-hidden border-b border-border">
          <img src={landingBg} alt="" aria-hidden width={1920} height={1024} className="landing-hero-image absolute inset-0 -z-10 h-full w-full object-cover" />
          <div className="relative mx-auto max-w-6xl px-5 py-14 sm:px-8 sm:py-20">
            <div className="max-w-xl page-enter">
              <p className="inline-flex items-center gap-2 text-xs font-medium text-accent-foreground"><span className="h-1.5 w-1.5 rounded-full bg-gold" />Loan management, built for lenders</p>
              <h1 className="mt-5 text-4xl font-semibold leading-tight sm:text-6xl">CashFlow</h1>
              <h2 className="mt-3 max-w-lg text-2xl font-semibold leading-tight sm:text-4xl">Run your lending business with complete <span className="text-gold">clarity.</span></h2>
              <p className="mt-5 max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base">Manage capital, borrowers, loans, repayments, collections, expenses and reporting in one secure workspace — so you always know exactly where your money is.</p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg" className="group"><Link to="/business/register">Register your business <ArrowRight className="transition-transform group-hover:translate-x-1" /></Link></Button>
                <Button asChild size="lg" variant="outline"><Link to="/business/login">Business sign in</Link></Button>
              </div>
              <p className="mt-5 text-xs text-muted-foreground"><span className="font-semibold text-foreground">ZAR R110</span> per month</p>
            </div>
            <div className="mt-12 flex flex-wrap gap-x-7 gap-y-3 text-xs font-medium text-muted-foreground sm:mt-14">
              {[{ icon: ShieldCheck, label: "Secure & reliable" }, { icon: Wallet, label: "Capital clarity" }, { icon: Users, label: "Built for lenders" }].map(({ icon: Icon, label }) => <span key={label} className="inline-flex items-center gap-2"><Icon className="h-4 w-4 text-gold" />{label}</span>)}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 py-14 sm:px-8 sm:py-20">
          <p className="text-xs font-medium text-accent-foreground">Everything you need in one place</p>
          <h2 className="mt-3 max-w-xl text-2xl font-semibold leading-tight sm:text-3xl">Powerful features for smarter lending.</h2>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">Keep your lending business organised, from the first capital entry to the final repayment.</p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f) => (
              <div key={f.title} className="card-surface p-5 transition-transform duration-200 hover:-translate-y-1">
                <div className="flex items-center justify-between"><span className="grid h-10 w-10 place-items-center rounded-full bg-accent text-accent-foreground"><f.icon className="h-5 w-5" /></span><ChevronRight className="h-4 w-4 text-gold" /></div>
                <h3 className="mt-5 text-sm font-semibold">{f.title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{f.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="border-y border-border bg-secondary/50">
          <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8 sm:py-16">
            <p className="text-xs font-medium text-accent-foreground">Simple process</p>
            <h2 className="mt-3 text-2xl font-semibold sm:text-3xl">How CashFlow works</h2>
            <div className="mt-8 grid gap-7 sm:grid-cols-3">
              {steps.map((s) => <div key={s.n} className="flex items-start gap-4"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-full gold-gradient text-sm font-semibold text-primary-foreground">{s.n}</span><div><h3 className="text-sm font-semibold">{s.title}</h3><p className="mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">{s.body}</p></div></div>)}
            </div>
          </div>
        </section>

        <section className="mx-auto grid max-w-6xl gap-10 px-5 py-14 sm:px-8 sm:py-20 md:grid-cols-2 md:gap-20">
          <div>
            <p className="text-xs font-medium text-accent-foreground">Your data, our priority</p>
            <h2 className="mt-3 text-2xl font-semibold leading-tight sm:text-3xl">Your business data stays protected.</h2>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">Business-level data isolation and secure access controls keep each workspace separate.</p>
            <div className="mt-7 space-y-5">
              {[{ icon: LockKeyhole, title: "Secure authentication", text: "Account access is protected by secure sign-in." }, { icon: ShieldCheck, title: "Business data isolation", text: "Each business only sees its own private records." }].map(({ icon: Icon, title, text }) => <div key={title} className="flex gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent text-accent-foreground"><Icon className="h-5 w-5" /></span><div><h3 className="text-sm font-semibold">{title}</h3><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{text}</p></div></div>)}
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-accent-foreground">Built for your success</p>
            <h2 className="mt-3 text-2xl font-semibold sm:text-3xl">Why choose CashFlow?</h2>
            <ul className="mt-6 space-y-4 text-sm text-muted-foreground">{["Complete loan management", "Real-time financial tracking", "Secure data isolation", "Borrower repayment history", "Dedicated support"].map((item) => <li key={item} className="flex items-center gap-3"><Check className="h-4 w-4 shrink-0 text-gold" />{item}</li>)}</ul>
          </div>
        </section>

        <section className="border-y border-border bg-secondary">
          <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-7 px-5 py-12 sm:px-8 md:flex-row md:items-center">
            <div><h2 className="text-2xl font-semibold">Ready to take control of your lending business?</h2><p className="mt-3 text-sm text-muted-foreground">Your capital, borrowers and collections. One clear view.</p></div>
            <Button asChild size="lg" className="shrink-0"><Link to="/business/register">Get started <ArrowRight /></Link></Button>
          </div>
        </section>
      </main>
      <footer className="bg-card">
        <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center"><BrandMark /><Link to="/admin/login" className="text-xs text-muted-foreground hover:text-foreground">Platform administrator <ArrowRight className="ml-1 inline h-3 w-3" /></Link></div>
          <div className="mt-6 border-t border-border pt-5"><SiteCredit /><p className="mt-3 text-xs text-muted-foreground">© {new Date().getFullYear()} CashFlow. All rights reserved.</p></div>
        </div>
      </footer>
    </div>
  );
}
