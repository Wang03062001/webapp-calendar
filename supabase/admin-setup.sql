-- Run in SQL Editor after setup.sql. Grant the first admin separately (see README).
begin;
create table if not exists public.calendar_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.calendar_admins enable row level security;
revoke all on public.calendar_admins from public, anon, authenticated;
grant select, insert, update, delete on public.calendar_admins to service_role;

create table if not exists public.calendar_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (username ~ '^[a-z][a-z0-9_]{2,29}$'),
  display_name text not null default '' check (char_length(display_name) <= 100)
);
alter table public.calendar_profiles enable row level security;
revoke all on public.calendar_profiles from public, anon, authenticated;
grant select on public.calendar_profiles to authenticated;
grant select, update on public.calendar_profiles to service_role;
drop policy if exists calendar_profile_own on public.calendar_profiles;
create policy calendar_profile_own on public.calendar_profiles for select to authenticated
  using (user_id = (select auth.uid()));

create or replace function public.calendar_create_profile()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare v_username text;
begin
  v_username := lower(trim(coalesce(new.raw_user_meta_data ->> 'username', '')));
  if v_username = '' then v_username := 'user_' || replace(new.id::text, '-', '');
    v_username := left(v_username, 30);
  elsif v_username = 'admin' or v_username !~ '^[a-z][a-z0-9_]{2,29}$' then
    raise exception 'Invalid or reserved username' using errcode = '22023';
  end if;
  insert into public.calendar_profiles(user_id, username, display_name)
    values (new.id, v_username, left(coalesce(new.raw_user_meta_data ->> 'display_name', ''), 100));
  return new;
end;
$$;
revoke all on function public.calendar_create_profile() from public, anon, authenticated;
drop trigger if exists calendar_create_profile on auth.users;
create trigger calendar_create_profile after insert on auth.users
  for each row execute function public.calendar_create_profile();
insert into public.calendar_profiles(user_id, username, display_name)
  select id, left('user_' || replace(id::text, '-', ''), 30),
    left(coalesce(raw_user_meta_data ->> 'display_name', ''), 100)
  from auth.users on conflict (user_id) do nothing;

create or replace function public.calendar_username_available(p_username text)
returns boolean language sql stable security definer set search_path = ''
as $$
  select p_username ~ '^[a-z][a-z0-9_]{2,29}$' and p_username <> 'admin'
    and not exists (select 1 from public.calendar_profiles where username = p_username);
$$;
revoke all on function public.calendar_username_available(text) from public;
grant execute on function public.calendar_username_available(text) to anon, authenticated;

-- A banned account must also lose access with an already-issued access token.
create or replace function public.calendar_account_active()
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from auth.users where id = (select auth.uid())
    and (banned_until is null or banned_until <= now()));
$$;
revoke all on function public.calendar_account_active() from public, anon;
grant execute on function public.calendar_account_active() to authenticated;
drop policy if exists calendar_read_own on public.calendar_documents;
create policy calendar_read_own on public.calendar_documents for select to authenticated
  using ((select auth.uid()) = user_id and (select public.calendar_account_active()));

create or replace function public.calendar_guard_active_account()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if not public.calendar_account_active() then
    raise exception 'Account is disabled' using errcode = '42501';
  end if;
  return new;
end;
$$;
revoke all on function public.calendar_guard_active_account() from public, anon, authenticated;
drop trigger if exists calendar_guard_active_account on public.calendar_documents;
create trigger calendar_guard_active_account before insert or update on public.calendar_documents
  for each row execute function public.calendar_guard_active_account();

create or replace function public.calendar_is_admin()
returns boolean language sql stable security definer set search_path = ''
as $$
  select public.calendar_account_active() and exists (
    select 1 from public.calendar_admins where user_id = (select auth.uid())
  );
$$;
revoke all on function public.calendar_is_admin() from public, anon;
grant execute on function public.calendar_is_admin() to authenticated;
commit;
