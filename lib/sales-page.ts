// Página de vendas entregue no ZIP (03-pagina-de-vendas.html): um único HTML, mobile first,
// com a mesma paleta, fontes e ilustrações do PDF premium. Estrutura pensada para low ticket.
// Sem dependências de Node: pode ser importado pelo cliente e pelo servidor.

import { documentArt } from "@/lib/document-art";
import { currencyOf, languageOf, translator, type ProductLanguage } from "@/lib/locale";
import {
  blockTitle,
  endTitles,
  googleFontCss,
  resolveDocumentPalette,
  resolveDocumentStyle,
  type DocumentBlock,
  type DocumentPalette,
  type DocumentStyle,
} from "@/lib/product-document";

// Campos por dobra gerados pela IA. Todos opcionais: projetos antigos não têm.
export type SalesPageExtras = {
  pains?: string[];
  turn?: string;
  benefits?: { title: string; text: string }[];
  forWho?: string[];
  notFor?: string[];
  faq?: { q: string; a: string }[];
  finalHeadline?: string;
};

export type SalesProduct = {
  title: string;
  subtitle: string;
  promise: string;
  modules: string[];
  productContent: DocumentBlock[];
  format?: string;
  intro?: string;
  closing?: string;
  language?: string;
  copyBlocks: { hook: string; headline: string; bullets: string[]; cta: string };
  salesPage: { headline: string; subheadline: string; sections: { title: string; body: string }[]; cta: string } & SalesPageExtras;
};

// Formato pedido à IA (entra no JSON de exemplo dos prompts).
export const salesExtrasJsonShape =
  '"pains":["string"],"turn":"string","benefits":[{"title":"string","text":"string"}],"forWho":["string"],"notFor":["string"],"faq":[{"q":"string","a":"string"}],"finalHeadline":"string"';

// Regras de copy por dobra, compartilhadas pelo pedido do produto e pela rota que regera só a página.
export const salesCopyRules = `- salesPage alimenta uma pagina de produto low ticket (compra por impulso, trafego pago, acesso pelo celular). Seja especifico do nicho e concreto.
  * Venda acao e resultado, nunca leitura: em salesPage e copyBlocks NAO use as palavras guia, ebook, e-book, livro, apostila, leitura, ler, paginas ou capitulos. Apresente como metodo, plano, sistema, roteiro ou ferramenta para aplicar.
  * headline: ate 14 palavras, resultado concreto que o comprador quer. subheadline: 1 frase dizendo como e para quem.
  * pains: 4 situacoes reais do dia a dia do publico, em segunda pessoa, ate 18 palavras cada.
  * turn: 1 a 2 frases explicando por que este material resolve de um jeito diferente do que a pessoa ja tentou.
  * benefits: 5 itens {title ate 5 palavras, text com 1 frase sobre o que a pessoa passa a conseguir}.
  * forWho: 3 perfis para quem o material e. notFor: 2 perfis para quem nao e (honesto).
  * faq: 4 duvidas especificas sobre o conteudo e a aplicacao (nao sobre entrega, formato, pagamento ou garantia), resposta de 1 a 2 frases.
  * finalHeadline: 1 frase curta de fechamento. cta: ate 5 palavras, comecando com verbo ou "Quero".
  * sections: 4 secoes curtas (problema, solucao, o que recebe, para quem), 2 a 3 frases cada.
  * title e subtitle do produto seguem a mesma regra: sem guia, ebook, apostila, livro ou leitura no nome; use nomes de acao e resultado (metodo, plano, sistema, roteiro, kit, protocolo, mapa, checklist).
  * Nao invente depoimentos, numeros de alunos ou vendas, provas, bonus, escassez nem prazos. Nao chame o material de ebook. Sem promessas absolutas ou garantia de resultado; em saude e financas, linguagem responsavel.`;

// "Guia" e "ebook" passam ideia de leitura e derrubam a compra por impulso.
// Rede de segurança para título e subtítulo, caso a IA desobedeça a regra do pedido.
export function withoutReadingWords(value: string) {
  return String(value ?? "").replace(/\b(e-?book|guia)\b/gi, (word) =>
    word[0] === word[0].toUpperCase() ? (word === word.toUpperCase() && word.length > 1 ? "MÉTODO" : "Método") : "método",
  );
}

function text(value: unknown, max = 320) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "";
}

function textList(value: unknown, limit: number, max = 220) {
  return Array.isArray(value) ? value.map((item) => text(item, max)).filter(Boolean).slice(0, limit) : [];
}

// Limpa os campos novos vindos da IA (ou do banco); devolve só o que existe.
export function normalizeSalesExtras(raw: unknown): SalesPageExtras {
  const data = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const out: SalesPageExtras = {};
  const pains = textList(data.pains, 5);
  if (pains.length) out.pains = pains;
  const turn = text(data.turn, 420);
  if (turn) out.turn = turn;
  const benefits = Array.isArray(data.benefits)
    ? data.benefits
        .map((item) =>
          typeof item === "string"
            ? { title: "", text: text(item, 260) }
            : { title: text((item as { title?: unknown })?.title, 80), text: text((item as { text?: unknown })?.text, 260) },
        )
        .filter((item) => item.text || item.title)
        .slice(0, 6)
    : [];
  if (benefits.length) out.benefits = benefits;
  const forWho = textList(data.forWho, 4);
  if (forWho.length) out.forWho = forWho;
  const notFor = textList(data.notFor, 3);
  if (notFor.length) out.notFor = notFor;
  const faq = Array.isArray(data.faq)
    ? data.faq
        .map((item) => ({ q: text((item as { q?: unknown })?.q, 160), a: text((item as { a?: unknown })?.a, 420) }))
        .filter((item) => item.q && item.a)
        .slice(0, 5)
    : [];
  if (faq.length) out.faq = faq;
  const finalHeadline = text(data.finalHeadline, 200);
  if (finalHeadline) out.finalHeadline = finalHeadline;
  return out;
}

/* ---------- utilidades ---------- */

function esc(value: string) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalize(value: string) {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function roman(value: number) {
  const map: [number, string][] = [[10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]];
  let rest = value;
  let out = "";
  for (const [n, r] of map) while (rest >= n) { out += r; rest -= n; }
  return out;
}

// Corta no fim de uma frase, sem passar do limite.
function excerpt(value: string, max: number) {
  const clean = String(value ?? "").replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const end = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("! "), cut.lastIndexOf("? "));
  return end > max * 0.45 ? cut.slice(0, end + 1) : `${cut.slice(0, cut.lastIndexOf(" "))}…`;
}

function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string) {
  const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
}

/* ---------- conteúdo de cada dobra (com fallback para projetos antigos) ---------- */

type Copy = {
  lang: ProductLanguage;
  t: (pt: string) => string;
  style: DocumentStyle;
  palette: DocumentPalette;
  headline: string;
  subheadline: string;
  cta: string;
  pains: string[];
  turn: string;
  benefits: { title: string; text: string }[];
  forWho: string[];
  notFor: string[];
  faq: { q: string; a: string }[];
  finalHeadline: string;
  blocks: DocumentBlock[];
  chapters: string[];
  notice: string;
};

const nouns: Record<DocumentStyle, [string, string]> = {
  editorial: ["passo", "passos"],
  manual: ["etapa", "etapas"],
  catalogo: ["categoria", "categorias"],
};

const formatLabel: Record<DocumentStyle, string> = {
  editorial: "Método pronto para aplicar",
  manual: "Plano pronto para seguir",
  catalogo: "Seleção pronta para usar",
};

function sectionMatching(product: SalesProduct, pattern: RegExp) {
  return product.salesPage.sections.find((section) => pattern.test(normalize(section.title)));
}

function sentences(value: string, limit: number) {
  return (value.match(/[^.!?]+[.!?]+/g) || [value]).map((part) => part.trim()).filter((part) => part.length > 12).slice(0, limit);
}

// O nicho vem da mesma regra da paleta (título primeiro), para não confundir "economizar na maquiagem" com finanças.
function responsibleNotice(product: SalesProduct, palette: DocumentPalette, t: (pt: string) => string) {
  const value = normalize(product.title);
  if (palette.id === "sage" || /saude|alongamento|postura|dor nas|sono|ansiedade|dieta|emagrec|nutri|gestante|remedio|terapia|salud|estiramiento|dolor|sueno|ansiedad|adelgaz|embaraz/.test(value)) {
    return t("Conteúdo educativo. Não substitui a orientação de médico, fisioterapeuta, nutricionista ou outro profissional de saúde. Em caso de dor, sintoma ou condição específica, procure um profissional. Os resultados variam de pessoa para pessoa.");
  }
  if (palette.id === "navy" && /financ|dinheiro|divida|orcamento|invest|renda|credito|contas|dinero|deuda|presupuesto|ingreso/.test(normalize(`${product.title} ${product.subtitle}`))) {
    return t("Conteúdo educativo, sem recomendação de investimento, crédito ou consultoria financeira individual. Os resultados dependem da situação e das decisões de cada pessoa.");
  }
  return "";
}

function buildCopy(product: SalesProduct): Copy {
  const lang = languageOf(product);
  const t = translator(lang);
  const style = resolveDocumentStyle(product);
  const palette = resolveDocumentPalette(product);
  const extras = normalizeSalesExtras(product.salesPage);
  const blocks = product.productContent.length
    ? product.productContent
    : product.modules.map((module) => ({ title: module, body: "", task: "" }));

  const problem = sectionMatching(product, /problema|dor|consequ|desafio/);
  const pains = extras.pains || (problem ? sentences(problem.body, 3) : []);
  const solution = sectionMatching(product, /mecanismo|solucao|metodo|como funciona/);
  const forWhoSection = sectionMatching(product, /para quem/);
  const benefits =
    extras.benefits ||
    product.copyBlocks.bullets.slice(0, 6).map((bullet) => ({ title: "", text: bullet }));

  return {
    lang,
    t,
    style,
    palette,
    headline: product.salesPage.headline || product.copyBlocks.headline || product.title,
    subheadline: product.salesPage.subheadline || product.subtitle,
    cta: product.salesPage.cta || product.copyBlocks.cta || t("Quero acessar agora"),
    pains,
    turn: extras.turn || (solution ? excerpt(solution.body, 260) : product.promise),
    benefits,
    forWho: extras.forWho || (forWhoSection ? sentences(forWhoSection.body, 3) : []),
    notFor: extras.notFor || [],
    faq: extras.faq || [],
    finalHeadline: extras.finalHeadline || product.copyBlocks.headline || product.salesPage.headline,
    blocks,
    chapters: blocks.map((block) => blockTitle(block)),
    notice: responsibleNotice(product, palette, t),
  };
}

/* ---------- mockup do produto (miniaturas das páginas do PDF, em CSS) ---------- */

function coverMini(product: SalesProduct, copy: Copy) {
  const art = documentArt(copy.palette.id, 0, "mini-art");
  const size = product.title.length > 60 ? 7.4 : product.title.length > 40 ? 8.8 : 10.6;
  const title = `<b class="mini-title" style="font-size:${size}cqw">${esc(product.title)}</b>`;
  const count = `${pad(copy.blocks.length)} ${copy.t(nouns[copy.style][1])}`;
  if (copy.style === "manual") {
    return `<div class="mini cover m"><i class="rail"></i><span class="mini-top">${esc(copy.t(formatLabel.manual))}</span>${title}<span class="mini-route"><i></i><i></i><i></i><i></i><i></i></span><span class="disc"></span>${art}</div>`;
  }
  if (copy.style === "catalogo") {
    return `<div class="mini cover c"><i class="frame"></i><span class="mini-top">${copy.t("Seleção curada")}</span><span class="medal">${art}</span>${title}<span class="mini-foot">${esc(count)}</span></div>`;
  }
  return `<div class="mini cover e"><i class="glow"></i><span class="mini-top">${esc(copy.t(formatLabel.editorial))}</span><span class="arch">${art}</span>${title}<span class="mini-foot">${esc(count)}</span></div>`;
}

function innerMini(copy: Copy, index: number, extra = "") {
  const block = copy.blocks[index % copy.blocks.length];
  const label = `${copy.t(nouns[copy.style][0])} ${pad(index + 1)}`;
  const lines = '<span class="ln"></span><span class="ln"></span><span class="ln short"></span>';
  const body =
    copy.style === "catalogo" && block.entries?.length
      ? `<span class="mini-cards">${block.entries
          .slice(0, 4)
          .map((entry) => `<span><b>${esc(excerpt(entry.name, 28))}</b><i></i><i></i></span>`)
          .join("")}</span>`
      : copy.style === "manual"
        ? `<span class="mini-bar"><i style="width:${Math.round(((index + 1) / copy.blocks.length) * 100)}%"></i></span>${lines}<span class="mini-box">${lines}</span>${lines}${lines}`
        : `${lines}${lines}<span class="mini-box">${lines}</span>${lines}`;
  return `<div class="mini inner ${extra}"><div class="mini-in"><span class="mini-head"><small>${esc(label)}</small><b>${esc(excerpt(copy.chapters[index % copy.chapters.length], 52))}</b>${documentArt(copy.palette.id, index + 1, "mini-art")}</span>${body}</div></div>`;
}

function heroMockup(product: SalesProduct, copy: Copy) {
  return `<div class="mock" aria-hidden="true">${innerMini(copy, 1, "back2")}${innerMini(copy, 0, "back1")}${coverMini(product, copy)}</div>`;
}

/* ---------- dobras ---------- */

function button(copy: Copy, extra = "") {
  return `<a class="btn ${extra}" href="#oferta" data-checkout>${esc(copy.cta)}<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></a>`;
}

function priceLine(copy: Copy, extra = "") {
  const { symbol } = currencyOf(copy.lang);
  return `<div class="price ${extra}"><s data-show="precoDe">${symbol} <span data-preco-de></span></s><span class="now"><small>${symbol}</small><b data-preco>${esc(defaultPrice(copy.lang))}</b></span><em data-ancora></em></div>`;
}

const trust = (copy: Copy) =>
  `<ul class="trust"><li>${copy.t("Acesso imediato")}</li><li>${copy.t("Pagamento seguro")}</li><li>${copy.t("Garantia de 7 dias")}</li></ul>`;

function heroSection(product: SalesProduct, copy: Copy) {
  return `<header class="hero">
  <div class="wrap hero-grid">
    <div class="hero-text">
      <p class="eyebrow">${esc(copy.t(formatLabel[copy.style]))}</p>
      <h1>${esc(copy.headline)}</h1>
      <p class="sub">${esc(copy.subheadline)}</p>
    </div>
    ${heroMockup(product, copy)}
    <div class="hero-buy" id="topo-compra">
      ${priceLine(copy)}
      ${button(copy, "big")}
      ${trust(copy)}
    </div>
  </div>
</header>`;
}

function painsSection(copy: Copy) {
  if (!copy.pains.length && !copy.turn) return "";
  const heading = copy.t({ editorial: "Talvez você esteja aqui", manual: "Se você se reconhece em algum destes…", catalogo: "Você já passou por isso?" }[copy.style]);
  const items = copy.pains
    .map((pain, index) =>
      copy.style === "manual"
        ? `<li><i class="box"></i><span>${esc(pain)}</span></li>`
        : copy.style === "catalogo"
          ? `<li><span>${esc(pain)}</span></li>`
          : `<li><b>${pad(index + 1)}</b><span>${esc(pain)}</span></li>`,
    )
    .join("");
  return `<section class="pains">
  <div class="wrap narrow">
    ${copy.pains.length ? `<h2>${heading}</h2><ul class="pain-list">${items}</ul>` : ""}
    ${copy.turn ? `<div class="turn"><span class="label">${copy.t("A virada")}</span><p>${esc(copy.turn)}</p></div>` : ""}
  </div>
</section>`;
}

function receiveSection(product: SalesProduct, copy: Copy) {
  const [one, many] = nouns[copy.style].map(copy.t);
  const shown = copy.chapters.slice(0, 8);
  const more = copy.chapters.length - shown.length;
  const entries = copy.blocks.reduce((total, block) => total + (block.entries?.length || 0), 0);
  const facts = [
    [pad(copy.blocks.length), many],
    copy.style === "catalogo" && entries ? [String(entries), copy.t("itens comentados")] : [copy.t("Na hora"), copy.t("acesso no celular")],
    ["1", copy.t(endTitles[copy.style]).toLowerCase()],
  ]
    .map(([value, label]) => `<div><b>${esc(value)}</b><span>${esc(label)}</span></div>`)
    .join("");
  const list =
    copy.style === "manual"
      ? `<ol class="route-list">${shown.map((title, index) => `<li><i>${index + 1}</i><span><small>${esc(one)} ${index + 1}</small>${esc(title)}</span></li>`).join("")}</ol>`
      : copy.style === "catalogo"
        ? `<div class="index-cards">${shown.map((title, index) => `<div><i>${roman(index + 1)}</i><span>${esc(title)}</span></div>`).join("")}</div>`
        : `<ol class="toc">${shown.map((title, index) => `<li><i>${pad(index + 1)}</i><span>${esc(title)}</span></li>`).join("")}</ol>`;
  const pages = [0, 1, 2].map((index) => innerMini(copy, index)).join("");
  return `<section class="receive" id="conteudo">
  <div class="wrap">
    <div class="sec-head"><span class="label">${copy.t("O que você recebe")}</span><h2>${esc(product.title)}</h2><p>${esc(product.promise)}</p></div>
    <div class="facts">${facts}</div>
    <div class="pages" aria-hidden="true">${pages}</div>
    <div class="narrow">${list}${more > 0 ? `<p class="more">+ ${more} ${more === 1 ? one : many} ${copy.t("e o")} “${esc(copy.t(endTitles[copy.style]))}”</p>` : `<p class="more">+ “${esc(copy.t(endTitles[copy.style]))}” ${copy.t("para fechar com tudo em mãos")}</p>`}</div>
  </div>
</section>`;
}

function benefitsSection(copy: Copy) {
  if (!copy.benefits.length) return "";
  const items = copy.benefits
    .map((item, index) => {
      const marker = copy.style === "catalogo" ? roman(index + 1) : copy.style === "manual" ? String(index + 1) : pad(index + 1);
      return `<li><i>${marker}</i><div>${item.title ? `<h3>${esc(item.title)}</h3>` : ""}<p>${esc(item.text)}</p></div></li>`;
    })
    .join("");
  const heading = copy.t({ editorial: "O que muda quando você aplica", manual: "O que você vai conseguir", catalogo: "Por que vale ter esta seleção" }[copy.style]);
  return `<section class="benefits">
  <div class="wrap">
    <div class="sec-head"><span class="label">${copy.t("Benefícios")}</span><h2>${heading}</h2></div>
    <ul class="benefit-list">${items}</ul>
  </div>
</section>`;
}

function peekSection(copy: Copy) {
  const index = Math.max(0, copy.blocks.findIndex((block) => (copy.style === "catalogo" ? block.entries?.length : block.tip || block.example)));
  const block = copy.blocks[index];
  if (!block || (!block.body && !block.entries?.length)) return "";
  const title = copy.chapters[index];
  const first = (block.body || "").split(/\n{2,}/)[0];
  let inside = "";
  if (copy.style === "catalogo" && block.entries?.length) {
    inside = `<div class="entries">${block.entries
      .slice(0, 3)
      .map((entry) => `<div><span class="tag">${esc(entry.tag || copy.t("Seleção"))}</span><h4>${esc(entry.name)}</h4><p>${esc(entry.detail)}</p></div>`)
      .join("")}</div>`;
  } else {
    const points = (block.points || []).slice(0, 3).map((point) => `<li>${esc(point)}</li>`).join("");
    const box = block.tip
      ? `<div class="peek-box"><span class="label">${copy.t("Dica")}</span><p>${esc(excerpt(block.tip, 260))}</p></div>`
      : block.example
        ? `<div class="peek-box"><span class="label">${copy.t("Exemplo")}</span><p>${esc(excerpt(block.example, 260))}</p></div>`
        : block.task
          ? `<div class="peek-box"><span class="label">${copy.t("Na prática")}</span><p>${esc(excerpt(block.task, 220))}</p></div>`
          : "";
    inside = `<p class="peek-lead">${esc(excerpt(first, 380))}</p>${points ? `<ul class="peek-points">${points}</ul>` : ""}${box}`;
  }
  return `<section class="peek">
  <div class="wrap narrow">
    <div class="sec-head"><span class="label">${copy.t("Uma espiada por dentro")}</span><h2>${copy.t("Veja um trecho real do material")}</h2></div>
    <article class="peek-page">
      <header><small>${esc(copy.t(nouns[copy.style][0]))} ${pad(index + 1)}</small><h3>${esc(title)}</h3>${documentArt(copy.palette.id, index + 1, "peek-art")}</header>
      ${inside}
    </article>
  </div>
</section>`;
}

function audienceSection(copy: Copy) {
  if (!copy.forWho.length) return "";
  const col = (title: string, items: string[], kind: string) =>
    `<div class="aud ${kind}"><h3>${title}</h3><ul>${items.map((item) => `<li>${esc(item)}</li>`).join("")}</ul></div>`;
  return `<section class="audience">
  <div class="wrap">
    <div class="sec-head"><span class="label">${copy.t("Para quem é")}</span><h2>${copy.t("Feito para um tipo de pessoa")}</h2></div>
    <div class="aud-grid${copy.notFor.length ? "" : " solo"}">${col(copy.t("É para você se…"), copy.forWho, "yes")}${copy.notFor.length ? col(copy.t("Não é para você se…"), copy.notFor, "no") : ""}</div>
  </div>
</section>`;
}

function bonusSection(copy: Copy) {
  return `<section class="bonus" id="bonus" hidden>
  <div class="wrap narrow">
    <div class="sec-head"><span class="label">${copy.t("Bônus")}</span><h2>${copy.t("Junto com o material")}</h2></div>
    <ul class="bonus-list" data-bonus-list></ul>
  </div>
</section>`;
}

function offerSection(product: SalesProduct, copy: Copy) {
  const many = copy.t(nouns[copy.style][1]);
  const items = [
    `<b>${esc(product.title)}</b> · ${copy.blocks.length} ${many} ${copy.t("prontos para aplicar")}`,
    `“${esc(copy.t(endTitles[copy.style]))}” ${copy.t("para acompanhar a aplicação")}`,
    copy.t("Use no celular, no computador ou imprima"),
    copy.t("Acesso imediato depois da confirmação do pagamento"),
  ]
    .map((item) => `<li>${item}</li>`)
    .join("");
  return `<section class="offer" id="oferta">
  <div class="wrap narrow">
    <div class="offer-card">
      <span class="label">${copy.t("Oferta")}</span>
      <h2>${copy.t("Tudo o que você leva hoje")}</h2>
      <ul class="offer-list" data-offer-list>${items}</ul>
      ${priceLine(copy, "center")}
      <p class="once">${copy.t("Pagamento único. Sem mensalidade.")}</p>
      ${button(copy, "big")}
      ${trust(copy)}
    </div>
  </div>
</section>`;
}

function guaranteeSection(copy: Copy) {
  const t = copy.t;
  return `<section class="guarantee">
  <div class="wrap narrow g-grid">
    <div class="seal"><b>7</b><span>${t("dias de<br>garantia")}</span></div>
    <div><h2>${t("Risco zero para você")}</h2><p>${t("Você tem 7 dias para conhecer o material com calma. Se achar que não é para você, peça o reembolso dentro do prazo e recebe 100% do valor de volta, sem perguntas.")}</p></div>
  </div>
</section>`;
}

function faqSection(copy: Copy) {
  const fixed = [
    { q: "Como vou receber o material?", a: "Logo depois da confirmação do pagamento, você recebe o acesso no e-mail usado na compra. É só baixar e começar." },
    { q: "Consigo usar pelo celular?", a: "Sim. O material abre no celular, no tablet ou no computador, e você também pode imprimir se preferir." },
    { q: "E se eu não gostar?", a: "Você tem 7 dias de garantia. Se não for para você, peça o reembolso dentro do prazo e devolvemos o valor integral." },
  ].map((item) => ({ q: copy.t(item.q), a: copy.t(item.a) }));
  const items = [...copy.faq, ...fixed]
    .map((item, index) => `<details${index === 0 ? " open" : ""}><summary>${esc(item.q)}</summary><p>${esc(item.a)}</p></details>`)
    .join("");
  return `<section class="faq">
  <div class="wrap narrow">
    <div class="sec-head"><span class="label">${copy.t("Dúvidas")}</span><h2>${copy.t("Perguntas frequentes")}</h2></div>
    <div class="faq-list">${items}</div>
  </div>
</section>`;
}

function finalSection(product: SalesProduct, copy: Copy) {
  const year = new Date().getFullYear();
  return `<section class="final">
  <div class="wrap narrow">
    ${documentArt(copy.palette.id, 0, "final-art")}
    <h2>${esc(copy.finalHeadline)}</h2>
    ${priceLine(copy, "center light")}
    ${button(copy, "big")}
  </div>
</section>
<footer class="foot">
  <div class="wrap narrow">
    ${copy.notice ? `<p class="notice">${esc(copy.notice)}</p>` : ""}
    <p>© ${year} · ${esc(product.title)}. ${copy.t("Todos os direitos reservados.")}</p>
    <p>${copy.t("Este site não faz parte do Facebook nem da Meta Platforms, Inc., e não é endossado por eles.")}</p>
  </div>
</footer>
<div class="sticky" data-sticky aria-hidden="true">
  <div class="sticky-price"><s data-show="precoDe">${currencyOf(copy.lang).symbol} <span data-preco-de></span></s><span>${currencyOf(copy.lang).symbol} <b data-preco>${esc(defaultPrice(copy.lang))}</b></span></div>
  <a class="btn" href="#oferta" data-checkout>${esc(copy.cta)}</a>
</div>`;
}

/* ---------- estilos ---------- */

function css(copy: Copy) {
  const p = copy.palette;
  const onAccent = contrast(p.accent, "#ffffff") >= 3.6 ? "#ffffff" : p.deep;
  const fonts = {
    editorial: { display: "Fraunces, Georgia, serif", body: "Inter, system-ui, sans-serif", weight: 400, track: "-.015em", radius: "3px" },
    manual: { display: '"Plus Jakarta Sans", system-ui, sans-serif', body: '"Plus Jakarta Sans", system-ui, sans-serif', weight: 800, track: "-.03em", radius: "14px" },
    catalogo: { display: '"Cormorant Garamond", Georgia, serif', body: "Inter, system-ui, sans-serif", weight: 500, track: "-.005em", radius: "0px" },
  }[copy.style];

  return `
:root { --paper: ${p.paper}; --ink: ${p.ink}; --muted: ${p.muted}; --accent: ${p.accent}; --deep: ${p.deep}; --soft: ${p.soft}; --line: ${p.line}; --on-accent: ${onAccent};
  --display: ${fonts.display}; --body: ${fonts.body}; --dw: ${fonts.weight}; --track: ${fonts.track}; --r: ${fonts.radius}; }
* { box-sizing: border-box; }
html { scroll-behavior: smooth; -webkit-text-size-adjust: 100%; }
body { margin: 0; background: var(--paper); color: var(--ink); font: 400 17px/1.6 var(--body); }
img, svg { display: block; max-width: 100%; }
.facts b, .seal b, .price b, .index-cards i, .benefit-list i { font-variant-numeric: lining-nums; }
h1, h2, h3, h4 { font-family: var(--display); font-weight: var(--dw); letter-spacing: var(--track); line-height: 1.08; margin: 0; text-wrap: balance; }
p { margin: 0; }
ul, ol { margin: 0; padding: 0; list-style: none; }
.wrap { width: 100%; max-width: 1120px; margin: 0 auto; padding: 0 20px; }
.narrow { max-width: 760px; margin-left: auto; margin-right: auto; }
.wrap.narrow { max-width: 800px; }
section { padding: 72px 0; }
.label, .eyebrow { display: inline-block; font: 700 12px/1.2 var(--body); letter-spacing: .2em; text-transform: uppercase; color: var(--accent); }
.sec-head { margin-bottom: 36px; }
.sec-head h2 { margin-top: 12px; font-size: clamp(30px, 6.6vw, 46px); }
.sec-head p { margin-top: 14px; color: var(--muted); font-size: 18px; max-width: 640px; }

/* botão e preço */
.btn { display: inline-flex; align-items: center; justify-content: center; gap: 10px; min-height: 54px; padding: 0 26px; border-radius: max(var(--r), 6px); background: var(--accent); color: var(--on-accent); font: 800 17px/1.15 var(--body); letter-spacing: .01em; text-decoration: none; text-align: center; box-shadow: 0 10px 26px -10px var(--accent); transition: transform .15s ease, filter .15s ease; }
.btn:hover { filter: brightness(1.06); transform: translateY(-1px); }
.btn svg { width: 20px; height: 20px; flex: none; fill: none; stroke: currentColor; stroke-width: 2.4; stroke-linecap: round; stroke-linejoin: round; }
.btn.big { width: 100%; min-height: 62px; font-size: 18px; }
.price { display: flex; flex-wrap: wrap; align-items: baseline; gap: 4px 14px; margin-bottom: 14px; }
.price.center { justify-content: center; text-align: center; }
.price s { font-size: 17px; color: var(--muted); }
.price .now { display: inline-flex; align-items: baseline; gap: 4px; color: var(--ink); }
.price .now small { font: 700 18px/1 var(--body); }
.price .now b { font: 800 46px/1 var(--body); letter-spacing: -.03em; }
.price em { flex-basis: 100%; font: italic 400 15px/1.4 var(--body); color: var(--muted); }
.price.center em { text-align: center; }
.trust { display: flex; flex-wrap: wrap; justify-content: center; gap: 6px 16px; margin-top: 14px; font: 600 13px/1.3 var(--body); color: var(--muted); }
.trust li { display: inline-flex; align-items: center; gap: 6px; }
.trust li::before { content: ""; width: 7px; height: 7px; border-radius: 50%; background: var(--accent); }
[data-show][hidden] { display: none !important; }

/* hero */
.hero { position: relative; overflow: hidden; padding: 40px 0 52px; }
.hero-grid { display: grid; gap: 28px; position: relative; z-index: 1; }
.hero h1 { margin-top: 14px; font-size: clamp(34px, 8.6vw, 60px); }
.hero .sub { margin-top: 16px; font-size: clamp(17px, 4.4vw, 21px); line-height: 1.5; color: var(--muted); }

/* mockup: capa + duas páginas internas */
.mock { position: relative; width: min(86vw, 420px); aspect-ratio: 1.22; margin: 0 auto; }
.mini { position: absolute; container-type: inline-size; aspect-ratio: 210 / 297; overflow: hidden; background: var(--paper); color: var(--ink); border-radius: 2px; box-shadow: 0 30px 50px -24px rgba(0,0,0,.45), 0 2px 6px rgba(0,0,0,.12); }
.mock .cover { width: 50%; left: 25%; top: 2%; z-index: 3; }
.mock .back1 { width: 44%; left: 52%; top: 9%; transform: rotate(7deg); z-index: 2; }
.mock .back2 { width: 44%; left: 4%; top: 9%; transform: rotate(-7deg); z-index: 1; }
.mini-art { position: absolute; color: var(--accent); }
.mini-title { position: absolute; z-index: 2; font-family: var(--display); font-weight: var(--dw); line-height: 1.04; letter-spacing: var(--track); }
.mini-top, .mini-foot { position: absolute; z-index: 2; font: 700 3.1cqw/1 var(--body); letter-spacing: .2em; text-transform: uppercase; }
.cover.e { background: var(--deep); color: #fff; }
.cover.e .glow { position: absolute; width: 130%; height: 92%; right: -60%; top: -32%; border-radius: 50%; background: radial-gradient(circle at 40% 45%, var(--accent), transparent 64%); opacity: .65; }
.cover.e .mini-top { left: 10%; top: 7%; color: rgba(255,255,255,.75); }
.cover.e .arch { position: absolute; right: 11%; top: 13%; width: 34%; height: 30%; border-radius: 50cqw 50cqw 0 0; border: 1px solid rgba(255,255,255,.45); }
.cover.e .arch .mini-art { left: 18%; bottom: 8%; width: 64%; color: rgba(255,255,255,.9); }
.cover.e .mini-title { left: 10%; right: 10%; bottom: 17%; color: #fff; }
.cover.e .mini-foot { left: 10%; right: 10%; bottom: 7%; padding-top: 3cqw; border-top: 1px solid rgba(255,255,255,.3); color: rgba(255,255,255,.7); }
.cover.m .rail { position: absolute; left: 0; top: 0; bottom: 0; width: 8%; background: var(--accent); }
.cover.m .mini-top { left: 15%; right: 8%; top: 7%; padding-bottom: 2.5cqw; border-bottom: 1.5px solid var(--ink); color: var(--accent); }
.cover.m .mini-title { left: 15%; right: 9%; top: 17%; font-weight: 800; }
.cover.m .mini-route { position: absolute; left: 15%; right: 9%; top: 58%; display: flex; justify-content: space-between; }
.cover.m .mini-route::before { content: ""; position: absolute; left: 0; right: 0; top: 50%; border-top: 1.5px dashed var(--line); }
.cover.m .mini-route i { position: relative; width: 5cqw; height: 5cqw; border-radius: 50%; border: 1.5px solid var(--accent); background: var(--paper); }
.cover.m .mini-route i:first-child { background: var(--accent); }
.cover.m .disc { position: absolute; right: -14%; bottom: -12%; width: 64%; aspect-ratio: 1; border-radius: 50%; background: var(--soft); }
.cover.m .mini-art { right: 9%; bottom: 8%; width: 36%; }
.cover.c { background: var(--deep); color: #fff; text-align: center; }
.cover.c .frame { position: absolute; inset: 5%; border: 1px solid rgba(255,255,255,.4); }
.cover.c .mini-top { left: 0; right: 0; top: 11%; color: var(--soft); }
.cover.c .medal { position: absolute; left: 30%; top: 19%; width: 40%; aspect-ratio: 1; border-radius: 50%; border: 1px solid rgba(255,255,255,.45); background: radial-gradient(circle at 50% 35%, color-mix(in srgb, var(--accent) 70%, transparent), transparent 72%); }
.cover.c .medal .mini-art { inset: 18%; color: #fff; }
.cover.c .mini-title { left: 11%; right: 11%; top: 52%; }
.cover.c .mini-foot { left: 0; right: 0; bottom: 11%; color: rgba(255,255,255,.7); }
.mini-in { padding: 9cqw; }
.mini-head { position: relative; display: block; min-height: 30cqw; margin: -9cqw -9cqw 7cqw; padding: 9cqw 30cqw 6cqw 9cqw; background: var(--soft); }
.mini-head small { display: block; font: 700 3cqw/1 var(--body); letter-spacing: .18em; text-transform: uppercase; color: var(--accent); }
.mini-head b { display: block; margin-top: 2.5cqw; font: var(--dw) 6.2cqw/1.12 var(--display); letter-spacing: var(--track); }
.mini-head .mini-art { right: 6cqw; top: 50%; width: 22cqw; transform: translateY(-50%); }
.ln { display: block; height: 2.2cqw; margin: 0 0 3.2cqw; border-radius: 2cqw; background: var(--line); }
.ln.short { width: 62%; margin-bottom: 6cqw; }
.mini-box { display: block; padding: 5cqw 5cqw 1cqw; border-left: 1.2cqw solid var(--accent); background: color-mix(in srgb, var(--soft) 60%, transparent); }
.mini-bar { display: block; height: 2.4cqw; margin-bottom: 6cqw; border-radius: 3cqw; background: var(--line); overflow: hidden; }
.mini-bar i { display: block; height: 100%; background: var(--accent); }
.mini-cards { display: grid; grid-template-columns: 1fr 1fr; gap: 3cqw; }
.mini-cards span { display: block; padding: 4cqw; border: 1px solid var(--line); }
.mini-cards b { display: block; margin-bottom: 3cqw; font: 600 4.4cqw/1.15 var(--display); }
.mini-cards i { display: block; height: 1.8cqw; margin-top: 2cqw; background: var(--line); }

/* dores e virada */
.pains h2 { font-size: clamp(28px, 6.4vw, 42px); margin-bottom: 28px; }
.pain-list li { display: flex; gap: 16px; align-items: flex-start; padding: 18px 0; border-top: 1px solid var(--line); font-size: 18px; line-height: 1.5; }
.pain-list b { flex: none; font: italic 400 22px/1.2 var(--display); color: var(--accent); min-width: 32px; }
.turn { margin-top: 44px; padding: 30px 26px; border-radius: var(--r); background: var(--deep); color: #fff; }
.turn .label { color: var(--soft); }
.turn p { margin-top: 12px; font: var(--dw) clamp(21px, 5vw, 27px)/1.35 var(--display); letter-spacing: var(--track); }

/* o que recebe */
.receive { background: var(--soft); }
.facts { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 34px; }
.facts div { padding: 16px 12px; border-radius: var(--r); background: var(--paper); text-align: center; }
.facts b { display: block; font: var(--dw) 30px/1 var(--display); color: var(--accent); }
.facts span { display: block; margin-top: 8px; font: 600 12px/1.3 var(--body); letter-spacing: .06em; text-transform: uppercase; color: var(--muted); }
.pages { display: flex; gap: 14px; overflow-x: auto; scroll-snap-type: x mandatory; padding: 6px 4px 30px; margin: 0 -20px 18px; padding-left: 20px; padding-right: 20px; }
.pages .mini { position: relative; flex: 0 0 62%; max-width: 280px; scroll-snap-align: center; }
.toc li, .route-list li { display: flex; gap: 16px; align-items: baseline; padding: 15px 0; border-bottom: 1px solid color-mix(in srgb, var(--ink) 14%, transparent); font-size: 18px; line-height: 1.4; }
.toc i { flex: none; width: 34px; font: italic 400 20px/1 var(--display); color: var(--accent); }
.more { margin-top: 18px; font-weight: 600; color: var(--muted); }

/* benefícios */
.benefit-list { display: grid; gap: 14px; }
.benefit-list li { display: flex; gap: 18px; padding: 22px; border-radius: var(--r); border: 1px solid var(--line); background: #fff8; }
.benefit-list i { flex: none; font: italic 400 26px/1 var(--display); color: var(--accent); min-width: 36px; }
.benefit-list h3 { font-size: 22px; margin-bottom: 6px; }
.benefit-list p { color: var(--muted); }

/* espiada */
.peek { background: linear-gradient(var(--paper), var(--soft)); }
.peek-page { position: relative; padding: 0 26px 30px; border-radius: var(--r); background: #fff; box-shadow: 0 34px 60px -34px rgba(0,0,0,.35); overflow: hidden; }
.peek-page::after { content: "Trecho do material"; position: absolute; right: 14px; bottom: 10px; font: 700 10px/1 var(--body); letter-spacing: .16em; text-transform: uppercase; color: var(--muted); opacity: .7; }
.peek-page header { position: relative; margin: 0 -26px 24px; padding: 28px 120px 24px 26px; background: var(--soft); min-height: 130px; }
.peek-page header small { font: 700 12px/1 var(--body); letter-spacing: .18em; text-transform: uppercase; color: var(--accent); }
.peek-page header h3 { margin-top: 10px; font-size: clamp(22px, 5.4vw, 30px); }
.peek-art { position: absolute; right: 18px; top: 50%; width: 92px; transform: translateY(-50%); color: var(--accent); }
.peek-lead { font-size: 17px; line-height: 1.7; }
.peek-points { margin-top: 18px; }
.peek-points li { position: relative; padding: 10px 0 10px 28px; border-top: 1px solid var(--line); }
.peek-points li::before { content: ""; position: absolute; left: 2px; top: 18px; width: 12px; height: 2px; background: var(--accent); }
.peek-box { margin-top: 22px; padding: 18px 20px; border-left: 4px solid var(--accent); background: color-mix(in srgb, var(--soft) 55%, #fff); }
.peek-box p { margin-top: 8px; }
.entries { display: grid; gap: 12px; }
.entries div { padding: 18px; border: 1px solid var(--line); }
.entries .tag { display: inline-block; padding: 4px 10px; border: 1px solid var(--accent); font: 700 11px/1 var(--body); letter-spacing: .14em; text-transform: uppercase; color: var(--accent); }
.entries h4 { margin: 12px 0 6px; font-size: 22px; }
.entries p { color: var(--muted); font-size: 16px; }

/* para quem é */
.aud-grid { display: grid; gap: 16px; }
.aud { padding: 26px; border-radius: var(--r); }
.aud h3 { font-size: 24px; margin-bottom: 14px; }
.aud li { position: relative; padding: 10px 0 10px 32px; line-height: 1.5; }
.aud li::before { position: absolute; left: 0; top: 9px; width: 22px; height: 22px; border-radius: 50%; font: 800 13px/22px var(--body); text-align: center; }
.aud.yes { background: var(--soft); }
.aud.yes li::before { content: "✓"; background: var(--accent); color: var(--on-accent); }
.aud.no { border: 1px solid var(--line); }
.aud.no li::before { content: "×"; background: var(--line); color: var(--muted); font-size: 16px; }

/* bônus */
.bonus-list li { padding: 18px 20px; margin-bottom: 10px; border: 1px dashed var(--accent); border-radius: var(--r); font-weight: 600; }
.bonus-list li::before { content: "Bônus · "; color: var(--accent); }

/* oferta */
.offer { background: var(--deep); }
.offer-card { padding: 34px 24px 28px; border-radius: max(var(--r), 4px); background: var(--paper); text-align: center; box-shadow: 0 40px 80px -40px rgba(0,0,0,.6); }
.offer-card h2 { margin: 10px 0 24px; font-size: clamp(28px, 6vw, 40px); }
.offer-list { margin: 0 0 28px; text-align: left; }
.offer-list li { position: relative; padding: 12px 0 12px 34px; border-top: 1px solid var(--line); line-height: 1.45; }
.offer-list li::before { content: "✓"; position: absolute; left: 0; top: 12px; width: 22px; height: 22px; border-radius: 50%; background: var(--accent); color: var(--on-accent); font: 800 13px/22px var(--body); text-align: center; }
.once { margin: -4px 0 18px; font-size: 14px; color: var(--muted); }

/* garantia */
.guarantee { padding: 60px 0; }
.g-grid { display: grid; gap: 22px; align-items: center; justify-items: start; }
.seal { display: grid; place-items: center; align-content: center; width: 124px; height: 124px; border-radius: 50%; border: 2px solid var(--accent); outline: 1px solid var(--accent); outline-offset: 5px; text-align: center; color: var(--accent); }
.seal b { display: block; margin-bottom: 9px; font: var(--dw) 46px/.9 var(--display); }
.seal span { font: 700 11px/1.2 var(--body); letter-spacing: .12em; text-transform: uppercase; }
.guarantee h2 { font-size: clamp(26px, 5.6vw, 36px); margin-bottom: 10px; }
.guarantee p { color: var(--muted); }

/* faq */
.faq { background: var(--soft); }
.faq-list details { border-bottom: 1px solid color-mix(in srgb, var(--ink) 14%, transparent); }
.faq-list summary { position: relative; padding: 20px 40px 20px 0; font: 700 18px/1.35 var(--body); cursor: pointer; list-style: none; }
.faq-list summary::-webkit-details-marker { display: none; }
.faq-list summary::after { content: "+"; position: absolute; right: 4px; top: 16px; font: 400 28px/1 var(--body); color: var(--accent); transition: transform .2s; }
.faq-list details[open] summary::after { transform: rotate(45deg); }
.faq-list details p { padding: 0 0 22px; color: var(--muted); }

/* fechamento */
.final { position: relative; overflow: hidden; background: var(--deep); color: #fff; text-align: center; padding: 80px 0 90px; }
.final-art { width: 96px; margin: 0 auto 22px; color: var(--accent); }
.final h2 { font-size: clamp(30px, 7vw, 48px); margin-bottom: 30px; }
.final .price .now, .final .price s, .final .price em { color: rgba(255,255,255,.9); }
.final .price em, .final .price s { color: rgba(255,255,255,.65); }
.foot { padding: 34px 0 120px; font-size: 13px; line-height: 1.6; color: var(--muted); text-align: center; }
.foot p + p { margin-top: 8px; }
.notice { padding: 14px 16px; margin-bottom: 18px; border: 1px solid var(--line); border-radius: var(--r); text-align: left; }

/* barra fixa no celular */
.sticky { position: fixed; left: 0; right: 0; bottom: 0; z-index: 50; display: flex; align-items: center; gap: 14px; padding: 12px 16px calc(12px + env(safe-area-inset-bottom)); background: color-mix(in srgb, var(--paper) 94%, transparent); backdrop-filter: blur(10px); border-top: 1px solid var(--line); transform: translateY(110%); transition: transform .25s ease; }
.sticky.on { transform: none; }
.sticky-price { display: grid; line-height: 1.1; white-space: nowrap; }
.sticky-price s { font-size: 12px; color: var(--muted); }
.sticky-price span { font: 700 14px/1.1 var(--body); }
.sticky-price b { font-size: 22px; letter-spacing: -.02em; }
.sticky .btn { flex: 1; min-height: 50px; padding: 0 14px; font-size: 16px; }

${styleCss(copy.style)}

@media (min-width: 860px) {
  body { font-size: 18px; }
  section { padding: 104px 0; }
  .hero { padding: 72px 0 96px; }
  .hero-grid { grid-template-columns: 1.05fr .95fr; grid-template-areas: "text mock" "buy mock"; column-gap: 56px; row-gap: 32px; align-items: end; }
  .hero-text { grid-area: text; }
  .hero-buy { grid-area: buy; align-self: start; max-width: 460px; }
  .hero .mock { grid-area: mock; align-self: center; width: 100%; max-width: 540px; }
  .hero-buy .trust { justify-content: flex-start; }
  .facts, .receive .sec-head { max-width: 760px; margin-left: auto; margin-right: auto; }
  .pages { justify-content: center; overflow: visible; margin: 0 0 30px; }
  .pages .mini { flex: 0 0 240px; }
  .pages .mini:nth-child(1) { transform: rotate(-3deg) translateY(10px); }
  .pages .mini:nth-child(3) { transform: rotate(3deg) translateY(10px); }
  .benefit-list { grid-template-columns: repeat(2, 1fr); }
  .aud-grid { grid-template-columns: 1fr 1fr; }
  .aud-grid.solo { grid-template-columns: 1fr; max-width: 760px; margin: 0 auto; }
  .g-grid { grid-template-columns: auto 1fr; gap: 36px; }
  .offer-card { padding: 52px 56px 40px; }
  .sticky { display: none; }
  .foot { padding-bottom: 40px; }
}
`;
}

// Variação estrutural por estilo (mesmos 3 estilos do PDF).
function styleCss(style: DocumentStyle) {
  if (style === "manual") {
    return `
.hero { background: var(--paper); }
.hero::before { content: ""; position: absolute; left: 0; top: 0; bottom: 0; width: 10px; background: var(--accent); }
.hero::after { content: ""; position: absolute; right: -180px; bottom: -220px; width: 560px; height: 560px; border-radius: 50%; background: var(--soft); }
.hero .eyebrow { padding: 8px 14px; border-radius: 999px; background: var(--soft); letter-spacing: .12em; }
.hero h1 { font-weight: 800; }
.pain-list li { align-items: center; padding: 16px 18px; margin-bottom: 10px; border: 1.5px solid var(--line); border-radius: var(--r); background: #fff; }
.pain-list .box { flex: none; width: 24px; height: 24px; border: 2px solid var(--accent); border-radius: 7px; }
.turn { background: var(--accent); color: var(--on-accent); }
.turn .label { color: inherit; opacity: .8; }
.route-list { position: relative; }
.route-list::before { content: ""; position: absolute; left: 19px; top: 24px; bottom: 24px; border-left: 2px dashed color-mix(in srgb, var(--accent) 45%, transparent); }
.route-list li { border: 0; align-items: center; }
.route-list i { position: relative; flex: none; width: 40px; height: 40px; border-radius: 50%; border: 2px solid var(--accent); background: var(--paper); font: 800 15px/36px var(--body); font-style: normal; text-align: center; color: var(--accent); }
.route-list li:first-child i { background: var(--accent); color: var(--on-accent); }
.route-list small { display: block; font: 800 11px/1.2 var(--body); letter-spacing: .14em; text-transform: uppercase; color: var(--accent); }
.benefit-list { counter-reset: b; }
.benefit-list li { position: relative; flex-direction: column; gap: 10px; background: #fff; border-width: 1.5px; }
.benefit-list i { width: 40px; height: 40px; border-radius: 12px; background: var(--soft); font: 800 18px/40px var(--body); font-style: normal; text-align: center; }
.benefit-list li::after { content: ""; position: absolute; left: 22px; right: 22px; bottom: 0; height: 4px; border-radius: 4px 4px 0 0; background: var(--accent); opacity: .25; }
.offer-card { border: 2px solid var(--ink); }
.facts div { border: 1.5px solid var(--ink); }
.seal { border-radius: 24px; outline-offset: 4px; }
`;
  }
  if (style === "catalogo") {
    return `
.hero { background: var(--deep); color: #fff; text-align: center; }
.hero::before { content: ""; position: absolute; inset: 14px; border: 1px solid rgba(255,255,255,.28); pointer-events: none; }
.hero::after { content: ""; position: absolute; inset: 20px; border: 1px solid rgba(255,255,255,.12); pointer-events: none; }
.hero .eyebrow { display: flex; align-items: center; justify-content: center; gap: 12px; color: var(--soft); }
.hero .eyebrow::before, .hero .eyebrow::after { content: ""; width: 36px; border-top: 1px solid currentColor; opacity: .6; }
.hero h1 { font-weight: 500; font-size: clamp(38px, 9.6vw, 66px); }
.hero .sub { color: rgba(255,255,255,.8); font-family: var(--display); font-style: italic; font-size: clamp(20px, 5vw, 25px); }
.hero .mock::before { content: ""; position: absolute; left: 50%; top: 48%; width: 92%; aspect-ratio: 1; transform: translate(-50%, -50%); border-radius: 50%; border: 1px solid rgba(255,255,255,.25); background: radial-gradient(circle, color-mix(in srgb, var(--accent) 55%, transparent), transparent 70%); }
.hero .price .now { color: #fff; }
.hero .price s, .hero .price em, .hero .trust { color: rgba(255,255,255,.7); }
.hero .price { justify-content: center; }
.hero .price em { text-align: center; }
.sec-head { text-align: center; }
.sec-head .label { display: flex; align-items: center; justify-content: center; gap: 12px; }
.sec-head .label::before, .sec-head .label::after { content: ""; width: 30px; border-top: 1px solid currentColor; opacity: .6; }
.sec-head p { margin-left: auto; margin-right: auto; }
.sec-head h2, .pains h2 { font-weight: 500; }
.pains h2 { text-align: center; }
.pain-list li { justify-content: center; text-align: center; padding: 22px 6px; font: italic 400 23px/1.35 var(--display); }
.pain-list li:first-child { border-top: 0; }
.pain-list li span::before, .pain-list li span::after { content: "—"; margin: 0 10px; color: var(--accent); font-style: normal; }
.turn { text-align: center; border-radius: 0; outline: 1px solid var(--deep); outline-offset: 6px; }
.index-cards { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.index-cards div { padding: 18px 16px; border: 1px solid color-mix(in srgb, var(--ink) 16%, transparent); background: var(--paper); }
.index-cards i { display: block; font: italic 500 26px/1 var(--display); color: var(--accent); }
.index-cards span { display: block; margin-top: 8px; font: 600 19px/1.2 var(--display); }
.benefit-list li { flex-direction: column; text-align: center; align-items: center; gap: 8px; padding: 30px 24px; background: transparent; border-color: color-mix(in srgb, var(--ink) 16%, transparent); }
.benefit-list i { font-style: italic; font-weight: 500; }
.benefit-list h3 { font-size: 25px; }
.aud { border-radius: 0; text-align: center; }
.aud li { padding-left: 0; padding-top: 38px; }
.aud li::before { left: 50%; margin-left: -11px; top: 8px; }
.offer-card { border-radius: 0; outline: 1px solid var(--paper); outline-offset: 8px; }
.peek-page { border-radius: 0; }
.final .price .now { color: #fff; }
@media (min-width: 860px) {
  .hero-grid { grid-template-columns: 1fr; grid-template-areas: "text" "mock" "buy"; justify-items: center; max-width: 820px; margin: 0 auto; }
  .hero .mock { max-width: 460px; }
  .hero-buy { width: 100%; max-width: 440px; }
  .hero-buy .trust { justify-content: center; }
  .index-cards { grid-template-columns: repeat(4, 1fr); }
  .benefit-list { grid-template-columns: repeat(3, 1fr); }
}
`;
  }
  return `
.hero { background: var(--deep); color: #fff; }
.hero::before { content: ""; position: absolute; width: 760px; height: 760px; right: -320px; top: -300px; border-radius: 50%; background: radial-gradient(circle at 40% 45%, var(--accent), transparent 64%); opacity: .55; }
.hero::after { content: ""; position: absolute; width: 520px; height: 520px; left: -330px; top: 120px; border-radius: 50%; border: 1px solid rgba(255,255,255,.14); }
.hero .eyebrow { color: var(--soft); }
.hero .sub { color: rgba(255,255,255,.78); font-family: var(--display); font-style: italic; font-weight: 300; }
.hero .price .now { color: #fff; }
.hero .price s, .hero .price em, .hero .trust { color: rgba(255,255,255,.7); }
.pains h2 { font-style: italic; font-weight: 300; }
.turn { border-radius: 0; background: transparent; color: var(--ink); padding: 6px 0 6px 26px; border-left: 4px solid var(--accent); }
.turn .label { color: var(--accent); }
.turn p { font-style: italic; font-weight: 300; }
.toc li { border-bottom-style: dotted; }
.benefit-list li { border: 0; border-top: 2px solid var(--accent); border-radius: 0; background: transparent; padding: 22px 0 6px; }
.benefit-list h3 { font-weight: 400; }
.peek-lead::first-letter { float: left; margin: 6px 10px 0 0; font: 400 58px/.8 var(--display); color: var(--accent); }
.aud { border-radius: 0; }
.offer-card { border-radius: 0; }
`;
}

/* ---------- configuração editável e script ---------- */

export type OfertaConfig = {
  preco: string;
  precoDe: string;
  checkout: string;
  pixel: string;
  bonus: string[];
};

export const defaultOferta: OfertaConfig = { preco: "", precoDe: "", checkout: "", pixel: "", bonus: [] };

// Preço sugerido quando o aluno ainda não preencheu: low ticket em reais ou em dólar.
export function defaultPrice(lang: ProductLanguage) {
  return lang === "es" ? "9.90" : "19,90";
}

// Só números: o ID do pixel da Meta tem de 15 a 16 dígitos.
export function cleanPixelId(value: string) {
  const digits = String(value || "").replace(/\D/g, "");
  return digits.length >= 8 && digits.length <= 20 ? digits : "";
}

// Valores entram dentro de <script>: JSON.stringify + escape de "<" impede fechar a tag.
function jsValue(value: unknown) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

function configScript(lang: ProductLanguage, input: Partial<OfertaConfig> = {}) {
  const oferta = { ...defaultOferta, ...input };
  const checkout = /^https?:\/\//i.test(oferta.checkout.trim()) ? oferta.checkout.trim() : "";
  return `<script>
/* =====================================================================
   CONFIGURAÇÃO DA OFERTA: troque só estes valores antes de publicar.
   - preco: valor que aparece em toda a página (ex.: "${defaultPrice(lang)}")
   - precoDe: preço "de" riscado, só se for real (deixe "" para esconder)
   - checkout: link do seu checkout (enquanto vazio, os botões levam à oferta)
   - pixel: ID do seu pixel da Meta, só os números (deixe "" se ainda não tiver)
   - bonus: só se você realmente entregar bônus, ex.: ["Planilha de compras"]
   Os textos da página podem ser editados direto no HTML abaixo.
   ===================================================================== */
window.OFERTA = {
  preco: ${jsValue(oferta.preco.trim() || defaultPrice(lang))},
  precoDe: ${jsValue(oferta.precoDe.trim())},
  checkout: ${jsValue(checkout)},
  pixel: ${jsValue(cleanPixelId(oferta.pixel))},
  bonus: ${jsValue((oferta.bonus || []).map((b) => String(b).trim()).filter(Boolean))}
};
</script>`;
}

const runtimeScript = (copy: Copy) => `<script>
(function () {
  var o = window.OFERTA || {};
  var moeda = ${jsValue(currencyOf(copy.lang).code)};
  var all = function (sel) { return Array.prototype.slice.call(document.querySelectorAll(sel)); };
  var preco = String(o.preco || "").trim();
  var precoDe = String(o.precoDe || "").trim();
  var valor = (moeda === "BRL" ? parseFloat(preco.replace(/\\./g, "").replace(",", ".")) : parseFloat(preco.replace(/,/g, ""))) || 0;
  all("[data-preco]").forEach(function (el) { el.textContent = preco; });
  all("[data-preco-de]").forEach(function (el) { el.textContent = precoDe; });
  all("[data-show=precoDe]").forEach(function (el) { el.hidden = !precoDe; });
  var limite = moeda === "BRL" ? [20, 50] : [5, 15];
  var ancora = valor && valor <= limite[0] ? ${jsValue(copy.t("Menos do que um lanche no delivery."))} : valor && valor <= limite[1] ? ${jsValue(copy.t("Menos do que uma pizza no fim de semana."))} : "";
  all("[data-ancora]").forEach(function (el) { el.textContent = precoDe ? ${jsValue(copy.t("Pagamento único, acesso imediato."))} : ancora; });
  if (o.checkout && /^https?:\\/\\//.test(o.checkout)) {
    all("[data-checkout]").forEach(function (el) { el.href = o.checkout; });
  }
  var pixel = String(o.pixel || "").replace(/\\D/g, "");
  if (pixel) {
    !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version="2.0";n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,"script","https://connect.facebook.net/en_US/fbevents.js");
    fbq("init", pixel);
    fbq("track", "PageView");
    fbq("track", "ViewContent", { value: valor, currency: moeda });
  }
  if (pixel && o.checkout && /^https?:\\/\\//.test(o.checkout)) {
    all("[data-checkout]").forEach(function (el) {
      el.addEventListener("click", function () { if (window.fbq) fbq("track", "InitiateCheckout", { value: valor, currency: moeda }); });
    });
  }
  var bonus = Array.isArray(o.bonus) ? o.bonus.filter(Boolean) : [];
  if (bonus.length) {
    var sec = document.getElementById("bonus");
    if (sec) sec.hidden = false;
    all("[data-bonus-list]").forEach(function (ul) {
      bonus.forEach(function (b) { var li = document.createElement("li"); li.textContent = b; ul.appendChild(li); });
    });
    all("[data-offer-list]").forEach(function (ul) {
      bonus.forEach(function (b) { var li = document.createElement("li"); li.textContent = ${jsValue(copy.t("Bônus: "))} + b; ul.appendChild(li); });
    });
  }
  var bar = document.querySelector("[data-sticky]");
  var top = document.getElementById("topo-compra");
  var offer = document.getElementById("oferta");
  if (bar && top && "IntersectionObserver" in window) {
    var seenTop = true, seenOffer = false;
    var update = function () { var on = !seenTop && !seenOffer; bar.classList.toggle("on", on); bar.setAttribute("aria-hidden", on ? "false" : "true"); };
    new IntersectionObserver(function (e) { seenTop = e[0].isIntersecting || e[0].boundingClientRect.top > 0; update(); }).observe(top);
    if (offer) new IntersectionObserver(function (e) { seenOffer = e[0].isIntersecting; update(); }, { threshold: 0.2 }).observe(offer);
  }
})();
</script>`;

/* ---------- página ---------- */

export function buildSalesPage(input: SalesProduct, oferta?: Partial<OfertaConfig>) {
  // Projetos muito antigos podem não ter algum bloco; a página sai com o que existir.
  const product: SalesProduct = {
    ...input,
    modules: input.modules || [],
    productContent: input.productContent || [],
    copyBlocks: {
      hook: input.copyBlocks?.hook || "",
      headline: input.copyBlocks?.headline || "",
      cta: input.copyBlocks?.cta || "",
      bullets: input.copyBlocks?.bullets || [],
    },
    salesPage: {
      ...input.salesPage,
      headline: input.salesPage?.headline || "",
      subheadline: input.salesPage?.subheadline || "",
      cta: input.salesPage?.cta || "",
      sections: input.salesPage?.sections || [],
    },
  };
  const copy = buildCopy(product);
  const body = [
    heroSection(product, copy),
    painsSection(copy),
    receiveSection(product, copy),
    benefitsSection(copy),
    peekSection(copy),
    audienceSection(copy),
    bonusSection(copy),
    offerSection(product, copy),
    guaranteeSection(copy),
    faqSection(copy),
    finalSection(product, copy),
  ].join("\n");

  return `<!doctype html>
<html lang="${currencyOf(copy.lang).htmlLang}" data-style="${copy.style}">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<title>${esc(product.title)}</title>
<meta name="description" content="${esc(copy.subheadline)}" />
<meta name="theme-color" content="${copy.palette.deep}" />
${configScript(copy.lang, oferta)}
<style>${googleFontCss(copy.style)}${css(copy)}</style>
</head>
<body>
${body}
${runtimeScript(copy)}
</body>
</html>`;
}
