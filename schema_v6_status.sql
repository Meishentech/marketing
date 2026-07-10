-- 行銷案狀態改為 5 種（v6 增量，在 Supabase SQL editor 執行）

-- 先把舊值對應到新值
update marketing_campaigns set status = '估價中' where status = '估價';

-- 更新 check constraint
alter table marketing_campaigns drop constraint if exists marketing_campaigns_status_check;
alter table marketing_campaigns add constraint marketing_campaigns_status_check
  check (status in ('預計規劃','估價中','進行中','補助申請','結案'));

-- 新建案預設狀態
alter table marketing_campaigns alter column status set default '預計規劃';
