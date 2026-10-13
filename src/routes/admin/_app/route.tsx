import { createFileRoute, Outlet } from "@tanstack/react-router";
import { Building2, LayoutDashboard, LifeBuoy, ShieldCheck } from "lucide-react";
import { AppShell, type NavItem } from "@/components/app-shell";
import { requireAdminAccess } from "@/lib/guards";
import { useAccount } from "@/lib/account";

const items: NavItem[] = [
  { to: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/admin/businesses", label: "Businesses", icon: Building2 },
  { to: "/admin/reliability", label: "Reliability network", icon: ShieldCheck },
  { to: "/admin/support", label: "Support", icon: LifeBuoy },
];

export const Route = createFileRoute("/admin/_app")({
  beforeLoad: ({ context }) => requireAdminAccess(context.queryClient),
  component: AdminShell,
});

function AdminShell() {
  const { data: account } = useAccount();
  return (
    <AppShell
      items={items}
      portal="Administration"
      userLabel={account?.email ?? ""}
      signOutTo="/admin/login"
    >
      <Outlet />
    </AppShell>
  );
}
