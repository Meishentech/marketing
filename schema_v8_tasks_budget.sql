-- 行銷案新增任務／里程碑、預算明細子表 + 美的請款流程欄位（v8 增量，在 Supabase SQL editor 執行）

alter table marketing_campaigns add column if not exists midea_budget_code text;
alter table marketing_campaigns add column if not exists payment_status text;
alter table marketing_campaigns add column if not exists claim_status text;
alter table marketing_campaigns add column if not exists flight_cost numeric;

create table if not exists marketing_campaign_tasks (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references marketing_campaigns(id) on delete cascade,
  seq integer not null default 0,
  task_name text not null,
  planned_start date,
  planned_end date,
  owner text,
  status text not null default '未開始' check (status in ('未開始','進行中','已完成','待確認')),
  completion_pct numeric not null default 0,
  expected_output text,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists marketing_campaign_budget_items (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references marketing_campaigns(id) on delete cascade,
  seq integer not null default 0,
  item_name text not null,
  budget_nature text,
  amount_twd numeric,
  exchange_rate numeric,
  amount_rmb numeric,
  basis_note text,
  quote_status text,
  created_at timestamptz not null default now()
);

alter table marketing_campaign_tasks enable row level security;
alter table marketing_campaign_budget_items enable row level security;

drop policy if exists "authenticated full access" on marketing_campaign_tasks;
create policy "authenticated full access" on marketing_campaign_tasks
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "authenticated full access" on marketing_campaign_budget_items;
create policy "authenticated full access" on marketing_campaign_budget_items
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
