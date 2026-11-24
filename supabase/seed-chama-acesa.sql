-- NÃO APLICADO. Cadastro da área "Chama Acesa" e dos 2 produtos (grátis e pago) no Gênio Play.
-- Aplicar DEPOIS da migração 20261123_chama_acesa.sql, no SQL Editor do Supabase (projeto painel-inteligente). Idempotente: pode rodar de novo.
-- Mesmo cadastro que a operação "criar área" do painel faz (lib/membros.ts), só que já com cor, ícone, e-mail e produtos.
--
-- DEDUZIDO do código: colunas de mp_settings/mp_products; área = linha de mp_settings com slug; produto de uma área = mp_products.area_id;
--   cadastro grátis aparece quando a área tem produto publicado com is_free = true (areaHasFree); webhook casa por mp_products.external_ids
--   no formato "cakto:<id do produto>" e "cakto:oferta:<id da oferta>" (app/api/webhooks/membros/[provider]/route.ts, função generic()).
-- SUPOSIÇÃO (confira antes de rodar): owner_email = brennoassis30@gmail.com (admin da área 1; com isso o link de vendas da área 1 também
--   libera esta área, via ownAreaIds()); preço do produto pago não informado (price_cents nulo; a venda é pelo checkout Cakto);
--   o id "dkkojfk" é o que a Cakto manda em data.offer.id.

begin;

insert into public.mp_settings (slug, brand_name, owner_email, accent, bg_color, logo_url, email_enabled, promo_enabled, support_url)
values ('chama-acesa', 'Chama Acesa', 'brennoassis30@gmail.com', '#ff8a1f', '#0a0f1f',
        'https://membros.bagencymidia.site/chama-acesa/icone-512.png', true, false, null)
on conflict (slug) do update set
  brand_name = excluded.brand_name,
  accent = excluded.accent,
  bg_color = excluded.bg_color,
  logo_url = excluded.logo_url,
  email_enabled = true;

-- Dono como administrador da área (acesso a /chama-acesa/admin).
insert into public.mp_admins (email, area_id)
select 'brennoassis30@gmail.com', id from public.mp_settings where slug = 'chama-acesa'
on conflict do nothing;

-- Produto GRÁTIS: existir publicado e gratuito é o que liga o "cadastro grátis" da área (dias 1 a 3 no app).
insert into public.mp_products (area_id, slug, title, subtitle, description, color, checkout_provider, published, is_free, position)
select id, 'chama-acesa-gratis', 'Chama Acesa · 3 dias grátis', 'Comece a sua chama hoje',
       '21 dias de consagração, 5 minutos por dia. Os 3 primeiros dias são grátis.', '#ff8a1f', 'cakto', true, true, 0
from public.mp_settings where slug = 'chama-acesa'
on conflict (area_id, slug) do update set title = excluded.title, subtitle = excluded.subtitle, published = true, is_free = true;

-- Produto PAGO: libera os 21 dias. A compra aprovada na Cakto casa por oferta ou produto.
insert into public.mp_products (area_id, slug, title, subtitle, description, color, checkout_provider, checkout_url, external_ids, access_days, published, is_free, position)
select id, 'chama-acesa-21-dias', 'Chama Acesa · 21 dias', 'A jornada completa',
       '21 dias de consagração com Deus: Palavra, oração e uma missão por dia, com a sua chama acesa.', '#ff8a1f', 'cakto',
       'https://pay.cakto.com.br/dkkojfk',
       array['cakto:oferta:dkkojfk', 'cakto:35a228c7-84aa-4364-a3fb-006a955cc302'], null, true, false, 1
from public.mp_settings where slug = 'chama-acesa'
on conflict (area_id, slug) do update set
  title = excluded.title, checkout_provider = 'cakto', checkout_url = excluded.checkout_url,
  external_ids = excluded.external_ids, published = true, is_free = false;

commit;

-- Conferência: deve vir 1 área e 2 produtos (1 grátis publicado, 1 pago com os 2 ids). webhook_secret = segredo do link do webhook da área.
select s.id as area_id, s.slug, s.brand_name, s.bg_color, s.email_enabled, s.owner_email, s.webhook_secret,
       p.slug as produto, p.is_free, p.published, p.external_ids, p.checkout_url
from public.mp_settings s
left join public.mp_products p on p.area_id = s.id
where s.slug = 'chama-acesa'
order by p.position;
