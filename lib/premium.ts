// Lâmpada de Ouro: edição premium do produto, no nível do que o Claude faz à mão (cardápio do Kit Produto Pronto).
// Uma IA forte reescreve o produto em páginas com estrutura própria do nicho (cartões de receita, listas para marcar,
// tabelas, registro), pede fotos reais por IA e o servidor diagrama em A4. Tudo roda com a chave OpenRouter do aluno:
// o painel não guarda a chave (fica no navegador e vem no cabeçalho de cada pedido).
import { languageOf } from "@/lib/locale";
import { resolveDocumentPalette, type DocumentPalette, type DocumentProduct } from "@/lib/product-document";
import { requestAiJson, type ProductResult } from "@/lib/product-engine";

export const PREMIUM_KEY_HEADER = "x-openrouter-key";
export const defaultPremiumModel = "anthropic/claude-sonnet-5.5";
export const defaultPremiumImageModel = "google/gemini-3.1-flash-image";
export const premiumModel = () => process.env.PREMIUM_MODEL?.trim() || defaultPremiumModel;
export const premiumImageModel = () => process.env.PREMIUM_IMAGE_MODEL?.trim() || defaultPremiumImageModel;

export type PremiumBlock =
  | { type: "cards"; items: { title: string; badge?: string; aLabel?: string; a: string[]; bLabel?: string; b: string[]; tip?: string }[] }
  | { type: "checklist"; title?: string; groups: { name: string; items: string[] }[] }
  | { type: "table"; columns: string[]; rows: string[][] }
  | { type: "steps"; items: { title: string; text: string }[] }
  | { type: "tips"; items: { title: string; text: string }[] }
  | { type: "swap"; title?: string; items: { from: string; to: string }[] }
  | { type: "tracker"; title?: string; rows: string[]; fields: string[] }
  | { type: "callout"; title: string; text: string }
  | { type: "text"; text: string };

export type PremiumPage = { tag: string; title: string; lead: string; photo?: string; blocks: PremiumBlock[] };

export type PremiumEdition = {
  version: 1;
  createdAt: string;
  cover: { tag: string; title: string; highlight: string; subtitle: string; badges: string[]; photo: string };
  pages: PremiumPage[];
  creativePhotos: string[];
  closing: { title: string; text: string };
  // Anúncios da Lâmpada de Ouro (rota /api/premium/ads): falam com o comprador final.
  ads?: PremiumAd[];
};

export type PremiumAd = { angle: string; headline: string; support: string; photo: string; caption: string };

// Fotos: capa (vertical), faixa do topo das páginas (larga) e fundos dos criativos (4:5).
export type PremiumPhoto = { id: string; prompt: string; aspect: string };

const MAX_PAGES = 14;
const MAX_PAGE_PHOTOS = 7;

// Emojis e símbolos (⏱ ★ ✓ →) não existem nas fontes do PDF e viram quadradinho: saem do texto.
const SYMBOLS = /[\u2190-\u2BFF\u{1F000}-\u{1FFFF}]|\uFE0F|\u200D/gu;
const str = (value: unknown, max = 400) =>
  typeof value === "string" ? value.replace(SYMBOLS, "").replace(/\s+/g, " ").trim().slice(0, max) : "";
const strs = (value: unknown, count: number, max = 200) =>
  (Array.isArray(value) ? value : []).map((item) => str(item, max)).filter(Boolean).slice(0, count);
const list = (value: unknown, count: number) => (Array.isArray(value) ? value : []).slice(0, count) as Record<string, unknown>[];

function normalizeBlock(raw: Record<string, unknown>): PremiumBlock | null {
  switch (raw?.type) {
    case "cards": {
      const items = list(raw.items, 4)
        .map((item) => ({
          title: str(item.title, 80),
          badge: str(item.badge, 30),
          aLabel: str(item.aLabel, 30),
          a: strs(item.a, 9, 90),
          bLabel: str(item.bLabel, 30),
          b: strs(item.b, 6, 220),
          tip: str(item.tip, 200),
        }))
        .filter((item) => item.title && (item.a.length || item.b.length));
      return items.length ? { type: "cards", items } : null;
    }
    case "checklist": {
      const groups = list(raw.groups, 6)
        .map((group) => ({ name: str(group.name, 50), items: strs(group.items, 12, 90) }))
        .filter((group) => group.items.length);
      return groups.length ? { type: "checklist", title: str(raw.title, 80), groups } : null;
    }
    case "table": {
      const columns = strs(raw.columns, 5, 40);
      const rows = (Array.isArray(raw.rows) ? raw.rows : []).slice(0, 14).map((row) => strs(row, columns.length, 120)).filter((row) => row.length);
      return columns.length >= 2 && rows.length ? { type: "table", columns, rows } : null;
    }
    case "steps":
    case "tips": {
      const items = list(raw.items, raw.type === "tips" ? 6 : 8)
        .map((item) => ({ title: str(item.title, 70), text: str(item.text, 260) }))
        .filter((item) => item.title);
      return items.length ? { type: raw.type, items } : null;
    }
    case "swap": {
      const items = list(raw.items, 10)
        .map((item) => ({ from: str(item.from, 60), to: str(item.to, 90) }))
        .filter((item) => item.from && item.to);
      return items.length ? { type: "swap", title: str(raw.title, 80), items } : null;
    }
    case "tracker": {
      const rows = strs(raw.rows, 14, 60);
      return rows.length ? { type: "tracker", title: str(raw.title, 80), rows, fields: strs(raw.fields, 3, 30) } : null;
    }
    case "callout":
      return str(raw.text) ? { type: "callout", title: str(raw.title, 80), text: str(raw.text, 500) } : null;
    case "text":
      return str(raw.text) ? { type: "text", text: str(raw.text, 700) } : null;
    default:
      return null;
  }
}

export function normalizeEdition(raw: unknown): PremiumEdition | null {
  const data = raw as Record<string, unknown>;
  const cover = (data?.cover || {}) as Record<string, unknown>;
  let photos = 0;
  const pages = list(data?.pages, MAX_PAGES)
    .map((page) => {
      const blocks = list(page.blocks, 4).map(normalizeBlock).filter((block): block is PremiumBlock => Boolean(block));
      const wantsPhoto = str(page.photo, 400);
      const photo = wantsPhoto && photos < MAX_PAGE_PHOTOS ? (photos++, wantsPhoto) : "";
      return { tag: str(page.tag, 40), title: str(page.title, 70), lead: str(page.lead, 260), photo: photo || undefined, blocks };
    })
    .filter((page) => page.title && page.blocks.length);
  const title = str(cover.title, 70);
  if (!title || pages.length < 5) return null;
  const closing = (data?.closing || {}) as Record<string, unknown>;
  return {
    version: 1,
    // A data é a identidade das fotos no Storage: edição já salva mantém a dela.
    createdAt: typeof data.createdAt === "string" && !Number.isNaN(Date.parse(data.createdAt)) ? data.createdAt : new Date().toISOString(),
    cover: {
      tag: str(cover.tag, 40),
      title,
      highlight: str(cover.highlight, 40),
      subtitle: str(cover.subtitle, 160),
      badges: strs(cover.badges, 3, 40),
      photo: str(cover.photo, 400),
    },
    pages,
    creativePhotos: strs(data?.creativePhotos, 3, 400),
    closing: { title: str(closing.title, 70), text: str(closing.text, 500) },
    ads: normalizeAds(data?.ads),
  };
}

function normalizeAds(raw: unknown) {
  const ads = list(raw, 6)
    .map((ad) => ({ angle: str(ad.angle, 40), headline: str(ad.headline, 60), support: str(ad.support, 110), photo: str(ad.photo, 30), caption: str(ad.caption, 900) }))
    .filter((ad) => ad.headline);
  return ads.length >= 3 ? ads : undefined;
}

const ADS_SYSTEM = `Você é copywriter de resposta direta para anúncios de imagem no Instagram e Facebook (produto digital de R$ 9,90 a R$ 47).
Escreva 6 anúncios para vender o produto ao COMPRADOR FINAL (a pessoa que tem o problema), nunca para quem quer vender o produto.
Formato aprovado: frase grande em caixa alta no topo, uma linha de apoio, a foto do resultado e o preço embaixo.
Regras:
- headline: 2 a 6 palavras, pergunta de dor ou promessa concreta com número (ex.: "Enjoou do pão de manhã?", "14 marmitas em 2 horas", "Seu cardápio da semana pronto").
- support: até 12 palavras, concreto (o que recebe, tempo, quantidade). Sem exagero nem promessa de cura.
- angle: nome curto do ângulo (Dor, Resultado, Quantidade, Facilidade, Rotina, Oferta).
- photo: escolha UM id da lista de fotos que combine com a frase.
- caption: legenda do anúncio, 3 a 5 linhas curtas, termina com chamada para clicar. Sem preço na legenda.
- Nunca use guia, ebook, apostila, livro, leitura, ler, páginas, capítulos, manual (nem em espanhol). Sem emojis.
Responda só com o JSON: {"ads":[{"angle","headline","support","photo","caption"}]}`;

export async function createPremiumAds(apiKey: string, edition: PremiumEdition, product: ProductResult) {
  const spanish = languageOf(product) === "es";
  const photos = premiumPhotos(edition).map((photo) => `${photo.id}: ${photo.prompt}`).join("\n");
  const prompt = `Produto: ${edition.cover.title}
Promessa: ${edition.cover.subtitle}
Destaques: ${edition.cover.badges.join(" · ")}
O que tem dentro: ${edition.pages.map((page) => page.title).join(" · ")}
Fotos disponíveis (id: descrição):
${photos}

Idioma: ${spanish ? "espanhol neutro da América Latina" : "português do Brasil"}.`;
  const ads = normalizeAds(((await requestAiJson(apiKey, ADS_SYSTEM, prompt, 3000, premiumModel())) as { ads?: unknown }).ads);
  if (!ads) throw new Error("A IA não devolveu os anúncios. Tente de novo.");
  const ids = new Set(premiumPhotos(edition).map((photo) => photo.id));
  // Foto inexistente → usa as de anúncio em rodízio.
  return ads.map((ad, index) => (ids.has(ad.photo) ? ad : { ...ad, photo: edition.creativePhotos.length ? `criativo-${(index % edition.creativePhotos.length) + 1}` : "capa" }));
}

export function premiumPhotos(edition: PremiumEdition): PremiumPhoto[] {
  const photos: PremiumPhoto[] = [];
  if (edition.cover.photo) photos.push({ id: "capa", prompt: edition.cover.photo, aspect: "3:4" });
  edition.pages.forEach((page, index) => page.photo && photos.push({ id: `pagina-${index + 1}`, prompt: page.photo, aspect: "16:9" }));
  edition.creativePhotos.forEach((prompt, index) => photos.push({ id: `criativo-${index + 1}`, prompt, aspect: "4:5" }));
  return photos;
}

// O servidor fecha o prompt: foto realista e limpa, nunca texto, marca ou gente famosa.
export function premiumImagePrompt(photo: PremiumPhoto) {
  return `${photo.prompt}. Professional editorial photograph, natural light, realistic, high detail, magazine quality, clean composition with calm areas for text. No text, no letters, no numbers, no watermark, no logos, no brands, no book, no ebook, no printed pages, no screens with text, no celebrities.`;
}

const SYSTEM = `Você é diretor de arte e redator sênior de produtos digitais de baixo preço (R$ 9,90 a R$ 47) vendidos por anúncio.
Sua tarefa: transformar um produto já criado numa EDIÇÃO PREMIUM em páginas A4, que entregue de verdade tudo o que o título promete.

Regras de conteúdo:
- Entregue o prometido por inteiro. Se o título diz "21 receitas", escreva as 21 com ingredientes e modo de preparo; "30 exercícios" = os 30 com execução; "7 dias" = os 7 dias completos.
- Concreto e utilizável: quantidades, tempos, nomes, exemplos reais, frases prontas. Nada de texto genérico ou motivacional.
- Pouco texto corrido: o comprador odeia ler. Prefira cartões, listas para marcar, tabelas e passos curtos.
- Nunca use as palavras guia, ebook, e-book, apostila, livro, leitura, ler, páginas, capítulos, manual (nem em espanhol: guía, libro, lectura, leer, páginas, capítulos). Use método, plano, kit, cardápio, protocolo, roteiro, mapa, sistema.
- Todo o texto no idioma pedido: nenhuma palavra em inglês (só as descrições de foto). Sem emojis nem símbolos.
- Sem promessas de cura, renda garantida ou resultado médico; saúde e dinheiro com linguagem responsável.

Estrutura (você escolhe as páginas que fazem sentido para o nicho, como faria um designer):
- 8 a 14 páginas. Cada página cabe numa folha A4: no máximo 3 cartões, ou 1 tabela de até 12 linhas, ou até 2 blocos menores.
- Tipos de bloco:
  cards: {type:"cards", items:[{title, badge (ex.: "⏱ 10 min"), aLabel (ex.: "Ingredientes"), a:[itens], bLabel (ex.: "Modo de preparo"), b:[passos], tip}]} — receitas, exercícios, atividades, roteiros, scripts. Máx. 3 por página.
  checklist: {type:"checklist", title, groups:[{name, items:[...]}]} — lista de compras, materiais, rotina para marcar.
  table: {type:"table", columns:[...], rows:[[...]]} — cardápio da semana, cronograma, comparativo.
  steps: {type:"steps", items:[{title, text}]} — passo a passo numerado.
  tips: {type:"tips", items:[{title, text}]} — 4 a 6 dicas curtas em grade.
  swap: {type:"swap", title, items:[{from, to}]} — "troque isso → por isso".
  tracker: {type:"tracker", title, rows:["Dia 1", ...], fields:["Feito", "Como foi"]} — registro para acompanhar.
  callout: {type:"callout", title, text} — um aviso ou virada importante.
  text: {type:"text", text} — no máximo 2 frases.
- Página tem: tag (2 a 4 palavras, ex.: "A semana inteira"), title (curto e forte), lead (1 frase), blocks, e photo opcional.
- photo: descrição EM INGLÊS de uma foto real para a faixa do topo da página (ex.: "overhead shot of a bowl of greek yogurt with strawberries and granola on a light wooden table"). Use em até 7 páginas, nas mais visuais. Nada de pessoas famosas, texto, telas ou livros.
- cover: {tag, title (até 6 palavras), highlight (2 a 3 palavras finais do title para destacar em cor), subtitle (promessa concreta com número), badges:[3 benefícios curtos], photo (descrição em inglês da foto da capa, vertical, o resultado desejado)}.
- creativePhotos: 3 descrições em inglês de fotos para fundo de anúncio (4:5): o desejo, a dor e o resultado do nicho. Sem texto, sem pessoas famosas.
- closing: {title, text (2 a 3 frases: como continuar depois de terminar)}.
- Produto por dias, semanas ou etapas: UMA página por dia/etapa, na ordem, com tudo daquele dia (ex.: "Dia 1" com as 3 opções). Nunca misture dias numa página.
- Cada página tem título próprio e diferente das outras (nunca repita "Mais opções", "Continuação" etc.).
- Encha a folha: se uma página ficar com pouco conteúdo, junte com outra ou acrescente um bloco útil (dicas, trocas, tabela).
- A última página é sempre um registro (tracker) ou checklist final para acompanhar.

Responda só com o JSON: {"cover":{...},"pages":[...],"creativePhotos":[...],"closing":{...}}`;

function productBrief(product: ProductResult) {
  const blocks = product.productContent
    .map((block, index) => `${index + 1}. ${block.title}: ${block.body.slice(0, 500)}${block.points?.length ? ` | ${block.points.join("; ").slice(0, 300)}` : ""}`)
    .join("\n");
  return [
    `Título: ${product.title}`,
    `Subtítulo: ${product.subtitle}`,
    `Promessa: ${product.promise}`,
    `Etapas: ${product.modules.join(" · ")}`,
    product.intro ? `Introdução: ${product.intro.slice(0, 400)}` : "",
    `Conteúdo atual:\n${blocks}`,
  ]
    .filter(Boolean)
    .join("\n");
}

export async function createPremiumEdition(apiKey: string, product: ProductResult) {
  const spanish = languageOf(product) === "es";
  const prompt = `${productBrief(product)}

Idioma de TODO o texto do produto: ${spanish ? "espanhol neutro da América Latina (preços em US$ se aparecerem)" : "português do Brasil"}. As descrições de foto ficam em inglês.
Mantenha o mesmo produto e a mesma promessa; pode ajustar o título para ficar mais forte (sem palavras de leitura).`;
  const raw = await requestAiJson(apiKey, SYSTEM, prompt, 16000, premiumModel());
  const edition = normalizeEdition(raw);
  if (!edition) throw new Error("A IA não devolveu uma edição completa. Tente de novo.");
  return edition;
}

// ---------- Diagramação ----------

const esc = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function blockHtml(block: PremiumBlock) {
  switch (block.type) {
    case "cards":
      return block.items
        .map(
          (item) => `<div class="card${item.a.length && item.b.length ? "" : " one"}"><h3>${esc(item.title)}${item.badge ? `<span class="t">${esc(item.badge)}</span>` : ""}</h3>
${item.a.length ? `<div><div class="lbl">${esc(item.aLabel || "")}</div><ul class="ing">${item.a.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div>` : ""}
${item.b.length ? `<div><div class="lbl">${esc(item.bLabel || "")}</div><ol class="st">${item.b.map((x) => `<li>${esc(x)}</li>`).join("")}</ol></div>` : ""}
${item.tip ? `<div class="dica">${esc(item.tip)}</div>` : ""}</div>`,
        )
        .join("");
    case "checklist":
      return `${block.title ? `<h4>${esc(block.title)}</h4>` : ""}<div class="cols${block.groups.length === 1 ? " c1" : ""}">${block.groups
        .map((group) => `<div class="box-w"><div class="k sec">${esc(group.name)}</div>${group.items.map((it) => `<div class="chk"><span class="box"></span>${esc(it)}</div>`).join("")}</div>`)
        .join("")}</div>`;
    case "table":
      return `<table class="tb"><thead><tr>${block.columns.map((c) => `<th>${esc(c)}</th>`).join("")}</tr></thead><tbody>${block.rows
        .map((row) => `<tr>${row.map((cell, i) => `<td${i === 0 ? ' class="f"' : ""}>${esc(cell)}</td>`).join("")}</tr>`)
        .join("")}</tbody></table>`;
    case "steps":
      return `<div class="steps">${block.items.map((item, i) => `<div class="stp"><span class="n">${i + 1}</span><div><b>${esc(item.title)}</b><p>${esc(item.text)}</p></div></div>`).join("")}</div>`;
    case "tips":
      return `<div class="tips">${block.items.map((item) => `<div class="tip"><b>${esc(item.title)}</b><p>${esc(item.text)}</p></div>`).join("")}</div>`;
    case "swap":
      return `${block.title ? `<h4>${esc(block.title)}</h4>` : ""}<table class="sw">${block.items.map((item) => `<tr><td class="from">${esc(item.from)}</td><td class="to"><span class="ar"></span>${esc(item.to)}</td></tr>`).join("")}</table>`;
    case "tracker": {
      const fields = block.fields.length ? block.fields : ["Feito"];
      return `${block.title ? `<h4>${esc(block.title)}</h4>` : ""}<div class="trk">${block.rows
        .map((row) => `<div class="tr"><b>${esc(row)}</b>${fields.map((f) => (/feito|hecho|ok/i.test(f) ? `<span class="fx"><span class="box"></span>${esc(f)}</span>` : `<span class="fl">${esc(f)}: <i></i></span>`)).join("")}</div>`)
        .join("")}</div>`;
    }
    case "callout":
      return `<div class="call"><div class="k">${esc(block.title)}</div><p>${esc(block.text)}</p></div>`;
    case "text":
      return `<p class="txt">${esc(block.text)}</p>`;
  }
}

export const premiumFontFiles = [
  { family: "M", file: "Manrope-normal-500.woff2", weight: "500" },
  { family: "M", file: "Manrope-normal-700.woff2", weight: "700" },
  { family: "M", file: "Manrope-normal-800.woff2", weight: "800" },
  { family: "B", file: "BarlowCondensed-normal-800.woff2", weight: "800" },
];

function css(p: DocumentPalette) {
  return `@page{size:A4;margin:0}*{box-sizing:border-box;margin:0;padding:0}
body{font-family:M,sans-serif;color:${p.ink};-webkit-print-color-adjust:exact;print-color-adjust:exact}
.pg{width:210mm;height:297mm;position:relative;overflow:hidden;background:${p.paper};page-break-after:always}
.in{padding:14mm 15mm 16mm;transform-origin:top left}
.k{font-family:B;font-weight:800;text-transform:uppercase;letter-spacing:.3px;line-height:.95}
.tag{display:inline-block;background:${p.accent};color:#fff;font-weight:800;font-size:9.5pt;padding:1.8mm 4mm;border-radius:20mm}
.ft{position:absolute;left:15mm;right:15mm;bottom:7mm;font-size:7.5pt;color:${p.muted};display:flex;justify-content:space-between}
h2{font-family:B;font-weight:800;text-transform:uppercase;font-size:32pt;line-height:.95;margin-top:3.5mm}
h4{font-size:12pt;font-weight:800;margin:6mm 0 2mm}
.lead{font-size:10.5pt;color:${p.muted};margin-top:2.5mm;line-height:1.4;max-width:165mm}
.band{height:62mm;position:relative}.band img{width:100%;height:100%;object-fit:cover;display:block}
.band .lab{position:absolute;left:15mm;bottom:-7mm;background:${p.paper};border-radius:4mm 4mm 0 0;padding:3.5mm 6mm 0}
.band + .in{padding-top:9mm}
.card{background:#fff;border-radius:5mm;padding:4.5mm 6mm;margin-top:4mm;box-shadow:0 1mm 3mm rgba(0,0,0,.06);display:grid;grid-template-columns:60mm 1fr;gap:2mm 6mm;break-inside:avoid}
.card.one{grid-template-columns:1fr}
.card h3{grid-column:1/-1;font-size:13pt;font-weight:800;display:flex;justify-content:space-between;align-items:center;gap:4mm}
.t{font-size:8.5pt;background:${p.soft};color:${p.accent};font-weight:800;padding:1mm 3mm;border-radius:10mm;white-space:nowrap}
.lbl{font-size:7.5pt;font-weight:800;color:${p.accent};text-transform:uppercase;letter-spacing:.5px;margin-bottom:1mm}
.ing li{list-style:none;font-size:9.3pt;margin:1mm 0;padding-left:5mm;position:relative;line-height:1.3}.ing li:before{content:'';position:absolute;left:0;top:1.1mm;width:2.5mm;height:2.5mm;border:.4mm solid ${p.accent};border-radius:.6mm}
.st li{font-size:9.3pt;margin:1mm 0 1mm 4.5mm;line-height:1.35}
.dica{grid-column:1/-1;font-size:8.8pt;color:${p.deep};font-weight:700;border-top:.3mm dashed ${p.line};padding-top:2mm;margin-top:1mm}
.dica:before{content:'';display:inline-block;width:2mm;height:2mm;border-radius:50%;background:${p.accent};margin-right:2mm;vertical-align:.3mm}
.cols{display:grid;grid-template-columns:1fr 1fr;gap:4.5mm;margin-top:5mm}.cols.c1{grid-template-columns:1fr}
.box-w{background:#fff;border-radius:5mm;padding:4.5mm 6mm;break-inside:avoid}
.sec{font-size:15pt;color:${p.accent};margin-bottom:2mm}
.chk{font-size:9.8pt;margin:1.8mm 0;line-height:1.3}
.box{display:inline-block;width:3.5mm;height:3.5mm;border:.45mm solid ${p.accent};border-radius:.8mm;margin-right:2.5mm;vertical-align:-.6mm;flex:none}
.tb{border-collapse:collapse;width:100%;margin-top:5mm;background:#fff;border-radius:5mm;overflow:hidden}
.tb th{text-align:left;font-size:7.5pt;text-transform:uppercase;letter-spacing:.5px;color:#fff;background:${p.deep};padding:2.8mm 3mm;font-weight:800}
.tb td{padding:2.6mm 3mm;border-bottom:.3mm solid ${p.line};font-size:9.2pt;vertical-align:top;line-height:1.3}
.tb td.f{font-weight:800;color:${p.accent}}
.steps{margin-top:5mm;display:grid;gap:3mm}
.stp{display:flex;gap:4mm;background:#fff;border-radius:4mm;padding:3.5mm 5mm;align-items:flex-start}
.stp .n{flex:none;width:8mm;height:8mm;border-radius:50%;background:${p.accent};color:#fff;font-family:B;font-size:13pt;display:grid;place-items:center}
.stp b{font-size:10.8pt}.stp p{font-size:9.3pt;color:${p.muted};margin-top:.8mm;line-height:1.38}
.tips{display:grid;grid-template-columns:1fr 1fr;gap:4mm;margin-top:5mm}
.tip{background:${p.soft};border-radius:4mm;padding:4mm 5mm}.tip b{font-size:10.5pt;color:${p.deep}}.tip p{font-size:9.2pt;margin-top:1mm;line-height:1.38}
.sw{border-collapse:collapse;width:100%;margin-top:3mm;background:#fff;border-radius:5mm;overflow:hidden}
.sw td{padding:2.8mm 4mm;border-bottom:.3mm solid ${p.line};font-size:10pt}.sw .from{color:${p.muted};text-decoration:line-through;width:42%}.sw .to{font-weight:800}.ar{display:inline-block;width:2mm;height:2mm;border:solid ${p.accent};border-width:.6mm .6mm 0 0;transform:rotate(45deg);margin-right:3mm;vertical-align:.2mm}
.trk{margin-top:4mm}.tr{background:#fff;border-radius:4mm;padding:3.2mm 5mm;display:flex;align-items:center;gap:6mm;margin:2.2mm 0;font-size:9.5pt}
.tr b{font-size:10.8pt;min-width:30mm}.fl{flex:1;color:${p.muted};display:flex;gap:2mm}.fl i{flex:1;border-bottom:.3mm solid ${p.line}}.fx{display:flex;align-items:center;color:${p.muted}}
.call{margin-top:6mm;background:${p.deep};color:${p.paper};border-radius:5mm;padding:6mm 8mm}.call .k{font-size:19pt;color:${p.soft}}.call p{font-size:10pt;line-height:1.5;margin-top:2mm}
.txt{font-size:10.3pt;line-height:1.5;margin-top:4mm}
.cover{background:${p.deep}}.cover img{width:100%;height:190mm;object-fit:cover;display:block}
.cv{position:absolute;left:14mm;right:14mm;top:158mm;background:${p.paper};border-radius:6mm;padding:9mm 10mm}
.cv .k{font-size:50pt;margin-top:4mm}.cv .hl{color:${p.accent}}
.cv .sub{font-size:12.5pt;font-weight:700;margin-top:4mm;line-height:1.35}
.cv .bd .ok:before{content:'';display:inline-block;width:1.4mm;height:2.6mm;border:solid ${p.accent};border-width:0 .6mm .6mm 0;transform:rotate(45deg);margin:0 2.2mm .4mm .5mm}
.cv .bd{display:flex;flex-wrap:wrap;gap:3mm 6mm;margin-top:5mm;font-size:9.5pt;font-weight:800;color:${p.accent}}
.toc{margin-top:7mm;display:grid;gap:2.4mm}.toc div{display:flex;align-items:baseline;gap:3mm;background:#fff;border-radius:3.5mm;padding:3mm 5mm;font-size:10.5pt;font-weight:700}
.toc span{font-family:B;font-size:15pt;color:${p.accent};min-width:9mm}.toc em{margin-left:auto;font-style:normal;color:${p.muted};font-size:9pt}`;
}

// Texto fixo mínimo: o resto vem da IA no idioma do produto.
const fixed = {
  pt: { inside: "O que tem aqui", insideTag: "Seu kit completo", page: "pág." },
  es: { inside: "Lo que tienes aquí", insideTag: "Tu kit completo", page: "pág." },
};

export function renderPremiumHtml(edition: PremiumEdition, product: DocumentProduct, images: Record<string, string>, fontCss: string) {
  const palette = resolveDocumentPalette(product);
  const t = fixed[languageOf(product) === "es" ? "es" : "pt"];
  const footer = (n: number) => `<div class="ft"><span>${esc(edition.cover.title)}</span><span>${n}</span></div>`;
  const { cover } = edition;
  const hl = cover.highlight && cover.title.toLowerCase().endsWith(cover.highlight.toLowerCase()) ? cover.highlight : "";
  const titleHtml = hl ? `${esc(cover.title.slice(0, cover.title.length - hl.length))}<br><span class="hl">${esc(cover.title.slice(-hl.length))}</span>` : esc(cover.title);
  const pages: string[] = [];

  pages.push(`<div class="pg cover">${images.capa ? `<img src="${images.capa}">` : `<div style="height:190mm;background:${palette.accent}"></div>`}
<div class="cv">${cover.tag ? `<span class="tag">${esc(cover.tag)}</span>` : ""}<div class="k">${titleHtml}</div><div class="sub">${esc(cover.subtitle)}</div>
<div class="bd">${cover.badges.map((b) => `<span class="ok">${esc(b)}</span>`).join("")}</div></div></div>`);

  // Página 2: o que tem dentro (as páginas de conteúdo começam na 3).
  pages.push(`<div class="pg"><div class="in"><span class="tag">${t.insideTag}</span><h2>${t.inside}</h2>${cover.subtitle ? `<div class="lead">${esc(cover.subtitle)}</div>` : ""}
<div class="toc">${edition.pages.map((page, i) => `<div><span>${String(i + 1).padStart(2, "0")}</span>${esc(page.title)}<em>${t.page} ${i + 3}</em></div>`).join("")}</div></div>${footer(2)}</div>`);

  edition.pages.forEach((page, index) => {
    const photo = page.photo ? images[`pagina-${index + 1}`] : "";
    const head = `${page.tag ? `<span class="tag">${esc(page.tag)}</span>` : ""}<h2>${esc(page.title)}</h2>${page.lead ? `<div class="lead">${esc(page.lead)}</div>` : ""}`;
    const closing = index === edition.pages.length - 1 && edition.closing.text ? blockHtml({ type: "callout", title: edition.closing.title, text: edition.closing.text }) : "";
    pages.push(
      `<div class="pg">${photo ? `<div class="band"><img src="${photo}"></div>` : ""}<div class="in">${head}${page.blocks.map(blockHtml).join("")}${closing}</div>${footer(index + 3)}</div>`,
    );
  });

  // Antes de imprimir: fotos viram JPEG menor (o PDF fica leve) e página que passou da folha encolhe até caber.
  const script = `<script>
window.__ready = (async () => {
  await document.fonts.ready;
  await Promise.all([...document.images].map(async (img) => {
    await img.decode().catch(() => {});
    if (!img.naturalWidth) return;
    const scale = Math.min(1, 1500 / img.naturalWidth);
    const c = document.createElement('canvas'); c.width = Math.round(img.naturalWidth * scale); c.height = Math.round(img.naturalHeight * scale);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    img.src = c.toDataURL('image/jpeg', 0.82); await img.decode().catch(() => {});
  }));
  const mm = 96 / 25.4;
  for (const pg of document.querySelectorAll('.pg')) {
    const inner = pg.querySelector('.in'); if (!inner) continue;
    const limit = pg.clientHeight - 14 * mm;
    const top = pg.getBoundingClientRect().top;
    let z = 1;
    while (inner.getBoundingClientRect().bottom - top > limit && z > 0.6) { z -= 0.03; inner.style.zoom = z; }
  }
  return true;
})();
</script>`;

  return `<!doctype html><html lang="${languageOf(product) === "es" ? "es" : "pt-BR"}"><head><meta charset="utf-8"><style>${fontCss}${css(palette)}</style></head><body>${pages.join("")}${script}</body></html>`;
}
