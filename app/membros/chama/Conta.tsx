"use client";

import { useEffect, useRef, useState } from "react";
import type { ArmazemConta } from "@/lib/chama-acesa/armazem";
import { MAX_NOME, ROTULO_PLANO, type Conta as DadosConta } from "@/lib/chama-acesa/conta";
import { reduzirFoto } from "@/lib/chama-acesa/foto";
import { PRECO_MENSAL, PRECO_VITALICIO } from "@/lib/chama-acesa/precos";
import type { Tema } from "@/lib/chama-acesa/tema";
import { Avatar } from "./Avatar";
import { IconeCamera, IconeVoltar } from "./Icones";

/** Tela "Conta": nome de exibição, foto, e-mail (só leitura), plano, preferência do ranking e sair. */
export function ContaTela({ armazem, onVoltar, onMudou, onAssinar, onSair, chama, ligaNome, lembrete, tema, onTema }: {
  armazem: ArmazemConta;
  /** Dias de chama, liga e horário do lembrete diário (só para mostrar). */
  chama: number;
  ligaNome: string;
  lembrete: string | null;
  /** Aparência: claro (padrão) ou escuro; a escolha fica salva no aparelho. */
  tema: Tema;
  onTema: (t: Tema) => void;
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
        <button type="button" className="ch-voltar" aria-label="Voltar" onClick={onVoltar}><IconeVoltar /></button>
        {msg ? <p role="alert" className="ch-nota">{msg.texto}</p> : <p className="ch-suave">Abrindo a sua conta…</p>}
      </div>
    );
  }
  const mudouNome = nome.trim() !== conta.nome.trim();
  return (
    <div className="ch-cheia ch-passo ch-conta">
      <header className="ch-conta-cab">
        <button type="button" className="ch-voltar" aria-label="Voltar" onClick={onVoltar}><IconeVoltar /></button>
        <h1>Minha conta</h1>
      </header>

      <section className="ch-conta-foto" aria-label="Foto">
        <div className="ch-foto-grande">
          <Avatar nome={conta.nome} foto={conta.foto} tamanho={112} />
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
          <button type="button" className="ch-camera" aria-label={conta.foto ? "Trocar a foto" : "Colocar uma foto"} disabled={ocupado} onClick={() => arquivo.current?.click()}><IconeCamera /></button>
        </div>
        <span className="ch-suave" style={{ fontSize: 13 }}>{chama} {chama === 1 ? "dia" : "dias"} de chama · Liga {ligaNome}</span>
        {conta.foto && <button type="button" className="ch-link" disabled={ocupado} onClick={() => void rodar(() => armazem.agir({ tipo: "removerFoto" }), "Foto removida.")}>Remover a foto</button>}
      </section>

      <section className="ch-cartao" aria-label="Perfil">
        <label className="ch-campo">
          <span>Nome no ranking</span>
          <input type="text" value={nome} maxLength={MAX_NOME} onChange={(e) => setNome(e.target.value)} autoComplete="nickname" />
          <small className="ch-suave" style={{ fontWeight: 400, fontSize: 12 }}>Só o primeiro nome aparece para os outros.</small>
        </label>
        <button type="button" className="ch-btn" disabled={ocupado || !mudouNome} onClick={() => void rodar(() => armazem.agir({ tipo: "nome", nome }), "Nome salvo.")}>Salvar o nome</button>
        <div className="ch-troca">
          <span className="t" id="ch-rotulo-ranking">Aparecer no ranking<small>Desligado: você aparece como “Membro”, sem foto.</small></span>
          <button
            type="button"
            role="switch"
            aria-checked={conta.mostrarNoRanking}
            aria-labelledby="ch-rotulo-ranking"
            className="ch-switch"
            disabled={ocupado}
            onClick={() => void rodar(() => armazem.agir({ tipo: "mostrar", valor: !conta.mostrarNoRanking }), !conta.mostrarNoRanking ? "Seu nome e foto aparecem no ranking." : "Você aparece como Membro, sem foto.")}
          />
        </div>
        <label className="ch-campo">
          <span>E-mail</span>
          <input type="email" value={conta.email} readOnly aria-readonly="true" />
        </label>
      </section>

      <section className="ch-cartao lista" aria-label="Configurações">
        <div className="ch-item"><span>Lembrete diário</span><span className="v">{lembrete ?? "Desligado"}</span></div>
        <div className="ch-item">
          <span id="ch-rotulo-aparencia">Aparência</span>
          <div className="ch-segm" role="radiogroup" aria-labelledby="ch-rotulo-aparencia">
            <button type="button" role="radio" aria-checked={tema === "claro"} onClick={() => onTema("claro")}>Claro</button>
            <button type="button" role="radio" aria-checked={tema === "escuro"} onClick={() => onTema("escuro")}>Escuro</button>
          </div>
        </div>
        <div className="ch-item"><span>Plano</span><span className="plano">{ROTULO_PLANO[conta.plano]}</span></div>
      </section>

      {conta.plano === "gratis" ? (
        <div className="ch-card">
          <span className="ch-etiqueta">Seu acesso</span>
          <p className="ch-suave">Os dias 1 a 3 são grátis. Para seguir, escolha o vitalício ({PRECO_VITALICIO}, em até 12x) ou o mensal ({PRECO_MENSAL}/mês, cancele quando quiser).</p>
          <button type="button" className="ch-btn ch-btn-grande" onClick={onAssinar}>Ver as opções</button>
        </div>
      ) : conta.plano === "mensal" ? (
        <p className="ch-suave">Assinatura em dia. Para cancelar, use o link do recibo da Eduzz no seu e-mail. Seu progresso fica guardado e a Bíblia continua grátis.</p>
      ) : (
        <p className="ch-suave">Acesso completo, sem mensalidade.</p>
      )}

      {msg && <p role={msg.tom === "erro" ? "alert" : "status"} className={msg.tom === "erro" ? "ch-nota" : "ch-suave"}>{msg.texto}</p>}
      {onSair && <button type="button" className="ch-sair" onClick={onSair}>Sair da conta</button>}
    </div>
  );
}
