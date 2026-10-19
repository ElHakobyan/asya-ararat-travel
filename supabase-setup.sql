-- Asya Ararat Travel: reviews database for Supabase.
-- Run this whole file once in Supabase -> SQL Editor -> New query -> Run.
-- It is safe to run again (it drops and recreates the policies).

-- 1) Tables -------------------------------------------------------------

-- A review is just a star rating (1-5). name / trip / text are optional
-- and are not used by the site for now.
create table if not exists public.reviews (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  rating     int  not null check (rating between 1 and 5),
  status     text not null default 'pending' check (status in ('pending', 'published', 'hidden')),
  name       text,
  trip       text,
  text       text
);

-- If an earlier version of this file was run before, relax its old rules.
alter table public.reviews alter column name drop not null;
alter table public.reviews alter column text drop not null;
alter table public.reviews drop constraint if exists reviews_name_check;
alter table public.reviews drop constraint if exists reviews_text_check;
alter table public.reviews drop constraint if exists reviews_trip_check;
alter table public.reviews drop constraint if exists reviews_name_len;
alter table public.reviews drop constraint if exists reviews_trip_len;
alter table public.reviews drop constraint if exists reviews_text_len;
alter table public.reviews add constraint reviews_name_len check (name is null or char_length(name) <= 80);
alter table public.reviews add constraint reviews_trip_len check (trip is null or char_length(trip) <= 80);
alter table public.reviews add constraint reviews_text_len check (text is null or char_length(text) <= 2000);

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

-- Public summary for the website: average rating and how many of each star.
-- Only published ratings are counted. Returns one JSON object.
create or replace function public.rating_summary()
returns json
language sql
security definer
stable
set search_path = public
as $$
  select json_build_object(
    'total',   count(*),
    'average', coalesce(round(avg(rating)::numeric, 1), 0),
    'counts',  json_build_object(
      '1', count(*) filter (where rating = 1),
      '2', count(*) filter (where rating = 2),
      '3', count(*) filter (where rating = 3),
      '4', count(*) filter (where rating = 4),
      '5', count(*) filter (where rating = 5)
    )
  )
  from public.reviews
  where status = 'published';
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

-- Visitors can read published rows (the site itself only asks for the summary).
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
grant execute on function public.rating_summary() to anon, authenticated;
