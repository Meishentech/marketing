-- 新聞蒐集關鍵字（v2 增量，在 Supabase SQL editor 執行）

create table if not exists marketing_news_keywords (
  id uuid primary key default gen_random_uuid(),
  keyword text not null unique,
  created_at timestamptz not null default now()
);

alter table marketing_news_keywords enable row level security;

create policy "authenticated full access" on marketing_news_keywords
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

insert into marketing_news_keywords (keyword) values
  ('冰水主機'), ('磁懸浮冰水主機'), ('節能汰換'), ('節能政策')
on conflict (keyword) do nothing;
