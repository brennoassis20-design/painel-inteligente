"use client";
// Desafio da Palavra (27/11): 5 perguntas do banco de versículos, sequência de acertos, versículo inteiro depois de cada
// resposta, resultado com a lista (abre na Bíblia), treino dos errados (sem XP) e versículos guardados no coração.
import { useState } from "react";
import { ACERTOS_PARA_GUARDAR, montarSessao, sessaoDosErrados, versiculosGuardados, type Pergunta } from "@/lib/chama-acesa/pratica";
import { XP } from "@/lib/chama-acesa/regras";
import { TALENTOS_GANHO } from "@/lib/chama-acesa/talentos";
import { Chama } from "./Chama";
import { IconeCheck } from "./Icones";

type Banco = Parameters<typeof montarSessao>[0];
interface Resposta { id: string; referencia: string; texto: string; certo: boolean }

export function Desafio({ banco, vistos, versos, onFim, onSair, onAbrirVersiculo }: {
  banco: Banco;
  vistos: Record<string, number>;
  /** Acertos por versículo antes desta sessão (para mostrar os guardados no coração). */
  versos: Record<string, number> | undefined;
  onFim: (acertos: number, ids: string[], certos: string[]) => Promise<unknown>;
  onSair: () => void;
  onAbrirVersiculo: (referencia: string) => void;
}) {
  const [rodada, setRodada] = useState<{ perguntas: Pergunta[]; treino: boolean }>(() => ({ perguntas: montarSessao(banco, vistos), treino: false }));
  const [i, setI] = useState(0);
  const [escolha, setEscolha] = useState<number | null>(null);
  const [respostas, setRespostas] = useState<Resposta[]>([]);
  const [seguidas, setSeguidas] = useState(0);
  const [fim, setFim] = useState(false);
  const [enviando, setEnviando] = useState(false);
  // Guarda a 1ª sessão (a que vale XP) para o "treinar os que errei" e para os guardados.
  const [principal, setPrincipal] = useState<{ perguntas: Pergunta[]; respostas: Resposta[] } | null>(null);

  const { perguntas, treino } = rodada;
  const total = perguntas.length;
  if (total === 0) {
    return (
      <div className="ch-cheia">
        <p>Ainda não há versículos para o desafio.</p>
        <button type="button" className="ch-btn" onClick={onSair}>Voltar</button>
      </div>
    );
  }

  const acertos = respostas.filter((r) => r.certo).length;

  if (fim) {
    const perfeita = !treino && total === 5 && acertos === 5;
    const xp = treino ? 0 : acertos * XP.acertoPratica + (perfeita ? XP.praticaPerfeita : 0);
    const base = principal?.respostas ?? respostas;
    const errados = base.filter((r) => !r.certo).map((r) => r.id);
    const depois = { ...(versos ?? {}) };
    if (!treino) for (const r of respostas) if (r.certo) depois[r.id] = (depois[r.id] ?? 0) + 1;
    const guardados = versiculosGuardados(depois);
    const novos = treino ? [] : respostas.filter((r) => r.certo && (versos?.[r.id] ?? 0) < ACERTOS_PARA_GUARDAR && depois[r.id] >= ACERTOS_PARA_GUARDAR);
    return (
      <div className="ch-cheia ch-desafio-fim">
        <Chama dias={acertos >= Math.ceil(total * 0.6) ? 7 : 2} acendendo tamanho={92} />
        <h1>{treino ? "Treino concluído" : perfeita ? "Sessão perfeita!" : "Desafio concluído"}</h1>
        {!treino && (
          <p className="ch-desafio-ganho">
            <b>+{xp} XP</b>
            {perfeita && <span> e +{TALENTOS_GANHO.praticaPerfeita} talentos</span>}
          </p>
        )}
        <p className="ch-suave">Você acertou {acertos} de {total}. Toque num versículo para ler o capítulo na Bíblia.</p>

        <ul className="ch-desafio-lista">
          {respostas.map((r) => (
            <li key={r.id}>
              <button type="button" onClick={() => onAbrirVersiculo(r.referencia)} aria-label={`${r.certo ? "Acertou" : "Errou"}: ${r.referencia}. Abrir na Bíblia`}>
                <span className={`marca ${r.certo ? "certa" : "errada"}`} aria-hidden="true">{r.certo ? <IconeCheck tam={16} largura={3} /> : "✕"}</span>
                <span className="tx">
                  <b>{r.referencia}</b>
                  <small>{r.texto}</small>
                </span>
              </button>
            </li>
          ))}
        </ul>

        {!treino && (
          <div className="ch-guardados">
            <p>
              <b>{guardados === 1 ? "1 versículo guardado" : `${guardados} versículos guardados`}</b> no coração.
              {novos.length > 0 ? ` Agora entrou ${novos.map((n) => n.referencia).join(" e ")}.` : ` Acerte o mesmo versículo ${ACERTOS_PARA_GUARDAR} vezes para guardá-lo.`}
            </p>
            <small>“Escondi a tua palavra no meu coração.” Salmos 119:11</small>
          </div>
        )}

        {errados.length > 0 && !treino && (
          <button
            type="button"
            className="ch-btn ch-btn-claro"
            onClick={() => {
              const base_ = principal ?? { perguntas, respostas };
              setPrincipal(base_);
              setRodada({ perguntas: sessaoDosErrados(base_.perguntas, errados), treino: true });
              setI(0); setEscolha(null); setRespostas([]); setSeguidas(0); setFim(false);
            }}
          >
            Treinar {errados.length === 1 ? "o que errei" : `os ${errados.length} que errei`}
          </button>
        )}
        <button type="button" className="ch-btn ch-btn-grande" onClick={onSair}>Continuar</button>
      </div>
    );
  }

  const p = perguntas[i];
  const respondeu = escolha !== null;
  const acertou = escolha === p.correta;
  const ultima = i + 1 >= total;
  const tudoCertoAteAqui = acertos === i && !treino && total === 5;
  const xpSessao = treino ? 0 : acertos * XP.acertoPratica;

  const responder = (k: number) => {
    if (respondeu) return;
    setEscolha(k);
    const certo = k === p.correta;
    setSeguidas((s) => (certo ? s + 1 : 0));
    setRespostas((rs) => [...rs, { id: p.id, referencia: p.referencia, texto: p.texto, certo }]);
    // Mostra o versículo inteiro (fica abaixo das opções, acima do botão Continuar).
    window.setTimeout(() => document.querySelector(".ch-desafio .ch-feedback")?.scrollIntoView({ behavior: "smooth", block: "center" }), 60);
  };

  const continuar = async () => {
    if (!ultima) {
      setI(i + 1);
      setEscolha(null);
      return;
    }
    if (!treino) {
      setEnviando(true);
      await onFim(respostas.filter((r) => r.certo).length, perguntas.map((x) => x.id), respostas.filter((r) => r.certo).map((r) => r.id));
      setEnviando(false);
    }
    setFim(true);
  };

  return (
    <div className="ch-cheia ch-passo ch-desafio">
      <div className="ch-pratica-topo">
        <button type="button" onClick={onSair} aria-label="Sair do desafio">✕</button>
        <div className="ch-barra" role="progressbar" aria-label="Progresso do desafio" aria-valuemin={0} aria-valuemax={total} aria-valuenow={i + (respondeu ? 1 : 0)}>
          <i style={{ width: `${((i + (respondeu ? 1 : 0)) / total) * 100}%` }} />
        </div>
        <span className={`ch-seguidas${seguidas >= 2 ? " acesa" : ""}`} key={seguidas} aria-live="polite" aria-label={seguidas >= 2 ? `${seguidas} acertos seguidos` : undefined}>
          <Chama dias={Math.min(30, seguidas * 3)} tamanho={22} />
          {seguidas >= 2 && <b>{seguidas}</b>}
        </span>
      </div>
      <p className="ch-desafio-status">
        {treino ? "Treino: sem XP, só para fixar" : ultima && !respondeu ? (tudoCertoAteAqui ? "Última! Acerte e a sessão fica perfeita." : "Última pergunta.") : `${xpSessao} XP nesta sessão`}
      </p>

      <h2 className="ch-desafio-pergunta">{p.tipo === "lacuna" ? "Complete a palavra que falta" : "De onde é este versículo?"}</h2>
      <p className="ch-trecho">{p.trecho}</p>
      <div className="ch-opcoes">
        {p.opcoes.map((o, k) => (
          <button key={o} type="button" disabled={respondeu} className={respondeu ? (k === p.correta ? "certa" : k === escolha ? "errada" : "") : ""} onClick={() => responder(k)}>
            {o}
          </button>
        ))}
      </div>

      {respondeu && (
        <>
          <div className={`ch-feedback ${acertou ? "certa" : "errada"}`} role="status">
            <b>{acertou ? (seguidas >= 3 ? `${seguidas} seguidas!` : treino ? "Certo!" : `Certo! +${XP.acertoPratica} XP`) : `A resposta é: ${p.opcoes[p.correta]}`}</b>
            <blockquote>{p.texto}</blockquote>
            <small>{p.referencia}</small>
          </div>
          <div className="ch-rodape">
            <button type="button" className="ch-btn ch-btn-grande" disabled={enviando} onClick={() => void continuar()}>{ultima ? "Ver resultado" : "Continuar"}</button>
          </div>
        </>
      )}
    </div>
  );
}
