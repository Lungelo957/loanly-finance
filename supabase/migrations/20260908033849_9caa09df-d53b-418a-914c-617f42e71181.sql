-- 1. Business-level default interest rate
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS default_interest_rate numeric NOT NULL DEFAULT 40;

-- 2. Loans get an explicit due date (month-end model)
ALTER TABLE public.loans
  ADD COLUMN IF NOT EXISTS due_date date;

-- Backfill: use the last scheduled instalment date, else month-end of start_date
UPDATE public.loans l
SET due_date = COALESCE(
  (SELECT max(r.due_date) FROM public.loan_repayments r WHERE r.loan_id = l.id),
  (date_trunc('month', l.start_date::timestamp) + interval '1 month - 1 day')::date
)
WHERE l.due_date IS NULL;

ALTER TABLE public.loans
  ALTER COLUMN due_date SET NOT NULL,
  ALTER COLUMN loan_term_months SET DEFAULT 1;

CREATE INDEX IF NOT EXISTS loans_due_date_idx ON public.loans (business_id, due_date);

-- 3. Bootstrap the first system administrator (server-side only; no app path grants roles)
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'system_admin'::app_role FROM auth.users WHERE email = 'lungelomahaye95@gmail.com'
ON CONFLICT DO NOTHING;