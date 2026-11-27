"use client";

import { useCallback, useEffect, useState } from "react";
import { PushToggle } from "./Extras";
import { api, areaHeaders } from "./session";

// Minha conta (todas as áreas): compras, "não encontrei minha compra", dados, senha, avisos e atalhos.
type Compra = { produto: string; slug: string; capa: string | null; desde: string; plataforma: string };
type Dados = { email: string; nome: string; whatsapp: string; compras: Compra[] };

const data = (iso: string) => new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
function maskPhone(value: string) {
  const d = value.replace(/\D/g, "").replace(/^55(?=\d{10,11}$)/, "").slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}
// Link do suporte com a mensagem pronta, quando o suporte é um WhatsApp (wa.me / api.whatsapp.com).
function supportWithText(url: string, text: string) {
  try {
    const u = new URL(url);
    if (/(^|\.)wa\.me$|whatsapp\.com$/.test(u.hostname)) {
      u.searchParams.set("text", text);
      return u.toString();
    }
  } catch {
    /* endereço estranho: usa como está */
  }
  return url;
}

export function MinhaConta({
  supportUrl,
  showInstall,
  onInstall,
  onOpen,
  onSignOut,
}: {
  supportUrl: string | null;
  showInstall: boolean;
  onInstall: () => void;
  onOpen: (slug: string) => void;
  onSignOut: () => void;
}) {
  const [conta, setConta] = useState<Dados | null>(null);
  const [erro, setErro] = useState("");

  const carregar = useCallback(async () => {
    try {
      setConta(await api<Dados>("/api/membros/conta"));
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível abrir sua conta.");
    }
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- busca os dados do servidor
    void carregar();
  }, [carregar]);

  if (erro && !conta) return <div className="gp-wrap gp-center"><p className="gp-error">{erro}</p></div>;
  if (!conta) return <div className="gp-wrap gp-center"><p className="gp-muted">Abrindo sua conta…</p></div>;

  return (
    <main className="gp-wrap gp-conta">
      <header className="gp-conta-head">
        <h1>Minha conta</h1>
        <p className="gp-muted">{conta.email}</p>
      </header>

      <section className="gp-conta-sec" aria-labelledby="gp-compras">
        <h2 id="gp-compras">Minhas compras</h2>
        {conta.compras.length ? (
          <ul className="gp-compras">
            {conta.compras.map((c) => (
              <li key={c.slug}>
                <span className="gp-compra-capa" style={c.capa ? { backgroundImage: `url("${c.capa}")` } : undefined} aria-hidden="true" />
                <span className="gp-compra-info">
                  <b>{c.produto}</b>
                  <small>
                    Liberado em {data(c.desde)}
                    {c.plataforma ? ` · ${c.plataforma}` : ""}
                  </small>
                </span>
                <button type="button" className="gp-btn gp-btn-ghost gp-btn-sm" onClick={() => onOpen(c.slug)}>
                  Abrir
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="gp-muted">Nenhuma compra liberada para este e-mail nesta área.</p>
        )}
        <NaoAchei email={conta.email} supportUrl={supportUrl} />
      </section>

      <MeusDados conta={conta} onSaved={setConta} />
      <TrocarSenha email={conta.email} />

      <section className="gp-conta-sec" aria-labelledby="gp-app">
        <h2 id="gp-app">App e avisos</h2>
        <div className="gp-conta-row">
          <span>
            <b>Avisos no celular</b>
            <small>Aula nova, material novo e liberação de compra.</small>
          </span>
          <PushToggle onInstall={onInstall} compact />
        </div>
        {showInstall && (
          <div className="gp-conta-row">
            <span>
              <b>App na tela do celular</b>
              <small>Abre direto na sua área, sem procurar o link.</small>
            </span>
            <button type="button" className="gp-btn gp-btn-ghost gp-btn-sm" onClick={onInstall}>
              Instalar
            </button>
          </div>
        )}
        {supportUrl && (
          <div className="gp-conta-row">
            <span>
              <b>Suporte</b>
              <small>Fale com a equipe.</small>
            </span>
            <a className="gp-btn gp-btn-ghost gp-btn-sm" href={supportUrl} target="_blank" rel="noreferrer">
              Abrir
            </a>
          </div>
        )}
      </section>

      <button type="button" className="gp-btn gp-btn-ghost gp-conta-sair" onClick={onSignOut}>
        Sair da conta
      </button>
    </main>
  );
}

function NaoAchei({ email, supportUrl }: { email: string; supportUrl: string | null }) {
  const [aberto, setAberto] = useState(false);
  const [outro, setOutro] = useState("");
  const [plataforma, setPlataforma] = useState("");
  const [pedido, setPedido] = useState("");
  const [estado, setEstado] = useState<"" | "enviando" | "pronto">("");
  const [msg, setMsg] = useState("");
  const [erro, setErro] = useState("");

  const outroEmail = outro.trim().toLowerCase();
  const mesmoEmail = !outroEmail || outroEmail === email;

  async function enviar(event: React.FormEvent) {
    event.preventDefault();
    setErro("");
    setEstado("enviando");
    try {
      await api("/api/membros/conta", { body: { acao: "nao-achei", outro_email: mesmoEmail ? "" : outroEmail, plataforma, pedido } });
      if (mesmoEmail) {
        setMsg("Registramos o seu caso. Se você pagou há menos de 2 minutos, espere um pouco e atualize a página. Se já passou disso, chame o suporte com o número do pedido.");
      } else {
        // Mesma rota do "esqueci minha senha": manda o acesso ao outro e-mail sem dizer se ele tem compra.
        const r = await fetch("/api/membros/senha", { method: "POST", headers: { "Content-Type": "application/json", ...areaHeaders() }, body: JSON.stringify({ email: outroEmail }) });
        const d = (await r.json().catch(() => ({}))) as { ok?: boolean; message?: string; error?: string };
        setMsg(
          d.ok
            ? `Se houver compra em ${outroEmail}, o acesso chegou nesse e-mail agora (olhe também Promoções e Spam). Depois saia desta conta e entre com ele.`
            : d.message || d.error || "Não encontramos compra nesse e-mail. Chame o suporte com o número do pedido.",
        );
      }
      setEstado("pronto");
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não deu certo. Tente de novo.");
      setEstado("");
    }
  }

  const texto = `Olá! Comprei e não encontrei na área. E-mail: ${outroEmail || email}${plataforma ? ` · ${plataforma}` : ""}${pedido ? ` · pedido ${pedido}` : ""}`;

  if (!aberto) {
    return (
      <button type="button" className="gp-link gp-conta-link" onClick={() => setAberto(true)}>
        Não encontrei uma compra
      </button>
    );
  }
  return (
    <form className="gp-conta-box" onSubmit={enviar}>
      <h3>Não encontrei minha compra</h3>
      <p className="gp-muted">A compra aparece aqui sozinha até 2 minutos depois do pagamento aprovado. Pix e boleto só liberam depois de pagos. O motivo mais comum é ter comprado com outro e-mail.</p>
      <label className="gp-field">
        <span>E-mail que você usou na compra</span>
        <input type="email" autoComplete="off" placeholder={email} value={outro} onChange={(e) => setOutro(e.target.value)} />
        <small>Deixe vazio se foi este mesmo.</small>
      </label>
      <div className="gp-grid2">
        <label className="gp-field">
          <span>Onde comprou</span>
          <select value={plataforma} onChange={(e) => setPlataforma(e.target.value)}>
            <option value="">Não lembro</option>
            <option>Eduzz</option>
            <option>Ticto</option>
            <option>Cakto</option>
            <option>Hotmart</option>
            <option>Kiwify</option>
          </select>
        </label>
        <label className="gp-field">
          <span>Número do pedido (opcional)</span>
          <input inputMode="text" value={pedido} onChange={(e) => setPedido(e.target.value)} />
        </label>
      </div>
      {estado === "pronto" ? (
        <>
          <p className="gp-ok">{msg}</p>
          {supportUrl && (
            <a className="gp-btn gp-btn-ghost" href={supportWithText(supportUrl, texto)} target="_blank" rel="noreferrer">
              Chamar o suporte
            </a>
          )}
        </>
      ) : (
        <button type="submit" className="gp-btn gp-btn-light" disabled={estado === "enviando"}>
          {estado === "enviando" ? "Procurando…" : mesmoEmail ? "Avisar que não encontrei" : "Mandar o acesso para esse e-mail"}
        </button>
      )}
      {erro && <p className="gp-error">{erro}</p>}
    </form>
  );
}

function MeusDados({ conta, onSaved }: { conta: Dados; onSaved: (d: Dados) => void }) {
  const [nome, setNome] = useState(conta.nome);
  const [whats, setWhats] = useState(maskPhone(conta.whatsapp));
  const [estado, setEstado] = useState<"" | "salvando" | "salvo">("");
  const [erro, setErro] = useState("");
  const mudou = nome.trim() !== conta.nome || whats.replace(/\D/g, "") !== conta.whatsapp.replace(/^55(?=\d{10,11}$)/, "");

  async function salvar(event: React.FormEvent) {
    event.preventDefault();
    setErro("");
    setEstado("salvando");
    try {
      onSaved(await api<Dados>("/api/membros/conta", { body: { acao: "dados", nome, whatsapp: whats } }));
      setEstado("salvo");
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível salvar.");
      setEstado("");
    }
  }

  return (
    <form className="gp-conta-sec" onSubmit={salvar} aria-labelledby="gp-dados">
      <h2 id="gp-dados">Meus dados</h2>
      <div className="gp-grid2">
        <label className="gp-field">
          <span>Nome</span>
          <input autoComplete="name" value={nome} onChange={(e) => { setNome(e.target.value); setEstado(""); }} />
        </label>
        <label className="gp-field">
          <span>WhatsApp com DDD</span>
          <input type="tel" inputMode="tel" autoComplete="tel-national" placeholder="(11) 98765-4321" value={whats} onChange={(e) => { setWhats(maskPhone(e.target.value)); setEstado(""); }} />
        </label>
      </div>
      <label className="gp-field">
        <span>E-mail</span>
        <input value={conta.email} readOnly aria-readonly="true" />
        <small>É o e-mail das suas compras. Para trocar, fale com o suporte.</small>
      </label>
      <div className="gp-conta-actions">
        <button type="submit" className="gp-btn gp-btn-light" disabled={!mudou || estado === "salvando"}>
          {estado === "salvando" ? "Salvando…" : "Salvar"}
        </button>
        {estado === "salvo" && <span className="gp-ok">Salvo.</span>}
      </div>
      {erro && <p className="gp-error">{erro}</p>}
    </form>
  );
}

function TrocarSenha({ email }: { email: string }) {
  const [atual, setAtual] = useState("");
  const [nova, setNova] = useState("");
  const [estado, setEstado] = useState<"" | "salvando">("");
  const [msg, setMsg] = useState("");
  const [erro, setErro] = useState("");

  async function trocar(event: React.FormEvent) {
    event.preventDefault();
    setErro("");
    setMsg("");
    setEstado("salvando");
    try {
      await api("/api/membros/conta", { body: { acao: "senha", atual, nova } });
      setAtual("");
      setNova("");
      setMsg("Senha trocada. Use a nova senha na próxima vez que entrar.");
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível trocar a senha.");
    }
    setEstado("");
  }

  async function esqueci() {
    setErro("");
    const r = await fetch("/api/membros/senha", { method: "POST", headers: { "Content-Type": "application/json", ...areaHeaders() }, body: JSON.stringify({ email }) }).catch(() => null);
    const d = (await r?.json().catch(() => ({}))) as { message?: string; error?: string } | undefined;
    setMsg(d?.message || d?.error || "Mandamos um link para o seu e-mail.");
  }

  return (
    <form className="gp-conta-sec" onSubmit={trocar} aria-labelledby="gp-senha">
      <h2 id="gp-senha">Senha</h2>
      <div className="gp-grid2">
        <label className="gp-field">
          <span>Senha atual</span>
          <input type="password" autoComplete="current-password" required value={atual} onChange={(e) => setAtual(e.target.value)} />
        </label>
        <label className="gp-field">
          <span>Nova senha (mínimo 8 caracteres)</span>
          <input type="password" autoComplete="new-password" minLength={8} required value={nova} onChange={(e) => setNova(e.target.value)} />
        </label>
      </div>
      <div className="gp-conta-actions">
        <button type="submit" className="gp-btn gp-btn-light" disabled={estado === "salvando"}>
          {estado === "salvando" ? "Trocando…" : "Trocar senha"}
        </button>
        <button type="button" className="gp-link" onClick={() => void esqueci()}>
          Esqueci a senha atual
        </button>
      </div>
      {msg && <p className="gp-ok">{msg}</p>}
      {erro && <p className="gp-error">{erro}</p>}
    </form>
  );
}
