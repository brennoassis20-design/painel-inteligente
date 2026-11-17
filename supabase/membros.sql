-- Gênio Play: área de membros própria (16/11/2026).
-- Tabelas com prefixo mp_. Acesso só pelo servidor (chave de serviço); RLS ligado e sem permissão para anon/authenticated.

create extension if not exists pgcrypto;

create table if not exists public.mp_settings (
  id integer primary key default 1 check (id = 1),
  brand_name text not null default 'Gênio Play',
  logo_url text,
  accent text not null default '#F2B441',
  hero_product_id uuid,
  hero_title text,
  hero_text text,
  support_url text,
  updated_at timestamptz not null default now()
);
insert into public.mp_settings (id) values (1) on conflict (id) do nothing;

create table if not exists public.mp_products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  subtitle text,
  description text,
  cover_url text,
  banner_url text,
  trailer_youtube text,
  color text not null default '#F2B441',
  price_cents integer,
  checkout_url text,
  checkout_provider text not null default 'hotmart',
  sales_page_url text,
  -- Ids do produto nas plataformas de venda, no formato "plataforma:id" (ex.: "hotmart:1234567", "cakto:uuid").
  external_ids text[] not null default '{}',
  -- Dias de acesso após a compra; vazio = vitalício.
  access_days integer,
  position integer not null default 0,
  published boolean not null default false,
  featured boolean not null default false,
  badge text,
  upsell_product_id uuid references public.mp_products(id) on delete set null,
  upsell_text text,
  -- 'painel' = produto que também dá acesso ao Painel Inteligente (Método Gênio).
  special text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.mp_modules (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.mp_products(id) on delete cascade,
  title text not null,
  cover_url text,
  position integer not null default 0,
  -- Libera N dias depois da compra (0 = na hora).
  release_days integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.mp_lessons (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.mp_products(id) on delete cascade,
  module_id uuid not null references public.mp_modules(id) on delete cascade,
  title text not null,
  description text,
  youtube_id text,
  video_url text,
  duration_min integer,
  materials jsonb not null default '[]'::jsonb,
  position integer not null default 0,
  free_preview boolean not null default false,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.mp_access (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  product_id uuid not null references public.mp_products(id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'refunded', 'expired', 'blocked')),
  expires_at timestamptz,
  provider text,
  order_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (email, product_id)
);

create table if not exists public.mp_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id uuid not null references public.mp_lessons(id) on delete cascade,
  product_id uuid not null references public.mp_products(id) on delete cascade,
  completed boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

-- Funil dentro da área: cadeado aberto, checkout aberto, compra liberada.
create table if not exists public.mp_events (
  id uuid primary key default gen_random_uuid(),
  email text,
  product_id uuid references public.mp_products(id) on delete set null,
  kind text not null,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Chaves do conector de IA (MCP). Guardamos só o hash.
create table if not exists public.mp_api_keys (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  prefix text not null,
  key_hash text not null unique,
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);

create table if not exists public.mp_admins (
  email text primary key,
  created_at timestamptz not null default now()
);

create index if not exists mp_products_position_idx on public.mp_products (position);
create index if not exists mp_modules_product_idx on public.mp_modules (product_id, position);
create index if not exists mp_lessons_module_idx on public.mp_lessons (module_id, position);
create index if not exists mp_lessons_product_idx on public.mp_lessons (product_id);
create index if not exists mp_access_email_idx on public.mp_access (email);
create index if not exists mp_progress_user_idx on public.mp_progress (user_id, updated_at desc);
create index if not exists mp_events_kind_idx on public.mp_events (kind, created_at desc);

alter table public.mp_settings enable row level security;
alter table public.mp_products enable row level security;
alter table public.mp_modules enable row level security;
alter table public.mp_lessons enable row level security;
alter table public.mp_access enable row level security;
alter table public.mp_progress enable row level security;
alter table public.mp_events enable row level security;
alter table public.mp_api_keys enable row level security;
alter table public.mp_admins enable row level security;

revoke all on table public.mp_settings, public.mp_products, public.mp_modules, public.mp_lessons, public.mp_access,
  public.mp_progress, public.mp_events, public.mp_api_keys, public.mp_admins from anon, authenticated;

-- Segredo do webhook universal (?secret=) e hottok da Hotmart (cabeçalho X-HOTMART-HOTTOK).
alter table public.mp_settings add column if not exists webhook_secret text not null default encode(gen_random_bytes(18), 'hex');
alter table public.mp_settings add column if not exists hotmart_hottok text;

insert into public.mp_admins (email) values ('brennoassis30@gmail.com'), ('brennoassis20@icloud.com') on conflict do nothing;

-- 16/11/2026 (noite): conteúdo gratuito, cadastro grátis (leads), notificações e avisos no celular (web push).
alter table public.mp_products add column if not exists is_free boolean not null default false;
create table if not exists public.mp_leads (email text primary key, user_id uuid references auth.users(id) on delete set null, name text, whatsapp text, source text not null default 'gratis', utm jsonb not null default '{}'::jsonb, created_at timestamptz not null default now());
create table if not exists public.mp_notifications (id uuid primary key default gen_random_uuid(), title text not null, body text, product_id uuid references public.mp_products(id) on delete set null, kind text not null default 'aviso', push_sent integer not null default 0, created_at timestamptz not null default now());
create unique index if not exists mp_notifications_produto_novo_uq on public.mp_notifications (product_id) where kind = 'produto_novo';
create index if not exists mp_notifications_created_idx on public.mp_notifications (created_at desc);
create table if not exists public.mp_notification_seen (user_id uuid primary key references auth.users(id) on delete cascade, seen_at timestamptz not null default now());
create table if not exists public.mp_push_subs (endpoint text primary key, user_id uuid references auth.users(id) on delete cascade, email text, p256dh text not null, auth text not null, user_agent text, created_at timestamptz not null default now());
-- Chaves VAPID do push: geradas pelo servidor na primeira vez (lib/membros-avisos.ts).
alter table public.mp_settings add column if not exists vapid_public text;
alter table public.mp_settings add column if not exists vapid_private text;
alter table public.mp_leads enable row level security;
alter table public.mp_notifications enable row level security;
alter table public.mp_notification_seen enable row level security;
alter table public.mp_push_subs enable row level security;
revoke all on table public.mp_leads, public.mp_notifications, public.mp_notification_seen, public.mp_push_subs from anon, authenticated;

-- 16/11: avisos com link (ao vivo), e-mail junto e aviso de módulo novo (um por módulo).
alter table public.mp_notifications
  add column if not exists url text,
  add column if not exists button_label text,
  add column if not exists starts_at timestamptz,
  add column if not exists module_id uuid references public.mp_modules(id) on delete set null,
  add column if not exists email_sent integer not null default 0;
create unique index if not exists mp_notifications_module_novo_uidx on public.mp_notifications (module_id) where kind = 'modulo_novo';

-- 16/11: multiprodutor. Parte 1 (aditiva, aplicada antes da publicação): cada linha de mp_settings é uma área.
alter table public.mp_settings drop constraint if exists mp_settings_id_check;
create sequence if not exists public.mp_settings_id_seq start 2 owned by public.mp_settings.id;
alter table public.mp_settings alter column id set default nextval('public.mp_settings_id_seq');
alter table public.mp_settings
  add column if not exists slug text,
  add column if not exists owner_email text,
  add column if not exists email_enabled boolean not null default false,
  add column if not exists created_at timestamptz not null default now();
update public.mp_settings set slug = 'genio-play', email_enabled = true where id = 1 and slug is null;
create unique index if not exists mp_settings_slug_uidx on public.mp_settings (slug);
create unique index if not exists mp_settings_webhook_secret_uidx on public.mp_settings (webhook_secret);
-- area_id (padrão 1) em mp_products, mp_api_keys, mp_admins, mp_leads, mp_notifications, mp_notification_seen, mp_push_subs, mp_events
-- + índices únicos (area_id, slug) / (area_id, email) / (endpoint, area_id) / (user_id, area_id) / (email, area_id).

-- Parte 2 (depois da publicação): tira as chaves antigas que valiam para o site inteiro.
alter table public.mp_products drop constraint if exists mp_products_slug_key;
alter table public.mp_leads drop constraint if exists mp_leads_pkey;
alter table public.mp_leads add constraint mp_leads_pkey primary key using index mp_leads_area_email_uidx;
alter table public.mp_push_subs drop constraint if exists mp_push_subs_pkey;
alter table public.mp_push_subs add constraint mp_push_subs_pkey primary key using index mp_push_subs_endpoint_area_uidx;
alter table public.mp_notification_seen drop constraint if exists mp_notification_seen_pkey;
alter table public.mp_notification_seen add constraint mp_notification_seen_pkey primary key using index mp_notification_seen_user_area_uidx;
alter table public.mp_admins drop constraint if exists mp_admins_pkey;
alter table public.mp_admins add constraint mp_admins_pkey primary key using index mp_admins_email_area_uidx;

-- 17/11 (reforma-app-popup): pop-up de ofertas (preço normal) para quem ainda não comprou. Aditivo.
alter table public.mp_settings add column if not exists offer_popup boolean not null default false;
alter table public.mp_settings add column if not exists email_from text;
alter table public.mp_settings add column if not exists email_reply_to text;
