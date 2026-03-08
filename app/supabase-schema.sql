-- Revenue Leak Finder Database Schema
-- Run this in Supabase SQL Editor

-- Accounts table
CREATE TABLE IF NOT EXISTS public.accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Account users junction table
CREATE TABLE IF NOT EXISTS public.account_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(account_id, user_id)
);

-- Uploads table
CREATE TABLE IF NOT EXISTS public.uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  mime_type TEXT,
  size_bytes BIGINT,
  source_type TEXT, -- 'pdf', 'edi', 'txt' based on extension
  status TEXT DEFAULT 'uploaded', -- uploaded, processing, complete, error
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_account_users_user_id ON public.account_users(user_id);
CREATE INDEX IF NOT EXISTS idx_account_users_account_id ON public.account_users(account_id);
CREATE INDEX IF NOT EXISTS idx_uploads_account_id ON public.uploads(account_id);
CREATE INDEX IF NOT EXISTS idx_uploads_status ON public.uploads(status);
CREATE INDEX IF NOT EXISTS idx_uploads_created_at ON public.uploads(created_at DESC);

-- Enable RLS (Row Level Security)
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.uploads ENABLE ROW LEVEL SECURITY;

-- RLS Policies (basic for now, can be tightened later)
-- Users can see accounts they belong to
CREATE POLICY "Users can view their accounts"
  ON public.accounts FOR SELECT
  USING (
    id IN (
      SELECT account_id FROM public.account_users
      WHERE user_id = auth.uid()
    )
  );

-- Users can view account_users for their accounts
CREATE POLICY "Users can view account memberships"
  ON public.account_users FOR SELECT
  USING (
    account_id IN (
      SELECT account_id FROM public.account_users
      WHERE user_id = auth.uid()
    )
  );

-- Users can view/insert/update uploads for their accounts
CREATE POLICY "Users can view uploads for their accounts"
  ON public.uploads FOR SELECT
  USING (
    account_id IN (
      SELECT account_id FROM public.account_users
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert uploads for their accounts"
  ON public.uploads FOR INSERT
  WITH CHECK (
    account_id IN (
      SELECT account_id FROM public.account_users
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update uploads for their accounts"
  ON public.uploads FOR UPDATE
  USING (
    account_id IN (
      SELECT account_id FROM public.account_users
      WHERE user_id = auth.uid()
    )
  );

-- Seed data: Create a default account for testing
-- Replace with your actual user email/ID after running
INSERT INTO public.accounts (name) VALUES ('Demo Practice');

-- After creating the account, link your user to it:
-- INSERT INTO public.account_users (account_id, user_id, role)
-- VALUES (
--   (SELECT id FROM public.accounts WHERE name = 'Demo Practice'),
--   'YOUR_USER_ID_FROM_AUTH_USERS',
--   'admin'
-- );
