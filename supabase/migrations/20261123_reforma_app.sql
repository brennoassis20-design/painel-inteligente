-- NÃO APLICADO. App da Reforma (v1): escritório e clientes do contador, na conta dele.
-- Aplicar pelo SQL Editor do Supabase (ou `supabase db push`). Aditivo: cria tabelas novas, não mexe nas existentes.
-- O app grava pela rota /api/membros/reforma (chave de serviço, sempre filtrando por user_id); o RLS abaixo
-- garante que ninguém lê nem altera registro de outra pessoa se falar direto com o Supabase.

create extension if not exists pgcrypto;

-- Um escritório por usuário (logo reduzida no navegador e guardada aqui mesmo, em data URL; sem bucket).
create table if not exists public.reforma_escritorios (
  user_id uuid primary key references auth.users (id) on delete cascade,
  area_id integer,
  nome text not null default '',
  crc text not null default '',
  whatsapp text not null default '',
  cor text not null default '#1F4E79' check (cor ~ '^#[0-9a-fA-F]{6}$'),
  logo text check (logo is null or (logo like 'data:image/%' and length(logo) <= 400000)),
  configurado boolean not null default false,
  updated_at timestamptz not null default now()
);

-- Vários clientes por usuário; o formulário inteiro fica em `dados` (jsonb) e o resultado é recalculado na abertura.
create table if not exists public.reforma_clientes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  nome text not null default '',
  rascunho boolean not null default true,
  passo integer not null default 1 check (passo between 1 and 5),
  dados jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists reforma_clientes_user_idx on public.reforma_clientes (user_id, updated_at desc);

alter table public.reforma_escritorios enable row level security;
alter table public.reforma_clientes enable row level security;

drop policy if exists reforma_escritorios_dono on public.reforma_escritorios;
create policy reforma_escritorios_dono on public.reforma_escritorios
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists reforma_clientes_dono on public.reforma_clientes;
create policy reforma_clientes_dono on public.reforma_clientes
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- anon não tem acesso nenhum.
revoke all on public.reforma_escritorios from anon;
revoke all on public.reforma_clientes from anon;
