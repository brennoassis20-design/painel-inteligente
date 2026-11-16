"use client";

// Sessão do aluno na área de membros (separada da sessão do Painel Inteligente).
const KEY = "gp_session";

type Session = { accessToken: string; refreshToken?: string };

export function readSession(): Session | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

export function writeSession(session: Session | null) {
  try {
    if (session) window.localStorage.setItem(KEY, JSON.stringify(session));
    else window.localStorage.removeItem(KEY);
  } catch {
    /* navegador sem armazenamento: a sessão dura só esta aba */
  }
}

export class AuthError extends Error {}

async function renew(session: Session) {
  if (!session.refreshToken) return null;
  const response = await fetch("/api/membros/renovar", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken: session.refreshToken }),
  });
  if (!response.ok) return null;
  const data = await response.json();
  const next = { accessToken: data.accessToken, refreshToken: data.refreshToken };
  writeSession(next);
  return next;
}

export async function api<T = unknown>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  let session = readSession();
  if (!session) throw new AuthError("Entre para continuar.");

  const send = (token: string) =>
    fetch(path, {
      method: init.method || (init.body ? "POST" : "GET"),
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: init.body ? JSON.stringify(init.body) : undefined,
    });

  let response = await send(session.accessToken);
  if (response.status === 401) {
    session = await renew(session);
    if (!session) {
      writeSession(null);
      throw new AuthError("Sua sessão expirou. Entre de novo.");
    }
    response = await send(session.accessToken);
  }
  const data = await response.json().catch(() => ({}));
  if (response.status === 401) {
    writeSession(null);
    throw new AuthError(data.error || "Entre de novo.");
  }
  if (!response.ok) throw new Error(data.error || "Algo deu errado. Tente de novo.");
  return data as T;
}

export function brl(cents: number | null | undefined) {
  if (cents === null || cents === undefined) return "";
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
