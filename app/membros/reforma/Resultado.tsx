"use client";

import { useMemo, useState } from "react";
import { PARAMETROS_PADRAO } from "@/lib/reforma/padrao";
import { calcularCliente, descricaoReducao, reducaoEfetiva, ROTULO_REGIME, type Cliente, type Escritorio } from "@/lib/reforma-app/modelo";
import { lerPercentualBR } from "@/lib/reforma-app/numeros";
import {
  ANOS, ANO_FINAL, ANO_HOJE, ANO_PADRAO, bloco, ehSimples, frase, grafico, linhasHoje, opcao, pc, prazosSimples, r$, reaj, recomendar, selo,
} from "@/lib/reforma-app/resultado";
import { acharSetor } from "@/lib/reforma-app/setores";
import { Grafico } from "./Grafico";

type Estado = { fase: "pronto" } | { fase: "gerando" } | { fase: "erro"; texto: string } | { fase: "baixado"; whats: string };

export function Resultado({ cliente, escritorio, onEditar, onVoltar }: { cliente: Cliente; escritorio: Escritorio; onEditar: () => void; onVoltar: () => void }) {
  const [ano, setAno] = useState(ANO_PADRAO);
  const [estado, setEstado] = useState<Estado>({ fase: "pronto" });
  const calc = useMemo(() => calcularCliente(cliente.form), [cliente.form]);
  const f = cliente.form;

  if (!calc.ok) {
    return (
      <div className="rf-tela">
        <button type="button" className="gp-back rf-voltar" onClick={onVoltar}>
          ‹ Clientes
        </button>
        <div className="rf-status erro" role="alert">
          <b>Não foi possível calcular:</b>
          <ul>
            {calc.erros.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </div>
        <button type="button" className="gp-btn gp-btn-gold rf-grande" onClick={onEditar}>
          Corrigir os dados
        </button>
      </div>
    );
  }

  const res = calc.resultado;
  const a = res.anos[ano];
  const pj = lerPercentualBR(f.pctPJ) ?? "0";
  const simples = ehSimples(res);
  const mei = res.regime === "mei";
  const red = reducaoEfetiva(f);
  const rec = recomendar(res, ano, pj);
  const linhas = linhasHoje(res);
  const sl = selo(res, ano);
  const setor = acharSetor(f.setorId);
  const opAtual = opcao(a, "regime_atual");
  const das = opcao(a, "das");
  const hib = opcao(a, "hibrido");
  const gDado = (c: string, y = ano) => `${y}:${c}`;

  const gerar = async (modo: "baixar" | "whatsapp") => {
    setEstado({ fase: "gerando" });
    try {
      const { gerarPdf, nomeArquivo, textoWhatsApp, linkWhatsApp } = await import("@/lib/reforma-app/pdf");
      const blob = await gerarPdf({ cliente, escritorio, ano });
      const nome = nomeArquivo(f.nome);
      const arquivo = new File([blob], nome, { type: "application/pdf" });
      const texto = textoWhatsApp(f.nome, escritorio.nome);
      if (modo === "whatsapp" && typeof navigator !== "undefined" && navigator.canShare?.({ files: [arquivo] })) {
        try {
          await navigator.share({ files: [arquivo], text: texto, title: nome });
          setEstado({ fase: "pronto" });
          return;
        } catch (e) {
          if (e instanceof DOMException && e.name === "AbortError") {
            setEstado({ fase: "pronto" });
            return;
          }
        }
      }
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = nome;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 10000);
      if (modo === "whatsapp") {
        const wa = linkWhatsApp(texto);
        window.open(wa, "_blank", "noopener");
        setEstado({ fase: "baixado", whats: wa });
      } else setEstado({ fase: "pronto" });
    } catch (e) {
      setEstado({ fase: "erro", texto: e instanceof Error ? e.message : "Não deu para gerar o PDF." });
    }
  };

  return (
    <div className="rf-tela rf-resultado">
      <header className="rf-res-topo">
        <button type="button" className="gp-back rf-voltar" onClick={onVoltar}>
          ‹ Clientes
        </button>
        <div className="rf-res-titulo">
          <h1>{f.nome}</h1>
          <p className="gp-muted">
            {ROTULO_REGIME[res.regime]}
            {f.regime === "simples" ? ` · Anexo ${f.anexo}` : ""} · {setor?.nome} · {f.municipio}/{f.uf}
          </p>
          {red.aplicada && <span className="gp-pill warn">Redução de {Math.round(Number(red.percentual) * 100)}% ({descricaoReducao(f.reducaoCodigo).split(" (")[0]})</span>}
        </div>
        <button type="button" className="gp-btn gp-btn-ghost rf-medio" onClick={onEditar}>
          Editar dados
        </button>
      </header>

      <div className="rf-anos" role="group" aria-label="Ano em análise">
        <span>Ano em análise</span>
        <div>
          {ANOS.map((y) => (
            <button key={y} type="button" className={y === ano ? "on" : ""} aria-pressed={y === ano} onClick={() => setAno(y)}>
              {y === ANO_HOJE ? "Hoje" : y}
            </button>
          ))}
        </div>
      </div>

      {/* 1. resumo em uma frase */}
      <section className="rf-card rf-resumo" aria-label="Resumo">
        <span className="gp-eyebrow">Resumo</span>
        <p data-teste="frase">{frase(res, ano, f.nome, pj)}</p>
        {a.semGabarito && <p className="rf-validacao">Faixa ainda em validação: este ano usa parâmetros estimados.</p>}
      </section>

      {/* PDF */}
      <section className="rf-card rf-pdf" aria-label="PDF para o cliente">
        <h2>PDF para o seu cliente</h2>
        <p className="gp-muted">Com a logo e as cores do {escritorio.nome || "escritório"}. Ano em foco: {ano === ANO_HOJE ? "hoje" : ano}.</p>
        <div className="rf-acoes">
          <button type="button" className="gp-btn gp-btn-gold rf-grande" onClick={() => void gerar("baixar")} disabled={estado.fase === "gerando"}>
            {estado.fase === "gerando" ? "Gerando o PDF…" : "Baixar PDF"}
          </button>
          <button type="button" className="gp-btn gp-btn-ghost rf-grande" onClick={() => void gerar("whatsapp")} disabled={estado.fase === "gerando"}>
            Enviar no WhatsApp
          </button>
        </div>
        {estado.fase === "baixado" && (
          <p className="rf-status ok" role="status">
            O PDF foi baixado. No WhatsApp que abriu, escolha o contato, toque no clipe (anexar) e envie o arquivo.{" "}
            <a href={estado.whats} target="_blank" rel="noreferrer">
              Abrir o WhatsApp de novo
            </a>
          </p>
        )}
        {estado.fase === "erro" && (
          <p className="rf-erro" role="alert">
            {estado.texto}
          </p>
        )}
      </section>

      {/* 2. Hoje x 2027 x 2033 */}
      <section className="rf-card" aria-label="Hoje, 2027 e 2033">
        <h2>{simples ? "Preço para manter a margem" : mei ? "Guia mensal do MEI" : "Imposto sobre consumo por mês"}</h2>
        <p className="gp-muted">Hoje × {ANO_PADRAO} × {ANO_FINAL}</p>
        <div className="rf-tabela-rol">
          {simples ? (
            <table className="rf-tabela">
              <thead>
                <tr>
                  <th scope="col">Opção</th>
                  {[ANO_HOJE, ANO_PADRAO, ANO_FINAL].map((y) => (
                    <th key={y} scope="col">
                      {y === ANO_HOJE ? "Hoje" : y}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(["das", "hibrido"] as const).map((id) => (
                  <tr key={id}>
                    <th scope="row">{id === "das" ? "Dentro do DAS" : "Híbrido"}</th>
                    {[ANO_HOJE, ANO_PADRAO, ANO_FINAL].map((y) => {
                      const o = opcao(res.anos[y], id)!;
                      return (
                        <td key={y} data-g={gDado(id === "das" ? "p_dentro" : "preco_hib", y)}>
                          {r$(o.precoNecessario)}
                          <small>{y === ANO_HOJE ? "" : reaj(o.reajustePreco)}</small>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="rf-tabela">
              <thead>
                <tr>
                  <th scope="col"> </th>
                  {linhas.map((l) => (
                    <th key={l.ano} scope="col">
                      {l.rotulo}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th scope="row">{mei ? "Guia por mês" : "R$ por mês"}</th>
                  {linhas.map((l) => (
                    <td key={l.ano} data-g={gDado("total", l.ano)}>
                      {r$(l.valor)}
                    </td>
                  ))}
                </tr>
                {!mei && (
                  <tr>
                    <th scope="row">% da receita</th>
                    {linhas.map((l) => (
                      <td key={l.ano} data-g={gDado("pct_receita", l.ano)}>
                        {pc(l.pct)}
                      </td>
                    ))}
                  </tr>
                )}
                <tr>
                  <th scope="row">Diferença para hoje</th>
                  {linhas.map((l) => (
                    <td key={l.ano} data-g={gDado("delta", l.ano)}>
                      {l.ano === ANO_HOJE ? "—" : r$(l.delta)}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* 3. DAS x híbrido ou preço */}
      {simples && das && hib && (
        <section className="rf-card" aria-label="DAS ou híbrido">
          <h2>DAS × híbrido em {ano === ANO_HOJE ? "hoje" : ano}</h2>
          <div className="rf-tabela-rol">
            <table className="rf-tabela rf-duas">
              <thead>
                <tr>
                  <th scope="col"> </th>
                  <th scope="col">Dentro do DAS</th>
                  <th scope="col">Híbrido</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th scope="row">Preço para manter a margem</th>
                  <td data-g={gDado("p_dentro")}>{r$(das.precoNecessario)}</td>
                  <td data-g={gDado("preco_hib")}>{r$(hib.precoNecessario)}</td>
                </tr>
                <tr>
                  <th scope="row">Custo real para o cliente empresa</th>
                  <td>{r$(das.custoRealClientePJ)}</td>
                  <td>{r$(hib.custoRealClientePJ)}</td>
                </tr>
                <tr>
                  <th scope="row">Margem se o preço não mudar</th>
                  <td>{pc(das.margemSeManterPreco)}</td>
                  <td>{pc(hib.margemSeManterPreco)}</td>
                </tr>
                <tr>
                  <th scope="row">Reajuste de preço</th>
                  <td data-g={gDado("reaj_dentro")}>{reaj(das.reajustePreco)}</td>
                  <td data-g={gDado("reaj_hib")}>{reaj(hib.reajustePreco)}</td>
                </tr>
              </tbody>
            </table>
          </div>
          {rec && (
            <div className={`rf-recomenda ${rec.escolha}`}>
              <span className="gp-eyebrow">Recomendação</span>
              <h3>{rec.titulo}</h3>
              <ul>
                {rec.porque.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
              {rec.proximosPassos.map((p) => (
                <p key={p} className="rf-prazo">
                  {p}
                </p>
              ))}
            </div>
          )}
          <details className="rf-detalhe">
            <summary>Prazos do Simples</summary>
            <ul className="rf-prazos">
              {prazosSimples().map((p) => (
                <li key={p.codigo}>
                  {p.texto} <small>({p.fonte})</small>
                </li>
              ))}
            </ul>
          </details>
        </section>
      )}

      {!simples && !mei && opAtual && (
        <section className="rf-card" aria-label="Preço">
          <h2>Preço em {ano === ANO_HOJE ? "hoje" : ano}</h2>
          <div className="rf-tabela-rol">
            <table className="rf-tabela rf-duas">
              <tbody>
                <tr>
                  <th scope="row">Preço para manter a margem</th>
                  <td data-g={gDado("preco_final")}>{r$(opAtual.precoNecessario)}</td>
                </tr>
                <tr>
                  <th scope="row">Custo real para o cliente empresa</th>
                  <td>{r$(opAtual.custoRealClientePJ)}</td>
                </tr>
                <tr>
                  <th scope="row">Margem se o preço não mudar</th>
                  <td>{pc(opAtual.margemSeManterPreco)}</td>
                </tr>
                <tr>
                  <th scope="row">Reajuste de preço</th>
                  <td data-g={gDado("reajuste")}>{reaj(opAtual.reajustePreco)}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="rf-nota">O CBS/IBS é cobrado por fora e repassado no preço. O imposto recolhido aparece na memória de cálculo.</p>
        </section>
      )}

      {/* 4. linha do tempo */}
      <section className="rf-card" aria-label="Linha do tempo 2026 a 2033">
        <h2>Linha do tempo 2026–2033</h2>
        <Grafico dados={grafico(res)} anoFoco={ano} />
      </section>

      {/* 6. memória */}
      <section className="rf-card" aria-label="Memória de cálculo">
        <details className="rf-memoria">
          <summary>Memória de cálculo ({a.memoria.length} linhas, {ano === ANO_HOJE ? "hoje" : ano})</summary>
          <ol>
            {a.memoria.map((l, i) => (
              <li key={i}>
                <b>{l.rotulo}</b>
                <span className="rf-formula">{l.formula}</span>
                <strong>{l.unidade === "R$" ? r$(l.valor) : l.unidade === "%" ? pc(l.valor, 4) : l.valor}</strong>
                <small>Fonte: {l.fonte}</small>
              </li>
            ))}
            {!mei && (
              <li>
                <b>Imposto recolhido pela empresa no mês</b>
                <span className="rf-formula">Soma dos tributos de consumo, antes de repassar no preço.</span>
                <strong>{r$(bloco(a).total ?? opAtual?.impostoRecolhido)}</strong>
                <small>Fonte: motor de cálculo</small>
              </li>
            )}
          </ol>
        </details>
      </section>

      {/* 7. selo */}
      <section className="rf-selo" aria-label="Estimativa">
        <h2>Estimativa, apoio à decisão</h2>
        <p>
          Cálculo feito com as regras conhecidas em <b>{sl.atualizadoEm}</b> (versão {res.versaoParametros}). Não substitui a análise do contador.
        </p>
        {a.semGabarito && (
          <details className="rf-detalhe">
            <summary>Faixa ainda em validação</summary>
            <ul>
              {sl.emValidacao.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          </details>
        )}
        <details className="rf-detalhe">
          <summary>O que é estimativa nesta conta ({sl.estimativas.length + sl.atencao.length} avisos)</summary>
          <ul>
            {sl.estimativas.map((x) => (
              <li key={x.codigo + x.texto}>{x.texto}</li>
            ))}
            {sl.atencao.map((x) => (
              <li key={x.codigo + x.texto}>{x.texto}</li>
            ))}
          </ul>
        </details>
        <small className="gp-muted">Parâmetros atualizados em {PARAMETROS_PADRAO.atualizadoEm.split("-").reverse().join("/")}.</small>
      </section>
    </div>
  );
}
