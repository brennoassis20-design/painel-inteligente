"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "../icons";
import { fontFamily, palettes, slug, type Palette, type Shape } from "./canvas-kit";
import {
  buildCarousel,
  buildImageCreatives,
  buildMockSprite,
  formats,
  renderCreative,
  type CreativeCopy,
  type CreativeSpec,
  type CreativeTheme,
  type FormatId,
} from "./creative-render";

// Criativos em imagem, carrossel e vídeo sem aparecer: tudo desenhado no navegador, sem custo de IA.

type Tab = "imagens" | "carrossel" | "video";
type MockChoice = Shape | "nenhum";
type Edits = Record<string, Partial<Pick<CreativeSpec, "kicker" | "headline" | "support" | "items" | "before" | "cta">>>;

const tabs: { id: Tab; label: string; icon: "page" | "list" | "play" }[] = [
  { id: "imagens", label: "Imagens", icon: "page" },
  { id: "carrossel", label: "Carrossel", icon: "list" },
  { id: "video", label: "Vídeo sem aparecer", icon: "play" },
];

const mockChoices: { id: MockChoice; label: string }[] = [
  { id: "livro", label: "Livro" },
  { id: "tablet", label: "Tablet" },
  { id: "celular", label: "Celular" },
  { id: "kit", label: "Kit completo" },
  { id: "nenhum", label: "Sem mockup" },
];

const durations = [
  { id: 2.5, label: "Rápido" },
  { id: 3.5, label: "Normal" },
  { id: 5, label: "Lento" },
];

// Cor sugerida pelo assunto do produto (o aluno pode trocar).
function suggestPalette(text: string) {
  const value = text.toLowerCase();
  const rules: [RegExp, string][] = [
    [/casamento|noiva|festa|madrinha/, "rose"],
    [/finan|dinheiro|d[ií]vida|renda|investi|or[cç]amento|planilha/, "marinho"],
    [/marmita|bolo|receita|doce|confeit|comida|cozinha|salgado|p[aã]o/, "terracota"],
    [/beleza|cabelo|capilar|maquiagem|unha|pele|skin|sobrancelha|est[eé]tica/, "ameixa"],
    [/pet|cachorro|c[aã]o|gato|jardim|planta|horta|casa/, "floresta"],
    [/sa[uú]de|alongamento|fit|emagrec|corpo|treino|yoga|dor|sono|ansiedade/, "salvia"],
  ];
  return rules.find(([pattern]) => pattern.test(value))?.[1] || "genio";
}

function pickMime() {
  if (typeof MediaRecorder === "undefined") return "";
  const types = ["video/mp4;codecs=avc1.42E01E", "video/mp4;codecs=avc1", "video/mp4", "video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"];
  return types.find((type) => MediaRecorder.isTypeSupported(type)) || "";
}

function saveBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function renderToBlob(spec: CreativeSpec, theme: CreativeTheme, format: FormatId) {
  const size = formats.find((item) => item.id === format)!;
  const canvas = document.createElement("canvas");
  canvas.width = size.w;
  canvas.height = size.h;
  renderCreative(canvas.getContext("2d")!, size.w, size.h, spec, theme);
  return new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("png"))), "image/png"));
}

function applyEdits(list: CreativeSpec[], edits: Edits) {
  return list.map((spec) => ({ ...spec, ...edits[spec.id] }));
}

function editsKey(projectKey: string) {
  return `painel-criativos-${projectKey || "rascunho"}`;
}

function readEdits(projectKey: string): Edits {
  try {
    return JSON.parse(window.localStorage.getItem(editsKey(projectKey)) || "{}");
  } catch {
    return {};
  }
}

function CreativeCanvas({ spec, theme, format, scale = 0.5 }: { spec: CreativeSpec; theme: CreativeTheme | null; format: FormatId; scale?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const size = formats.find((item) => item.id === format)!;
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || !theme) return;
    canvas.width = Math.round(size.w * scale);
    canvas.height = Math.round(size.h * scale);
    const ctx = canvas.getContext("2d")!;
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    renderCreative(ctx, size.w, size.h, spec, theme);
  }, [spec, theme, size, scale]);
  return <canvas ref={ref} style={{ aspectRatio: `${size.w} / ${size.h}` }} />;
}

function SpecEditor({ spec, onChange, onReset }: { spec: CreativeSpec; onChange: (patch: Edits[string]) => void; onReset: () => void }) {
  const list = spec.layout === "lista" || spec.layout === "antesdepois" || spec.layout === "oferta";
  return (
    <div className="pi-cr-edit">
      <label className="pi-label">
        Etiqueta
        <input value={spec.kicker} onChange={(event) => onChange({ kicker: event.target.value })} />
      </label>
      <label className="pi-label">
        <span>Título <em>use *asteriscos* para destacar</em></span>
        <textarea className="pi-textarea" rows={3} value={spec.headline} onChange={(event) => onChange({ headline: event.target.value })} />
      </label>
      {spec.layout !== "lista" && spec.layout !== "antesdepois" && (
        <label className="pi-label">
          Texto de apoio
          <textarea className="pi-textarea" rows={2} value={spec.support} onChange={(event) => onChange({ support: event.target.value })} />
        </label>
      )}
      {spec.layout === "antesdepois" && (
        <label className="pi-label">
          <span>Antes <em>um por linha</em></span>
          <textarea className="pi-textarea" rows={3} value={spec.before.join("\n")} onChange={(event) => onChange({ before: event.target.value.split("\n") })} />
        </label>
      )}
      {list && (
        <label className="pi-label">
          <span>{spec.layout === "antesdepois" ? "Depois" : "Itens"} <em>um por linha</em></span>
          <textarea className="pi-textarea" rows={4} value={spec.items.join("\n")} onChange={(event) => onChange({ items: event.target.value.split("\n") })} />
        </label>
      )}
      {!spec.swipe && (
        <label className="pi-label">
          Botão
          <input value={spec.cta} onChange={(event) => onChange({ cta: event.target.value })} />
        </label>
      )}
      <button type="button" className="pi-btn-soft" onClick={onReset}>
        Voltar ao texto original
      </button>
    </div>
  );
}

export function ImageCreatives({
  copy,
  captions,
  projectKey,
  makeZip,
  onCopy,
}: {
  copy: CreativeCopy;
  captions: string[];
  projectKey: string;
  makeZip: (files: { name: string; data: Uint8Array }[]) => Blob;
  onCopy: (label: string, text: string) => void;
}) {
  const [tab, setTab] = useState<Tab>("imagens");
  const [format, setFormat] = useState<FormatId>("feed");
  const [carouselFormat, setCarouselFormat] = useState<FormatId>("feed");
  const [videoFormat, setVideoFormat] = useState<FormatId>("story");
  const [duration, setDuration] = useState(3.5);
  const [paletteId, setPaletteId] = useState(() => suggestPalette(`${copy.title} ${copy.subtitle}`));
  const [mixColors, setMixColors] = useState(true);
  const [mock, setMock] = useState<MockChoice>("livro");
  const [price, setPrice] = useState("");
  const [brand, setBrand] = useState("");
  const [fontsReady, setFontsReady] = useState(false);
  const [editing, setEditing] = useState("");
  const [edits, setEdits] = useState<Edits>({});
  const [busy, setBusy] = useState("");
  const [video, setVideo] = useState<{ state: "idle" | "preview" | "recording"; progress: number; note: string }>({ state: "idle", progress: 0, note: "" });
  const videoRef = useRef<HTMLCanvasElement>(null);
  const stopRef = useRef(false);

  // Outro projeto aberto: cor sugerida e textos editados daquele projeto.
  const [source, setSource] = useState("");
  const sourceKey = `${projectKey}|${copy.title}`;
  if (fontsReady && source !== sourceKey) {
    setSource(sourceKey);
    setPaletteId(suggestPalette(`${copy.title} ${copy.subtitle}`));
    setEdits(readEdits(projectKey));
    setEditing("");
  }

  useEffect(() => {
    const family = fontFamily();
    Promise.all([400, 500, 600, 700, 800].map((weight) => document.fonts.load(`${weight} 40px ${family}`)))
      .catch(() => undefined)
      .then(() => setFontsReady(true));
  }, []);

  function updateEdits(next: Edits) {
    setEdits(next);
    try {
      window.localStorage.setItem(editsKey(projectKey), JSON.stringify(next));
    } catch {
      // Sem armazenamento: as edições valem só nesta sessão.
    }
  }

  const palette = palettes.find((item) => item.id === paletteId) || palettes[0];

  // Paletas das variações: a escolhida primeiro e, se "misturar", as outras em seguida.
  const variationPalettes = useMemo(() => {
    const order = [palette, ...palettes.filter((item) => item.id !== palette.id)];
    return order.slice(0, 5).map((item) => (mixColors ? item : palette));
  }, [palette, mixColors]);

  const sprites = useMemo(() => {
    if (!fontsReady || mock === "nenhum") return new Map<string, HTMLCanvasElement>();
    const map = new Map<string, HTMLCanvasElement>();
    const needed = new Set<Palette>([palette, ...variationPalettes]);
    needed.forEach((item) => map.set(item.id, buildMockSprite(item, mock, copy.title, copy.subtitle, copy.label, brand)));
    return map;
  }, [fontsReady, mock, palette, variationPalettes, copy.title, copy.subtitle, copy.label, brand]);

  const themeFor = (item: Palette): CreativeTheme | null =>
    fontsReady ? { palette: item, sprite: sprites.get(item.id) || null, price, brand, language: copy.language } : null;

  const images = useMemo(() => applyEdits(buildImageCreatives(copy), edits), [copy, edits]);
  const slides = useMemo(() => applyEdits(buildCarousel(copy), edits), [copy, edits]);
  const videoSlides = useMemo(
    () =>
      slides.map((slide, index) => ({
        ...slide,
        swipe: false,
        page: undefined,
        kicker: index === 0 && !edits[slide.id]?.kicker ? "Assista até o final" : slide.kicker,
      })),
    [slides, edits],
  );

  const mainTheme = themeFor(palette);
  const fileBase = slug(copy.title);

  function patchSpec(id: string, patch: Edits[string]) {
    updateEdits({ ...edits, [id]: { ...edits[id], ...patch } });
  }

  function resetSpec(id: string) {
    const next = { ...edits };
    delete next[id];
    updateEdits(next);
  }

  async function downloadOne(spec: CreativeSpec, item: Palette, fmt: FormatId, name: string) {
    const theme = themeFor(item);
    if (!theme) return;
    saveBlob(await renderToBlob(spec, theme, fmt), name);
  }

  async function downloadZip(kind: "tudo" | "carrossel") {
    if (!mainTheme) return;
    setBusy(kind);
    try {
      const files: { name: string; data: Uint8Array }[] = [];
      const add = async (name: string, spec: CreativeSpec, item: Palette, fmt: FormatId) => {
        const blob = await renderToBlob(spec, themeFor(item)!, fmt);
        files.push({ name, data: new Uint8Array(await blob.arrayBuffer()) });
      };
      if (kind === "tudo") {
        for (const fmt of formats) {
          for (const [index, spec] of images.entries()) {
            await add(`criativos-${fileBase}/${fmt.id}/${String(index + 1).padStart(2, "0")}-${slug(spec.angle)}.png`, spec, variationPalettes[index], fmt.id);
          }
        }
        files.push({
          name: `criativos-${fileBase}/legendas.txt`,
          data: new TextEncoder().encode(images.map((spec, index) => `${index + 1}. ${spec.angle}\n\n${captions[index % captions.length] || ""}`).join("\n\n---\n\n")),
        });
      }
      for (const [index, spec] of slides.entries()) {
        await add(`${kind === "tudo" ? `criativos-${fileBase}/` : ""}carrossel-${fileBase}/${String(index + 1).padStart(2, "0")}-${slug(spec.angle)}.png`, spec, palette, carouselFormat);
      }
      saveBlob(makeZip(files), kind === "tudo" ? `criativos-${fileBase}.zip` : `carrossel-${fileBase}.zip`);
    } finally {
      setBusy("");
    }
  }

  // ---------- Vídeo ----------

  function playVideo(record: boolean) {
    const canvas = videoRef.current;
    if (!canvas || !mainTheme) return;
    const size = formats.find((item) => item.id === videoFormat)!;
    canvas.width = size.w;
    canvas.height = size.h;
    const ctx = canvas.getContext("2d")!;
    const current = document.createElement("canvas");
    current.width = size.w;
    current.height = size.h;
    const cctx = current.getContext("2d")!;
    const previous = document.createElement("canvas");
    previous.width = size.w;
    previous.height = size.h;
    const pctx = previous.getContext("2d")!;
    const fade = 0.45;
    const total = videoSlides.length * duration + 1;

    let recorder: MediaRecorder | null = null;
    const chunks: Blob[] = [];
    const mime = record ? pickMime() : "";
    if (record) {
      if (!mime || typeof canvas.captureStream !== "function") {
        setVideo({ state: "idle", progress: 0, note: "Este navegador não grava vídeo. Use o Chrome ou o Safari atualizados." });
        return;
      }
      recorder = new MediaRecorder(canvas.captureStream(30), { mimeType: mime, videoBitsPerSecond: 8_000_000 });
      recorder.ondataavailable = (event) => {
        if (event.data.size) chunks.push(event.data);
      };
      recorder.onstop = () => {
        const mp4 = mime.includes("mp4");
        saveBlob(new Blob(chunks, { type: mime.split(";")[0] }), `video-${fileBase}.${mp4 ? "mp4" : "webm"}`);
        setVideo({
          state: "idle",
          progress: 100,
          note: mp4 ? "Vídeo MP4 baixado." : "Vídeo baixado em WebM. Se o Instagram não aceitar, abra no CapCut e exporte em MP4.",
        });
      };
      recorder.start(250);
    }

    stopRef.current = false;
    setVideo({ state: record ? "recording" : "preview", progress: 0, note: "" });
    const startedAt = performance.now();

    const frame = () => {
      const time = (performance.now() - startedAt) / 1000;
      if (stopRef.current || time >= total) {
        if (recorder && recorder.state !== "inactive") {
          if (stopRef.current) {
            recorder.onstop = null;
            setVideo({ state: "idle", progress: 0, note: "Gravação cancelada." });
          }
          recorder.stop();
        } else {
          setVideo((state) => ({ ...state, state: "idle", progress: stopRef.current ? 0 : 100 }));
        }
        return;
      }
      const index = Math.min(videoSlides.length - 1, Math.floor(time / duration));
      const local = time - index * duration;
      renderCreative(cctx, size.w, size.h, videoSlides[index], mainTheme, local);
      if (index > 0 && local < fade) {
        renderCreative(pctx, size.w, size.h, videoSlides[index - 1], mainTheme, duration + local);
        ctx.globalAlpha = 1;
        ctx.drawImage(previous, 0, 0);
        ctx.globalAlpha = 1 - Math.pow(1 - local / fade, 3);
        ctx.drawImage(current, 0, 0);
        ctx.globalAlpha = 1;
      } else {
        ctx.drawImage(current, 0, 0);
      }
      setVideo((state) => ({ ...state, progress: Math.round((time / total) * 100) }));
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }

  // Quadro parado do vídeo enquanto não está tocando.
  useEffect(() => {
    if (tab !== "video" || video.state !== "idle" || !videoRef.current || !mainTheme) return;
    const size = formats.find((item) => item.id === videoFormat)!;
    const canvas = videoRef.current;
    canvas.width = size.w;
    canvas.height = size.h;
    renderCreative(canvas.getContext("2d")!, size.w, size.h, videoSlides[0], mainTheme);
  }, [tab, video.state, videoFormat, videoSlides, mainTheme]);

  useEffect(() => () => {
    stopRef.current = true;
  }, []);

  // No celular o editor fica acima da grade: leva o aluno até ele.
  useEffect(() => {
    if (editing && window.innerWidth <= 1080) {
      document.querySelector(".pi-cr-edit")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [editing]);

  function options<T extends string | number>(list: { id: T; label: string }[], value: T, onChange: (id: T) => void, aria: string, disabled = false) {
    return (
      <div className="pi-mock-opts" role="radiogroup" aria-label={aria}>
        {list.map((item) => (
          <button type="button" role="radio" aria-checked={value === item.id} key={String(item.id)} className={value === item.id ? "on" : ""} disabled={disabled} onClick={() => onChange(item.id)}>
            {item.label}
          </button>
        ))}
      </div>
    );
  }

  const carouselFormats = formats.filter((item) => item.id !== "story");
  const editingSpec = [...images, ...slides].find((spec) => spec.id === editing);
  const editingImage = images.findIndex((spec) => spec.id === editing);
  const running = video.state !== "idle";

  return (
    <div className="pi-cr">
      <div className="pi-segment pi-cr-tabs" role="tablist" aria-label="Tipo de criativo">
        {tabs.map((item) => (
          <button key={item.id} role="tab" aria-selected={tab === item.id} className={tab === item.id ? "on" : ""} onClick={() => !running && setTab(item.id)} type="button">
            <Icon name={item.icon} />
            {item.label}
          </button>
        ))}
      </div>

      <div className="pi-cr-body">
        <div className="pi-card pi-mock-form pi-cr-side">
          <p className="pi-step-title"><span>1</span>Visual</p>
          <span className="pi-mock-cap">Formato</span>
          {tab === "imagens" && options(formats.map((item) => ({ id: item.id, label: item.label })), format, setFormat, "Formato")}
          {tab === "carrossel" && options(carouselFormats.map((item) => ({ id: item.id, label: item.label })), carouselFormat, setCarouselFormat, "Formato do carrossel")}
          {tab === "video" && options(formats.map((item) => ({ id: item.id, label: item.label })), videoFormat, setVideoFormat, "Formato do vídeo", running)}
          <span className="pi-mock-cap">Cor</span>
          <div className="pi-mock-colors" role="radiogroup" aria-label="Cor">
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
          {tab === "imagens" && (
            <label className="pi-cr-check">
              <input type="checkbox" checked={mixColors} onChange={(event) => setMixColors(event.target.checked)} />
              Uma cor diferente em cada variação (bom para teste A/B)
            </label>
          )}
          <span className="pi-mock-cap">Mockup do produto</span>
          {options(mockChoices, mock, setMock, "Mockup", running)}

          <p className="pi-step-title"><span>2</span>Oferta <em className="pi-cr-opt">opcional</em></p>
          <div className="pi-form-grid">
            <label className="pi-label">
              Preço
              <input value={price} placeholder={copy.language === "es" ? "Ex.: 9.90 (em dólar)" : "Ex.: 19,90"} inputMode="decimal" onChange={(event) => setPrice(event.target.value)} />
            </label>
            <label className="pi-label">
              Seu @ ou marca
              <input value={brand} placeholder="@seuperfil" onChange={(event) => setBrand(event.target.value)} />
            </label>
          </div>

          {editingSpec && (
            <>
              <p className="pi-step-title"><span>3</span>Texto: {editingSpec.angle}</p>
              <div className="pi-cr-editprev">
                {editingImage >= 0 ? (
                  <CreativeCanvas spec={editingSpec} theme={themeFor(variationPalettes[editingImage])} format={format} scale={0.35} />
                ) : (
                  <CreativeCanvas spec={editingSpec} theme={mainTheme} format={carouselFormat} scale={0.35} />
                )}
              </div>
              <SpecEditor spec={editingSpec} onChange={(patch) => patchSpec(editingSpec.id, patch)} onReset={() => resetSpec(editingSpec.id)} />
              <button type="button" className="pi-btn-soft" onClick={() => setEditing("")}>
                Fechar edição
              </button>
            </>
          )}
        </div>

        <div className="pi-cr-main">
          {tab === "imagens" && (
            <>
              <div className="pi-cr-bar">
                <p>5 variações com ângulos diferentes. Clique em <b>Editar texto</b> para ajustar qualquer uma.</p>
                <button type="button" className="pi-btn-grad" disabled={!mainTheme || busy !== ""} onClick={() => downloadZip("tudo")}>
                  <Icon name="download" />
                  {busy === "tudo" ? "Preparando..." : "Baixar tudo (ZIP)"}
                </button>
              </div>
              <div className={`pi-cr-grid ${format}`}>
                {images.map((spec, index) => (
                  <article className={`pi-cr-card ${editing === spec.id ? "on" : ""}`} key={spec.id}>
                    <CreativeCanvas spec={spec} theme={themeFor(variationPalettes[index])} format={format} />
                    <div className="pi-cr-meta">
                      <span>Variação {String(index + 1).padStart(2, "0")}</span>
                      <strong>{spec.angle}</strong>
                    </div>
                    <div className="pi-cr-actions">
                      <button type="button" className="pi-btn-soft" onClick={() => downloadOne(spec, variationPalettes[index], format, `${fileBase}-${format}-${slug(spec.angle)}.png`)}>
                        <Icon name="download" />
                        PNG
                      </button>
                      <button type="button" className="pi-btn-soft" onClick={() => setEditing(editing === spec.id ? "" : spec.id)}>
                        Editar texto
                      </button>
                      {captions.length > 0 && (
                        <button type="button" className="pi-icon-btn" aria-label="Copiar legenda" title="Copiar legenda" onClick={() => onCopy("Legenda copiada", captions[index % captions.length])}>
                          <Icon name="copy" />
                        </button>
                      )}
                    </div>
                  </article>
                ))}
              </div>
              <p className="pi-mock-tip">
                O ZIP traz as 5 variações em feed, quadrado e story, o carrossel e as legendas. Suba todas no mesmo conjunto de anúncios e deixe o Meta mostrar a que vende mais.
              </p>
            </>
          )}

          {tab === "carrossel" && (
            <>
              <div className="pi-cr-bar">
                <p>6 lâminas em sequência: gancho, problema, virada, conteúdo, antes e depois, oferta. Poste na ordem.</p>
                <button type="button" className="pi-btn-grad" disabled={!mainTheme || busy !== ""} onClick={() => downloadZip("carrossel")}>
                  <Icon name="download" />
                  {busy === "carrossel" ? "Preparando..." : "Baixar carrossel (ZIP)"}
                </button>
              </div>
              <div className={`pi-cr-strip ${carouselFormat}`}>
                {slides.map((spec) => (
                  <article className={`pi-cr-card ${editing === spec.id ? "on" : ""}`} key={spec.id}>
                    <CreativeCanvas spec={spec} theme={mainTheme} format={carouselFormat} />
                    <div className="pi-cr-meta">
                      <span>Lâmina {spec.page?.[0]}</span>
                      <strong>{spec.angle}</strong>
                    </div>
                    <div className="pi-cr-actions">
                      <button type="button" className="pi-btn-soft" onClick={() => downloadOne(spec, palette, carouselFormat, `${fileBase}-carrossel-${spec.page?.[0]}.png`)}>
                        <Icon name="download" />
                        PNG
                      </button>
                      <button type="button" className="pi-btn-soft" onClick={() => setEditing(editing === spec.id ? "" : spec.id)}>
                        Editar texto
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}

          {tab === "video" && (
            <div className="pi-cr-video">
              <div className={`pi-cr-player ${videoFormat}`}>
                <canvas ref={videoRef} />
                {running && (
                  <div className="pi-cr-progress">
                    <i style={{ width: `${video.progress}%` }} />
                  </div>
                )}
              </div>
              <div className="pi-card pi-cr-vside">
                <p>As 6 lâminas do carrossel viram um vídeo com texto animado. Você não precisa gravar nem aparecer. Os textos editados no carrossel também valem aqui.</p>
                <span className="pi-mock-cap">Tempo de cada lâmina</span>
                {options(durations, duration, setDuration, "Tempo de cada lâmina", running)}
                <p className="pi-cr-dur">Duração total: {Math.round(videoSlides.length * duration + 1)} segundos</p>
                {running ? (
                  <button type="button" className="pi-btn-soft" onClick={() => (stopRef.current = true)}>
                    {video.state === "recording" ? `Cancelar (${video.progress}%)` : "Parar prévia"}
                  </button>
                ) : (
                  <>
                    <button type="button" className="pi-btn-grad" disabled={!mainTheme} onClick={() => playVideo(true)}>
                      <Icon name="download" />
                      Gerar e baixar vídeo
                    </button>
                    <button type="button" className="pi-btn-soft" disabled={!mainTheme} onClick={() => playVideo(false)}>
                      <Icon name="play" />
                      Assistir prévia
                    </button>
                  </>
                )}
                {video.state === "recording" && <p className="pi-cr-note">Gravando em tempo real. Deixe esta aba aberta até terminar.</p>}
                {video.note && <p className="pi-cr-note">{video.note}</p>}
                <p className="pi-mock-tip">O vídeo sai sem som. Ao publicar, escolha uma música em alta no próprio Instagram ou TikTok.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
