-- Bind each Lumo account to exactly one Telegram account.
-- Run once in the Supabase SQL editor.
--
-- Lumo stores the Telegram binding both in auth user_metadata (set at signUp)
-- and in public.profiles, so the database can enforce one Telegram account per
-- Lumo account instead of relying only on this device's localStorage.
alter table public.profiles
  add column if not exists telegram_id text;

alter table public.profiles
  add column if not exists telegram_username text;

-- One Telegram account may back at most one Lumo account.
create unique index if not exists profiles_telegram_id_unique_idx
  on public.profiles (telegram_id)
  where telegram_id is not null;

notify pgrst, 'reload schema';
