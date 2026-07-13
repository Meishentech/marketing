-- v20: 公會管理自訂下拉選項與任務關聯行銷專案

alter table if exists associations
  drop constraint if exists associations_type_check,
  drop constraint if exists associations_join_status_check;

alter table if exists association_fee_records
  drop constraint if exists association_fee_status_check;

alter table if exists association_benefits
  drop constraint if exists association_benefit_type_check,
  drop constraint if exists association_benefit_status_check;

alter table if exists association_publication_schedules
  drop constraint if exists association_publication_status_check;

alter table if exists association_events
  drop constraint if exists association_event_type_check,
  drop constraint if exists association_event_role_check,
  drop constraint if exists association_event_status_check;

alter table if exists association_tasks
  add column if not exists marketing_campaign_id uuid references marketing_campaigns(id) on delete set null,
  drop constraint if exists association_task_type_check,
  drop constraint if exists association_task_status_check,
  drop constraint if exists association_task_priority_check;

alter table if exists association_task_expenses
  drop constraint if exists association_task_expense_type_check,
  drop constraint if exists association_task_expense_payment_check;

do $$
begin
  if to_regclass('public.association_tasks') is not null then
    create index if not exists idx_association_tasks_campaign on association_tasks(marketing_campaign_id);
  end if;
end $$;
