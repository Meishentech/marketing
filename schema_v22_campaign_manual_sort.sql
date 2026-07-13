-- v22: 行銷案管理手動排序

alter table marketing_campaigns
  add column if not exists sort_order integer;

with ranked as (
  select
    id,
    row_number() over (
      order by
        case status
          when '預計規劃' then 1
          when '估價中' then 2
          when '進行中' then 3
          when '補助申請' then 4
          when '結案' then 5
          else 99
        end,
        case priority
          when '高' then 1
          when '中' then 2
          when '低' then 3
          else 2
        end,
        created_at desc
    ) * 10 as new_sort_order
  from marketing_campaigns
  where sort_order is null
)
update marketing_campaigns c
set sort_order = ranked.new_sort_order
from ranked
where c.id = ranked.id;

create index if not exists idx_marketing_campaigns_sort_order
  on marketing_campaigns(sort_order, created_at desc);
