-- v24: 投標工具掃描類別、關聯度分級與舊 running 紀錄整理

alter table tender_projects
  add column if not exists scan_categories text[] not null default array[
    'bid_open',
    'procurement',
    'deadline',
    'chiller',
    'central_ac',
    'ventilation',
    'maglev',
    'exclude_closed',
    'exclude_residential'
  ];

alter table tender_projects
  add column if not exists filter_mode text not null default '保守'
  check (filter_mode in ('保守','平衡','嚴格'));

alter table tender_results
  add column if not exists relevance_score integer not null default 0;

alter table tender_results
  add column if not exists relevance_level text not null default '待確認'
  check (relevance_level in ('高相關','待確認','低相關'));

alter table tender_results
  add column if not exists relevance_reasons text[] not null default '{}';

create index if not exists idx_tender_results_relevance
  on tender_results(project_id, relevance_level, relevance_score desc, last_seen_at desc);

update tender_scan_runs
set
  status = 'failed',
  finished_at = now(),
  error_message = coalesce(error_message, '前次掃描未正常完成，已自動標記為未完成。')
where status = 'running'
  and started_at < now() - interval '10 minutes';
