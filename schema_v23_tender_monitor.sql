-- v23: 投標工具 / 每日公告關鍵字監測

create table if not exists tender_projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  source_url text not null,
  page_limit integer not null default 2,
  is_active boolean not null default true,
  notify_email text,
  notes text,
  sort_order integer not null default 0,
  last_scanned_at timestamptz,
  last_scan_status text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists tender_keywords (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references tender_projects(id) on delete cascade,
  keyword text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(project_id, keyword)
);

create table if not exists tender_results (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references tender_projects(id) on delete cascade,
  title text not null,
  url text not null,
  published_at date,
  matched_keywords text[] not null default '{}',
  snippet text,
  status text not null default '未讀' check (status in ('未讀','評估中','已追蹤','已排除')),
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(project_id, url)
);

create table if not exists tender_scan_runs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references tender_projects(id) on delete cascade,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'running' check (status in ('running','success','failed')),
  checked_pages integer not null default 0,
  found_count integer not null default 0,
  new_count integer not null default 0,
  error_message text
);

create index if not exists idx_tender_projects_sort on tender_projects(sort_order, created_at);
create index if not exists idx_tender_keywords_project on tender_keywords(project_id, is_active);
create index if not exists idx_tender_results_project_seen on tender_results(project_id, last_seen_at desc);
create index if not exists idx_tender_scan_runs_project_started on tender_scan_runs(project_id, started_at desc);

alter table tender_projects enable row level security;
alter table tender_keywords enable row level security;
alter table tender_results enable row level security;
alter table tender_scan_runs enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where tablename = 'tender_projects' and policyname = 'tender_projects_authenticated_all'
  ) then
    create policy tender_projects_authenticated_all on tender_projects
      for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
  end if;
  if not exists (
    select 1 from pg_policies where tablename = 'tender_keywords' and policyname = 'tender_keywords_authenticated_all'
  ) then
    create policy tender_keywords_authenticated_all on tender_keywords
      for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
  end if;
  if not exists (
    select 1 from pg_policies where tablename = 'tender_results' and policyname = 'tender_results_authenticated_all'
  ) then
    create policy tender_results_authenticated_all on tender_results
      for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
  end if;
  if not exists (
    select 1 from pg_policies where tablename = 'tender_scan_runs' and policyname = 'tender_scan_runs_authenticated_all'
  ) then
    create policy tender_scan_runs_authenticated_all on tender_scan_runs
      for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
  end if;
end $$;

with default_project as (
  insert into tender_projects (name, source_url, page_limit, is_active, notify_email, notes, sort_order)
  select
    '耕莘醫院招標公告',
    'https://www.cth.org.tw/?aid=803&pid=0&page_name=list&type=1&pageNo=1',
    2,
    true,
    'info@mcttw.com.tw',
    '每日 08:00 監測招標公告與採購訊息。',
    10
  where not exists (
    select 1 from tender_projects
    where source_url = 'https://www.cth.org.tw/?aid=803&pid=0&page_name=list&type=1&pageNo=1'
  )
  returning id
),
project_row as (
  select id
  from (
    select id from default_project
    union all
    select id from tender_projects
    where source_url = 'https://www.cth.org.tw/?aid=803&pid=0&page_name=list&type=1&pageNo=1'
  ) rows
  order by id
  limit 1
)
insert into tender_keywords (project_id, keyword)
select project_row.id, keyword
from project_row
cross join unnest(array['冷氣','冰水主機','空調','通風設備','磁浮','中央空調']) as keyword
on conflict(project_id, keyword) do nothing;
