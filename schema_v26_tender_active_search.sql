-- v26: 投標工具主動找案模式

alter table tender_projects
  add column if not exists scan_mode text not null default '指定網址'
  check (scan_mode in ('指定網址','主動找案'));

alter table tender_projects
  add column if not exists search_queries text[] not null default '{}';

update tender_projects
set scan_mode = '指定網址'
where scan_mode is null;
