import { Bell } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useAccount } from "@/lib/account";
import { useAnnouncementInbox } from "@/lib/announcement-data";

export function BusinessNotificationBell() {
  const { data: account } = useAccount();
  const inbox = useAnnouncementInbox(account?.business?.id);
  const unreadCount = (inbox.data ?? []).filter((item) => !item.read_at).length;

  return (
    <Link
      to="/business/notifications"
      aria-label={unreadCount ? `Notifications, ${unreadCount} unread` : "Notifications"}
      title="Notifications"
      className="relative grid h-9 w-9 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Bell className="h-5 w-5" />
      {unreadCount > 0 ? (
        <span className="absolute -right-1 -top-1 min-w-4 rounded-full bg-destructive px-1 text-center text-[10px] font-semibold leading-4 text-destructive-foreground">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      ) : null}
    </Link>
  );
}
