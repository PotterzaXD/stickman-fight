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
