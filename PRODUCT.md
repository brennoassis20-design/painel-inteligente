# Product

<!-- impeccable:product-schema 1 -->

## Platform

web (PWA instalável; maioria dos acessos pelo celular)

## Users
- **Primário:** aluno iniciante, no celular. Chegou pelo Instagram ou por anúncio, comprou o Método Gênio ou um produto pronto de R$ 9,90–67 para revender, e entra para assistir aula, baixar o produto e voltar de onde parou. Pouca intimidade com tecnologia; costuma entrar pelo link do e-mail ou pelo app instalado na tela inicial.
- **Secundário:** visitante do cadastro grátis (/gratis) que ainda não comprou; e o dono da área (Brenno ou produtor convidado) em /admin.

## Product Purpose
Área de membros própria (fora da Cakto/Hotmart), estilo streaming: tudo visível num lugar só; o que o aluno tem abre, o que não tem mostra cadeado e abre o pagamento sem sair da área, liberando sozinho quando a venda cai. Sucesso = aluno acha a aula certa em segundos, termina módulos e compra o próximo produto de dentro da área.

## Positioning
Não é uma “plataforma de cursos”: é a vitrine dos produtos do Brenno onde aprender e comprar acontecem na mesma tela, com liberação automática pelo webhook de qualquer checkout (Eduzz, Ticto, Cakto) e o Claude conectado por MCP.

## Operating Context
- Endereço: membros.bagencymidia.site (e /<slug> por produtor). Login por e-mail + senha, link mágico ou convite.
- Aulas em YouTube não listado; materiais e downloads (zip/PDF) no Storage.
- Sino de avisos, push no celular, faixa “ao vivo”, promoção com cronômetro, pop-up de ofertas, “instalar app”.
- Apps dentro da área: Reforma (simulador), Chama Acesa (app cristão com tema próprio) — não redesenhados aqui.

## Capabilities and Constraints
- Next.js (app/membros), um único CSS (`membros.css`, prefixo `gp-`), cores por área configuráveis: `--gp-bg` e `--gp-accent` vindas do admin. O layout novo vale para **todas** as áreas; a marca nova só para a área 1 (Gênio Play). Cada produtor mantém as cores que configurou.
- Capas de produto 2:3 (1000×1500) e banners 16:9 já existem e são geridos no admin; o layout precisa funcionar com capa ausente.
- Não quebrar: checkout/espera de liberação, rastreio (pixel, UTM), promo, avisos, Chama Acesa e Reforma.

## Brand Commitments
- Nome **Gênio Play** (intocável). Resto da identidade visual livre para refazer (decisão do Brenno, 27/11/2026).
- Produtos nunca chamados de guia/ebook/leitura; nada de mockup de PDF.
- Português do Brasil, linguagem simples, tratamento por “você”.

## Evidence on Hand
- Capas e banners dos produtos no bucket `membros` do Supabase. Aulas gravadas pelo Brenno (rosto real) no YouTube.
- Não há depoimentos nem números de alunos aprovados para usar na área — não inventar.

## Product Principles
1. Um toque até a aula: o aluno nunca procura o que já comprou.
2. Cadeado vende sem empurrar: o que falta aparece com preço e libera sozinho.
3. Celular primeiro, polegar primeiro.
4. Cada produtor reconhece a própria área (cores dele), o esqueleto é o mesmo.

## Accessibility & Inclusion
Público leigo e muitas vezes mais velho: texto de corpo ≥16px no celular, contraste AA, alvos de toque ≥44px, sem depender de passar o mouse.

### Preferência de estilo (27/11/2026)
O Brenno escolheu o padrão de streaming (régua de acabamento: Netflix) em vez de um mundo visual próprio. Executar o padrão com capricho, sem ironia nem enfeite.
