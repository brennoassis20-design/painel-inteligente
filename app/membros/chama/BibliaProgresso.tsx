"use client";

import type { PainelBiblia } from "@/lib/chama-acesa/armazem-biblia";
import { progressoBiblia, sequenciaBiblia, situacaoDoPlano } from "@/lib/chama-acesa/biblia-estudo";

/** Progresso: % da Bíblia lida, dias seguidos de leitura (separado da chama), plano ativo e barrinhas por livro. */
export function BibliaProgresso({ painel, onAbrirLivro, onPlanos }: { painel: PainelBiblia | null; onAbrirLivro: (sigla: string) => void; onPlanos: () => void }) {
  if (!painel) return <div><h1>Progresso</h1><p className="ch-suave">Abrindo…</p></div>;
  const { estado, hoje } = painel;
  const p = progressoBiblia(estado.lidos);
  const seq = sequenciaBiblia(estado.dias, hoje);
  const sit = estado.plano ? situacaoDoPlano(estado.plano, hoje) : null;
  const grupo = (t: "at" | "nt", titulo: string) => (
    <section key={t}>
      <h2>{titulo}</h2>
      <ul className="ch-livros-prog">
        {p.porLivro.filter((l) => l.testamento === t).map((l) => (
          <li key={l.sigla}>
            <button type="button" onClick={() => onAbrirLivro(l.sigla)} aria-label={`${l.nome}: ${l.lidos} de ${l.total} capítulos lidos`}>
              <span className="nome">{l.nome}</span>
              <span className="barra" role="progressbar" aria-valuemin={0} aria-valuemax={l.total} aria-valuenow={l.lidos} aria-hidden="true"><i style={{ width: `${l.percentual}%` }} className={l.lidos === l.total ? "cheio" : ""} /></span>
              <span className="num">{l.lidos}/{l.total}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
  return (
    <div className="ch-tela">
      <h1>Progresso</h1>
      <article className="ch-card ch-prog-topo">
        <p className="ch-grande" aria-label={`${String(p.percentual).replace(".", ",")} por cento da Bíblia lida`}>{String(p.percentual).replace(".", ",")}%</p>
        <p className="ch-suave">da Bíblia lida · {p.lidos} de {p.total} capítulos</p>
        <div className="ch-barra" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(p.percentual)} aria-label="Bíblia lida"><i style={{ width: `${p.percentual}%` }} /></div>
      </article>
      <div className="ch-dois">
        <article className="ch-card">
          <p className="ch-etiqueta">Dias seguidos</p>
          <p className="ch-grande">🔥 {seq.atual}</p>
          <small className="ch-suave">{seq.lidoHoje ? "Você já leu hoje." : seq.atual ? "Leia hoje para manter." : "Leia hoje para começar."}</small>
        </article>
        <article className="ch-card">
          <p className="ch-etiqueta">Plano ativo</p>
          {sit ? (
            <>
              <p className="ch-grande">{sit.percentual}%</p>
              <small className="ch-suave">{sit.plano.nome}</small>
            </>
          ) : (
            <>
              <p className="ch-suave">Nenhum plano.</p>
              <button type="button" className="ch-link" onClick={onPlanos}>Escolher um plano</button>
            </>
          )}
        </article>
      </div>
      <p className="ch-suave">Os dias seguidos da leitura bíblica são separados da chama da jornada: ler a Bíblia aqui não mexe na sua chama.</p>
      {grupo("at", "Antigo Testamento")}
      {grupo("nt", "Novo Testamento")}
    </div>
  );
}
