// Criativos da Lâmpada de Ouro: formato de resposta direta aprovado no Kit Produto Pronto.
// Faixa colorida com a frase em CAIXA ALTA, linha de apoio, foto real com seta vermelha e preço embaixo.
// Sem mockup de livro/ebook (regra do Brenno).
import { fontFamily } from "./canvas-kit";

export type GoldAd = { angle: string; headline: string; support: string; photo: string; caption: string };

const BARS = ["#111111", "#1F7A45", "#B3261E", "#173B6C", "#5B2A86", "#111111"];
const GREEN = "#16A34A";
const RED = "#E0402F";

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

// Maior fonte em que o texto cabe no número de linhas.
function fit(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, start: number, min: number, maxLines: number, weight: number) {
  let size = start;
  let lines: string[] = [];
  for (; size >= min; size -= 2) {
    ctx.font = `${weight} ${size}px ${fontFamily()}`;
    lines = wrap(ctx, text, maxWidth);
    if (lines.length <= maxLines && lines.every((l) => ctx.measureText(l).width <= maxWidth)) break;
  }
  return { size: Math.max(size, min), lines };
}

function paintLines(ctx: CanvasRenderingContext2D, lines: string[], cx: number, y: number, size: number, leading: number, color: string, weight: number) {
  ctx.font = `${weight} ${size}px ${fontFamily()}`;
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  lines.forEach((line, i) => ctx.fillText(line, cx, y + i * size * leading));
  return lines.length * size * leading;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Seta curva vermelha apontando para a foto, sempre dentro da faixa [x, x + w].
function drawArrow(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  ctx.strokeStyle = RED;
  ctx.lineWidth = Math.max(8, w * 0.09);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  const endX = x + w * 0.92;
  const endY = y + h;
  ctx.beginPath();
  ctx.moveTo(x + w * 0.85, y);
  ctx.bezierCurveTo(x + w * 0.05, y + h * 0.15, x, y + h * 0.75, endX, endY);
  ctx.stroke();
  const head = w * 0.32;
  ctx.beginPath();
  ctx.moveTo(endX - head, endY - head * 0.15);
  ctx.lineTo(endX, endY);
  ctx.lineTo(endX - head * 0.35, endY - head);
  ctx.stroke();
}

export function renderGoldCreative(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  ad: GoldAd,
  photo: HTMLImageElement | null,
  index: number,
  price: string,
  spanish = false,
) {
  const story = H / W > 1.6;
  const safeTop = story ? 200 : 0;
  const safeBottom = story ? 300 : 0;
  const pad = 70;
  const cx = W / 2;
  ctx.save();
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);

  // Faixa do título
  const head = fit(ctx, ad.headline.toUpperCase(), W - pad * 2, story ? 96 : 88, 52, 3, 900);
  const barH = safeTop + 56 + head.lines.length * head.size * 1.05 + 50;
  ctx.fillStyle = BARS[index % BARS.length];
  ctx.fillRect(0, 0, W, barH);
  paintLines(ctx, head.lines, cx, safeTop + 56, head.size, 1.05, "#ffffff", 900);

  // Linha de apoio
  let y = barH + 34;
  if (ad.support) {
    const sup = fit(ctx, ad.support, W - pad * 2, 42, 30, 2, 700);
    y += paintLines(ctx, sup.lines, cx, y, sup.size, 1.25, "#1a1a1a", 700) + 30;
  }

  // Bloco do preço (de baixo para cima)
  const priceSize = W * 0.095;
  const subSize = W * 0.033;
  const bottom = H - safeBottom - 40;
  const priceTop = bottom - subSize * 1.3 - priceSize * 1.05;

  // Foto com seta
  const boxH = priceTop - 36 - y;
  if (photo && boxH > 120) {
    const boxW = Math.min(W * 0.64, boxH * 1.25);
    const bx = cx - boxW / 2 + W * 0.06;
    const scale = Math.max(boxW / photo.naturalWidth, boxH / photo.naturalHeight);
    const pw = photo.naturalWidth * scale;
    const ph = photo.naturalHeight * scale;
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.18)";
    ctx.shadowBlur = 30;
    ctx.shadowOffsetY = 10;
    roundRect(ctx, bx, y, boxW, boxH, 26);
    ctx.fillStyle = "#eee";
    ctx.fill();
    ctx.restore();
    ctx.save();
    roundRect(ctx, bx, y, boxW, boxH, 26);
    ctx.clip();
    ctx.drawImage(photo, bx + (boxW - pw) / 2, y + (boxH - ph) / 2, pw, ph);
    ctx.restore();
    const gap = bx - 30;
    if (gap > 60) drawArrow(ctx, 30, y + boxH * 0.1, Math.min(gap - 16, 170), boxH * 0.5);
  }

  // Preço ou chamada
  const lead = price ? (spanish ? "POR SOLO " : "POR APENAS ") : "";
  const value = price ? (spanish ? `US$ ${price}` : price) : spanish ? "ACCESO INMEDIATO" : "ACESSO IMEDIATO";
  ctx.font = `900 ${priceSize}px ${fontFamily()}`;
  ctx.textBaseline = "top";
  ctx.textAlign = "left";
  const total = ctx.measureText(lead + value).width;
  const scale = Math.min(1, (W - pad) / total);
  ctx.font = `900 ${priceSize * scale}px ${fontFamily()}`;
  const leadW = ctx.measureText(lead).width;
  const startX = cx - ctx.measureText(lead + value).width / 2;
  ctx.fillStyle = "#111111";
  ctx.fillText(lead, startX, priceTop);
  ctx.fillStyle = price ? GREEN : "#111111";
  ctx.fillText(value, startX + leadW, priceTop);
  ctx.font = `700 ${subSize}px ${fontFamily()}`;
  ctx.fillStyle = "#555555";
  ctx.textAlign = "center";
  ctx.fillText(price ? (spanish ? "Acceso inmediato en tu celular" : "Acesso imediato no celular") : spanish ? "Recíbelo ahora en tu celular" : "Receba agora no seu celular", cx, priceTop + priceSize * 1.08);
  ctx.restore();
}
