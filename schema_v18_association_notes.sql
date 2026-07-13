-- v18: 公會管理備註與附件欄位

create table if not exists association_notes (
  id uuid primary key default gen_random_uuid(),
  association_id uuid not null references associations(id) on delete cascade,
  note_title text not null,
  note text,
  attachment text,
  owner text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table association_notes enable row level security;

grant select, insert, update, delete on association_notes to authenticated;

drop policy if exists "authenticated manage association notes" on association_notes;
create policy "authenticated manage association notes"
  on association_notes for all to authenticated
  using (true)
  with check (true);

create index if not exists idx_association_notes_assoc_updated on association_notes(association_id, updated_at desc);
