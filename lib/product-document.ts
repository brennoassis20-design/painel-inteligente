// Template único do produto entregue ao comprador: gera o HTML que vira o 01-produto-pronto.pdf
// (renderizado no servidor) e o 02-produto-editavel.html (montado no navegador).
// Sem dependências de Node: pode ser importado pelo cliente e pelo servidor.

import { documentArt } from "@/lib/document-art";

export type DocumentStyle = "editorial" | "manual" | "catalogo";

export type DocumentBlock = {
  title: string;
  body: string;
  task: string;
  points?: string[];
  tip?: string;
  example?: string;
  table?: { columns: string[]; rows: string[][] };
  entries?: { name: string; detail: string; tag?: string }[];
};

export type DocumentProduct = {
  title: string;
  subtitle: string;
  promise: string;
  modules: string[];
  productContent: DocumentBlock[];
  format?: string;
  intro?: string;
  closing?: string;
};

export type DocumentPalette = {
  id: string;
  paper: string;
  ink: string;
  muted: string;
  accent: string;
  deep: string;
  soft: string;
  line: string;
};

export type RenderOptions = {
  // CSS de fontes: @font-face embutido (PDF) ou @import do Google Fonts (HTML editável).
  fontCss: string;
  // Página de início de cada capítulo, na ordem; ausente no primeiro passo e no HTML editável.
  pageNumbers?: number[];
  // Capítulos que transbordaram no passo anterior e recebem espaçamento mais justo.
  compact?: number[];
  // Capítulos que ainda transbordaram no modo compacto: perdem os elementos opcionais.
  tight?: number[];
  target: "pdf" | "html";
};

const palettes: Record<string, DocumentPalette> = {
  rose: { id: "rose", paper: "#faf5f0", ink: "#2a201d", muted: "#7a6a62", accent: "#b0645a", deep: "#3d2723", soft: "#f0e1d8", line: "#e3d3c8" },
  sage: { id: "sage", paper: "#f5f6f0", ink: "#1d2620", muted: "#66716a", accent: "#4d7a5c", deep: "#1e3529", soft: "#e2e9dc", line: "#d3dbcc" },
  navy: { id: "navy", paper: "#f7f5ef", ink: "#16203a", muted: "#5f667a", accent: "#b38a2e", deep: "#121c33", soft: "#ece5d3", line: "#ddd6c4" },
  terracotta: { id: "terracotta", paper: "#fbf4ea", ink: "#2c1e14", muted: "#7b6656", accent: "#c0582c", deep: "#3a2214", soft: "#f3e0cd", line: "#e8d3bd" },
  plum: { id: "plum", paper: "#f9f4f4", ink: "#271c25", muted: "#776874", accent: "#8e4a74", deep: "#2e1a2a", soft: "#efdfe8", line: "#e2d2dc" },
  forest: { id: "forest", paper: "#f4f3ec", ink: "#1b241c", muted: "#626b5f", accent: "#a5772a", deep: "#1a2b20", soft: "#e8e3cf", line: "#d8d4c0" },
  graphite: { id: "graphite", paper: "#f6f5f2", ink: "#1b1b1d", muted: "#68686e", accent: "#3a5bd9", deep: "#17181c", soft: "#e4e7f3", line: "#dcdcdf" },
};

export const documentFonts: Record<DocumentStyle, { google: string; files: { family: string; file: string; style: string; weight: string }[] }> = {
  editorial: {
    google: "family=Fraunces:ital,opsz,wght@0,9..144,300..800;1,9..144,300..800&family=Inter:wght@300..800",
    files: [
      { family: "Fraunces", file: "Fraunces-normal-300-800.woff2", style: "normal", weight: "300 800" },
      { family: "Fraunces", file: "Fraunces-italic-300-800.woff2", style: "italic", weight: "300 800" },
      { family: "Inter", file: "Inter-normal-300-800.woff2", style: "normal", weight: "300 800" },
    ],
  },
  manual: {
    google: "family=Plus+Jakarta+Sans:wght@300..800",
    files: [{ family: "Plus Jakarta Sans", file: "PlusJakartaSans-normal-300-800.woff2", style: "normal", weight: "300 800" }],
  },
  catalogo: {
    google: "family=Cormorant+Garamond:ital,wght@0,300..700;1,300..700&family=Inter:wght@300..800",
    files: [
      { family: "Cormorant Garamond", file: "CormorantGaramond-normal-300-700.woff2", style: "normal", weight: "300 700" },
      { family: "Cormorant Garamond", file: "CormorantGaramond-italic-300-700.woff2", style: "italic", weight: "300 700" },
      { family: "Inter", file: "Inter-normal-300-800.woff2", style: "normal", weight: "300 800" },
    ],
  },
};

function normalize(value: string) {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export function resolveDocumentStyle(product: DocumentProduct): DocumentStyle {
  const declared = normalize(product.format || "");
  if (declared.startsWith("editorial")) return "editorial";
  if (declared.startsWith("manual")) return "manual";
  if (declared.startsWith("catalog")) return "catalogo";

  const value = normalize(`${product.title} ${product.subtitle} ${product.promise}`);
  if (/fornecedor|lista|catalogo|diretorio|curadoria|selecao|onde comprar/.test(value)) return "catalogo";
  if (/protocolo|plano de \d+|dias|rotina|desafio|passo a passo|cronograma|treino/.test(value)) return "manual";
  return "editorial";
}

export function resolveDocumentPalette(product: DocumentProduct): DocumentPalette {
  // O título decide primeiro; subtítulo e promessa só desempatam (ex.: "marmitas" que citam orçamento).
  const byTitle = paletteFor(normalize(product.title));
  return byTitle || paletteFor(normalize(`${product.subtitle} ${product.promise}`)) || palettes.graphite;
}

function paletteFor(value: string) {
  if (/casamento|noiva|festa|evento|maternidade|bebe|gestante/.test(value)) return palettes.rose;
  if (/saude|bem-estar|alongamento|postura|sono|ansiedade|yoga|treino|fitness|corpo/.test(value)) return palettes.sage;
  if (/financ|dinheiro|divida|orcamento|invest|renda|negocio|empresa|vendas/.test(value)) return palettes.navy;
  if (/receita|cozinha|marmita|cardapio|bolo|doce|comida|aliment|confeitaria|cafe/.test(value)) return palettes.terracotta;
  if (/beleza|skincare|pele|cabelo|maquiagem|unha|estetica|moda/.test(value)) return palettes.plum;
  if (/pet|cachorro|gato|planta|jardim|horta|viagem|natureza|casa/.test(value)) return palettes.forest;
  return undefined;
}

function esc(value: string) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function cssString(value: string) {
  return `"${String(value ?? "").replaceAll("\\", "\\\\").replaceAll('"', '\\"').replace(/\s+/g, " ")}"`;
}

function paragraphs(value: string) {
  return String(value ?? "")
    .split(/\n{2,}|\n(?=\S)/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => `<p>${esc(part)}</p>`)
    .join("");
}

// Título da última página de cada estilo; o motor do PDF localiza essa página pelos marcadores.
export const endTitles: Record<DocumentStyle, string> = {
  editorial: "Checklist final",
  manual: "Acompanhamento",
  catalogo: "Minha seleção",
};

// Remove numeração que a IA às vezes coloca no título ("Bloco 3: ...", "Etapa 2 - ...").
export function blockTitle(block: Pick<DocumentBlock, "title">) {
  return block.title.replace(/^\s*(bloco|parte|cap[ií]tulo|etapa|m[oó]dulo|passo|categoria)\s*\d+\s*[:.\-–—]\s*/i, "").trim() || block.title;
}

// Fonte do título da capa diminui conforme o comprimento, para títulos longos não invadirem o resto.
function coverTitleSize(title: string, base: number) {
  const length = title.trim().length;
  if (length > 70) return `${Math.round(base * 0.66)}pt`;
  if (length > 50) return `${Math.round(base * 0.78)}pt`;
  if (length > 32) return `${Math.round(base * 0.88)}pt`;
  return `${base}pt`;
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function tableHtml(table?: DocumentBlock["table"]) {
  if (!table?.columns?.length || !table.rows?.length) return "";
  const head = table.columns.map((cell) => `<th>${esc(cell)}</th>`).join("");
  const rows = table.rows
    .map((row) => `<tr>${table.columns.map((_, index) => `<td>${esc(row[index] || "")}</td>`).join("")}</tr>`)
    .join("");
  return `<table><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table>`;
}

function baseCss(palette: DocumentPalette, product: DocumentProduct) {
  return `
    :root { --paper: ${palette.paper}; --ink: ${palette.ink}; --muted: ${palette.muted}; --accent: ${palette.accent}; --deep: ${palette.deep}; --soft: ${palette.soft}; --line: ${palette.line}; }
    * { box-sizing: border-box; }
    html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    body { margin: 0; background: var(--paper); color: var(--ink); }
    @page { size: A4; margin: 22mm 20mm 24mm 20mm; background: var(--paper);
      @bottom-left { content: ${cssString(product.title)}; font: 500 7pt/1 Inter, sans-serif; letter-spacing: .08em; text-transform: uppercase; color: ${palette.muted}; vertical-align: top; padding-top: 6mm; }
      @bottom-right { content: counter(page, decimal-leading-zero); font: 600 8pt/1 Inter, sans-serif; color: ${palette.accent}; vertical-align: top; padding-top: 6mm; }
    }
    @page cover { margin: 0; @bottom-left { content: none; } @bottom-right { content: none; } }
    @page closing { margin: 0; @bottom-left { content: none; } @bottom-right { content: none; } }
    .page-break { break-before: page; }
    @media screen {
      body { background: #dcd8d2; padding: 32px 0; }
      .sheet { width: 210mm; margin: 0 auto 28px; background: var(--paper); box-shadow: 0 18px 50px rgba(0,0,0,.18); padding: 22mm 20mm 24mm; }
      .sheet.full { padding: 0; }
      [contenteditable]:focus { outline: none; }
      .edit-hint { position: sticky; top: 0; z-index: 10; width: 210mm; margin: -32px auto 24px; padding: 12px 18px; background: var(--deep); color: #fff; font: 500 13px/1.45 system-ui, sans-serif; border-radius: 0 0 10px 10px; }
    }
    @media print { .edit-hint { display: none; } }
  `;
}

/* ---------- Guia editorial ---------- */

function editorialCss() {
  return `
    body { font-family: Inter, sans-serif; font-size: 10.2pt; line-height: 1.64; font-weight: 400; }
    h1, h2, h3, .serif { font-family: Fraunces, Georgia, serif; font-optical-sizing: auto; font-weight: 400; letter-spacing: -.01em; }
    p { margin: 0 0 3.4mm; }
    .kicker, .label { display: block; font: 600 7.3pt/1 Inter, sans-serif; letter-spacing: .22em; text-transform: uppercase; color: var(--accent); }
    .label { margin: 0 0 3.5mm; }

    .cover { page: cover; position: relative; width: 210mm; height: 297mm; overflow: hidden; background: var(--deep); color: #fff; }
    .cover::before { content: ""; position: absolute; width: 260mm; height: 260mm; right: -120mm; top: -90mm; border-radius: 50%; background: radial-gradient(circle at 40% 45%, var(--accent), transparent 64%); opacity: .6; }
    .cover::after { content: ""; position: absolute; width: 150mm; height: 150mm; left: -95mm; top: 30mm; border-radius: 50%; border: .3mm solid rgba(255,255,255,.16); }
    .arch { position: absolute; right: 24mm; top: 40mm; width: 84mm; height: 112mm; border-radius: 42mm 42mm 0 0; border: .3mm solid rgba(255,255,255,.4); }
    .arch::before { content: ""; position: absolute; inset: 6mm; border-radius: 36mm 36mm 0 0; border: .3mm solid rgba(255,255,255,.22); }
    .arch::after { content: ""; position: absolute; inset: 12mm; border-radius: 30mm 30mm 0 0; background: linear-gradient(180deg, rgba(255,255,255,.2), rgba(255,255,255,.02)); }
    .arch .art { position: absolute; left: 12mm; bottom: 10mm; width: 60mm; height: 60mm; color: rgba(255,255,255,.92); z-index: 1; }
    .cover-head { position: absolute; top: 18mm; left: 22mm; right: 22mm; display: flex; justify-content: space-between; font: 600 7pt/1 Inter, sans-serif; letter-spacing: .24em; text-transform: uppercase; color: rgba(255,255,255,.75); z-index: 1; }
    .cover-body { position: absolute; left: 22mm; right: 26mm; bottom: 46mm; z-index: 1; }
    .cover-body .kicker { color: var(--soft); }
    .cover-body h1 { margin: 5mm 0 7mm; font-size: 46pt; line-height: 1; font-weight: 400; color: #fff; }
    .cover-body .sub { font-family: Fraunces, serif; font-style: italic; font-weight: 300; font-size: 14pt; line-height: 1.38; color: rgba(255,255,255,.82); max-width: 150mm; }
    .facts { position: absolute; left: 22mm; right: 22mm; bottom: 18mm; display: grid; grid-template-columns: repeat(3, 1fr); border-top: .3mm solid rgba(255,255,255,.28); z-index: 1; }
    .facts div { padding: 4.5mm 4mm 0 0; font: 500 7.4pt/1.4 Inter, sans-serif; letter-spacing: .12em; text-transform: uppercase; color: rgba(255,255,255,.7); }
    .facts b { display: block; font-family: Fraunces, serif; font-weight: 400; font-size: 19pt; letter-spacing: 0; text-transform: none; color: #fff; margin-bottom: 1mm; }

    .toc h2 { font-size: 36pt; margin: 6mm 0 12mm; }
    .toc ol { list-style: none; margin: 0; padding: 0; }
    .toc li { display: flex; align-items: baseline; gap: 5mm; padding: 3.8mm 0; border-bottom: .25mm solid var(--line); }
    .toc .n { font-family: Fraunces, serif; font-style: italic; color: var(--accent); font-size: 13pt; width: 9mm; }
    .toc .t { flex: 1; font-size: 11pt; }
    .toc .p { font: 600 9pt/1 Inter, sans-serif; color: var(--muted); font-variant-numeric: tabular-nums; }

    .intro h2 { font-size: 32pt; line-height: 1.05; margin: 6mm 0 6mm; }
    .intro .sub { font-family: Fraunces, serif; font-style: italic; font-weight: 300; font-size: 13pt; line-height: 1.45; color: var(--muted); margin-bottom: 8mm; }
    .intro .lead p { font-size: 10.6pt; }
    .pull { margin: 8mm 0; padding: 2mm 0 2mm 9mm; border-left: .8mm solid var(--accent); font-family: Fraunces, serif; font-style: italic; font-size: 15pt; line-height: 1.34; font-weight: 300; }
    .map { display: grid; grid-template-columns: 1fr 1fr; gap: 0 8mm; margin-top: 4mm; }
    .map div { padding: 3.4mm 0; border-top: .25mm solid var(--line); font-size: 9.2pt; line-height: 1.45; }
    .map b { display: block; font-family: Fraunces, serif; font-style: italic; font-weight: 400; color: var(--accent); font-size: 10.5pt; margin-bottom: .6mm; }

    .chapter-head { position: relative; min-height: 52mm; padding: 9mm 9mm 8mm; margin-bottom: 9mm; background: var(--soft); overflow: hidden; display: flex; flex-direction: column; justify-content: flex-end; }
    .chapter-head::after { content: ""; position: absolute; right: -16mm; top: -18mm; width: 70mm; height: 70mm; border-radius: 50%; background: var(--paper); opacity: .55; }
    .chapter-head h2 { position: relative; z-index: 1; font-size: 25pt; line-height: 1.1; margin: 4mm 0 0; max-width: 112mm; }
    .chapter-head .art { position: absolute; right: 7mm; top: 50%; transform: translateY(-50%); width: 40mm; height: 40mm; color: var(--accent); z-index: 1; }
    .chapter-num { position: relative; z-index: 1; margin-bottom: 2mm; font-family: Fraunces, serif; font-weight: 300; font-size: 30pt; line-height: 1; color: var(--accent); opacity: .9; }
    .chapter-grid { display: grid; grid-template-columns: 1fr 52mm; gap: 9mm; }
    .chapter-grid.solo { grid-template-columns: 1fr; }
    .text > p:first-child { font-size: 11pt; line-height: 1.6; }
    .text > p:first-child::first-letter { float: left; font-family: Fraunces, serif; font-size: 37pt; line-height: 1; margin: .4mm 2.4mm 0 0; color: var(--accent); }
    .aside > div { padding-top: 4mm; margin-bottom: 7mm; border-top: .6mm solid var(--accent); font-size: 9pt; line-height: 1.55; break-inside: avoid; }
    .aside .example { border-top-color: var(--ink); }
    .aside .example p { font-family: Fraunces, serif; font-style: italic; font-size: 10pt; line-height: 1.5; }
    .keypoints { margin: 6mm 0 2mm; break-inside: avoid; }
    .keypoints ol { margin: 0; padding: 0; list-style: none; counter-reset: k; }
    .keypoints li { counter-increment: k; position: relative; padding: 2.4mm 0 2.4mm 10mm; border-top: .25mm solid var(--line); }
    .keypoints li::before { content: counter(k, decimal-leading-zero); position: absolute; left: 0; top: 2.2mm; font-family: Fraunces, serif; font-style: italic; font-size: 11pt; color: var(--accent); }
    table { width: 100%; border-collapse: collapse; margin: 4mm 0 6mm; font-size: 9pt; line-height: 1.45; break-inside: avoid; }
    th { text-align: left; font: 700 7pt/1.3 Inter, sans-serif; letter-spacing: .14em; text-transform: uppercase; color: var(--accent); border-bottom: .4mm solid var(--ink); padding: 2.4mm 3mm 2.4mm 0; }
    td { border-bottom: .25mm solid var(--line); padding: 2.6mm 3mm 2.6mm 0; vertical-align: top; }
    td:first-child { font-weight: 600; }
    .practice { display: grid; grid-template-columns: 30mm 1fr; gap: 6mm; align-items: center; margin-top: 6mm; padding: 6mm 7mm; background: var(--deep); color: #fff; break-inside: avoid; }
    .practice .label { color: var(--soft); margin: 0; line-height: 1.5; }
    .practice p { margin: 0; font-family: Fraunces, serif; font-size: 11.5pt; line-height: 1.42; font-weight: 300; }

    .chapter.compact { font-size: 9.5pt; line-height: 1.55; }
    .chapter.compact .chapter-head { min-height: 40mm; padding: 7mm 8mm 6mm; margin-bottom: 6mm; }
    .chapter.compact .chapter-num { font-size: 24pt; }
    .chapter.compact .chapter-head .art { width: 30mm; height: 30mm; }
    .chapter.compact p { margin-bottom: 2.6mm; }
    .chapter.compact table { margin: 3mm 0 4mm; font-size: 8.4pt; }
    .chapter.compact td, .chapter.compact th { padding-top: 1.8mm; padding-bottom: 1.8mm; }
    .chapter.compact .keypoints li { padding-top: 1.6mm; padding-bottom: 1.6mm; }
    .chapter.compact .practice { margin-top: 4mm; padding: 5mm 6mm; }

    .checklist h2 { font-size: 32pt; margin: 6mm 0 3mm; }
    .checklist.compact li { padding: 1.6mm 0; font-size: 8.8pt; }
    .checklist ul { list-style: none; margin: 6mm 0 0; padding: 0; columns: 1; }
    .checklist li { display: grid; grid-template-columns: 8mm 1fr; gap: 3mm; padding: 2.4mm 0; font-size: 9.4pt; line-height: 1.45; border-bottom: .25mm solid var(--line); break-inside: avoid; }
    .checklist li::before { content: ""; width: 4.4mm; height: 4.4mm; margin-top: .6mm; border: .35mm solid var(--accent); border-radius: 1mm; }
    .checklist small { display: block; font: 600 6.8pt/1.5 Inter, sans-serif; letter-spacing: .14em; text-transform: uppercase; color: var(--accent); }

    .closing { page: closing; position: relative; width: 210mm; height: 297mm; overflow: hidden; background: var(--deep); color: #fff; }
    .closing::before { content: ""; position: absolute; width: 220mm; height: 220mm; left: -70mm; bottom: -90mm; border-radius: 50%; background: radial-gradient(circle, var(--accent), transparent 65%); opacity: .5; }
    .closing-body { position: absolute; left: 22mm; right: 28mm; top: 64mm; z-index: 1; }
    .closing-body h2 { font-size: 34pt; line-height: 1.06; margin: 6mm 0 9mm; }
    .closing-body p { font-family: Fraunces, serif; font-weight: 300; font-size: 13pt; line-height: 1.58; color: rgba(255,255,255,.86); }
    .closing .kicker { color: var(--soft); }
    .closing .art { position: absolute; right: 22mm; bottom: 42mm; width: 62mm; height: 62mm; color: rgba(255,255,255,.55); z-index: 1; }
    .closing-foot { position: absolute; left: 22mm; right: 22mm; bottom: 18mm; border-top: .3mm solid rgba(255,255,255,.25); padding-top: 4mm; font: 500 7pt/1.5 Inter, sans-serif; letter-spacing: .16em; text-transform: uppercase; color: rgba(255,255,255,.6); z-index: 1; }
  `;
}

function editorialBody(product: DocumentProduct, palette: DocumentPalette, options: RenderOptions) {
  const blocks = product.productContent;
  const pageOf = (index: number) => (options.pageNumbers?.[index] ? pad(options.pageNumbers[index]) : "00");
  const showPages = options.target === "pdf";
  const compact = new Set(options.compact || []);
  const sheet = (content: string, extra = "") => `<section class="sheet ${extra}">${content}</section>`;
  const tables = blocks.filter((block) => block.table?.rows?.length).length;
  const facts = [
    [pad(blocks.length), "capítulos"],
    tables ? [pad(tables), tables === 1 ? "quadro comparativo" : "quadros comparativos"] : [pad(blocks.length), "ações práticas"],
    ["1", "checklist final"],
  ];

  const cover = sheet(
    `<div class="cover">
      <div class="cover-head"><span>Guia completo</span><span>Leitura e consulta</span></div>
      <div class="arch">${documentArt(palette.id, 0)}</div>
      <div class="cover-body">
        <span class="kicker">Guia editorial</span>
        <h1 style="font-size:${coverTitleSize(product.title, 46)}">${esc(product.title)}</h1>
        <div class="sub">${esc(product.subtitle)}</div>
      </div>
      <div class="facts">${facts.map(([value, label]) => `<div><b>${value}</b>${label}</div>`).join("")}</div>
    </div>`,
    "full",
  );

  const toc = sheet(
    `<div class="toc page-break">
      <span class="kicker">Neste guia</span>
      <h2>Sumário</h2>
      <ol>
        ${blocks
          .map(
            (block, index) => `<li><span class="n">${pad(index + 1)}</span><span class="t">${esc(blockTitle(block))}</span>${
              showPages ? `<span class="p">${pageOf(index)}</span>` : ""
            }</li>`,
          )
          .join("")}
      </ol>
    </div>`,
  );

  const intro = sheet(
    `<div class="intro page-break">
      <span class="kicker">Antes de começar</span>
      <h2>Como usar este guia</h2>
      <div class="sub">${esc(product.subtitle)}</div>
      <div class="lead">${paragraphs(product.intro || product.promise)}</div>
      <div class="pull">${esc(product.promise)}</div>
      ${
        product.modules.length
          ? `<span class="label">O que você vai encontrar</span><div class="map">${product.modules
              .slice(0, 6)
              .map((item, index) => `<div><b>Parte ${pad(index + 1)}</b>${esc(item)}</div>`)
              .join("")}</div>`
          : ""
      }
    </div>`,
  );

  const chapters = blocks
    .map((block, index) => {
      const aside = [
        block.tip ? `<div class="tip"><span class="label">Dica</span>${esc(block.tip)}</div>` : "",
        block.example ? `<div class="example"><span class="label">Na vida real</span><p>${esc(block.example)}</p></div>` : "",
      ].join("");
      const points = block.points?.length
        ? `<div class="keypoints"><span class="label">Pontos-chave</span><ol>${block.points.map((point) => `<li>${esc(point)}</li>`).join("")}</ol></div>`
        : "";
      return sheet(`<article class="chapter page-break${compact.has(index) ? " compact" : ""}">
        <header class="chapter-head">
          <div class="chapter-num">${pad(index + 1)}</div>
          ${documentArt(palette.id, index + 1)}
          <h2>${esc(blockTitle(block))}</h2>
        </header>
        <div class="chapter-grid${aside ? "" : " solo"}">
          <div><div class="text">${paragraphs(block.body)}</div>${points}</div>
          ${aside ? `<aside class="aside">${aside}</aside>` : ""}
        </div>
        ${tableHtml(block.table)}
        <div class="practice"><span class="label">Na prática</span><p>${esc(block.task)}</p></div>
      </article>`);
    })
    .join("");

  const checklist = sheet(
    `<div class="checklist page-break${blocks.length > 10 ? " compact" : ""}">
      <span class="kicker">Para revisar</span>
      <h2>${endTitles.editorial}</h2>
      <p>Uma ação por capítulo. Marque à medida que concluir e volte ao capítulo sempre que um item travar.</p>
      <ul>${blocks
        .map((block, index) => `<li><div><small>Capítulo ${pad(index + 1)}</small>${esc(block.task)}</div></li>`)
        .join("")}</ul>
    </div>`,
  );

  const closing = sheet(
    `<div class="closing page-break">
      <div class="closing-body">
        <span class="kicker">Para fechar</span>
        <h2>${esc(product.title)}</h2>
        ${paragraphs(product.closing || product.promise)}
      </div>
      ${documentArt(palette.id, -1)}
      <div class="closing-foot">${esc(product.subtitle)}</div>
    </div>`,
    "full",
  );

  return cover + toc + intro + chapters + checklist + closing;
}

/* ---------- Manual prático ---------- */

function manualCss() {
  return `
    body { font-family: "Plus Jakarta Sans", Inter, sans-serif; font-size: 10pt; line-height: 1.6; font-weight: 400; }
    h1, h2, h3 { font-weight: 800; letter-spacing: -.025em; }
    p { margin: 0 0 3.2mm; }
    .tag { display: inline-block; font: 700 7pt/1 "Plus Jakarta Sans", sans-serif; letter-spacing: .16em; text-transform: uppercase; color: var(--accent); }
    .box-label { display: block; font: 800 7pt/1 "Plus Jakarta Sans", sans-serif; letter-spacing: .16em; text-transform: uppercase; color: var(--accent); margin-bottom: 2.6mm; }

    .m-cover { page: cover; position: relative; width: 210mm; height: 297mm; overflow: hidden; background: var(--paper); }
    .m-cover .rail { position: absolute; left: 0; top: 0; bottom: 0; width: 16mm; background: var(--accent); }
    .m-cover .rail span { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%) rotate(-90deg); white-space: nowrap; font: 800 7.5pt/1 "Plus Jakarta Sans", sans-serif; letter-spacing: .4em; text-transform: uppercase; color: #fff; }
    .m-cover .top { position: absolute; left: 30mm; right: 18mm; top: 20mm; display: flex; justify-content: space-between; border-bottom: .5mm solid var(--ink); padding-bottom: 4mm; }
    .m-title { position: absolute; left: 30mm; right: 20mm; top: 44mm; }
    .m-cover h1 { margin: 0; font-size: 40pt; line-height: 1.02; color: var(--ink); }
    .m-cover .sub { margin-top: 10mm; max-width: 140mm; font-size: 12pt; line-height: 1.5; color: var(--muted); }
    .route { position: absolute; left: 30mm; right: 18mm; top: 166mm; }
    .route .line { position: relative; display: flex; justify-content: space-between; }
    .route .line::before { content: ""; position: absolute; left: 3mm; right: 3mm; top: 50%; border-top: .5mm dashed var(--line); }
    .route i { position: relative; z-index: 1; width: 7mm; height: 7mm; border-radius: 50%; background: var(--paper); border: .5mm solid var(--accent); font: 800 6pt/6mm "Plus Jakarta Sans", sans-serif; font-style: normal; text-align: center; color: var(--accent); }
    .route i:first-child { background: var(--accent); color: #fff; }
    .route i:last-child { background: var(--ink); border-color: var(--ink); color: #fff; }
    .route .ends { display: flex; justify-content: space-between; margin-top: 3mm; font: 700 7pt/1 "Plus Jakarta Sans", sans-serif; letter-spacing: .14em; text-transform: uppercase; color: var(--muted); }
    .m-cover .disc { position: absolute; right: -18mm; bottom: -18mm; width: 120mm; height: 120mm; border-radius: 50%; background: var(--soft); }
    .m-cover .art { position: absolute; right: 18mm; bottom: 26mm; width: 62mm; height: 62mm; color: var(--accent); }
    .m-facts { position: absolute; left: 30mm; bottom: 20mm; display: grid; grid-template-columns: repeat(3, 25mm); gap: 3mm; }
    .m-facts div { border: .4mm solid var(--ink); padding: 3mm; font: 700 6.5pt/1.3 "Plus Jakarta Sans", sans-serif; letter-spacing: .1em; text-transform: uppercase; color: var(--muted); background: var(--paper); }
    .m-facts b { display: block; font-size: 18pt; letter-spacing: -.02em; color: var(--ink); margin-bottom: 1mm; }

    .percurso h2, .m-intro h2, .tracking h2 { font-size: 30pt; line-height: 1.05; margin: 3mm 0 9mm; }
    .percurso ol { list-style: none; margin: 0; padding: 0; position: relative; }
    .percurso ol::before { content: ""; position: absolute; left: 5mm; top: 4mm; bottom: 4mm; border-left: .5mm solid var(--line); }
    .percurso li { position: relative; display: grid; grid-template-columns: 10mm 1fr 14mm; gap: 6mm; align-items: center; padding: 2.4mm 0; }
    .percurso .dot { width: 10mm; height: 10mm; border-radius: 50%; background: var(--paper); border: .5mm solid var(--accent); font: 800 8pt/9mm "Plus Jakarta Sans", sans-serif; text-align: center; color: var(--accent); z-index: 1; }
    .percurso .t { font-size: 11pt; font-weight: 600; line-height: 1.3; }
    .percurso .p { font: 700 8.5pt/1 "Plus Jakarta Sans", sans-serif; color: var(--muted); text-align: right; font-variant-numeric: tabular-nums; }

    .m-intro .lead p { font-size: 10.6pt; }
    .how { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4mm; margin: 8mm 0; }
    .how div { padding: 5mm; background: var(--soft); border-radius: 3mm; font-size: 9pt; line-height: 1.45; }
    .how b { display: block; font-size: 20pt; font-weight: 800; color: var(--accent); margin-bottom: 2mm; letter-spacing: -.02em; }
    .how strong { display: block; font-size: 10.5pt; margin-bottom: 1mm; }
    .goals { list-style: none; margin: 0; padding: 0; }
    .goals li { display: grid; grid-template-columns: 7mm 1fr; padding: 2.6mm 0; border-bottom: .3mm solid var(--line); font-size: 9.6pt; }
    .goals li::before { content: ""; width: 4mm; height: 4mm; margin-top: .8mm; border-radius: 1mm; background: var(--accent); }

    /* A etapa ocupa a página inteira e o registro desce até o pé: o espaço livre vira área de anotação. */
    .step { display: flex; flex-direction: column; min-height: 249mm; }
    .step .record { margin-top: auto; display: flex; flex-direction: column; flex: 0 1 auto; }
    .step-meta { display: flex; align-items: center; justify-content: space-between; gap: 8mm; padding-bottom: 4mm; border-bottom: .5mm solid var(--ink); }
    .bar { flex: 1; max-width: 80mm; display: flex; gap: 1.2mm; }
    .bar i { flex: 1; height: 1.6mm; border-radius: 1mm; background: var(--line); }
    .bar i.on { background: var(--accent); }
    .step-title { display: grid; grid-template-columns: 1fr 30mm; gap: 6mm; align-items: center; margin: 7mm 0 6mm; }
    .step-title h2 { margin: 0; font-size: 24pt; line-height: 1.12; }
    .step-title .art { width: 30mm; height: 30mm; color: var(--accent); }
    .step-body > p:first-child { font-size: 10.8pt; font-weight: 500; color: var(--ink); }
    .steps { margin: 5mm 0; break-inside: avoid; }
    .steps ol { list-style: none; margin: 0; padding: 0; counter-reset: s; position: relative; }
    .steps li { counter-increment: s; position: relative; padding: 1.6mm 0 3.4mm 11mm; font-size: 9.8pt; line-height: 1.45; }
    .steps li::before { content: counter(s); position: absolute; left: 0; top: .8mm; width: 6.4mm; height: 6.4mm; border-radius: 50%; background: var(--accent); color: #fff; font: 800 7.5pt/6.4mm "Plus Jakarta Sans", sans-serif; text-align: center; }
    .steps li:not(:last-child)::after { content: ""; position: absolute; left: 3.2mm; top: 7.8mm; bottom: -.4mm; border-left: .4mm solid var(--line); }
    .boxes { display: grid; grid-template-columns: 1fr 1fr; gap: 4mm; margin: 5mm 0; }
    .boxes.one { grid-template-columns: 1fr; }
    .alert, .sample { padding: 4.5mm 5mm; border-radius: 2.5mm; font-size: 9.2pt; line-height: 1.5; break-inside: avoid; }
    .alert { background: var(--soft); border-left: 1.4mm solid var(--accent); }
    .sample { border: .4mm dashed var(--accent); }
    table.ficha { width: 100%; border-collapse: collapse; margin: 5mm 0; font-size: 8.8pt; line-height: 1.4; break-inside: avoid; }
    .ficha th { background: var(--ink); color: #fff; text-align: left; font: 700 7pt/1.3 "Plus Jakarta Sans", sans-serif; letter-spacing: .1em; text-transform: uppercase; padding: 2.6mm 3mm; border: .3mm solid var(--ink); }
    .ficha td { border: .3mm solid var(--line); padding: 2.4mm 3mm; vertical-align: top; }
    .ficha tr:nth-child(even) td { background: var(--soft); }
    .ficha td:first-child { font-weight: 700; }
    .record { margin-top: 6mm; min-height: 34mm; border: .5mm solid var(--ink); border-radius: 3mm; overflow: hidden; break-inside: avoid; }
    .record .task { display: grid; grid-template-columns: 9mm 1fr; gap: 3mm; padding: 4.5mm 5mm; background: var(--deep); color: #fff; font-size: 10.2pt; font-weight: 600; line-height: 1.45; }
    .record .task::before { content: ""; width: 5.5mm; height: 5.5mm; border: .5mm solid #fff; border-radius: 1.2mm; margin-top: .3mm; }
    .record .task .box-label { color: var(--soft); margin-bottom: 1.4mm; }
    .record .fields { display: grid; grid-template-columns: 34mm 1fr; gap: 0; font: 700 7pt/1 "Plus Jakarta Sans", sans-serif; letter-spacing: .12em; text-transform: uppercase; color: var(--muted); }
    .record .fields div { padding: 4mm 5mm; border-top: .3mm solid var(--line); }
    .record .fields div:nth-child(odd) { border-right: .3mm solid var(--line); }
    .record .fields .feel span { margin-right: 4mm; }
    .record .fields .feel span::before { content: ""; display: inline-block; width: 3mm; height: 3mm; border: .35mm solid var(--muted); border-radius: .8mm; margin-right: 1.4mm; vertical-align: -.5mm; }
    .record .fields { flex: 1; grid-template-rows: auto 1fr; }
    .record .notes { grid-column: 1 / -1; min-height: 16mm; background: repeating-linear-gradient(transparent 0 7mm, var(--line) 7mm 7.3mm); background-clip: content-box; padding-top: 4mm !important; }
    .record .notes span { background: var(--paper); padding-right: 2mm; }

    .step.compact { font-size: 9.3pt; line-height: 1.5; }
    .step.compact .step-title { margin: 5mm 0 4mm; }
    .step.compact .step-title h2 { font-size: 20pt; }
    .step.compact .step-title .art { width: 22mm; height: 22mm; }
    .step.compact p { margin-bottom: 2.4mm; }
    .step.compact .steps, .step.compact .boxes, .step.compact table.ficha { margin: 3mm 0; }
    .step.compact .steps li { padding-bottom: 2mm; font-size: 9pt; }
    .step.compact .ficha td, .step.compact .ficha th { padding-top: 1.6mm; padding-bottom: 1.6mm; }
    .step.compact .record { min-height: 0; }
    .step.compact .record .notes { display: none; }
    .step.tight .record .fields { display: none; }

    table.track { width: 100%; border-collapse: collapse; font-size: 9pt; }
    .track th { text-align: left; font: 800 7pt/1 "Plus Jakarta Sans", sans-serif; letter-spacing: .12em; text-transform: uppercase; color: var(--accent); padding: 2.4mm 2mm; border-bottom: .5mm solid var(--ink); }
    .track td { padding: 3.2mm 2mm; border-bottom: .3mm solid var(--line); vertical-align: top; }
    .track td.n { font-weight: 800; color: var(--accent); width: 10mm; }
    .track td.d { width: 26mm; border-left: .3mm solid var(--line); }
    .track td.c { width: 12mm; border-left: .3mm solid var(--line); }
    .track td.c::before { content: ""; display: block; width: 4.4mm; height: 4.4mm; margin: 0 auto; border: .4mm solid var(--accent); border-radius: 1mm; }
    .tracking.compact .track td { padding: 2.2mm 2mm; font-size: 8.4pt; }

    .m-closing { page: closing; position: relative; width: 210mm; height: 297mm; overflow: hidden; background: var(--accent); color: #fff; }
    .m-closing .body { position: absolute; left: 24mm; right: 30mm; top: 54mm; z-index: 1; }
    .m-closing .tag { color: rgba(255,255,255,.75); }
    .m-closing h2 { font-size: 36pt; line-height: 1.04; margin: 6mm 0 9mm; }
    .m-closing p { font-size: 12pt; line-height: 1.6; color: rgba(255,255,255,.9); }
    .m-closing .art { position: absolute; right: 20mm; bottom: 24mm; width: 70mm; height: 70mm; color: rgba(255,255,255,.5); }
    .m-closing .route { top: auto; bottom: 110mm; left: 24mm; right: 30mm; }
    .m-closing .route i { background: #fff; border-color: #fff; color: var(--accent); }
    .m-closing .route .line::before { border-color: rgba(255,255,255,.4); }
  `;
}

function manualBody(product: DocumentProduct, palette: DocumentPalette, options: RenderOptions) {
  const blocks = product.productContent;
  const total = blocks.length;
  const pageOf = (index: number) => (options.pageNumbers?.[index] ? pad(options.pageNumbers[index]) : "00");
  const showPages = options.target === "pdf";
  const compact = new Set(options.compact || []);
  const tight = new Set(options.tight || []);
  const sheet = (content: string, extra = "") => `<section class="sheet ${extra}">${content}</section>`;
  const route = `<div class="route"><div class="line">${blocks.map((_, index) => `<i>${pad(index + 1)}</i>`).join("")}</div><div class="ends"><span>Início</span><span>Concluído</span></div></div>`;
  const records = blocks.filter((block) => block.table?.rows?.length).length;

  const cover = sheet(
    `<div class="m-cover">
      <div class="rail"><span>Manual prático</span></div>
      <div class="top"><span class="tag">Manual prático</span><span class="tag">${pad(total)} etapas</span></div>
      <div class="m-title"><h1 style="font-size:${coverTitleSize(product.title, 40)}">${esc(product.title)}</h1><div class="sub">${esc(product.subtitle)}</div></div>
      ${route}
      <div class="disc"></div>
      ${documentArt(palette.id, 0)}
      <div class="m-facts"><div><b>${pad(total)}</b>etapas</div><div><b>${pad(records || total)}</b>${records ? "fichas" : "tarefas"}</div><div><b>1</b>quadro de acompanhamento</div></div>
    </div>`,
    "full",
  );

  const percurso = sheet(
    `<div class="percurso page-break">
      <span class="tag">Mapa do manual</span>
      <h2>Seu percurso</h2>
      <ol>${blocks
        .map(
          (block, index) =>
            `<li><span class="dot">${pad(index + 1)}</span><span class="t">${esc(blockTitle(block))}</span>${showPages ? `<span class="p">p. ${pageOf(index)}</span>` : "<span></span>"}</li>`,
        )
        .join("")}</ol>
    </div>`,
  );

  const intro = sheet(
    `<div class="m-intro page-break">
      <span class="tag">Antes de começar</span>
      <h2>Como usar este manual</h2>
      <div class="lead">${paragraphs(product.intro || product.promise)}</div>
      <div class="how">
        <div><b>01</b><strong>Leia a etapa</strong>Entenda o objetivo e o passo a passo antes de agir.</div>
        <div><b>02</b><strong>Execute a tarefa</strong>Cada etapa termina com uma ação concreta.</div>
        <div><b>03</b><strong>Registre</strong>Anote a data e como foi no quadro da própria etapa.</div>
      </div>
      ${
        product.modules.length
          ? `<span class="box-label">Ao final você terá</span><ul class="goals">${product.modules.slice(0, 6).map((item) => `<li>${esc(item)}</li>`).join("")}</ul>`
          : ""
      }
    </div>`,
  );

  const steps = blocks
    .map((block, index) => {
      const bar = blocks.map((_, i) => `<i${i <= index ? ' class="on"' : ""}></i>`).join("");
      const points = block.points?.length
        ? `<div class="steps"><span class="box-label">Passo a passo</span><ol>${block.points.map((point) => `<li>${esc(point)}</li>`).join("")}</ol></div>`
        : "";
      const boxes = [
        block.tip ? `<div class="alert"><span class="box-label">Atenção</span>${esc(block.tip)}</div>` : "",
        block.example ? `<div class="sample"><span class="box-label">Exemplo</span>${esc(block.example)}</div>` : "",
      ].filter(Boolean);
      const ficha = tableHtml(block.table).replace("<table>", '<table class="ficha">');
      return sheet(`<article class="step page-break${compact.has(index) ? " compact" : ""}${tight.has(index) ? " tight" : ""}">
        <div class="step-meta"><span class="tag">Etapa ${pad(index + 1)} de ${pad(total)}</span><div class="bar">${bar}</div></div>
        <div class="step-title"><h2>${esc(blockTitle(block))}</h2>${documentArt(palette.id, index + 1)}</div>
        <div class="step-body">${paragraphs(block.body)}</div>
        ${points}
        ${ficha}
        ${boxes.length ? `<div class="boxes${boxes.length === 1 ? " one" : ""}">${boxes.join("")}</div>` : ""}
        <div class="record">
          <div class="task"><div><span class="box-label">Sua tarefa</span>${esc(block.task)}</div></div>
          <div class="fields"><div>Feito em ____/____</div><div class="feel">Como foi: <span>Fácil</span><span>Ok</span><span>Difícil</span></div><div class="notes"><span>Anotações</span></div></div>
        </div>
      </article>`);
    })
    .join("");

  const tracking = sheet(
    `<div class="tracking page-break${total > 10 ? " compact" : ""}">
      <span class="tag">Para acompanhar</span>
      <h2>${endTitles.manual}</h2>
      <table class="track"><thead><tr><th>#</th><th>Tarefa da etapa</th><th>Data</th><th>Feito</th></tr></thead><tbody>${blocks
        .map((block, index) => `<tr><td class="n">${pad(index + 1)}</td><td>${esc(block.task)}</td><td class="d"></td><td class="c"></td></tr>`)
        .join("")}</tbody></table>
    </div>`,
  );

  const closing = sheet(
    `<div class="m-closing page-break">
      <div class="body">
        <span class="tag">Percurso concluído</span>
        <h2>${esc(product.title)}</h2>
        ${paragraphs(product.closing || product.promise)}
      </div>
      ${documentArt(palette.id, -1)}
    </div>`,
    "full",
  );

  return cover + percurso + intro + steps + tracking + closing;
}

/* ---------- Catálogo premium ---------- */

function roman(value: number) {
  const map: [number, string][] = [[10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]];
  let rest = value;
  let out = "";
  for (const [n, s] of map) while (rest >= n) { out += s; rest -= n; }
  return out;
}

// No catálogo, uma categoria que veio só com tabela vira fichas: cada linha é um item.
function catalogEntries(block: DocumentBlock) {
  if (block.entries?.length) return { entries: block.entries, table: block.table };
  const table = block.table;
  if (!table?.rows?.length || table.columns.length < 2) return { entries: [], table };
  const tagColumn = table.columns.findIndex((_, col) => col > 0 && table.rows.every((row) => (row[col] || "").length <= 18));
  const entries = table.rows.slice(0, 6).map((row) => ({
    name: row[0] || "",
    tag: tagColumn > 0 ? row[tagColumn] : undefined,
    detail: row
      .slice(1)
      .filter((_, index) => index + 1 !== tagColumn)
      .filter(Boolean)
      .map((cell) => cell.replace(/[.\s]+$/, ""))
      .join(". "),
  }));
  return { entries: entries.filter((entry) => entry.name && entry.detail), table: undefined };
}

function catalogoCss() {
  return `
    body { font-family: Inter, sans-serif; font-size: 9.8pt; line-height: 1.62; font-weight: 400; }
    h1, h2, h3, .cg { font-family: "Cormorant Garamond", Georgia, serif; font-weight: 500; letter-spacing: -.005em; }
    p { margin: 0 0 3mm; }
    .eyebrow { display: flex; align-items: center; justify-content: center; gap: 4mm; font: 600 6.8pt/1 Inter, sans-serif; letter-spacing: .32em; text-transform: uppercase; color: var(--accent); }
    .eyebrow::before, .eyebrow::after { content: ""; width: 14mm; border-top: .25mm solid currentColor; opacity: .6; }
    .mini { display: block; font: 600 6.6pt/1 Inter, sans-serif; letter-spacing: .24em; text-transform: uppercase; color: var(--accent); margin-bottom: 2.4mm; }

    .c-cover { page: cover; position: relative; width: 210mm; height: 297mm; overflow: hidden; background: var(--deep); color: #fff; text-align: center; }
    .c-cover .frame { position: absolute; inset: 11mm; border: .3mm solid rgba(255,255,255,.35); }
    .c-cover .frame::after { content: ""; position: absolute; inset: 2mm; border: .2mm solid rgba(255,255,255,.18); }
    .c-cover .eyebrow { position: absolute; left: 0; right: 0; top: 26mm; color: var(--soft); }
    .medal { position: absolute; left: 50%; top: 52mm; width: 78mm; height: 78mm; margin-left: -39mm; border-radius: 50%; border: .3mm solid rgba(255,255,255,.4); }
    .medal::before { content: ""; position: absolute; inset: 3mm; border-radius: 50%; background: radial-gradient(circle at 50% 35%, var(--accent), transparent 72%); opacity: .55; }
    .medal .art { position: absolute; inset: 14mm; width: auto; height: auto; color: #fff; }
    .c-title { position: absolute; left: 24mm; right: 24mm; top: 146mm; }
    .c-cover h1 { margin: 0; font-size: 46pt; line-height: 1.04; font-weight: 500; }
    .c-cover .sub { margin: 8mm auto 0; max-width: 140mm; font-family: "Cormorant Garamond", serif; font-style: italic; font-size: 15pt; line-height: 1.35; color: rgba(255,255,255,.82); }
    .c-cover .count { position: absolute; left: 0; right: 0; bottom: 26mm; font: 500 7.2pt/1.6 Inter, sans-serif; letter-spacing: .26em; text-transform: uppercase; color: rgba(255,255,255,.7); }
    .c-cover .count b { color: #fff; font-weight: 600; }

    .c-index h2, .c-criteria h2, .selection h2 { text-align: center; font-size: 36pt; line-height: 1.05; margin: 5mm 0 10mm; }
    .cards { display: grid; grid-template-columns: 1fr 1fr; gap: 4mm; }
    .cards div { position: relative; padding: 6mm 6mm 5mm; border: .25mm solid var(--line); background: #fff8; min-height: 30mm; }
    .cards .r { font-family: "Cormorant Garamond", serif; font-style: italic; font-size: 22pt; line-height: 1; color: var(--accent); }
    .cards .t { display: block; margin-top: 2.4mm; font-family: "Cormorant Garamond", serif; font-size: 14pt; line-height: 1.2; font-weight: 600; }
    .cards .m { display: block; margin-top: 2mm; font: 600 6.6pt/1 Inter, sans-serif; letter-spacing: .18em; text-transform: uppercase; color: var(--muted); }
    .cards.dense { gap: 3mm; }
    .cards.dense div { min-height: 0; padding: 4mm 5mm 3.6mm; }
    .cards.dense .r { font-size: 16pt; }
    .cards.dense .t { margin-top: 1.4mm; font-size: 12.5pt; }
    .cards.dense .p { top: 4.4mm; }
    .cards .p { position: absolute; right: 6mm; top: 6.4mm; font: 600 8pt/1 Inter, sans-serif; color: var(--muted); font-variant-numeric: tabular-nums; }

    .c-criteria .lead { max-width: 150mm; margin: 0 auto; text-align: center; }
    .c-criteria .lead p { font-size: 10.4pt; }
    .quote { margin: 9mm auto; max-width: 140mm; text-align: center; font-family: "Cormorant Garamond", serif; font-style: italic; font-size: 18pt; line-height: 1.3; color: var(--deep); }
    .quote::before, .quote::after { content: ""; display: block; width: 10mm; margin: 4mm auto; border-top: .4mm solid var(--accent); }
    .crit { display: grid; grid-template-columns: 1fr 1fr; gap: 0 10mm; }
    .crit div { display: grid; grid-template-columns: 10mm 1fr; padding: 3.4mm 0; border-top: .25mm solid var(--line); font-size: 9.4pt; line-height: 1.45; }
    .crit b { font-family: "Cormorant Garamond", serif; font-style: italic; font-weight: 500; font-size: 14pt; line-height: 1; color: var(--accent); }

    .cat-head { text-align: center; margin-bottom: 7mm; padding-bottom: 6mm; border-bottom: .25mm solid var(--line); }
    .cat-head .art { width: 20mm; height: 20mm; color: var(--accent); margin: 0 auto 3mm; display: block; }
    .cat-head h2 { font-size: 30pt; line-height: 1.05; margin: 3mm 0 0; }
    .cat-intro { columns: 2; column-gap: 8mm; font-size: 9.6pt; }
    .cat-intro p { break-inside: avoid; }
    .entries { display: grid; grid-template-columns: 1fr 1fr; gap: 4mm; margin: 5mm 0; }
    .entry { position: relative; padding: 5mm 5mm 4.4mm; border: .25mm solid var(--line); background: #fff8; break-inside: avoid; }
    .entry .no { font-family: "Cormorant Garamond", serif; font-style: italic; font-size: 12pt; color: var(--accent); }
    .entry h3 { margin: .6mm 0 1.6mm; font-size: 15pt; line-height: 1.15; font-weight: 600; }
    .entry p { margin: 0; font-size: 8.8pt; line-height: 1.5; color: var(--muted); }
    .entry .pill { position: absolute; right: 4.4mm; top: 4.4mm; padding: 1.3mm 2.6mm; border-radius: 4mm; background: var(--soft); font: 600 6.2pt/1 Inter, sans-serif; letter-spacing: .12em; text-transform: uppercase; color: var(--deep); }
    .crit-list { list-style: none; margin: 5mm 0; padding: 0; display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 4mm; }
    .crit-list li { padding-top: 3mm; border-top: .5mm solid var(--accent); font-size: 9pt; line-height: 1.45; }
    .cat-table table { width: 100%; border-collapse: collapse; margin: 2mm 0 5mm; font-size: 8.8pt; line-height: 1.45; break-inside: avoid; }
    .cat-table th { text-align: left; font: 600 6.6pt/1.3 Inter, sans-serif; letter-spacing: .18em; text-transform: uppercase; color: var(--accent); padding: 2.2mm 3mm 2.2mm 0; border-bottom: .25mm solid var(--ink); }
    .cat-table td { padding: 2.4mm 3mm 2.4mm 0; border-bottom: .25mm solid var(--line); vertical-align: top; }
    .cat-table td:first-child { font-family: "Cormorant Garamond", serif; font-size: 11.5pt; font-weight: 600; }
    .notes2 { display: grid; grid-template-columns: 1fr 1fr; gap: 6mm; margin: 4mm 0; }
    .notes2.one { grid-template-columns: 1fr; }
    .curator { padding-left: 5mm; border-left: .4mm solid var(--accent); font-family: "Cormorant Garamond", serif; font-style: italic; font-size: 12pt; line-height: 1.42; break-inside: avoid; }
    .curator .mini { font-style: normal; }
    .feature { padding: 4.4mm 5mm; background: var(--soft); font-size: 9pt; line-height: 1.5; break-inside: avoid; }
    .category { display: flex; flex-direction: column; min-height: 249mm; }
    .category .choice { margin-top: auto; }
    .category > :nth-last-child(2) { margin-bottom: 6mm; }
    .choice { margin-top: 6mm; padding: 4.6mm 0 0; border-top: .5mm solid var(--ink); display: grid; grid-template-columns: 1fr 62mm; gap: 8mm; align-items: end; break-inside: avoid; }
    .choice p { margin: 0; font-family: "Cormorant Garamond", serif; font-size: 12.5pt; line-height: 1.35; }
    .choice .line { font: 600 6.6pt/1 Inter, sans-serif; letter-spacing: .2em; text-transform: uppercase; color: var(--muted); padding-bottom: 1.6mm; border-bottom: .25mm solid var(--muted); }

    .category.compact { font-size: 9pt; }
    .category.compact .cat-head { margin-bottom: 5mm; padding-bottom: 4mm; }
    .category.compact .cat-head .art { width: 14mm; height: 14mm; margin-bottom: 1.6mm; }
    .category.compact .cat-head h2 { font-size: 25pt; }
    .category.compact .entries { gap: 3mm; margin: 3.6mm 0; }
    .category.compact .entry { padding: 3.6mm 4mm; }
    .category.compact .entry h3 { font-size: 13pt; }
    .category.compact .curator { font-size: 11pt; }
    .category.compact .choice { margin-top: 4mm; }
    .category.tight .feature, .category.tight .cat-table, .category.tight .observe, .category.tight .cat-head .art { display: none; }
    .category.tight .cat-intro { font-size: 8.8pt; }

    table.sel { width: 100%; border-collapse: collapse; }
    .sel th { text-align: left; font: 600 6.6pt/1 Inter, sans-serif; letter-spacing: .2em; text-transform: uppercase; color: var(--accent); padding: 2.4mm 2mm; border-bottom: .3mm solid var(--ink); }
    .sel td { height: 14mm; padding: 2.4mm 2mm; border-bottom: .25mm solid var(--line); vertical-align: top; }
    .sel td:first-child { width: 66mm; font-family: "Cormorant Garamond", serif; font-size: 11.5pt; line-height: 1.2; font-weight: 600; }
    .sel td:first-child i { font-weight: 500; color: var(--accent); margin-right: 2mm; }
    .sel td + td { border-left: .25mm solid var(--line); }
    .selection.compact .sel td { height: 11mm; padding-top: 1.8mm; padding-bottom: 1.8mm; }

    .c-closing { page: closing; position: relative; width: 210mm; height: 297mm; overflow: hidden; background: var(--deep); color: #fff; text-align: center; }
    .c-closing .frame { position: absolute; inset: 11mm; border: .3mm solid rgba(255,255,255,.35); }
    .c-closing .art { position: absolute; left: 50%; top: 52mm; width: 44mm; height: 44mm; margin-left: -22mm; color: rgba(255,255,255,.75); }
    .c-closing .body { position: absolute; left: 30mm; right: 30mm; top: 112mm; }
    .c-closing .eyebrow { color: var(--soft); }
    .c-closing h2 { font-size: 36pt; line-height: 1.05; margin: 7mm 0 8mm; }
    .c-closing p { font-family: "Cormorant Garamond", serif; font-size: 14pt; line-height: 1.5; color: rgba(255,255,255,.86); }
  `;
}

function catalogoBody(product: DocumentProduct, palette: DocumentPalette, options: RenderOptions) {
  const blocks = product.productContent;
  const pageOf = (index: number) => (options.pageNumbers?.[index] ? pad(options.pageNumbers[index]) : "00");
  const showPages = options.target === "pdf";
  const compact = new Set(options.compact || []);
  const tight = new Set(options.tight || []);
  const sheet = (content: string, extra = "") => `<section class="sheet ${extra}">${content}</section>`;
  const content = blocks.map(catalogEntries);
  const items = content.reduce((sum, item) => sum + item.entries.length, 0);

  const cover = sheet(
    `<div class="c-cover">
      <div class="frame"></div>
      <div class="eyebrow">Seleção curada</div>
      <div class="medal">${documentArt(palette.id, 0)}</div>
      <div class="c-title"><h1 style="font-size:${coverTitleSize(product.title, 46)}">${esc(product.title)}</h1><div class="sub">${esc(product.subtitle)}</div></div>
      <div class="count"><b>${pad(blocks.length)}</b> categorias${items ? ` · <b>${pad(items)}</b> itens selecionados` : ""}</div>
    </div>`,
    "full",
  );

  const index = sheet(
    `<div class="c-index page-break">
      <div class="eyebrow">Índice</div>
      <h2>As categorias</h2>
      <div class="cards${blocks.length > 8 ? " dense" : ""}">${blocks
        .map(
          (block, i) =>
            `<div><span class="r">${roman(i + 1)}</span>${showPages ? `<span class="p">${pageOf(i)}</span>` : ""}<span class="t">${esc(blockTitle(block))}</span>${
              content[i].entries.length ? `<span class="m">${content[i].entries.length} itens</span>` : ""
            }</div>`,
        )
        .join("")}</div>
    </div>`,
  );

  const criteria = sheet(
    `<div class="c-criteria page-break">
      <div class="eyebrow">Antes de escolher</div>
      <h2>Como usar esta seleção</h2>
      <div class="lead">${paragraphs(product.intro || product.promise)}</div>
      <div class="quote">${esc(product.promise)}</div>
      ${
        product.modules.length
          ? `<span class="mini" style="text-align:center">Critérios desta seleção</span><div class="crit">${product.modules
              .slice(0, 6)
              .map((item, i) => `<div><b>${roman(i + 1)}</b><span>${esc(item)}</span></div>`)
              .join("")}</div>`
          : ""
      }
    </div>`,
  );

  const categories = blocks
    .map((block, i) => {
      const { entries: items, table: rest } = content[i];
      const entries = items.length
        ? `<div class="entries">${items
            .map(
              (entry, n) =>
                `<div class="entry">${entry.tag ? `<span class="pill">${esc(entry.tag)}</span>` : ""}<span class="no">${pad(n + 1)}</span><h3>${esc(entry.name)}</h3><p>${esc(entry.detail)}</p></div>`,
            )
            .join("")}</div>`
        : "";
      const points = block.points?.length
        ? `<div class="observe"><span class="mini">O que observar</span><ul class="crit-list">${block.points.slice(0, 3).map((point) => `<li>${esc(point)}</li>`).join("")}</ul></div>`
        : "";
      const table = rest?.rows?.length ? `<div class="cat-table">${tableHtml(rest)}</div>` : "";
      const notes = [
        block.tip ? `<div class="curator"><span class="mini">Nota da curadoria</span>${esc(block.tip)}</div>` : "",
        block.example ? `<div class="feature"><span class="mini">Em destaque</span>${esc(block.example)}</div>` : "",
      ].filter(Boolean);
      return sheet(`<article class="category page-break${compact.has(i) ? " compact" : ""}${tight.has(i) ? " tight" : ""}">
        <header class="cat-head">${documentArt(palette.id, i + 1)}<div class="eyebrow">Categoria ${roman(i + 1)}</div><h2>${esc(blockTitle(block))}</h2></header>
        <div class="cat-intro">${paragraphs(block.body)}</div>
        ${entries}
        ${points}
        ${table}
        ${notes.length ? `<div class="notes2${notes.length === 1 ? " one" : ""}">${notes.join("")}</div>` : ""}
        <div class="choice"><p>${esc(block.task)}</p><div class="line">Minha escolha</div></div>
      </article>`);
    })
    .join("");

  const selection = sheet(
    `<div class="selection page-break${blocks.length > 9 ? " compact" : ""}">
      <div class="eyebrow">Para decidir</div>
      <h2>${endTitles.catalogo}</h2>
      <table class="sel"><thead><tr><th>Categoria</th><th>Minha escolha</th><th>Por quê</th></tr></thead><tbody>${blocks
        .map((block, i) => `<tr><td><i>${roman(i + 1)}</i>${esc(blockTitle(block))}</td><td></td><td></td></tr>`)
        .join("")}</tbody></table>
    </div>`,
  );

  const closing = sheet(
    `<div class="c-closing page-break">
      <div class="frame"></div>
      ${documentArt(palette.id, -1)}
      <div class="body">
        <div class="eyebrow">Para fechar</div>
        <h2>${esc(product.title)}</h2>
        ${paragraphs(product.closing || product.promise)}
      </div>
    </div>`,
    "full",
  );

  return cover + index + criteria + categories + selection + closing;
}

/* ---------- Montagem ---------- */

export function renderProductDocument(product: DocumentProduct, options: RenderOptions) {
  const style = resolveDocumentStyle(product);
  const palette = resolveDocumentPalette(product);
  const templates = {
    editorial: [editorialBody, editorialCss],
    manual: [manualBody, manualCss],
    catalogo: [catalogoBody, catalogoCss],
  } as const;
  const [bodyFor, cssFor] = templates[style];
  const body = bodyFor(product, palette, options);
  const css = baseCss(palette, product) + cssFor();
  const editable = options.target === "html" ? ' contenteditable="true" spellcheck="true"' : "";

  return `<!doctype html>
<html lang="pt-BR" data-style="${style}">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(product.title)}</title>
<style>${options.fontCss}${css}</style>
</head>
<body>${
    options.target === "html"
      ? '<div class="edit-hint">Clique em qualquer texto para editar. Para salvar em PDF, use Imprimir (Ctrl+P ou Cmd+P), escolha "Salvar como PDF" e ative "Gráficos de fundo".</div>'
      : ""
  }<main${editable}>${body}</main></body>
</html>`;
}

export function googleFontCss(style: DocumentStyle) {
  return `@import url("https://fonts.googleapis.com/css2?${documentFonts[style].google}&display=swap");`;
}
