-- 成功案例分享庫（v7 增量，在 Supabase SQL editor 執行）

create table if not exists marketing_case_studies (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  project_name text,
  product_model text,
  summary text,
  metrics text,
  cover_image_path text,
  canva_design_url text,
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table marketing_case_studies enable row level security;

drop policy if exists "authenticated full access" on marketing_case_studies;
create policy "authenticated full access" on marketing_case_studies
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

insert into storage.buckets (id, name, public, file_size_limit)
values ('case-study-photos', 'case-study-photos', false, 10485760)
on conflict (id) do nothing;

drop policy if exists "authenticated manage case study photos" on storage.objects;
create policy "authenticated manage case study photos" on storage.objects
  for all using (bucket_id = 'case-study-photos' and auth.role() = 'authenticated')
  with check (bucket_id = 'case-study-photos' and auth.role() = 'authenticated');
