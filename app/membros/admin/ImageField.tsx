"use client";

// Campo de imagem do admin: mostra o tamanho certo, confere a proporção antes de enviar e guarda no Storage.
import { useRef, useState } from "react";
import { api, readSession } from "../session";

export type ImageKind = "logo" | "inicio" | "inicio-celular" | "capa" | "banner" | "modulo";

type Spec = { w: number; h: number; name: string; tip: string; minRatio?: number; maxRatio?: number };

export const IMAGE_SPECS: Record<ImageKind, Spec> = {
  logo: { w: 600, h: 150, name: "horizontal", tip: "PNG com fundo transparente. Aparece pequeno no topo (28 px de altura).", minRatio: 2, maxRatio: 6 },
  inicio: { w: 1920, h: 1080, name: "16:9 (computador)", tip: "Deixe textos e rostos no centro. As bordas podem ser cortadas em telas diferentes." },
  "inicio-celular": { w: 1080, h: 1350, name: "4:5 (celular)", tip: "É a primeira coisa que o aluno vê no celular. Nada importante nos 10% de cima e de baixo." },
  capa: { w: 800, h: 1200, name: "vertical 2:3", tip: "O nome do produto pode ir escrito na capa. Deixe a parte de baixo mais limpa: ali aparece o preço." },
  banner: { w: 1920, h: 1080, name: "16:9", tip: "Usado no destaque da tela inicial e no topo do cadeado. Centro livre de cortes." },
  modulo: { w: 1280, h: 720, name: "16:9", tip: "Aparece pequena acima do nome do módulo: use pouco texto e letra grande." },
};

function readSize(file: File) {
  return new Promise<{ w: number; h: number }>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve({ w: img.naturalWidth, h: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      reject(new Error("Não consegui abrir essa imagem."));
      URL.revokeObjectURL(url);
    };
    img.src = url;
  });
}

async function upload(file: File, kind: ImageKind) {
  const send = () => {
    const body = new FormData();
    body.append("arquivo", file);
    body.append("tipo", kind);
    return fetch("/api/membros/admin/upload", { method: "POST", headers: { Authorization: `Bearer ${readSession()?.accessToken || ""}` }, body });
  };
  let response = await send();
  if (response.status === 401) {
    // Renova a sessão (a função api já faz isso) e tenta de novo.
    await api("/api/membros/inicio").catch(() => undefined);
    response = await send();
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Não foi possível enviar a imagem.");
  return String(data.url);
}

export default function ImageField({ label, kind, value, onChange }: { label: string; kind: ImageKind; value: string; onChange: (url: string) => void }) {
  const spec = IMAGE_SPECS[kind];
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [warn, setWarn] = useState("");
  const [showLink, setShowLink] = useState(false);
  const ratio = spec.w / spec.h;

  async function pick(file: File | undefined) {
    if (!file) return;
    setError("");
    setWarn("");
    try {
      const size = await readSize(file);
      const real = size.w / size.h;
      const ok = spec.minRatio ? real >= spec.minRatio && real <= (spec.maxRatio || 99) : Math.abs(real - ratio) / ratio <= 0.04;
      if (!ok) {
        throw new Error(
          `Essa imagem tem ${size.w}×${size.h} px e vai ficar cortada. Ela precisa ser ${spec.name}: ${spec.w}×${spec.h} px. No Canva: Criar design → Tamanho personalizado → ${spec.w} × ${spec.h}.`,
        );
      }
      if (size.w < spec.w * 0.7) setWarn(`Ela tem só ${size.w}×${size.h} px e pode ficar borrada. O ideal é ${spec.w}×${spec.h} px.`);
      setBusy(true);
      onChange(await upload(file, kind));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível enviar.");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  const previewRatio = spec.minRatio ? "4 / 1" : `${spec.w} / ${spec.h}`;

  return (
    <div className="gp-field gp-image-field">
      <span>{label}</span>
      <div className="gp-image-row">
        <div className={`gp-image-preview${kind === "logo" ? " is-logo" : ""}`} style={{ aspectRatio: previewRatio, backgroundImage: value ? `url("${value}")` : undefined }}>
          {!value && <small>{spec.w}×{spec.h}</small>}
        </div>
        <div className="gp-image-side">
          <small className="gp-image-spec">
            <b>
              {spec.w} × {spec.h} px
            </b>{" "}
            · {spec.name} · JPG, PNG ou WEBP até 5 MB
          </small>
          <small>{spec.tip}</small>
          <div className="gp-btns">
            <button type="button" className="gp-btn gp-btn-ghost gp-btn-sm" disabled={busy} onClick={() => input.current?.click()}>
              {busy ? "Enviando…" : value ? "Trocar imagem" : "Enviar imagem"}
            </button>
            {value && (
              <button type="button" className="gp-btn gp-btn-ghost gp-btn-sm" onClick={() => onChange("")}>
                Remover
              </button>
            )}
            <button type="button" className="gp-link gp-small" onClick={() => setShowLink(!showLink)}>
              {showLink ? "Esconder link" : "Usar um link"}
            </button>
          </div>
          {showLink && <input aria-label={`${label}: link da imagem`} value={value} onChange={(e) => onChange(e.target.value)} placeholder="https://..." />}
          {error && <small className="gp-error">{error}</small>}
          {warn && <small className="gp-warn">{warn}</small>}
        </div>
      </div>
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => void pick(e.target.files?.[0])} />
    </div>
  );
}
