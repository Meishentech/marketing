create table if not exists marketing_campaign_risks (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references marketing_campaigns(id) on delete cascade,
  risk_type text not null default '其他' check (risk_type in ('預算','時程','廠商','原廠','素材','業務配合','補助請款','其他')),
  title text not null,
  description text,
  impact_level text not null default '中' check (impact_level in ('低','中','高')),
  owner text,
  due_date date,
  status text not null default '待處理' check (status in ('待處理','處理中','已解決','暫緩')),
  show_on_dashboard boolean not null default true,
  resolution_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table marketing_campaign_risks enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'marketing_campaign_risks'
      and policyname = 'marketing_campaign_risks_authenticated_all'
  ) then
    create policy marketing_campaign_risks_authenticated_all
      on marketing_campaign_risks
      for all
      to authenticated
      using (true)
      with check (true);
  end if;
end $$;

create index if not exists idx_marketing_campaign_risks_campaign_id
  on marketing_campaign_risks(campaign_id);

create index if not exists idx_marketing_campaign_risks_dashboard
  on marketing_campaign_risks(show_on_dashboard, status, due_date);
