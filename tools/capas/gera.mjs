// Gera as capas (1000×1500, 2:3) e os banners (1920×1080, 16:9) da área de membros (Gênio Play)
// a partir das artes de origem (fotos sem texto e artes da Reforma), ocupando o quadro inteiro.
// Uso: node tools/capas/gera.mjs [slug ...]      (sem slug = todos)
// Saída: public/membros/capas/<slug>.jpg e <slug>-banner.jpg
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir, homedir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import puppeteer from "puppeteer-core";

const HOME = homedir();
const COFRE = `${HOME}/Documents/Cofre Geral - Obsidian/Cofre Geral/Projetos`;
const FONTS = `${COFRE}/Kit Produto Pronto/4 Site (kit + upsell)/site/img`;
const GPT = `${COFRE}/Kit Produto Pronto/Kit 2 - 7 produtos/06 Fotos do GPT (coloque aqui)`;
const SONO = `${COFRE}/Oferta Pronta/Chave na Mão - Sono do bebê/fonte/img`;
const REF = `${HOME}/Desktop/Reforma Tributária`;
const OUT = new URL("../../public/membros/capas/", import.meta.url).pathname;
const CACHE = join(tmpdir(), "gp-capas-cache");
mkdirSync(CACHE, { recursive: true });
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const file = (p) => `file://${encodeURI(p)}`;
const TAG_OK = { text: "✓ Pronto para revender", bg: "#1fa64a", fg: "#fff" };

// ---------------------------------------------------------------- produtos
const PHOTO = [
  { slug: "cafe-sem-pao", photo: `${GPT}/cafe.png`, pos: "50% 45%", posB: "50% 55%", l1: "CAFÉ DA MANHÃ", l2: "SEM PÃO", c2: "#F2B48F", chips: ["21 receitas", "Lista de compras", "Revenda"] },
  { slug: "marmitas-da-semana", photo: `${GPT}/marmitas.png`, pos: "50% 40%", posB: "50% 55%", l1: "MARMITAS", l2: "DA SEMANA", c2: "#A8E6A0", chips: ["14 marmitas em 2h", "Lista de compras", "Revenda"] },
  { slug: "caligrafia-1-ano", photo: `${GPT}/caligrafia.png`, pos: "55% 30%", posB: "50% 45%", l1: "CALIGRAFIA", l2: "1º ANO", c2: "#9CCBFF", chips: ["16 folhas", "Para imprimir", "Revenda"] },
  { slug: "ingles-de-bolso", photo: `${GPT}/ingles.png`, pos: "40% 30%", posB: "50% 35%", l1: "INGLÊS PARA", l2: "VIAGEM", c2: "#9CCBFF", chips: ["151 frases", "Pronúncia fácil", "Revenda"] },
  { slug: "30-dias-com-deus", photo: `${GPT}/devocional.png`, pos: "50% 30%", posB: "50% 40%", l1: "30 DIAS", l2: "COM DEUS", c2: "#F5D49A", chips: ["Diário guiado", "10 min por dia", "Revenda"] },
  { slug: "contratos-prestadores", photo: `${GPT}/contratos.png`, pos: "50% 25%", posB: "50% 35%", l1: "CONTRATOS PARA", l2: "PRESTADORES", c2: "#B5D0F5", chips: ["17 modelos", "Word editável", "Revenda"] },
  { slug: "stickers-whatsapp", photo: `${GPT}/stickers.png`, pos: "50% 35%", posB: "50% 45%", l1: "60 STICKERS", l2: "PARA WHATSAPP", c2: "#D2B6FF", chips: ["7 temas", "Fundo transparente", "Revenda"] },
  { slug: "pacote-7-produtos", photo: `${GPT}/pacote.png`, pos: "50% 40%", posB: "50% 50%", l1: "7 PRODUTOS", l2: "PRONTOS", c2: "#FFC266", chips: ["7 produtos", "Editáveis", "Revenda"] },
  { slug: "cafe-sem-pao-dolar", photo: `${COFRE}/Kit Produto Pronto/4 Site (kit + upsell)/site/img/cafe.jpg`, pos: "50% 50%", posB: "50% 50%", l1: "CAFÉ SEM PÃO", l2: "EM DÓLAR", c2: "#7CE3A1", chips: ["Versão em espanhol", "3 cardápios", "Revenda"] },
  { slug: "sono-do-bebe", photo: `${SONO}/cadeira.jpg`, pos: "60% 40%", posB: "50% 45%", tag: { text: "🔑 Negócio pronto", bg: "#F5B82E", fg: "#14110a" }, l1: "NEGÓCIO CHAVE", l2: "NA MÃO", c2: "#F5B82E", sub: "Sono do bebê", chips: ["Produto", "Site + funil", "Anúncios"] },
];

// Artes da Reforma: título e infográfico recortados da arte original (frações da altura) e
// reposicionados sobre o mesmo azul da arte, que continua até as bordas.
const ART = [
  { slug: "30-casos-whatsapp", src: `${REF}/30 Casos por Setor e WhatsApp.png`, bg: "#011539", title: [0.0, 0.375], body: [0.375, 0.985] },
  { slug: "reforma-desenhada", src: `${REF}/Reforma Tributária Desenhada em Mapas.png`, bg: "#01173a", title: [0.0, 0.405], body: [0.405, 0.975] },
  { slug: "tabelas-nota-fiscal", src: `${REF}/Tabelas da Nota Fiscal com Busca NCM.png`, bg: "#031639", title: [0.0, 0.335], body: [0.335, 0.94] },
  { slug: "calculadora-2027", src: `${REF}/Calculadora Hoje × 2027.png`, bg: "#011334", title: [0.0, 0.325], body: [0.325, 0.935] },
  { slug: "kit-consultor-reforma", src: `${REF}/Kit Consultor_ Reforma em Serviço.png`, bg: "#01163b", title: [0.0, 0.415], body: [0.415, 0.985] },
  { slug: "kit-reuniao-reforma", src: `${REF}/Kit Reunião da Reforma.png`, bg: "#16233f", title: [0.0, 0.415], body: [0.415, 0.975] },
];

const SPECIAL = ["campanha-de-teste", "anuncios-cafe", "metodo-genio"];

// ---------------------------------------------------------------- HTML comum
const HEAD = (w, h, extra = "") => `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:B;font-weight:800;src:url('${file(`${FONTS}/barlow-condensed-800.woff2`)}')}
@font-face{font-family:M;font-weight:800;src:url('${file(`${FONTS}/manrope-800.woff2`)}')}
@font-face{font-family:M;font-weight:600;src:url('${file(`${FONTS}/manrope-600.woff2`)}')}
@font-face{font-family:M;font-weight:400;src:url('${file(`${FONTS}/manrope-400.woff2`)}')}
*{margin:0;box-sizing:border-box}
html,body{width:${w}px;height:${h}px;overflow:hidden}
body{position:relative;font-family:M;color:#fff}
.tag{position:absolute;font-weight:800;border-radius:60px;box-shadow:0 6px 20px rgba(0,0,0,.3);white-space:nowrap}
.t{font-family:B;font-weight:800;text-transform:uppercase;line-height:.9;text-shadow:0 4px 24px rgba(0,0,0,.45)}
.t span{display:block;white-space:nowrap}
.chips{display:flex;gap:14px;flex-wrap:nowrap}
.chips div{background:#F4F2EE;color:#16181f;font-weight:800;border-radius:14px;white-space:nowrap}
.sub{font-weight:600;color:#e8e6f0}
${extra}
</style></head><body>`;
// Diminui a fonte até caber na largura (sem cortar título).
const FIT = `<script>
document.fonts.ready.then(()=>{for(const el of document.querySelectorAll('[data-fit]')){let s=parseFloat(getComputedStyle(el).fontSize);while(el.scrollWidth>el.clientWidth+1&&s>20){s-=2;el.style.fontSize=s+'px'}}
for(const el of document.querySelectorAll('.chips')){let s=parseFloat(getComputedStyle(el.firstElementChild).fontSize);while(el.scrollWidth>el.clientWidth+1&&s>14){s-=1;for(const c of el.children){c.style.fontSize=s+'px'}}}
document.body.dataset.ready='1'})</script></body></html>`;

const chips = (list, fs, pad) => `<div class="chips">${list.map((c) => `<div style="font-size:${fs}px;padding:${pad}">${c}</div>`).join("")}</div>`;
const title = (p, fs) => {
  const s1 = fs * (p.l1.length > 11 ? 0.84 : 1);
  const s2 = fs * (p.l2.length > 11 ? 0.84 : 1);
  return `<div class="t"><span data-fit style="font-size:${s1}px">${p.l1}</span><span data-fit style="font-size:${s2}px;color:${p.c2}">${p.l2}</span></div>`;
};

// ---------------------------------------------------------------- modelo FOTO
function photoCover(p) {
  const tag = p.tag || TAG_OK;
  return `${HEAD(1000, 1500, `
body{background:url('${file(p.photo)}') ${p.pos}/cover no-repeat #111}
.sh{position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.38) 0%,rgba(0,0,0,0) 16%,rgba(0,0,0,0) 36%,rgba(8,9,18,.72) 58%,rgba(8,9,18,.9) 76%,rgba(8,9,18,.96) 100%)}
.blk{position:absolute;left:60px;right:60px;bottom:300px;display:grid;gap:22px}
.t span{width:880px}`)}
<div class="sh"></div><div class="tag" style="left:56px;top:56px;font-size:34px;padding:14px 30px;background:${tag.bg};color:${tag.fg}">${tag.text}</div>
<div class="blk">${title(p, 156)}${p.sub ? `<div class="sub" style="font-size:40px">${p.sub}</div>` : ""}${chips(p.chips, 34, "12px 22px")}</div>${FIT}`;
}

function photoBanner(p) {
  const tag = p.tag || TAG_OK;
  return `${HEAD(1920, 1080, `
body{background:url('${file(p.photo)}') ${p.posB}/cover no-repeat #111}
.sh{position:absolute;inset:0;background:linear-gradient(90deg,rgba(8,9,18,.94) 0%,rgba(8,9,18,.84) 34%,rgba(8,9,18,.35) 60%,rgba(8,9,18,0) 80%)}
.blk{position:absolute;left:154px;top:50%;transform:translateY(-50%);width:900px;display:grid;gap:26px}
.t span{width:900px}`)}
<div class="sh"></div>
<div class="blk"><div><div class="tag" style="position:static;display:inline-block;font-size:32px;padding:12px 28px;background:${tag.bg};color:${tag.fg}">${tag.text}</div></div>
${title(p, 168)}${p.sub ? `<div class="sub" style="font-size:42px">${p.sub}</div>` : ""}${chips(p.chips, 32, "12px 22px")}</div>${FIT}`;
}

// ---------------------------------------------------------------- modelo ARTE (Reforma)
async function crop(src, [y0, y1], name, bg) {
  const meta = await sharp(src).metadata();
  const top = Math.round(meta.height * y0);
  const height = Math.round(meta.height * (y1 - y0));
  const out = join(CACHE, `${name}.png`);
  // Recorta a faixa e tira as margens vazias (mesma cor do fundo) para o conteúdo ficar maior.
  const band = await sharp(src).extract({ left: 0, top, width: meta.width, height }).png().toBuffer();
  const trimmed = await sharp(band).trim({ background: bg, threshold: 38 }).toBuffer({ resolveWithObject: true });
  const pad = 70;
  await sharp(trimmed.data)
    .extend({ top: pad, bottom: pad, left: pad, right: pad, background: bg })
    .png()
    .toFile(out);
  return { path: out, ratio: (trimmed.info.width + pad * 2) / (trimmed.info.height + pad * 2) };
}

const MASK = `-webkit-mask-image:linear-gradient(to bottom,transparent 0,#000 7%,#000 93%,transparent 100%),linear-gradient(to right,transparent 0,#000 6%,#000 94%,transparent 100%);-webkit-mask-composite:source-in;mask-composite:intersect`;
const DOTS = (bg) => `background-color:${bg};background-image:radial-gradient(rgba(255,255,255,.045) 1.4px,transparent 1.6px),radial-gradient(120% 60% at 50% 0%,rgba(255,255,255,.05),transparent 70%);background-size:24px 24px,100% 100%`;

async function artCover(a) {
  const t = await crop(a.src, a.title, `${a.slug}-t`, a.bg);
  const b = await crop(a.src, a.body, `${a.slug}-b`, a.bg);
  // Título e infográfico empilhados entre 4% e 81% da altura, até 940 px de largura.
  const avail = 1500 * 0.74;
  let w = 940;
  const total = (x) => x / t.ratio + x / b.ratio;
  if (total(w) > avail) w = Math.floor(avail / (1 / t.ratio + 1 / b.ratio));
  return `${HEAD(1000, 1500, `body{${DOTS(a.bg)}}
.col{position:absolute;left:0;right:0;top:${1500 * 0.04}px;height:${1500 * 0.78}px;display:flex;flex-direction:column;align-items:center;justify-content:space-evenly}
img{display:block;${MASK}}`)}
<div class="col"><img src="${file(t.path)}" style="width:${w}px"><img src="${file(b.path)}" style="width:${w}px"></div>${FIT}`;
}

async function artBanner(a) {
  const t = await crop(a.src, a.title, `${a.slug}-t`, a.bg);
  const b = await crop(a.src, a.body, `${a.slug}-b`, a.bg);
  // Título à esquerda, infográfico à direita, dentro da área segura (8% das bordas).
  const safeW = 1920 * 0.84;
  const safeH = 1080 * 0.84;
  const gap = 50;
  // Divide a largura para que os dois fiquem com a maior altura possível sem passar da área segura.
  let tw = Math.min(760, safeH * t.ratio);
  let bw = safeW - tw - gap;
  if (bw / b.ratio > safeH) bw = safeH * b.ratio;
  tw = Math.min(safeW - bw - gap, safeH * t.ratio, 900);
  return `${HEAD(1920, 1080, `body{${DOTS(a.bg)}}
.row{position:absolute;left:${1920 * 0.08}px;right:${1920 * 0.08}px;top:${1080 * 0.08}px;bottom:${1080 * 0.08}px;display:flex;align-items:center;justify-content:space-between;gap:60px}
img{display:block;${MASK}}`)}
<div class="row"><img src="${file(t.path)}" style="width:${tw}px"><img src="${file(b.path)}" style="width:${bw}px"></div>${FIT}`;
}

// ---------------------------------------------------------------- especiais
function campanha(w, h) {
  const banner = w > h;
  const bars = [
    { l: "AD 1", h: 0.34, on: false },
    { l: "AD 2", h: 0.22, on: false },
    { l: "AD 3", h: 1, on: true },
    { l: "AD 4", h: 0.18, on: false },
  ];
  const bh = banner ? 560 : 520;
  const chart = `<div class="chart" style="height:${bh + 60}px">${bars
    .map((b) => `<div class="bar"><div class="col${b.on ? " on" : ""}" style="height:${Math.round(bh * b.h)}px">${b.on ? '<div class="ck">✓</div>' : ""}</div><small>${b.l}</small></div>`)
    .join("")}</div>`;
  const css = `body{background:radial-gradient(90% 70% at 15% 10%,#22356a 0%,transparent 60%),radial-gradient(70% 60% at 100% 100%,#122453 0%,transparent 70%),#0a1020}
.chart{display:flex;align-items:flex-end;gap:${banner ? 34 : 28}px}
.bar{display:grid;justify-items:center;gap:14px}
.col{width:${banner ? 96 : 92}px;border-radius:10px 10px 4px 4px;background:rgba(255,255,255,.14);position:relative}
.col.on{background:linear-gradient(180deg,#FFD25A,#F5B82E);box-shadow:0 0 50px rgba(245,184,46,.35)}
.ck{position:absolute;top:-82px;left:50%;transform:translateX(-50%);color:#F5B82E;font-size:72px;font-weight:800}
.bar small{font-size:26px;color:#9fb0d6;font-weight:600}
.t{line-height:.92}
.lead{font-size:${banner ? 40 : 44}px;font-weight:600;line-height:1.25;color:#e9edf8}`;
  const titleHtml = `<div class="t"><span data-fit style="font-size:${banner ? 150 : 168}px;width:${banner ? 900 : 880}px">CAMPANHA</span><span data-fit style="font-size:${banner ? 150 : 168}px;width:${banner ? 900 : 880}px">DE TESTE</span><span data-fit style="font-size:${banner ? 150 : 168}px;width:${banner ? 900 : 880}px;color:#F5B82E">PRONTA</span></div>`;
  const tag = `<div class="tag" style="position:static;display:inline-block;font-size:32px;padding:12px 28px;background:#1fa64a;color:#fff">✓ Pronto para usar</div>`;
  const lead = `<div class="lead">Descubra qual anúncio vende gastando pouco.</div>`;
  const ch = chips(["Meta Ads", "Regras de corte", "Escala"], 32, "12px 22px");
  if (banner) {
    return `${HEAD(w, h, css)}<div style="position:absolute;left:154px;top:50%;transform:translateY(-50%);width:900px;display:grid;gap:28px"><div>${tag}</div>${titleHtml}${lead}${ch}</div>
<div style="position:absolute;right:190px;bottom:150px">${chart}</div>${FIT}`;
  }
  return `${HEAD(w, h, css)}<div style="position:absolute;left:60px;top:60px">${tag}</div>
<div style="position:absolute;right:70px;top:170px;transform:scale(.62);transform-origin:top right">${chart}</div>
<div style="position:absolute;left:60px;right:60px;bottom:300px;display:grid;gap:26px">${titleHtml}${lead}${ch}</div>${FIT}`;
}

function anuncios(w, h) {
  const banner = w > h;
  const IMG = `${COFRE}/Kit Produto Pronto/4 Site (kit + upsell)/site/img`;
  const css = `body{background:radial-gradient(70% 55% at 70% 20%,#4a3216 0%,transparent 65%),radial-gradient(60% 50% at 0% 100%,#2a1a3e 0%,transparent 70%),#120d09}
.card{position:absolute;border-radius:26px;overflow:hidden;box-shadow:0 30px 70px rgba(0,0,0,.55),0 0 0 2px rgba(255,255,255,.08);background:#000}
.card img{display:block;width:100%;height:100%;object-fit:cover}`;
  const tag = `<div class="tag" style="position:static;display:inline-block;font-size:32px;padding:12px 28px;background:#7c5cff;color:#fff">+ Anúncios prontos</div>`;
  const p = { l1: "CRIATIVOS", l2: "DO CAFÉ", c2: "#F5C04A" };
  const ch = chips(["6 imagens", "Carrossel", "2 vídeos"], 32, "12px 22px");
  if (banner) {
    return `${HEAD(w, h, css + ".t span{width:820px}")}
<div class="card" style="right:430px;top:150px;width:520px;height:520px;transform:rotate(-6deg)"><img src="${file(`${IMG}/criativo.jpg`)}"></div>
<div class="card" style="right:170px;top:200px;width:400px;height:680px;transform:rotate(5deg)"><img src="${file(`${IMG}/anuncios.jpg`)}" style="object-position:top"></div>
<div style="position:absolute;left:154px;top:50%;transform:translateY(-50%);width:820px;display:grid;gap:26px"><div>${tag}</div>${title(p, 168)}${ch}</div>${FIT}`;
  }
  return `${HEAD(w, h, css + ".t span{width:880px}")}
<div class="card" style="left:70px;top:150px;width:560px;height:560px;transform:rotate(-6deg)"><img src="${file(`${IMG}/criativo.jpg`)}"></div>
<div class="card" style="right:60px;top:110px;width:380px;height:640px;transform:rotate(6deg)"><img src="${file(`${IMG}/anuncios.jpg`)}" style="object-position:top"></div>
<div style="position:absolute;left:60px;top:60px">${tag}</div>
<div style="position:absolute;left:60px;right:60px;bottom:300px;display:grid;gap:22px">${title(p, 168)}${ch}</div>${FIT}`;
}

async function genio(w, h) {
  // Arte original (lâmpada + MÉTODO GÊNIO), recortada por dentro da moldura e fundida ao mesmo degradê.
  const src = new URL("../../public/mg/capa.jpg", import.meta.url).pathname;
  const meta = await sharp(src).metadata();
  const out = join(CACHE, "genio-art.png");
  const box = { left: Math.round(meta.width * 0.07), top: Math.round(meta.height * 0.05), width: Math.round(meta.width * 0.86), height: Math.round(meta.height * 0.88) };
  await sharp(src).extract(box).png().toFile(out);
  const ratio = box.width / box.height;
  const banner = w > h;
  const css = `body{background:radial-gradient(70% 45% at 10% 0%,#3a1242 0%,transparent 70%),radial-gradient(70% 50% at 100% 100%,#073049 0%,transparent 70%),radial-gradient(60% 40% at 50% 38%,#2b1a6a 0%,transparent 70%),#0d0b20}
img{display:block;-webkit-mask-image:linear-gradient(to bottom,transparent 0,#000 8%,#000 92%,transparent 100%),linear-gradient(to right,transparent 0,#000 9%,#000 91%,transparent 100%);-webkit-mask-composite:source-in;mask-composite:intersect}`;
  if (banner) {
    const ih = 1080 * 0.96;
    return `${HEAD(w, h, css)}<img src="${file(out)}" style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);height:${ih}px;width:${ih * ratio}px">${FIT}`;
  }
  const iw = 1000 * 1.0;
  return `${HEAD(w, h, css)}<img src="${file(out)}" style="position:absolute;left:50%;top:${1500 * 0.41}px;transform:translate(-50%,-50%);width:${iw}px;height:${iw / ratio}px">${FIT}`;
}

// ---------------------------------------------------------------- render
async function render(browser, html, w, h, out) {
  const page = await browser.newPage();
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
  const tmp = join(CACHE, `p-${Math.random().toString(36).slice(2)}.html`);
  writeFileSync(tmp, html);
  await page.goto(file(tmp), { waitUntil: "networkidle0" });
  await page.waitForSelector("body[data-ready='1']", { timeout: 15000 });
  const png = await page.screenshot({ type: "png" });
  await page.close();
  await sharp(png).jpeg({ quality: 85, mozjpeg: true }).toFile(out);
}

const only = new Set(process.argv.slice(2));
const want = (slug) => !only.size || only.has(slug);

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ["--allow-file-access-from-files", "--disable-web-security"] });
try {
  for (const p of PHOTO) {
    if (!want(p.slug)) continue;
    if (!existsSync(p.photo)) throw new Error(`Foto não encontrada: ${p.photo}`);
    await render(browser, photoCover(p), 1000, 1500, `${OUT}${p.slug}.jpg`);
    await render(browser, photoBanner(p), 1920, 1080, `${OUT}${p.slug}-banner.jpg`);
    console.log("ok", p.slug);
  }
  for (const a of ART) {
    if (!want(a.slug)) continue;
    await render(browser, await artCover(a), 1000, 1500, `${OUT}${a.slug}.jpg`);
    await render(browser, await artBanner(a), 1920, 1080, `${OUT}${a.slug}-banner.jpg`);
    console.log("ok", a.slug);
  }
  if (want("campanha-de-teste")) {
    await render(browser, campanha(1000, 1500), 1000, 1500, `${OUT}campanha-de-teste.jpg`);
    await render(browser, campanha(1920, 1080), 1920, 1080, `${OUT}campanha-de-teste-banner.jpg`);
    console.log("ok campanha-de-teste");
  }
  if (want("anuncios-cafe")) {
    await render(browser, anuncios(1000, 1500), 1000, 1500, `${OUT}anuncios-cafe.jpg`);
    await render(browser, anuncios(1920, 1080), 1920, 1080, `${OUT}anuncios-cafe-banner.jpg`);
    console.log("ok anuncios-cafe");
  }
  if (want("metodo-genio")) {
    await render(browser, await genio(1000, 1500), 1000, 1500, `${OUT}metodo-genio.jpg`);
    await render(browser, await genio(1920, 1080), 1920, 1080, `${OUT}metodo-genio-banner.jpg`);
    console.log("ok metodo-genio");
  }
} finally {
  await browser.close();
}
void SPECIAL;
