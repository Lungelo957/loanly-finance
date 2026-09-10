-- 1. Anonymous cross-business identity layer
CREATE TABLE public.network_borrowers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier_hash text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
-- Intentionally NO grants to anon/authenticated: server-side (service role) only.
GRANT ALL ON public.network_borrowers TO service_role;
ALTER TABLE public.network_borrowers ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_network_borrowers_updated BEFORE UPDATE ON public.network_borrowers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Link business borrowers to the anonymous identity (nullable, non-breaking)
ALTER TABLE public.borrowers ADD COLUMN IF NOT EXISTS network_borrower_id uuid
  REFERENCES public.network_borrowers(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_borrowers_network ON public.borrowers(network_borrower_id);

-- 3. Business participation switch (admin controlled)
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS reliability_network_enabled boolean NOT NULL DEFAULT false;

-- 4. Consent records
CREATE TYPE public.consent_status AS ENUM ('pending', 'granted', 'denied', 'revoked');

CREATE TABLE public.borrower_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  borrower_id uuid NOT NULL REFERENCES public.borrowers(id) ON DELETE CASCADE,
  network_borrower_id uuid REFERENCES public.network_borrowers(id) ON DELETE SET NULL,
  status public.consent_status NOT NULL DEFAULT 'pending',
  method text NOT NULL DEFAULT '',
  granted_at timestamptz,
  revoked_at timestamptz,
  recorded_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (borrower_id)
);
GRANT SELECT, INSERT, UPDATE ON public.borrower_consents TO authenticated;
GRANT ALL ON public.borrower_consents TO service_role;
ALTER TABLE public.borrower_consents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "consents tenant all" ON public.borrower_consents FOR ALL TO authenticated
  USING (public.is_business_member(business_id)) WITH CHECK (public.is_business_member(business_id));
CREATE POLICY "consents admin read" ON public.borrower_consents FOR SELECT TO authenticated
  USING (public.is_admin());
CREATE TRIGGER trg_borrower_consents_updated BEFORE UPDATE ON public.borrower_consents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Audit trail of reliability searches
CREATE TABLE public.reliability_searches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id),
  network_borrower_id uuid REFERENCES public.network_borrowers(id) ON DELETE SET NULL,
  purpose text NOT NULL DEFAULT 'loan_assessment',
  result_type text NOT NULL DEFAULT 'no_history',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.reliability_searches TO authenticated;
GRANT ALL ON public.reliability_searches TO service_role;
ALTER TABLE public.reliability_searches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "searches tenant read" ON public.reliability_searches FOR SELECT TO authenticated
  USING (public.is_business_member(business_id) OR public.is_admin());
CREATE INDEX IF NOT EXISTS idx_reliability_searches_business_time
  ON public.reliability_searches(business_id, created_at DESC);