-- v21: 行銷案關聯公會，公會管理改以行銷案作為同步主資料

alter table marketing_campaigns
  add column if not exists association_id uuid references associations(id) on delete set null,
  add column if not exists association_activity_type text;

create index if not exists idx_marketing_campaigns_association
  on marketing_campaigns(association_id, status, planned_start);
