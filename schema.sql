-- 美昇舒適科技行銷平台 · Supabase schema
-- 建立好 Supabase project 後，在 SQL editor 執行本檔案

create extension if not exists "pgcrypto";

create table if not exists marketing_campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  budget numeric,
  actual_spend numeric,
  partner text,
  purpose text,
  status text not null default '估價' check (status in ('估價','進行中','結案')),
  vendor text,
  planned_start date,
  planned_end date,
  actual_start date,
  actual_end date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists marketing_content_drafts (
  id uuid primary key default gen_random_uuid(),
  week_start date not null,
  campaign_id uuid references marketing_campaigns(id) on delete set null,
  title text,
  content text not null,
  source_note text,
  status text not null default '草稿' check (status in ('草稿','已採用','已發布')),
  created_at timestamptz not null default now()
);

alter table marketing_campaigns enable row level security;
alter table marketing_content_drafts enable row level security;

create policy "authenticated full access" on marketing_campaigns
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "authenticated full access" on marketing_content_drafts
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
