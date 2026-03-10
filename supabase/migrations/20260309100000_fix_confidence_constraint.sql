-- =============================================================================
-- Fix: Drop findings_confidence_check constraint
--
-- The confidence column is validated in application code before insert.
-- The DB constraint was causing failures due to schema drift between
-- old and new deployments. Removing it here makes the schema resilient.
--
-- Safe to re-run: uses IF EXISTS / exception handling throughout.
-- =============================================================================

-- Drop the confidence check constraint if it exists (any version)
DO $$ BEGIN
  ALTER TABLE public.findings DROP CONSTRAINT IF EXISTS findings_confidence_check;
EXCEPTION WHEN others THEN
  RAISE NOTICE 'findings_confidence_check drop skipped: %', SQLERRM;
END $$;

-- Also normalize any legacy 'Med' values that may exist in the table
DO $$ BEGIN
  UPDATE public.findings SET confidence = 'Medium' WHERE confidence = 'Med';
EXCEPTION WHEN others THEN
  RAISE NOTICE 'confidence normalization skipped: %', SQLERRM;
END $$;
