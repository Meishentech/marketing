create table if not exists marketing_campaign_risk_updates (
  id uuid primary key default gen_random_uuid(),
  risk_id uuid not null references marketing_campaign_risks(id) on delete cascade,
  update_note text not null,
  updated_by text,
  update_date date not null default current_date,
  next_followup_date date,
  is_important boolean not null default false,
  created_at timestamptz not null default now()
);

alter table marketing_campaign_risk_updates enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'marketing_campaign_risk_updates'
      and policyname = 'marketing_campaign_risk_updates_authenticated_all'
  ) then
    create policy marketing_campaign_risk_updates_authenticated_all
      on marketing_campaign_risk_updates
      for all
      to authenticated
      using (true)
      with check (true);
  end if;
end $$;

create index if not exists idx_marketing_campaign_risk_updates_risk_id
  on marketing_campaign_risk_updates(risk_id);

create index if not exists idx_marketing_campaign_risk_updates_dates
  on marketing_campaign_risk_updates(update_date desc, next_followup_date);
