import { createFileRoute, Outlet } from "@tanstack/react-router";
import {
  BarChart3,
  Banknote,
  FileText,
  HandCoins,
  LayoutDashboard,
  LifeBuoy,
  Receipt,
  ScrollText,
  Settings,
  Users,
  Wallet,
} from "lucide-react";
import { AppShell, type NavItem } from "@/components/app-shell";
import { requireBusinessAccess } from "@/lib/guards";
import { useAccount } from "@/lib/account";

const items: NavItem[] = [
  { to: "/business/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/business/capital", label: "Capital", icon: Wallet },
  { to: "/business/borrowers", label: "Borrowers", icon: Users },
  { to: "/business/loans", label: "Loans", icon: HandCoins },
  { to: "/business/payments", label: "Payments", icon: Banknote },
  { to: "/business/collections", label: "Collections", icon: Receipt },
  { to: "/business/expenses", label: "Expenses", icon: ScrollText },
  { to: "/business/reports", label: "Reports", icon: BarChart3 },
  { to: "/business/agreements", label: "Agreements", icon: FileText },
  { to: "/business/support", label: "Support", icon: LifeBuoy },
  { to: "/business/settings", label: "Settings", icon: Settings },
];

export const Route = createFileRoute("/business/_app")({
  beforeLoad: ({ context }) => requireBusinessAccess(context.queryClient),
  component: BusinessWorkspace,
});

function BusinessWorkspace() {
  const { data: account } = useAccount();
  return (
    <AppShell
      items={items}
      portal={account?.business?.name ?? "Business portal"}
      userLabel={account?.email ?? ""}
      signOutTo="/business/login"
    >
      <Outlet />
    </AppShell>
  );
}
