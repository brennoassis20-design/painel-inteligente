-- Máquina de Vídeos · PARTE 0 (rodar primeiro, SQL Editor do Supabase, projeto painel-inteligente). Idempotente.
-- Cria o bucket PRIVADO dos downloads (sem URL pública; o painel gera link assinado de 6 h só para quem tem acesso).
-- Limite do arquivo: 100 MB (o zip da v1 tem ~16 MB). Sem políticas RLS = ninguém lê pela chave anônima; só a chave de serviço do servidor.
insert into storage.buckets (id, name, public, file_size_limit)
values ('membros-privado', 'membros-privado', false, 104857600)
on conflict (id) do update set public = false, file_size_limit = 104857600;

select id, public, file_size_limit from storage.buckets where id = 'membros-privado';
