CREATE TABLE public.announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL CHECK (length(btrim(title)) BETWEEN 1 AND 200),
  message text NOT NULL CHECK (length(btrim(message)) BETWEEN 1 AND 10000),
  category text NOT NULL CHECK (category IN ('general', 'feature', 'maintenance', 'important')),
  audience_type text NOT NULL CHECK (audience_type IN ('all_approved', 'business')),
  target_business_id uuid REFERENCES public.businesses(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  created_by uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz,
  archived_at timestamptz,
  CONSTRAINT announcements_audience_target_check CHECK (
    (audience_type = 'all_approved' AND target_business_id IS NULL)
    OR (audience_type = 'business' AND target_business_id IS NOT NULL)
  ),
  CONSTRAINT announcements_publication_dates_check CHECK (
    (status = 'draft' AND published_at IS NULL AND archived_at IS NULL)
    OR (status = 'published' AND published_at IS NOT NULL AND archived_at IS NULL)
    OR (status = 'archived' AND published_at IS NOT NULL AND archived_at IS NOT NULL)
  )
);

CREATE TABLE public.announcement_recipients (
  announcement_id uuid NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz,
  PRIMARY KEY (announcement_id, business_id)
);

CREATE INDEX announcement_recipients_business_unread_idx
  ON public.announcement_recipients (business_id, read_at);
CREATE INDEX announcement_recipients_announcement_idx
  ON public.announcement_recipients (announcement_id);

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcement_recipients ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.announcements FROM anon, authenticated;
GRANT SELECT ON public.announcements TO authenticated;
GRANT INSERT (title, message, category, audience_type, target_business_id)
  ON public.announcements TO authenticated;
GRANT UPDATE (title, message, category, audience_type, target_business_id)
  ON public.announcements TO authenticated;
GRANT DELETE ON public.announcements TO authenticated;
GRANT ALL ON public.announcements TO service_role;

REVOKE ALL ON public.announcement_recipients FROM anon, authenticated;
GRANT SELECT ON public.announcement_recipients TO authenticated;
GRANT UPDATE (read_at) ON public.announcement_recipients TO authenticated;
GRANT ALL ON public.announcement_recipients TO service_role;

CREATE POLICY "announcement admin read" ON public.announcements FOR SELECT TO authenticated
  USING (public.is_admin());
CREATE POLICY "announcement recipient read" ON public.announcements FOR SELECT TO authenticated
  USING (
    status IN ('published', 'archived')
    AND EXISTS (
      SELECT 1
      FROM public.announcement_recipients r
      WHERE r.announcement_id = announcements.id
        AND public.is_active_business_member(r.business_id)
    )
  );
CREATE POLICY "announcement admin insert draft" ON public.announcements FOR INSERT TO authenticated
  WITH CHECK (public.is_admin() AND created_by = auth.uid() AND status = 'draft');
CREATE POLICY "announcement admin update draft" ON public.announcements FOR UPDATE TO authenticated
  USING (public.is_admin() AND status = 'draft')
  WITH CHECK (public.is_admin() AND status = 'draft');
CREATE POLICY "announcement admin delete draft" ON public.announcements FOR DELETE TO authenticated
  USING (public.is_admin() AND status = 'draft');

CREATE POLICY "announcement recipient or admin read" ON public.announcement_recipients FOR SELECT TO authenticated
  USING (public.is_admin() OR public.is_active_business_member(business_id));
CREATE POLICY "business marks own announcement read" ON public.announcement_recipients FOR UPDATE TO authenticated
  USING (public.is_active_business_member(business_id) AND read_at IS NULL)
  WITH CHECK (public.is_active_business_member(business_id) AND read_at IS NOT NULL);

CREATE OR REPLACE FUNCTION public.guard_announcement_history()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF OLD.status = 'draft' THEN
    IF NEW.status NOT IN ('draft', 'published') THEN
      RAISE EXCEPTION 'Draft announcements can only be published' USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.title IS DISTINCT FROM OLD.title
     OR NEW.message IS DISTINCT FROM OLD.message
     OR NEW.category IS DISTINCT FROM OLD.category
     OR NEW.audience_type IS DISTINCT FROM OLD.audience_type
     OR NEW.target_business_id IS DISTINCT FROM OLD.target_business_id
     OR NEW.created_by IS DISTINCT FROM OLD.created_by
     OR NEW.created_at IS DISTINCT FROM OLD.created_at
     OR NEW.published_at IS DISTINCT FROM OLD.published_at THEN
    RAISE EXCEPTION 'Published announcement content and audience are immutable' USING ERRCODE = '42501';
  END IF;

  IF OLD.status = 'published' THEN
    IF NEW.status NOT IN ('published', 'archived')
       OR (NEW.status = 'published' AND NEW.archived_at IS NOT NULL)
       OR (NEW.status = 'archived' AND NEW.archived_at IS NULL) THEN
      RAISE EXCEPTION 'Published announcements may only be archived' USING ERRCODE = '42501';
    END IF;
  ELSIF OLD.status = 'archived' AND (NEW.status <> 'archived' OR NEW.archived_at IS DISTINCT FROM OLD.archived_at) THEN
    RAISE EXCEPTION 'Archived announcements cannot be changed' USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_guard_announcement_history BEFORE UPDATE ON public.announcements
  FOR EACH ROW EXECUTE FUNCTION public.guard_announcement_history();
CREATE TRIGGER trg_announcement_updated BEFORE UPDATE ON public.announcements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.admin_publish_announcement(_announcement_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  announcement_row public.announcements%ROWTYPE;
  recipient_count integer;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only administrators may publish announcements' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO announcement_row
  FROM public.announcements
  WHERE id = _announcement_id
  FOR UPDATE;

  IF NOT FOUND OR announcement_row.status <> 'draft' THEN
    RAISE EXCEPTION 'Only an existing draft can be published' USING ERRCODE = '22023';
  END IF;

  IF announcement_row.audience_type = 'all_approved' THEN
    INSERT INTO public.announcement_recipients (announcement_id, business_id)
    SELECT announcement_row.id, b.id
    FROM public.businesses b
    WHERE b.status IN ('approved', 'active')
    ON CONFLICT (announcement_id, business_id) DO NOTHING;
  ELSE
    IF NOT EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = announcement_row.target_business_id
        AND b.status IN ('approved', 'active')
    ) THEN
      RAISE EXCEPTION 'The target business must be approved or active' USING ERRCODE = '22023';
    END IF;

    INSERT INTO public.announcement_recipients (announcement_id, business_id)
    VALUES (announcement_row.id, announcement_row.target_business_id)
    ON CONFLICT (announcement_id, business_id) DO NOTHING;
  END IF;

  GET DIAGNOSTICS recipient_count = ROW_COUNT;
  IF recipient_count = 0 THEN
    RAISE EXCEPTION 'There are no eligible businesses to receive this announcement' USING ERRCODE = '22023';
  END IF;

  UPDATE public.announcements
  SET status = 'published', published_at = now()
  WHERE id = announcement_row.id;

  RETURN recipient_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_archive_announcement(_announcement_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only administrators may archive announcements' USING ERRCODE = '42501';
  END IF;

  UPDATE public.announcements
  SET status = 'archived', archived_at = now()
  WHERE id = _announcement_id AND status = 'published';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Only a published announcement can be archived' USING ERRCODE = '22023';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_publish_announcement(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_publish_announcement(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.admin_archive_announcement(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_archive_announcement(uuid) TO authenticated;