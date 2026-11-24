"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ajustarFonte, CHAVE_BIBLIA_FONTE, CREDITO_BIBLIA, filtrarLivros, FONTE_PADRAO, FONTES_BIBLIA, lerUltimo, LINK_LICENCA_BIBLIA, salvarUltimo, vizinho,
  type LivroIndice, type LivroTexto, type Posicao,
} from "@/lib/chama-acesa/biblia";

const BASE = "/chama-acesa/biblia";
const cacheLivros = new Map<string, LivroTexto>();
let cacheIndice: LivroIndice[] | null = null;

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

/** Aba Bíblia: grátis para sempre, fora da jornada (não conta dia, não mexe na chama). */
export function Biblia() {
  const [indice, setIndice] = useState<LivroIndice[] | null>(cacheIndice);
  const [erro, setErro] = useState("");
  const [busca, setBusca] = useState("");
  const [livro, setLivro] = useState<LivroIndice | null>(null);
  const [leitura, setLeitura] = useState<Posicao | null>(null);
  const [, setCarregou] = useState(0);
  const [fonte, setFonte] = useState(lerFonte);
  const [tentativa, setTentativa] = useState(0);
  const topo = useRef<HTMLDivElement>(null);

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

  const abrir = (p: Posicao) => {
    setLeitura(p);
    salvarUltimo(p);
    setErro("");
    window.scrollTo({ top: 0 });
  };
  const mudarFonte = (passo: 1 | -1) => {
    const n = ajustarFonte(fonte, passo);
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

  // ------------------------------------------------ leitura do capítulo
  if (leitura && indice) {
    const info = indice.find((l) => l.sigla === leitura.sigla);
    const versiculos = texto?.capitulos[leitura.cap - 1];
    const ant = vizinho(indice, leitura, -1);
    const prox = vizinho(indice, leitura, 1);
    return (
      <section className="ch-tela ch-biblia" ref={topo}>
        <div className="ch-biblia-barra">
          <button type="button" className="ch-link voltar" onClick={() => { setLeitura(null); setLivro(info ?? null); }}>‹ {info?.nome ?? "Livros"}</button>
          <div className="ch-biblia-fonte" role="group" aria-label="Tamanho da letra">
            <button type="button" onClick={() => mudarFonte(-1)} disabled={fonte === FONTES_BIBLIA[0]} aria-label="Diminuir a letra">A-</button>
            <button type="button" onClick={() => mudarFonte(1)} disabled={fonte === FONTES_BIBLIA[FONTES_BIBLIA.length - 1]} aria-label="Aumentar a letra">A+</button>
          </div>
        </div>
        <h1>{info?.nome} {leitura.cap}</h1>
        {falha}
        {!versiculos && !erro && <p className="ch-suave">Abrindo…</p>}
        {versiculos && (
          <div className="ch-biblia-texto" style={{ fontSize: fonte }}>
            {versiculos.map((v, i) => (
              <p key={i}><sup>{i + 1}</sup> {v}</p>
            ))}
          </div>
        )}
        <div className="ch-biblia-nav">
          <button type="button" className="ch-btn ch-btn-claro" disabled={!ant} onClick={() => ant && abrir(ant)}>‹ Anterior</button>
          <button type="button" className="ch-btn ch-btn-claro" disabled={!prox} onClick={() => prox && abrir(prox)}>Próximo ›</button>
        </div>
        {credito}
      </section>
    );
  }

  // ------------------------------------------------ escolha do capítulo
  if (livro) {
    return (
      <section className="ch-tela ch-biblia">
        <button type="button" className="ch-link voltar" onClick={() => setLivro(null)}>‹ Todos os livros</button>
        <h1>{livro.nome}</h1>
        <p className="ch-suave">Escolha o capítulo.</p>
        <div className="ch-biblia-grade">
          {Array.from({ length: livro.capitulos }, (_, i) => i + 1).map((n) => (
            <button key={n} type="button" onClick={() => abrir({ sigla: livro.sigla, cap: n })}>{n}</button>
          ))}
        </div>
        {credito}
      </section>
    );
  }

  // ------------------------------------------------ lista de livros
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
  return (
    <section className="ch-tela ch-biblia">
      <h1>Bíblia</h1>
      <p className="ch-suave">Grátis para sempre. Ler aqui não muda a sua jornada nem a sua chama.</p>
      {falha}
      {!indice && !erro && <p className="ch-suave">Abrindo…</p>}
      {indice && (
        <>
          {ultimo && nomeUltimo && (
            <button type="button" className="ch-btn" onClick={() => abrir(ultimo)}>Continuar: {nomeUltimo} {ultimo.cap}</button>
          )}
          <input className="ch-biblia-busca" type="search" inputMode="search" placeholder="Buscar livro (ex.: João, Salmos)" value={busca} onChange={(e) => setBusca(e.target.value)} aria-label="Buscar livro" />
          {grupo("at", "Antigo Testamento")}
          {grupo("nt", "Novo Testamento")}
          {filtrados.length === 0 && <p className="ch-suave">Nenhum livro com esse nome.</p>}
        </>
      )}
      {credito}
    </section>
  );
}
