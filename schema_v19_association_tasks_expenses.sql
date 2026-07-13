-- v19: 公會任務、進度與任務費用管理

create table if not exists association_tasks (
  id uuid primary key default gen_random_uuid(),
  association_id uuid not null references associations(id) on delete cascade,
  task_name text not null,
  task_type text not null default '其他',
  task_status text not null default '待確認',
  priority text not null default '中',
  start_date date,
  due_date date,
  completed_date date,
  progress_pct integer not null default 0,
  owner text,
  description text,
  next_step text,
  required_materials text[],
  notes text,
  attachment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint association_task_type_check check (task_type in ('會員大會', '協辦活動', '技術講座', '期刊投稿', '期刊廣告', '年度贊助', '拜訪聯繫', '素材準備', '其他')),
  constraint association_task_status_check check (task_status in ('待確認', '未開始', '準備中', '已送審', '已完成', '取消')),
  constraint association_task_priority_check check (priority in ('高', '中', '低')),
  constraint association_task_progress_check check (progress_pct >= 0 and progress_pct <= 100)
);

create table if not exists association_task_expenses (
  id uuid primary key default gen_random_uuid(),
  association_id uuid not null references associations(id) on delete cascade,
  task_id uuid references association_tasks(id) on delete set null,
  expense_type text not null default '其他',
  budget_amount numeric,
  actual_amount numeric,
  payment_status text not null default '未付款',
  payment_date date,
  receipt_status text,
  receipt_attachment text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint association_task_expense_type_check check (expense_type in ('年費', '年度贊助', '活動贊助', '期刊費用', '設計製作', '印刷', '禮品', '交通餐費', '其他')),
  constraint association_task_expense_payment_check check (payment_status in ('未付款', '已付款', '待確認', '不適用'))
);

alter table association_publication_schedules
  add column if not exists task_id uuid references association_tasks(id) on delete set null;

alter table association_events
  add column if not exists task_id uuid references association_tasks(id) on delete set null;

alter table association_tasks enable row level security;
alter table association_task_expenses enable row level security;

grant select, insert, update, delete on association_tasks to authenticated;
grant select, insert, update, delete on association_task_expenses to authenticated;

drop policy if exists "authenticated manage association tasks" on association_tasks;
create policy "authenticated manage association tasks"
  on association_tasks for all to authenticated
  using (true)
  with check (true);

drop policy if exists "authenticated manage association task expenses" on association_task_expenses;
create policy "authenticated manage association task expenses"
  on association_task_expenses for all to authenticated
  using (true)
  with check (true);

create index if not exists idx_association_tasks_assoc_due on association_tasks(association_id, due_date);
create index if not exists idx_association_tasks_status on association_tasks(task_status, due_date);
create index if not exists idx_association_task_expenses_assoc on association_task_expenses(association_id, payment_status);
create index if not exists idx_association_task_expenses_task on association_task_expenses(task_id);
create index if not exists idx_association_publications_task on association_publication_schedules(task_id);
create index if not exists idx_association_events_task on association_events(task_id);
