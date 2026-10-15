import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { BellRing, Eye, Megaphone, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/app-shell";
import { EmptyState, ErrorState, LoadingState } from "@/components/state-views";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAllBusinesses, useAdminInvalidate } from "@/lib/admin-data";
import {
  ANNOUNCEMENT_CATEGORIES,
  announcementCategoryLabel,
  type Announcement,
  type AnnouncementRecipient,
} from "@/lib/announcement-data";
import { friendlyError } from "@/lib/business-data";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/admin/_app/announcements")({
  head: () => ({
    meta: [
      { title: "Announcements — CashFlow admin" },
      { name: "description", content: "Create and manage business announcements." },
    ],
  }),
  component: AdminAnnouncementsPage,
});

type Audience = "all_approved" | "business";
type DraftForm = {
  title: string;
  message: string;
  category: string;
  audience_type: Audience;
  target_business_id: string;
};

const EMPTY_DRAFT: DraftForm = {
  title: "",
  message: "",
  category: "general",
  audience_type: "all_approved",
  target_business_id: "",
};

const categoryTone: Record<string, string> = {
  general: "bg-muted text-muted-foreground",
  feature: "bg-accent text-accent-foreground",
  maintenance: "bg-primary/10 text-primary",
  important: "bg-destructive/10 text-destructive",
};

function AdminAnnouncementsPage() {
  const queryClient = useQueryClient();
  const invalidateAdmin = useAdminInvalidate();
  const businesses = useAllBusinesses();
  const [editorOpen, setEditorOpen] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [draft, setDraft] = useState<DraftForm>(EMPTY_DRAFT);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<Announcement | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Announcement | null>(null);

  const announcementsQuery = useQuery({
    queryKey: ["admin", "announcements"],
    queryFn: async () => {
      const [announcements, recipients] = await Promise.all([
        supabase.from("announcements").select("*").order("created_at", { ascending: false }),
        supabase
          .from("announcement_recipients")
          .select("announcement_id, business_id, created_at, read_at")
          .order("created_at", { ascending: false }),
      ]);
      if (announcements.error) throw new Error(announcements.error.message);
      if (recipients.error) throw new Error(recipients.error.message);
      return {
        announcements: (announcements.data ?? []) as Announcement[],
        recipients: (recipients.data ?? []) as AnnouncementRecipient[],
      };
    },
  });

  const eligibleBusinesses = useMemo(
    () =>
      (businesses.data ?? []).filter(
        (business) => business.status === "approved" || business.status === "active",
      ),
    [businesses.data],
  );
  const businessById = useMemo(
    () => new Map((businesses.data ?? []).map((business) => [business.id, business])),
    [businesses.data],
  );

  const saveDraft = useMutation({
    mutationFn: async (publish: boolean) => {
      const payload = {
        title: draft.title.trim(),
        message: draft.message.trim(),
        category: draft.category,
        audience_type: draft.audience_type,
        target_business_id: draft.audience_type === "business" ? draft.target_business_id : null,
      };
      let announcementId = editingId ?? undefined;
      if (announcementId) {
        const { data, error } = await supabase
          .from("announcements")
          .update(payload)
          .eq("id", announcementId)
          .eq("status", "draft")
          .select("id")
          .maybeSingle();
        if (error) throw new Error(error.message);
        if (!data) throw new Error("draft-unavailable");
      } else {
        const { data, error } = await supabase
          .from("announcements")
          .insert(payload)
          .select("id")
          .single();
        if (error) throw new Error(error.message);
        announcementId = data.id;
      }

      if (!publish)
        return { id: announcementId, published: false, recipientCount: 0, publishError: "" };

      const { data: recipientCount, error: publishError } = await supabase.rpc(
        "admin_publish_announcement",
        { _announcement_id: announcementId },
      );
      return {
        id: announcementId,
        published: !publishError,
        recipientCount: recipientCount ?? 0,
        publishError: publishError?.message ?? "",
      };
    },
    onSuccess: async (result) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin", "announcements"] }),
        invalidateAdmin(),
      ]);
      if (result.publishError) {
        setEditingId(result.id);
        setEditorOpen(true);
        toast.error(`Draft saved, but publishing failed: ${result.publishError}`);
        return;
      }
      if (result.published) {
        toast.success(`Announcement published to ${result.recipientCount} businesses.`);
        closeEditor();
      } else {
        setEditingId(result.id);
        toast.success("Draft saved.");
      }
    },
    onError: (error) => {
      const message =
        error.message === "draft-unavailable"
          ? "This draft is no longer available to edit. Refresh the page and try again."
          : friendlyError(error, "We couldn't save this announcement.");
      toast.error(message);
    },
  });

  const archive = useMutation({
    mutationFn: async (announcementId: string) => {
      const { error } = await supabase.rpc("admin_archive_announcement", {
        _announcement_id: announcementId,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin", "announcements"] });
      setArchiveTarget(null);
      toast.success("Announcement archived. Recipients can still revisit it.");
    },
    onError: (error) => toast.error(friendlyError(error, "We couldn't archive this announcement.")),
  });

  const deleteDraft = useMutation({
    mutationFn: async (announcementId: string) => {
      const { error } = await supabase
        .from("announcements")
        .delete()
        .eq("id", announcementId)
        .eq("status", "draft");
      if (error) throw new Error(error.message);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin", "announcements"] });
      setDeleteTarget(null);
      toast.success("Draft deleted.");
    },
    onError: (error) => toast.error(friendlyError(error, "We couldn't delete this draft.")),
  });

  function closeEditor() {
    setEditorOpen(false);
    setPreviewVisible(false);
    setEditingId(null);
    setDraft(EMPTY_DRAFT);
  }

  function newDraft() {
    setEditingId(null);
    setDraft(EMPTY_DRAFT);
    setPreviewVisible(false);
    setEditorOpen(true);
  }

  function editDraft(announcement: Announcement) {
    setEditingId(announcement.id);
    setDraft({
      title: announcement.title,
      message: announcement.message,
      category: announcement.category,
      audience_type: announcement.audience_type as Audience,
      target_business_id: announcement.target_business_id ?? "",
    });
    setPreviewVisible(false);
    setEditorOpen(true);
  }

  const data = announcementsQuery.data;
  if (announcementsQuery.isLoading || businesses.isLoading) {
    return <LoadingState label="Loading announcements..." />;
  }
  if (announcementsQuery.error || businesses.error) {
    return (
      <ErrorState
        message="We couldn't load announcements or recipient businesses."
        onRetry={() => {
          void announcementsQuery.refetch();
          void businesses.refetch();
        }}
      />
    );
  }

  const announcements = data?.announcements ?? [];
  const recipients = data?.recipients ?? [];
  const drafts = announcements.filter((announcement) => announcement.status === "draft");
  const published = announcements.filter((announcement) => announcement.status !== "draft");
  const eligibleCount = eligibleBusinesses.length;

  return (
    <div>
      <PageHeader
        title="Announcements"
        description="Publish updates to approved businesses and track which recipients have read them."
        action={
          <Button size="sm" onClick={newDraft}>
            <Plus className="h-4 w-4" /> New announcement
          </Button>
        }
      />

      <div className="mb-6 rounded-md border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
        Broadcasts are delivered to businesses approved or active at publication time. Businesses
        approved later do not receive past announcements.
      </div>

      <section className="mb-8" aria-labelledby="announcement-drafts">
        <h2 id="announcement-drafts" className="mb-3 text-base font-semibold">
          Drafts ({drafts.length})
        </h2>
        {drafts.length === 0 ? (
          <EmptyState
            title="No drafts"
            description="Save an announcement as a draft to review it before publishing."
          />
        ) : (
          <div className="card-surface divide-y divide-border">
            {drafts.map((announcement) => (
              <div
                key={announcement.id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-4"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{announcement.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {announcementCategoryLabel(announcement.category)} ·{" "}
                    {audienceLabel(announcement, businessById)} · updated{" "}
                    {formatDate(announcement.updated_at)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => editDraft(announcement)}>
                    Edit
                  </Button>
                  <Button size="sm" onClick={() => editDraft(announcement)}>
                    Review & publish
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Delete draft"
                    onClick={() => setDeleteTarget(announcement)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section aria-labelledby="announcement-published">
        <h2 id="announcement-published" className="mb-3 text-base font-semibold">
          Published announcements ({published.length})
        </h2>
        {published.length === 0 ? (
          <EmptyState
            icon={<BellRing className="h-8 w-8" />}
            title="Nothing published yet"
            description="Published announcements and their read status will appear here."
          />
        ) : (
          <div className="space-y-3">
            {published.map((announcement) => {
              const rows = recipients.filter(
                (recipient) => recipient.announcement_id === announcement.id,
              );
              const readCount = rows.filter((recipient) => !!recipient.read_at).length;
              return (
                <article key={announcement.id} className="card-surface p-4 sm:p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold">{announcement.title}</h3>
                        <Badge
                          variant="secondary"
                          className={categoryTone[announcement.category] ?? ""}
                        >
                          {announcementCategoryLabel(announcement.category)}
                        </Badge>
                        {announcement.status === "archived" ? (
                          <Badge variant="outline">Archived</Badge>
                        ) : null}
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Published {formatDate(announcement.published_at ?? announcement.created_at)}{" "}
                        · {audienceLabel(announcement, businessById)}
                      </p>
                    </div>
                    {announcement.status === "published" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setArchiveTarget(announcement)}
                      >
                        Archive
                      </Button>
                    ) : null}
                  </div>
                  <p className="mt-3 whitespace-pre-wrap break-words text-sm text-muted-foreground">
                    {announcement.message}
                  </p>
                  <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span>{rows.length} recipients</span>
                    <span>{readCount} read</span>
                    <span>{rows.length - readCount} unread</span>
                  </div>
                  <details className="mt-3 border-t border-border pt-3 text-sm">
                    <summary className="cursor-pointer font-medium">
                      Delivery status by business
                    </summary>
                    {rows.length === 0 ? (
                      <p className="mt-2 text-xs text-muted-foreground">
                        No recipients were recorded.
                      </p>
                    ) : (
                      <ul className="mt-2 divide-y divide-border">
                        {rows.map((recipient) => (
                          <li
                            key={recipient.business_id}
                            className="flex flex-wrap justify-between gap-2 py-2 text-xs"
                          >
                            <span>
                              {businessById.get(recipient.business_id)?.name ?? "Business"}
                            </span>
                            <span className="text-muted-foreground">
                              {recipient.read_at
                                ? `Read ${formatDate(recipient.read_at)}`
                                : "Delivered · unread"}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </details>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <Dialog
        open={editorOpen}
        onOpenChange={(open) => (open ? setEditorOpen(true) : closeEditor())}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit announcement draft" : "New announcement"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="announcement-title">Title</Label>
              <Input
                id="announcement-title"
                maxLength={200}
                value={draft.title}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, title: event.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="announcement-message">Message</Label>
              <Textarea
                id="announcement-message"
                maxLength={10000}
                rows={6}
                value={draft.message}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, message: event.target.value }))
                }
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={draft.category}
                  onValueChange={(category) => setDraft((current) => ({ ...current, category }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ANNOUNCEMENT_CATEGORIES.map((category) => (
                      <SelectItem key={category.value} value={category.value}>
                        {category.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Audience</Label>
                <Select
                  value={draft.audience_type}
                  onValueChange={(audience_type: Audience) =>
                    setDraft((current) => ({ ...current, audience_type, target_business_id: "" }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all_approved">All approved businesses</SelectItem>
                    <SelectItem value="business">One business</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {draft.audience_type === "business" ? (
              <div className="space-y-2">
                <Label>Business recipient</Label>
                <Select
                  value={draft.target_business_id}
                  onValueChange={(target_business_id) =>
                    setDraft((current) => ({ ...current, target_business_id }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select an approved business" />
                  </SelectTrigger>
                  <SelectContent>
                    {eligibleBusinesses.map((business) => (
                      <SelectItem key={business.id} value={business.id}>
                        {business.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            <Button
              variant="outline"
              size="sm"
              onClick={() => setPreviewVisible((visible) => !visible)}
            >
              <Eye className="h-4 w-4" /> {previewVisible ? "Hide preview" : "Preview"}
            </Button>
            {previewVisible ? (
              <div className="rounded-md border border-border bg-card p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold">{draft.title || "Announcement title"}</p>
                  <Badge variant="secondary" className={categoryTone[draft.category] ?? ""}>
                    {announcementCategoryLabel(draft.category)}
                  </Badge>
                </div>
                <p className="mt-3 whitespace-pre-wrap break-words text-sm text-muted-foreground">
                  {draft.message || "Announcement message preview"}
                </p>
                <p className="mt-3 text-xs text-muted-foreground">
                  Audience:{" "}
                  {draft.audience_type === "all_approved"
                    ? `all approved or active businesses (${eligibleCount})`
                    : (businessById.get(draft.target_business_id)?.name ?? "Choose a business")}
                </p>
              </div>
            ) : null}
            <p className="text-xs text-muted-foreground">
              Published messages cannot be edited. Archive a published announcement to preserve the
              original message and read history.
            </p>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="outline" onClick={closeEditor}>
                Cancel
              </Button>
              <Button
                variant="outline"
                disabled={
                  saveDraft.isPending ||
                  !draft.title.trim() ||
                  !draft.message.trim() ||
                  (draft.audience_type === "business" && !draft.target_business_id)
                }
                onClick={() => saveDraft.mutate(false)}
              >
                Save draft
              </Button>
              <Button
                disabled={
                  saveDraft.isPending ||
                  !draft.title.trim() ||
                  !draft.message.trim() ||
                  (draft.audience_type === "business" && !draft.target_business_id)
                }
                onClick={() => saveDraft.mutate(true)}
              >
                <Megaphone className="h-4 w-4" />{" "}
                {saveDraft.isPending ? "Publishing..." : "Publish now"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!archiveTarget} onOpenChange={(open) => !open && setArchiveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive this announcement?</AlertDialogTitle>
            <AlertDialogDescription>
              Recipients can still read this announcement. Its message and delivery/read history
              will remain unchanged.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => archiveTarget && archive.mutate(archiveTarget.id)}>
              {archive.isPending ? "Archiving..." : "Archive announcement"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this draft?</AlertDialogTitle>
            <AlertDialogDescription>
              Only drafts can be deleted. Published messages are retained for recipient history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteTarget && deleteDraft.mutate(deleteTarget.id)}>
              {deleteDraft.isPending ? "Deleting..." : "Delete draft"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function audienceLabel(announcement: Announcement, businesses: Map<string, { name: string }>) {
  if (announcement.audience_type === "all_approved") return "All approved businesses";
  return businesses.get(announcement.target_business_id ?? "")?.name ?? "Selected business";
}
