"use client";

import { useState } from "react";
import { readRef, readUtm, track } from "./pixel";
import { areaHeaders, writeSession } from "./session";

// (11) 98765-4321 enquanto digita.
function maskPhone(value: string) {
  const d = value.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

type Mode = "login" | "recover" | "set-password" | "signup";

export default function Login({
  brand,
  logo,
  linkToken,
  linkRefresh,
  startSignup,
  canSignup = false,
  onDone,
}: {
  brand: string;
  logo?: string | null;
  linkToken?: string;
  linkRefresh?: string;
  startSignup?: boolean;
  // Só áreas com produto grátis publicado oferecem cadastro grátis.
  canSignup?: boolean;
  onDone: (info?: { signup?: boolean }) => void;
}) {
  const [mode, setMode] = useState<Mode>(linkToken ? "set-password" : startSignup && canSignup ? "signup" : "login");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setNotice("");
    setBusy(true);
    try {
      if (mode === "signup") {
        if (password.length < 8) throw new Error("A senha precisa ter pelo menos 8 caracteres.");
        const response = await fetch("/api/membros/cadastro", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...areaHeaders() },
          body: JSON.stringify({ email: email.trim().toLowerCase(), whatsapp, senha: password, utm: readUtm(), ref: readRef() || undefined }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Não foi possível criar o acesso.");
        if (data.existente) {
          setNotice(data.mensagem);
          setMode("login");
          return;
        }
        track("CompleteRegistration", { content_name: "Cadastro grátis", status: true });
        track("Lead", { content_name: "Cadastro grátis" });
        writeSession(data.session);
        onDone({ signup: true });
        return;
      }

      if (mode === "recover") {
        const response = await fetch("/api/membros/senha", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...areaHeaders() },
          body: JSON.stringify({ email: email.trim().toLowerCase() }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Não foi possível enviar o link.");
        if (data.sem_conta) {
          setError(data.message);
          return;
        }
        setNotice(data.message);
        return;
      }

      if (mode === "set-password") {
        if (password.length < 8) throw new Error("A senha precisa ter pelo menos 8 caracteres.");
        if (password !== confirm) throw new Error("As duas senhas não são iguais.");
        const response = await fetch("/api/auth/password", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${linkToken}`, ...areaHeaders() },
          body: JSON.stringify({ password }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "O link venceu. Peça outro em Esqueci minha senha.");
        writeSession({ accessToken: linkToken || "", refreshToken: linkRefresh });
        window.history.replaceState(null, "", window.location.pathname);
        onDone();
        return;
      }

      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Membros": "1", ...areaHeaders() },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "E-mail ou senha incorretos.");
      writeSession({ accessToken: data.session.accessToken, refreshToken: data.session.refreshToken });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Algo deu errado.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="gp-login">
      <div className="gp-login-brand">
        <span className="gp-logo">
          {/* eslint-disable-next-line @next/next/no-img-element -- logo externo configurável */}
          {logo ? <img src={logo} alt="" /> : null}
          {brand}
        </span>
      </div>
      <form className="gp-login-card" onSubmit={submit}>
        <h1>{mode === "signup" ? "Crie seu acesso grátis" : mode === "set-password" ? "Crie sua senha" : mode === "recover" ? "Recuperar acesso" : "Entre na sua área"}</h1>
        <p className="gp-muted">
          {mode === "signup"
            ? "Libere a aula gratuita agora. Leva menos de 1 minuto."
            : mode === "set-password"
              ? "É com ela que você entra daqui pra frente."
              : mode === "recover"
                ? "Use o e-mail do seu acesso. Mandamos um link para criar ou trocar a senha."
                : "Use o seu e-mail e a sua senha."}
        </p>

        {mode !== "set-password" && (
          <label className="gp-field">
            <span>E-mail</span>
            <input id="gp-email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
        )}
        {mode === "signup" && (
          <label className="gp-field">
            <span>WhatsApp com DDD</span>
            <input
              id="gp-whats"
              type="tel"
              inputMode="tel"
              autoComplete="tel-national"
              placeholder="(11) 98765-4321"
              required
              value={whatsapp}
              onChange={(e) => setWhatsapp(maskPhone(e.target.value))}
            />
          </label>
        )}
        {mode !== "recover" && (
          <label className="gp-field">
            <span>{mode === "set-password" ? "Nova senha" : mode === "signup" ? "Crie uma senha (mínimo 8 caracteres)" : "Senha"}</span>
            <input
              id="gp-password"
              type="password"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              minLength={mode === "login" ? undefined : 8}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
        )}
        {mode === "set-password" && (
          <label className="gp-field">
            <span>Repita a senha</span>
            <input id="gp-password2" type="password" autoComplete="new-password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </label>
        )}

        {error && <p className="gp-error">{error}</p>}
        {notice && <p className="gp-ok">{notice}</p>}

        <button className="gp-btn gp-btn-gold" type="submit" disabled={busy}>
          {busy ? "Aguarde…" : mode === "signup" ? "Criar acesso grátis" : mode === "set-password" ? "Salvar senha e entrar" : mode === "recover" ? "Enviar link" : "Entrar"}
        </button>
        {mode === "signup" && <p className="gp-fine">Você também recebe o link de acesso no seu e-mail.</p>}

        {mode === "signup" && (
          <button type="button" className="gp-link" onClick={() => setMode("login")}>
            Já tenho acesso: entrar
          </button>
        )}
        {mode === "login" && canSignup && (
          <button type="button" className="gp-link gp-link-strong" onClick={() => setMode("signup")}>
            Ainda não tem acesso? Criar acesso grátis
          </button>
        )}

        {mode === "login" && (
          <button type="button" className="gp-link" onClick={() => setMode("recover")}>
            Esqueci minha senha / primeiro acesso
          </button>
        )}
        {mode === "recover" && error && canSignup && (
          <button type="button" className="gp-link gp-link-strong" onClick={() => { setError(""); setMode("signup"); }}>
            Criar acesso grátis com este e-mail
          </button>
        )}
        {mode === "recover" && (
          <button type="button" className="gp-link" onClick={() => setMode("login")}>
            Voltar para entrar
          </button>
        )}
      </form>
    </div>
  );
}
