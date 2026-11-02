-- Run after admin-setup.sql. OTP state is only accessible to the server function.
begin;
create table if not exists public.calendar_email_changes (
  target uuid primary key references auth.users(id) on delete cascade,
  actor uuid not null references auth.users(id) on delete cascade,
  id uuid not null,
  old_email text not null,
  new_email text,
  code_hash text not null,
  stage text not null,
  attempts integer not null default 0,
  expires_at timestamptz not null,
  sent_at timestamptz not null default now()
);
alter table public.calendar_email_changes enable row level security;
revoke all on public.calendar_email_changes from public, anon, authenticated;
grant all on public.calendar_email_changes to service_role;
create or replace function public.calendar_email_step(p_action text, p_actor uuid, p_target uuid, p_id uuid, p_email text default '', p_hash text default '')
returns jsonb language plpgsql security definer set search_path = '' as $$
declare r public.calendar_email_changes; current_email text;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_target::text, 0));
  -- Recheck permission inside the same transaction, even for an already issued challenge.
  if not exists(select 1 from auth.users where id=p_actor and (banned_until is null or banned_until <= now()))
    or (p_actor <> p_target and not exists(select 1 from public.calendar_admins where user_id=p_actor)) then
    return jsonb_build_object('error','forbidden');
  end if;
  select lower(email) into current_email from auth.users where id=p_target;
  if current_email is null then return jsonb_build_object('error','missing'); end if;
  select * into r from public.calendar_email_changes where target=p_target for update;
  if p_action = 'start' then
    if r.stage='applying' and r.expires_at >= now() then return jsonb_build_object('error','applying'); end if;
    if r.sent_at > now()-interval '60 seconds' then return jsonb_build_object('error','rate'); end if;
    if current_email <> p_email then return jsonb_build_object('error','stale'); end if;
    insert into public.calendar_email_changes(target,actor,id,old_email,code_hash,stage,expires_at)
      values(p_target,p_actor,p_id,current_email,p_hash,'old_pending',now()+interval '10 minutes')
      on conflict(target) do update set actor=excluded.actor,id=excluded.id,old_email=excluded.old_email,
        new_email=null,code_hash=excluded.code_hash,stage=excluded.stage,attempts=0,expires_at=excluded.expires_at,sent_at=now();
    return jsonb_build_object('ok',true,'stage','old_pending');
  end if;
  if r.id is distinct from p_id or r.actor is distinct from p_actor then return jsonb_build_object('error','invalid'); end if;
  if p_action='finish' and r.stage='applying' and current_email=r.new_email then
    update public.calendar_email_changes set stage='done',code_hash='' where target=p_target;
    return jsonb_build_object('ok',true,'stage','done');
  end if;
  if r.expires_at < now() or r.attempts >= 5 then return jsonb_build_object('error','expired'); end if;
  if current_email <> r.old_email and not (r.stage='applying' and current_email=r.new_email) then return jsonb_build_object('error','stale'); end if;
  if p_action='new' then
    if r.stage not in ('old_verified','new_pending') then return jsonb_build_object('error','order'); end if;
    if r.stage='new_pending' and r.sent_at > now()-interval '60 seconds' then return jsonb_build_object('error','rate'); end if;
    if p_email=current_email or exists(select 1 from auth.users where lower(email)=p_email) then return jsonb_build_object('error','email'); end if;
    update public.calendar_email_changes set new_email=p_email,code_hash=p_hash,stage='new_pending',attempts=0,expires_at=now()+interval '10 minutes',sent_at=now() where target=p_target;
    return jsonb_build_object('ok',true,'stage','new_pending');
  end if;
  if p_action in ('verify_old','verify_new') then
    if (p_action='verify_old' and r.stage <> 'old_pending') or (p_action='verify_new' and r.stage not in ('new_pending','applying')) then return jsonb_build_object('error','order'); end if;
    if r.code_hash <> p_hash then
      update public.calendar_email_changes set attempts=attempts+1 where target=p_target;
      return jsonb_build_object('error','invalid');
    end if;
    if p_action='verify_old' then
      update public.calendar_email_changes set stage='old_verified',attempts=0,code_hash='' where target=p_target;
      return jsonb_build_object('ok',true,'stage','old_verified');
    end if;
    update public.calendar_email_changes set stage='applying' where target=p_target;
    return jsonb_build_object('ok',true,'stage','applying','old_email',r.old_email,'new_email',r.new_email);
  end if;
  if p_action='failed' and r.stage='applying' then
    update public.calendar_email_changes set stage='failed',code_hash='' where target=p_target;
    return jsonb_build_object('ok',true);
  end if;
  return jsonb_build_object('error','order');
end;
$$;
revoke all on function public.calendar_email_step(text,uuid,uuid,uuid,text,text) from public, anon, authenticated;
grant execute on function public.calendar_email_step(text,uuid,uuid,uuid,text,text) to service_role;
-- Enforce both mailbox proofs even if a client calls Auth's email endpoint directly.
create or replace function public.calendar_guard_email_change()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.email is distinct from old.email and exists(select 1 from public.calendar_profiles where user_id=old.id) then
    if not exists(select 1 from public.calendar_email_changes where target=old.id and old_email=lower(old.email)
      and new_email=lower(new.email) and stage='applying' and expires_at >= now() and attempts < 5
      and exists(select 1 from auth.users u where u.id=actor and (u.banned_until is null or u.banned_until <= now()))
      and (actor=target or exists(select 1 from public.calendar_admins a where a.user_id=actor))) then
      raise exception 'Verify the current and new mailbox before changing email' using errcode='42501';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function public.calendar_guard_email_change() from public, anon, authenticated;
drop trigger if exists calendar_guard_email_change on auth.users;
create trigger calendar_guard_email_change before update of email on auth.users
  for each row execute function public.calendar_guard_email_change();
commit;
