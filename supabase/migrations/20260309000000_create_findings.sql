-- =============================================================================
-- Revenue Recovery Engine — Idempotent Schema Migration
-- Safe to re-run: uses IF NOT EXISTS, DO blocks, and ALTER ADD IF NOT EXISTS
-- =============================================================================

-- ─── 1. ACCOUNTS ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ─── 2. ACCOUNT_USERS ───────────────────────────────────────────────────────
-- Spec: composite PK (account_id, user_id), no surrogate id
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='account_users') THEN
    CREATE TABLE public.account_users (
      account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
      user_id uuid NOT NULL,
      role text NOT NULL DEFAULT 'member' CHECK (role IN ('member','admin')),
      created_at timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY (account_id, user_id)
    );
  END IF;
END $$;

-- If table exists with old schema (id column as PK), migrate it
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='account_users' AND column_name='id'
  ) THEN
    -- Drop the old primary key and id column, add composite PK
    ALTER TABLE public.account_users DROP CONSTRAINT IF EXISTS account_users_pkey;
    ALTER TABLE public.account_users DROP COLUMN IF EXISTS id;
    -- Add composite PK if not exists
    ALTER TABLE public.account_users ADD PRIMARY KEY (account_id, user_id);
  END IF;
EXCEPTION WHEN others THEN
  RAISE NOTICE 'account_users PK migration skipped: %', SQLERRM;
END $$;

-- Ensure role constraint exists
DO $$ BEGIN
  ALTER TABLE public.account_users DROP CONSTRAINT IF EXISTS account_users_role_check;
  ALTER TABLE public.account_users ADD CONSTRAINT account_users_role_check CHECK (role IN ('member','admin'));
EXCEPTION WHEN others THEN NULL;
END $$;

-- ─── 3. UPLOADS ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.uploads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL,
  filename text NOT NULL,
  source_type text NOT NULL CHECK (source_type IN ('era_835','eob_pdf','other')),
  status text NOT NULL DEFAULT 'uploaded' CHECK (status IN ('uploaded','analyzing','complete','error')),
  error_message text,
  storage_path text NOT NULL,
  content_hash text,
  analyzed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Add missing columns if table already exists
DO $$ BEGIN
  ALTER TABLE public.uploads ADD COLUMN IF NOT EXISTS content_hash text;
  ALTER TABLE public.uploads ADD COLUMN IF NOT EXISTS analyzed_at timestamptz;
  ALTER TABLE public.uploads ADD COLUMN IF NOT EXISTS error_message text;
EXCEPTION WHEN others THEN NULL;
END $$;

-- Fix source_type constraint to match spec
DO $$ BEGIN
  ALTER TABLE public.uploads DROP CONSTRAINT IF EXISTS uploads_source_type_check;
  ALTER TABLE public.uploads ADD CONSTRAINT uploads_source_type_check CHECK (source_type IN ('era_835','eob_pdf','other'));
EXCEPTION WHEN others THEN NULL;
END $$;

-- Fix status constraint: spec uses 'analyzing' not 'processing'
DO $$ BEGIN
  -- Update any existing 'processing' rows
  UPDATE public.uploads SET status = 'analyzing' WHERE status = 'processing';
  ALTER TABLE public.uploads DROP CONSTRAINT IF EXISTS uploads_status_check;
  ALTER TABLE public.uploads ADD CONSTRAINT uploads_status_check CHECK (status IN ('uploaded','analyzing','complete','error'));
EXCEPTION WHEN others THEN NULL;
END $$;

-- ─── 4. FINDINGS ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.findings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL,
  upload_id uuid NOT NULL REFERENCES public.uploads(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  payer text,
  service_date date,
  procedure_code text,
  billed_amount numeric,
  allowed_amount numeric,
  paid_amount numeric,
  patient_responsibility numeric,
  underpayment_amount numeric,
  carc_codes text[],
  rarc_codes text[],
  finding_type text NOT NULL CHECK (finding_type IN ('UNDERPAID','DENIED_APPEALABLE','DENIED_NON_APPEALABLE','NEEDS_REVIEW','INCOMPLETE_DATA')),
  confidence text NOT NULL CHECK (confidence IN ('High','Medium','Low')),
  action text NOT NULL DEFAULT 'Review recommended action',
  rationale text NOT NULL,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','resolved','ignored'))
);

-- Add missing columns to existing findings table
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
EXCEPTION WHEN others THEN NULL;
END $$;

-- Ensure action is NOT NULL (backfill any existing nulls first)
DO $$ BEGIN
  UPDATE public.findings SET action = 'Review recommended action' WHERE action IS NULL;
  ALTER TABLE public.findings ALTER COLUMN action SET NOT NULL;
  ALTER TABLE public.findings ALTER COLUMN action SET DEFAULT 'Review recommended action';
EXCEPTION WHEN others THEN NULL;
END $$;

-- Ensure rationale is NOT NULL
DO $$ BEGIN
  UPDATE public.findings SET rationale = 'See evidence for details' WHERE rationale IS NULL;
  ALTER TABLE public.findings ALTER COLUMN rationale SET NOT NULL;
EXCEPTION WHEN others THEN NULL;
END $$;

-- Ensure evidence is NOT NULL
DO $$ BEGIN
  UPDATE public.findings SET evidence = '{}'::jsonb WHERE evidence IS NULL;
  ALTER TABLE public.findings ALTER COLUMN evidence SET NOT NULL;
  ALTER TABLE public.findings ALTER COLUMN evidence SET DEFAULT '{}'::jsonb;
EXCEPTION WHEN others THEN NULL;
END $$;

-- Fix finding_type constraint
DO $$ BEGIN
  ALTER TABLE public.findings DROP CONSTRAINT IF EXISTS findings_finding_type_check;
  ALTER TABLE public.findings ADD CONSTRAINT findings_finding_type_check CHECK (finding_type IN ('UNDERPAID','DENIED_APPEALABLE','DENIED_NON_APPEALABLE','NEEDS_REVIEW','INCOMPLETE_DATA'));
EXCEPTION WHEN others THEN NULL;
END $$;

-- Fix confidence constraint (spec uses 'Medium' not 'Med')
DO $$ BEGIN
  UPDATE public.findings SET confidence = 'Medium' WHERE confidence = 'Med';
  ALTER TABLE public.findings DROP CONSTRAINT IF EXISTS findings_confidence_check;
  ALTER TABLE public.findings ADD CONSTRAINT findings_confidence_check CHECK (confidence IN ('High','Medium','Low'));
EXCEPTION WHEN others THEN NULL;
END $$;

-- Fix status constraint on findings
DO $$ BEGIN
  ALTER TABLE public.findings DROP CONSTRAINT IF EXISTS findings_status_check;
  ALTER TABLE public.findings ADD CONSTRAINT findings_status_check CHECK (status IN ('open','resolved','ignored'));
EXCEPTION WHEN others THEN NULL;
END $$;

-- Drop legacy 'amount' column if it exists (replaced by specific amount columns)
DO $$ BEGIN
  ALTER TABLE public.findings DROP COLUMN IF EXISTS amount;
EXCEPTION WHEN others THEN NULL;
END $$;

-- ─── 5. AUDIT_RUNS ─────────────────────────────────────────────────────────
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

-- ─── 6. APPEAL_PACKETS ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.appeal_packets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL,
  upload_id uuid NOT NULL,
  storage_path text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- ─── 7. INDEXES ─────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_account_users_user_id ON public.account_users(user_id);
CREATE INDEX IF NOT EXISTS idx_account_users_account_id ON public.account_users(account_id);
CREATE INDEX IF NOT EXISTS idx_uploads_account_id ON public.uploads(account_id);
CREATE INDEX IF NOT EXISTS idx_uploads_status ON public.uploads(status);
CREATE INDEX IF NOT EXISTS findings_account_id_idx ON public.findings(account_id);
CREATE INDEX IF NOT EXISTS findings_upload_id_idx ON public.findings(upload_id);
CREATE INDEX IF NOT EXISTS idx_audit_runs_upload_id ON public.audit_runs(upload_id);
CREATE INDEX IF NOT EXISTS idx_appeal_packets_upload_id ON public.appeal_packets(upload_id);

-- ─── 8. ENABLE RLS ──────────────────────────────────────────────────────────
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.findings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appeal_packets ENABLE ROW LEVEL SECURITY;

-- ─── 9. RLS POLICIES (idempotent: check pg_policies before creating) ────────

-- Helper: macro for "user belongs to account"
-- account_id IN (SELECT account_id FROM account_users WHERE user_id = auth.uid())

-- accounts: SELECT
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='accounts' AND policyname='rls_accounts_select') THEN
    CREATE POLICY rls_accounts_select ON public.accounts FOR SELECT TO authenticated
      USING (id IN (SELECT account_id FROM public.account_users WHERE user_id = auth.uid()));
  END IF;
END $$;

-- account_users: SELECT
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='account_users' AND policyname='rls_account_users_select') THEN
    CREATE POLICY rls_account_users_select ON public.account_users FOR SELECT TO authenticated
      USING (account_id IN (SELECT account_id FROM public.account_users WHERE user_id = auth.uid()));
  END IF;
END $$;

-- account_users: INSERT (admins only)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='account_users' AND policyname='rls_account_users_insert') THEN
    CREATE POLICY rls_account_users_insert ON public.account_users FOR INSERT TO authenticated
      WITH CHECK (account_id IN (
        SELECT account_id FROM public.account_users WHERE user_id = auth.uid() AND role = 'admin'
      ));
  END IF;
END $$;

-- uploads: SELECT
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='uploads' AND policyname='rls_uploads_select') THEN
    CREATE POLICY rls_uploads_select ON public.uploads FOR SELECT TO authenticated
      USING (account_id IN (SELECT account_id FROM public.account_users WHERE user_id = auth.uid()));
  END IF;
END $$;

-- uploads: INSERT
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='uploads' AND policyname='rls_uploads_insert') THEN
    CREATE POLICY rls_uploads_insert ON public.uploads FOR INSERT TO authenticated
      WITH CHECK (account_id IN (SELECT account_id FROM public.account_users WHERE user_id = auth.uid()));
  END IF;
END $$;

-- uploads: UPDATE
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='uploads' AND policyname='rls_uploads_update') THEN
    CREATE POLICY rls_uploads_update ON public.uploads FOR UPDATE TO authenticated
      USING (account_id IN (SELECT account_id FROM public.account_users WHERE user_id = auth.uid()));
  END IF;
END $$;

-- findings: SELECT
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='findings' AND policyname='rls_findings_select') THEN
    CREATE POLICY rls_findings_select ON public.findings FOR SELECT TO authenticated
      USING (account_id IN (SELECT account_id FROM public.account_users WHERE user_id = auth.uid()));
  END IF;
END $$;

-- findings: INSERT
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='findings' AND policyname='rls_findings_insert') THEN
    CREATE POLICY rls_findings_insert ON public.findings FOR INSERT TO authenticated
      WITH CHECK (account_id IN (SELECT account_id FROM public.account_users WHERE user_id = auth.uid()));
  END IF;
END $$;

-- findings: UPDATE
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='findings' AND policyname='rls_findings_update') THEN
    CREATE POLICY rls_findings_update ON public.findings FOR UPDATE TO authenticated
      USING (account_id IN (SELECT account_id FROM public.account_users WHERE user_id = auth.uid()));
  END IF;
END $$;

-- findings: DELETE (for idempotent re-analysis)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='findings' AND policyname='rls_findings_delete') THEN
    CREATE POLICY rls_findings_delete ON public.findings FOR DELETE TO authenticated
      USING (account_id IN (SELECT account_id FROM public.account_users WHERE user_id = auth.uid()));
  END IF;
END $$;

-- audit_runs: SELECT
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='audit_runs' AND policyname='rls_audit_runs_select') THEN
    CREATE POLICY rls_audit_runs_select ON public.audit_runs FOR SELECT TO authenticated
      USING (account_id IN (SELECT account_id FROM public.account_users WHERE user_id = auth.uid()));
  END IF;
END $$;

-- audit_runs: INSERT
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='audit_runs' AND policyname='rls_audit_runs_insert') THEN
    CREATE POLICY rls_audit_runs_insert ON public.audit_runs FOR INSERT TO authenticated
      WITH CHECK (account_id IN (SELECT account_id FROM public.account_users WHERE user_id = auth.uid()));
  END IF;
END $$;

-- audit_runs: UPDATE
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='audit_runs' AND policyname='rls_audit_runs_update') THEN
    CREATE POLICY rls_audit_runs_update ON public.audit_runs FOR UPDATE TO authenticated
      USING (account_id IN (SELECT account_id FROM public.account_users WHERE user_id = auth.uid()));
  END IF;
END $$;

-- appeal_packets: SELECT
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='appeal_packets' AND policyname='rls_appeal_packets_select') THEN
    CREATE POLICY rls_appeal_packets_select ON public.appeal_packets FOR SELECT TO authenticated
      USING (account_id IN (SELECT account_id FROM public.account_users WHERE user_id = auth.uid()));
  END IF;
END $$;

-- appeal_packets: INSERT
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='appeal_packets' AND policyname='rls_appeal_packets_insert') THEN
    CREATE POLICY rls_appeal_packets_insert ON public.appeal_packets FOR INSERT TO authenticated
      WITH CHECK (account_id IN (SELECT account_id FROM public.account_users WHERE user_id = auth.uid()));
  END IF;
END $$;

-- ─── 10. DROP LEGACY POLICIES (from old schema) ────────────────────────────
-- Clean up old policy names that conflict
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can view their accounts" ON public.accounts;
  DROP POLICY IF EXISTS "Users can view account memberships" ON public.account_users;
  DROP POLICY IF EXISTS "Users can view uploads for their accounts" ON public.uploads;
  DROP POLICY IF EXISTS "Users can insert uploads for their accounts" ON public.uploads;
  DROP POLICY IF EXISTS "Users can update uploads for their accounts" ON public.uploads;
  DROP POLICY IF EXISTS "Users can view own account findings" ON public.findings;
  DROP POLICY IF EXISTS "Users can insert own account findings" ON public.findings;
EXCEPTION WHEN others THEN NULL;
END $$;

-- ─── DONE ───────────────────────────────────────────────────────────────────
