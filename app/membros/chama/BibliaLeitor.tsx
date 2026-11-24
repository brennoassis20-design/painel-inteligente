"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ajustarFonte, FONTES_BIBLIA, vizinho, type LivroIndice, type Posicao } from "@/lib/chama-acesa/biblia";
import type { ArmazemBiblia, PainelBiblia } from "@/lib/chama-acesa/armazem-biblia";
import { capituloLido, CORES_DESTAQUE, MAX_TEMA, MAX_TEXTO_NOTA, NOMES_COR, referenciaDaNota, temasDasNotas, type AcaoBiblia, type CorDestaque, type Nota } from "@/lib/chama-acesa/biblia-estudo";
import { compactarVersiculos, formatarCitacao, type PedidoExplicacao } from "@/lib/chama-acesa/biblia-ia";
import type { AbrirOpcoes, ContextoLeitura } from "./Biblia";
import { ExplicacaoSheet } from "./BibliaExplicacao";

interface Props {
  indice: LivroIndice[];
  posicao: Posicao & AbrirOpcoes;
  versiculos: string[] | undefined;
  erro: ReactNode;
  fonte: number;
  onFonte: (n: number) => void;
  painel: PainelBiblia | null;
  biblia?: ArmazemBiblia;
  agir: (a: AcaoBiblia) => Promise<boolean>;
  toast: (m: string) => void;
  plano?: ContextoLeitura;
  versiculoInicial?: number;
  onAbrir: (p: Posicao, o?: AbrirOpcoes) => void;
  onVoltar: () => void;
  rodape: ReactNode;
}

interface NotaEdicao { id?: string; vIni: number; vFim: number; texto: string; tema: string }

/** Leitor do capítulo: toque nos versículos para selecionar (Nota, Destacar, Copiar, Enviar, Explicar), notas abaixo do versículo e "Li este capítulo". */
export function BibliaLeitor({ indice, posicao, versiculos, erro, fonte, onFonte, painel, biblia, agir, toast, plano, versiculoInicial, onAbrir, onVoltar, rodape }: Props) {
  const { sigla, cap } = posicao;
  const info = indice.find((l) => l.sigla === sigla);
  const estado = painel?.estado;
  const estudo = Boolean(biblia && estado);
  const [sel, setSel] = useState<number[]>([]);
  const [cores, setCores] = useState(false);
  const [nota, setNota] = useState<NotaEdicao | null>(null);
  const [pedido, setPedido] = useState<{ titulo: string; pedido: PedidoExplicacao } | null>(null);
  const [salvando, setSalvando] = useState(false);

  // Trocou de capítulo: limpa a seleção.
  const chaveCap = `${sigla}:${cap}`;
  const [chaveAnterior, setChaveAnterior] = useState(chaveCap);
  if (chaveAnterior !== chaveCap) {
    setChaveAnterior(chaveCap);
    setSel([]);
    setCores(false);
    setNota(null);
  }

  const rolou = useRef("");
  useEffect(() => {
    if (!versiculoInicial || !versiculos || rolou.current === chaveCap) return;
    rolou.current = chaveCap;
    document.getElementById(`v-${versiculoInicial}`)?.scrollIntoView({ block: "center" });
  }, [versiculoInicial, versiculos, chaveCap]);

  const destaques = useMemo(() => {
    const m = new Map<number, CorDestaque>();
    for (const d of estado?.destaques ?? []) if (d.sigla === sigla && d.cap === cap) m.set(d.v, d.cor);
    return m;
  }, [estado, sigla, cap]);
  const notasDoCap = useMemo(() => (estado?.notas ?? []).filter((n) => n.sigla === sigla && n.cap === cap), [estado, sigla, cap]);
  const notasPorFim = useMemo(() => {
    const m = new Map<number, Nota[]>();
    for (const n of notasDoCap) m.set(n.vFim, [...(m.get(n.vFim) ?? []), n]);
    return m;
  }, [notasDoCap]);

  const alternar = (v: number) => {
    if (!estudo) return;
    setCores(false);
    setSel((s) => (s.includes(v) ? s.filter((x) => x !== v) : [...s, v].sort((a, b) => a - b)));
  };

  const ordenados = [...sel].sort((a, b) => a - b);
  const refSel = `${info?.nome ?? sigla} ${cap}:${compactarVersiculos(ordenados).replace(/-/g, "–")}`;
  const citacao = () => formatarCitacao(sigla, cap, ordenados.map((v) => [v, versiculos?.[v - 1] ?? ""] as [number, string]));

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(citacao());
      toast("Texto copiado.");
      setSel([]);
    } catch {
      toast("Não deu para copiar. Segure o dedo sobre o texto para copiar.");
    }
  };
  const enviar = async () => {
    const texto = citacao();
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share({ text: texto });
        setSel([]);
      } catch {
        /* cancelou */
      }
      return;
    }
    await copiar();
  };
  const destacar = async (cor: CorDestaque | null) => {
    const ok = await agir({ tipo: "destaque", sigla, cap, versiculos: ordenados, cor });
    if (ok) {
      setSel([]);
      setCores(false);
    }
  };
  const salvarNota = async () => {
    if (!nota) return;
    setSalvando(true);
    const ok = await agir({ tipo: "nota", id: nota.id, sigla, cap, vIni: nota.vIni, vFim: nota.vFim, texto: nota.texto, tema: nota.tema });
    setSalvando(false);
    if (ok) {
      toast("Nota salva.");
      setNota(null);
      setSel([]);
    }
  };
  const apagarNota = async () => {
    if (!nota?.id) return;
    setSalvando(true);
    const ok = await agir({ tipo: "apagarNota", id: nota.id });
    setSalvando(false);
    if (ok) {
      toast("Nota apagada.");
      setNota(null);
    }
  };

  // Navegação: dentro dos capítulos do dia do plano, ou capítulo a capítulo.
  const iPlano = plano ? plano.caps.findIndex((p) => p.sigla === sigla && p.cap === cap) : -1;
  const ant = plano ? (iPlano > 0 ? plano.caps[iPlano - 1] : null) : vizinho(indice, { sigla, cap }, -1);
  const prox = plano ? (iPlano >= 0 && iPlano < plano.caps.length - 1 ? plano.caps[iPlano + 1] : null) : vizinho(indice, { sigla, cap }, 1);
  const ultimoDoPlano = Boolean(plano) && iPlano === plano!.caps.length - 1;
  const lido = estado ? capituloLido(estado, { sigla, cap }) : false;
  const diaFeito = plano && estado?.plano ? estado.plano.feitos.includes(plano.dia) : false;
  const [marcando, setMarcando] = useState(false);
  const marcarLido = async (valor: boolean) => {
    setMarcando(true);
    const ok = await agir({ tipo: "lido", sigla, cap, valor });
    setMarcando(false);
    if (ok && valor) toast("Capítulo lido. Bom trabalho!");
  };
  const concluirDia = async () => {
    if (!plano) return;
    setMarcando(true);
    const ok = await agir({ tipo: "marcarDia", dia: plano.dia });
    setMarcando(false);
    if (ok) {
      toast("Leitura de hoje concluída!");
      onVoltar();
    }
  };

  const temas = temasDasNotas(estado?.notas ?? []);

  return (
    <section className="ch-tela ch-biblia" style={sel.length ? { paddingBottom: 150 } : undefined}>
      <div className="ch-biblia-barra">
        <button type="button" className="ch-link voltar" onClick={onVoltar}>‹ {plano ? "Planos" : info?.nome ?? "Livros"}</button>
        <div className="ch-biblia-fonte" role="group" aria-label="Tamanho da letra">
          <button type="button" onClick={() => onFonte(ajustarFonte(fonte, -1))} disabled={fonte === FONTES_BIBLIA[0]} aria-label="Diminuir a letra">A-</button>
          <button type="button" onClick={() => onFonte(ajustarFonte(fonte, 1))} disabled={fonte === FONTES_BIBLIA[FONTES_BIBLIA.length - 1]} aria-label="Aumentar a letra">A+</button>
        </div>
      </div>
      {plano && (
        <p className="ch-biblia-plano">
          Leitura de hoje: {plano.nome}{plano.caps.length > 1 ? ` · capítulo ${Math.max(1, iPlano + 1)} de ${plano.caps.length}` : ""}
        </p>
      )}
      <h1>{info?.nome} {cap}</h1>
      {erro}
      {estudo && versiculos && (
        <button type="button" className="ch-btn ch-btn-claro ch-btn-baixo" onClick={() => setPedido({ titulo: `Contexto de ${info?.nome} ${cap}`, pedido: { tipo: "capitulo", sigla, cap } })}>
          Contexto do capítulo
        </button>
      )}
      {!versiculos && !erro && <p className="ch-suave">Abrindo…</p>}
      {versiculos && (
        <>
          {estudo && sel.length === 0 && <p className="ch-dica">Toque nos versículos para selecionar, anotar, destacar ou explicar.</p>}
          <div className="ch-biblia-texto" style={{ fontSize: fonte }}>
            {versiculos.map((v, i) => {
              const n = i + 1;
              const marcado = sel.includes(n);
              const cor = destaques.get(n);
              return (
                <div key={n}>
                  <p
                    id={`v-${n}`}
                    className={`ch-vers${marcado ? " sel" : ""}${cor ? ` cor-${cor}` : ""}`}
                    {...(estudo ? { role: "button", tabIndex: 0, "aria-pressed": marcado, onClick: () => alternar(n), onKeyDown: (ev: React.KeyboardEvent) => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); alternar(n); } } } : {})}
                    aria-label={estudo ? `Versículo ${n}${cor ? `, destacado de ${NOMES_COR[cor].toLowerCase()}` : ""}: ${v}` : undefined}
                  >
                    <sup>{n}</sup> {v}
                  </p>
                  {(notasPorFim.get(n) ?? []).map((nt) => (
                    <div key={nt.id} className="ch-nota-vers">
                      <small>📝 {nt.vIni === nt.vFim ? `Versículo ${nt.vIni}` : `Versículos ${nt.vIni}–${nt.vFim}`}{nt.tema ? ` · ${nt.tema}` : ""}</small>
                      <p>{nt.texto}</p>
                      <button type="button" className="ch-link" onClick={() => setNota({ id: nt.id, vIni: nt.vIni, vFim: nt.vFim, texto: nt.texto, tema: nt.tema })}>Editar</button>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
          {estudo && (
            <div className="ch-biblia-fim">
              {lido ? (
                <>
                  <p className="ch-lido-ok" role="status">✓ Capítulo lido</p>
                  <button type="button" className="ch-link" disabled={marcando} onClick={() => void marcarLido(false)}>Desmarcar</button>
                </>
              ) : (
                <button type="button" className="ch-btn ch-btn-grande" disabled={marcando} onClick={() => void marcarLido(true)}>Li este capítulo</button>
              )}
              {ultimoDoPlano && (
                diaFeito ? <p className="ch-lido-ok" role="status">✓ Leitura de hoje concluída</p> : (
                  <button type="button" className="ch-btn ch-btn-grande" disabled={marcando} onClick={() => void concluirDia()}>Concluir a leitura de hoje</button>
                )
              )}
            </div>
          )}
        </>
      )}
      <div className="ch-biblia-nav">
        <button type="button" className="ch-btn ch-btn-claro" disabled={!ant} onClick={() => ant && onAbrir(ant, plano ? { plano } : {})}>‹ Anterior</button>
        <button type="button" className="ch-btn ch-btn-claro" disabled={!prox} onClick={() => prox && onAbrir(prox, plano ? { plano } : {})}>Próximo ›</button>
      </div>
      {rodape}

      {sel.length > 0 && !nota && (
        <div className="ch-selbarra" role="toolbar" aria-label="Ações para os versículos selecionados">
          <div className="ch-selbarra-topo">
            <b>{refSel}</b>
            <button type="button" className="ch-link" onClick={() => { setSel([]); setCores(false); }}>Limpar</button>
          </div>
          {cores ? (
            <div className="ch-cores" role="group" aria-label="Escolha a cor do destaque">
              {CORES_DESTAQUE.map((c) => (
                <button key={c} type="button" className={`ch-cor cor-${c}`} aria-label={`Destacar de ${NOMES_COR[c].toLowerCase()}`} onClick={() => void destacar(c)} />
              ))}
              <button type="button" className="ch-link" onClick={() => void destacar(null)}>Tirar cor</button>
            </div>
          ) : (
            <div className="ch-acoes">
              <button type="button" onClick={() => setCores(true)}>Destacar</button>
              <button type="button" onClick={() => setNota({ vIni: ordenados[0], vFim: ordenados[ordenados.length - 1], texto: "", tema: "" })}>Nota</button>
              <button type="button" onClick={() => setPedido({ titulo: `Explicação de ${refSel}`, pedido: { tipo: "versiculos", sigla, cap, versiculos: ordenados } })}>Contexto</button>
              <button type="button" onClick={() => void enviar()}>Enviar</button>
              <button type="button" onClick={() => void copiar()}>Copiar</button>
            </div>
          )}
        </div>
      )}

      {nota && (
        <div className="ch-sheet" role="dialog" aria-modal="true" aria-label="Nota">
          <div className="ch-sheet-rolagem">
            <h2>{nota.id ? "Editar nota" : "Nova nota"}</h2>
            <p className="ch-ref">{referenciaDaNota({ sigla, cap, vIni: nota.vIni, vFim: nota.vFim })}</p>
            <label className="ch-campo">
              <span>Sua nota</span>
              <textarea value={nota.texto} maxLength={MAX_TEXTO_NOTA} rows={5} placeholder="O que Deus falou com você neste trecho?" onChange={(e) => setNota({ ...nota, texto: e.target.value })} />
            </label>
            <label className="ch-campo">
              <span>Tema ou sermão (opcional)</span>
              <input type="text" value={nota.tema} maxLength={MAX_TEMA} list="ch-temas" placeholder="Ex.: Graça, Culto de domingo" onChange={(e) => setNota({ ...nota, tema: e.target.value })} />
              <datalist id="ch-temas">{temas.map((t) => <option key={t} value={t} />)}</datalist>
            </label>
            <button type="button" className="ch-btn" disabled={salvando || !nota.texto.trim()} onClick={() => void salvarNota()}>Salvar nota</button>
            {nota.id && <button type="button" className="ch-link perigo" disabled={salvando} onClick={() => void apagarNota()}>Apagar esta nota</button>}
            <button type="button" className="ch-link" onClick={() => setNota(null)}>Cancelar</button>
          </div>
        </div>
      )}

      {pedido && biblia && <ExplicacaoSheet titulo={pedido.titulo} pedido={pedido.pedido} biblia={biblia} onFechar={() => setPedido(null)} />}
    </section>
  );
}
