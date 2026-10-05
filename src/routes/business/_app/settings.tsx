import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/lib/account";
import { friendlyError } from "@/lib/business-data";
import { InstallAppButton } from "@/components/install-prompt";

export const Route = createFileRoute("/business/_app/settings")({
  head: () => ({
    meta: [
      { title: "Business settings — CashFlow" },
      { name: "description", content: "Set your default lending interest rate." },
      { property: "og:title", content: "Business settings — CashFlow" },
      { property: "og:description", content: "Set your default lending interest rate." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { data: account } = useAccount();
  const queryClient = useQueryClient();
  const business = account?.business;
  const [rate, setRate] = useState("");

  useEffect(() => {
    if (business) setRate(String(Number(business.default_interest_rate ?? 40)));
  }, [business?.id, business?.default_interest_rate]);

  const save = useMutation({
    mutationFn: async () => {
      if (!business) throw new Error("no-business");
      const value = Number(rate);
      if (!Number.isFinite(value) || value < 0 || value > 1000) throw new Error("bad-rate");
      const { data, error } = await supabase
        .from("businesses")
        .update({ default_interest_rate: value })
        .eq("id", business.id)
        .select("default_interest_rate")
        .single();
      if (error) throw new Error(error.message);
      // Confirm the saved value came back from the database before reporting success.
      if (Number(data.default_interest_rate) !== value) throw new Error("not-saved");
      return value;
    },
    onSuccess: async (value) => {
      await queryClient.invalidateQueries({ queryKey: ["account"] });
      toast.success(`Default interest rate saved as ${value}%.`);
    },
    onError: (e) => {
      const map: Record<string, string> = {
        "bad-rate": "Enter a percentage between 0 and 1000.",
        "not-saved": "The new rate didn't save. Please try again.",
      };
      toast.error(map[e.message] ?? friendlyError(e, "We couldn't save your settings."));
    },
  });

  return (
    <div>
      <PageHeader title="Business settings" description="Defaults used every time you create a loan." action={<InstallAppButton />} />

      <form
        className="card-surface max-w-md space-y-4 p-5"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
      >
        <div className="space-y-2">
          <Label htmlFor="business_name">Business name</Label>
          <Input id="business_name" value={business?.name ?? ""} readOnly disabled />
        </div>
        <div className="space-y-2">
          <Label htmlFor="default_rate">Default interest rate (%)</Label>
          <Input
            id="default_rate"
            type="number"
            min="0"
            max="1000"
            step="0.01"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
            required
          />
          <p className="text-xs text-muted-foreground">
            New loans start with this percentage. Loans already created keep the rate they were given.
          </p>
        </div>
        <Button type="submit" disabled={save.isPending}>
          {save.isPending ? "Saving..." : "Save settings"}
        </Button>
      </form>
    </div>
  );
}
