-- =============================================================================
-- MedicalRouter — Service Agreements Schema
-- Creates: agreements, agreement_audit_log
-- Safe to re-run: uses IF NOT EXISTS and DO blocks
-- =============================================================================

-- ─── 1. AGREEMENTS ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.agreements (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id          uuid        NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  client_id           uuid        NOT NULL,                          -- auth.users.id of the signer
  full_name           text        NOT NULL,
  title               text        NOT NULL,
  practice_name       text        NOT NULL,
  agreed_at           timestamptz NOT NULL DEFAULT now(),
  ip_address          text,
  signature_image     text        NOT NULL,                          -- base64 PNG
  agreement_version   text        NOT NULL DEFAULT 'v1.0',
  pdf_sent            boolean     NOT NULL DEFAULT false,
  created_at          timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS agreements_account_id_idx        ON public.agreements (account_id);
CREATE INDEX IF NOT EXISTS agreements_client_id_idx         ON public.agreements (client_id);
CREATE INDEX IF NOT EXISTS agreements_agreed_at_idx         ON public.agreements (agreed_at);
CREATE INDEX IF NOT EXISTS agreements_agreement_version_idx ON public.agreements (agreement_version);

-- RLS
ALTER TABLE public.agreements ENABLE ROW LEVEL SECURITY;

-- Clients can only see their own agreement
CREATE POLICY IF NOT EXISTS "agreements_select_own"
  ON public.agreements FOR SELECT
  USING (client_id = auth.uid());

-- Clients can insert their own agreement
CREATE POLICY IF NOT EXISTS "agreements_insert_own"
  ON public.agreements FOR INSERT
  WITH CHECK (client_id = auth.uid());

-- Service role can do everything (used by API routes)
-- (service role bypasses RLS by default)


-- ─── 2. AGREEMENT_AUDIT_LOG ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.agreement_audit_log (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  agreement_id  uuid        NOT NULL REFERENCES public.agreements(id) ON DELETE CASCADE,
  admin_id      uuid        NOT NULL,                                -- auth.users.id of the admin
  action        text        NOT NULL DEFAULT 'view',                 -- 'view' | 'download'
  viewed_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_log_agreement_id_idx ON public.agreement_audit_log (agreement_id);
CREATE INDEX IF NOT EXISTS audit_log_admin_id_idx     ON public.agreement_audit_log (admin_id);
CREATE INDEX IF NOT EXISTS audit_log_viewed_at_idx    ON public.agreement_audit_log (viewed_at);

ALTER TABLE public.agreement_audit_log ENABLE ROW LEVEL SECURITY;

-- Admins can insert audit log entries (via service role in API routes)
-- No direct client access needed
