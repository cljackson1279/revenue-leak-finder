-- Migration: Add denial and appeal columns to findings table
-- Fixes: "Could not find the 'appeal_by_date' column of 'findings' in the schema cache"
--
-- The analyze route writes these 5 columns but they were never added to the live DB:
--   denial_amount        — dollar amount of the denial (numeric, nullable)
--   denial_category      — CARC-derived category string (text, nullable)
--   appeal_deadline_days — days from service date to appeal deadline (integer, default 90)
--   appeal_by_date       — computed date: service_date + appeal_deadline_days (date, nullable)
--   appeal_status        — current appeal workflow status (text, default 'not_filed')
--
-- This migration is idempotent — safe to run multiple times.

DO $$ BEGIN
  ALTER TABLE public.findings ADD COLUMN IF NOT EXISTS denial_amount        numeric;
  ALTER TABLE public.findings ADD COLUMN IF NOT EXISTS denial_category      text;
  ALTER TABLE public.findings ADD COLUMN IF NOT EXISTS appeal_deadline_days integer NOT NULL DEFAULT 90;
  ALTER TABLE public.findings ADD COLUMN IF NOT EXISTS appeal_by_date       date;
  ALTER TABLE public.findings ADD COLUMN IF NOT EXISTS appeal_status        text NOT NULL DEFAULT 'not_filed';
EXCEPTION WHEN others THEN
  RAISE NOTICE 'findings denial/appeal column additions skipped: %', SQLERRM;
END $$;

-- Add CHECK constraint on appeal_status (matches values used in application code)
DO $$ BEGIN
  ALTER TABLE public.findings
    ADD CONSTRAINT findings_appeal_status_check
    CHECK (appeal_status IN ('not_filed', 'filed', 'won', 'lost', 'pending'));
EXCEPTION WHEN duplicate_object THEN
  RAISE NOTICE 'findings_appeal_status_check already exists';
WHEN others THEN
  RAISE NOTICE 'findings_appeal_status_check skipped: %', SQLERRM;
END $$;

-- Backfill appeal_status for any existing rows that have NULL
DO $$ BEGIN
  UPDATE public.findings SET appeal_status = 'not_filed' WHERE appeal_status IS NULL;
EXCEPTION WHEN others THEN NULL;
END $$;

-- Index on appeal_by_date for deadline-sorted queries
CREATE INDEX IF NOT EXISTS findings_appeal_by_date_idx ON public.findings (appeal_by_date);

-- Index on appeal_status for filtering by workflow state
CREATE INDEX IF NOT EXISTS findings_appeal_status_idx ON public.findings (appeal_status);

-- Index on denial_category for category-grouped views
CREATE INDEX IF NOT EXISTS findings_denial_category_idx ON public.findings (denial_category);
