"use client";

import { useMemo, useRef, useState } from "react";
import { PARAMETROS_PADRAO } from "@/lib/reforma/padrao";
import {
  ANEXOS, ROTULO_REGIME, UFS, calcularCliente, checklistCompleto, descricaoReducao, formVazio, fornecedorVazio, mostraIssIcms,
  novoId, percentualDaReducao, primeiroPassoComErro, rbt12Sugerido, reducaoEfetiva, validarPasso,
  type Cliente, type ClienteForm, type Erros,
} from "@/lib/reforma-app/modelo";
import { numeroParaBR } from "@/lib/reforma-app/numeros";
import { CHECKLIST_127, SETORES, acharSetor, buscarSetores } from "@/lib/reforma-app/setores";
import { Caixa, CampoDinheiro, CampoPercentual, CampoTexto, Confirmar, Escolha, Selecao } from "./Campos";

const NOMES_PASSOS = ["Empresa", "Faturamento", "Compras", "Preço", "Revisão"];

export function NovoCliente({ inicial, onSalvar, onSair, onResultado }: {
  inicial: Cliente | null;
  onSalvar: (c: Cliente) => Promise<void>;
  onSair: () => void;
  onResultado: (c: Cliente) => void;
}) {
  const [id] = useState(() => inicial?.id ?? novoId());
  const [criadoEm] = useState(() => inicial?.criadoEm ?? new Date().toISOString());
  const [form, setForm] = useState<ClienteForm>(() => ({ ...formVazio(), ...(inicial?.form ?? {}) }));
  const [original] = useState(() => JSON.stringify(inicial?.form ?? formVazio()));
  const [passo, setPasso] = useState(() => (inicial && !inicial.rascunho ? 5 : Math.min(5, Math.max(1, inicial?.passo ?? 1))));
  const [erros, setErros] = useState<Erros>({});
  const [salvando, setSalvando] = useState(false);
  const [aviso, setAviso] = useState("");
  const [falha, setFalha] = useState("");
  const [saindo, setSaindo] = useState(false);
  const topo = useRef<HTMLDivElement>(null);
  const editando = Boolean(inicial && !inicial.rascunho);

  const sujo = JSON.stringify(form) !== original;
  const set = <K extends keyof ClienteForm>(k: K, v: ClienteForm[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErros((e) => {
      if (!(k in e)) return e;
      const { [k as string]: _tirado, ...resto } = e;
      void _tirado;
      return resto;
    });
  };

  const montar = (rascunho: boolean, passoAtual = passo): Cliente => ({
    id,
    criadoEm,
    atualizadoEm: new Date().toISOString(),
    rascunho,
    passo: passoAtual,
    form,
  });

  const irParaTopo = () => window.setTimeout(() => topo.current?.scrollIntoView({ block: "start" }), 30);

  const gravar = async (c: Cliente) => {
    setSalvando(true);
    setFalha("");
    try {
      await onSalvar(c);
      return true;
    } catch (e) {
      setFalha(e instanceof Error ? e.message : "Não deu para salvar. Tente de novo.");
      return false;
    } finally {
      setSalvando(false);
    }
  };

  const salvarRascunho = async () => {
    if (!form.nome.trim()) {
      setErros({ nome: "Dê um nome à empresa para salvar o rascunho." });
      setPasso(1);
      irParaTopo();
      return;
    }
    if (await gravar(montar(true))) {
      setAviso("Rascunho salvo.");
      window.setTimeout(() => setAviso(""), 2500);
    }
  };

  const avancar = async () => {
    const e = validarPasso(passo, form);
    setErros(e);
    if (Object.keys(e).length) {
      window.setTimeout(() => document.querySelector(".rf-campo.tem-erro, .rf-escolha.tem-erro")?.scrollIntoView({ block: "center", behavior: "smooth" }), 30);
      return;
    }
    const prox = passo + 1;
    // guarda o rascunho a cada passo (some o medo de perder o que foi digitado)
    if (!editando) await gravar(montar(true, prox));
    setPasso(prox);
    irParaTopo();
  };

  const voltar = () => {
    setErros({});
    setPasso((p) => Math.max(1, p - 1));
    irParaTopo();
  };

  const concluir = async () => {
    const ruim = primeiroPassoComErro(form);
    if (ruim) {
      setPasso(ruim);
      setErros(validarPasso(ruim, form));
      irParaTopo();
      return;
    }
    const calc = calcularCliente(form);
    if (!calc.ok) return;
    const c = montar(false, 5);
    if (await gravar(c)) onResultado(c);
  };

  const sair = () => {
    if (sujo) setSaindo(true);
    else onSair();
  };

  return (
    <div className="rf-tela rf-novo" ref={topo}>
      <header className="rf-novo-topo">
        <button type="button" className="gp-back rf-voltar" onClick={sair}>
          ‹ Clientes
        </button>
        <h1>{editando ? "Editar cliente" : "Novo cliente"}</h1>
      </header>

      <nav aria-label="Etapas" className="rf-progresso">
        <div className="rf-barra" role="progressbar" aria-valuemin={1} aria-valuemax={5} aria-valuenow={passo} aria-label={`Passo ${passo} de 5`}>
          <i style={{ width: `${(passo / 5) * 100}%` }} />
        </div>
        <ol>
          {NOMES_PASSOS.map((n, i) => (
            <li key={n} className={i + 1 === passo ? "atual" : i + 1 < passo ? "feito" : ""} aria-current={i + 1 === passo ? "step" : undefined}>
              <span>{i + 1}</span>
              <em>{n}</em>
            </li>
          ))}
        </ol>
      </nav>

      <div className="rf-passo">
        {passo === 1 && <Passo1 form={form} set={set} erros={erros} />}
        {passo === 2 && <Passo2 form={form} set={set} erros={erros} />}
        {passo === 3 && <Passo3 form={form} setForm={setForm} set={set} erros={erros} />}
        {passo === 4 && <Passo4 form={form} set={set} erros={erros} />}
        {passo === 5 && <Passo5 form={form} irPara={(p) => { setPasso(p); setErros({}); irParaTopo(); }} />}
      </div>

      {falha && (
        <p className="rf-erro" role="alert">
          {falha}
        </p>
      )}
      {aviso && (
        <p className="gp-ok" role="status">
          {aviso}
        </p>
      )}

      <div className="rf-rodape-passos">
        <div className="rf-rodape-in">
          {passo > 1 && (
            <button type="button" className="gp-btn gp-btn-ghost rf-grande" onClick={voltar} disabled={salvando}>
              Voltar
            </button>
          )}
          {passo < 5 ? (
            <button type="button" className="gp-btn gp-btn-gold rf-grande rf-cresce" onClick={() => void avancar()} disabled={salvando}>
              Continuar
            </button>
          ) : (
            <button type="button" className="gp-btn gp-btn-gold rf-grande rf-cresce" onClick={() => void concluir()} disabled={salvando || !calcularCliente(form).ok}>
              {salvando ? "Calculando…" : "Ver resultado"}
            </button>
          )}
        </div>
        {!editando && (
          <button type="button" className="gp-link rf-rascunho" onClick={() => void salvarRascunho()} disabled={salvando}>
            Salvar rascunho
          </button>
        )}
      </div>

      {saindo && (
        <Confirmar
          titulo="Sair deste cadastro?"
          texto={editando ? "Você mexeu em alguns dados e ainda não salvou." : "Quer guardar o que já foi preenchido como rascunho?"}
          confirmar={editando ? "Continuar editando" : "Salvar rascunho e sair"}
          cancelar={editando ? "Sair sem salvar" : "Continuar editando"}
          extra={editando ? undefined : { rotulo: "Sair sem salvar", onClick: onSair }}
          onConfirmar={async () => {
            if (editando) {
              setSaindo(false);
              return;
            }
            if (!form.nome.trim()) {
              setSaindo(false);
              setErros({ nome: "Dê um nome à empresa para salvar o rascunho." });
              setPasso(1);
              return;
            }
            if (await gravar(montar(true))) onSair();
            else setSaindo(false);
          }}
          onCancelar={() => (editando ? onSair() : setSaindo(false))}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------- passo 1: empresa

type PassoProps = { form: ClienteForm; set: <K extends keyof ClienteForm>(k: K, v: ClienteForm[K]) => void; erros: Erros };

function Passo1({ form, set, erros }: PassoProps) {
  const [busca, setBusca] = useState("");
  const [trocando, setTrocando] = useState(!form.setorId);
  const setor = acharSetor(form.setorId);
  const achados = useMemo(() => buscarSetores(busca), [busca]);
  const grupos = useMemo(() => {
    const g = new Map<string, typeof SETORES>();
    for (const s of achados) g.set(s.grupo, [...(g.get(s.grupo) ?? []), s]);
    return [...g.entries()];
  }, [achados]);
  const red = reducaoEfetiva(form);
  const sugestao = setor?.reducao ?? "nenhuma";
  const permitidas = PARAMETROS_PADRAO.reducoesPermitidas.valor.filter((v) => v !== "0");

  const escolherSetor = (id: string) => {
    const s = acharSetor(id);
    set("setorId", id);
    set("reducaoCodigo", s?.reducao ?? "nenhuma");
    set("checklist", {});
    setTrocando(false);
    setBusca("");
  };

  return (
    <>
      <h2>Sobre a empresa</h2>
      <div className="rf-form">
        <CampoTexto rotulo="Nome da empresa" valor={form.nome} onChange={(v) => set("nome", v)} erro={erros.nome} placeholder="Ex.: Clínica Bem Viver Ltda." maxLength={120} />
        <div className="rf-grade2">
          <Selecao rotulo="Estado (UF)" valor={form.uf} onChange={(v) => set("uf", v)} erro={erros.uf} opcoes={UFS.map((u) => ({ valor: u, rotulo: u }))} vazio="UF" />
          <CampoTexto rotulo="Município" valor={form.municipio} onChange={(v) => set("municipio", v)} erro={erros.municipio} placeholder="Ex.: Campinas" maxLength={80} />
        </div>

        <div className={`rf-campo${erros.setorId ? " tem-erro" : ""}`}>
          <span className="rf-rotulo">Atividade da empresa</span>
          {!trocando && setor ? (
            <div className="rf-setor-escolhido">
              <span>
                <b>{setor.nome}</b>
                <small>{setor.grupo}</small>
              </span>
              <button type="button" className="gp-btn gp-btn-ghost rf-medio" onClick={() => setTrocando(true)}>
                Trocar
              </button>
            </div>
          ) : (
            <div className="rf-setores">
              <label htmlFor="rf-busca-setor" className="rf-oculto">
                Buscar atividade
              </label>
              <input id="rf-busca-setor" type="search" placeholder="Buscar: contabilidade, restaurante, clínica…" value={busca} onChange={(e) => setBusca(e.target.value)} autoComplete="off" />
              <div className="rf-setores-lista" role="listbox" aria-label="Atividades">
                {grupos.length === 0 && <p className="gp-muted">Nada encontrado. Tente outra palavra ou escolha &quot;Outra atividade&quot;.</p>}
                {grupos.map(([g, itens]) => (
                  <div key={g} className="rf-grupo">
                    <h3>{g}</h3>
                    {itens.map((s) => (
                      <button key={s.id} type="button" role="option" aria-selected={s.id === form.setorId} className="rf-setor" onClick={() => escolherSetor(s.id)}>
                        <span>{s.nome}</span>
                        <small>{s.reducao === "nenhuma" ? "sem redução" : descricaoSimples(s.reducao)}</small>
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}
          {erros.setorId && (
            <small className="rf-erro" role="alert">
              {erros.setorId}
            </small>
          )}
        </div>

        {setor && !trocando && (
          <div className="rf-sugestao">
            <h3>Redução na alíquota</h3>
            <p>{setor.nota}</p>
            <Selecao
              rotulo="Redução que vamos aplicar"
              valor={form.reducaoCodigo}
              onChange={(v) => set("reducaoCodigo", v)}
              opcoes={PARAMETROS_PADRAO.reducoes.map((r) => ({ valor: r.codigo, rotulo: `${r.descricao}${r.percentual && r.percentual !== "0" ? ` (−${Math.round(Number(r.percentual) * 100)}%)` : ""}` }))}
              vazio="Sem redução"
              dica={form.reducaoCodigo !== sugestao ? `A sugestão para esta atividade era: ${descricaoReducao(sugestao)}.` : undefined}
            />
            {form.reducaoCodigo === "profissao_regulamentada" && (
              <div className="rf-checklist">
                <h4>Condições do art. 127 (todas precisam valer)</h4>
                {CHECKLIST_127.map((c) => (
                  <Caixa key={c.id} marcado={form.checklist[c.id] === true} onChange={(v) => set("checklist", { ...form.checklist, [c.id]: v })}>
                    {c.texto}
                  </Caixa>
                ))}
                <p className={`rf-status ${checklistCompleto(form) && red.aplicada ? "ok" : "alerta"}`} role="status">
                  {red.aplicada ? "Todas as condições marcadas: redução de 30% aplicada." : red.aviso}
                </p>
              </div>
            )}
            {form.reducaoCodigo === "outro" && (
              <div className="rf-grade2">
                <Selecao rotulo="Percentual de redução" valor={form.reducaoOutroPct} onChange={(v) => set("reducaoOutroPct", v)} erro={erros.reducaoOutroPct} opcoes={permitidas.map((v) => ({ valor: String(Math.round(Number(v) * 100)), rotulo: `${Math.round(Number(v) * 100)}%` }))} vazio="Escolha" />
                <CampoTexto rotulo="Base legal" valor={form.reducaoOutroMotivo} onChange={(v) => set("reducaoOutroMotivo", v)} erro={erros.reducaoOutroMotivo} placeholder="Ex.: LC 214, art. 142" maxLength={120} />
              </div>
            )}
            {form.reducaoCodigo !== "profissao_regulamentada" && form.reducaoCodigo !== "outro" && form.reducaoCodigo !== "nenhuma" && percentualDaReducao(form.reducaoCodigo) && (
              <p className="rf-status ok">Redução de {Math.round(Number(percentualDaReducao(form.reducaoCodigo)) * 100)}% aplicada. Confirme na lei se o serviço ou produto está na lista.</p>
            )}
            {form.regime === "simples" && red.aplicada && <p className="rf-status alerta">No Simples, a redução só vale se a empresa optar pelo regime regular de IBS/CBS (híbrido). Dentro do DAS vale a partilha da tabela.</p>}
          </div>
        )}

        <Escolha
          nome="regime"
          rotulo="Regime atual da empresa"
          valor={form.regime}
          onChange={(v) => set("regime", v)}
          erro={erros.regime}
          opcoes={[
            { valor: "simples", rotulo: ROTULO_REGIME.simples },
            { valor: "presumido", rotulo: ROTULO_REGIME.presumido },
            { valor: "real", rotulo: ROTULO_REGIME.real },
            { valor: "mei", rotulo: ROTULO_REGIME.mei },
          ]}
        />
        {form.regime === "simples" && <Selecao rotulo="Anexo do Simples" valor={form.anexo} onChange={(v) => set("anexo", v as ClienteForm["anexo"])} erro={erros.anexo} opcoes={ANEXOS.map((a) => ({ valor: a.id, rotulo: a.rotulo }))} />}
        {form.regime === "mei" && (
          <Escolha
            nome="mei"
            rotulo="O MEI..."
            valor={form.atividadeMei}
            onChange={(v) => set("atividadeMei", v)}
            erro={erros.atividadeMei}
            opcoes={[
              { valor: "comercio", rotulo: "Vende mercadorias (comércio)" },
              { valor: "servico", rotulo: "Presta serviços" },
              { valor: "comercio_e_servico", rotulo: "Os dois" },
            ]}
          />
        )}
      </div>
    </>
  );
}

function descricaoSimples(codigo: string) {
  const p = percentualDaReducao(codigo);
  if (codigo === "aliquota_zero") return "alíquota zero";
  if (codigo === "outro") return "informar";
  return p && p !== "0" ? `−${Math.round(Number(p) * 100)}%` : "sem redução";
}

// ---------------------------------------------------------------- passo 2: faturamento

function Passo2({ form, set, erros }: PassoProps) {
  const mei = form.regime === "mei";
  const simples = form.regime === "simples";
  const iss = mostraIssIcms(form);
  const aoMudarReceita = (v: string) => {
    const antigo = rbt12Sugerido(form);
    set("receitaMensal", v);
    if (simples && (!form.rbt12.trim() || form.rbt12 === antigo)) {
      const novo = rbt12Sugerido({ ...form, receitaMensal: v });
      set("rbt12", novo);
    }
  };
  return (
    <>
      <h2>Faturamento</h2>
      <div className="rf-form">
        <CampoDinheiro rotulo="Receita média mensal" valor={form.receitaMensal} onChange={aoMudarReceita} erro={erros.receitaMensal} dica="Média mensal de vendas e serviços, antes de descontar impostos." />
        {(simples || mei) && (
          <div className="rf-linha-ajuda">
            <CampoDinheiro rotulo="RBT12: receita dos últimos 12 meses" opcional={mei} valor={form.rbt12} onChange={(v) => set("rbt12", v)} erro={erros.rbt12} dica={simples ? "Define a faixa e a alíquota do Simples." : undefined} />
            <button type="button" className="gp-btn gp-btn-ghost rf-medio" onClick={() => set("rbt12", rbt12Sugerido(form))} disabled={!form.receitaMensal.trim()}>
              Usar 12 × a receita média
            </button>
          </div>
        )}
        {!simples && !mei && (
          <details className="rf-detalhe">
            <summary>Informar também a receita dos últimos 12 meses (opcional)</summary>
            <CampoDinheiro rotulo="RBT12" opcional valor={form.rbt12} onChange={(v) => set("rbt12", v)} erro={erros.rbt12} />
          </details>
        )}
        {!mei && (
          <CampoPercentual rotulo="Quanto do faturamento é vendido para empresas (CNPJ)?" valor={form.pctPJ} onChange={(v) => set("pctPJ", v)} erro={erros.pctPJ} dica="Empresas aproveitam o crédito de CBS/IBS; consumidor final (CPF) não. Ex.: 90 para 90%." />
        )}
        {iss ? (
          <div className="rf-grade2">
            <CampoPercentual rotulo="ISS sobre a receita" opcional valor={form.iss} onChange={(v) => set("iss", v)} erro={erros.iss} dica="Alíquota efetiva. Ex.: 5" />
            <CampoPercentual rotulo="ICMS sobre a receita" opcional valor={form.icms} onChange={(v) => set("icms", v)} erro={erros.icms} dica="Alíquota efetiva. Ex.: 3" />
          </div>
        ) : simples ? (
          <p className="rf-nota">Dentro do Simples, o ISS e o ICMS já estão na guia (DAS): não precisa informar. Eles só entram por fora quando o RBT12 passa da 6ª faixa.</p>
        ) : null}
        {mei && <p className="rf-nota">O MEI paga uma guia fixa: o cálculo usa só a receita e o tipo de atividade.</p>}
      </div>
    </>
  );
}

// ---------------------------------------------------------------- passo 3: compras

function Passo3({ form, setForm, set, erros }: PassoProps & { setForm: React.Dispatch<React.SetStateAction<ClienteForm>> }) {
  if (form.regime === "mei") {
    return (
      <>
        <h2>Compras e despesas</h2>
        <p className="rf-nota">O MEI não toma crédito de CBS/IBS. Pode seguir.</p>
      </>
    );
  }
  const atualiza = (id: string, parte: Partial<ClienteForm["fornecedores"][number]>) =>
    setForm((f) => ({ ...f, fornecedores: f.fornecedores.map((x) => (x.id === id ? { ...x, ...parte } : x)) }));
  return (
    <>
      <h2>Compras e despesas</h2>
      <p className="gp-muted">Só entra o que tem nota fiscal de empresa. Informe o valor médio por mês.</p>
      <div className="rf-credito">
        <div className="rf-credito-sim">
          <h3>Gera crédito</h3>
          <ul>
            <li>Mercadorias para revenda e insumos</li>
            <li>Aluguel pago a empresa</li>
            <li>Energia, internet e telefone</li>
            <li>Software e sistemas</li>
            <li>Serviços de terceiros (contabilidade, marketing, manutenção, frete)</li>
          </ul>
        </div>
        <div className="rf-credito-nao">
          <h3>Não gera crédito</h3>
          <ul>
            <li>Folha de pagamento e pró-labore</li>
            <li>Compras sem nota ou de pessoa física</li>
            <li>Gastos pessoais dos sócios (art. 57)</li>
            <li>Compras de MEI (crédito ainda indefinido)</li>
          </ul>
        </div>
      </div>
      <div className="rf-form">
        <CampoDinheiro rotulo="Compras de fornecedores regulares (por mês)" opcional valor={form.comprasRegulares} onChange={(v) => set("comprasRegulares", v)} erro={erros.comprasRegulares} dica="Fornecedores que não são do Simples (Presumido ou Real). Pode deixar em branco se não houver." />
        <div className="rf-forn">
          <h3>Fornecedores do Simples</h3>
          <p className="gp-muted">Quem compra do Simples toma menos crédito. Informe cada um com o anexo e o RBT12 dele.</p>
          {form.fornecedores.map((fo, i) => {
            const k = `forn_${fo.id}`;
            return (
              <div key={fo.id} className="rf-forn-item">
                <div className="rf-forn-cab">
                  <b>Fornecedor {i + 1}</b>
                  <button type="button" className="gp-btn gp-btn-ghost rf-medio" onClick={() => setForm((f) => ({ ...f, fornecedores: f.fornecedores.filter((x) => x.id !== fo.id) }))}>
                    Tirar
                  </button>
                </div>
                <CampoTexto rotulo="Nome" opcional valor={fo.nome} onChange={(v) => atualiza(fo.id, { nome: v })} maxLength={80} />
                <div className="rf-grade2">
                  <CampoDinheiro rotulo="Valor comprado por mês" valor={fo.valor} onChange={(v) => atualiza(fo.id, { valor: v })} erro={erros[`${k}_valor`]} />
                  <Selecao rotulo="Anexo do fornecedor" valor={fo.anexo} onChange={(v) => atualiza(fo.id, { anexo: v as typeof fo.anexo })} erro={erros[`${k}_anexo`]} opcoes={ANEXOS.map((a) => ({ valor: a.id, rotulo: a.rotulo }))} />
                </div>
                <div className="rf-grade2">
                  <CampoDinheiro rotulo="RBT12 do fornecedor" valor={fo.rbt12} onChange={(v) => atualiza(fo.id, { rbt12: v })} erro={erros[`${k}_rbt12`]} />
                  <CampoPercentual rotulo="Alíquota efetiva" opcional valor={fo.aliquota} onChange={(v) => atualiza(fo.id, { aliquota: v })} erro={erros[`${k}_aliquota`]} dica="Só se você souber; senão calculamos pelo RBT12." />
                </div>
              </div>
            );
          })}
          <button type="button" className="gp-btn gp-btn-ghost rf-grande rf-largo" onClick={() => setForm((f) => ({ ...f, fornecedores: [...f.fornecedores, fornecedorVazio()] }))}>
            + Adicionar fornecedor do Simples
          </button>
        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------- passo 4: preço

function Passo4({ form, set, erros }: PassoProps) {
  if (form.regime === "mei") {
    return (
      <>
        <h2>Preço</h2>
        <p className="rf-nota">O MEI não precisa informar margem: a guia é fixa. Pode seguir.</p>
      </>
    );
  }
  return (
    <>
      <h2>Preço e margem</h2>
      <div className="rf-form">
        <CampoPercentual rotulo="Margem atual sobre o preço" valor={form.margem} onChange={(v) => set("margem", v)} erro={erros.margem} dica="O que sobra do preço depois dos custos e impostos. Se não souber, deixe 15." />
        <Escolha
          nome="premissa"
          rotulo="E os fornecedores, o que vão fazer com o preço deles?"
          valor={form.premissa}
          onChange={(v) => set("premissa", v)}
          opcoes={[
            { valor: "sem_imposto", rotulo: "Mantêm o preço sem imposto (padrão)", detalhe: "O CBS/IBS entra por fora e vira crédito para você." },
            { valor: "preco_final", rotulo: "Mantêm o preço final", detalhe: "O imposto sai de dentro do preço deles e o crédito é menor." },
          ]}
        />
      </div>
    </>
  );
}

// ---------------------------------------------------------------- passo 5: revisão

function Passo5({ form, irPara }: { form: ClienteForm; irPara: (p: number) => void }) {
  const setor = acharSetor(form.setorId);
  const red = reducaoEfetiva(form);
  const calc = useMemo(() => calcularCliente(form), [form]);
  const linhas: { passo: number; rotulo: string; valor: string }[] = [
    { passo: 1, rotulo: "Empresa", valor: `${form.nome} · ${form.municipio}/${form.uf}` },
    { passo: 1, rotulo: "Atividade", valor: setor?.nome ?? "" },
    { passo: 1, rotulo: "Redução", valor: red.aplicada ? `${descricaoReducao(form.reducaoCodigo)} (−${Math.round(Number(red.percentual) * 100)}%)` : "Sem redução" },
    { passo: 1, rotulo: "Regime", valor: form.regime ? ROTULO_REGIME[form.regime] + (form.regime === "simples" ? ` · Anexo ${form.anexo}` : "") : "" },
    { passo: 2, rotulo: "Receita média mensal", valor: `R$ ${numeroParaBR(String(Number(form.receitaMensal.replace(/\./g, "").replace(",", ".")) || 0))}` },
  ];
  if (form.regime !== "mei") {
    linhas.push({ passo: 2, rotulo: "Vendido para empresas", valor: `${form.pctPJ}%` });
    linhas.push({ passo: 3, rotulo: "Compras regulares", valor: `R$ ${form.comprasRegulares || "0,00"}` });
    if (form.fornecedores.length) linhas.push({ passo: 3, rotulo: "Fornecedores do Simples", valor: String(form.fornecedores.length) });
    linhas.push({ passo: 4, rotulo: "Margem atual", valor: `${form.margem}%` });
  }
  return (
    <>
      <h2>Revise antes de calcular</h2>
      <dl className="rf-revisao">
        {linhas.map((l) => (
          <div key={l.rotulo} className="rf-revisao-linha">
            <dt>{l.rotulo}</dt>
            <dd>{l.valor}</dd>
            <button type="button" className="gp-link" onClick={() => irPara(l.passo)}>
              Editar
            </button>
          </div>
        ))}
      </dl>
      {red.aviso && <p className="rf-status alerta">{red.aviso}</p>}
      {!calc.ok && (
        <div className="rf-status erro" role="alert">
          <b>Corrija antes de calcular:</b>
          <ul>
            {calc.erros.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
