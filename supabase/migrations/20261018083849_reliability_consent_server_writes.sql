-- Consent changes must go through the server function, which validates active
-- business membership and links the borrower to the shared network identity.
REVOKE ALL PRIVILEGES ON public.borrower_consents FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.borrower_consents TO authenticated;