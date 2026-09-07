import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Building2, Search } from "lucide-react";
import { PageHeader } from "@/components/app-shell";
import { EmptyState, ErrorState, LoadingState } from "@/components/state-views";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/lib/account";
import { useAdminInvalidate, useAllBusinesses, type BusinessStatus } from "@/lib/admin-data";
import { friendlyError } from "@/lib/business-data";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/admin/_app/businesses")({
  head: () => ({
    meta: [
      { title: "Businesses — CashFlow admin" },
      { name: "description", content: "Approve, reject, activate or suspend registered businesses." },
      { property: "og:title", content: "Businesses — CashFlow admin" },
      { property: "og:description", content: "Approve, reject, activate or suspend registered businesses." },
    ],
  }),
  component: AdminBusinesses;
});

function AdminBusinesses() {
  return null;
}
