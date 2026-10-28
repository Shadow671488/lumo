-- Add the email binding used by Lumo when validating Telegram-delivered codes.
-- The Telegram bot must write the recipient's normalized email to this column.
alter table public.telegram_auth_codes
  add column if not exists email text;

update public.telegram_auth_codes
set email = lower(trim(email))
where email is not null and email <> lower(trim(email));

create index if not exists telegram_auth_codes_pending_lookup_idx
  on public.telegram_auth_codes (lower(email), code, expires_at)
  where used = false;

notify pgrst, 'reload schema';
