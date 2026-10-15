create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  name text,
  access_status text not null default 'pending'
    check (access_status in ('active', 'pending', 'refunded', 'expired', 'blocked')),
  access_expires_at timestamptz,
  cakto_customer_id text,
  cakto_purchase_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.entitlements (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  access_status text not null default 'pending'
    check (access_status in ('active', 'pending', 'refunded', 'expired', 'blocked')),
  access_expires_at timestamptz,
  cakto_customer_id text,
  cakto_purchase_id text,
  last_event_type text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  payload jsonb not null,
  month_key text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.copy_edits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  payload jsonb not null,
  month_key text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  event_id text not null,
  event_type text not null,
  payload jsonb not null,
  processed_at timestamptz not null default now(),
  unique (provider, event_id)
);

create table if not exists public.trend_opportunities (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  niche text not null,
  audience text not null,
  product_type text not null,
  category text not null,
  price text not null,
  score integer not null default 70 check (score between 1 and 100),
  status text not null default 'Promissor'
    check (status in ('Validado', 'Tendencia', 'Promissor')),
  promise text not null,
  sales_angle text not null,
  channel text not null,
  creative_formats jsonb not null default '[]'::jsonb,
  page_type text not null,
  strategic_insight text not null,
  tags jsonb not null default '[]'::jsonb,
  ad_signal text not null,
  search_signal text not null,
  trend_signal text not null,
  angle text not null,
  source text not null default 'manual',
  is_active boolean not null default true,
  collected_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_email_idx on public.profiles (email);
create index if not exists entitlements_email_idx on public.entitlements (email);
create index if not exists projects_user_month_idx on public.projects (user_id, month_key);
create index if not exists copy_edits_user_idx on public.copy_edits (user_id);
create index if not exists copy_edits_project_month_idx on public.copy_edits (project_id, month_key);
create index if not exists trend_opportunities_active_score_idx on public.trend_opportunities (is_active, score desc);
create index if not exists trend_opportunities_category_idx on public.trend_opportunities (category);

-- Mentor: uma linha por pergunta respondida (limite diário por aluno).
create table if not exists public.mentor_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  day_key text not null,
  tokens integer,
  created_at timestamptz not null default now()
);

create index if not exists mentor_messages_user_day_idx on public.mentor_messages (user_id, day_key);

alter table public.profiles enable row level security;
alter table public.entitlements enable row level security;
alter table public.projects enable row level security;
alter table public.copy_edits enable row level security;
alter table public.webhook_events enable row level security;
alter table public.trend_opportunities enable row level security;
alter table public.mentor_messages enable row level security;

revoke all on table public.profiles from anon, authenticated;
revoke all on table public.entitlements from anon, authenticated;
revoke all on table public.projects from anon, authenticated;
revoke all on table public.copy_edits from anon, authenticated;
revoke all on table public.webhook_events from anon, authenticated;
revoke all on table public.trend_opportunities from anon, authenticated;

grant select on table public.profiles to authenticated;
grant select, insert, update on table public.projects to authenticated;
grant select, insert on table public.copy_edits to authenticated;

drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile"
on public.profiles for select
to authenticated
using ((select auth.uid()) = id);

drop policy if exists "Users can view own projects" on public.projects;
create policy "Users can view own projects"
on public.projects for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can create own projects" on public.projects;
create policy "Users can create own projects"
on public.projects for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update own projects" on public.projects;
create policy "Users can update own projects"
on public.projects for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can view own copy edits" on public.copy_edits;
create policy "Users can view own copy edits"
on public.copy_edits for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can create own copy edits" on public.copy_edits;
create policy "Users can create own copy edits"
on public.copy_edits for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "No direct entitlement access" on public.entitlements;
create policy "No direct entitlement access"
on public.entitlements for all
to anon, authenticated
using (false)
with check (false);

drop policy if exists "No direct webhook event access" on public.webhook_events;
create policy "No direct webhook event access"
on public.webhook_events for all
to anon, authenticated
using (false)
with check (false);

drop policy if exists "No direct trend opportunity access" on public.trend_opportunities;
create policy "No direct trend opportunity access"
on public.trend_opportunities for all
to anon, authenticated
using (false)
with check (false);
