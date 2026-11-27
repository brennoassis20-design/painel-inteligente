---
name: Gênio Play
description: Área de membros no padrão de streaming, régua Netflix; cores de fundo e de destaque configuradas por área.
colors:
  area-bg: "#101012"
  area-bg-raised: "#1c1c1e"
  area-card: "#262627"
  area-line: "#343435"
  area-accent: "#f2b441"
  area-on-accent: "#14110a"
  genio-play-bg: "#0A0C12"
  genio-play-accent: "#7040f2"
  ink: "#f5f5f6"
  ink-muted: "#a8a8b0"
  ink-soft: "#e4e4e8"
  nav-ink: "#d6d6db"
  pure-white: "#ffffff"
  button-ink: "#0b0b0c"
  ghost-gray: "#6d6d7466"
  lesson-number: "#6f6f78"
  avatar-gray: "#3a3a42"
  promo-green: "#22c55e"
  done-green: "#46c98a"
  alert-red: "#f06a6a"
  live-red: "#e5484d"
typography:
  display:
    fontFamily: "Figtree, system-ui, sans-serif"
    fontSize: "clamp(38px, 4.6vw, 68px)"
    fontWeight: 900
    lineHeight: 0.98
    letterSpacing: "-0.035em"
  headline:
    fontFamily: "Figtree, system-ui, sans-serif"
    fontSize: "clamp(28px, 3.4vw, 44px)"
    fontWeight: 900
    lineHeight: 1.02
    letterSpacing: "-0.03em"
  title:
    fontFamily: "Figtree, system-ui, sans-serif"
    fontSize: "clamp(18px, 1.6vw, 22px)"
    fontWeight: 800
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Figtree, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.5
  meta:
    fontFamily: "Figtree, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.3
  label:
    fontFamily: "Figtree, system-ui, sans-serif"
    fontSize: "11.5px"
    fontWeight: 600
rounded:
  xs: "4px"
  sm: "5px"
  md: "6px"
  lg: "8px"
  xl: "10px"
  sheet: "14px"
  pill: "99px"
spacing:
  gutter-mobile: "16px"
  gutter-desktop: "48px"
  rail-gap: "clamp(8px, 0.8vw, 12px)"
  row-gap: "clamp(26px, 3vw, 44px)"
  stack: "14px"
  button-gap: "10px"
  touch-min: "44px"
components:
  button-primary:
    backgroundColor: "{colors.pure-white}"
    textColor: "{colors.button-ink}"
    rounded: "{rounded.md}"
    padding: "0 22px"
    height: "48px"
  button-primary-hover:
    backgroundColor: "#ffffffd9"
  button-buy:
    backgroundColor: "{colors.area-accent}"
    textColor: "{colors.area-on-accent}"
    rounded: "{rounded.md}"
    padding: "0 22px"
    height: "48px"
  button-secondary:
    backgroundColor: "{colors.ghost-gray}"
    textColor: "{colors.pure-white}"
    rounded: "{rounded.md}"
    padding: "0 22px"
    height: "48px"
  button-small:
    rounded: "{rounded.sm}"
    padding: "0 12px"
    height: "36px"
  tile-cover:
    backgroundColor: "{colors.area-card}"
    rounded: "{rounded.md}"
    width: "clamp(118px, 15.5vw, 210px)"
  badge-new:
    backgroundColor: "{colors.area-accent}"
    textColor: "{colors.area-on-accent}"
    typography: "{typography.label}"
    padding: "4px 8px"
  progress-meter:
    backgroundColor: "{colors.area-accent}"
    height: "4px"
  input-field:
    backgroundColor: "{colors.area-bg-raised}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "12px 14px"
    height: "52px"
  tab-bar:
    textColor: "{colors.ink-muted}"
    typography: "{typography.label}"
    height: "52px"
  sheet:
    backgroundColor: "{colors.area-bg-raised}"
    rounded: "{rounded.xl}"
---

# Design System: Gênio Play

## Overview

**Creative North Star: "A Sala de Streaming"**

O Gênio Play executa o padrão de streaming escolhido pelo Brenno, com a Netflix como régua de acabamento. Não existe mundo visual próprio aqui: o mérito está em executar o canon sem enfeite e sem ironia. A tela é escura e neutra, as capas dos produtos fazem todo o trabalho de cor, e a interface recua para que o aluno ache a próxima aula em um toque. O billboard abre a home com o produto em andamento, os trilhos horizontais de capas 2:3 vêm logo embaixo, e no celular uma barra de abas fixa fica ao alcance do polegar.

O sistema é um esqueleto único para todas as áreas de membros. Cada produtor configura no admin duas cores, o fundo (`--gp-bg`) e o destaque (`--gp-accent`); todo o resto deriva delas por mistura. A área 1, Gênio Play, usa destaque roxo (#7040f2) sobre fundo azul-quase-preto (#0A0C12); outras áreas mantêm as cores que configuraram e continuam reconhecíveis como delas. Por isso o destaque é tratado como variável de área, nunca como cor de marca fixa, e só aparece onde trabalha.

Densidade de streaming: muita capa, pouco texto, tipografia pesada e compacta nos títulos, corpo em 16px para um público leigo e muitas vezes mais velho. Rejeições confirmadas: brilho (glow), botão com degradê e vidro (glass/blur).

**Key Characteristics:**
- Fundo neutro quase preto, texto branco, cinzas neutros; a cor vem das capas.
- Botão principal branco; secundário cinza translúcido; cor da área só para comprar.
- Destaque da área restrito a progresso, preço, selos e aula atual.
- Capas sem moldura, cantos de 6px, imagem sozinha e informação embaixo.
- Celular primeiro: barra de abas fixa, alvos de 44px ou mais, sheet que sobe de baixo.

## Colors

Paleta neutra escura com uma única voz de cor, a da área, configurada por produtor.

### Primary
- **Cor da Área** (`--gp-accent`, padrão do código #f2b441; Gênio Play #7040f2): a variável que cada produtor define no admin. Usada SÓ em barra de progresso (billboard, capa do trilho, cabeçalho do produto), botão e preço de compra (`Desbloquear por R$ …`), selo de capa (NOVO etc.), número da aula atual e ícones de material (pela variante clara `--gp-gold2`, destaque misturado com 38% de branco), cursor de digitação e seleção de texto. Nunca em fundo de seção, título, borda decorativa ou botão de assistir.
- **Tinta sobre a Cor da Área** (`--gp-on-accent`): calculada por `onAccent()` a partir da luminância do destaque; escuro (#14110a) sobre destaques claros, branco sobre destaques escuros como o roxo do Gênio Play. Nunca escolher à mão.

### Neutral
- **Fundo da Área** (`--gp-bg`, padrão #101012; Gênio Play #0A0C12): a tela inteira. Configurável por área.
- **Fundo Elevado** (`--gp-bg2`, fundo + 5% branco): painel do sino, campos (com 7%), sheet (com 4%).
- **Cartão** (`--gp-card`, fundo + 9% branco): capa sem imagem, cartões de aviso, aula atual, banner do cadeado, upsell.
- **Linha** (`--gp-line`, fundo + 15% branco): divisórias de módulo, borda da barra de abas, borda de campo e menu.
- **Tinta** (#f5f5f6): texto principal. **Tinta Suave** (#e4e4e8): texto sobre o billboard. **Tinta Apagada** (#a8a8b0): metadados, rótulos, aba inativa.
- **Cinza Translúcido** (#6d6d7466, hover #6d6d7499): botão secundário.

### Semânticas (fora do destaque)
- **Verde Promoção** (`--gp-promo`, #22c55e): preço com desconto, selo de -%, cartão e pílula de promoção. É o único verde de venda.
- **Verde Feito** (`--gp-ok`, #46c98a): aula concluída, confirmação.
- **Vermelho Alerta** (`--gp-bad`, #f06a6a): erro, contador do sino, faixa ao vivo. **Vermelho Ao Vivo** (#e5484d): só a etiqueta AO VIVO.

### Named Rules
**The Work-Only Accent Rule.** A cor da área só aparece onde informa estado ou preço: progresso, preço, selo, aula atual. Se o destaque estiver decorando, está errado.

**The Producer's Palette Rule.** Nenhuma regra pode depender do valor do destaque. Todo uso precisa funcionar com amarelo (#f2b441), roxo (#7040f2) ou qualquer cor que o produtor escolha; a tinta sobre ela vem sempre de `onAccent()` e os tons derivados sempre de `color-mix` com `--gp-bg`/`--gp-accent`.

## Typography

**Display Font:** Figtree (com system-ui, sans-serif)
**Body Font:** Figtree (com system-ui, -apple-system, Segoe UI, Roboto)

**Character:** Uma família só, carregada em `app/membros/layout.tsx` (pesos 400 a 900) e exposta como `--font-gp`. O contraste vem do peso: títulos em 800–900 com tracking negativo, corpo em 400–600 legível em tela pequena.

### Hierarchy
- **Display** (900, clamp(38px, 4.6vw, 68px), 0.98; 32px no celular): título do billboard. Um por tela.
- **Headline** (900, clamp(28px, 3.4vw, 44px), 1.02): título da tela do produto; título da sheet em 28px (24px no celular); login em 30px.
- **Title** (800, clamp(18px, 1.6vw, 22px)): cabeçalho de trilho; título da aula em 24px; módulo em 17px.
- **Body** (400, 16px, 1.5): corpo, botões (700), descrições até 68ch. Nunca abaixo de 16px no corpo do celular.
- **Meta** (400–700, 14px, 1.3): nome e estado embaixo da capa, posição da aula, progresso.
- **Label** (600, 11.5px): rótulo da barra de abas; selo da capa em 11px 800 maiúsculo com 0.03em.
- **Wordmark** (900, 22px, -0.035em): nome da área em texto quando não há logo.

### Named Rules
**The Weight-Not-Size Rule.** Hierarquia por peso e tracking, não por fonte nova. Uma família, Figtree, em toda área.

## Layout

Coluna de até 1400px centralizada, com gutter de 16px no celular (respeitando a área segura) e 48px a partir de 900px. O breakpoint principal é 899/900px: abaixo dele somem a navegação do topo e o billboard largo, e entram a barra de abas e o pôster.

- **Billboard** (desktop): ponta a ponta, altura min(82vh, 56.25vw), sobe 64px por baixo do topo transparente; texto à esquerda até 560px sobre véus em degradê do próprio fundo; os trilhos começam 72px por cima da borda inferior.
- **Billboard** (celular): pôster 2:3 (ou 4:5 quando há imagem móvel própria) centralizado, até 66vh, com texto, progresso e dois botões lado a lado sobrepostos na base.
- **Trilhos:** rolagem horizontal com snap, sangrando até a borda (margem negativa do gutter), colunas clamp(118px, 15.5vw, 210px) para capas 2:3 e clamp(250px, 25vw, 360px) para 16:9; setas só com mouse e a partir de 900px.
- **Ritmo vertical:** trilhos separados por clamp(26px, 3vw, 44px); pilhas internas em 14px; botões com 10px entre si.
- **Produto:** vídeo + lista de módulos em grade de 1fr + 380px, uma coluna abaixo de 860px.
- **Sheet:** até 560px centralizada; abaixo de 640px vira gaveta de baixo com cantos superiores de 14px e até 92dvh.
- **Toque:** alvos de 44px ou mais; botões de 48px; linhas de aula de 52px; abas de 52px.

## Elevation & Depth

Plano por padrão: profundidade vem de tons do próprio fundo (fundo, +4–5%, +9%) e da imagem das capas. Sombras existem só onde algo flutua sobre outra coisa, todas pretas e difusas, nunca coloridas.

### Shadow Vocabulary
- **Capa em foco** (`box-shadow: 0 10px 28px #000000b3, 0 0 0 2px #ffffffcc`): hover da capa no desktop, com escala de 1.035; o foco de teclado usa só o anel branco de 3px.
- **Pôster do billboard** (`box-shadow: 0 14px 36px #000000a6`): pôster no celular.
- **Menu e sino** (`box-shadow: 0 18px 40px #000a`): menus suspensos.
- **Sheet** (`box-shadow: 0 24px 60px #000c`): modal de detalhes e cadeado.

### Named Rules
**The No-Glow Rule.** Nenhuma sombra ou anel colorido, nenhum brilho, nenhum vidro. O único degradê permitido é o véu do próprio fundo sobre imagem (billboard, capa da sheet, topo transparente), que serve à legibilidade.

## Shapes

Cantos discretos e consistentes: 6px em capas, botões, campos, itens de menu e linhas de aula; 8px em cartões, vídeo e menu; 10px no pôster e na sheet; 14px só no topo da gaveta móvel; pílula (99px) para etiquetas. Botões de ícone, setas, avatar do sino e selo do cadeado são círculos. O selo da capa nasce colado na borda esquerda com cantos só do lado direito (0 4px 4px 0). Capas não têm moldura nem borda; cartões não têm borda (a separação é tonal), exceto campos, menu e barra de abas, que usam a Linha.

## Components

### Buttons
Diretos e pesados, no padrão de streaming.
- **Shape:** cantos suaves (6px), altura 48px, texto 16px peso 700, ícone de 18–22px à esquerda.
- **Principal (assistir/continuar):** branco puro com tinta #0b0b0c. É o botão de ação do aluno dono. No login, o botão de entrar também é branco.
- **Comprar:** fundo na cor da área com tinta de `onAccent()`; o preço vai dentro do botão. Só para desbloquear/comprar.
- **Secundário (Trailer, Aulas, Detalhes):** cinza translúcido (#6d6d7466) com texto branco.
- **Hover / Active / Focus:** branco a 85%, destaque com +12% de branco, cinza mais opaco; pressionado escala 0.98; foco com contorno branco de 2px e afastamento de 2px. Desabilitado em 60% de opacidade.
- **Pequeno:** 36px de altura, 14px, cantos de 5px.

### Capa (Tile)
A peça central da vitrine.
- **Imagem sozinha:** capa 2:3 (ou 16:9 em "Continuar assistindo"), cantos 6px, sem texto por cima; sem imagem, vira cartão na cor do produto com o título em 15px 800.
- **Por cima só sinais:** cadeado (círculo preto 28px no canto superior direito), selo na cor da área ou -% em verde promoção, barra de progresso de 4px na base na cor da área, botão play circular nas capas largas. Capa bloqueada recebe véu preto de 18%.
- **Embaixo:** nome (700, uma linha) e meta (preço, estado, "Aula N") em 14px.

### Billboard
Destaque da home com o produto em andamento: título display, até 3 linhas de texto, linha "Continuar: <aula>" com medidor de 4px (máx. 320px) na cor da área, e os botões principal + secundário. Sem rótulo acima do título.

### Barra de abas (celular)
Fixa na base abaixo de 900px, fundo = área escurecida 30%, borda superior na Linha, colunas iguais com ícone de 22px e rótulo de 11.5px 600. Inativa em Tinta Apagada, ativa em branco; a cor da área não entra na navegação.

### Topo e menu da conta
Topo transparente com véu sobre o billboard, sólido ao rolar; wordmark à esquerda, sino e avatar (quadrado de 6px, cinza #3a3a42, inicial em 800) à direita, alvos de 44px. Menu suspenso escuro (fundo − 35%), borda na Linha, itens de 44px com ícone em Tinta Apagada.

### Inputs / Fields
- **Style:** 52px de altura, fundo da área + 7% branco, borda na Linha, cantos 6px, texto 16px; rótulo em 14px 500 apagado acima.
- **Focus:** borda passa a branco, sem anel colorido; cursor na cor da área.
- **Error:** mensagem em Vermelho Alerta abaixo; sucesso em Verde Feito 600.

### Lista de módulos e aulas
Módulos em `details` separados pela Linha, título 17px 800 com seta desenhada em CSS. Aula em linha de 52px: número grande (19px 800, #6f6f78, tabular), título e duração. Aula atual: fundo Cartão, peso 700 e número na variante clara do destaque. Concluída: número vira check em Verde Feito.

### Sheet (detalhes / cadeado)
Capa 16:9 com véu para o fundo da sheet, título headline, o que o aluno ganha, preço e botão de compra em largura total; botão fechar circular preto 40px. Espera de liberação em cartão com spinner (borda superior na cor da área).

### Ícones
Conjunto próprio desenhado em SVG 24×24, traço único de 2px com pontas arredondadas, `currentColor`; play e cadeado preenchidos. Nunca emoji ou caractere no lugar de ícone.

## Do's and Don'ts

### Do:
- **Do** usar `var(--gp-accent)` apenas em progresso, preço/compra, selos e aula atual, e obter a tinta sobre ele com `onAccent()`.
- **Do** derivar superfícies de `--gp-bg` com `color-mix(in srgb, var(--gp-bg), #fff N%)` para que toda área configurada continue coerente.
- **Do** manter o botão principal branco (#fff com tinta #0b0b0c) e o secundário cinza translúcido (#6d6d7466).
- **Do** deixar a capa sozinha: título, preço e estado vão embaixo, fora da arte.
- **Do** testar cada tela com o destaque padrão (#f2b441) e com o do Gênio Play (#7040f2 sobre #0A0C12).
- **Do** manter corpo em 16px, alvos de 44px ou mais e foco com contorno branco de 2px.

### Don't:
- **Don't** fixar a cor de marca do Gênio Play no CSS; ela vem do admin como qualquer outra área.
- **Don't** usar a cor da área em fundos de seção, títulos, navegação ou no botão de assistir.
- **Don't** usar brilho (glow), sombra colorida, botão com degradê ou vidro/desfoque.
- **Don't** pôr rótulo pequeno acima do título (kicker/eyebrow) nem dividir o destaque em texto|imagem.
- **Don't** emoldurar capas nem escrever por cima delas.
- **Don't** usar emoji ou caractere como ícone.
