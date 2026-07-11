alter table marketing_resources
  add column if not exists file_path text,
  add column if not exists file_name text,
  add column if not exists file_size bigint;

insert into storage.buckets (id, name, public, file_size_limit)
values ('marketing-resource-files', 'marketing-resource-files', false, 52428800)
on conflict (id) do update set
  public = false,
  file_size_limit = 52428800;

drop policy if exists "authenticated manage marketing resource files" on storage.objects;
create policy "authenticated manage marketing resource files"
  on storage.objects
  for all
  to authenticated
  using (bucket_id = 'marketing-resource-files')
  with check (bucket_id = 'marketing-resource-files');

create index if not exists idx_marketing_resources_external_updated
  on marketing_resources(is_external_usable, updated_at desc);
