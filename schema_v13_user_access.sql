create extension if not exists citext;

create table if not exists app_user_access (
  email citext primary key,
  display_name text,
  role text not null default 'member',
  is_active boolean not null default true,
  must_change_password boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table app_user_access enable row level security;

revoke all on app_user_access from anon, authenticated;
grant select (email, is_active, must_change_password) on app_user_access to authenticated;
grant update (must_change_password, updated_at) on app_user_access to authenticated;

drop policy if exists app_user_access_own_select on app_user_access;
create policy app_user_access_own_select
  on app_user_access
  for select
  to authenticated
  using ((auth.jwt() ->> 'email')::citext = email);

drop policy if exists app_user_access_own_update on app_user_access;
create policy app_user_access_own_update
  on app_user_access
  for update
  to authenticated
  using ((auth.jwt() ->> 'email')::citext = email)
  with check ((auth.jwt() ->> 'email')::citext = email);

insert into app_user_access (email, display_name, role, is_active, must_change_password)
values
  ('test@mcttw.com.tw', 'Test', 'admin', true, false),
  ('kevin@mcttw.com.tw', 'Kevin', 'member', true, true),
  ('lungbin5412@mcttw.com.tw', 'Lungbin', 'member', true, true),
  ('c1994915@mcttw.com.tw', null, 'member', true, true),
  ('eric@mcttw.com.tw', 'Eric', 'member', true, true),
  ('vincent@mcttw.com.tw', 'Vincent', 'member', true, true),
  ('hill22518@mcttw.com.tw', null, 'member', true, true),
  ('info@mcttw.com.tw', 'Info', 'member', true, true),
  ('hansLee0408@mcttw.com.tw', 'Hans Lee', 'member', true, true)
on conflict (email) do update set
  display_name = excluded.display_name,
  role = excluded.role,
  is_active = excluded.is_active,
  must_change_password = case
    when app_user_access.must_change_password = false then false
    else excluded.must_change_password
  end,
  updated_at = now();
