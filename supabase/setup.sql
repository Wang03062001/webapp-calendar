-- Run once in Supabase SQL Editor. This script creates only this app's objects.
begin;

create table if not exists public.calendar_documents (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null,
  revision bigint not null default 1 check (revision > 0),
  updated_at timestamptz not null default now()
);
alter table public.calendar_documents enable row level security;
revoke all on public.calendar_documents from anon, authenticated;
grant select on public.calendar_documents to authenticated;
drop policy if exists calendar_read_own on public.calendar_documents;
create policy calendar_read_own on public.calendar_documents
  for select to authenticated using ((select auth.uid()) = user_id);

-- Only this function writes documents. Revision checking prevents one device
-- from silently overwriting edits made on another device.
create or replace function public.save_calendar_document(p_data jsonb, p_expected_revision bigint)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_revision bigint;
begin
  if v_user is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if p_data is null or jsonb_typeof(p_data) <> 'object'
    or (p_data ->> 'version') is distinct from '2'
    or jsonb_typeof(p_data -> 'days') is distinct from 'object'
    or jsonb_typeof(p_data -> 'incomes') is distinct from 'object'
    or jsonb_typeof(p_data -> 'savings') is distinct from 'object'
    or jsonb_typeof(p_data -> 'goals') is distinct from 'object'
    or p_expected_revision is null or p_expected_revision < 0 then
    raise exception 'Invalid calendar document' using errcode = '22023';
  end if;

  if p_expected_revision = 0 then
    insert into public.calendar_documents(user_id, data) values (v_user, p_data)
      on conflict (user_id) do nothing returning revision into v_revision;
  else
    update public.calendar_documents set data = p_data,
      revision = revision + 1, updated_at = now()
      where user_id = v_user and revision = p_expected_revision
      returning revision into v_revision;
  end if;
  if v_revision is null then
    -- Application revision conflicts must not use serialization_failure (40001):
    -- older PostgREST/Hasql versions retry that SQLSTATE inside one HTTP request.
    raise exception 'Document changed on another device' using errcode = 'PT409';
  end if;
  return jsonb_build_object('revision', v_revision);
end;
$$;
revoke all on function public.save_calendar_document(jsonb, bigint) from public, anon;
grant execute on function public.save_calendar_document(jsonb, bigint) to authenticated;
commit;
