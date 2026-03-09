-- =============================================================================
-- Schema Sanity Check — Run in Supabase SQL Editor to verify schema alignment
-- =============================================================================

-- 1. Check all required tables exist
SELECT 'TABLE CHECK' AS check_type,
  table_name,
  CASE WHEN table_name IS NOT NULL THEN 'EXISTS' ELSE 'MISSING' END AS status
FROM (
  VALUES ('accounts'),('account_users'),('uploads'),('findings'),('audit_runs'),('appeal_packets')
) AS expected(table_name)
LEFT JOIN information_schema.tables t
  ON t.table_schema = 'public' AND t.table_name = expected.table_name;

-- 2. Check findings columns match spec
SELECT 'FINDINGS COLUMNS' AS check_type,
  expected.col AS expected_column,
  CASE WHEN c.column_name IS NOT NULL THEN 'EXISTS' ELSE 'MISSING' END AS status,
  c.data_type,
  c.is_nullable
FROM (
  VALUES
    ('id'),('account_id'),('upload_id'),('created_at'),('payer'),('service_date'),
    ('procedure_code'),('billed_amount'),('allowed_amount'),('paid_amount'),
    ('patient_responsibility'),('underpayment_amount'),('carc_codes'),('rarc_codes'),
    ('finding_type'),('confidence'),('action'),('rationale'),('evidence'),('status')
) AS expected(col)
LEFT JOIN information_schema.columns c
  ON c.table_schema = 'public' AND c.table_name = 'findings' AND c.column_name = expected.col;

-- 3. Check uploads columns match spec
SELECT 'UPLOADS COLUMNS' AS check_type,
  expected.col AS expected_column,
  CASE WHEN c.column_name IS NOT NULL THEN 'EXISTS' ELSE 'MISSING' END AS status,
  c.data_type,
  c.is_nullable
FROM (
  VALUES
    ('id'),('account_id'),('filename'),('source_type'),('status'),
    ('error_message'),('storage_path'),('content_hash'),('analyzed_at'),('created_at')
) AS expected(col)
LEFT JOIN information_schema.columns c
  ON c.table_schema = 'public' AND c.table_name = 'uploads' AND c.column_name = expected.col;

-- 4. Check RLS is enabled
SELECT 'RLS CHECK' AS check_type,
  c.relname AS table_name,
  CASE WHEN c.relrowsecurity THEN 'ENABLED' ELSE 'DISABLED' END AS rls_status
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN ('accounts','account_users','uploads','findings','audit_runs','appeal_packets');

-- 5. List all RLS policies
SELECT 'POLICIES' AS check_type,
  tablename,
  policyname,
  cmd AS operation
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 6. Check constraints on findings
SELECT 'CONSTRAINTS' AS check_type,
  tc.table_name,
  tc.constraint_name,
  tc.constraint_type,
  cc.check_clause
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.check_constraints cc
  ON cc.constraint_name = tc.constraint_name
WHERE tc.table_schema = 'public'
  AND tc.table_name IN ('findings','uploads','account_users')
ORDER BY tc.table_name, tc.constraint_name;
