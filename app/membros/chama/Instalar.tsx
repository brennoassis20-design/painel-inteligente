"use client";

// Instruções para instalar o app na tela de início (reaproveita a detecção do Gênio Play em ../app.ts).
// No iPhone só o Safari instala e só o app instalado recebe notificação.
import { useEffect, useState } from "react";
import { canPromptInstall, inAppBrowser, iosNotSafari, isInstalled, onInstallChange, platform, promptInstall } from "../app";

export type ForcarInstalacao = "auto" | "ios" | "ios-chrome" | "android" | "instalado";

type Visao = "nada" | "ios" | "ios-outro" | "android" | "android-outro";

function detectar(forcar: ForcarInstalacao): Visao {
  if (forcar === "instalado") return "nada";
  if (forcar === "ios") return "ios";
  if (forcar === "ios-chrome") return "ios-outro";
  if (forcar === "android") return "android";
  if (isInstalled()) return "nada";
  const p = platform();
  if (p === "desktop") return "nada";
  if (p === "ios") return inAppBrowser() || iosNotSafari() ? "ios-outro" : "ios";
  return inAppBrowser() ? "android-outro" : "android";
}

/** Já está instalado (ou é computador)? Quem chama usa para esconder avisos. */
export function useVisaoInstalar(forcar: ForcarInstalacao = "auto") {
  const [visao, setVisao] = useState<Visao>("nada");
  const [, atualiza] = useState(0);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- lê o estado do navegador (instalado, sistema)
    setVisao(detectar(forcar));
    const sair = onInstallChange(() => atualiza((n) => n + 1));
    return () => void sair();
  }, [forcar]);
  return visao;
}

const Compartilhar = () => (
  <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3v12M8 7l4-4 4 4" /><path d="M6 11H5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1" /></svg>
);
const Mais = () => (
  <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="4" /><path d="M12 8v8M8 12h8" /></svg>
);
const Ok = () => (
  <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
);
const Menu = () => (
  <svg viewBox="0 0 24 24" width="30" height="30" fill="currentColor" aria-hidden="true"><circle cx="12" cy="5" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="12" cy="19" r="2" /></svg>
);

async function copiar(texto: string) {
  try {
    await navigator.clipboard.writeText(texto);
    return true;
  } catch {
    // http em IP de rede não tem clipboard: usa o jeito antigo
    const t = document.createElement("textarea");
    t.value = texto;
    document.body.appendChild(t);
    t.select();
    const ok = document.execCommand("copy");
    t.remove();
    return ok;
  }
}

export function InstalarApp({ forcar = "auto", motivo, onFechar }: { forcar?: ForcarInstalacao; motivo?: string; onFechar?: () => void }) {
  const visao = useVisaoInstalar(forcar);
  const [msg, setMsg] = useState("");
  if (visao === "nada") return null;

  const copiarLink = async () => setMsg((await copiar(window.location.origin + window.location.pathname)) ? "Link copiado. Cole no Safari." : "Não deu para copiar. Segure no endereço e copie.");

  return (
    <section className="ch-card ch-instalar" aria-label="Instalar o app">
      <span className="ch-etiqueta">Instale o app</span>
      <h2>Coloque a chama na tela do celular</h2>
      <p className="ch-suave">{motivo ?? "Assim ela abre com um toque e o lembrete diário funciona."}</p>

      {visao === "ios-outro" && (
        <div className="ch-aviso-safari">
          <b>Abra este link no Safari</b>
          <p>No iPhone, só o Safari instala o app. Este navegador (Chrome, Instagram, WhatsApp…) não consegue.</p>
          <button type="button" className="ch-btn ch-btn-claro" onClick={() => void copiarLink()}>Copiar o link</button>
          {msg && <small role="status">{msg}</small>}
        </div>
      )}

      {visao === "ios" && (
        <ol className="ch-passos">
          <li><span className="ico"><Compartilhar /></span><span><b>1. Toque em Compartilhar</b><small>o botão com a seta para cima, na barra de baixo do Safari</small></span></li>
          <li><span className="ico"><Mais /></span><span><b>2. “Adicionar à Tela de Início”</b><small>role a lista para baixo até achar</small></span></li>
          <li><span className="ico"><Ok /></span><span><b>3. Toque em “Adicionar”</b><small>pronto: a chama aparece na sua tela, abra por lá</small></span></li>
        </ol>
      )}

      {visao === "android" && (
        <>
          {canPromptInstall() ? (
            <button type="button" className="ch-btn ch-btn-grande" onClick={() => void promptInstall()}>Instalar app</button>
          ) : (
            <p className="ch-suave">Se o botão de instalar não aparecer, faça assim:</p>
          )}
          <ol className="ch-passos">
            <li><span className="ico"><Menu /></span><span><b>Toque no menu ⋮</b><small>no canto de cima do Chrome</small></span></li>
            <li><span className="ico"><Mais /></span><span><b>“Instalar app”</b><small>ou “Adicionar à tela inicial”</small></span></li>
          </ol>
        </>
      )}

      {visao === "android-outro" && (
        <div className="ch-aviso-safari">
          <b>Abra este link no Chrome</b>
          <p>Este navegador não instala o app. Copie o link e cole no Chrome.</p>
          <button type="button" className="ch-btn ch-btn-claro" onClick={() => void copiarLink()}>Copiar o link</button>
          {msg && <small role="status">{msg}</small>}
        </div>
      )}
      {onFechar && <button type="button" className="ch-link" onClick={onFechar}>Agora não</button>}
    </section>
  );
}
