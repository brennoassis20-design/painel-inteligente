"use client";

import { useEffect, useState } from "react";
import { Icon } from "../icons";

// Lâmpada de Ouro: edição premium do produto (IA forte + fotos reais por IA + diagramação de designer)
// e fotos para os criativos. Roda com a chave OpenRouter do próprio aluno, guardada só neste navegador.
const KEY_STORAGE = "pi-openrouter-key";
const BATCH = 3;

type Photo = { id: string; prompt: string; aspect: string };
type Step = "idle" | "writing" | "photos" | "pdf" | "done" | "error";

export function readStudentKey() {
  return typeof window === "undefined" ? "" : window.localStorage.getItem(KEY_STORAGE) || "";
}

export function GoldLamp({
  token,
  projects,
  currentProjectId,
  onPhotos,
}: {
  token: string;
  projects: { id: string; title: string; premium?: boolean }[];
  currentProjectId: string;
  onPhotos: (projectId: string, urls: string[]) => void;
}) {
  const [key, setKey] = useState("");
  const [draft, setDraft] = useState("");
  const [keyNote, setKeyNote] = useState("");
  const [testing, setTesting] = useState(false);
  const [projectId, setProjectId] = useState(currentProjectId);
  const [step, setStep] = useState<Step>("idle");
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [message, setMessage] = useState("");
  const [pdfUrl, setPdfUrl] = useState("");
  const [thumbs, setThumbs] = useState<string[]>([]);

  useEffect(() => {
    const timer = window.setTimeout(() => setKey(readStudentKey()), 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (!projectId && currentProjectId) setProjectId(currentProjectId);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [currentProjectId, projectId]);

  const project = projects.find((item) => item.id === projectId);
  const busy = step === "writing" || step === "photos" || step === "pdf";

  const headers = (withKey = true): HeadersInit => ({
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    ...(withKey && key ? { "x-openrouter-key": key } : {}),
  });

  async function testKey(value: string) {
    setTesting(true);
    setKeyNote("");
    try {
      const response = await fetch("/api/premium/key", { method: "POST", headers: { Authorization: `Bearer ${token}`, "x-openrouter-key": value.trim() } });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Chave não aceita.");
      window.localStorage.setItem(KEY_STORAGE, value.trim());
      setKey(value.trim());
      setDraft("");
      setKeyNote(typeof data.remaining === "number" ? `Chave ok. Crédito disponível: US$ ${data.remaining.toFixed(2)}` : "Chave ok.");
    } catch (error) {
      setKeyNote(error instanceof Error ? error.message : "Chave não aceita.");
    } finally {
      setTesting(false);
    }
  }

  function removeKey() {
    window.localStorage.removeItem(KEY_STORAGE);
    setKey("");
    setKeyNote("Chave removida deste navegador.");
  }

  async function post(path: string, body: unknown, withKey = true) {
    const response = await fetch(path, { method: "POST", headers: headers(withKey), body: JSON.stringify(body) });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || "Não deu certo. Tente de novo.");
    }
    return response;
  }

  async function run(redo = false) {
    if (!projectId) return;
    setMessage("");
    setPdfUrl("");
    setThumbs([]);
    try {
      setStep("writing");
      const { photos } = (await (await post("/api/premium/edition", { projectId, redo })).json()) as { photos: Photo[] };

      setStep("photos");
      setProgress({ done: 0, total: photos.length });
      const urls: Record<string, string> = {};
      for (let i = 0; i < photos.length; i += BATCH) {
        await Promise.all(
          photos.slice(i, i + BATCH).map(async (photo) => {
            // Uma foto que falhar não derruba a edição: a página sai sem ela.
            try {
              const blob = await (await post("/api/premium/image", { projectId, photoId: photo.id })).blob();
              urls[photo.id] = URL.createObjectURL(blob);
            } catch (error) {
              if (/chave|crédito|credito/i.test(error instanceof Error ? error.message : "")) throw error;
            }
            setProgress((value) => ({ ...value, done: value.done + 1 }));
          }),
        );
      }
      const creativeUrls = photos.filter((photo) => photo.id.startsWith("criativo") || photo.id === "capa").map((photo) => urls[photo.id]).filter(Boolean);
      setThumbs(Object.values(urls).slice(0, 8));
      onPhotos(projectId, creativeUrls);

      setStep("pdf");
      const pdf = await (await post("/api/premium/pdf", { projectId }, false)).blob();
      const url = URL.createObjectURL(pdf);
      setPdfUrl(url);
      setStep("done");
      const link = document.createElement("a");
      link.href = url;
      link.download = `${(project?.title || "produto").replace(/[\\/:*?"<>|]+/g, "")} - edição de ouro.pdf`;
      link.click();
    } catch (error) {
      setStep("error");
      setMessage(error instanceof Error ? error.message : "Não deu certo. Tente de novo.");
    }
  }

  const stepLabel: Record<Step, string> = {
    idle: "",
    writing: "Escrevendo a edição completa (1 a 3 minutos)…",
    photos: `Gerando as fotos (${progress.done} de ${progress.total})…`,
    pdf: "Diagramando o PDF…",
    done: "Pronto! O PDF foi baixado.",
    error: message,
  };

  return (
    <div className="gold">
      <section className="gold-card">
        <div className="gold-head">
          <span className="gold-num">1</span>
          <div>
            <h3>Sua chave da OpenRouter</h3>
            <p>A Lâmpada de Ouro usa a IA mais forte e gera fotos de verdade. Esse custo é seu, direto na OpenRouter: cerca de US$ 0,50 por produto.</p>
          </div>
        </div>
        {key ? (
          <div className="gold-key-ok">
            <Icon name="check" />
            <span>
              Chave salva neste navegador <code>{key.slice(0, 9)}…{key.slice(-4)}</code>
            </span>
            <button type="button" onClick={() => testKey(key)} disabled={testing}>
              {testing ? "Testando…" : "Ver crédito"}
            </button>
            <button type="button" onClick={removeKey}>
              Remover
            </button>
          </div>
        ) : (
          <form
            className="gold-key"
            onSubmit={(event) => {
              event.preventDefault();
              if (draft.trim()) testKey(draft);
            }}
          >
            <Icon name="key" />
            <input type="password" value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Cole aqui: sk-or-v1-…" autoComplete="off" aria-label="Chave da OpenRouter" />
            <button type="submit" disabled={testing || !draft.trim()}>
              {testing ? "Testando…" : "Salvar e testar"}
            </button>
          </form>
        )}
        {keyNote && <p className="gold-note">{keyNote}</p>}
        <p className="gold-help">
          Não tem? <a href="https://openrouter.ai/settings/credits" target="_blank" rel="noreferrer">Coloque crédito</a> (US$ 5 rendem cerca de 10 produtos) e{" "}
          <a href="https://openrouter.ai/settings/keys" target="_blank" rel="noreferrer">crie a chave</a>. A chave fica só neste navegador: o painel não guarda.
        </p>
      </section>

      <section className={`gold-card ${key ? "" : "is-off"}`}>
        <div className="gold-head">
          <span className="gold-num">2</span>
          <div>
            <h3>Escolha o produto</h3>
            <p>A edição de ouro reescreve o produto entregando tudo o que o título promete, com fotos, cartões, listas para marcar e tabelas. Não gasta pedido do mês.</p>
          </div>
        </div>
        <select value={projectId} onChange={(event) => setProjectId(event.target.value)} disabled={busy} aria-label="Produto">
          {!projects.length && <option value="">Crie um produto primeiro em Fazer o pedido</option>}
          {projects.map((item) => (
            <option key={item.id} value={item.id}>
              {item.title}
              {item.premium ? " · já tem edição de ouro" : ""}
            </option>
          ))}
        </select>
        <div className="gold-actions">
          <button type="button" className="gold-go" onClick={() => run(false)} disabled={!key || !projectId || busy}>
            <Icon name="star" />
            {project?.premium ? "Baixar edição de ouro" : "Criar edição de ouro"}
          </button>
          {project?.premium && (
            <button type="button" className="gold-redo" onClick={() => run(true)} disabled={!key || busy}>
              Refazer do zero (cobra de novo)
            </button>
          )}
        </div>
        {step !== "idle" && (
          <div className={`gold-status s-${step}`} aria-live="polite">
            {busy && <span className="gold-spin" />}
            {stepLabel[step]}
            {step === "photos" && progress.total > 0 && (
              <span className="gold-bar">
                <i style={{ width: `${(progress.done / progress.total) * 100}%` }} />
              </span>
            )}
          </div>
        )}
        {pdfUrl && (
          <a className="gold-again" href={pdfUrl} download={`${project?.title || "produto"} - edição de ouro.pdf`}>
            <Icon name="download" /> Baixar o PDF de novo
          </a>
        )}
        {thumbs.length > 0 && (
          <div className="gold-thumbs">
            {thumbs.map((url) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={url} src={url} alt="" />
            ))}
          </div>
        )}
        {step === "done" && <p className="gold-note">As fotos também foram para os Criativos prontos: lá, ligue “Fotos da Lâmpada de Ouro”.</p>}
      </section>
    </div>
  );
}
