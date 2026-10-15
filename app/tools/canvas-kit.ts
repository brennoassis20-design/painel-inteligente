// Desenho em canvas compartilhado pelo Mockup 3D e pelos Criativos em imagem (sem IA e sem servidor).

export type Shape = "livro" | "tablet" | "celular" | "kit";

export type Palette = { id: string; label: string; from: string; to: string; accent: string; text: string };

export const palettes: Palette[] = [
  { id: "genio", label: "Gênio", from: "#1d1450", to: "#5a2fc2", accent: "#9fe9ff", text: "#ffffff" },
  { id: "marinho", label: "Marinho", from: "#0d1a36", to: "#22457d", accent: "#e2bd6e", text: "#ffffff" },
  { id: "rose", label: "Rosé", from: "#fbe6e4", to: "#d98d93", accent: "#7c2f3c", text: "#3a1520" },
  { id: "salvia", label: "Sálvia", from: "#e8efe1", to: "#7f9f80", accent: "#244530", text: "#1c3324" },
  { id: "terracota", label: "Terracota", from: "#f8e3d1", to: "#cf6c38", accent: "#5a2210", text: "#3b1709" },
  { id: "ameixa", label: "Ameixa", from: "#2b1030", to: "#8a3a7c", accent: "#ffb3d9", text: "#ffffff" },
  { id: "floresta", label: "Floresta", from: "#0f2a1f", to: "#2f6b4c", accent: "#b9f2c9", text: "#ffffff" },
  { id: "grafite", label: "Grafite", from: "#1c1f24", to: "#424a55", accent: "#ffc879", text: "#ffffff" },
];

export const COVER_W = 600;
export const COVER_H = 850;

export function fontFamily() {
  const sora = getComputedStyle(document.documentElement).getPropertyValue("--font-sora").trim();
  return sora || "system-ui, sans-serif";
}

export function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

export function fitText(ctx: CanvasRenderingContext2D, text: string, weight: number, start: number, min: number, maxWidth: number, maxLines: number, family: string) {
  let size = start;
  let lines: string[] = [];
  while (size >= min) {
    ctx.font = `${weight} ${size}px ${family}`;
    lines = wrapLines(ctx, text, maxWidth);
    if (lines.length <= maxLines && lines.every((line) => ctx.measureText(line).width <= maxWidth)) break;
    size -= 2;
  }
  if (lines.length > maxLines) {
    lines = lines.slice(0, maxLines);
    lines[maxLines - 1] = `${lines[maxLines - 1].replace(/[\s,.;:]+\S*$/, "")}…`;
  }
  return { size: Math.max(size, min), lines };
}

export function drawCover(palette: Palette, title: string, subtitle: string, label: string, brand: string) {
  const canvas = document.createElement("canvas");
  canvas.width = COVER_W;
  canvas.height = COVER_H;
  const ctx = canvas.getContext("2d")!;
  const family = fontFamily();

  const bg = ctx.createLinearGradient(0, 0, COVER_W, COVER_H);
  bg.addColorStop(0, palette.from);
  bg.addColorStop(1, palette.to);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, COVER_W, COVER_H);

  // Brilho e círculos decorativos
  const glow = ctx.createRadialGradient(COVER_W * 0.85, COVER_H * 0.82, 10, COVER_W * 0.85, COVER_H * 0.82, 420);
  glow.addColorStop(0, `${palette.accent}55`);
  glow.addColorStop(1, `${palette.accent}00`);
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, COVER_W, COVER_H);
  ctx.strokeStyle = `${palette.accent}40`;
  ctx.lineWidth = 2;
  for (const r of [150, 210, 270]) {
    ctx.beginPath();
    ctx.arc(COVER_W * 0.92, COVER_H * 0.9, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  const pad = 56;
  ctx.textBaseline = "top";

  // Etiqueta do formato
  if (label) {
    ctx.fillStyle = palette.accent;
    ctx.font = `600 17px ${family}`;
    ctx.letterSpacing = "4px";
    ctx.fillText(label.toUpperCase(), pad, 70);
    ctx.letterSpacing = "0px";
  }
  ctx.fillStyle = palette.accent;
  ctx.fillRect(pad, 106, 54, 4);

  // Título
  ctx.fillStyle = palette.text;
  const titleFit = fitText(ctx, title || "Seu produto", 700, 62, 34, COVER_W - pad * 2, 5, family);
  ctx.font = `700 ${titleFit.size}px ${family}`;
  let y = 150;
  for (const line of titleFit.lines) {
    ctx.fillText(line, pad, y);
    y += titleFit.size * 1.12;
  }

  // Subtítulo
  if (subtitle) {
    y += 22;
    ctx.globalAlpha = 0.82;
    const subFit = fitText(ctx, subtitle, 400, 24, 18, COVER_W - pad * 2 - 40, 4, family);
    ctx.font = `400 ${subFit.size}px ${family}`;
    for (const line of subFit.lines) {
      ctx.fillText(line, pad, y);
      y += subFit.size * 1.45;
    }
    ctx.globalAlpha = 1;
  }

  // Rodapé
  ctx.fillStyle = palette.text;
  ctx.globalAlpha = 0.5;
  ctx.fillRect(pad, COVER_H - 104, COVER_W - pad * 2, 1);
  ctx.globalAlpha = 0.85;
  ctx.font = `600 18px ${family}`;
  ctx.fillText(brand || "Edição completa", pad, COVER_H - 78);
  ctx.globalAlpha = 1;
  return canvas;
}

export function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

export function drawDevice(cover: HTMLCanvasElement, kind: "tablet" | "celular", palette: Palette) {
  const w = kind === "tablet" ? 760 : 460;
  const h = kind === "tablet" ? 1010 : 950;
  const bezel = kind === "tablet" ? 30 : 20;
  const radius = kind === "tablet" ? 54 : 72;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;

  const body = ctx.createLinearGradient(0, 0, w, h);
  body.addColorStop(0, "#3a3d45");
  body.addColorStop(0.5, "#111216");
  body.addColorStop(1, "#2a2c33");
  ctx.fillStyle = body;
  roundRect(ctx, 0, 0, w, h, radius);
  ctx.fill();
  ctx.fillStyle = "#050507";
  roundRect(ctx, 6, 6, w - 12, h - 12, radius - 6);
  ctx.fill();

  const sx = bezel;
  const sy = bezel;
  const sw = w - bezel * 2;
  const sh = h - bezel * 2;
  ctx.save();
  roundRect(ctx, sx, sy, sw, sh, radius - bezel);
  ctx.clip();
  if (kind === "celular") {
    // No celular a capa aparece como num app de leitura: fundo escuro e capa centralizada.
    const screenBg = ctx.createLinearGradient(sx, sy, sx, sy + sh);
    screenBg.addColorStop(0, "#15131f");
    screenBg.addColorStop(1, "#08070d");
    ctx.fillStyle = screenBg;
    ctx.fillRect(sx, sy, sw, sh);
    const glow = ctx.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, sw);
    glow.addColorStop(0, `${palette.to}66`);
    glow.addColorStop(1, `${palette.to}00`);
    ctx.fillStyle = glow;
    ctx.fillRect(sx, sy, sw, sh);
    const margin = 30;
    const fw = sw - margin * 2;
    const fh = COVER_H * (fw / COVER_W);
    const fy = sy + (sh - fh) / 2 + 10;
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.6)";
    ctx.shadowBlur = 30;
    ctx.shadowOffsetY = 12;
    roundRect(ctx, sx + margin, fy, fw, fh, 12);
    ctx.fillStyle = palette.from;
    ctx.fill();
    ctx.restore();
    ctx.save();
    roundRect(ctx, sx + margin, fy, fw, fh, 12);
    ctx.clip();
    ctx.drawImage(cover, sx + margin, fy, fw, fh);
    ctx.restore();
  } else {
    const scale = Math.max(sw / COVER_W, sh / COVER_H);
    const cw = COVER_W * scale;
    const ch = COVER_H * scale;
    ctx.drawImage(cover, sx + (sw - cw) / 2, sy + (sh - ch) / 2, cw, ch);
  }
  // Reflexo da tela
  const shine = ctx.createLinearGradient(sx, sy, sx + sw, sy + sh);
  shine.addColorStop(0, "rgba(255,255,255,0.16)");
  shine.addColorStop(0.45, "rgba(255,255,255,0)");
  ctx.fillStyle = shine;
  ctx.fillRect(sx, sy, sw, sh);
  ctx.restore();

  if (kind === "celular") {
    ctx.fillStyle = "#050507";
    roundRect(ctx, w / 2 - 56, bezel + 12, 112, 30, 15);
    ctx.fill();
  } else {
    ctx.fillStyle = "#1c1d22";
    ctx.beginPath();
    ctx.arc(w / 2, bezel / 2 + 1, 5, 0, Math.PI * 2);
    ctx.fill();
  }
  return canvas;
}

// Distorce a imagem em perspectiva: borda esquerda com altura hl, direita com hr (centro vertical fixo).
function warp(ctx: CanvasRenderingContext2D, src: HTMLCanvasElement, x: number, cy: number, w: number, hl: number, hr: number) {
  const cols = Math.ceil(w);
  for (let i = 0; i < cols; i += 1) {
    const t = i / cols;
    const h = hl + (hr - hl) * t;
    ctx.drawImage(src, t * src.width, 0, src.width / cols + 1, src.height, x + i, cy - h / 2, 1.6, h);
  }
}

function quadPath(ctx: CanvasRenderingContext2D, x: number, cy: number, w: number, hl: number, hr: number) {
  ctx.beginPath();
  ctx.moveTo(x, cy - hl / 2);
  ctx.lineTo(x + w, cy - hr / 2);
  ctx.lineTo(x + w, cy + hr / 2);
  ctx.lineTo(x, cy + hl / 2);
  ctx.closePath();
}

export function floorShadow(ctx: CanvasRenderingContext2D, cx: number, y: number, w: number, dark: boolean) {
  const g = ctx.createRadialGradient(cx, y, 4, cx, y, w / 2);
  g.addColorStop(0, dark ? "rgba(0,0,0,0.55)" : "rgba(40,30,70,0.32)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.save();
  ctx.translate(cx, y);
  ctx.scale(1, 0.16);
  ctx.translate(-cx, -y);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, y, w / 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawBook(ctx: CanvasRenderingContext2D, cover: HTMLCanvasElement, palette: Palette, cx: number, cy: number, h: number, dark: boolean) {
  const w = h * (COVER_W / COVER_H) * 0.9;
  const hl = h;
  const hr = h * 0.9;
  const spine = h * 0.075;
  const x = cx - w / 2 + spine / 2;

  floorShadow(ctx, cx + w * 0.08, cy + h / 2 + 6, w * 1.5, dark);

  // Miolo de páginas aparecendo atrás da capa
  ctx.fillStyle = "#f1ece2";
  quadPath(ctx, x + 8, cy - 4, w - 2, hl - 10, hr - 12);
  ctx.fill();

  // Lombada
  const sp = ctx.createLinearGradient(x - spine, 0, x, 0);
  sp.addColorStop(0, palette.from);
  sp.addColorStop(1, palette.to);
  ctx.fillStyle = sp;
  ctx.beginPath();
  ctx.moveTo(x - spine, cy - (hl * 0.93) / 2);
  ctx.lineTo(x, cy - hl / 2);
  ctx.lineTo(x, cy + hl / 2);
  ctx.lineTo(x - spine, cy + (hl * 0.93) / 2);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.fill();

  warp(ctx, cover, x, cy, w, hl, hr);

  // Luz e dobra da capa
  ctx.save();
  quadPath(ctx, x, cy, w, hl, hr);
  ctx.clip();
  const light = ctx.createLinearGradient(x, 0, x + w, 0);
  light.addColorStop(0, "rgba(0,0,0,0.28)");
  light.addColorStop(0.035, "rgba(255,255,255,0.22)");
  light.addColorStop(0.07, "rgba(255,255,255,0)");
  light.addColorStop(0.75, "rgba(0,0,0,0)");
  light.addColorStop(1, "rgba(0,0,0,0.18)");
  ctx.fillStyle = light;
  ctx.fillRect(x, cy - hl / 2, w, hl);
  ctx.restore();
}

export function drawWarpedDevice(ctx: CanvasRenderingContext2D, device: HTMLCanvasElement, cx: number, cy: number, h: number, tilt: number, dark: boolean) {
  const w = h * (device.width / device.height) * 0.94;
  const hl = tilt > 0 ? h : h * (1 + tilt);
  const hr = tilt > 0 ? h * (1 - tilt) : h;
  floorShadow(ctx, cx, cy + h / 2 + 4, w * 1.4, dark);
  warp(ctx, device, cx - w / 2, cy, w, hl, hr);
}

// Desenha o mockup escolhido centralizado em (cx, cy) ocupando a altura h.
export function drawMockup(ctx: CanvasRenderingContext2D, shape: Shape, cover: HTMLCanvasElement, palette: Palette, cx: number, cy: number, h: number, dark: boolean) {
  if (shape === "livro") {
    drawBook(ctx, cover, palette, cx, cy, h * 0.95, dark);
  } else if (shape === "tablet") {
    drawWarpedDevice(ctx, drawDevice(cover, "tablet", palette), cx, cy, h * 0.97, 0.08, dark);
  } else if (shape === "celular") {
    drawWarpedDevice(ctx, drawDevice(cover, "celular", palette), cx, cy, h, 0.07, dark);
  } else {
    const unit = h * 1.28;
    drawWarpedDevice(ctx, drawDevice(cover, "tablet", palette), cx - unit * 0.24, cy - unit * 0.03, unit * 0.66, -0.06, dark);
    drawBook(ctx, cover, palette, cx + unit * 0.06, cy + unit * 0.05, unit * 0.6, dark);
    drawWarpedDevice(ctx, drawDevice(cover, "celular", palette), cx + unit * 0.33, cy + unit * 0.1, unit * 0.48, 0.06, dark);
  }
}

export function slug(value: string) {
  return (
    value
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40) || "produto"
  );
}
