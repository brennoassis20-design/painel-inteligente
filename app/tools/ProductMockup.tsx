"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "../icons";
import { drawBook, drawCover, drawDevice, drawWarpedDevice, fontFamily, palettes, slug, type Palette, type Shape } from "./canvas-kit";

// Mockup 3D do produto: desenhado em canvas no navegador, sem IA e sem servidor.

type Background = "escuro" | "claro" | "transparente";
type Size = "quadrado" | "largo";

const shapes: { id: Shape; label: string }[] = [
  { id: "livro", label: "Livro" },
  { id: "tablet", label: "Tablet" },
  { id: "celular", label: "Celular" },
  { id: "kit", label: "Kit completo" },
];

const backgrounds: { id: Background; label: string }[] = [
  { id: "escuro", label: "Escuro" },
  { id: "claro", label: "Claro" },
  { id: "transparente", label: "Sem fundo" },
];

const sizes: { id: Size; label: string; w: number; h: number }[] = [
  { id: "quadrado", label: "Anúncio 1080×1080", w: 1080, h: 1080 },
  { id: "largo", label: "Página 1600×1000", w: 1600, h: 1000 },
];

type RenderOptions = { shape: Shape; background: Background; size: Size; palette: Palette; title: string; subtitle: string; label: string; brand: string };

function render(canvas: HTMLCanvasElement, opts: RenderOptions) {
  const size = sizes.find((item) => item.id === opts.size)!;
  canvas.width = size.w;
  canvas.height = size.h;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, size.w, size.h);
  const dark = opts.background !== "claro";

  if (opts.background === "escuro") {
    const bg = ctx.createRadialGradient(size.w * 0.5, size.h * 0.4, 50, size.w * 0.5, size.h * 0.5, size.w * 0.75);
    bg.addColorStop(0, "#2a1c5c");
    bg.addColorStop(1, "#07061a");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, size.w, size.h);
  } else if (opts.background === "claro") {
    const bg = ctx.createLinearGradient(0, 0, 0, size.h);
    bg.addColorStop(0, "#f7f5fb");
    bg.addColorStop(1, "#e6e1ef");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, size.w, size.h);
  }

  const cover = drawCover(opts.palette, opts.title, opts.subtitle, opts.label, opts.brand);
  const H = size.h;
  const W = size.w;
  const cy = H * 0.5;

  if (opts.shape === "livro") {
    drawBook(ctx, cover, opts.palette, W / 2, cy, H * 0.74, dark);
  } else if (opts.shape === "tablet") {
    drawWarpedDevice(ctx, drawDevice(cover, "tablet", opts.palette), W / 2, cy, H * 0.76, 0.08, dark);
  } else if (opts.shape === "celular") {
    drawWarpedDevice(ctx, drawDevice(cover, "celular", opts.palette), W / 2, cy, H * 0.78, 0.07, dark);
  } else {
    const unit = Math.min(H, W * 0.75);
    drawWarpedDevice(ctx, drawDevice(cover, "tablet", opts.palette), W / 2 - unit * 0.24, cy - unit * 0.03, unit * 0.66, -0.06, dark);
    drawBook(ctx, cover, opts.palette, W / 2 + unit * 0.06, cy + unit * 0.05, unit * 0.6, dark);
    drawWarpedDevice(ctx, drawDevice(cover, "celular", opts.palette), W / 2 + unit * 0.33, cy + unit * 0.1, unit * 0.48, 0.06, dark);
  }
}

export function ProductMockup({ title, subtitle, label }: { title: string; subtitle: string; label: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [form, setForm] = useState({ title, subtitle, label, brand: "" });
  const [shape, setShape] = useState<Shape>("livro");
  const [background, setBackground] = useState<Background>("escuro");
  const [size, setSize] = useState<Size>("quadrado");
  const [paletteId, setPaletteId] = useState(palettes[0].id);
  const [fontsReady, setFontsReady] = useState(false);

  // Quando o aluno abre outro projeto, a capa acompanha.
  const [source, setSource] = useState({ title, subtitle, label });
  if (source.title !== title || source.subtitle !== subtitle || source.label !== label) {
    setSource({ title, subtitle, label });
    setForm({ ...form, title, subtitle, label });
  }

  useEffect(() => {
    const family = fontFamily();
    Promise.all([document.fonts.load(`700 40px ${family}`), document.fonts.load(`400 20px ${family}`), document.fonts.load(`600 18px ${family}`)])
      .catch(() => undefined)
      .then(() => setFontsReady(true));
  }, []);

  useEffect(() => {
    if (!canvasRef.current) return;
    const palette = palettes.find((item) => item.id === paletteId) || palettes[0];
    render(canvasRef.current, { shape, background, size, palette, ...form });
  }, [form, shape, background, size, paletteId, fontsReady]);

  function download() {
    canvasRef.current?.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `mockup-${slug(form.title)}-${shape}.png`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }, "image/png");
  }

  function options<T extends string>(list: { id: T; label: string }[], value: T, onChange: (id: T) => void, aria: string) {
    return (
      <div className="pi-mock-opts" role="radiogroup" aria-label={aria}>
        {list.map((item) => (
          <button type="button" role="radio" aria-checked={value === item.id} key={item.id} className={value === item.id ? "on" : ""} onClick={() => onChange(item.id)}>
            {item.label}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="pi-mock">
      <div className="pi-card pi-mock-form">
        <p className="pi-step-title"><span>1</span>Texto da capa</p>
        <label className="pi-label">
          Título
          <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
        </label>
        <label className="pi-label">
          Subtítulo
          <input value={form.subtitle} onChange={(event) => setForm({ ...form, subtitle: event.target.value })} />
        </label>
        <div className="pi-form-grid">
          <label className="pi-label">
            Etiqueta
            <input value={form.label} onChange={(event) => setForm({ ...form, label: event.target.value })} />
          </label>
          <label className="pi-label">
            Seu nome ou marca
            <input value={form.brand} placeholder="Opcional" onChange={(event) => setForm({ ...form, brand: event.target.value })} />
          </label>
        </div>

        <p className="pi-step-title"><span>2</span>Visual</p>
        <span className="pi-mock-cap">Formato</span>
        {options(shapes, shape, setShape, "Formato do mockup")}
        <span className="pi-mock-cap">Cor da capa</span>
        <div className="pi-mock-colors" role="radiogroup" aria-label="Cor da capa">
          {palettes.map((item) => (
            <button
              type="button"
              role="radio"
              aria-checked={paletteId === item.id}
              aria-label={item.label}
              title={item.label}
              key={item.id}
              className={paletteId === item.id ? "on" : ""}
              style={{ background: `linear-gradient(135deg, ${item.from}, ${item.to})` }}
              onClick={() => setPaletteId(item.id)}
            />
          ))}
        </div>
        <span className="pi-mock-cap">Fundo</span>
        {options(backgrounds, background, setBackground, "Fundo")}
        <span className="pi-mock-cap">Tamanho</span>
        {options(sizes, size, setSize, "Tamanho")}
      </div>

      <div className="pi-mock-stage">
        <div className={`pi-mock-canvas ${background === "transparente" ? "checker" : ""}`}>
          <canvas ref={canvasRef} />
        </div>
        <button type="button" className="pi-btn-grad" onClick={download}>
          <Icon name="download" />
          Baixar imagem PNG
        </button>
        <p className="pi-mock-tip">Use na página de vendas, no checkout e nos anúncios. Quadrado para o feed; largo para o topo da página.</p>
      </div>
    </div>
  );
}
