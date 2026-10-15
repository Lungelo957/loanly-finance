import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Bell, CheckCheck } from "lucide-react";
import { PageHeader } from "@/components/app-shell";
import { EmptyState, ErrorState, LoadingState } from "@/components/state-views";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAccount } from "@/lib/account";
import {
  announcementCategoryLabel,
  useAnnouncementInbox,
  useMarkAllAnnouncementsRead,
  useMarkAnnouncementRead,
} from "@/lib/announcement-data";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/business/_app/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — CashFlow" },
      { name: "description", content: "Announcements for your CashFlow business." },
    ],
  }),
  component: BusinessNotificationsPage,
});

const categoryTone: Record<string, string> = {
  general: "bg-muted text-muted-foreground",
  feature: "bg-accent text-accent-foreground",
  maintenance: "bg-primary/10 text-primary",
  important: "bg-destructive/10 text-destructive",
};

function BusinessNotificationsPage() {
  const { data: account } = useAccount();
  const businessId = account?.business?.id;
  const inbox = useAnnouncementInbox(businessId);
  const markRead = useMarkAnnouncementRead(businessId);
  const markAllRead = useMarkAllAnnouncementsRead(businessId);
  const [filter, setFilter] = useState("all");

  const items = inbox.data ?? [];
  const unreadCount = items.filter((item) => !item.read_at).length;
  const visibleItems = items.filter((item) =>
    filter === "unread" ? !item.read_at : filter === "read" ? !!item.read_at : true,
  );

  if (inbox.isLoading) return <LoadingState label="Loading notifications..." />;
  if (inbox.error) {
    return (
      <ErrorState
        message="We couldn't load your notifications."
        onRetry={() => void inbox.refetch()}
      />
    );
  }

  const markOne = (announcementId: string) =>
    markRead.mutate(announcementId, {
      onError: () => toast.error("We couldn't update this notification."),
    });

  const markAll = () =>
    markAllRead.mutate(undefined, {
      onSuccess: () => toast.success("All notifications marked as read."),
      onError: () => toast.error("We couldn't update your notifications."),
    });

  return (
    <div>
      <PageHeader
        title="Notifications"
        description="Announcements and updates for your business."
        action={
          <Button
            size="sm"
            variant="outline"
            onClick={markAll}
            disabled={unreadCount === 0 || markAllRead.isPending}
          >
            <CheckCheck className="h-4 w-4" /> Mark all as read
          </Button>
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={filter} onValueChange={setFilter}>
          <TabsList>
            <TabsTrigger value="all">All ({items.length})</TabsTrigger>
            <TabsTrigger value="unread">Unread ({unreadCount})</TabsTrigger>
            <TabsTrigger value="read">Read ({items.length - unreadCount})</TabsTrigger>
          </TabsList>
        </Tabs>
        <p className="text-xs text-muted-foreground">New announcements refresh automatically.</p>
      </div>

      {visibleItems.length === 0 ? (
        <EmptyState
          icon={<Bell />}
          title={items.length === 0 ? "No notifications yet" : `No ${filter} notifications`}
          description={
            items.length === 0
              ? "Announcements from CashFlow administrators will appear here."
              : "Try a different filter to see your announcements."
          }
        />
      ) : (
        <div className="card-surface divide-y divide-border">
          {visibleItems.map((item) => (
            <article
              key={item.announcement_id}
              className={`flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:justify-between sm:p-5 ${
                item.read_at ? "" : "bg-accent/20"
              }`}
            >
              <div className="flex min-w-0 gap-3">
                <span
                  aria-hidden="true"
                  className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${item.read_at ? "bg-muted-foreground/30" : "bg-gold"}`}
                />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-semibold">{item.announcement.title}</h2>
                    <Badge
                      className={categoryTone[item.announcement.category] ?? ""}
                      variant="secondary"
                    >
                      {announcementCategoryLabel(item.announcement.category)}
                    </Badge>
                    {!item.read_at ? <Badge variant="outline">Unread</Badge> : null}
                    {item.announcement.status === "archived" ? (
                      <Badge variant="outline">Archived</Badge>
                    ) : null}
                  </div>
                  <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-muted-foreground">
                    {item.announcement.message}
                  </p>
                  <p className="mt-3 text-xs text-muted-foreground">
                    Published {formatDate(item.announcement.published_at ?? item.created_at)}
                  </p>
                </div>
              </div>
              {!item.read_at ? (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => markOne(item.announcement_id)}
                  disabled={markRead.isPending}
                >
                  Mark as read
                </Button>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
