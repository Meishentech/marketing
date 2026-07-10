-- 負責公司（外包，可多筆）改用陣列欄位（v4 增量，在 Supabase SQL editor 執行）

alter table marketing_campaigns add column if not exists vendors jsonb not null default '[]'::jsonb;
