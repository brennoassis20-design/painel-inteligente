---
version: 1
slug: "app-membros-page-tsx"
primary_target: "app/membros/page.tsx"
related_targets: ["app/membros/membros.css","app/membros/Login.tsx"]
---

# Gênio Play — área de membros (app/membros)

Scope: home da área, tela do produto/aula, cadeado/compra, login. Mode: operate. Vale para todas as áreas (cores por área), marca nova só na área 1.
Audience/job: aluno iniciante no celular; achar a próxima aula em 1 toque e comprar o próximo produto sem sair.
Constraints: --gp-bg/--gp-accent vêm do admin; Chama Acesa e Reforma renderizam dentro do mesmo shell; capas 2:3 e banners 16:9 existentes.

## Direction contract
THESIS: Canon de streaming escolhido pelo Brenno, régua Netflix, executado sem enfeite: recusa o "hero dividido texto|imagem com brilho roxo e rótulo em cima do título" que a versão atual e toda área gerada por IA entregam.
OWN-WORLD: fundo quase preto neutro (#0b0b0d), texto branco, cinzas neutros; a cor da área só em trabalho real (barra de progresso, selo NOVO/preço, aula atual); botão principal branco, secundário cinza translúcido; capas sem moldura, cantos 6px; nada de degradê em botão, glow, vidro.
STORY: o aluno abre, vê o produto em andamento em tela cheia com "Continuar · Aula N", toca e assiste; rolando, acha seus produtos e a loja com preço visível; toca no cadeado, vê o que ganha e compra; a área libera sozinha.
FIRST VIEWPORT: celular: wordmark à esquerda e sino à direita sobre o billboard; billboard 4:5 ocupando a largura com título grande embaixo, linha "Aula 3 de 25 · Tour do painel", barra de progresso, botões "Assistir" (branco) e "Detalhes"; barra de abas fixa embaixo (Início, Meus, Loja, Mais). Desktop: billboard 16:9 de ponta a ponta até ~78vh com texto à esquerda sobre véu, trilhos começando por cima da borda inferior.
FORM: canon (standing exit), list position n/a; seed:18ad696916be56f0
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
