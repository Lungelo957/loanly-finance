import { useState } from "react";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { AuthLayout } from "@/components/auth-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { loadAccount, canAccessWorkspace } from "@/lib/account";

export const Route = createFileRoute("/business/login")({
  head: () => ({
    meta: [
      { title: "Business sign in — CashFlow" },
      { name: "description", content: "Sign in to your CashFlow business workspace." },
      { property: "og:title", content: "Business sign in — CashFlow" },
      { property: "og:description", content: "Sign in to your CashFlow business workspace." },
    ],
  }),
  component: BusinessLogin,
});

function BusinessLogin() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [resetting, setResetting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) {
      toast.error("Enter your email and password.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) {
      setBusy(false);
      toast.error(
        error.message.toLowerCase().includes("confirm")
          ? "Please confirm your email address first, then sign in."
          : "Those sign-in details didn't work. Please check and try again.",
      );
      return;
    }
    await queryClient.invalidateQueries();
    const account = await loadAccount();
    setBusy(false);
    if (account.isAdmin && !account.business) {
      router.navigate({ to: "/admin/dashboard", replace: true });
      return;
    }
    if (account.business && canAccessWorkspace(account.business.status)) {
      router.navigate({ to: "/business/dashboard", replace: true });
    } else {
      router.navigate({ to: "/business/pending", replace: true });
    }
  }

  async function handleReset() {
    if (!email.trim()) {
      toast.error("Enter your email address first.");
      return;
    }
    setResetting(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setResetting(false);
    if (error) toast.error("We couldn't send the reset email. Please try again.");
    else toast.success("Check your inbox for a password reset link.");
  }

  return (
    <AuthLayout
      portal="Business portal"
      title="Welcome back"
      subtitle="Sign in to manage your lending business."
      footer={
        <>
          Don't have an account?{" "}
          <Link to="/business/register" className="font-medium text-foreground underline">
            Register your business
          </Link>
        </>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <Label htmlFor="email">Email address</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {busy ? "Signing in..." : "Sign in"}
        </Button>
        <button
          type="button"
          onClick={handleReset}
          disabled={resetting}
          className="w-full text-center text-sm text-muted-foreground underline"
        >
          {resetting ? "Sending reset link..." : "Forgot your password?"}
        </button>
      </form>
    </AuthLayout>
  );
}
