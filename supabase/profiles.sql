-- Run once in the Supabase SQL editor to enable real user discovery and cloud friends.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  display_name text not null,
  bio text not null default '',
  favorite_artist text not null default '',
  avatar_url text,
  likes_visibility text not null default 'public' check (likes_visibility in ('public', 'friends', 'private')),
  reposts_visibility text not null default 'public' check (reposts_visibility in ('public', 'friends', 'private')),
  verified boolean not null default false,
  updated_at timestamptz not null default now()
);
alter table public.profiles add column if not exists likes_visibility text not null default 'public' check (likes_visibility in ('public', 'friends', 'private'));
alter table public.profiles add column if not exists reposts_visibility text not null default 'public' check (reposts_visibility in ('public', 'friends', 'private'));
alter table public.profiles enable row level security;
drop policy if exists "profiles visible to signed-in users" on public.profiles;
create policy "profiles visible to signed-in users" on public.profiles for select to authenticated using (true);
drop policy if exists "users create own profile" on public.profiles;
create policy "users create own profile" on public.profiles for insert to authenticated with check (auth.uid() = id);
drop policy if exists "users update own profile" on public.profiles;
create policy "users update own profile" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

create table if not exists public.friendships (
  user_id uuid not null references auth.users(id) on delete cascade,
  friend_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, friend_id),
  constraint friendships_no_self check (user_id <> friend_id)
);
alter table public.friendships enable row level security;
drop policy if exists "users view own friendships" on public.friendships;
create policy "users view own friendships" on public.friendships for select to authenticated using (auth.uid() = user_id or auth.uid() = friend_id);
drop policy if exists "users add own friendships" on public.friendships;
create policy "users add own friendships" on public.friendships for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "users remove own friendships" on public.friendships;
create policy "users remove own friendships" on public.friendships for delete to authenticated using (auth.uid() = user_id);


-- Community badges are writable only through this RPC, never through profile updates.
-- Keep the established storage columns so existing Supabase projects work without
-- a destructive migration. The app presents these as Bug Hunter and Alpha Tester.
alter table public.profiles add column if not exists supporter boolean not null default false;
alter table public.profiles add column if not exists spotlight boolean not null default false;
create table if not exists public.lumo_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  granted_at timestamptz not null default now()
);
alter table public.lumo_admins enable row level security;
revoke all on public.lumo_admins from anon, authenticated;

create or replace function public.guard_profile_badges()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.lumo_admins where user_id = auth.uid()) then
    if tg_op = 'INSERT' then
      new.verified := false; new.supporter := false; new.spotlight := false;
    else
      new.verified := old.verified; new.supporter := old.supporter; new.spotlight := old.spotlight;
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists guard_profile_badges on public.profiles;
create trigger guard_profile_badges before insert or update on public.profiles
for each row execute function public.guard_profile_badges();

create or replace function public.owner_set_profile_badge(target_profile_id uuid, badge_name text, enabled boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.lumo_admins where user_id = auth.uid()) then
    raise exception 'Owner permission is not configured for this account';
  end if;
  if badge_name = 'verified' then
    update public.profiles set verified = enabled, updated_at = now() where id = target_profile_id;
  elsif badge_name = 'supporter' then
    update public.profiles set supporter = enabled, updated_at = now() where id = target_profile_id;
  elsif badge_name = 'spotlight' then
    update public.profiles set spotlight = enabled, updated_at = now() where id = target_profile_id;
  else
    raise exception 'Unknown badge';
  end if;
  if not found then raise exception 'Profile not found'; end if;
end;
$$;
revoke all on function public.owner_set_profile_badge(uuid,text,boolean) from public, anon;
grant execute on function public.owner_set_profile_badge(uuid,text,boolean) to authenticated;

-- One-time owner setup: after Oxeez signs in once and their row exists in profiles,
-- verify the returned UUID in Supabase Dashboard > Authentication > Users, then run:
-- insert into public.lumo_admins (user_id) values ('OXEEZ_AUTH_USER_UUID');

notify pgrst, 'reload schema';
