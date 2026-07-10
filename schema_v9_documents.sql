-- 行銷案文件附件（v9 增量，在 Supabase SQL editor 執行）

create table if not exists marketing_campaign_documents (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references marketing_campaigns(id) on delete cascade,
  doc_type text not null default '其他' check (doc_type in ('報價單','攤位設計圖','大會文件','廠商資料','其他')),
  title text not null,
  version_note text,
  file_path text not null,
  file_name text not null,
  notes text,
  uploaded_at timestamptz not null default now()
);

alter table marketing_campaign_documents enable row level security;

drop policy if exists "authenticated full access" on marketing_campaign_documents;
create policy "authenticated full access" on marketing_campaign_documents
  for all
  to authenticated
  using (true)
  with check (true);

insert into storage.buckets (id, name, public, file_size_limit)
values ('campaign-documents', 'campaign-documents', false, 20971520)
on conflict (id) do nothing;

drop policy if exists "authenticated manage campaign documents" on storage.objects;
create policy "authenticated manage campaign documents" on storage.objects
  for all
  to authenticated
  using (bucket_id = 'campaign-documents')
  with check (bucket_id = 'campaign-documents');
