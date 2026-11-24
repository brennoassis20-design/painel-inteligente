"use client";

import { useState } from "react";
import type { Posicao } from "@/lib/chama-acesa/biblia";
import type { PainelBiblia } from "@/lib/chama-acesa/armazem-biblia";
import { HORARIO_RE, PLANOS, situacaoDoPlano, type AcaoBiblia, type LeituraDoDia } from "@/lib/chama-acesa/biblia-estudo";
import type { AbrirOpcoes } from "./Biblia";

interface Props {
  painel: PainelBiblia | null;
  agir: (a: AcaoBiblia) => Promise<boolean>;
  toast: (m: string) => void;
  onAbrir: (p: Posicao, o?: AbrirOpcoes) => void;
  onAtivarPush?: () => Promise<void>;
}

/** Planos de leitura: escolher, leitura de hoje, atrasadas e lembrete da leitura. */
export function BibliaPlanos({ painel, agir, toast, onAbrir, onAtivarPush }: Props) {
  const [escolhendo, setEscolhendo] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const estado = painel?.estado;
  const sit = estado?.plano && painel ? situacaoDoPlano(estado.plano, painel.hoje) : null;

  if (!painel || !estado) return <div><h1>Planos</h1><p className="ch-suave">Abrindo…</p></div>;

  const fazer = async (a: AcaoBiblia, ok?: string) => {
    setOcupado(true);
    const deu = await agir(a);
    setOcupado(false);
    if (deu && ok) toast(ok);
    return deu;
  };
  const ler = (l: LeituraDoDia) => onAbrir(l.capitulos[0], { plano: { dia: l.dia, caps: l.capitulos, nome: l.nome } });

  const lista = (
    <div className="ch-planos">
      {PLANOS.map((p) => (
        <article key={p.id} className="ch-card">
          <h2>{p.nome}</h2>
          <p className="ch-suave">{p.descricao}</p>
          <p className="ch-etiqueta">{p.dias.length} leituras</p>
          <button
            type="button"
            className="ch-btn"
            disabled={ocupado}
            onClick={async () => {
              if (await fazer({ tipo: "plano", id: p.id }, "Plano iniciado. A leitura de hoje é a primeira!")) setEscolhendo(false);
            }}
          >
            {estado.plano?.id === p.id ? "Plano atual" : "Começar este plano"}
          </button>
        </article>
      ))}
      {estado.plano && <button type="button" className="ch-link" onClick={() => setEscolhendo(false)}>Voltar ao meu plano</button>}
    </div>
  );

  if (!sit || escolhendo) {
    return (
      <div className="ch-tela">
        <h1>{sit ? "Trocar de plano" : "Planos de leitura"}</h1>
        <p className="ch-suave">{sit ? "Ao trocar, o plano novo começa hoje no dia 1. O que você já leu continua contando no Progresso." : "Escolha um plano e receba a leitura de cada dia. Você pode trocar quando quiser."}</p>
        {lista}
        <Lembrete painel={painel} agir={agir} toast={toast} onAtivarPush={onAtivarPush} />
      </div>
    );
  }

  const hoje = sit.hoje;
  return (
    <div className="ch-tela">
      <h1>Meu plano</h1>
      <article className="ch-card">
        <p className="ch-etiqueta">{sit.plano.nome}</p>
        <p className="ch-suave">Dia {Math.min(sit.diaHoje, sit.total)} de {sit.total} · {sit.feitos} {sit.feitos === 1 ? "leitura feita" : "leituras feitas"}</p>
        <div className="ch-barra" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={sit.percentual} aria-label="Progresso do plano"><i style={{ width: `${sit.percentual}%` }} /></div>
        <p className="ch-barra-leg">{sit.percentual}% do plano</p>
      </article>

      {sit.concluido ? (
        <article className="ch-card" role="status">
          <h2>Plano concluído!</h2>
          <p className="ch-suave">Glória a Deus. Que tal começar outro plano?</p>
          <button type="button" className="ch-btn" onClick={() => setEscolhendo(true)}>Escolher outro plano</button>
        </article>
      ) : (
        hoje && (
          <article className="ch-card">
            <p className="ch-etiqueta">Leitura de hoje · dia {hoje.dia}</p>
            {hoje.titulo && <p className="ch-ref">{hoje.titulo}</p>}
            <h2>{hoje.nome}</h2>
            {hoje.feito ? (
              <p className="ch-lido-ok" role="status">✓ Leitura de hoje concluída</p>
            ) : (
              <>
                <button type="button" className="ch-btn ch-btn-grande" onClick={() => ler(hoje)}>Ler agora</button>
                <button type="button" className="ch-link" disabled={ocupado} onClick={() => void fazer({ tipo: "marcarDia", dia: hoje.dia }, "Marcada como lida.")}>Já li, marcar como lida</button>
              </>
            )}
          </article>
        )
      )}

      {sit.atrasadas.length > 0 && (
        <details className="ch-atrasadas" open={sit.atrasadas.length <= 3}>
          <summary>{sit.atrasadas.length} {sit.atrasadas.length === 1 ? "leitura atrasada" : "leituras atrasadas"}</summary>
          <p className="ch-suave">Sem pressa: leia quando puder. O plano espera por você.</p>
          <ul>
            {[...sit.atrasadas].reverse().slice(0, 30).map((l) => (
              <li key={l.dia}>
                <div>
                  <b>Dia {l.dia}</b>
                  <small>{l.nome}</small>
                </div>
                <button type="button" className="ch-mini" onClick={() => ler(l)}>Ler</button>
                <button type="button" className="ch-mini" disabled={ocupado} onClick={() => void fazer({ tipo: "marcarDia", dia: l.dia }, "Marcada como lida.")}>Já li</button>
              </li>
            ))}
          </ul>
          {sit.atrasadas.length > 30 && <p className="ch-suave">Mostrando as 30 mais recentes.</p>}
        </details>
      )}

      <Lembrete painel={painel} agir={agir} toast={toast} onAtivarPush={onAtivarPush} />
      <button type="button" className="ch-btn ch-btn-claro" onClick={() => setEscolhendo(true)}>Trocar de plano</button>
      <button type="button" className="ch-link" disabled={ocupado} onClick={() => void fazer({ tipo: "plano", id: null }, "Plano encerrado.")}>Encerrar este plano</button>
    </div>
  );
}

/** Horário próprio da leitura bíblica (opcional, liga e desliga). Separado do lembrete da jornada. */
function Lembrete({ painel, agir, toast, onAtivarPush }: { painel: PainelBiblia; agir: Props["agir"]; toast: Props["toast"]; onAtivarPush?: () => Promise<void> }) {
  const atual = painel.estado.lembrete;
  const [hora, setHora] = useState(atual ?? "07:00");
  const [ocupado, setOcupado] = useState(false);
  const salvar = async (horario: string | null) => {
    if (horario && !HORARIO_RE.test(horario)) return toast("Escolha um horário válido.");
    setOcupado(true);
    if (horario && onAtivarPush) {
      try {
        await onAtivarPush();
      } catch (e) {
        toast(e instanceof Error ? e.message : "Não deu para ligar os avisos.");
      }
    }
    const ok = await agir({ tipo: "lembrete", horario });
    setOcupado(false);
    if (ok) toast(horario ? `Lembrete da leitura ligado para as ${horario}.` : "Lembrete da leitura desligado.");
  };
  return (
    <section className="ch-card ch-lembrete-biblia" aria-labelledby="lb-t">
      <h2 id="lb-t">Lembrete da leitura</h2>
      <p className="ch-suave">Um aviso curto, na hora que você escolher, só se você ainda não tiver lido no dia. É separado do lembrete da jornada.</p>
      <label className="ch-hora">
        <span>Horário</span>
        <input type="time" value={hora} onChange={(e) => setHora(e.target.value || "07:00")} />
      </label>
      {!onAtivarPush && <p className="ch-nota">Na bancada de testes o horário só é guardado; a notificação de verdade vem na versão instalada.</p>}
      <button type="button" className="ch-btn" disabled={ocupado} onClick={() => void salvar(hora)}>{atual ? `Mudar para ${hora}` : "Ligar o lembrete"}</button>
      {atual && <button type="button" className="ch-link" disabled={ocupado} onClick={() => void salvar(null)}>Desligar (hoje: {atual})</button>}
    </section>
  );
}
