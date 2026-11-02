-- Owner-only, run in SQL Editor after creating the user in Authentication.
-- Create admin@calendar.invalid with a private password (>= 8 characters),
-- and enable Auto Confirm User. This technical email is never used for mail.
do $$
declare v_user uuid;
begin
  select id into v_user from auth.users where lower(email) = 'admin@calendar.invalid' and email_confirmed_at is not null;
  if v_user is null then raise exception 'Create admin@calendar.invalid with Auto Confirm User in Authentication > Users first'; end if;
  insert into public.calendar_profiles(user_id, username, display_name)
    values (v_user, 'admin', 'Quản trị viên')
    on conflict (user_id) do update set username = 'admin', display_name = 'Quản trị viên';
  insert into public.calendar_admins(user_id) values (v_user) on conflict do nothing;
end;
$$;
