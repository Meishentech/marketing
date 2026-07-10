-- 行銷案新增「負責人」「負責單位」欄位（v3 增量，在 Supabase SQL editor 執行）

alter table marketing_campaigns add column if not exists owner text;
alter table marketing_campaigns add column if not exists owner_unit text;
