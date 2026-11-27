-- Chama Acesa: talentos (moeda), chama a restaurar e extras (Dia do Senhor, vigília, voto, brasa de irmão).
-- Tudo numa coluna jsonb para não precisar de migração a cada item novo.
alter table public.chama_perfil add column if not exists extras jsonb not null default '{}'::jsonb;
