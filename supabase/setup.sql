-- Stickman Fight: run this once in Supabase → SQL Editor → New query → Run.
-- It makes the table for online saves. Each signed-in player can only see and change their own save.

create table if not exists public.saves (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.saves enable row level security;

drop policy if exists "read own save" on public.saves;
drop policy if exists "insert own save" on public.saves;
drop policy if exists "update own save" on public.saves;

create policy "read own save" on public.saves
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "insert own save" on public.saves
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "update own save" on public.saves
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

grant select, insert, update on public.saves to authenticated;

-- ---------- Friends (Google sign-in only) ----------
-- Safe to run again. Players never read these tables directly: the sf_* functions below
-- only give back your own friend code, your own friends and invites sent to you.

create table if not exists public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  friend_code text not null unique,
  name text not null default '',
  last_seen timestamptz not null default now()
);

create table if not exists public.friends (
  user_id uuid not null references auth.users (id) on delete cascade,
  friend_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, friend_id),
  check (user_id <> friend_id)
);

create table if not exists public.invites (
  id bigint generated always as identity primary key,
  from_user uuid not null references auth.users (id) on delete cascade,
  to_user uuid not null references auth.users (id) on delete cascade,
  from_name text not null default '',
  room_code text not null,
  created_at timestamptz not null default now()
);
create index if not exists invites_to_user on public.invites (to_user, created_at);

alter table public.profiles enable row level security;
alter table public.friends enable row level security;
alter table public.invites enable row level security;

drop policy if exists "read own profile" on public.profiles;
drop policy if exists "read own friends" on public.friends;
drop policy if exists "read own invites" on public.invites;
drop policy if exists "delete own invites" on public.invites;

create policy "read own profile" on public.profiles
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "read own friends" on public.friends
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "read own invites" on public.invites
  for select to authenticated using ((select auth.uid()) = to_user);
create policy "delete own invites" on public.invites
  for delete to authenticated using ((select auth.uid()) = to_user);

revoke all on public.profiles, public.friends, public.invites from anon;
grant select on public.profiles, public.friends to authenticated;
grant select, delete on public.invites to authenticated;

-- Your friend code (made the first time) + "I'm online" ping with your name.
create or replace function public.sf_me(p_name text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  code text;
begin
  if me is null then
    raise exception 'not signed in';
  end if;
  select friend_code into code from public.profiles where user_id = me;
  if code is null then
    loop
      code := '';
      for i in 1..8 loop
        code := code || substr('ABCDEFGHJKMNPQRSTUVWXYZ23456789', 1 + floor(random() * 31)::int, 1);
      end loop;
      exit when not exists (select 1 from public.profiles where friend_code = code);
    end loop;
    insert into public.profiles (user_id, friend_code) values (me, code) on conflict (user_id) do nothing;
    select friend_code into code from public.profiles where user_id = me;
  end if;
  update public.profiles
    set name = left(coalesce(nullif(trim(p_name), ''), name), 12), last_seen = now()
    where user_id = me;
  return code;
end;
$$;

-- Add a friend by their code. Both players become friends.
create or replace function public.sf_add_friend(p_code text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  other uuid;
begin
  if me is null then
    raise exception 'not signed in';
  end if;
  select user_id into other from public.profiles where friend_code = upper(trim(p_code));
  if other is null then
    return 'notFound';
  end if;
  if other = me then
    return 'self';
  end if;
  if (select count(*) from public.friends where user_id = me) >= 200 then
    return 'full';
  end if;
  insert into public.friends (user_id, friend_id) values (me, other), (other, me) on conflict do nothing;
  return 'ok';
end;
$$;

create or replace function public.sf_remove_friend(p_friend uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.friends
  where (user_id = auth.uid() and friend_id = p_friend)
     or (user_id = p_friend and friend_id = auth.uid());
$$;

-- Your friends, and who has been online in the last 2.5 minutes.
create or replace function public.sf_friends()
returns table (friend_id uuid, name text, friend_code text, online boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select p.user_id, p.name, p.friend_code, p.last_seen > now() - interval '150 seconds'
  from public.friends f
  join public.profiles p on p.user_id = f.friend_id
  where f.user_id = auth.uid();
$$;

-- Invite a friend to your room (at most once every 10 seconds per friend).
create or replace function public.sf_invite(p_friend uuid, p_room text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
begin
  if me is null then
    raise exception 'not signed in';
  end if;
  if not exists (select 1 from public.friends where user_id = me and friend_id = p_friend) then
    return 'notFriend';
  end if;
  if p_room !~ '^[A-Z0-9]{6}$' then
    return 'badRoom';
  end if;
  delete from public.invites where created_at < now() - interval '10 minutes';
  if exists (
    select 1 from public.invites
    where from_user = me and to_user = p_friend and created_at > now() - interval '10 seconds'
  ) then
    return 'wait';
  end if;
  insert into public.invites (from_user, to_user, from_name, room_code)
    values (me, p_friend, coalesce((select name from public.profiles where user_id = me), ''), p_room);
  return 'ok';
end;
$$;

revoke execute on function public.sf_me(text) from public, anon;
revoke execute on function public.sf_add_friend(text) from public, anon;
revoke execute on function public.sf_remove_friend(uuid) from public, anon;
revoke execute on function public.sf_friends() from public, anon;
revoke execute on function public.sf_invite(uuid, text) from public, anon;
grant execute on function public.sf_me(text) to authenticated;
grant execute on function public.sf_add_friend(text) to authenticated;
grant execute on function public.sf_remove_friend(uuid) to authenticated;
grant execute on function public.sf_friends() to authenticated;
grant execute on function public.sf_invite(uuid, text) to authenticated;

-- Invites pop up right away (Realtime). If this fails, invites still arrive within a minute.
do $$
begin
  alter publication supabase_realtime add table public.invites;
exception
  when duplicate_object or undefined_object then null;
end;
$$;
