-- Asya Ararat Travel: reviews database for Supabase.
-- Run this whole file once in Supabase -> SQL Editor -> New query -> Run.
-- It is safe to run again (it drops and recreates the policies).

-- 1) Tables -------------------------------------------------------------

create table if not exists public.reviews (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name       text not null check (char_length(name) between 1 and 80),
  trip       text check (trip is null or char_length(trip) <= 80),
  rating     int  not null check (rating between 1 and 5),
  text       text not null check (char_length(text) between 10 and 2000),
  status     text not null default 'pending' check (status in ('pending', 'published', 'hidden'))
);

create index if not exists reviews_status_created_idx on public.reviews (status, created_at desc);

-- People who are allowed to moderate reviews (filled in manually, see README).
create table if not exists public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade
);

-- 2) Helper: is the current logged-in user an admin? --------------------

create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

-- 3) Row Level Security ---------------------------------------------------

alter table public.reviews enable row level security;
alter table public.admins  enable row level security;

drop policy if exists "anyone can submit a pending review" on public.reviews;
drop policy if exists "anyone can read published reviews"  on public.reviews;
drop policy if exists "admin can read all reviews"         on public.reviews;
drop policy if exists "admin can update reviews"           on public.reviews;
drop policy if exists "admin can delete reviews"           on public.reviews;
drop policy if exists "admin can see own admin row"        on public.admins;

-- Visitors can only create reviews that are waiting for moderation.
create policy "anyone can submit a pending review"
  on public.reviews for insert
  to anon, authenticated
  with check (status = 'pending');

-- Visitors can only read reviews that were published.
create policy "anyone can read published reviews"
  on public.reviews for select
  to anon, authenticated
  using (status = 'published');

-- Admins can see everything, change the status and delete.
create policy "admin can read all reviews"
  on public.reviews for select
  to authenticated
  using (public.is_admin());

create policy "admin can update reviews"
  on public.reviews for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "admin can delete reviews"
  on public.reviews for delete
  to authenticated
  using (public.is_admin());

create policy "admin can see own admin row"
  on public.admins for select
  to authenticated
  using (user_id = auth.uid());

-- 4) Privileges -----------------------------------------------------------

grant usage on schema public to anon, authenticated;
grant insert, select on public.reviews to anon, authenticated;
grant update, delete on public.reviews to authenticated;
grant select on public.admins to authenticated;
