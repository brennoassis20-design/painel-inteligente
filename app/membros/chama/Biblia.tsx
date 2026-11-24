"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CHAVE_BIBLIA_FONTE, CREDITO_BIBLIA, filtrarLivros, FONTE_PADRAO, FONTES_BIBLIA, lerUltimo, LINK_LICENCA_BIBLIA, salvarUltimo,
  type LivroIndice, type LivroTexto, type Posicao,
} from "@/lib/chama-acesa/biblia";
import type { ArmazemBiblia, PainelBiblia } from "@/lib/chama-acesa/armazem-biblia";
import { progressoBiblia, situacaoDoPlano, type AcaoBiblia } from "@/lib/chama-acesa/biblia-estudo";
import { BibliaLeitor } from "./BibliaLeitor";
import { BibliaPlanos } from "./BibliaPlanos";
import { BibliaProgresso } from "./BibliaProgresso";
import { BibliaEstudo } from "./BibliaEstudo";
import { Anel, IconeBusca } from "./Icones";

const BASE = "/chama-acesa/biblia";
const cacheLivros = new Map<string, LivroTexto>();
let cacheIndice: LivroIndice[] | null = null;
let ultimoPainel: PainelBiblia | null = null;

async function pegar<T>(url: string): Promise<T> {
  const r = await fetch(url);
  if (!r.ok) throw new Error("Não deu para abrir a Bíblia agora. Confira a conexão e tente de novo.");
  return (await r.json()) as T;
}

function lerFonte(): number {
  try {
    const n = Number(window.localStorage.getItem(CHAVE_BIBLIA_FONTE));
    return (FONTES_BIBLIA as readonly number[]).includes(n) ? n : FONTE_PADRAO;
  } catch {
    return FONTE_PADRAO;
  }
}

export type Secao = "ler" | "planos" | "progresso" | "estudo";
/** Leitura aberta a partir do plano: os capítulos do dia, na ordem, e qual dia concluir ao terminar. */
export interface ContextoLeitura { dia: number; caps: Posicao[]; nome: string }
export interface AbrirOpcoes { plano?: ContextoLeitura; versiculo?: number }

export interface AbaBibliaProps {
  /** Armazém da Bíblia (leitura, planos, notas, explicações). Sem ele só a leitura simples funciona. */
  biblia?: ArmazemBiblia;
  /** Pede a permissão de notificação (lembrete da leitura). Sem isso (bancada), só guarda o horário. */
  onAtivarPush?: () => Promise<void>;
}

/** Aba Bíblia: grátis para sempre, fora da jornada (não conta dia, não mexe na chama). Ler · Planos · Progresso · Estudo. */
export function Biblia({ biblia, onAtivarPush }: AbaBibliaProps) {
  const [indice, setIndice] = useState<LivroIndice[] | null>(cacheIndice);
  const [erro, setErro] = useState("");
  const [busca, setBusca] = useState("");
  const [mostrarBusca, setMostrarBusca] = useState(false);
  const [secao, setSecao] = useState<Secao>("ler");
  const [livro, setLivro] = useState<LivroIndice | null>(null);
  const [leitura, setLeitura] = useState<(Posicao & AbrirOpcoes) | null>(null);
  const [, setCarregou] = useState(0);
  const [fonte, setFonte] = useState(lerFonte);
  const [tentativa, setTentativa] = useState(0);
  const [painel, setPainel] = useState<PainelBiblia | null>(ultimoPainel);
  const [aviso, setAviso] = useState("");
  const avisoTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const toast = useCallback((m: string) => {
    setAviso(m);
    clearTimeout(avisoTimer.current);
    avisoTimer.current = setTimeout(() => setAviso(""), 3500);
  }, []);
  useEffect(() => () => clearTimeout(avisoTimer.current), []);

  // Estado da pessoa (plano, lidos, notas...).
  useEffect(() => {
    if (!biblia) return;
    let vivo = true;
    biblia
      .carregar()
      .then((p) => {
        ultimoPainel = p;
        if (vivo) setPainel(p);
      })
      .catch(() => vivo && !ultimoPainel && toast("Não deu para carregar o seu progresso agora. A leitura continua funcionando."));
    return () => {
      vivo = false;
    };
  }, [biblia, toast]);

  const agir = useCallback(
    async (acao: AcaoBiblia): Promise<boolean> => {
      if (!biblia) return false;
      try {
        const p = await biblia.agir(acao);
        ultimoPainel = p;
        setPainel(p);
        return true;
      } catch (e) {
        toast(e instanceof Error ? e.message : "Não deu para salvar agora. Tente de novo.");
        return false;
      }
    },
    [biblia, toast],
  );

  useEffect(() => {
    if (indice) return;
    let vivo = true;
    pegar<LivroIndice[]>(`${BASE}/indice.json`)
      .then((i) => {
        cacheIndice = i;
        if (vivo) {
          setIndice(i);
          setErro("");
        }
      })
      .catch((e) => vivo && setErro(e instanceof Error ? e.message : "Erro ao abrir a Bíblia."));
    return () => {
      vivo = false;
    };
  }, [indice, tentativa]);

  // Carrega o JSON do livro só quando abre (e guarda na memória; o navegador também faz cache).
  const sigla = leitura?.sigla;
  useEffect(() => {
    if (!sigla) return;
    if (cacheLivros.has(sigla)) return;
    let vivo = true;
    pegar<LivroTexto>(`${BASE}/${sigla}.json`)
      .then((t) => {
        cacheLivros.set(sigla, t);
        if (vivo) {
          setCarregou((n) => n + 1);
          setErro("");
        }
      })
      .catch((e) => vivo && setErro(e instanceof Error ? e.message : "Erro ao abrir o livro."));
    return () => {
      vivo = false;
    };
  }, [sigla, tentativa]);

  const texto = sigla ? cacheLivros.get(sigla) : undefined;
  const ultimo = indice ? lerUltimo(indice) : null;
  const filtrados = useMemo(() => (indice ? filtrarLivros(indice, busca) : []), [indice, busca]);

  const abrir = useCallback((p: Posicao, opcoes: AbrirOpcoes = {}) => {
    setLeitura({ ...p, ...opcoes });
    salvarUltimo(p);
    setErro("");
    window.scrollTo({ top: 0 });
  }, []);
  const mudarFonte = (n: number) => {
    setFonte(n);
    try {
      window.localStorage.setItem(CHAVE_BIBLIA_FONTE, String(n));
    } catch {
      /* ok */
    }
  };

  const credito = (
    <p className="ch-biblia-credito">
      {CREDITO_BIBLIA} ·{" "}
      <a href={LINK_LICENCA_BIBLIA} target="_blank" rel="noreferrer">ver a licença</a>
    </p>
  );
  const falha = erro && (
    <div className="ch-nota" role="alert">
      {erro}{" "}
      <button type="button" className="ch-link" onClick={() => setTentativa((t) => t + 1)}>Tentar de novo</button>
    </div>
  );
  const avisoTela = aviso && <p className="ch-toast" role="status">{aviso}</p>;

  // ------------------------------------------------ leitura do capítulo
  if (leitura && indice) {
    return (
      <>
        <BibliaLeitor
          indice={indice}
          posicao={leitura}
          versiculos={texto?.capitulos[leitura.cap - 1]}
          erro={falha || null}
          fonte={fonte}
          onFonte={mudarFonte}
          painel={painel}
          biblia={biblia}
          agir={agir}
          toast={toast}
          plano={leitura.plano}
          versiculoInicial={leitura.versiculo}
          onAbrir={abrir}
          onVoltar={() => {
            const info = indice.find((l) => l.sigla === leitura.sigla);
            const veioDoPlano = Boolean(leitura.plano);
            setLeitura(null);
            if (veioDoPlano) setSecao("planos");
            else if (secao === "ler") setLivro(info ?? null);
          }}
          rodape={credito}
        />
        {avisoTela}
      </>
    );
  }

  // ------------------------------------------------ escolha do capítulo
  if (secao === "ler" && livro) {
    return (
      <section className="ch-tela ch-biblia">
        <button type="button" className="ch-link voltar" onClick={() => setLivro(null)}>‹ Todos os livros</button>
        <h1>{livro.nome}</h1>
        <p className="ch-suave">Escolha o capítulo.</p>
        <div className="ch-biblia-grade">
          {Array.from({ length: livro.capitulos }, (_, i) => i + 1).map((n) => {
            const lido = painel?.estado.lidos[livro.sigla]?.includes(n);
            return (
              <button key={n} type="button" className={lido ? "lido" : ""} aria-label={`Capítulo ${n}${lido ? ", já lido" : ""}`} onClick={() => abrir({ sigla: livro.sigla, cap: n })}>{n}</button>
            );
          })}
        </div>
        {credito}
      </section>
    );
  }

  const cab = (
    <div className="ch-biblia-cab">
      <h1>Bíblia</h1>
      <button type="button" className="ch-icone-btn" aria-label="Buscar na Bíblia" aria-expanded={mostrarBusca} onClick={() => { setMostrarBusca((v) => !v); if (secao !== "ler" || livro) { setSecao("ler"); setLivro(null); } }}><IconeBusca /></button>
    </div>
  );
  const menu = biblia && (
    <div className="ch-biblia-menu" role="tablist" aria-label="Seções da Bíblia">
      {(
        [["ler", "Ler"], ["planos", "Planos"], ["progresso", "Progresso"], ["estudo", "Estudo"]] as const
      ).map(([id, nome]) => (
        <button key={id} type="button" role="tab" aria-selected={secao === id} className={secao === id ? "on" : ""} onClick={() => { setSecao(id); setLivro(null); window.scrollTo({ top: 0 }); }}>
          {nome}
        </button>
      ))}
    </div>
  );

  if (secao === "planos" && biblia) {
    return (
      <section className="ch-tela ch-biblia">
        {cab}
        {menu}
        <BibliaPlanos painel={painel} agir={agir} toast={toast} onAbrir={abrir} onAtivarPush={onAtivarPush} />
        {avisoTela}
      </section>
    );
  }
  if (secao === "progresso" && biblia) {
    return (
      <section className="ch-tela ch-biblia">
        {cab}
        {menu}
        <BibliaProgresso
          painel={painel}
          onAbrirLivro={(s) => {
            const l = indice?.find((x) => x.sigla === s);
            if (l) {
              setSecao("ler");
              setLivro(l);
              window.scrollTo({ top: 0 });
            }
          }}
          onPlanos={() => setSecao("planos")}
        />
      </section>
    );
  }
  if (secao === "estudo" && biblia) {
    return (
      <section className="ch-tela ch-biblia">
        {cab}
        {menu}
        <BibliaEstudo painel={painel} agir={agir} onAbrir={abrir} />
        {avisoTela}
      </section>
    );
  }

  // ------------------------------------------------ Ler: lista de livros
  const grupo = (t: "at" | "nt", titulo: string) => {
    const ls = filtrados.filter((l) => l.testamento === t);
    if (ls.length === 0) return null;
    return (
      <div key={t}>
        <h2>{titulo}</h2>
        <div className="ch-biblia-livros">
          {ls.map((l) => (
            <button key={l.sigla} type="button" onClick={() => setLivro(l)}>{l.nome}</button>
          ))}
        </div>
      </div>
    );
  };
  const nomeUltimo = ultimo ? indice?.find((l) => l.sigla === ultimo.sigla)?.nome : null;
  const sitPlano = painel?.estado.plano ? situacaoDoPlano(painel.estado.plano, painel.hoje) : null;
  const hojePlano = sitPlano?.hoje && !sitPlano.hoje.feito ? sitPlano.hoje : null;
  // "Continuar lendo": o plano de hoje (com anel do plano) ou o último capítulo lido (anel = % da Bíblia lida).
  const progresso = painel ? progressoBiblia(painel.estado.lidos) : null;
  const continuar = hojePlano && sitPlano
    ? { titulo: hojePlano.nome, sub: `Plano ${sitPlano.plano.nome} · dia ${hojePlano.dia} de ${sitPlano.total}`, pct: sitPlano.percentual, rotulo: `${sitPlano.percentual}% do plano`, abrir: () => abrir(hojePlano.capitulos[0], { plano: { dia: hojePlano.dia, caps: hojePlano.capitulos, nome: hojePlano.nome } }) }
    : ultimo && nomeUltimo
      ? { titulo: `${nomeUltimo} ${ultimo.cap}`, sub: progresso ? `${progresso.lidos} de ${progresso.total} capítulos da Bíblia lidos` : "Seu último capítulo", pct: progresso ? Math.round(progresso.percentual) : 0, rotulo: `${progresso ? Math.round(progresso.percentual) : 0}% da Bíblia lida`, abrir: () => abrir(ultimo) }
      : null;
  return (
    <section className="ch-tela ch-biblia">
      {cab}
      {menu}
      <p className="ch-suave" style={{ margin: 0 }}>Grátis para sempre. Ler aqui não muda a sua jornada nem a sua chama.</p>
      {falha}
      {!indice && !erro && <p className="ch-suave">Abrindo…</p>}
      {indice && (
        <>
          {continuar && (
            <button type="button" className="ch-continuar" onClick={continuar.abrir}>
              <span className="et">{hojePlano ? "Leitura de hoje" : "Continuar lendo"}</span>
              <span className="lin">
                <span><b>{continuar.titulo}</b><small>{continuar.sub}</small></span>
                <Anel pct={continuar.pct} tam={56} espessura={6} texto={`${continuar.pct}%`} tamTexto={12} rotulo={continuar.rotulo} />
              </span>
            </button>
          )}
          {hojePlano && ultimo && nomeUltimo && (
            <button type="button" className="ch-btn ch-btn-claro" onClick={() => abrir(ultimo)}>Continuar: {nomeUltimo} {ultimo.cap}</button>
          )}
          {(mostrarBusca || busca) && <input className="ch-biblia-busca" type="search" inputMode="search" placeholder="Buscar livro (ex.: João, Salmos)" value={busca} onChange={(e) => setBusca(e.target.value)} aria-label="Buscar livro" />}
          {grupo("at", "Antigo Testamento")}
          {grupo("nt", "Novo Testamento")}
          {filtrados.length === 0 && <p className="ch-suave">Nenhum livro com esse nome.</p>}
        </>
      )}
      {credito}
      {avisoTela}
    </section>
  );
}
