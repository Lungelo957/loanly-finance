import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Tables = Database["public"]["Tables"];
export type Announcement = Tables["announcements"]["Row"];
export type AnnouncementRecipient = Tables["announcement_recipients"]["Row"];
export type AnnouncementInboxItem = AnnouncementRecipient & { announcement: Announcement };

export const ANNOUNCEMENT_CATEGORIES = [
  { value: "general", label: "General announcement" },
  { value: "feature", label: "New feature" },
  { value: "maintenance", label: "Maintenance" },
  { value: "important", label: "Important update" },
] as const;

export function announcementCategoryLabel(category: string) {
  return ANNOUNCEMENT_CATEGORIES.find((item) => item.value === category)?.label ?? "Announcement";
}

const inboxKey = (businessId: string | undefined) => ["business", businessId, "announcements"];

export function useAnnouncementInbox(businessId: string | undefined) {
  return useQuery({
    queryKey: inboxKey(businessId),
    enabled: !!businessId,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
    queryFn: async (): Promise<AnnouncementInboxItem[]> => {
      if (!businessId) return [];
      const { data: recipients, error: recipientError } = await supabase
        .from("announcement_recipients")
        .select("announcement_id, business_id, created_at, read_at")
        .eq("business_id", businessId)
        .order("created_at", { ascending: false });
      if (recipientError) throw new Error(recipientError.message);
      if (!recipients?.length) return [];

      const { data: announcements, error: announcementError } = await supabase
        .from("announcements")
        .select("*")
        .in(
          "id",
          recipients.map((recipient) => recipient.announcement_id),
        );
      if (announcementError) throw new Error(announcementError.message);

      const byId = new Map(
        (announcements ?? []).map((announcement) => [announcement.id, announcement]),
      );
      return recipients.flatMap((recipient) => {
        const announcement = byId.get(recipient.announcement_id);
        return announcement ? [{ ...recipient, announcement }] : [];
      });
    },
  });
}

export function useMarkAnnouncementRead(businessId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (announcementId: string) => {
      if (!businessId) throw new Error("no-business");
      const { error } = await supabase
        .from("announcement_recipients")
        .update({ read_at: new Date().toISOString() })
        .eq("business_id", businessId)
        .eq("announcement_id", announcementId)
        .is("read_at", null);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: inboxKey(businessId) }),
  });
}

export function useMarkAllAnnouncementsRead(businessId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!businessId) throw new Error("no-business");
      const { error } = await supabase
        .from("announcement_recipients")
        .update({ read_at: new Date().toISOString() })
        .eq("business_id", businessId)
        .is("read_at", null);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: inboxKey(businessId) }),
  });
}
