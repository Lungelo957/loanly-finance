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
import { loadAccount } from "@/lib/account";

export const Route = createFileRoute("/admin/login")({
  head: () => ({
    meta: [
      { title: "Administrator sign in — CashFlow" },
      { name: "description", content: "Sign in to the CashFlow platform administration portal." },
      { property: "og:title", content: "Administrator sign in — CashFlow" },
      { property: "og:description", content: "Sign in to the CashFlow administration portal." },
    ],
  }),
  component: AdminLogin,
});

function AdminLogin() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) {
      setBusy(false);
      toast.error("Those sign-in details didn't work. Please check and try again.");
      return;
    }
    await queryClient.invalidateQueries();
    const account = await loadAccount();
    setBusy(false);
    if (!account.isAdmin) {
      // Administrator rights are read from the database, never from the browser.
      await supabase.auth.signOut();
      queryClient.clear();
      toast.error("This account does not have administrator access.");
      return;
    }
    router.navigate({ to: "/admin/dashboard", replace: true });
  }

  return (
    <AuthLayout
      portal="Administration"
      title="Administrator sign in"
      subtitle="Restricted to the CashFlow platform team."
      footer={
        <>
          Looking for your business workspace?{" "}
          <Link to="/business/login" className="font-medium text-foreground underline">
            Business sign in
          </Link>
        </>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <Label htmlFor="admin_email">Email address</Label>
          <Input
            id="admin_email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="admin_password">Password</Label>
          <Input
            id="admin_password"
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
      </form>
    </AuthLayout>
  );
}
