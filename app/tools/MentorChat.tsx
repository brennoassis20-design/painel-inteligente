"use client";

import { CSSProperties, FormEvent, ReactNode, useEffect, useRef, useState } from "react";
import { Icon } from "../icons";

// Mentor: conversa guardada no navegador; o limite diário é controlado no servidor.
type Message = { role: "user" | "assistant"; content: string };
type Usage = { used: number; limit: number };
type Request = (path: string, init?: RequestInit) => Promise<{ answer?: string; usage?: Usage }>;
export type MentorProductContext = { title?: string; niche?: string; audience?: string; promise?: string };

const storagePrefix = "painel-inteligente-mentor";

const suggestions = [
  "Qual preço devo cobrar no meu produto?",
  "Como montar minha primeira campanha na Meta?",
  "Meu anúncio tem cliques mas não vende. O que olho primeiro?",
  "Me dê 5 ganchos de criativo para o meu produto",
];

function readHistory(key: string): Message[] {
  try {
    const saved = JSON.parse(window.localStorage.getItem(key) || "[]");
    return Array.isArray(saved) ? saved.slice(-30) : [];
  } catch {
    return [];
  }
}

// Formatação leve da resposta: **negrito**, listas e parágrafos.
function renderAnswer(text: string) {
  const bold = (line: string): ReactNode[] =>
    line.split(/(\*\*[^*]+\*\*)/g).map((part, index) =>
      part.startsWith("**") && part.endsWith("**") ? <strong key={index}>{part.slice(2, -2)}</strong> : part,
    );
  return text
    .replace(/^#{1,4}\s*/gm, "")
    .split(/\n{2,}/)
    .map((block, index) => {
      const lines = block.split("\n").filter((line) => line.trim());
      const isList = lines.length > 0 && lines.every((line) => /^\s*([-*•]|\d+[.)])\s+/.test(line));
      if (isList) {
        const ordered = /^\s*\d/.test(lines[0]);
        const items = lines.map((line, i) => <li key={i}>{bold(line.replace(/^\s*([-*•]|\d+[.)])\s+/, ""))}</li>);
        return ordered ? <ol key={index}>{items}</ol> : <ul key={index}>{items}</ul>;
      }
      return (
        <p key={index}>
          {lines.map((line, i) => (
            <span key={i}>
              {i > 0 && <br />}
              {bold(line.replace(/^\s*[-*•]\s+/, "• "))}
            </span>
          ))}
        </p>
      );
    });
}

export function MentorChat({
  userKey,
  request,
  context,
  active,
}: {
  userKey: string;
  request: Request;
  context: MentorProductContext;
  active: boolean;
}) {
  const key = `${storagePrefix}:${userKey || "anon"}`;
  const [messages, setMessages] = useState<Message[]>(() => (typeof window === "undefined" ? [] : readHistory(key)));
  const [draft, setDraft] = useState("");
  const [usage, setUsage] = useState<Usage | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(messages.slice(-30)));
    } catch {
      // Sem armazenamento local: a conversa some ao recarregar.
    }
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, key]);

  useEffect(() => {
    if (!active) return;
    request("/api/mentor")
      .then((data) => data.usage && setUsage(data.usage))
      .catch(() => undefined);
    // Atualiza o contador sempre que o aluno abre o Mentor.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  const left = usage ? Math.max(usage.limit - usage.used, 0) : null;
  const blocked = left === 0;

  async function send(text: string) {
    const question = text.trim();
    if (!question || loading || blocked) return;
    const next: Message[] = [...messages, { role: "user", content: question }];
    setMessages(next);
    setDraft("");
    setError("");
    setLoading(true);
    try {
      const data = await request("/api/mentor", {
        method: "POST",
        body: JSON.stringify({ messages: next.slice(-8), context }),
      });
      setMessages([...next, { role: "assistant", content: data.answer || "" }]);
      if (data.usage) setUsage(data.usage);
    } catch (err) {
      const message = err instanceof Error ? err.message : "O Mentor não conseguiu responder agora.";
      setError(message);
      if (/perguntas de hoje/.test(message) && usage) setUsage({ ...usage, used: usage.limit });
    } finally {
      setLoading(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    send(draft);
  }

  return (
    <div className="pi-mentor">
      <div className="pi-card pi-mentor-chat">
        <div className="pi-mentor-list" ref={listRef} aria-live="polite">
          {messages.length === 0 && (
            <div className="pi-mentor-empty">
              <span className="pi-ico" style={{ "--c": "var(--pi-cyan)" } as CSSProperties}><Icon name="bot" /></span>
              <h4>Pergunte o que quiser sobre o seu produto e as vendas</h4>
              <p>Preço, página, anúncios, criativos, WhatsApp. O Mentor já conhece o projeto que está aberto no painel.</p>
              <div className="pi-mentor-sugs">
                {suggestions.map((item) => (
                  <button type="button" key={item} onClick={() => send(item)} disabled={blocked || loading}>
                    {item}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((message, index) => (
            <div key={index} className={`pi-msg ${message.role}`}>
              {message.role === "assistant" && <span className="pi-msg-av"><Icon name="bot" /></span>}
              <div className="pi-msg-body">{message.role === "assistant" ? renderAnswer(message.content) : message.content}</div>
            </div>
          ))}
          {loading && (
            <div className="pi-msg assistant">
              <span className="pi-msg-av"><Icon name="bot" /></span>
              <div className="pi-msg-body pi-typing"><i /><i /><i /></div>
            </div>
          )}
        </div>

        {error && <p className="pi-mentor-error">{error}</p>}

        <form className="pi-mentor-form" onSubmit={submit}>
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                send(draft);
              }
            }}
            rows={1}
            maxLength={1200}
            placeholder={blocked ? "Perguntas de hoje esgotadas. Volte amanhã." : "Escreva sua pergunta…"}
            disabled={blocked}
            aria-label="Pergunta para o Mentor"
          />
          <button type="submit" className="pi-btn-grad" disabled={!draft.trim() || loading || blocked} aria-label="Enviar">
            <Icon name="send" />
          </button>
        </form>
      </div>

      <aside className="pi-mentor-side">
        <div className="pi-card">
          <span>Perguntas hoje</span>
          <b>{left ?? "-"}<small>{usage ? ` de ${usage.limit}` : ""}</small></b>
          <div className="pi-bar">
            <i style={{ width: `${usage ? Math.min((usage.used / Math.max(usage.limit, 1)) * 100, 100) : 0}%` }} />
          </div>
          <p>O limite renova todo dia à meia-noite.</p>
        </div>
        {context.title && (
          <div className="pi-card">
            <span>Projeto em foco</span>
            <strong className="pi-mentor-proj">{context.title}</strong>
            <p>Abra outro projeto em Meus arquivos para mudar o foco.</p>
          </div>
        )}
        {messages.length > 0 && (
          <button type="button" className="pi-btn-soft" onClick={() => { setMessages([]); setError(""); }}>
            Nova conversa
          </button>
        )}
      </aside>
    </div>
  );
}
