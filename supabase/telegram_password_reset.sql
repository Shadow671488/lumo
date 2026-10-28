-- Password reset via a Telegram verification code (no email involved).
-- Run once in the Supabase SQL editor.
--
-- The client cannot change another account's password with the anon key, so
-- this SECURITY DEFINER function performs the verified reset server-side:
--   1. resolves username -> <username>@lumo.app
--   2. validates an unused, unexpired code in telegram_auth_codes
--   3. enforces the Telegram <-> account binding (binds on first reset)
--   4. writes the new bcrypt password into auth.users
--   5. consumes the code
create extension if not exists pgcrypto with schema extensions;

create or replace function public.reset_password_with_telegram(
  p_username text,
  p_code text,
  p_new_password text
) returns void
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_email text;
  v_user_id uuid;
  v_code public.telegram_auth_codes%rowtype;
  v_code_telegram_id text;
  v_bound_telegram_id text;
begin
  if p_username is null or length(trim(p_username)) = 0 then
    raise exception 'Enter your username.';
  end if;
  if p_code is null or p_code !~ '^[0-9]{6}$' then
    raise exception 'Enter the six-digit code from your Telegram bot.';
  end if;
  if p_new_password is null or length(p_new_password) < 8 then
    raise exception 'Password must be at least 8 characters.';
  end if;

  v_email := lower(trim(p_username)) || '@lumo.app';

  select id into v_user_id
  from auth.users
  where lower(email) = v_email
  limit 1;

  if v_user_id is null then
    raise exception 'No account found for this username.';
  end if;

  select * into v_code
  from public.telegram_auth_codes
  where code = p_code
    and used = false
    and expires_at > now()
  order by expires_at desc
  limit 1
  for update;

  if v_code.code is null then
    raise exception 'Invalid or expired Telegram verification code.';
  end if;

  v_code_telegram_id := nullif(trim(v_code.telegram_id::text), '');
  if v_code_telegram_id is null then
    raise exception 'This verification code is not linked to a Telegram account.';
  end if;

  select coalesce(
    (select telegram_id from public.profiles where id = v_user_id),
    (select raw_user_meta_data->>'telegram_id' from auth.users where id = v_user_id)
  ) into v_bound_telegram_id;

  if v_bound_telegram_id is not null and v_bound_telegram_id <> v_code_telegram_id then
    raise exception 'This verification code belongs to a different Telegram account.';
  end if;

  -- First reset on a legacy account: bind this Telegram account to it.
  if v_bound_telegram_id is null then
    update auth.users
       set raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb)
             || jsonb_build_object(
                  'telegram_id', v_code_telegram_id,
                  'telegram_username', coalesce(v_code.username, '')
                ),
           updated_at = now()
     where id = v_user_id;

    update public.profiles
       set telegram_id = v_code_telegram_id,
           telegram_username = coalesce(v_code.username, ''),
           updated_at = now()
     where id = v_user_id;
  end if;

  update auth.users
     set encrypted_password = crypt(p_new_password, gen_salt('bf', 10)),
         updated_at = now()
   where id = v_user_id;

  update public.telegram_auth_codes
     set used = true
   where code = p_code
     and used = false;
end;
$$;

revoke all on function public.reset_password_with_telegram(text, text, text) from public;
grant execute on function public.reset_password_with_telegram(text, text, text) to anon, authenticated;

notify pgrst, 'reload schema';