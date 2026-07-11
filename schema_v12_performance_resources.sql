create table if not exists marketing_campaign_performance (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references marketing_campaigns(id) on delete cascade,
  reach_count integer not null default 0,
  lead_count integer not null default 0,
  inquiry_count integer not null default 0,
  qualified_lead_count integer not null default 0,
  estimated_opportunity_amount numeric not null default 0,
  deal_count integer not null default 0,
  deal_amount numeric not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint marketing_campaign_performance_campaign_unique unique (campaign_id)
);

alter table marketing_campaign_performance enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'marketing_campaign_performance'
      and policyname = 'marketing_campaign_performance_authenticated_all'
  ) then
    create policy marketing_campaign_performance_authenticated_all
      on marketing_campaign_performance
      for all
      to authenticated
      using (true)
      with check (true);
  end if;
end $$;

create index if not exists idx_marketing_campaign_performance_campaign_id
  on marketing_campaign_performance(campaign_id);

create table if not exists marketing_resources (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  resource_type text not null default '其他' check (resource_type in ('簡報','DM','型錄','技術文章','期刊投稿','展場素材','社群文案','圖片影片','案例','其他')),
  product_line text,
  audience text,
  version text,
  resource_url text,
  canva_url text,
  is_external_usable boolean not null default false,
  tags text[] not null default '{}',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table marketing_resources enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'marketing_resources'
      and policyname = 'marketing_resources_authenticated_all'
  ) then
    create policy marketing_resources_authenticated_all
      on marketing_resources
      for all
      to authenticated
      using (true)
      with check (true);
  end if;
end $$;

create index if not exists idx_marketing_resources_type
  on marketing_resources(resource_type);

create index if not exists idx_marketing_resources_tags
  on marketing_resources using gin(tags);
