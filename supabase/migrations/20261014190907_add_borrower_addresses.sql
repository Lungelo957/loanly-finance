ALTER TABLE public.borrowers
  ADD COLUMN IF NOT EXISTS home_address TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS work_address TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS other_address TEXT NOT NULL DEFAULT '';

UPDATE public.borrowers
SET home_address = address
WHERE home_address = '' AND address <> '';