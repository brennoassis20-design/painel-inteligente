"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import novidades from "@/lib/reforma-app/novidades.json";
import { criarArmazenamentoLocal, criarArmazenamentoSupabase, type Armazenamento, type Chamada, type DadosApp } from "@/lib/reforma-app/armazenamento";
import { ESCRITORIO_VAZIO, novoId, type Cliente, type Escritorio } from "@/lib/reforma-app/modelo";
import { BlocoVideos, FormEscritorio, PrimeiroAcesso } from "./Escritorio";
import { Clientes } from "./Clientes";
import { NovoCliente } from "./NovoCliente";
import { Resultado } from "./Resultado";
import "./reforma.css";

export interface AcessoReforma {
  app: boolean;
  kit: boolean;
  kitSlug: string | null;
  kitOfertaUrl: string | null;
  armazenamento: "supabase" | "local";
}

type Aba = "clientes" | "como" | "kit" | "novidades";
type Tela = { t: "aba"; aba: Aba } | { t: "escritorio" } | { t: "novo"; cliente: Cliente | null } | { t: "resultado"; id: string };

export function ReformaApp({ acesso, chaveLocal, chamar, marca, onAbrirProduto, forcarLocal }: {
  acesso: AcessoReforma;
  chaveLocal: string;
  chamar: Chamada;
  marca: string;
  onAbrirProduto: (slug: string) => void;
  forcarLocal?: boolean;
}) {
  const armazem: Armazenamento = useMemo(
    () => (forcarLocal || acesso.armazenamento === "local" ? criarArmazenamentoLocal(chaveLocal) : criarArmazenamentoSupabase(chamar)),
    [acesso.armazenamento, chaveLocal, chamar, forcarLocal],
  );
  const [dados, setDados] = useState<DadosApp | null>(null);
  const [erro, setErro] = useState("");
  const [tela, setTela] = useState<Tela>({ t: "aba", aba: "clientes" });

  const carregar = useCallback(() => {
    void armazem
      .carregar()
      .then((d) => {
        setDados(d);
        setErro("");
      })
      .catch((e) => setErro(e instanceof Error ? e.message : "Não deu para carregar seus dados."));
  }, [armazem]);
  useEffect(() => carregar(), [carregar]);

  const irPara = (t: Tela) => {
    setTela(t);
    window.scrollTo({ top: 0 });
  };

  if (erro && !dados) {
    return (
      <div className="rf rf-centro">
        <p className="rf-erro" role="alert">
          {erro}
        </p>
        <button type="button" className="gp-btn gp-btn-gold rf-grande" onClick={carregar}>
          Tentar de novo
        </button>
      </div>
    );
  }
  if (!dados) return <div className="rf rf-centro gp-muted">Carregando o app…</div>;

  const esc = dados.escritorio;
  const salvarEscritorio = async (e: Escritorio) => {
    await armazem.salvarEscritorio(e);
    setDados((d) => (d ? { ...d, escritorio: e } : d));
    irPara({ t: "aba", aba: "clientes" });
  };
  const salvarCliente = async (c: Cliente) => {
    await armazem.salvarCliente(c);
    setDados((d) => (d ? { ...d, clientes: [c, ...d.clientes.filter((x) => x.id !== c.id)] } : d));
  };
  const apagar = async (c: Cliente) => {
    await armazem.apagarCliente(c.id);
    setDados((d) => (d ? { ...d, clientes: d.clientes.filter((x) => x.id !== c.id) } : d));
  };
  const duplicar = async (c: Cliente) => {
    const agora = new Date().toISOString();
    const copia: Cliente = { ...c, id: novoId(), criadoEm: agora, atualizadoEm: agora, form: { ...c.form, nome: `${c.form.nome} (cópia)`, fornecedores: c.form.fornecedores.map((f) => ({ ...f, id: novoId() })) } };
    await salvarCliente(copia);
  };

  if (!esc.configurado) {
    return (
      <div className="rf">
        <PrimeiroAcesso marca={marca} inicial={{ ...ESCRITORIO_VAZIO, ...esc }} onSalvar={salvarEscritorio} />
      </div>
    );
  }

  const abas: { id: Aba; curto: string; longo: string; oculta?: boolean }[] = [
    { id: "clientes", curto: "Clientes", longo: "Clientes" },
    { id: "como", curto: "Como usar", longo: "Como usar" },
    { id: "kit", curto: "Kit", longo: "Kit Consultor" },
    { id: "novidades", curto: "Novidades", longo: "Novidades" },
  ];
  const abaAtual = tela.t === "aba" ? tela.aba : tela.t === "escritorio" ? "clientes" : "clientes";
  const emAba = tela.t === "aba" || tela.t === "escritorio";
  const clienteAberto = tela.t === "resultado" ? dados.clientes.find((c) => c.id === tela.id) : undefined;

  return (
    <div className="rf">
      {emAba && (
        <nav className="rf-abas" aria-label="Seções do app">
          {abas.map((a) => (
            <button key={a.id} type="button" className={a.id === abaAtual ? "on" : ""} aria-current={a.id === abaAtual ? "page" : undefined} onClick={() => irPara({ t: "aba", aba: a.id })}>
              <span className="curto">{a.curto}</span>
              <span className="longo">{a.longo}</span>
            </button>
          ))}
        </nav>
      )}

      {tela.t === "aba" && tela.aba === "clientes" && (
        <Clientes
          clientes={dados.clientes}
          escritorio={esc}
          onNovo={() => irPara({ t: "novo", cliente: null })}
          onAbrir={(c) => irPara({ t: "resultado", id: c.id })}
          onEditar={(c) => irPara({ t: "novo", cliente: c })}
          onDuplicar={(c) => void duplicar(c).catch((e) => setErro(e instanceof Error ? e.message : "Não deu para duplicar."))}
          onApagar={apagar}
          onEscritorio={() => irPara({ t: "escritorio" })}
        />
      )}
      {tela.t === "escritorio" && (
        <div className="rf-tela">
          <button type="button" className="gp-back rf-voltar" onClick={() => irPara({ t: "aba", aba: "clientes" })}>
            ‹ Clientes
          </button>
          <h1>Meu escritório</h1>
          <FormEscritorio inicial={esc} rotulo="Salvar" onSalvar={salvarEscritorio} />
        </div>
      )}
      {tela.t === "aba" && tela.aba === "como" && (
        <div className="rf-tela">
          <h1>Como usar</h1>
          <BlocoVideos titulo="Vídeos" />
        </div>
      )}
      {tela.t === "aba" && tela.aba === "kit" && (
        <div className="rf-tela">
          <h1>Kit Consultor</h1>
          {acesso.kit ? (
            <div className="rf-card">
              <h2>Seus arquivos prontos</h2>
              <p>Apresentação para a reunião, modelo de diagnóstico e proposta para cobrar a consultoria, e o roteiro da conversa com o cliente.</p>
              {acesso.kitSlug ? (
                <button type="button" className="gp-btn gp-btn-gold rf-grande" onClick={() => onAbrirProduto(acesso.kitSlug!)}>
                  Abrir os arquivos do Kit
                </button>
              ) : (
                <p className="gp-muted">Os arquivos do Kit ficam na lista de produtos da área, na tela inicial.</p>
              )}
            </div>
          ) : (
            <div className="rf-card rf-oferta">
              <span className="gp-eyebrow">Para contadores</span>
              <h2>Transforme a reforma em serviço</h2>
              <p>O Kit Consultor traz a apresentação editável para a reunião, o diagnóstico e a proposta para você cobrar a consultoria, e o roteiro da conversa.</p>
              {acesso.kitOfertaUrl ? (
                <a className="gp-btn gp-btn-gold rf-grande" href={acesso.kitOfertaUrl} target="_blank" rel="noreferrer">
                  Quero o Kit Consultor
                </a>
              ) : (
                <p className="gp-muted">Em breve por aqui.</p>
              )}
            </div>
          )}
        </div>
      )}
      {tela.t === "aba" && tela.aba === "novidades" && (
        <div className="rf-tela">
          <h1>Novidades</h1>
          <ul className="rf-novidades">
            {novidades.map((n) => (
              <li key={n.data + n.titulo} className="rf-card">
                <small className="gp-muted">{n.data.split("-").reverse().join("/")}</small>
                <h2>{n.titulo}</h2>
                <p>{n.texto}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {tela.t === "novo" && (
        <NovoCliente
          key={tela.cliente?.id ?? "novo"}
          inicial={tela.cliente}
          onSalvar={salvarCliente}
          onSair={() => irPara({ t: "aba", aba: "clientes" })}
          onResultado={(c) => irPara({ t: "resultado", id: c.id })}
        />
      )}
      {tela.t === "resultado" && clienteAberto && (
        <Resultado cliente={clienteAberto} escritorio={esc} onEditar={() => irPara({ t: "novo", cliente: clienteAberto })} onVoltar={() => irPara({ t: "aba", aba: "clientes" })} />
      )}
      {erro && (
        <p className="rf-erro rf-toast" role="alert">
          {erro}
        </p>
      )}
    </div>
  );
}
