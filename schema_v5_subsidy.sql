-- 新增「美的預計補助」「美的已核發補助」欄位（v5 增量，在 Supabase SQL editor 執行）

alter table marketing_campaigns add column if not exists subsidy_planned numeric;
alter table marketing_campaigns add column if not exists subsidy_received numeric;
