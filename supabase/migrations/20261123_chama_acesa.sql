-- NÃO APLICADO. Chama Acesa (v1): perfil e dias da jornada de 21 dias, na conta de cada pessoa.
-- Aplicar pelo SQL Editor do Supabase (ou `supabase db push`) só depois de revisar. Aditivo: cria tabelas novas, não mexe nas existentes.
-- O app grava pela rota /api/membros/chama (chave de serviço, sempre filtrando por user_id e aplicando as regras no servidor);
-- o RLS abaixo garante que ninguém lê nem altera registro de outra pessoa se falar direto com o Supabase.

-- Uma linha por pessoa: chama, brasas, medalhas, lembrete.
create table if not exists public.chama_perfil (
  user_id uuid primary key references auth.users (id) on delete cascade,
  area_id integer,
  inicio date,
  fuso text not null default 'America/Sao_Paulo',
  horario_lembrete text check (horario_lembrete is null or horario_lembrete ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  brasas integer not null default 0 check (brasas between 0 and 2),
  chama_atual integer not null default 0 check (chama_atual >= 0),
  maior_chama integer not null default 0 check (maior_chama >= 0),
  ultima_data date,
  medalhas text[] not null default '{}',
  avisos text[] not null default '{}',
  atualizado timestamptz not null default now()
);

-- Um dia da jornada por linha (1 a 21). concluido_em fica nulo enquanto faltar algum dos 3 checks.
create table if not exists public.chama_dias (
  user_id uuid not null references auth.users (id) on delete cascade,
  dia integer not null check (dia between 1 and 21),
  concluido_em date,
  checks jsonb not null default '{"leu":false,"orou":false,"missao":false}'::jsonb,
  jejum boolean not null default false,
  atualizado timestamptz not null default now(),
  primary key (user_id, dia)
);

-- Para o lembrete diário achar rápido quem tem horário marcado.
create index if not exists chama_perfil_lembrete_idx on public.chama_perfil (horario_lembrete) where horario_lembrete is not null;

alter table public.chama_perfil enable row level security;
alter table public.chama_dias enable row level security;

drop policy if exists chama_perfil_dono on public.chama_perfil;
create policy chama_perfil_dono on public.chama_perfil
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists chama_dias_dono on public.chama_dias;
create policy chama_dias_dono on public.chama_dias
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- anon não tem acesso nenhum.
revoke all on public.chama_perfil from anon;
revoke all on public.chama_dias from anon;
