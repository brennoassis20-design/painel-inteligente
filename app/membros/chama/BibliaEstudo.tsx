"use client";

import { useMemo, useState } from "react";
import type { Posicao } from "@/lib/chama-acesa/biblia";
import type { PainelBiblia } from "@/lib/chama-acesa/armazem-biblia";
import { agruparNotasPorLivro, filtrarNotas, referenciaDaNota, temasDasNotas, type AcaoBiblia } from "@/lib/chama-acesa/biblia-estudo";
import { AVISO_IA } from "@/lib/chama-acesa/biblia-ia";
import type { AbrirOpcoes } from "./Biblia";

/** Estudo (estilo pregador): "Minhas notas" buscáveis, por tema/sermão, agrupadas por livro. Notas e destaques nascem no leitor. */
export function BibliaEstudo({ painel, agir, onAbrir }: { painel: PainelBiblia | null; agir: (a: AcaoBiblia) => Promise<boolean>; onAbrir: (p: Posicao, o?: AbrirOpcoes) => void }) {
  const [busca, setBusca] = useState("");
  const [tema, setTema] = useState("");
  const [apagando, setApagando] = useState<string | null>(null);
  const notas = painel?.estado.notas;
  const temas = useMemo(() => temasDasNotas(notas ?? []), [notas]);
  const grupos = useMemo(() => agruparNotasPorLivro(filtrarNotas(notas ?? [], busca, tema)), [notas, busca, tema]);
  if (!painel) return <div><h1>Estudo</h1><p className="ch-suave">Abrindo…</p></div>;
  const total = painel.estado.notas.length;
  const mostradas = grupos.reduce((s, g) => s + g.notas.length, 0);
  return (
    <div className="ch-tela">
      <h1>Estudo</h1>
      <p className="ch-suave">No leitor, toque nos versículos para anotar, destacar ou pedir uma explicação. Suas notas ficam todas aqui.</p>
      <h2>Minhas notas</h2>
      {total === 0 ? (
        <article className="ch-card">
          <p>Você ainda não tem notas. Abra um capítulo, toque num versículo e escolha <b>Nota</b>.</p>
        </article>
      ) : (
        <>
          <input className="ch-biblia-busca" type="search" inputMode="search" placeholder="Buscar nas notas (texto, tema ou livro)" value={busca} onChange={(e) => setBusca(e.target.value)} aria-label="Buscar nas notas" />
          {temas.length > 0 && (
            <div className="ch-temas" role="group" aria-label="Filtrar por tema ou sermão">
              <button type="button" className={!tema ? "on" : ""} aria-pressed={!tema} onClick={() => setTema("")}>Todos</button>
              {temas.map((t) => (
                <button key={t} type="button" className={tema === t ? "on" : ""} aria-pressed={tema === t} onClick={() => setTema(tema === t ? "" : t)}>{t}</button>
              ))}
            </div>
          )}
          <p className="ch-suave" role="status">{mostradas === total ? `${total} ${total === 1 ? "nota" : "notas"}` : `${mostradas} de ${total} notas`}</p>
          {grupos.map((g) => (
            <section key={g.sigla} aria-label={g.nome}>
              <h3 className="ch-livro-notas">{g.nome} <small>({g.notas.length})</small></h3>
              <ul className="ch-notas">
                {g.notas.map((n) => (
                  <li key={n.id} className="ch-nota-cartao">
                    <button type="button" className="ch-ref-btn" onClick={() => onAbrir({ sigla: n.sigla, cap: n.cap }, { versiculo: n.vIni })}>{referenciaDaNota(n)} ›</button>
                    {n.tema && <span className="ch-tag">{n.tema}</span>}
                    <p>{n.texto}</p>
                    <div className="ch-nota-acoes">
                      <button type="button" className="ch-link" onClick={() => onAbrir({ sigla: n.sigla, cap: n.cap }, { versiculo: n.vIni })}>Abrir e editar</button>
                      {apagando === n.id ? (
                        <>
                          <button type="button" className="ch-link perigo" onClick={async () => { await agir({ tipo: "apagarNota", id: n.id }); setApagando(null); }}>Apagar mesmo</button>
                          <button type="button" className="ch-link" onClick={() => setApagando(null)}>Cancelar</button>
                        </>
                      ) : (
                        <button type="button" className="ch-link perigo" onClick={() => setApagando(n.id)}>Apagar</button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
          {mostradas === 0 && <p className="ch-suave">Nenhuma nota com essa busca.</p>}
        </>
      )}
      <p className="ch-aviso-ia">Contexto do capítulo e explicação de versículos ficam no leitor. {AVISO_IA}</p>
    </div>
  );
}
