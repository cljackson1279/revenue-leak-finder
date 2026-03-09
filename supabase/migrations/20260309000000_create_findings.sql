-- findings table: stores parsed revenue leak findings per upload
create table if not exists findings (
  id          uuid primary key default gen_random_uuid(),
  account_id  uuid not null,
  upload_id   uuid not null,
  finding_type text not null,
  amount      numeric(10,2) not null,
  confidence  text not null,
  rationale   text,
  procedure_code text,
  payer       text,
  created_at  timestamptz not null default now()
);

alter table findings enable row level security;

create policy "Users can view own account findings"
  on findings for select
  using (
    account_id in (
      select account_id from account_users where user_id = auth.uid()
    )
  );

create policy "Users can insert own account findings"
  on findings for insert
  with check (
    account_id in (
      select account_id from account_users where user_id = auth.uid()
    )
  );

create index if not exists findings_account_id_idx on findings (account_id);
create index if not exists findings_upload_id_idx  on findings (upload_id);
