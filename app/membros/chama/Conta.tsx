"use client";

import { useEffect, useRef, useState } from "react";
import type { ArmazemConta } from "@/lib/chama-acesa/armazem";
import { MAX_NOME, ROTULO_PLANO, type Conta as DadosConta } from "@/lib/chama-acesa/conta";
import { reduzirFoto } from "@/lib/chama-acesa/foto";
import { PRECO_MENSAL, PRECO_VITALICIO } from "@/lib/chama-acesa/precos";
import { Avatar } from "./Avatar";

/** Tela "Conta": nome de exibição, foto, e-mail (só leitura), plano, preferência do ranking e sair. */
export function ContaTela({ armazem, onVoltar, onMudou, onAssinar, onSair }: {
  armazem: ArmazemConta;
  onVoltar: () => void;
  /** Avisa o app que nome, foto ou preferência mudaram (para atualizar o ranking e o topo). */
  onMudou: () => void;
  onAssinar: () => void;
  onSair?: () => void;
}) {
  const [conta, setConta] = useState<DadosConta | null>(null);
  const [nome, setNome] = useState("");
  const [msg, setMsg] = useState<{ tom: "ok" | "erro"; texto: string } | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const arquivo = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let vivo = true;
    armazem.carregar().then((c) => {
      if (!vivo) return;
      setConta(c);
      setNome(c.nome);
    }).catch((e) => vivo && setMsg({ tom: "erro", texto: e instanceof Error ? e.message : "Não deu para abrir a sua conta." }));
    return () => { vivo = false; };
  }, [armazem]);

  const rodar = async (fn: () => Promise<DadosConta>, ok: string) => {
    if (ocupado) return;
    setOcupado(true);
    setMsg(null);
    try {
      const c = await fn();
      setConta(c);
      setNome(c.nome);
      setMsg({ tom: "ok", texto: ok });
      onMudou();
    } catch (e) {
      setMsg({ tom: "erro", texto: e instanceof Error ? e.message : "Não deu certo. Tente de novo." });
    } finally {
      setOcupado(false);
    }
  };

  if (!conta) {
    return (
      <div className="ch-cheia ch-passo">
        <button type="button" className="ch-link voltar" onClick={onVoltar}>‹ Voltar</button>
        {msg ? <p role="alert" className="ch-nota">{msg.texto}</p> : <p className="ch-suave">Abrindo a sua conta…</p>}
      </div>
    );
  }
  const mudouNome = nome.trim() !== conta.nome.trim();
  return (
    <div className="ch-cheia ch-passo ch-conta">
      <button type="button" className="ch-link voltar" onClick={onVoltar}>‹ Voltar</button>
      <h1>Minha conta</h1>

      <div className="ch-conta-foto">
        <Avatar nome={conta.nome} foto={conta.foto} tamanho={96} />
        <div>
          <input
            ref={arquivo}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f) void rodar(async () => { const p = await reduzirFoto(f); return armazem.agir({ tipo: "foto", dados: p.dados, mime: p.mime }); }, "Foto atualizada.");
            }}
          />
          <button type="button" className="ch-btn" disabled={ocupado} onClick={() => arquivo.current?.click()}>{conta.foto ? "Trocar a foto" : "Colocar uma foto"}</button>
          {conta.foto && <button type="button" className="ch-link" disabled={ocupado} onClick={() => void rodar(() => armazem.agir({ tipo: "removerFoto" }), "Foto removida.")}>Remover a foto</button>}
        </div>
      </div>

      <label className="ch-campo">
        <span>Nome de exibição</span>
        <input type="text" value={nome} maxLength={MAX_NOME} onChange={(e) => setNome(e.target.value)} autoComplete="nickname" />
      </label>
      <button type="button" className="ch-btn" disabled={ocupado || !mudouNome} onClick={() => void rodar(() => armazem.agir({ tipo: "nome", nome }), "Nome salvo.")}>Salvar o nome</button>

      <label className="ch-campo">
        <span>E-mail</span>
        <input type="email" value={conta.email} readOnly aria-readonly="true" />
      </label>

      <div className="ch-card">
        <span className="ch-etiqueta">Seu acesso</span>
        <h2>{ROTULO_PLANO[conta.plano]}</h2>
        {conta.plano === "gratis" ? (
          <>
            <p className="ch-suave">Os dias 1 a 3 são grátis. Para seguir, escolha o vitalício ({PRECO_VITALICIO}, em até 12x) ou o mensal ({PRECO_MENSAL}/mês, cancele quando quiser).</p>
            <button type="button" className="ch-btn ch-btn-grande" onClick={onAssinar}>Ver as opções</button>
          </>
        ) : conta.plano === "mensal" ? (
          <p className="ch-suave">Assinatura em dia. Para cancelar, use o link do recibo da Eduzz no seu e-mail. Seu progresso fica guardado e a Bíblia continua grátis.</p>
        ) : (
          <p className="ch-suave">Acesso completo, sem mensalidade.</p>
        )}
      </div>

      <label className="ch-jejum" aria-label="Mostrar meu nome e foto no ranking">
        <input type="checkbox" checked={conta.mostrarNoRanking} disabled={ocupado} onChange={(e) => void rodar(() => armazem.agir({ tipo: "mostrar", valor: e.target.checked }), e.target.checked ? "Seu nome e foto aparecem no ranking." : "Você aparece como Membro, sem foto.")} />
        <span>
          <b>Mostrar meu nome e foto no ranking</b>
          <small>Outros membros da sua liga verão o seu primeiro nome e a sua foto. Desligado, você aparece só como “Membro”.</small>
        </span>
      </label>

      {msg && <p role={msg.tom === "erro" ? "alert" : "status"} className={msg.tom === "erro" ? "ch-nota" : "ch-suave"}>{msg.texto}</p>}
      {onSair && <button type="button" className="ch-btn ch-btn-claro" onClick={onSair}>Sair da conta</button>}
    </div>
  );
}
