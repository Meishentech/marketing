-- v17: 公會管理第一階段

create table if not exists associations (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  association_type text not null default '技師公會',
  join_status text not null default '已加入',
  member_no text,
  primary_contact text,
  phone text,
  email text,
  address text,
  website text,
  line_url text,
  internal_owner text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint associations_type_check check (association_type in ('全國聯合會', '地方公會', '技師公會', '其他')),
  constraint associations_join_status_check check (join_status in ('已加入', '待確認', '待續會', '停止'))
);

create table if not exists association_fee_records (
  id uuid primary key default gen_random_uuid(),
  association_id uuid not null references associations(id) on delete cascade,
  year integer not null default extract(year from now())::integer,
  fee_amount numeric,
  payment_status text not null default '未繳',
  payment_date date,
  due_date date,
  receipt_status text,
  receipt_attachment text,
  renewal_reminder_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint association_fee_status_check check (payment_status in ('未繳', '已繳', '待確認', '不適用'))
);

create table if not exists association_benefits (
  id uuid primary key default gen_random_uuid(),
  association_id uuid not null references associations(id) on delete cascade,
  benefit_name text not null,
  benefit_type text not null default '其他',
  description text,
  usage_status text not null default '未使用',
  valid_until date,
  owner text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint association_benefit_type_check check (benefit_type in ('期刊曝光', '活動參與', '協辦活動', '會員名錄', '課程講座', '其他')),
  constraint association_benefit_status_check check (usage_status in ('未使用', '準備中', '已使用', '不適用'))
);

create table if not exists association_publication_schedules (
  id uuid primary key default gen_random_uuid(),
  association_id uuid not null references associations(id) on delete cascade,
  publication_name text not null,
  publish_date date,
  deadline_date date,
  ad_spec text,
  topic text,
  required_materials text[],
  material_status text not null default '未開始',
  owner text,
  submission_date date,
  result_notes text,
  attachment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint association_publication_status_check check (material_status in ('未開始', '準備中', '已送審', '已送件', '已刊登'))
);

create table if not exists association_events (
  id uuid primary key default gen_random_uuid(),
  association_id uuid not null references associations(id) on delete cascade,
  event_name text not null,
  event_type text not null default '其他',
  event_date date,
  location text,
  organizer text,
  meisun_role text,
  budget numeric,
  actual_spend numeric,
  required_materials text[],
  event_status text not null default '待確認',
  owner text,
  result_notes text,
  attachment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint association_event_type_check check (event_type in ('會員大會', '協辦活動', '技術講座', '展覽', '餐會', '其他')),
  constraint association_event_role_check check (meisun_role is null or meisun_role in ('會員參與', '協辦', '贊助', '講師', '展示')),
  constraint association_event_status_check check (event_status in ('待確認', '準備中', '已完成', '取消'))
);

alter table associations enable row level security;
alter table association_fee_records enable row level security;
alter table association_benefits enable row level security;
alter table association_publication_schedules enable row level security;
alter table association_events enable row level security;

grant select, insert, update, delete on associations to authenticated;
grant select, insert, update, delete on association_fee_records to authenticated;
grant select, insert, update, delete on association_benefits to authenticated;
grant select, insert, update, delete on association_publication_schedules to authenticated;
grant select, insert, update, delete on association_events to authenticated;

drop policy if exists "authenticated manage associations" on associations;
create policy "authenticated manage associations"
  on associations for all to authenticated
  using (true)
  with check (true);

drop policy if exists "authenticated manage association fee records" on association_fee_records;
create policy "authenticated manage association fee records"
  on association_fee_records for all to authenticated
  using (true)
  with check (true);

drop policy if exists "authenticated manage association benefits" on association_benefits;
create policy "authenticated manage association benefits"
  on association_benefits for all to authenticated
  using (true)
  with check (true);

drop policy if exists "authenticated manage association publication schedules" on association_publication_schedules;
create policy "authenticated manage association publication schedules"
  on association_publication_schedules for all to authenticated
  using (true)
  with check (true);

drop policy if exists "authenticated manage association events" on association_events;
create policy "authenticated manage association events"
  on association_events for all to authenticated
  using (true)
  with check (true);

create index if not exists idx_associations_status on associations(join_status, updated_at desc);
create index if not exists idx_association_fees_assoc_due on association_fee_records(association_id, due_date);
create index if not exists idx_association_benefits_assoc_status on association_benefits(association_id, usage_status);
create index if not exists idx_association_publications_assoc_deadline on association_publication_schedules(association_id, deadline_date);
create index if not exists idx_association_events_assoc_date on association_events(association_id, event_date);

insert into associations (name, association_type, join_status, internal_owner, notes)
values
  ('全國聯合會', '全國聯合會', '已加入', '待補', '初始建檔，聯絡人、年費與會員權益待補。'),
  ('台北市冷凍空調技師公會', '技師公會', '已加入', '待補', '初始建檔，聯絡人、年費與會員權益待補。'),
  ('台灣省冷凍空調技師公會', '技師公會', '已加入', '待補', '初始建檔，聯絡人、年費與會員權益待補。'),
  ('台中市冷凍空調技師公會', '技師公會', '已加入', '待補', '初始建檔，聯絡人、年費與會員權益待補。')
on conflict (name) do nothing;
