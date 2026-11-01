"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "../icons";

// Sino de Novidades: melhorias publicadas, nichos atualizados, o que está em construção e "Sugerir melhoria".
// O "visto" fica no navegador por e-mail (sem tabela a mais). Novidade nova mostra um aviso uma vez.
export type PanelUpdate = { id: string; kind: "melhoria" | "nichos" | "em_construcao"; title: string; body: string; view: string | null; created_at: string };
type Suggestion = { id: string; text: string; status: "recebida" | "aprovada" | "feita" | "avaliada"; note: string; created_at: string };
type Tab = "novidades" | "construcao" | "sugerir";

const kindLabel: Record<PanelUpdate["kind"], string> = { melhoria: "Melhoria", nichos: "Nichos", em_construcao: "Em construção" };
const suggestionLabel: Record<Suggestion["status"], string> = { recebida: "Recebida", aprovada: "Vamos fazer", feita: "Feita", avaliada: "Avaliada" };
const seenKey = (email: string) => `pi-updates-seen:${email}`;

// Atalho do menu: abre a gaveta direto na aba de sugestão.
export const OPEN_SUGGEST_EVENT = "pi-open-suggest";

function when(iso: string) {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return "hoje";
  if (days === 1) return "ontem";
  if (days < 30) return `há ${days} dias`;
  return new Date(iso).toLocaleDateString("pt-BR");
}

export function PanelUpdates({ updates, email, token, onGo }: { updates: PanelUpdate[]; email: string; token: string; onGo: (view: string) => void }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("novidades");
  const [seenAt, setSeenAt] = useState<string | null>(null);
  const [popup, setPopup] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [sendNote, setSendNote] = useState({ ok: true, text: "" });

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

  async function loadSuggestions() {
    try {
      const response = await fetch("/api/suggestions", { headers: { Authorization: `Bearer ${token}` } });
      const data = await response.json();
      if (response.ok) {
        setSuggestions(data.suggestions || []);
        setRemaining(data.remaining);
      }
    } catch {
      // Sem rede: a aba mostra só o formulário.
    }
  }

  function openSuggest() {
    setOpen(true);
    setTab("sugerir");
    setSendNote({ ok: true, text: "" });
    loadSuggestions();
  }

  useEffect(() => {
    const handler = () => openSuggest();
    window.addEventListener(OPEN_SUGGEST_EVENT, handler);
    return () => window.removeEventListener(OPEN_SUGGEST_EVENT, handler);
  });

  async function sendSuggestion() {
    setSending(true);
    setSendNote({ ok: true, text: "" });
    try {
      const response = await fetch("/api/suggestions", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ text: draft }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Não deu para enviar agora.");
      setSuggestions((list) => [data.suggestion, ...list]);
      setRemaining(data.remaining);
      setDraft("");
      setSendNote({ ok: true, text: "Recebido, obrigado! Se a ideia entrar no painel, ela aparece em Em construção." });
    } catch (error) {
      setSendNote({ ok: false, text: error instanceof Error ? error.message : "Não deu para enviar agora." });
    } finally {
      setSending(false);
    }
  }

  function go(item: PanelUpdate) {
    if (!item.view) return;
    setOpen(false);
    markSeen();
    onGo(item.view);
  }

  const list = tab === "novidades" ? released : building;

  // Fora do topo (portal): o topo tem desfoque, que prende elementos "fixed" dentro dele e cortava a gaveta.
  const layer = (
    <>
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
              <h2>{tab === "sugerir" ? "Sugerir melhoria" : "Novidades"}</h2>
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
            <button type="button" className={`pi-upd-suggest-btn ${tab === "sugerir" ? "on" : ""}`} onClick={openSuggest}>
              <Icon name="spark" /> Sugerir uma melhoria
            </button>

            {tab === "sugerir" ? (
              <>
                <div className="pi-sug">
                  <p className="pi-upd-note">Tem uma ideia para o painel ficar melhor? Conte aqui. Lemos todas, e as que fizerem sentido entram em construção.</p>
                  <textarea
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    maxLength={800}
                    rows={5}
                    placeholder="Ex.: queria escolher a fonte dos criativos…"
                    disabled={remaining === 0 || sending}
                    aria-label="Sua sugestão"
                  />
                  <div className="pi-sug-row">
                    <span>{remaining === null ? "Até 5 sugestões por mês" : remaining > 0 ? `Você ainda pode mandar ${remaining} este mês` : "Você já mandou as 5 deste mês"}</span>
                    <button type="button" onClick={sendSuggestion} disabled={sending || draft.trim().length < 15 || remaining === 0}>
                      {sending ? "Enviando…" : "Enviar"}
                    </button>
                  </div>
                  {sendNote.text && <p className={`pi-sug-note ${sendNote.ok ? "" : "err"}`}>{sendNote.text}</p>}
                  {suggestions.length > 0 && <h3 className="pi-sug-title">Suas sugestões</h3>}
                </div>
                <ul>
                  {suggestions.map((item) => (
                    <li key={item.id} className={`s-${item.status}`}>
                      <div className="pi-upd-meta">
                        <span className="pi-upd-tag">{suggestionLabel[item.status]}</span>
                        <span>{when(item.created_at)}</span>
                      </div>
                      <p className="pi-sug-text">{item.text}</p>
                      {item.note && <p>{item.note}</p>}
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <>
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
              </>
            )}
          </aside>
        </>
      )}
    </>
  );

  return (
    <>
      <button type="button" className="pi-pill pi-bell" onClick={openPanel} aria-label={`Novidades${unseen.length ? ` (${unseen.length} novas)` : ""}`} title="Novidades">
        <Icon name="bell" />
        {unseen.length > 0 && <span className="pi-bell-count">{unseen.length > 9 ? "9+" : unseen.length}</span>}
      </button>
      {typeof document !== "undefined" && createPortal(layer, document.body)}
    </>
  );
}
