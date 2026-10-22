-- AI sales agent: tables for captured leads and chat rate limiting.
-- Run once in Supabase -> SQL Editor (after supabase-setup.sql, which creates is_admin()). Safe to run again.

create table if not exists public.leads (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  name          text,
  contact       text not null,
  tour_interest text,
  travelers     int,
  dates         text,
  budget        text,
  readiness     text not null default 'warm' check (readiness in ('hot','warm','cold')),
  summary       text,
  language      text,
  status        text not null default 'new' check (status in ('new','contacted','won','lost')),
  note          text,
  session_id    text,
  transcript    jsonb
);
create index if not exists leads_status_created_idx on public.leads (status, created_at desc);

-- One row per chat request: used only to limit abuse and cost. IPs are stored hashed.
create table if not exists public.chat_events (
  id         bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  ip_hash    text not null
);
create index if not exists chat_events_ip_idx on public.chat_events (ip_hash, created_at desc);
create index if not exists chat_events_time_idx on public.chat_events (created_at desc);

alter table public.leads       enable row level security;
alter table public.chat_events enable row level security;

drop policy if exists "admin reads leads"   on public.leads;
drop policy if exists "admin updates leads" on public.leads;
drop policy if exists "admin deletes leads" on public.leads;

-- Visitors have NO access to either table. The Edge Function writes with the service role (bypasses RLS).
create policy "admin reads leads"   on public.leads for select to authenticated using (public.is_admin());
create policy "admin updates leads" on public.leads for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin deletes leads" on public.leads for delete to authenticated using (public.is_admin());

revoke all on public.leads, public.chat_events from anon;
grant select, update, delete on public.leads to authenticated;
revoke all on public.chat_events from authenticated;
-- The Edge Function uses the service role: make its rights explicit.
grant usage on schema public to service_role;
grant all on public.leads, public.chat_events to service_role;

-- Housekeeping: drop rate-limit rows older than 3 days (run occasionally, or schedule with pg_cron).
-- delete from public.chat_events where created_at < now() - interval '3 days';
