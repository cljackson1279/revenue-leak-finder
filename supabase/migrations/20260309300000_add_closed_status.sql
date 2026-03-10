-- Migration: Add 'closed' to findings status constraint
-- This is idempotent — safe to run multiple times.

-- Drop the existing status check constraint and recreate with 'closed' added
ALTER TABLE public.findings DROP CONSTRAINT IF EXISTS findings_status_check;

ALTER TABLE public.findings
  ADD CONSTRAINT findings_status_check
  CHECK (status IN ('open', 'resolved', 'ignored', 'closed'));

-- Ensure the confidence constraint is also gone (enforced in code)
ALTER TABLE public.findings DROP CONSTRAINT IF EXISTS findings_confidence_check;
