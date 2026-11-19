-- NÃO APLICADO. Trava de e-mail duplicado: um evento acesso_email por (e-mail, pedido).
-- O código (lib/membros-acesso-email.ts) funciona sem este índice (checa os últimos 10 min), mas só com ele a corrida
-- entre webhooks simultâneos da Eduzz (1 por item do pedido) fica 100% garantida pelo banco.
create unique index if not exists mp_events_acesso_email_uq
  on public.mp_events (email, (meta->>'order'))
  where kind = 'acesso_email';
