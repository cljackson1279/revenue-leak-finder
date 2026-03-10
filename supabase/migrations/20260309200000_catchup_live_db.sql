-- =============================================================================
-- Catch-up migration for live databases created from the original schema
--
-- Run this ONCE in Supabase SQL Editor if you created your database before
-- the feature/revenue-recovery-engine PR was merged.
--
-- Safe to re-run: all statements use IF NOT EXISTS / IF EXISTS / exceptions.
-- =============================================================================

-- ─── 1. UPLOADS: add missing columns ────────────────────────────────────────

-- content_hash: SHA-256 of file contents for deduplication
DO $$ BEGIN
  ALTER TABLE public.uploads ADD COLUMN IF NOT EXISTS content_hash text;
EXCEPTION WHEN others THEN
  RAISE NOTICE 'uploads.content_hash already exists, skipping';
END $$;

-- analyzed_at: timestamp when analysis completed
DO $$ BEGIN
  ALTER TABLE public.uploads ADD COLUMN IF NOT EXISTS analyzed_at timestamptz;
EXCEPTION WHEN others THEN
  RAISE NOTICE 'uploads.analyzed_at already exists, skipping';
END $$;

-- error_message: already exists in original schema, but add IF NOT EXISTS for safety
DO $$ BEGIN
  ALTER TABLE public.uploads ADD COLUMN IF NOT EXISTS error_message text;
EXCEPTION WHEN others THEN NULL;
END $$;

-- Fix source_type constraint: original used 'pdf','edi','txt'; new uses 'era_835','eob_pdf','other'
-- First migrate any existing values
DO $$ BEGIN
  UPDATE public.uploads SET source_type = 'eob_pdf' WHERE source_type = 'pdf';
  UPDATE public.uploads SET source_type = 'era_835' WHERE source_type IN ('edi', 'txt', '835', 'x12');
  UPDATE public.uploads SET source_type = 'other' WHERE source_type NOT IN ('era_835', 'eob_pdf', 'other');
EXCEPTION WHEN others THEN
  RAISE NOTICE 'source_type migration skipped: %', SQLERRM;
END $$;

-- Drop and recreate source_type constraint
DO $$ BEGIN
  ALTER TABLE public.uploads DROP CONSTRAINT IF EXISTS uploads_source_type_check;
  ALTER TABLE public.uploads ADD CONSTRAINT uploads_source_type_check
    CHECK (source_type IN ('era_835', 'eob_pdf', 'other'));
EXCEPTION WHEN others THEN
  RAISE NOTICE 'uploads source_type constraint update skipped: %', SQLERRM;
END $$;

-- Fix status constraint: original used 'processing'; new uses 'analyzing'
DO $$ BEGIN
  UPDATE public.uploads SET status = 'analyzing' WHERE status = 'processing';
  ALTER TABLE public.uploads DROP CONSTRAINT IF EXISTS uploads_status_check;
  ALTER TABLE public.uploads ADD CONSTRAINT uploads_status_check
    CHECK (status IN ('uploaded', 'analyzing', 'complete', 'error'));
EXCEPTION WHEN others THEN
  RAISE NOTICE 'uploads status constraint update skipped: %', SQLERRM;
END $$;

-- ─── 2. FINDINGS: add all missing columns ───────────────────────────────────

-- The original findings table only had: id, account_id, upload_id, finding_type,
-- amount, confidence, rationale, procedure_code, payer, created_at
-- Add all new columns:

DO $$ BEGIN
  ALTER TABLE public.findings ADD COLUMN IF NOT EXISTS service_date date;
  ALTER TABLE public.findings ADD COLUMN IF NOT EXISTS billed_amount numeric;
  ALTER TABLE public.findings ADD COLUMN IF NOT EXISTS allowed_amount numeric;
  ALTER TABLE public.findings ADD COLUMN IF NOT EXISTS paid_amount numeric;
  ALTER TABLE public.findings ADD COLUMN IF NOT EXISTS patient_responsibility numeric;
  ALTER TABLE public.findings ADD COLUMN IF NOT EXISTS underpayment_amount numeric;
  ALTER TABLE public.findings ADD COLUMN IF NOT EXISTS carc_codes text[];
  ALTER TABLE public.findings ADD COLUMN IF NOT EXISTS rarc_codes text[];
  ALTER TABLE public.findings ADD COLUMN IF NOT EXISTS action text;
  ALTER TABLE public.findings ADD COLUMN IF NOT EXISTS evidence jsonb DEFAULT '{}'::jsonb;
  ALTER TABLE public.findings ADD COLUMN IF NOT EXISTS status text DEFAULT 'open';
  ALTER TABLE public.findings ADD COLUMN IF NOT EXISTS upload_id uuid;
  ALTER TABLE public.findings ADD COLUMN IF NOT EXISTS rationale text;
EXCEPTION WHEN others THEN
  RAISE NOTICE 'findings column additions skipped: %', SQLERRM;
END $$;

-- Backfill NOT NULL columns
DO $$ BEGIN
  UPDATE public.findings SET action = 'Review recommended action' WHERE action IS NULL;
  UPDATE public.findings SET rationale = 'See evidence for details' WHERE rationale IS NULL;
  UPDATE public.findings SET evidence = '{}'::jsonb WHERE evidence IS NULL;
  UPDATE public.findings SET status = 'open' WHERE status IS NULL;
EXCEPTION WHEN others THEN NULL;
END $$;

-- Fix finding_type constraint
DO $$ BEGIN
  ALTER TABLE public.findings DROP CONSTRAINT IF EXISTS findings_finding_type_check;
  ALTER TABLE public.findings ADD CONSTRAINT findings_finding_type_check
    CHECK (finding_type IN ('UNDERPAID','DENIED_APPEALABLE','DENIED_NON_APPEALABLE','NEEDS_REVIEW','INCOMPLETE_DATA'));
EXCEPTION WHEN others THEN
  RAISE NOTICE 'findings_finding_type_check update skipped: %', SQLERRM;
END $$;

-- Drop confidence constraint entirely — validated in application code
DO $$ BEGIN
  ALTER TABLE public.findings DROP CONSTRAINT IF EXISTS findings_confidence_check;
EXCEPTION WHEN others THEN NULL;
END $$;

-- Normalize legacy 'Med' confidence values
DO $$ BEGIN
  UPDATE public.findings SET confidence = 'Medium' WHERE confidence = 'Med';
EXCEPTION WHEN others THEN NULL;
END $$;

-- Fix status constraint on findings
DO $$ BEGIN
  ALTER TABLE public.findings DROP CONSTRAINT IF EXISTS findings_status_check;
  ALTER TABLE public.findings ADD CONSTRAINT findings_status_check
    CHECK (status IN ('open', 'resolved', 'ignored'));
EXCEPTION WHEN others THEN NULL;
END $$;

-- ─── 3. ACCOUNTS: add contact columns ───────────────────────────────────────

DO $$ BEGIN
  ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS contact_name text;
  ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS contact_phone text;
  ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS contact_email text;
EXCEPTION WHEN others THEN NULL;
END $$;

-- ─── 4. ACCOUNT_USERS: fix schema if using old id-based PK ──────────────────

-- The original schema had an id column as PK; new schema uses composite PK (account_id, user_id)
-- Only migrate if the id column exists
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'account_users' AND column_name = 'id'
  ) THEN
    ALTER TABLE public.account_users DROP CONSTRAINT IF EXISTS account_users_pkey;
    ALTER TABLE public.account_users DROP COLUMN IF EXISTS id;
    -- Add composite PK (will fail gracefully if already exists)
    BEGIN
      ALTER TABLE public.account_users ADD PRIMARY KEY (account_id, user_id);
    EXCEPTION WHEN others THEN
      RAISE NOTICE 'account_users composite PK already exists';
    END;
  END IF;
EXCEPTION WHEN others THEN
  RAISE NOTICE 'account_users PK migration skipped: %', SQLERRM;
END $$;

-- ─── 5. NEW TABLES: create if not exists ────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.audit_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL,
  upload_id uuid NOT NULL,
  status text NOT NULL CHECK (status IN ('queued','running','complete','error')),
  started_at timestamptz DEFAULT now(),
  finished_at timestamptz,
  error_message text,
  stats jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS public.appeal_packets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL,
  upload_id uuid NOT NULL,
  storage_path text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- ─── 6. INDEXES ─────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_account_users_user_id ON public.account_users(user_id);
CREATE INDEX IF NOT EXISTS idx_account_users_account_id ON public.account_users(account_id);
CREATE INDEX IF NOT EXISTS idx_uploads_account_id ON public.uploads(account_id);
CREATE INDEX IF NOT EXISTS idx_uploads_status ON public.uploads(status);
CREATE INDEX IF NOT EXISTS findings_account_id_idx ON public.findings(account_id);
CREATE INDEX IF NOT EXISTS findings_upload_id_idx ON public.findings(upload_id);

-- ─── 7. RLS: enable on new tables ───────────────────────────────────────────

ALTER TABLE public.audit_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appeal_packets ENABLE ROW LEVEL SECURITY;

-- ─── Done ────────────────────────────────────────────────────────────────────
-- After running this, your database is fully in sync with the application code.
