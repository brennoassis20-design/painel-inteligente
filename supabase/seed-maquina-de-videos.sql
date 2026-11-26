-- Máquina de Vídeos · área + produto + aulas. Rodar DEPOIS da parte 0 (bucket). Idempotente (pode rodar de novo).
-- PARTE 1 cria tudo DESPUBLICADO (produto sem checkout). PARTE 2 liga ao produto da Eduzz e publica (trocar EDUZZ_PRODUCT_ID e EDUZZ_CHECKOUT_URL).
-- Arquivos (no Storage privado, bucket membros-privado): maquina-de-videos/Maquina-de-Videos-v1.zip e maquina-de-videos/Pedidos-Prontos-Maquina-de-Videos.pdf
-- Para trocar pela v2: ver "Trocar a versão" no fim.

-- ===================== PARTE 1 =====================
begin;

insert into public.mp_settings (slug, brand_name, owner_email, accent, bg_color, hero_title, hero_text,
                                email_enabled, email_from, offer_popup, promo_enabled, support_url)
values ('maquina-de-videos', 'Máquina de Vídeos', 'brennoassis30@gmail.com', '#5a3df0', '#0d0d12',
        'Vídeos prontos para postar, feitos pelo Claude',
        'Baixe a Máquina, instale em poucos minutos e faça o seu primeiro vídeo.',
        true, 'contato@kitsepromocoes.site', false, false, null)
on conflict (slug) do update set
  brand_name = excluded.brand_name, accent = excluded.accent, bg_color = excluded.bg_color,
  hero_title = excluded.hero_title, hero_text = excluded.hero_text, email_enabled = true;

insert into public.mp_admins (email, area_id)
select 'brennoassis30@gmail.com', id from public.mp_settings where slug = 'maquina-de-videos'
on conflict do nothing;

insert into public.mp_products (area_id, slug, title, subtitle, description, cover_url, banner_url, color,
                                price_cents, checkout_provider, external_ids, position, published, is_free)
select id, 'maquina-de-videos', 'Máquina de Vídeos', 'A skill do Claude Code que faz seus vídeos',
       '14 formatos de vídeo vertical (Reels, TikTok, Shorts, anúncios) feitos pelo Claude: roteiro, voz, legenda palavra a palavra, montagem e finalização. Baixe, instale e faça o primeiro vídeo.',
       '/membros/capas/maquina-de-videos.jpg', '/membros/capas/maquina-de-videos-banner.jpg', '#5a3df0',
       9700, 'eduzz', '{}'::text[], 0, false, false
from public.mp_settings where slug = 'maquina-de-videos'
on conflict (area_id, slug) do update set
  title = excluded.title, subtitle = excluded.subtitle, description = excluded.description,
  cover_url = excluded.cover_url, banner_url = excluded.banner_url, color = excluded.color, price_cents = excluded.price_cents;

update public.mp_settings s set hero_product_id = p.id
from public.mp_products p where s.slug = 'maquina-de-videos' and p.area_id = s.id and p.slug = 'maquina-de-videos';

-- Módulos e aulas (só cria se ainda não existirem; para mudar texto depois, use o admin da área).
insert into public.mp_modules (product_id, title, position, release_days)
select p.id, m.title, m.pos, 0
from public.mp_products p join public.mp_settings s on s.id = p.area_id and s.slug = 'maquina-de-videos',
     (values ('Comece aqui', 0), ('Instalação', 1)) as m(title, pos)
where p.slug = 'maquina-de-videos'
  and not exists (select 1 from public.mp_modules x where x.product_id = p.id and x.title = m.title);

insert into public.mp_lessons (product_id, module_id, title, description, materials, position, published, free_preview)
select p.id, mo.id, l.title, l.descr, l.mat::jsonb, l.pos, true, false
from public.mp_products p
join public.mp_settings s on s.id = p.area_id and s.slug = 'maquina-de-videos'
join public.mp_modules mo on mo.product_id = p.id
join (values
  ('Comece aqui', 'Baixe a Máquina',
   E'Aqui está tudo o que você comprou. Baixe os dois arquivos abaixo:\n\n1) Máquina de Vídeos (.zip, cerca de 16 MB): a skill com os 14 formatos.\n2) Bônus: Pedidos Prontos (PDF): frases para copiar e colar no Claude.\n\nDepois de baixar, siga para o módulo "Instalação": são 3 passos e leva poucos minutos.\n\nO link de download vale por algumas horas. Se expirar, é só recarregar esta página. Se perder o acesso, entre de novo com o e-mail da compra.',
   '[{"titulo":"Baixar a Máquina de Vídeos (.zip)","url":"privado:maquina-de-videos/Maquina-de-Videos-v1.zip"},{"titulo":"Bônus: Pedidos Prontos (PDF)","url":"privado:maquina-de-videos/Pedidos-Prontos-Maquina-de-Videos.pdf"}]', 0),
  ('Instalação', 'Instalar no Mac',
   E'Vídeo da aula em breve. Enquanto isso, o passo a passo:\n\n1) Instale os programas no Terminal: brew install node ffmpeg whisper-cpp python@3.12\n2) Tenha o Claude Code instalado e a skill HyperFrames (npx skills add heygen-com/hyperframes).\n3) Descompacte o zip e copie a pasta maquina-de-videos para ~/.claude/skills/\n4) Rode uma vez no Terminal: bash ~/.claude/skills/maquina-de-videos/instalar.sh\n\nO instalador confere tudo e avisa o que faltar. O guia completo também está no arquivo LEIA-ME.md dentro do zip.',
   '[]', 0),
  ('Instalação', 'Instalar no Windows',
   E'Vídeo da aula em breve. No Windows é o mesmo caminho do Mac, direto no Claude Code:\n\n1) Instale o Claude Code no Windows (claude.ai/download) e entre com sua conta.\n2) Baixe o zip na aula \"Baixe a Máquina\" e descompacte.\n3) Abra o Claude Code na pasta descompactada e peça: \"instale a Máquina de Vídeos que está nesta pasta\".\n4) O Claude instala o que faltar (node, ffmpeg, python) e confere se ficou tudo certo.\n\nPronto: é só pedir o primeiro vídeo.',
   '[]', 1),
  ('Instalação', 'Seu primeiro vídeo',
   E'Vídeo da aula em breve. Com a Máquina instalada:\n\n1) Abra o Claude Code.\n2) Escreva, por exemplo: Faz um vídeo 3D explicando como funciona (o seu assunto).\n3) O Claude mostra o roteiro para você aprovar antes de gastar voz ou render.\n4) Aprovou? Ele entrega o .mp4 pronto, a capa e a legenda do post.\n\nPrecisa de ideias? Abra o PDF Pedidos Prontos, na aula "Baixe a Máquina".',
   '[{"titulo":"Bônus: Pedidos Prontos (PDF)","url":"privado:maquina-de-videos/Pedidos-Prontos-Maquina-de-Videos.pdf"}]', 2)
) as l(modulo, title, descr, mat, pos) on l.modulo = mo.title
where p.slug = 'maquina-de-videos'
  and not exists (select 1 from public.mp_lessons x where x.module_id = mo.id and x.title = l.title);

commit;

-- ===================== PARTE 2: depois que o produto existir na Eduzz =====================
-- Troque EDUZZ_PRODUCT_ID (só o número, ex. 3159000) e EDUZZ_CHECKOUT_URL (ex. https://chk.eduzz.com/xxxxxxxx). Descomente e rode.
-- update public.mp_products set external_ids = array['eduzz:EDUZZ_PRODUCT_ID'], checkout_url = 'EDUZZ_CHECKOUT_URL', published = true
--  where slug = 'maquina-de-videos' and area_id = (select id from public.mp_settings where slug = 'maquina-de-videos');

-- ===================== Plugar o vídeo de cada aula (quando as aulas ficarem prontas) =====================
-- YouTube não listado: cole o ID do vídeo (os 11 caracteres depois de v= ou youtu.be/). Ou use o admin: membros.bagencymidia.site/maquina-de-videos/admin
-- update public.mp_lessons set youtube_id = 'ID_DO_VIDEO', duration_min = 5
--  where title = 'Instalar no Mac' and product_id = (select p.id from public.mp_products p join public.mp_settings s on s.id = p.area_id where s.slug = 'maquina-de-videos' and p.slug = 'maquina-de-videos');
-- (repetir com 'Instalar no Windows' e 'Seu primeiro vídeo')

-- ===================== Trocar a versão (v2) =====================
-- Suba Maquina-de-Videos-v2.zip no Storage (bucket membros-privado, pasta maquina-de-videos) e rode:
-- update public.mp_lessons set materials = replace(materials::text, 'Maquina-de-Videos-v1.zip', 'Maquina-de-Videos-v2.zip')::jsonb where title = 'Baixe a Máquina' and product_id = (select p.id from public.mp_products p join public.mp_settings s on s.id = p.area_id where s.slug = 'maquina-de-videos' and p.slug = 'maquina-de-videos');
-- (ou suba com o MESMO nome v1 por cima, com upsert: ninguém precisa mudar nada.)

-- ===================== Conferência =====================
select s.id as area_id, s.slug, s.webhook_secret, p.slug as produto, p.published, p.external_ids,
       (select count(*) from public.mp_modules m where m.product_id = p.id) as modulos,
       (select count(*) from public.mp_lessons l where l.product_id = p.id) as aulas
from public.mp_settings s left join public.mp_products p on p.area_id = s.id
where s.slug = 'maquina-de-videos';
