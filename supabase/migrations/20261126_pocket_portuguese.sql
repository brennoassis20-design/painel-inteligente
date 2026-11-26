-- NÃO APLICADO. Pocket Portuguese: área + 5 produtos (Cakto, USD). Aditivo e idempotente; não mexe em dados existentes.
-- Aplicar no SQL Editor do Supabase (projeto painel-inteligente) só depois de revisar.
-- Regra "Complete libera os 3 pacotes": calculada na leitura (lib/pp.ts entitlementsFrom), sem tabela nova e sem linhas extras em mp_access.
-- Ids: vault Projetos/Pocket Portuguese/Cakto - produtos.md. Webhook casa por "cakto:<produto>" e "cakto:oferta:<oferta>".

begin;

-- Moeda do produto (price_cents passa a ser em centavos da moeda indicada). Padrão BRL: nada muda nas áreas atuais.
alter table public.mp_products add column if not exists currency text not null default 'BRL';

insert into public.mp_settings (slug, brand_name, owner_email, accent, bg_color, email_enabled, promo_enabled, support_url)
values ('pocket-portuguese', 'Pocket Portuguese', 'brennoassis30@gmail.com', '#0a8f4e', '#f6f4ee', false, false, null)
on conflict (slug) do update set brand_name = excluded.brand_name;
-- email_enabled=false de propósito: o e-mail de acesso do app sai por lib/pp-server.ts (Brevo, em inglês), não pelo fluxo padrão.

insert into public.mp_admins (email, area_id)
select 'brennoassis30@gmail.com', id from public.mp_settings where slug = 'pocket-portuguese'
on conflict do nothing;

insert into public.mp_products (area_id, slug, title, subtitle, color, checkout_provider, checkout_url, external_ids, price_cents, currency, access_days, published, is_free, position)
select s.id, v.slug, v.title, v.subtitle, '#0a8f4e', 'cakto', v.checkout_url, v.external_ids, v.price_cents, 'USD', null, true, false, v.position
from public.mp_settings s
cross join (values
  ('pp-core',        'Pocket Portuguese',               'Brazilian Portuguese for travelers', 'https://pay.cakto.com.br/d7tpcq7',
     array['cakto:83a59ff5-2eb6-4b2e-bd75-7a0675b5047b','cakto:oferta:d7tpcq7'], 990, 0),
  ('pp-rio-slang',   'Rio Slang Pack',                  'Talk like a carioca',                'https://pay.cakto.com.br/qewi5dv',
     array['cakto:8572ff60-9cb5-4bae-8c32-51408727e5ca','cakto:oferta:qewi5dv'], 590, 1),
  ('pp-love-family', 'Love & Family Pack',              'Dating and meeting the family',      'https://pay.cakto.com.br/mw42jhw',
     array['cakto:21a717a7-4bdc-499a-bbad-5388c505eed8','cakto:oferta:mw42jhw'], 690, 2),
  ('pp-carnaval',    'Carnaval & Nightlife Pack',       'Parties, blocos and nights out',     'https://pay.cakto.com.br/ar7noug',
     array['cakto:27ff6603-adc5-4e33-ad15-14bdbce507d7','cakto:oferta:ar7noug'], 590, 3),
  ('pp-complete',    'Pocket Portuguese Complete',      'All 3 packs in one',                 'https://pay.cakto.com.br/3cmj7rw',
     array['cakto:12db36d2-21b8-4614-84d7-173de4dcffca','cakto:oferta:3cmj7rw'], 2990, 4)
) as v(slug, title, subtitle, checkout_url, external_ids, price_cents, position)
where s.slug = 'pocket-portuguese'
on conflict (area_id, slug) do update set
  title = excluded.title, subtitle = excluded.subtitle, checkout_provider = 'cakto', checkout_url = excluded.checkout_url,
  external_ids = excluded.external_ids, price_cents = excluded.price_cents, currency = 'USD', published = true, is_free = false;

commit;

-- Conferência: 5 linhas, currency USD. webhook_secret = segredo da URL do webhook Cakto desta área.
select s.id as area_id, s.slug, s.webhook_secret, p.slug as produto, p.price_cents, p.currency, p.external_ids
from public.mp_settings s left join public.mp_products p on p.area_id = s.id
where s.slug = 'pocket-portuguese' order by p.position;
