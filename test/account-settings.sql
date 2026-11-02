-- Run on an isolated PostgreSQL fixture after supabase/account-settings.sql.
-- Fixture: auth.users(id,email,banned_until), calendar_profiles, calendar_admins;
-- users 1111… and 2222…, first user's email old@example.test.
begin;
do $$
declare a uuid='11111111-1111-1111-1111-111111111111'; b uuid='22222222-2222-2222-2222-222222222222'; c uuid='33333333-3333-3333-3333-333333333333'; r jsonb;
begin
  if has_function_privilege('authenticated','public.calendar_email_step(text,uuid,uuid,uuid,text,text)','execute') then raise exception 'RPC publicly callable'; end if;
  if has_table_privilege('authenticated','public.calendar_email_changes','select') then raise exception 'OTP state publicly readable'; end if;
  r:=public.calendar_email_step('start',b,a,c,'old@example.test','oldhash');
  assert r->>'error'='forbidden','Other ordinary account must not mutate target';
  begin update auth.users set email='bypass@example.test' where id=a; raise exception 'Direct change bypass'; exception when insufficient_privilege then null; end;
  r:=public.calendar_email_step('start',a,a,c,'old@example.test','oldhash'); assert r->>'stage'='old_pending';
  r:=public.calendar_email_step('start',a,a,c,'old@example.test','oldhash'); assert r->>'error'='rate';
  r:=public.calendar_email_step('new',a,a,c,'new@example.test','newhash'); assert r->>'error'='order';
  r:=public.calendar_email_step('verify_old',a,a,c,'','wrong'); assert r->>'error'='invalid';
  assert (select attempts from public.calendar_email_changes where target=a)=1,'Wrong attempts must persist';
  r:=public.calendar_email_step('verify_old',a,a,c,'','oldhash'); assert r->>'stage'='old_verified';
  r:=public.calendar_email_step('new',a,a,c,'new@example.test','newhash'); assert r->>'stage'='new_pending';
  assert (select email from auth.users where id=a)='old@example.test','Old proof must not change email';
  begin update auth.users set email='new@example.test' where id=a; raise exception 'New code bypass'; exception when insufficient_privilege then null; end;
  r:=public.calendar_email_step('verify_new',a,a,c,'','wrong'); assert r->>'error'='invalid';
  r:=public.calendar_email_step('verify_new',a,a,c,'','newhash'); assert r->>'stage'='applying';
  r:=public.calendar_email_step('start',a,a,c,'old@example.test','another'); assert r->>'error'='applying','Cannot replace a consumed challenge';
  update auth.users set email='new@example.test' where id=a;
  r:=public.calendar_email_step('verify_new',a,a,c,'','newhash'); assert r->>'stage'='applying','Safe retry after Auth update';
  r:=public.calendar_email_step('finish',a,a,c); assert r->>'stage'='done';
  r:=public.calendar_email_step('verify_new',a,a,c,'','newhash'); assert r->>'error' in ('order','stale'),'No replay';
  update public.calendar_email_changes set sent_at=now()-interval '2 minutes' where target=a;
  r:=public.calendar_email_step('start',a,a,c,'new@example.test','oldhash'); assert r->>'ok'='true';
  for i in 1..5 loop r:=public.calendar_email_step('verify_old',a,a,c,'','wrong'); end loop;
  r:=public.calendar_email_step('verify_old',a,a,c,'','oldhash'); assert r->>'error'='expired','Lock out after five attempts';
  update public.calendar_email_changes set sent_at=now()-interval '2 minutes' where target=a;
  r:=public.calendar_email_step('start',a,a,c,'new@example.test','oldhash');
  update public.calendar_email_changes set expires_at=now()-interval '1 minute' where target=a;
  r:=public.calendar_email_step('verify_old',a,a,c,'','oldhash'); assert r->>'error'='expired';
  update public.calendar_email_changes set sent_at=now()-interval '2 minutes' where target=a;
  insert into public.calendar_admins values(b);
  r:=public.calendar_email_step('start',b,a,c,'new@example.test','oldhash'); assert r->>'ok'='true';
  delete from public.calendar_admins where user_id=b;
  r:=public.calendar_email_step('verify_old',b,a,c,'','oldhash'); assert r->>'error'='forbidden','Recheck revoked admin';
  update auth.users set banned_until=now()+interval '1 day' where id=a;
  r:=public.calendar_email_step('verify_old',a,a,c,'','oldhash'); assert r->>'error'='forbidden','Recheck banned actor';
end;
$$;
rollback;
