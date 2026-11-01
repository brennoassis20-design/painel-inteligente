"use client";

import { useEffect, useMemo, useState } from "react";
import { Icon } from "../icons";

// Sino de Novidades: melhorias publicadas, nichos atualizados e o que está em construção.
// O "visto" fica no navegador por e-mail (sem tabela a mais). Novidade nova mostra um aviso uma vez.
export type PanelUpdate = { id: string; kind: "melhoria" | "nichos" | "em_construcao"; title: string; body: string; view: string | null; created_at: string };

const kindLabel: Record<PanelUpdate["kind"], string> = { melhoria: "Melhoria", nichos: "Nichos", em_construcao: "Em construção" };
const seenKey = (email: string) => `pi-updates-seen:${email}`;

function when(iso: string) {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return "hoje";
  if (days === 1) return "ontem";
  if (days < 30) return `há ${days} dias`;
  return new Date(iso).toLocaleDateString("pt-BR");
}

export function PanelUpdates({ updates, email, onGo }: { updates: PanelUpdate[]; email: string; onGo: (view: string) => void }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"novidades" | "construcao">("novidades");
  const [seenAt, setSeenAt] = useState<string | null>(null);
  const [popup, setPopup] = useState(false);

  const released = useMemo(() => updates.filter((item) => item.kind !== "em_construcao"), [updates]);
  const building = useMemo(() => updates.filter((item) => item.kind === "em_construcao"), [updates]);
  const unseen = useMemo(() => (seenAt === null ? [] : released.filter((item) => item.created_at > seenAt)), [released, seenAt]);

  useEffect(() => {
    if (!email) return;
    const stored = window.localStorage.getItem(seenKey(email));
    // Primeira visita: só a última semana conta como novidade (não acende 40 de uma vez).
    const start = stored || new Date(Date.now() - 7 * 86_400_000).toISOString();
    const timer = window.setTimeout(() => {
      setSeenAt(start);
      if (released.some((item) => item.created_at > start)) setPopup(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [email, released]);

  function markSeen() {
    const now = new Date().toISOString();
    window.localStorage.setItem(seenKey(email), now);
    setSeenAt(now);
    setPopup(false);
  }

  function openPanel() {
    setOpen(true);
    setTab("novidades");
    markSeen();
  }

  function go(item: PanelUpdate) {
    if (!item.view) return;
    setOpen(false);
    markSeen();
    onGo(item.view);
  }

  const list = tab === "novidades" ? released : building;

  return (
    <>
      <button type="button" className="pi-pill pi-bell" onClick={openPanel} aria-label={`Novidades${unseen.length ? ` (${unseen.length} novas)` : ""}`} title="Novidades">
        <Icon name="bell" />
        {unseen.length > 0 && <span className="pi-bell-count">{unseen.length > 9 ? "9+" : unseen.length}</span>}
      </button>

      {popup && !open && unseen[0] && (
        <div className="pi-upd-pop" role="status">
          <span className="pi-upd-pop-ic">
            <Icon name="bell" />
          </span>
          <div>
            <b>{unseen.length > 1 ? `${unseen.length} novidades no painel` : "Novidade no painel"}</b>
            <p>{unseen[0].title}</p>
          </div>
          <button type="button" className="pi-upd-pop-go" onClick={openPanel}>
            Ver
          </button>
          <button type="button" className="pi-upd-pop-x" onClick={markSeen} aria-label="Fechar">
            <Icon name="close" />
          </button>
        </div>
      )}

      {open && (
        <>
          <button type="button" className="pi-scrim pi-upd-scrim" aria-label="Fechar novidades" onClick={() => setOpen(false)} />
          <aside className="pi-upd" aria-label="Novidades do painel">
            <header>
              <h2>Novidades</h2>
              <button type="button" onClick={() => setOpen(false)} aria-label="Fechar">
                <Icon name="close" />
              </button>
            </header>
            <div className="pi-upd-tabs">
              <button type="button" className={tab === "novidades" ? "on" : ""} onClick={() => setTab("novidades")}>
                Melhorias e nichos
              </button>
              <button type="button" className={tab === "construcao" ? "on" : ""} onClick={() => setTab("construcao")}>
                Em construção {building.length > 0 && <span>{building.length}</span>}
              </button>
            </div>
            {tab === "construcao" && <p className="pi-upd-note">O que estamos fazendo agora no painel. Quando ficar pronto, aparece em Melhorias e o sino avisa.</p>}
            <ul>
              {list.map((item) => (
                <li key={item.id} className={`k-${item.kind} ${seenAt && item.created_at > seenAt ? "new" : ""}`}>
                  <div className="pi-upd-meta">
                    <span className="pi-upd-tag">{kindLabel[item.kind]}</span>
                    <span>{when(item.created_at)}</span>
                  </div>
                  <h3>{item.title}</h3>
                  {item.body && <p>{item.body}</p>}
                  {item.view && item.kind !== "em_construcao" && (
                    <button type="button" onClick={() => go(item)}>
                      Abrir <Icon name="arrow" />
                    </button>
                  )}
                </li>
              ))}
              {!list.length && <li className="pi-upd-empty">{tab === "novidades" ? "Nenhuma novidade ainda." : "Nada em construção agora."}</li>}
            </ul>
          </aside>
        </>
      )}
    </>
  );
}
