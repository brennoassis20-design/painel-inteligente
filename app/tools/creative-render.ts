// Criativos em imagem: desenhados em canvas no navegador, sem IA e sem custo por imagem.
// O mesmo desenho serve para o PNG, o carrossel e o vídeo (com o tempo t controlando a animação).

import { currencyOf, translator, type ProductLanguage } from "@/lib/locale";
import { drawCover, drawMockup, fontFamily, roundRect, type Palette, type Shape } from "./canvas-kit";

export type FormatId = "feed" | "quadrado" | "story";

export const formats: { id: FormatId; label: string; hint: string; w: number; h: number }[] = [
  { id: "feed", label: "Feed 4:5", hint: "1080×1350", w: 1080, h: 1350 },
  { id: "quadrado", label: "Quadrado 1:1", hint: "1080×1080", w: 1080, h: 1080 },
  { id: "story", label: "Story e Reels 9:16", hint: "1080×1920", w: 1080, h: 1920 },
];

export type Layout = "pergunta" | "destaque" | "lista" | "antesdepois" | "oferta" | "texto";

export type CreativeSpec = {
  id: string;
  angle: string;
  layout: Layout;
  kicker: string;
  headline: string;
  support: string;
  items: string[];
  before: string[];
  cta: string;
  swipe?: boolean;
  page?: [number, number];
};

export type CreativeTheme = {
  palette: Palette;
  sprite: HTMLCanvasElement | null;
  price: string;
  brand: string;
  language?: ProductLanguage;
};

export type CreativeCopy = {
  title: string;
  subtitle: string;
  promise: string;
  pain: string;
  label: string;
  modules: string[];
  bullets: string[];
  language?: ProductLanguage;
};

// ---------- Textos padrão (o aluno pode editar tudo) ----------

function shortItem(value: string) {
  return value
    .replace(/^(m[oó]dulo|cap[ií]tulo|etapa|dia|passo)\s*\d+\s*[:.\-–]\s*/i, "")
    .replace(/[.;]\s*$/, "")
    .trim();
}

function pickItems(copy: CreativeCopy, count: number) {
  const source = copy.modules.length ? copy.modules : copy.bullets;
  return source.map(shortItem).filter(Boolean).slice(0, count);
}

export function buildImageCreatives(copy: CreativeCopy): CreativeSpec[] {
  const t = translator(copy.language || "pt");
  const items = pickItems(copy, 4);
  const benefits = (copy.bullets.length ? copy.bullets : copy.modules).map(shortItem).filter(Boolean).slice(0, 3);
  return [
    {
      id: "dor",
      angle: "Dor direta",
      layout: "pergunta",
      kicker: t("Atenção"),
      headline: copy.pain,
      support: `${copy.title} ${t("mostra o caminho, passo a passo.")}`,
      items: [],
      before: [],
      cta: t("Saiba mais"),
    },
    {
      id: "resultado",
      angle: "Resultado desejado",
      layout: "destaque",
      kicker: copy.label || t("Novo"),
      headline: copy.promise,
      support: copy.title,
      items: [],
      before: [],
      cta: t("Quero começar"),
    },
    {
      id: "dentro",
      angle: "O que tem dentro",
      layout: "lista",
      kicker: copy.title,
      headline: t("O que você vai *receber*"),
      support: "",
      items,
      before: [],
      cta: t("Ver tudo"),
    },
    {
      id: "antesdepois",
      angle: "Antes e depois",
      layout: "antesdepois",
      kicker: copy.title,
      headline: t("Antes x *Depois*"),
      support: "",
      items: ["Um passo a passo claro", "Sabe exatamente o que fazer", "Resultado mais rápido"].map(t),
      before: ["Informação solta e confusa", "Não sabe por onde começar", "Tentativa e erro"].map(t),
      cta: t("Quero o depois"),
    },
    {
      id: "oferta",
      angle: "Oferta direta",
      layout: "oferta",
      kicker: "Acesso imediato",
      headline: copy.title,
      support: copy.subtitle,
      items: benefits,
      before: [],
      cta: t("Quero o meu agora"),
    },
  ];
}

export function buildCarousel(copy: CreativeCopy): CreativeSpec[] {
  const t = translator(copy.language || "pt");
  const slides: CreativeSpec[] = [
    {
      id: "c1",
      angle: "Capa",
      layout: "pergunta",
      kicker: t("Leia até o final"),
      headline: copy.pain,
      support: "",
      items: [],
      before: [],
      cta: "",
      swipe: true,
    },
    {
      id: "c2",
      angle: "O problema",
      layout: "texto",
      kicker: t("O problema"),
      headline: t("Por que tanta gente *trava* no começo?"),
      support: t("A maioria tenta resolver no improviso, junta dicas soltas e desiste antes de ver resultado. Não é falta de vontade: é falta de um caminho claro."),
      items: [],
      before: [],
      cta: "",
      swipe: true,
    },
    {
      id: "c3",
      angle: "A virada",
      layout: "destaque",
      kicker: t("A virada"),
      headline: t("Existe um caminho *mais simples*"),
      support: copy.promise,
      items: [],
      before: [],
      cta: "",
      swipe: true,
    },
    {
      id: "c4",
      angle: "O que tem dentro",
      layout: "lista",
      kicker: t("O que você recebe"),
      headline: copy.title,
      support: "",
      items: pickItems(copy, 4),
      before: [],
      cta: "",
      swipe: true,
    },
    {
      id: "c5",
      angle: "Antes e depois",
      layout: "antesdepois",
      kicker: t("A diferença"),
      headline: t("Antes x *Depois*"),
      support: "",
      items: ["Um passo a passo claro", "Sabe exatamente o que fazer", "Resultado mais rápido"].map(t),
      before: ["Informação solta e confusa", "Não sabe por onde começar", "Tentativa e erro"].map(t),
      cta: "",
      swipe: true,
    },
    {
      id: "c6",
      angle: "Oferta",
      layout: "oferta",
      kicker: "Acesso imediato",
      headline: copy.title,
      support: "",
      items: [],
      before: [],
      cta: t("Toque em saiba mais"),
    },
  ];
  return slides.map((slide, index) => ({ ...slide, page: [index + 1, slides.length] }));
}

// ---------- Cores ----------

function hexToRgb(hex: string) {
  const value = hex.replace("#", "");
  const full = value.length === 3 ? value.split("").map((c) => c + c).join("") : value;
  const num = parseInt(full.slice(0, 6), 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function rgba(hex: string, alpha: number) {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function mix(a: string, b: string, t: number) {
  const ca = hexToRgb(a);
  const cb = hexToRgb(b);
  const c = ca.map((v, i) => Math.round(v + (cb[i] - v) * t));
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
}

function isDark(palette: Palette) {
  return palette.text.toLowerCase() === "#ffffff";
}

function colors(palette: Palette) {
  const dark = isDark(palette);
  return {
    dark,
    text: dark ? "#ffffff" : palette.text,
    accent: palette.accent,
    onAccent: dark ? palette.from : "#ffffff",
    soft: dark ? "rgba(255,255,255,0.08)" : rgba(palette.text, 0.06),
    line: dark ? "rgba(255,255,255,0.16)" : rgba(palette.text, 0.14),
  };
}

// ---------- Mockup recortado (desenhado uma vez e reaproveitado em todos os criativos) ----------

export function buildMockSprite(palette: Palette, shape: Shape, title: string, subtitle: string, label: string, brand: string) {
  const cover = drawCover(palette, title, subtitle, label, brand);
  const canvas = document.createElement("canvas");
  canvas.width = 1500;
  canvas.height = 1100;
  const ctx = canvas.getContext("2d")!;
  drawMockup(ctx, shape, cover, palette, 750, 520, 820, isDark(palette));

  // Recorta as bordas vazias para o mockup ocupar a área reservada no criativo.
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  let minX = canvas.width;
  let minY = canvas.height;
  let maxX = 0;
  let maxY = 0;
  for (let y = 0; y < canvas.height; y += 2) {
    for (let x = 0; x < canvas.width; x += 2) {
      if (data[(y * canvas.width + x) * 4 + 3] > 24) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX <= minX || maxY <= minY) return canvas;
  const crop = document.createElement("canvas");
  crop.width = maxX - minX + 4;
  crop.height = maxY - minY + 4;
  crop.getContext("2d")!.drawImage(canvas, minX - 2, minY - 2, crop.width, crop.height, 0, 0, crop.width, crop.height);
  return crop;
}

// ---------- Texto com destaque (*palavras* entre asteriscos) ----------

type Word = { text: string; hl: boolean };

function parseRich(text: string): Word[] {
  const words: Word[] = [];
  let hl = false;
  let current = "";
  let currentHl = false;
  const push = () => {
    if (current) words.push({ text: current, hl: currentHl });
    current = "";
  };
  for (const char of text) {
    if (char === "*") {
      push();
      hl = !hl;
      currentHl = hl;
    } else if (/\s/.test(char)) {
      push();
      currentHl = hl;
    } else {
      if (!current) currentHl = hl;
      current += char;
    }
  }
  push();
  return words;
}

type RichFit = { size: number; lines: Word[][]; lineHeight: number; height: number; weight: number };

function fitRich(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, start: number, min: number, maxLines: number, weight: number, leading = 1.12): RichFit {
  const family = fontFamily();
  const words = parseRich(text);
  let size = start;
  let lines: Word[][] = [];
  for (; size >= min; size -= 2) {
    ctx.font = `${weight} ${size}px ${family}`;
    const space = ctx.measureText(" ").width;
    const hlPad = size * 0.28;
    lines = [];
    let line: Word[] = [];
    let width = 0;
    for (const word of words) {
      const w = ctx.measureText(word.text).width + (word.hl ? hlPad : 0);
      const next = line.length ? width + space + w : w;
      if (next > maxWidth && line.length) {
        lines.push(line);
        line = [word];
        width = w;
      } else {
        line.push(word);
        width = next;
      }
    }
    if (line.length) lines.push(line);
    if (lines.length <= maxLines) break;
  }
  size = Math.max(size, min);
  if (lines.length > maxLines) {
    lines = lines.slice(0, maxLines);
    const last = lines[maxLines - 1];
    last[last.length - 1] = { ...last[last.length - 1], text: `${last[last.length - 1].text.replace(/[,.;:!?]+$/, "")}…` };
  }
  const lineHeight = size * leading;
  return { size, lines, lineHeight, height: lines.length ? lineHeight * (lines.length - 1) + size : 0, weight };
}

function paintRich(ctx: CanvasRenderingContext2D, fit: RichFit, x: number, y: number, color: string, hlBg: string, hlText: string, align: "left" | "center" = "left", maxWidth = 0) {
  const family = fontFamily();
  ctx.font = `${fit.weight} ${fit.size}px ${family}`;
  ctx.textBaseline = "top";
  const space = ctx.measureText(" ").width;
  const hlPad = fit.size * 0.14;
  fit.lines.forEach((line, index) => {
    // Folga do destaque só nas pontas de cada trecho destacado.
    const padL = line.map((word, i) => (word.hl && !line[i - 1]?.hl ? hlPad : 0));
    const padR = line.map((word, i) => (word.hl && !line[i + 1]?.hl ? hlPad : 0));
    const widths = line.map((word, i) => ctx.measureText(word.text).width + padL[i] + padR[i]);
    const total = widths.reduce((sum, w) => sum + w, 0) + space * (line.length - 1);
    let cx = align === "center" ? x + (maxWidth - total) / 2 : x;
    const ly = y + index * fit.lineHeight;
    // Fundo do destaque: um bloco contínuo para palavras destacadas em sequência.
    let runStart = -1;
    let runX = 0;
    let px = cx;
    line.forEach((word, i) => {
      if (word.hl && runStart < 0) {
        runStart = i;
        runX = px;
      }
      const end = px + widths[i];
      const nextHl = line[i + 1]?.hl;
      if (word.hl && !nextHl) {
        ctx.fillStyle = hlBg;
        roundRect(ctx, runX - hlPad * 0.2, ly - fit.size * 0.1, end - runX + hlPad * 0.4, fit.size * 1.18, fit.size * 0.18);
        ctx.fill();
        runStart = -1;
      }
      px = end + space;
    });
    line.forEach((word, i) => {
      ctx.fillStyle = word.hl ? hlText : color;
      ctx.fillText(word.text, cx + padL[i], ly);
      cx += widths[i] + space;
    });
  });
}

// ---------- Animação ----------

const ease = (v: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, v)), 3);

function appear(t: number, delay: number) {
  return Number.isFinite(t) ? ease((t - delay) / 0.55) : 1;
}

function withAppear(ctx: CanvasRenderingContext2D, a: number, draw: () => void, rise = 36) {
  if (a <= 0) return;
  ctx.save();
  ctx.globalAlpha *= a;
  ctx.translate(0, (1 - a) * rise);
  draw();
  ctx.restore();
}

// ---------- Peças ----------

function drawBackground(ctx: CanvasRenderingContext2D, W: number, H: number, palette: Palette, t: number) {
  const c = colors(palette);
  const drift = Number.isFinite(t) ? Math.sin(t * 0.6) * 40 : 0;
  if (c.dark) {
    const base = ctx.createLinearGradient(0, 0, W * 0.4, H);
    base.addColorStop(0, mix(palette.from, "#000000", 0.35));
    base.addColorStop(1, mix(palette.from, "#000000", 0.6));
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, W, H);
    const glow = ctx.createRadialGradient(W * 0.9 + drift, H * 0.12, 20, W * 0.9 + drift, H * 0.12, W * 0.95);
    glow.addColorStop(0, rgba(palette.to, 0.75));
    glow.addColorStop(1, rgba(palette.to, 0));
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);
    const glow2 = ctx.createRadialGradient(W * 0.05 - drift, H * 0.92, 20, W * 0.05, H * 0.92, W * 0.8);
    glow2.addColorStop(0, rgba(palette.accent, 0.22));
    glow2.addColorStop(1, rgba(palette.accent, 0));
    ctx.fillStyle = glow2;
    ctx.fillRect(0, 0, W, H);
    // Grade sutil, como no painel
    ctx.strokeStyle = "rgba(255,255,255,0.045)";
    ctx.lineWidth = 1;
    for (let x = 0; x <= W; x += 90) {
      ctx.beginPath();
      ctx.moveTo(x + 0.5, 0);
      ctx.lineTo(x + 0.5, H);
      ctx.stroke();
    }
    for (let y = 0; y <= H; y += 90) {
      ctx.beginPath();
      ctx.moveTo(0, y + 0.5);
      ctx.lineTo(W, y + 0.5);
      ctx.stroke();
    }
  } else {
    const base = ctx.createLinearGradient(0, 0, W * 0.3, H);
    base.addColorStop(0, mix(palette.from, "#ffffff", 0.55));
    base.addColorStop(1, palette.from);
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, W, H);
    const glow = ctx.createRadialGradient(W * 0.92 + drift, H * 0.1, 20, W * 0.92 + drift, H * 0.1, W * 0.9);
    glow.addColorStop(0, rgba(palette.to, 0.45));
    glow.addColorStop(1, rgba(palette.to, 0));
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = rgba(palette.text, 0.05);
    ctx.lineWidth = 2;
    for (const r of [260, 380, 500]) {
      ctx.beginPath();
      ctx.arc(W * 0.05, H * 0.95, r, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
}

function drawKicker(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, palette: Palette, maxWidth: number) {
  if (!text.trim()) return 0;
  const c = colors(palette);
  const family = fontFamily();
  let size = 26;
  let label = text.toUpperCase();
  ctx.font = `700 ${size}px ${family}`;
  ctx.letterSpacing = "4px";
  while (ctx.measureText(label).width > maxWidth - 60 && size > 18) {
    size -= 1;
    ctx.font = `700 ${size}px ${family}`;
  }
  while (ctx.measureText(label).width > maxWidth - 60 && label.length > 4) label = `${label.slice(0, -2).trim()}…`;
  const w = ctx.measureText(label).width + 52;
  const h = size + 30;
  ctx.fillStyle = c.dark ? "rgba(255,255,255,0.06)" : rgba(palette.text, 0.05);
  roundRect(ctx, x, y, w, h, h / 2);
  ctx.fill();
  ctx.strokeStyle = rgba(palette.accent, 0.7);
  ctx.lineWidth = 2;
  roundRect(ctx, x + 1, y + 1, w - 2, h - 2, h / 2);
  ctx.stroke();
  ctx.fillStyle = palette.accent;
  ctx.beginPath();
  ctx.arc(x + 22, y + h / 2, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = c.text;
  ctx.textBaseline = "middle";
  ctx.fillText(label, x + 36, y + h / 2 + 1);
  ctx.letterSpacing = "0px";
  ctx.textBaseline = "top";
  return h;
}

function drawCta(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, palette: Palette, align: "left" | "center", W: number) {
  if (!text.trim()) return 0;
  const c = colors(palette);
  const family = fontFamily();
  ctx.font = `700 38px ${family}`;
  const tw = Math.min(ctx.measureText(text).width, W - 300);
  const h = 104;
  const w = tw + 150;
  const left = align === "center" ? (W - w) / 2 : x;
  ctx.save();
  ctx.shadowColor = rgba(palette.accent, c.dark ? 0.55 : 0.35);
  ctx.shadowBlur = 40;
  ctx.shadowOffsetY = 10;
  ctx.fillStyle = palette.accent;
  roundRect(ctx, left, y, w, h, h / 2);
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = c.onAccent;
  ctx.textBaseline = "middle";
  ctx.fillText(text, left + 50, y + h / 2 + 1, W - 300);
  // Seta
  const ax = left + w - 66;
  const ay = y + h / 2;
  ctx.strokeStyle = c.onAccent;
  ctx.lineWidth = 6;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(ax - 16, ay);
  ctx.lineTo(ax + 16, ay);
  ctx.moveTo(ax + 4, ay - 13);
  ctx.lineTo(ax + 17, ay);
  ctx.lineTo(ax + 4, ay + 13);
  ctx.stroke();
  ctx.textBaseline = "top";
  return h;
}

function formatPrice(price: string, language: ProductLanguage = "pt") {
  const clean = price.trim().replace(/^(r\$|us\$|\$)\s*/i, "");
  if (!clean) return "";
  return `${currencyOf(language).symbol} ${clean}`;
}

function drawPrice(ctx: CanvasRenderingContext2D, price: string, cx: number, cy: number, r: number, palette: Palette, language: ProductLanguage = "pt") {
  const t = translator(language);
  const value = formatPrice(price, language);
  if (!value) return;
  const c = colors(palette);
  const family = fontFamily();
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-0.12);
  ctx.shadowColor = "rgba(0,0,0,0.35)";
  ctx.shadowBlur = 30;
  ctx.shadowOffsetY = 12;
  const g = ctx.createLinearGradient(-r, -r, r, r);
  g.addColorStop(0, palette.accent);
  g.addColorStop(1, mix(palette.accent, c.dark ? "#ffffff" : "#000000", 0.25));
  ctx.fillStyle = g;
  ctx.beginPath();
  // Selo com bordas em estrela suave
  const spikes = 18;
  for (let i = 0; i <= spikes * 2; i += 1) {
    const angle = (i / (spikes * 2)) * Math.PI * 2;
    const rr = i % 2 === 0 ? r : r * 0.92;
    ctx.lineTo(Math.cos(angle) * rr, Math.sin(angle) * rr);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-0.12);
  ctx.fillStyle = c.onAccent;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `600 ${Math.round(r * 0.2)}px ${family}`;
  ctx.fillText(t("por apenas"), 0, -r * 0.34);
  let size = Math.round(r * 0.44);
  ctx.font = `800 ${size}px ${family}`;
  while (ctx.measureText(value).width > r * 1.6 && size > 20) {
    size -= 2;
    ctx.font = `800 ${size}px ${family}`;
  }
  ctx.fillText(value, 0, r * 0.08);
  ctx.font = `600 ${Math.round(r * 0.16)}px ${family}`;
  ctx.fillText(t("acesso imediato"), 0, r * 0.48);
  ctx.restore();
}

function drawMark(ctx: CanvasRenderingContext2D, kind: "check" | "x", cx: number, cy: number, r: number, palette: Palette) {
  const c = colors(palette);
  ctx.fillStyle = kind === "check" ? palette.accent : c.soft;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = kind === "check" ? c.onAccent : rgba(c.text, 0.55);
  ctx.lineWidth = r * 0.22;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  if (kind === "check") {
    ctx.moveTo(cx - r * 0.42, cy + r * 0.02);
    ctx.lineTo(cx - r * 0.1, cy + r * 0.34);
    ctx.lineTo(cx + r * 0.46, cy - r * 0.3);
  } else {
    ctx.moveTo(cx - r * 0.3, cy - r * 0.3);
    ctx.lineTo(cx + r * 0.3, cy + r * 0.3);
    ctx.moveTo(cx + r * 0.3, cy - r * 0.3);
    ctx.lineTo(cx - r * 0.3, cy + r * 0.3);
  }
  ctx.stroke();
}

type ItemsFit = { fits: RichFit[]; height: number; gap: number; r: number };

function fitItems(ctx: CanvasRenderingContext2D, items: string[], width: number, start: number, min: number, maxLines: number): ItemsFit {
  const r = Math.round(start * 0.62);
  const gap = Math.round(start * 0.7);
  const fits = items.map((item) => fitRich(ctx, item.replace(/\*/g, ""), width - r * 2 - 22, start, min, maxLines, 600, 1.22));
  // Mesmo tamanho para todos os itens (o menor que coube)
  const size = Math.min(...fits.map((fit) => fit.size), start);
  const even = items.map((item) => fitRich(ctx, item.replace(/\*/g, ""), width - r * 2 - 22, size, size, maxLines, 600, 1.22));
  const height = even.reduce((sum, fit) => sum + Math.max(fit.height, r * 2), 0) + gap * Math.max(0, even.length - 1);
  return { fits: even, height, gap, r };
}

function paintItems(ctx: CanvasRenderingContext2D, fit: ItemsFit, x: number, y: number, kind: "check" | "x", palette: Palette, color: string, t: number, delay: number) {
  let cy = y;
  fit.fits.forEach((item, index) => {
    const h = Math.max(item.height, fit.r * 2);
    withAppear(ctx, appear(t, delay + index * 0.12), () => {
      drawMark(ctx, kind, x + fit.r, cy + Math.min(h, item.size * 1.1) / 2, fit.r, palette);
      paintRich(ctx, item, x + fit.r * 2 + 22, cy + (item.lines.length === 1 ? (fit.r * 2 - item.size) / 2 : 0), color, color, color);
    }, 24);
    cy += h + fit.gap;
  });
}

function drawSprite(ctx: CanvasRenderingContext2D, sprite: HTMLCanvasElement | null, x: number, y: number, w: number, h: number, t: number, delay: number, align: "center" | "bottom" = "center") {
  if (!sprite || w < 80 || h < 80) return { x, y, w: 0, h: 0 };
  const scale = Math.min(w / sprite.width, h / sprite.height);
  const dw = sprite.width * scale;
  const dh = sprite.height * scale;
  const dx = x + (w - dw) / 2;
  const dy = align === "bottom" ? y + h - dh : y + (h - dh) / 2;
  const a = appear(t, delay);
  if (a <= 0) return { x: dx, y: dy, w: dw, h: dh };
  const zoom = Number.isFinite(t) ? 0.92 + 0.08 * a + Math.min(t, 4) * 0.008 : 1;
  const float = Number.isFinite(t) ? Math.sin(t * 1.6) * 6 : 0;
  ctx.save();
  ctx.globalAlpha *= a;
  ctx.translate(dx + dw / 2, dy + dh / 2 + float);
  ctx.scale(zoom, zoom);
  ctx.drawImage(sprite, -dw / 2, -dh / 2, dw, dh);
  ctx.restore();
  return { x: dx, y: dy, w: dw, h: dh };
}

function drawChrome(ctx: CanvasRenderingContext2D, spec: CreativeSpec, theme: CreativeTheme, W: number, H: number, safeTop: number, safeBottom: number, t: number) {
  const c = colors(theme.palette);
  const family = fontFamily();
  ctx.textBaseline = "top";
  if (spec.page) {
    const label = `${spec.page[0]}/${spec.page[1]}`;
    ctx.font = `700 26px ${family}`;
    const w = ctx.measureText(label).width + 40;
    ctx.fillStyle = c.soft;
    roundRect(ctx, W - 84 - w, safeTop, w, 54, 27);
    ctx.fill();
    ctx.fillStyle = c.text;
    ctx.textBaseline = "middle";
    ctx.fillText(label, W - 84 - w + 20, safeTop + 28);
    ctx.textBaseline = "top";
  }
  if (spec.swipe) {
    withAppear(ctx, appear(t, 0.9), () => {
      ctx.font = `600 30px ${family}`;
      ctx.fillStyle = c.text;
      ctx.globalAlpha *= 0.8;
      const text = translator(theme.language || "pt")("Arrasta para o lado");
      const tw = ctx.measureText(text).width;
      const y = H - safeBottom - 40;
      ctx.fillText(text, W - 84 - tw - 64, y);
      ctx.strokeStyle = theme.palette.accent;
      ctx.lineWidth = 5;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      const ax = W - 84 - 22;
      const ay = y + 17;
      ctx.beginPath();
      ctx.moveTo(ax - 26, ay);
      ctx.lineTo(ax + 10, ay);
      ctx.moveTo(ax - 4, ay - 13);
      ctx.lineTo(ax + 11, ay);
      ctx.lineTo(ax - 4, ay + 13);
      ctx.stroke();
    }, 0);
  }
  if (theme.brand.trim()) {
    ctx.font = `600 26px ${family}`;
    ctx.fillStyle = c.text;
    ctx.globalAlpha = 0.6;
    const y = spec.swipe ? H - safeBottom - 36 : H - safeBottom + 28;
    ctx.fillText(theme.brand.trim(), 84, Math.min(y, H - 50));
    ctx.globalAlpha = 1;
  }
}

// ---------- Layouts ----------

export function renderCreative(ctx: CanvasRenderingContext2D, W: number, H: number, spec: CreativeSpec, theme: CreativeTheme, t = Infinity) {
  const palette = theme.palette;
  const c = colors(palette);
  const story = H / W > 1.6;
  const square = H / W < 1.1;
  const pad = 84;
  const safeTop = story ? 230 : 80;
  const safeBottom = story ? 320 : 84;
  const innerW = W - pad * 2;
  const footer = spec.swipe ? 70 : spec.cta.trim() ? 104 : 0;
  const ctaY = H - safeBottom - footer;

  ctx.save();
  ctx.clearRect(0, 0, W, H);
  drawBackground(ctx, W, H, palette, t);
  ctx.textBaseline = "top";

  let y = safeTop;
  const kickerW = spec.page ? innerW - 150 : innerW;
  withAppear(ctx, appear(t, 0), () => {
    drawKicker(ctx, spec.kicker, pad, safeTop, palette, kickerW);
  });
  y += spec.kicker.trim() ? 56 + (story ? 44 : 34) : 0;

  const hlBg = palette.accent;
  const hlText = c.onAccent;

  const drawHeadline = (fit: RichFit, at: number, align: "left" | "center" = "left") =>
    withAppear(ctx, appear(t, 0.12), () => paintRich(ctx, fit, pad, at, c.text, hlBg, hlText, align, innerW));
  const drawSupport = (fit: RichFit, at: number, align: "left" | "center" = "left") =>
    withAppear(ctx, appear(t, 0.3), () => {
      ctx.globalAlpha *= 0.86;
      paintRich(ctx, fit, pad, at, c.text, hlBg, hlText, align, innerW);
    });
  const drawFooter = () => {
    if (spec.swipe) return;
    withAppear(ctx, appear(t, 0.65), () => drawCta(ctx, spec.cta, pad, ctaY, palette, story ? "center" : "left", W));
  };

  if (spec.layout === "pergunta") {
    const head = fitRich(ctx, spec.headline, innerW, story ? 96 : square ? 78 : 88, 50, story ? 6 : square ? 4 : 5, 800, 1.1);
    drawHeadline(head, y);
    y += head.height + 34;
    if (spec.support.trim()) {
      const sup = fitRich(ctx, spec.support, innerW * 0.92, 38, 28, 3, 400, 1.35);
      drawSupport(sup, y);
      y += sup.height + 30;
    }
    const boxTop = y;
    const boxBottom = ctaY - 24;
    const boxW = square ? innerW * 0.62 : innerW;
    drawSprite(ctx, theme.sprite, square ? W - pad - boxW : pad, boxTop, boxW, boxBottom - boxTop, t, 0.4, "bottom");
    drawFooter();
  } else if (spec.layout === "destaque") {
    const head = fitRich(ctx, spec.headline, innerW, story ? 88 : square ? 70 : 80, 46, story ? 5 : 4, 800, 1.1);
    drawHeadline(head, y);
    y += head.height + 30;
    let supH = 0;
    let sup: RichFit | null = null;
    if (spec.support.trim()) {
      sup = fitRich(ctx, spec.support, innerW, 36, 26, square ? 2 : 3, 500, 1.3);
      supH = sup.height + 30;
    }
    if (sup) drawSupport(sup, y);
    y += supH;
    const box = drawSprite(ctx, theme.sprite, pad, y, innerW, ctaY - 30 - y, t, 0.35);
    if (theme.price.trim() && box.w) {
      withAppear(ctx, appear(t, 0.8), () => drawPrice(ctx, theme.price, Math.min(W - pad - 110, box.x + box.w + 10), box.y + 120, 120, palette, theme.language), 0);
    }
    drawFooter();
  } else if (spec.layout === "lista") {
    const head = fitRich(ctx, spec.headline, innerW, story ? 84 : 72, 44, 3, 800, 1.1);
    drawHeadline(head, y);
    y += head.height + (story ? 60 : 44);
    const side = !story && theme.sprite;
    const listW = side ? innerW * (square ? 0.6 : 0.58) : innerW;
    const items = fitItems(ctx, spec.items, listW, story ? 42 : square ? 34 : 38, 24, 2);
    const avail = ctaY - 40 - y;
    const listY = side ? y + Math.max(0, (avail - items.height) / 2) : y;
    paintItems(ctx, items, pad, listY, "check", palette, c.text, t, 0.3);
    if (side) {
      drawSprite(ctx, theme.sprite, pad + listW + 20, y, innerW - listW - 20, avail, t, 0.5);
    } else {
      const top = y + items.height + 50;
      drawSprite(ctx, theme.sprite, pad, top, innerW, ctaY - 40 - top, t, 0.6);
    }
    drawFooter();
  } else if (spec.layout === "antesdepois") {
    const head = fitRich(ctx, spec.headline, innerW, story ? 92 : 80, 48, 2, 800, 1.1);
    drawHeadline(head, y);
    y += head.height + (story ? 60 : 44);
    const gap = 24;
    const colW = (innerW - gap) / 2;
    const itemSize = story ? 36 : square ? 30 : 33;
    const beforeFit = fitItems(ctx, spec.before, colW - 64, itemSize, 22, 3);
    const afterFit = fitItems(ctx, spec.items, colW - 64, itemSize, 22, 3);
    const labelH = 70;
    const cardH = Math.max(beforeFit.height, afterFit.height) + labelH + 70;
    const family = fontFamily();
    const card = (x: number, kind: "x" | "check", fit: ItemsFit, label: string, delay: number) =>
      withAppear(ctx, appear(t, delay), () => {
        if (kind === "check") {
          ctx.save();
          ctx.shadowColor = rgba(palette.accent, 0.35);
          ctx.shadowBlur = 40;
          ctx.fillStyle = c.dark ? rgba(palette.accent, 0.1) : "rgba(255,255,255,0.7)";
          roundRect(ctx, x, y, colW, cardH, 32);
          ctx.fill();
          ctx.restore();
          ctx.strokeStyle = palette.accent;
          ctx.lineWidth = 3;
          roundRect(ctx, x + 1.5, y + 1.5, colW - 3, cardH - 3, 32);
          ctx.stroke();
        } else {
          ctx.fillStyle = c.soft;
          roundRect(ctx, x, y, colW, cardH, 32);
          ctx.fill();
        }
        ctx.save();
        ctx.font = `800 30px ${family}`;
        ctx.letterSpacing = "4px";
        ctx.fillStyle = kind === "check" ? palette.accent : c.text;
        if (kind === "x") ctx.globalAlpha *= 0.6;
        ctx.textBaseline = "top";
        ctx.fillText(label, x + 32, y + 36);
        ctx.restore();
        paintItems(ctx, fit, x + 32, y + 36 + labelH, kind, palette, c.text, t, delay + 0.15);
      }, 20);
    const es = theme.language === "es";
    card(pad, "x", beforeFit, "ANTES", 0.3);
    card(pad + colW + gap, "check", afterFit, es ? "DESPUÉS" : "DEPOIS", 0.55);
    y += cardH + 30;
    drawSprite(ctx, theme.sprite, pad, y, innerW, ctaY - 30 - y, t, 0.8);
    drawFooter();
  } else if (spec.layout === "oferta") {
    const head = fitRich(ctx, spec.headline, innerW, story ? 84 : square ? 64 : 74, 44, 3, 800, 1.1);
    drawHeadline(head, y);
    y += head.height + 26;
    if (spec.support.trim()) {
      const sup = fitRich(ctx, spec.support, innerW, 32, 24, 2, 400, 1.32);
      drawSupport(sup, y);
      y += sup.height + 26;
    }
    let items: ItemsFit | null = null;
    if (spec.items.length && !square) {
      items = fitItems(ctx, spec.items, innerW, story ? 34 : 30, 22, 1);
    }
    const itemsH = items ? items.height + 40 : 0;
    const box = drawSprite(ctx, theme.sprite, pad, y, innerW, ctaY - 30 - y - itemsH, t, 0.3);
    if (theme.price.trim()) {
      const r = story ? 140 : 118;
      withAppear(ctx, appear(t, 0.7), () => drawPrice(ctx, theme.price, Math.min(W - pad - r + 20, (box.w ? box.x + box.w : W - pad) - 10), (box.w ? box.y : y) + r + 10, r, palette, theme.language), 0);
    }
    if (items) paintItems(ctx, items, pad, ctaY - 30 - itemsH + 10, "check", palette, c.text, t, 0.55);
    drawFooter();
  } else {
    // texto: bloco centralizado verticalmente, sem mockup
    const head = fitRich(ctx, spec.headline, innerW, story ? 100 : 86, 50, 4, 800, 1.1);
    const sup = spec.support.trim() ? fitRich(ctx, spec.support, innerW, story ? 44 : 38, 28, story ? 9 : 7, 400, 1.42) : null;
    const total = head.height + (sup ? 50 + sup.height : 0);
    const top = Math.max(y + 20, y + (ctaY - y - total) / 2 - 20);
    withAppear(ctx, appear(t, 0.05), () => {
      ctx.fillStyle = palette.accent;
      roundRect(ctx, pad, top - 40, 90, 8, 4);
      ctx.fill();
    });
    drawHeadline(head, top);
    if (sup) drawSupport(sup, top + head.height + 50);
    drawFooter();
  }

  drawChrome(ctx, spec, theme, W, H, safeTop, safeBottom, t);
  ctx.restore();
}
