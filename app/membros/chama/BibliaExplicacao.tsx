"use client";

import { useEffect, useState } from "react";
import type { ArmazemBiblia, RespostaExplicacao } from "@/lib/chama-acesa/armazem-biblia";
import { AVISO_IA, explicacaoParaTexto, type PedidoExplicacao } from "@/lib/chama-acesa/biblia-ia";

/** Folha de baixo com a explicação (contexto do capítulo ou versículos). Cache compartilhado e limite diário ficam no servidor. */
export function ExplicacaoSheet({ titulo, pedido, biblia, onFechar }: { titulo: string; pedido: PedidoExplicacao; biblia: ArmazemBiblia; onFechar: () => void }) {
  const [tentativa, setTentativa] = useState(0);
  const [copiado, setCopiado] = useState(false);
  const [guardada, setGuardada] = useState<{ k: string; r: RespostaExplicacao } | null>(null);
  const chave = JSON.stringify(pedido);
  const k = `${chave}#${tentativa}`;

  useEffect(() => {
    let vivo = true;
    biblia
      .explicar(JSON.parse(chave) as PedidoExplicacao)
      .then((r) => vivo && setGuardada({ k, r }))
      .catch((e) => vivo && setGuardada({ k, r: { ok: false, motivo: "erro", mensagem: e instanceof Error ? e.message : "Não deu para gerar a explicação agora. Tente de novo em instantes." } }));
    return () => {
      vivo = false;
    };
  }, [biblia, chave, k]);
  const resp = guardada?.k === k ? guardada.r : null;

  const e = resp?.ok ? resp.explicacao : null;
  return (
    <div className="ch-sheet" role="dialog" aria-modal="true" aria-label={titulo}>
      <div className="ch-sheet-rolagem ch-explica">
        <h2>{titulo}</h2>
        {!resp && <p className="ch-suave" role="status">Preparando a explicação… isso pode levar alguns segundos.</p>}
        {resp && !resp.ok && (
          <div className="ch-nota" role="alert">
            {resp.mensagem}
            {resp.motivo === "erro" && <> <button type="button" className="ch-link" onClick={() => setTentativa((t) => t + 1)}>Tentar de novo</button></>}
          </div>
        )}
        {resp?.ok && resp.exemplo && <p className="ch-nota">Texto de exemplo da bancada de testes: a explicação de verdade vem da IA no app publicado.</p>}
        {e && (
          <>
            {(e.contexto || e.autorDestinatarios) && (
              <section>
                <h3>Contexto</h3>
                {e.contexto && <p>{e.contexto}</p>}
                {e.autorDestinatarios && <p><b>Autor e destinatários:</b> {e.autorDestinatarios}</p>}
              </section>
            )}
            {e.antesDepois && <section><h3>Antes e depois</h3><p>{e.antesDepois}</p></section>}
            {e.explicacao && <section><h3>Explicação</h3><p>{e.explicacao}</p></section>}
            {e.palavrasChave.length > 0 && (
              <section>
                <h3>Palavras-chave</h3>
                <ul>{e.palavrasChave.map((p, i) => <li key={i}><b>{p.palavra}</b>{p.original && <i> ({p.original})</i>}: {p.significado}</li>)}</ul>
              </section>
            )}
            {e.referencias.length > 0 && (
              <section>
                <h3>Referências cruzadas</h3>
                <ul>{e.referencias.map((r, i) => <li key={i}><b>{r.ref}</b>{r.motivo ? `: ${r.motivo}` : ""}</li>)}</ul>
              </section>
            )}
            {(e.pontosDeVista.length > 0 || e.consenso) && (
              <section>
                <h3>Pontos de vista</h3>
                {e.pontosDeVista.length > 0 && <ul>{e.pontosDeVista.map((p, i) => <li key={i}><b>{p.leitura}:</b> {p.descricao}</li>)}</ul>}
                {e.consenso && <p className="ch-suave">{e.consenso}</p>}
              </section>
            )}
            {e.aplicacao && <section><h3>Aplicação</h3><p>{e.aplicacao}</p></section>}
            {e.esboco.length > 0 && (
              <section>
                <h3>Esboço para pregação</h3>
                <ol>{e.esboco.map((t, i) => <li key={i}>{t}</li>)}</ol>
              </section>
            )}
            <button
              type="button"
              className="ch-btn ch-btn-claro"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(explicacaoParaTexto(titulo, e));
                  setCopiado(true);
                  setTimeout(() => setCopiado(false), 2500);
                } catch {
                  /* sem permissão de área de transferência */
                }
              }}
            >
              {copiado ? "Copiado ✓" : "Copiar tudo"}
            </button>
          </>
        )}
        <p className="ch-aviso-ia">{AVISO_IA}</p>
        <button type="button" className="ch-btn" onClick={onFechar}>Fechar</button>
      </div>
    </div>
  );
}
