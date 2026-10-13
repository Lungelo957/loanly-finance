-- 1. Active-business membership helper (blocks suspended/pending/rejected businesses at the database)
CREATE OR REPLACE FUNCTION public.is_active_business_member(_business_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.business_members m
    JOIN public.businesses b ON b.id = m.business_id
    WHERE m.business_id = _business_id AND m.user_id = auth.uid()
      AND b.status IN ('approved','active'))
$$;
REVOKE EXECUTE ON FUNCTION public.is_active_business_member(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_active_business_member(uuid) TO authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_business_member(uuid) FROM PUBLIC, anon;

DROP POLICY IF EXISTS "borrowers tenant all" ON public.borrowers;
CREATE POLICY "borrowers tenant all" ON public.borrowers FOR ALL TO authenticated
  USING (public.is_active_business_member(business_id)) WITH CHECK (public.is_active_business_member(business_id));
DROP POLICY IF EXISTS "loans tenant all" ON public.loans;
CREATE POLICY "loans tenant all" ON public.loans FOR ALL TO authenticated
  USING (public.is_active_business_member(business_id)) WITH CHECK (public.is_active_business_member(business_id));
DROP POLICY IF EXISTS "repayments tenant all" ON public.loan_repayments;
CREATE POLICY "repayments tenant all" ON public.loan_repayments FOR ALL TO authenticated
  USING (public.is_active_business_member(business_id)) WITH CHECK (public.is_active_business_member(business_id));
DROP POLICY IF EXISTS "payments tenant all" ON public.payments;
CREATE POLICY "payments tenant all" ON public.payments FOR ALL TO authenticated
  USING (public.is_active_business_member(business_id)) WITH CHECK (public.is_active_business_member(business_id));
DROP POLICY IF EXISTS "capital tenant all" ON public.capital_entries;
CREATE POLICY "capital tenant all" ON public.capital_entries FOR ALL TO authenticated
  USING (public.is_active_business_member(business_id)) WITH CHECK (public.is_active_business_member(business_id));
DROP POLICY IF EXISTS "expenses tenant all" ON public.expenses;
CREATE POLICY "expenses tenant all" ON public.expenses FOR ALL TO authenticated
  USING (public.is_active_business_member(business_id)) WITH CHECK (public.is_active_business_member(business_id));
DROP POLICY IF EXISTS "agreements tenant all" ON public.agreements;
CREATE POLICY "agreements tenant all" ON public.agreements FOR ALL TO authenticated
  USING (public.is_active_business_member(business_id)) WITH CHECK (public.is_active_business_member(business_id));
DROP POLICY IF EXISTS "consents tenant all" ON public.borrower_consents;
CREATE POLICY "consents tenant all" ON public.borrower_consents FOR ALL TO authenticated
  USING (public.is_active_business_member(business_id)) WITH CHECK (public.is_active_business_member(business_id));

-- 2. Business owners cannot self-approve, self-unsuspend, transfer ownership or self-enroll in the reliability network
CREATE OR REPLACE FUNCTION public.guard_business_admin_fields()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR public.is_admin() THEN RETURN NEW; END IF;
  IF NEW.status IS DISTINCT FROM OLD.status
     OR NEW.owner_id IS DISTINCT FROM OLD.owner_id
     OR NEW.package IS DISTINCT FROM OLD.package
     OR NEW.reliability_network_enabled IS DISTINCT FROM OLD.reliability_network_enabled THEN
    RAISE EXCEPTION 'Only platform administrators can change this setting' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_guard_business_admin_fields BEFORE UPDATE ON public.businesses
  FOR EACH ROW EXECUTE FUNCTION public.guard_business_admin_fields();

CREATE OR REPLACE FUNCTION public.guard_business_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR public.is_admin() THEN RETURN NEW; END IF;
  NEW.status := 'pending';
  NEW.reliability_network_enabled := false;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_guard_business_insert BEFORE INSERT ON public.businesses
  FOR EACH ROW EXECUTE FUNCTION public.guard_business_insert();

-- 3. Only admins may write admin responses on support tickets
CREATE OR REPLACE FUNCTION public.guard_ticket_admin_fields()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR public.is_admin() THEN RETURN NEW; END IF;
  IF NEW.admin_response IS DISTINCT FROM OLD.admin_response
     OR NEW.business_id IS DISTINCT FROM OLD.business_id
     OR NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    RAISE EXCEPTION 'Not allowed' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_guard_ticket_admin_fields BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.guard_ticket_admin_fields();

-- 4. Cross-tenant reference protection: linked records must belong to the same business
CREATE OR REPLACE FUNCTION public.guard_same_business_refs()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE j jsonb := to_jsonb(NEW);
BEGIN
  IF j ? 'borrower_id' AND (j->>'borrower_id') IS NOT NULL AND NOT EXISTS
     (SELECT 1 FROM public.borrowers WHERE id = (j->>'borrower_id')::uuid AND business_id = NEW.business_id) THEN
    RAISE EXCEPTION 'Borrower does not belong to this business' USING ERRCODE = '42501';
  END IF;
  IF j ? 'loan_id' AND (j->>'loan_id') IS NOT NULL AND NOT EXISTS
     (SELECT 1 FROM public.loans WHERE id = (j->>'loan_id')::uuid AND business_id = NEW.business_id) THEN
    RAISE EXCEPTION 'Loan does not belong to this business' USING ERRCODE = '42501';
  END IF;
  IF j ? 'repayment_id' AND (j->>'repayment_id') IS NOT NULL AND NOT EXISTS
     (SELECT 1 FROM public.loan_repayments WHERE id = (j->>'repayment_id')::uuid AND business_id = NEW.business_id) THEN
    RAISE EXCEPTION 'Repayment does not belong to this business' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_refs_loans BEFORE INSERT OR UPDATE ON public.loans FOR EACH ROW EXECUTE FUNCTION public.guard_same_business_refs();
CREATE TRIGGER trg_refs_repayments BEFORE INSERT OR UPDATE ON public.loan_repayments FOR EACH ROW EXECUTE FUNCTION public.guard_same_business_refs();
CREATE TRIGGER trg_refs_payments BEFORE INSERT OR UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.guard_same_business_refs();
CREATE TRIGGER trg_refs_agreements BEFORE INSERT OR UPDATE ON public.agreements FOR EACH ROW EXECUTE FUNCTION public.guard_same_business_refs();
CREATE TRIGGER trg_refs_consents BEFORE INSERT OR UPDATE ON public.borrower_consents FOR EACH ROW EXECUTE FUNCTION public.guard_same_business_refs();

-- 5. Activity logs and notifications cannot be planted into other businesses / users
DROP POLICY IF EXISTS "logs insert" ON public.activity_logs;
CREATE POLICY "logs insert" ON public.activity_logs FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND (business_id IS NULL OR public.is_business_member(business_id) OR public.is_admin()));
DROP POLICY IF EXISTS "notifications insert" ON public.notifications;
CREATE POLICY "notifications insert" ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (public.is_admin() OR (business_id IS NOT NULL AND public.is_business_member(business_id)
    AND (user_id IS NULL OR user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.business_members m WHERE m.business_id = notifications.business_id AND m.user_id = notifications.user_id))));