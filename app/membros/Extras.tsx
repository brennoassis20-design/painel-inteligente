"use client";

// Instrução para instalar o app no celular, sino de avisos e convite para ligar os avisos.
import { tagPlainLink } from "@/lib/membros-utm";
import { useEffect, useRef, useState } from "react";
import { canPromptInstall, enablePush, iosNotSafari, inAppBrowser, isInstalled, onInstallChange, platform, promptInstall, pushPermission, pushSupported, type Platform } from "./app";
import { api } from "./session";

const DISMISS_KEY = "gp_install_dismissed";
const PUSH_KEY = "gp_push_dismissed";
const DAY = 24 * 60 * 60 * 1000;

function dismissedRecently(key: string, days: number) {
  try {
    return Date.now() - Number(localStorage.getItem(key) || 0) < days * DAY;
  } catch {
    return false;
  }
}

function remember(key: string) {
  try {
    localStorage.setItem(key, String(Date.now()));
  } catch {
    /* sem armazenamento */
  }
}

function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" className="gp-ico">
      <path fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" d="M12 3v12M7.5 7.5 12 3l4.5 4.5M6 11H5v10h14V11h-1" />
    </svg>
  );
}

function PlusBox() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" className="gp-ico">
      <rect x="4" y="4" width="16" height="16" rx="4" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 8.5v7M8.5 12h7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function Dots() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" className="gp-ico">
      <circle cx="12" cy="5" r="1.8" fill="currentColor" />
      <circle cx="12" cy="12" r="1.8" fill="currentColor" />
      <circle cx="12" cy="19" r="1.8" fill="currentColor" />
    </svg>
  );
}

export function useMobileApp() {
  const [info, setInfo] = useState<{ platform: Platform; installed: boolean; prompt: boolean } | null>(null);
  useEffect(() => {
    const read = () => setInfo({ platform: platform(), installed: isInstalled(), prompt: canPromptInstall() });
    read();
    const off = onInstallChange(read);
    return () => {
      off();
    };
  }, []);
  return info;
}

// Aparece sozinho quando a pessoa abre pelo celular e ainda não instalou. "Agora não" esconde por 3 dias.
export function InstallGuide({ forceOpen, onClose }: { forceOpen?: boolean; onClose?: () => void }) {
  const app = useMobileApp();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!app) return;
    if (forceOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- lê o estado do navegador (instalado, permissão)
      setOpen(true);
      return;
    }
    if (app.installed || app.platform === "desktop" || dismissedRecently(DISMISS_KEY, 3)) return;
    const timer = window.setTimeout(() => setOpen(true), 1800);
    return () => window.clearTimeout(timer);
  }, [app, forceOpen]);

  if (!open || !app) return null;

  const close = () => {
    remember(DISMISS_KEY);
    setOpen(false);
    onClose?.();
  };

  const social = inAppBrowser();
  const ios = app.platform === "ios";

  return (
    <div className="gp-modal gp-modal-bottom" role="dialog" aria-modal="true" aria-labelledby="gp-install-title">
      <button type="button" className="gp-backdrop" aria-label="Fechar" onClick={close} />
      <div className="gp-sheet gp-install">
        <div className="gp-install-head">
          {/* eslint-disable-next-line @next/next/no-img-element -- ícone do app */}
          <img src="/membros/app/icone-192.png" alt="" width="56" height="56" />
          <div>
            <h2 id="gp-install-title">{app.installed ? "O app já está no seu celular" : "Tenha o Gênio Play como app"}</h2>
            <p className="gp-muted">Abre direto na sua área, em tela cheia, e avisa quando chegar conteúdo novo.</p>
          </div>
        </div>

        {app.installed ? (
          <p className="gp-muted">Você já está usando o app. É só abrir pelo ícone dourado na tela do celular.</p>
        ) : social ? (
          <ol className="gp-install-steps">
            <li>
              Toque em <b>⋯</b> ou <Dots /> no canto da tela.
            </li>
            <li>
              Escolha <b>{ios ? "Abrir no Safari" : "Abrir no navegador"}</b>.
            </li>
            <li>Lá, este aviso aparece de novo com o passo final.</li>
          </ol>
        ) : ios ? (
          <ol className="gp-install-steps">
            <li>
              Toque em <b>Compartilhar</b> <ShareIcon /> {iosNotSafari() ? "(no topo, ao lado do endereço)" : "(na barra de baixo do Safari)"}.
            </li>
            <li>
              Role e toque em <b>Adicionar à Tela de Início</b> <PlusBox />.
            </li>
            <li>
              Toque em <b>Adicionar</b>. Pronto: abra pelo ícone dourado.
            </li>
          </ol>
        ) : app.prompt ? (
          <button
            type="button"
            className="gp-btn gp-btn-gold"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              const ok = await promptInstall().catch(() => false);
              setBusy(false);
              if (ok) close();
            }}
          >
            {busy ? "Aguarde…" : "Instalar o app agora"}
          </button>
        ) : (
          <ol className="gp-install-steps">
            <li>
              Toque no menu <Dots /> no canto de cima do Chrome.
            </li>
            <li>
              Toque em <b>Instalar app</b> ou <b>Adicionar à tela inicial</b>.
            </li>
            <li>
              Confirme em <b>Instalar</b>. Pronto: abra pelo ícone dourado.
            </li>
          </ol>
        )}

        <button type="button" className="gp-link" onClick={close}>
          {app.installed ? "Fechar" : "Agora não"}
        </button>
      </div>
    </div>
  );
}

export type NoticeItem = {
  id: string;
  title: string;
  body: string | null;
  product_id: string | null;
  kind?: string;
  url?: string | null;
  button_label?: string | null;
  starts_at?: string | null;
  created_at: string;
};

const TZ = "America/Sao_Paulo";

// "Hoje, às 20h" / "Amanhã, às 19h30" / "Sexta-feira, 21/11, às 20h" (horário de Brasília).
export function liveWhen(iso: string) {
  const date = new Date(iso);
  const hour = date.toLocaleTimeString("pt-BR", { timeZone: TZ, hour: "2-digit", minute: "2-digit" }).replace(":00", "h").replace(":", "h");
  const label = date.toLocaleDateString("pt-BR", { timeZone: TZ });
  if (label === new Date().toLocaleDateString("pt-BR", { timeZone: TZ })) return `Hoje, às ${hour}`;
  if (label === new Date(Date.now() + 86400000).toLocaleDateString("pt-BR", { timeZone: TZ })) return `Amanhã, às ${hour}`;
  const day = date.toLocaleDateString("pt-BR", { timeZone: TZ, weekday: "long", day: "2-digit", month: "2-digit" });
  return `${day.charAt(0).toUpperCase()}${day.slice(1)}, às ${hour}`;
}

// Faixa no topo da área enquanto a live não acaba (até 3 h depois do início).
export function LiveBar({ live }: { live: NoticeItem }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, []);
  if (!live.url || !live.starts_at) return null;
  const start = new Date(live.starts_at).getTime();
  if (now > start + 3 * 3600 * 1000) return null;
  const onAir = now >= start - 5 * 60 * 1000;
  return (
    <a className={`gp-live${onAir ? " is-on" : ""}`} href={tagPlainLink(live.url, { medium: "link", content: "live" })} target="_blank" rel="noreferrer">
      <span className="gp-live-tag">{onAir ? "AO VIVO AGORA" : "AO VIVO"}</span>
      <span className="gp-live-text">
        <b>{live.title}</b>
        <small>{onAir ? "Já começou. Toque para entrar." : liveWhen(live.starts_at)}</small>
      </span>
      <span className="gp-live-go">{live.button_label || "Entrar na live"} →</span>
    </a>
  );
}

function ago(iso: string) {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 60) return `há ${Math.max(1, minutes)} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `há ${hours} h`;
  const days = Math.round(hours / 24);
  return days === 1 ? "ontem" : `há ${days} dias`;
}

export function Bell({
  items,
  unread,
  onOpenItem,
  onSeen,
  onInstall,
}: {
  items: NoticeItem[];
  unread: number;
  onOpenItem: (item: NoticeItem) => void;
  onSeen: () => void;
  onInstall: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [top, setTop] = useState(64);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const away = (event: MouseEvent) => {
      if (box.current && !box.current.contains(event.target as Node)) setOpen(false);
    };
    const esc = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", away);
    window.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", away);
      window.removeEventListener("keydown", esc);
    };
  }, [open]);

  return (
    <div className="gp-bell-wrap" ref={box}>
      <button
        type="button"
        className="gp-bell"
        aria-label={unread ? `Avisos: ${unread} novos` : "Avisos"}
        aria-expanded={open}
        onClick={() => {
          const next = !open;
          // No celular a caixa fica fixa logo abaixo do sino (mesmo com o topo em 2 linhas).
          if (next && box.current) setTop(Math.round(box.current.getBoundingClientRect().bottom + 8));
          setOpen(next);
          if (next && unread) {
            void api("/api/membros/avisos", { body: { acao: "lidas" } }).catch(() => undefined);
            onSeen();
          }
        }}
      >
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
          <path fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15L6 16zM10 20.5a2 2 0 0 0 4 0" />
        </svg>
        {unread > 0 && <span className="gp-bell-dot">{unread > 9 ? "9+" : unread}</span>}
      </button>
      {open && (
        <div className="gp-bell-panel" role="dialog" aria-label="Avisos" style={{ "--gp-bell-top": `${top}px` } as React.CSSProperties}>
          <div className="gp-bell-head">
            <b>Avisos</b>
            <PushToggle onInstall={onInstall} compact />
          </div>
          {items.length === 0 ? (
            <p className="gp-muted gp-bell-empty">Nenhum aviso ainda. Quando sair conteúdo novo, ele aparece aqui.</p>
          ) : (
            <ul>
              {items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      onOpenItem(item);
                    }}
                  >
                    <b>
                      {item.kind === "ao_vivo" && <em className="gp-bell-live">AO VIVO</em>}
                      {item.title}
                    </b>
                    {item.kind === "ao_vivo" && item.starts_at && <span className="gp-bell-when">{liveWhen(item.starts_at)}</span>}
                    {item.body && <span>{item.body}</span>}
                    <small>{ago(item.created_at)}</small>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

// Botão "Ativar avisos no celular". No iPhone só funciona com o app instalado.
export function PushToggle({ onInstall, compact, onDone }: { onInstall: () => void; compact?: boolean; onDone?: () => void }) {
  const [state, setState] = useState<"loading" | "off" | "on" | "blocked" | "needs-install" | "unsupported">("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    const perm = pushPermission();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- lê a permissão de aviso do navegador
    if (platform() === "ios" && !isInstalled()) setState("needs-install");
    else if (perm === "unsupported") setState("unsupported");
    else setState(perm === "granted" ? "on" : perm === "denied" ? "blocked" : "off");
  }, []);

  if (state === "loading" || state === "unsupported") return null;
  if (state === "on") return compact ? <span className="gp-pill on">Avisos ligados</span> : null;
  if (state === "blocked") return <span className="gp-fine">Avisos bloqueados no navegador</span>;
  if (state === "needs-install") {
    return (
      <button type="button" className={compact ? "gp-link gp-small" : "gp-btn gp-btn-gold"} onClick={onInstall}>
        Instalar o app para receber avisos
      </button>
    );
  }
  return (
    <span className="gp-push-wrap">
      <button
        type="button"
        className={compact ? "gp-link gp-small" : "gp-btn gp-btn-gold"}
        onClick={async () => {
          setError("");
          try {
            const { vapid } = await api<{ vapid: string }>("/api/membros/avisos");
            await enablePush(vapid);
            setState("on");
            onDone?.();
          } catch (err) {
            setError(err instanceof Error ? err.message : "Não deu para ligar os avisos.");
            if (pushPermission() === "denied") setState("blocked");
          }
        }}
      >
        Ativar avisos no celular
      </button>
      {error && <span className="gp-error gp-small">{error}</span>}
    </span>
  );
}

// Convite na tela inicial para ligar os avisos (só no celular, uma vez por semana se dispensar).
export function PushInvite({ onInstall }: { onInstall: () => void }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    // No iPhone sem o app instalado não há aviso: quem cuida é a instrução de instalar.
    if (platform() === "desktop" || !pushSupported() || (platform() === "ios" && !isInstalled())) return;
    if (pushPermission() !== "default" || dismissedRecently(PUSH_KEY, 7)) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- lê a permissão de aviso do navegador
    setShow(true);
  }, []);
  if (!show) return null;
  return (
    <div className="gp-invite">
      <div>
        <b>Seja avisado quando sair conteúdo novo</b>
        <span className="gp-muted">Aula nova, material novo e liberações chegam direto no seu celular.</span>
      </div>
      <div className="gp-btns">
        <PushToggle onInstall={onInstall} onDone={() => setShow(false)} />
        <button
          type="button"
          className="gp-link"
          onClick={() => {
            remember(PUSH_KEY);
            setShow(false);
          }}
        >
          Agora não
        </button>
      </div>
    </div>
  );
}
