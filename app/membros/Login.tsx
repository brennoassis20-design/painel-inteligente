"use client";

import { useState } from "react";
import { writeSession } from "./session";

type Mode = "login" | "recover" | "set-password";

export default function Login({
  brand,
  linkToken,
  linkRefresh,
  onDone,
}: {
  brand: string;
  linkToken?: string;
  linkRefresh?: string;
  onDone: () => void;
}) {
  const [mode, setMode] = useState<Mode>(linkToken ? "set-password" : "login");
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
      if (mode === "recover") {
        const response = await fetch("/api/membros/senha", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: email.trim().toLowerCase() }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Não foi possível enviar o link.");
        setNotice(data.message);
        return;
      }

      if (mode === "set-password") {
        if (password.length < 8) throw new Error("A senha precisa ter pelo menos 8 caracteres.");
        if (password !== confirm) throw new Error("As duas senhas não são iguais.");
        const response = await fetch("/api/auth/password", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${linkToken}` },
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
        headers: { "Content-Type": "application/json" },
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
      <form className="gp-login-card" onSubmit={submit}>
        <div className="gp-logo">
          <i />
          {brand}
        </div>
        <h1>{mode === "set-password" ? "Crie sua senha" : mode === "recover" ? "Recuperar acesso" : "Entre na sua área"}</h1>
        <p className="gp-muted">
          {mode === "set-password"
            ? "É com ela que você entra daqui pra frente."
            : mode === "recover"
              ? "Use o e-mail da compra. Mandamos um link para criar ou trocar a senha."
              : "Use o e-mail da compra e a sua senha."}
        </p>

        {mode !== "set-password" && (
          <label className="gp-field">
            <span>E-mail</span>
            <input id="gp-email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
        )}
        {mode !== "recover" && (
          <label className="gp-field">
            <span>{mode === "set-password" ? "Nova senha" : "Senha"}</span>
            <input
              id="gp-password"
              type="password"
              autoComplete={mode === "set-password" ? "new-password" : "current-password"}
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
          {busy ? "Aguarde…" : mode === "set-password" ? "Salvar senha e entrar" : mode === "recover" ? "Enviar link" : "Entrar"}
        </button>

        {mode === "login" && (
          <button type="button" className="gp-link" onClick={() => setMode("recover")}>
            Esqueci minha senha / primeiro acesso
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
