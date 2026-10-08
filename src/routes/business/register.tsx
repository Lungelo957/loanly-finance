import { useState } from "react";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { toast } from "sonner";
import { CheckCircle2, Loader2 } from "lucide-react";
import { AuthLayout } from "@/components/auth-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/business/register")({
  head: () => ({
    meta: [
      { title: "Register your business — CashFlow" },
      {
        name: "description",
        content: "Create a CashFlow account for your lending business and start managing loans.",
      },
      { property: "og:title", content: "Register your business — CashFlow" },
      {
        property: "og:description",
        content: "Create a CashFlow account for your lending business.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BusinessRegister,
});

function BusinessRegister() {
  const router = useRouter();
  const [form, setForm] = useState({
    fullName: "",
    businessName: "",
    email: "",
    location: "",
    password: "",
    confirm: "",
  });
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.fullName.trim() || !form.businessName.trim() || !form.location.trim()) {
      toast.error("Please fill in all the fields.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      toast.error("Enter a valid email address.");
      return;
    }
    if (form.password.length < 8) {
      toast.error("Your password must be at least 8 characters.");
      return;
    }
    if (form.password !== form.confirm) {
      toast.error("The two passwords don't match.");
      return;
    }

    setBusy(true);
    const { data, error } = await supabase.auth.signUp({
      email: form.email.trim(),
      password: form.password,
      options: {
        emailRedirectTo: `${window.location.origin}/business/login`,
        data: {
          full_name: form.fullName.trim(),
          business_name: form.businessName.trim(),
          business_location: form.location.trim(),
        },
      },
    });
    setBusy(false);

    if (error) {
      toast.error(
        error.message.toLowerCase().includes("registered")
          ? "An account with this email already exists."
          : "We couldn't complete your registration. Please try again.",
      );
      return;
    }

    if (data.session) {
      toast.success("Business registered. Awaiting approval.");
      router.navigate({ to: "/business/pending", replace: true });
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <AuthLayout
        portal="Business portal"
        title="Confirm your email"
        subtitle="Your business has been registered."
        footer={
          <Link to="/business/login" className="font-medium text-foreground underline">
            Back to sign in
          </Link>
        }
      >
        <div className="flex flex-col items-center gap-3 text-center">
          <CheckCircle2 className="h-10 w-10 text-success" />
          <p className="text-sm text-muted-foreground">
            We sent a confirmation link to <span className="font-medium text-foreground">{form.email}</span>.
            Confirm your email, then sign in. Your business registration will then wait for
            administrator approval.
          </p>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      portal="Business portal"
      title="Register your business"
      subtitle="Create your CashFlow workspace in a minute."
      footer={
        <>
          Already registered?{" "}
          <Link to="/business/login" className="font-medium text-foreground underline">
            Sign in
          </Link>
        </>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <Label htmlFor="fullName">Full name</Label>
          <Input id="fullName" value={form.fullName} onChange={set("fullName")} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="businessName">Business name</Label>
          <Input id="businessName" value={form.businessName} onChange={set("businessName")} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email address</Label>
          <Input id="email" type="email" autoComplete="email" value={form.email} onChange={set("email")} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="location">Business location</Label>
          <Input id="location" value={form.location} onChange={set("location")} required />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              value={form.password}
              onChange={set("password")}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm">Confirm password</Label>
            <Input
              id="confirm"
              type="password"
              autoComplete="new-password"
              value={form.confirm}
              onChange={set("confirm")}
              required
            />
          </div>
        </div>
        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {busy ? "Creating your account..." : "Create account"}
        </Button>
      </form>
    </AuthLayout>
  );
}
