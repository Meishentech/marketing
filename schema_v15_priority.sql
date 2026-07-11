-- v15: 行銷案新增「重要性」欄位，總表可依重要性排序
alter table marketing_campaigns
  add column if not exists priority text not null default '中';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'marketing_campaigns_priority_check'
  ) then
    alter table marketing_campaigns
      add constraint marketing_campaigns_priority_check check (priority in ('高', '中', '低'));
  end if;
end $$;
