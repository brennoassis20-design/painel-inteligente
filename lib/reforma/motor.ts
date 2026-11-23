// Motor de cálculo da Reforma Tributária do consumo (CBS/IBS × PIS/Cofins/ICMS/ISS) para contadores.
// Funções puras: sem rede, sem banco, sem relógio. Toda alíquota, redução, cronograma, partilha do Simples e
// valor do MEI vem do argumento `parametros`/`tabelas` (cada número com fonte, status e data). Nenhum número da lei aqui.
// Aritmética racional exata (BigInt); cada valor em R$ é arredondado a 2 casas, meio centavo para cima, linha a linha
// (mesma regra do gabarito casos-ouro/calcula.py).
import { Dec, D } from "./decimal.ts";
import type { Entrada } from "./decimal.ts";
import { brl, numeroBR, pct } from "./formato.ts";
import type {
  AnexoSimples,
  Aviso,
  Bloco,
  EntradaCliente,
  FornecedorSimples,
  LinhaMemoria,
  LinhaTabelaSimples,
  OpcaoPreco,
  Parametros,
  PremissaFornecedores,
  Param,
  ResultadoAno,
  ResultadoReforma,
  RetornoCalculo,
  TabelasSimples,
} from "./tipos.ts";

const r2 = (x: Dec): Dec => x.arredondar(2);
const ZERO = Dec.ZERO;
const UM = Dec.UM;

class ErroCalculo extends Error {}

// ------------------------------------------------------------------ entrada normalizada

interface FornSimplesN {
  nome: string;
  valor: Dec;
  anexo: AnexoSimples;
  rbt: Dec;
  efInformada: Dec | null;
}

interface Norm {
  regime: EntradaCliente["regime"];
  anexo: AnexoSimples | null;
  rec: Dec;
  rbt: Dec | null;
  pj: Dec;
  iss: Dec;
  icms: Dec;
  red: Dec;
  redMotivo: string;
  compReg: Dec;
  forn: FornSimplesN[];
  margem: Dec;
  premissa: PremissaFornecedores;
  comparativo: { regime: "presumido" | "real"; iss: Dec; icms: Dec } | null;
  atividadeMei: NonNullable<EntradaCliente["atividadeMei"]>;
}

const ANEXOS: AnexoSimples[] = ["I", "II", "III", "IV", "V"];

function lerNumero(v: Entrada | undefined | null, rotulo: string, erros: string[]): Dec | null {
  if (v === undefined || v === null || v === "") {
    erros.push(`${rotulo}: informe um valor.`);
    return null;
  }
  try {
    return D(v);
  } catch {
    erros.push(`${rotulo}: "${String(v)}" não é um número válido.`);
    return null;
  }
}

function lerFracao(v: Entrada | undefined | null, rotulo: string, erros: string[], padrao?: string): Dec | null {
  if ((v === undefined || v === null || v === "") && padrao !== undefined) return D(padrao);
  const x = lerNumero(v, rotulo, erros);
  if (!x) return null;
  if (x.menor(0)) {
    erros.push(`${rotulo} não pode ser negativo (recebido ${String(v)}).`);
    return null;
  }
  if (x.maior(1)) {
    erros.push(`${rotulo} não pode passar de 100%: informe como fração entre 0 e 1 (ex.: 0,9 para 90%). Recebido: ${String(v)}.`);
    return null;
  }
  return x;
}

function lerDinheiro(v: Entrada | undefined | null, rotulo: string, erros: string[], padrao?: string): Dec | null {
  if ((v === undefined || v === null || v === "") && padrao !== undefined) return D(padrao);
  const x = lerNumero(v, rotulo, erros);
  if (!x) return null;
  if (x.menor(0)) {
    erros.push(`${rotulo} não pode ser negativo (recebido ${String(v)}).`);
    return null;
  }
  return x;
}

function normalizar(e: EntradaCliente, P: Parametros): { erros: string[]; n: Norm | null } {
  const erros: string[] = [];
  const regimes = ["simples", "presumido", "real", "mei"];
  if (!e || !regimes.includes(e.regime)) {
    erros.push("Regime inválido: use simples, presumido, real ou mei.");
    return { erros, n: null };
  }
  const regime = e.regime;
  const rec = lerDinheiro(e.receitaMensal, "Receita mensal", erros);
  if (rec && rec.ehZero()) erros.push("Receita mensal deve ser maior que zero.");

  let anexo: AnexoSimples | null = null;
  let rbt: Dec | null = null;
  const limite = D(P.simples.limiteRBT12.valor);
  if (regime === "simples") {
    if (!e.anexoSimples || !ANEXOS.includes(e.anexoSimples)) erros.push("Informe o anexo do Simples (I, II, III, IV ou V).");
    else anexo = e.anexoSimples;
    rbt = lerDinheiro(e.rbt12, "RBT12 (receita bruta dos últimos 12 meses)", erros);
    if (rbt) {
      if (rbt.ehZero()) erros.push("RBT12 deve ser maior que zero.");
      if (rbt.maior(limite)) erros.push(`RBT12 de R$ ${numeroBR(rbt)} está acima do limite do Simples (R$ ${numeroBR(limite)}). Acima disso a empresa não pode ficar no Simples.`);
    }
  } else if (e.rbt12 !== undefined && e.rbt12 !== null && e.rbt12 !== "") {
    rbt = lerDinheiro(e.rbt12, "RBT12", erros);
    if (regime === "mei" && rbt && rbt.maior(P.meiLimiteAnual.valor)) {
      erros.push(`Receita anual de R$ ${numeroBR(rbt)} passa do limite do MEI (R$ ${numeroBR(D(P.meiLimiteAnual.valor))}).`);
    }
  }
  if (rec && regime === "mei" && rec.vezes(12).maior(P.meiLimiteAnual.valor)) {
    erros.push(`Receita mensal de R$ ${numeroBR(rec)} (R$ ${numeroBR(rec.vezes(12))} por ano) passa do limite do MEI (R$ ${numeroBR(D(P.meiLimiteAnual.valor))}).`);
  }

  const pj = lerFracao(e.percentualVendasPJ, "Percentual de vendas a empresas (PJ)", erros, regime === "mei" ? "0" : undefined);
  const iss = lerFracao(e.issPercentual, "ISS efetivo", erros, "0");
  const icms = lerFracao(e.icmsPercentual, "ICMS efetivo", erros, "0");

  // redução
  let red: Dec = ZERO;
  let redMotivo = "";
  if (e.reducao) {
    const rp = lerNumero(e.reducao.percentual, "Redução", erros);
    if (rp) {
      const permitidas = P.reducoesPermitidas.valor.map((x) => D(x));
      if (!permitidas.some((x) => x.igual(rp))) {
        erros.push(`Redução de ${String(e.reducao.percentual)} não existe na lei. Valores possíveis: ${permitidas.map((x) => pct(x, 0)).join(", ")} (use fração: 0,3 = 30%).`);
      } else {
        red = rp;
      }
    }
    redMotivo = (e.reducao.motivo ?? "").trim();
    if (red.maior(0) && !redMotivo) erros.push("Redução informada sem o motivo (ex.: profissao_regulamentada, saude, educacao).");
    const cat = P.reducoes.find((r) => r.codigo === redMotivo);
    if (cat && cat.percentual !== null && red.maior(0) && !D(cat.percentual).igual(red)) {
      erros.push(`O motivo "${redMotivo}" prevê redução de ${pct(D(cat.percentual), 0)}, mas foi informado ${pct(red, 0)}.`);
    }
  }

  // compras
  const compReg = lerDinheiro(e.comprasComCredito?.fornecedoresRegulares, "Compras de fornecedores regulares", erros, "0");
  const forn: FornSimplesN[] = [];
  (e.comprasComCredito?.fornecedoresSimples ?? []).forEach((f: FornecedorSimples, i: number) => {
    const nome = f.nome ?? `fornecedor do Simples ${i + 1}`;
    const valor = lerDinheiro(f.valor, `Compras de ${nome}`, erros);
    if (!f.anexo || !ANEXOS.includes(f.anexo)) erros.push(`Anexo do ${nome}: informe I, II, III, IV ou V.`);
    const frbt = lerDinheiro(f.rbt12, `RBT12 de ${nome}`, erros);
    if (frbt) {
      if (frbt.ehZero()) erros.push(`RBT12 de ${nome} deve ser maior que zero.`);
      if (frbt.maior(limite)) erros.push(`RBT12 de ${nome} está acima do limite do Simples (R$ ${numeroBR(limite)}).`);
    }
    let efi: Dec | null = null;
    if (f.aliquotaEfetiva !== undefined && f.aliquotaEfetiva !== null && f.aliquotaEfetiva !== "") {
      efi = lerFracao(f.aliquotaEfetiva, `Alíquota efetiva de ${nome}`, erros);
    }
    if (valor && frbt && f.anexo) forn.push({ nome, valor, anexo: f.anexo, rbt: frbt, efInformada: efi });
  });

  // margem
  let margem: Dec | null = ZERO;
  if (regime !== "mei") {
    margem = lerFracao(e.margemAtual, "Margem atual", erros);
    if (margem && margem.maiorOuIgual(1)) {
      erros.push("Margem atual deve ser menor que 100%.");
    }
  }

  const premissa = e.premissaFornecedores ?? P.premissaFornecedoresPadrao;
  if (premissa !== "sem_imposto" && premissa !== "preco_final") erros.push('Premissa dos fornecedores inválida: use "sem_imposto" ou "preco_final".');

  let comparativo: Norm["comparativo"] = null;
  if (e.comparativoRegular) {
    if (regime !== "simples") erros.push("O comparativo com o regime regular só vale para empresa do Simples.");
    else {
      const ci = lerFracao(e.comparativoRegular.issPercentual, "ISS do comparativo", erros);
      const cm = lerFracao(e.comparativoRegular.icmsPercentual, "ICMS do comparativo", erros);
      if (ci && cm) comparativo = { regime: e.comparativoRegular.regime ?? "presumido", iss: ci, icms: cm };
    }
  }

  const ativ = e.atividadeMei ?? "servico";
  if (regime === "mei" && !["comercio", "servico", "comercio_e_servico"].includes(ativ)) erros.push("Atividade do MEI inválida: comercio, servico ou comercio_e_servico.");

  if (erros.length || !rec || !pj || !iss || !icms || !compReg || !margem) return { erros, n: null };
  return {
    erros,
    n: { regime, anexo, rec, rbt, pj, iss, icms, red, redMotivo, compReg, forn, margem, premissa, comparativo, atividadeMei: ativ },
  };
}

// ------------------------------------------------------------------ contexto de parâmetros

interface Ctx {
  P: Parametros;
  T: TabelasSimples;
  ano0: number;
  anoPleno: number;
  pa: (ano: number) => Parametros["porAno"][string];
  cbsPadrao: (ano: number) => Dec;
  ibs: (ano: number) => Dec;
  fator: (ano: number) => Dec;
  cobra: (ano: number) => Dec;
  pcf: (ano: number) => Dec;
  fonte: (k: string) => string;
}

function criarCtx(P: Parametros, T: TabelasSimples): Ctx {
  const pa = (ano: number) => {
    const x = P.porAno[String(ano)];
    if (!x) throw new ErroCalculo(`Não há parâmetros cadastrados para o ano ${ano}.`);
    return x;
  };
  const anoPleno = Math.max(...P.anos);
  const ano0 = Math.min(...P.anos);
  const cbsPadrao = (ano: number) => D(pa(ano).cbsReferencia.valor).menos(pa(ano).cbsMenosPP.valor);
  const ibsPleno = () => D(P.totalEstimado2033.valor).menos(D(pa(anoPleno).cbsReferencia.valor));
  const ibs = (ano: number) => {
    const p = pa(ano);
    if (p.ibsFixo) return D(p.ibsFixo.valor);
    if (p.ibsFracaoPleno) return D(p.ibsFracaoPleno.valor).vezes(ibsPleno());
    throw new ErroCalculo(`Parâmetro do IBS ausente para ${ano}.`);
  };
  return {
    P,
    T,
    ano0,
    anoPleno,
    pa,
    cbsPadrao,
    ibs,
    fator: (ano) => D(pa(ano).fatorIcmsIss.valor),
    cobra: (ano) => (pa(ano).cobraCbsIbs.valor ? UM : ZERO),
    pcf: (ano) => (pa(ano).pisCofinsAtivo.valor ? UM : ZERO),
    fonte: (k) => P.fontes[k] ?? k,
  };
}

// ------------------------------------------------------------------ tabelas do Simples

function linhaSimples(c: Ctx, anexo: AnexoSimples, ano: number, rbt: Dec): LinhaTabelaSimples {
  const linhas = c.T.linhas.filter((l) => l.anexo === anexo && l.ano === ano).sort((a, b) => a.faixa - b.faixa);
  if (!linhas.length) throw new ErroCalculo(`Tabela do Simples (Anexo ${anexo}, ${ano}) não cadastrada.`);
  let achada = linhas[0];
  for (const l of linhas) if (rbt.maiorOuIgual(l.de)) achada = l;
  return achada;
}

interface InfoSimples {
  linha: LinhaTabelaSimples;
  faixa: number;
  nominal: Dec;
  deduzir: Dec;
  ef: Dec;
  especial: boolean;
  pCbs: Dec;
  pIbs: Dec;
  pIssIcms: Dec;
  temPartilha: boolean;
}

function infoSimples(c: Ctx, anexo: AnexoSimples, ano: number, rbt: Dec, efOverride: Dec | null = null): InfoSimples {
  const linha = linhaSimples(c, anexo, ano, rbt);
  const nominal = D(linha.nominal);
  const deduzir = D(linha.deduzir);
  const ef = efOverride ?? rbt.vezes(nominal).menos(deduzir).dividido(rbt);
  const esp = c.T.faixa5Especial.find((x) => x.anexo === anexo && x.ano === ano && x.faixa === linha.faixa);
  // a regra especial usa a efetiva do próprio fornecedor/empresa pelo RBT12 (a alíquota informada só substitui o valor)
  const especial = !!esp && ef.maior(esp.efetivaAcimaDe);
  const part = linha.partilha;
  if (!part) return { linha, faixa: linha.faixa, nominal, deduzir, ef, especial: false, pCbs: ZERO, pIbs: ZERO, pIssIcms: ZERO, temPartilha: false };
  const g = (k: string) => D(part[k] ?? "0");
  let pCbs = g("CBS");
  let pIbs = g("IBS");
  let pIss = g("ISS");
  const pIcms = g("ICMS");
  if (especial && esp) {
    const teto = D(esp.issTeto);
    const exc = ef.menos(teto);
    pIss = teto.dividido(ef);
    pCbs = exc.vezes(esp.partilhaDoExcedente["CBS"] ?? "0").dividido(ef);
    pIbs = exc.vezes(esp.partilhaDoExcedente["IBS"] ?? "0").dividido(ef);
  }
  return { linha, faixa: linha.faixa, nominal, deduzir, ef, especial, pCbs, pIbs, pIssIcms: pIss.mais(pIcms), temPartilha: true };
}

// ------------------------------------------------------------------ memória de cálculo

class Memoria {
  linhas: LinhaMemoria[] = [];
  add(rotulo: string, formula: string, valor: Dec, unidade: "R$" | "%" | "", fonte: string, casas = 2) {
    this.linhas.push({ rotulo, formula, valor: valor.texto(unidade === "%" ? 12 : casas), unidade, fonte });
  }
}

const CHAVES_TAXA = new Set([
  "t_cbs", "t_ibs", "pct_receita", "pc_taxa", "reajuste", "nominal", "efetiva", "p_cbs", "p_ibs", "p_issicms",
  "f_efetiva", "f_pcbs", "f_pibs", "reaj_dentro", "reaj_hib", "margem_se_manter_preco",
]);
const CHAVES_INTEIRAS = new Set(["faixa", "f_faixa"]);
// valores fixos do MEI têm 3 casas (CBS R$ 0,994 + IBS R$ 0,006)
const CHAVES_MILESIMO = new Set(["cbs", "ibs"]);

function paraBloco(v: Record<string, Dec>): Bloco {
  const out: Bloco = {};
  for (const [k, x] of Object.entries(v)) {
    out[k] = CHAVES_INTEIRAS.has(k) ? x.texto(0) : CHAVES_TAXA.has(k) ? x.texto(12) : CHAVES_MILESIMO.has(k) ? x.texto(3) : x.texto(2);
  }
  return out;
}

// ------------------------------------------------------------------ bloco regime regular (Presumido / Real)

type Rec = Record<string, Dec>;

function pcParams(c: Ctx, regime: "presumido" | "real") {
  const p = c.P.pisCofins[regime];
  const pis = D(p.pis.valor);
  const cof = D(p.cofins.valor);
  return { pis, cof, credita: p.creditaCompras };
}

/** Crédito de CBS e IBS das compras (fornecedores regulares e do Simples). */
function creditosCompras(c: Ctx, n: Norm, ano: number): { cbs: Dec; ibs: Dec; forn: { nome: string; faixa: number; ef: Dec; pCbs: Dec; pIbs: Dec; cbs: Dec; ibs: Dec }[] } {
  const cobra = c.cobra(ano);
  const cbsP = c.cbsPadrao(ano);
  const ibsP = c.ibs(ano);
  const baseReg = n.premissa === "preco_final" ? n.compReg.dividido(UM.mais(cbsP).mais(ibsP)) : n.compReg;
  let cbs = r2(baseReg.vezes(cbsP).vezes(cobra));
  let ibs = r2(baseReg.vezes(ibsP).vezes(cobra));
  const forn = n.forn.map((f) => {
    const i = infoSimples(c, f.anexo, ano, f.rbt, f.efInformada);
    const fc = r2(f.valor.vezes(i.ef).vezes(i.pCbs).vezes(cobra));
    const fi = r2(f.valor.vezes(i.ef).vezes(i.pIbs).vezes(cobra));
    cbs = cbs.mais(fc);
    ibs = ibs.mais(fi);
    return { nome: f.nome, faixa: i.faixa, ef: i.ef, pCbs: i.pCbs, pIbs: i.pIbs, cbs: fc, ibs: fi };
  });
  return { cbs, ibs, forn };
}

function calcRegular(c: Ctx, n: Norm, ano: number, regime: "presumido" | "real", iss: Dec, icms: Dec, red: Dec, m: Memoria | null, rotulo: string): Rec {
  const rec = n.rec;
  const pc = pcParams(c, regime);
  const pcRate = pc.pis.mais(pc.cof);
  const pisC = pc.credita ? pc.pis : ZERO;
  const cofC = pc.credita ? pc.cof : ZERO;
  const fat = c.fator(ano);
  const cobra = c.cobra(ano);
  const pcf = c.pcf(ano);
  const cbsP = c.cbsPadrao(ano);
  const ibsP = c.ibs(ano);
  const tCbs = cbsP.vezes(UM.menos(red));
  const tIbs = ibsP.vezes(UM.menos(red));

  const issV = r2(rec.vezes(iss).vezes(fat));
  const icmsV = r2(rec.vezes(icms).vezes(fat));
  const pisDeb = r2(rec.vezes(pc.pis).vezes(pcf));
  const cofDeb = r2(rec.vezes(pc.cof).vezes(pcf));
  const pisCred = r2(n.compReg.vezes(pisC).vezes(pcf));
  const cofCred = r2(n.compReg.vezes(cofC).vezes(pcf));
  const pcLiq = pisDeb.menos(pisCred).mais(cofDeb).menos(cofCred);
  const base = rec.menos(issV).menos(icmsV);
  const cbsDeb = r2(base.vezes(tCbs).vezes(cobra));
  const ibsDeb = r2(base.vezes(tIbs).vezes(cobra));
  const cr = creditosCompras(c, n, ano);
  const cbsLiq = Dec.ZERO.max(cbsDeb.menos(cr.cbs));
  const ibsLiq = Dec.ZERO.max(ibsDeb.menos(cr.ibs));
  const total = pcLiq.mais(issV).mais(icmsV).mais(cbsLiq).mais(ibsLiq);
  const pcTaxa = pcRate.vezes(pcf);

  // custo bruto calibrado: hoje (ano de referência) preço = receita com a margem atual
  const fat0 = c.fator(c.ano0);
  const pcf0 = c.pcf(c.ano0);
  const d = r2(rec.vezes(UM.menos(n.margem).menos(iss.mais(icms).vezes(fat0)).menos(pcRate.vezes(pcf0))).mais(n.compReg.vezes(pisC.mais(cofC)).vezes(pcf0)));
  const credTot = pisCred.mais(cofCred).mais(cr.cbs).mais(cr.ibs);
  const den = UM.menos(n.margem).menos(iss.mais(icms).vezes(fat)).menos(pcTaxa);
  if (den.menorOuIgual(0)) throw new ErroCalculo("A margem somada aos impostos passa de 100% da receita: não há preço que feche a conta. Revise margem, ISS/ICMS e redução.");
  const pSem = r2(d.menos(credTot).dividido(den));
  const issP = r2(pSem.vezes(iss).vezes(fat));
  const icmsP = r2(pSem.vezes(icms).vezes(fat));
  const preco = r2(pSem.mais(r2(pSem.menos(issP).menos(icmsP).vezes(tCbs.mais(tIbs)).vezes(cobra))));

  const out: Rec = {
    t_cbs: tCbs, t_ibs: tIbs, iss: issV, icms: icmsV, pis_deb: pisDeb, cofins_deb: cofDeb, pis_cred: pisCred, cofins_cred: cofCred,
    pis_cofins: pcLiq, base, cbs_deb: cbsDeb, ibs_deb: ibsDeb, cbs_cred: cr.cbs, ibs_cred: cr.ibs, cbs_liq: cbsLiq, ibs_liq: ibsLiq,
    total, pct_receita: total.dividido(rec), valor_nota: rec.mais(cbsDeb).mais(ibsDeb), cred_cliente: r2(cbsDeb.mais(ibsDeb).vezes(n.pj)),
    pc_taxa: pcTaxa, d_custo: d, cred_tot: credTot, p_sem: pSem, iss_p: issP, icms_p: icmsP, preco_final: preco,
  };
  // extras (fora do gabarito): custo real do cliente PJ e margem se o preço não mudar
  const cbsIbsNoPreco = preco.menos(pSem);
  out["cbs_ibs_no_preco"] = cbsIbsNoPreco;
  out["custo_real_cliente_pj"] = preco.menos(cbsIbsNoPreco);
  const pSemMantido = rec.dividido(UM.mais(UM.menos(iss.mais(icms).vezes(fat)).vezes(tCbs.mais(tIbs)).vezes(cobra)));
  out["margem_se_manter_preco"] = UM.menos(iss.mais(icms).vezes(fat)).menos(pcTaxa).menos(d.menos(credTot).dividido(pSemMantido));

  if (m) {
    const fR = c.fonte("preco");
    const par = c.pa(ano);
    m.add(`${rotulo}CBS padrão do ano`, `referência ${pct(D(par.cbsReferencia.valor))} − ${pct(D(par.cbsMenosPP.valor))} = ${pct(cbsP)}`, cbsP, "%", par.cbsReferencia.fonte);
    m.add(`${rotulo}CBS efetiva`, `${pct(cbsP)} × (1 − redução ${pct(red, 0)}) = ${pct(tCbs)}`, tCbs, "%", c.fonte("debito"));
    m.add(`${rotulo}IBS efetivo`, `${pct(ibsP)} × (1 − redução ${pct(red, 0)}) = ${pct(tIbs)}`, tIbs, "%", par.ibsFixo?.fonte ?? par.ibsFracaoPleno?.fonte ?? c.fonte("debito"));
    if (iss.maior(0) || icms.maior(0)) {
      m.add(`${rotulo}ISS/ICMS na transição`, `receita ${brl(rec)} × (ISS ${pct(iss)} + ICMS ${pct(icms)}) × fator ${pct(fat, 0)} = ${brl(issV.mais(icmsV))}`, issV.mais(icmsV), "R$", par.fatorIcmsIss.fonte);
    }
    if (pcf.maior(0)) m.add(`${rotulo}PIS/Cofins líquido`, `débitos ${brl(pisDeb.mais(cofDeb))} − créditos ${brl(pisCred.mais(cofCred))} = ${brl(pcLiq)}`, pcLiq, "R$", c.fonte("pis_cofins"));
    m.add(`${rotulo}Base do IBS/CBS`, `receita ${brl(rec)} − ISS ${brl(issV)} − ICMS ${brl(icmsV)} = ${brl(base)}`, base, "R$", c.fonte("base"));
    m.add(`${rotulo}CBS e IBS debitados`, `base ${brl(base)} × (${pct(tCbs)} CBS + ${pct(tIbs)} IBS)${cobra.ehZero() ? " — 2026: valores de teste, não recolhidos" : ""} = ${brl(cbsDeb.mais(ibsDeb))}`, cbsDeb.mais(ibsDeb), "R$", c.fonte("debito"));
    m.add(`${rotulo}Crédito de CBS e IBS das compras`, `fornecedores regulares ${brl(n.compReg)}${n.premissa === "preco_final" ? " (preço final: base = valor ÷ (1 + CBS + IBS))" : ""} + fornecedores do Simples ${brl(n.forn.reduce((s, f) => s.mais(f.valor), ZERO))} = ${brl(cr.cbs.mais(cr.ibs))}`, cr.cbs.mais(cr.ibs), "R$", c.fonte("credito"));
    for (const f of cr.forn) {
      m.add(`${rotulo}Crédito do fornecedor do Simples (${f.nome})`, `compra × alíquota efetiva ${pct(f.ef)} × partilha CBS ${pct(f.pCbs)} / IBS ${pct(f.pIbs)} = ${brl(f.cbs.mais(f.ibs))}`, f.cbs.mais(f.ibs), "R$", c.fonte("credito_simples"));
    }
    m.add(`${rotulo}CBS e IBS a recolher`, `máx(0; débito − crédito) por tributo = CBS ${brl(cbsLiq)} + IBS ${brl(ibsLiq)}`, cbsLiq.mais(ibsLiq), "R$", c.fonte("credito"));
    m.add(`${rotulo}Imposto sobre consumo recolhido`, `PIS/Cofins ${brl(pcLiq)} + ISS ${brl(issV)} + ICMS ${brl(icmsV)} + CBS ${brl(cbsLiq)} + IBS ${brl(ibsLiq)} = ${brl(total)} (${pct(out.pct_receita)} da receita)`, total, "R$", fR);
    m.add(`${rotulo}Preço sem CBS/IBS que mantém a margem`, `(custo calibrado ${brl(d)} − créditos ${brl(credTot)}) ÷ (1 − margem ${pct(n.margem)} − ISS/ICMS − PIS/Cofins) = ${brl(pSem)}`, pSem, "R$", fR);
    m.add(`${rotulo}Preço final com CBS/IBS por fora`, `${brl(pSem)} + (${brl(pSem)} − ISS/ICMS ${brl(issP.mais(icmsP))}) × ${pct(tCbs.mais(tIbs))} = ${brl(preco)}`, preco, "R$", fR);
    m.add(`${rotulo}Custo real para o cliente PJ`, `preço ${brl(preco)} − crédito de CBS/IBS que ele recebe ${brl(cbsIbsNoPreco)} = ${brl(preco.menos(cbsIbsNoPreco))}`, preco.menos(cbsIbsNoPreco), "R$", fR);
  }
  return out;
}

function finalizaRegular(porAno: Map<number, Rec>, ano0: number) {
  const b = porAno.get(ano0);
  if (!b) throw new ErroCalculo("Ano de referência ausente.");
  for (const r of porAno.values()) {
    r.delta = r.total.menos(b.total);
    r.reajuste = r.preco_final.dividido(b.preco_final).menos(1);
  }
}

// ------------------------------------------------------------------ Simples

interface SimplesCalc {
  v: Rec;
  info: InfoSimples;
  fora: Dec;
  foraTaxa: Dec;
  fornCred: ReturnType<typeof creditosCompras>["forn"];
}

function calcSimples(c: Ctx, n: Norm, ano: number, motivos: string[], m: Memoria | null): SimplesCalc {
  const anexo = n.anexo as AnexoSimples;
  const rbt = n.rbt as Dec;
  const rec = n.rec;
  const fat = c.fator(ano);
  const cobra = c.cobra(ano);
  const info = infoSimples(c, anexo, ano, rbt);
  const { ef } = info;
  const das = r2(rec.vezes(ef));
  const dasCbs = r2(rec.vezes(ef).vezes(info.pCbs));
  const dasIbs = r2(rec.vezes(ef).vezes(info.pIbs));
  const dasIi = r2(rec.vezes(ef).vezes(info.pIssIcms));
  const credDas = dasCbs.mais(dasIbs);
  const dasHib = das.menos(dasCbs).menos(dasIbs);
  const tCbs = c.cbsPadrao(ano).vezes(UM.menos(n.red));
  const tIbs = c.ibs(ano).vezes(UM.menos(n.red));
  // 6ª faixa: ICMS/ISS saem do DAS e são recolhidos por fora (a partilha não traz ICMS/ISS)
  const foraTaxa = info.faixa >= c.P.simples.issIcmsForaDoDasAPartirDaFaixa.valor ? n.iss.mais(n.icms).vezes(fat) : ZERO;
  const fora = r2(rec.vezes(foraTaxa));
  const base = rec.menos(dasIi).menos(fora);
  const cbsDeb = r2(base.vezes(tCbs).vezes(cobra));
  const ibsDeb = r2(base.vezes(tIbs).vezes(cobra));
  const cr = creditosCompras(c, n, ano);
  const cbsLiq = ZERO.max(cbsDeb.menos(cr.cbs));
  const ibsLiq = ZERO.max(ibsDeb.menos(cr.ibs));
  const totalHib = dasHib.mais(cbsLiq).mais(ibsLiq);
  const credHib = r2(cbsDeb.mais(ibsDeb).vezes(n.pj));
  const credDasPj = r2(credDas.vezes(n.pj));
  const f0 = cr.forn[0];
  const v: Rec = {
    faixa: D(info.faixa), nominal: info.nominal, deduzir: info.deduzir, efetiva: ef, das,
    p_cbs: info.pCbs, p_ibs: info.pIbs, p_issicms: info.pIssIcms, das_cbs: dasCbs, das_ibs: dasIbs, das_issicms: dasIi,
    cred_das: credDas, cred_das_pj: credDasPj, das_hib: dasHib, t_cbs: tCbs, t_ibs: tIbs, base_hib: base, cbs_deb: cbsDeb, ibs_deb: ibsDeb,
    f_faixa: f0 ? D(f0.faixa) : UM, f_efetiva: f0 ? f0.ef : ZERO, f_pcbs: f0 ? f0.pCbs : ZERO, f_pibs: f0 ? f0.pIbs : ZERO,
    cbs_cred: cr.cbs, ibs_cred: cr.ibs, cbs_liq: cbsLiq, ibs_liq: ibsLiq, total_hib: totalHib, dif_custo: totalHib.menos(das),
    cred_hib: credHib, dif_cred: credHib.menos(credDasPj),
    saldo: credHib.menos(credDasPj).menos(totalHib.menos(das)),
    nota_hib: rec.mais(cbsDeb).mais(ibsDeb),
  };
  v.iss_icms_fora_do_das = fora;

  // cobertura do gabarito
  const cob = c.P.simples.coberturaGabarito[anexo] ?? [];
  if (!cob.includes(info.faixa)) motivos.push(`Anexo ${anexo}, ${info.faixa}ª faixa: sem caso-ouro (calculado pela lei).`);
  if (info.especial) motivos.push(`Anexo ${anexo}, 5ª faixa com alíquota efetiva acima de ${pct(D(c.T.faixa5Especial.find((x) => x.anexo === anexo && x.ano === ano)!.efetivaAcimaDe), 5)}: regra especial do teto de ISS, sem caso-ouro.`);
  if (info.faixa >= c.P.simples.issIcmsForaDoDasAPartirDaFaixa.valor) motivos.push(`${info.faixa}ª faixa do Simples: ICMS/ISS recolhidos por fora do DAS, sem caso-ouro.`);
  for (const f of n.forn) {
    const fi = infoSimples(c, f.anexo, ano, f.rbt, f.efInformada);
    const cf = c.P.simples.coberturaGabarito[f.anexo] ?? [];
    if (!cf.includes(fi.faixa)) motivos.push(`Fornecedor do Simples (Anexo ${f.anexo}, ${fi.faixa}ª faixa): sem caso-ouro.`);
    if (fi.especial) motivos.push(`Fornecedor do Simples na regra especial da 5ª faixa (Anexo ${f.anexo}): sem caso-ouro.`);
  }

  if (m) {
    const sp = "Simples: ";
    m.add(`${sp}Faixa e alíquota efetiva`, `${info.faixa}ª faixa (Anexo ${anexo}): (RBT12 ${brl(rbt)} × ${pct(info.nominal)} − dedução ${brl(info.deduzir)}) ÷ RBT12 = ${pct(ef, 6)}`, ef, "%", c.fonte("das"));
    m.add(`${sp}DAS do mês`, `receita ${brl(rec)} × ${pct(ef, 6)} = ${brl(das)}`, das, "R$", c.fonte("das"));
    if (info.temPartilha) {
      m.add(`${sp}Partilha de CBS e IBS no DAS${info.especial ? " (regra especial da 5ª faixa)" : ""}`, `CBS ${pct(info.pCbs, 6)} e IBS ${pct(info.pIbs, 6)}; ISS+ICMS ${pct(info.pIssIcms, 6)} do DAS`, info.pCbs.mais(info.pIbs), "%", info.especial ? c.fonte("faixa5") : c.fonte("partilha"));
      m.add(`${sp}CBS/IBS dentro do DAS (crédito do cliente PJ)`, `DAS ${brl(das)} × (${pct(info.pCbs, 6)} + ${pct(info.pIbs, 6)}) = ${brl(credDas)}; × ${pct(n.pj, 0)} das vendas a PJ = ${brl(credDasPj)}`, credDas, "R$", c.fonte("credito_simples"));
    }
    if (fora.maior(0)) m.add(`${sp}ISS/ICMS recolhidos por fora do DAS (6ª faixa)`, `receita ${brl(rec)} × (ISS ${pct(n.iss)} + ICMS ${pct(n.icms)}) × fator ${pct(fat, 0)} = ${brl(fora)}`, fora, "R$", c.pa(ano).fatorIcmsIss.fonte);
    m.add(`${sp}Híbrido: DAS sem CBS/IBS`, `DAS ${brl(das)} − CBS ${brl(dasCbs)} − IBS ${brl(dasIbs)} = ${brl(dasHib)}`, dasHib, "R$", c.fonte("hibrido"));
    m.add(`${sp}Híbrido: base do IBS/CBS`, `receita ${brl(rec)} − ISS/ICMS da parcela do DAS ${brl(dasIi)}${fora.maior(0) ? ` − ISS/ICMS por fora ${brl(fora)}` : ""} = ${brl(base)}`, base, "R$", c.fonte("base"));
    m.add(`${sp}Híbrido: CBS e IBS debitados`, `base ${brl(base)} × (${pct(tCbs)} + ${pct(tIbs)})${cobra.ehZero() ? " — 2026: valores de teste, não recolhidos" : ""} = ${brl(cbsDeb.mais(ibsDeb))}`, cbsDeb.mais(ibsDeb), "R$", c.fonte("hibrido"));
    m.add(`${sp}Híbrido: crédito das compras`, `fornecedores regulares ${brl(n.compReg)} + fornecedores do Simples ${brl(n.forn.reduce((s, f) => s.mais(f.valor), ZERO))} = ${brl(cr.cbs.mais(cr.ibs))}`, cr.cbs.mais(cr.ibs), "R$", c.fonte("credito"));
    for (const f of cr.forn) m.add(`${sp}Crédito do fornecedor do Simples (${f.nome})`, `compra × efetiva ${pct(f.ef)} × partilha CBS ${pct(f.pCbs)} / IBS ${pct(f.pIbs)} = ${brl(f.cbs.mais(f.ibs))}`, f.cbs.mais(f.ibs), "R$", c.fonte("credito_simples"));
    m.add(`${sp}Híbrido: total recolhido`, `DAS sem CBS/IBS ${brl(dasHib)} + CBS ${brl(cbsLiq)} + IBS ${brl(ibsLiq)} = ${brl(totalHib)} (DAS puro: ${brl(das)})`, totalHib, "R$", c.fonte("hibrido"));
  }
  return { v, info, fora, foraTaxa, fornCred: cr.forn };
}

/** Preço e opções do Simples, depois que o ano de referência já foi calculado. */
function precosSimples(c: Ctx, n: Norm, ano: number, s: SimplesCalc, ref: SimplesCalc, m: Memoria | null) {
  const rec = n.rec;
  const v = s.v;
  const ef = v.efetiva;
  const d = r2(rec.vezes(UM.menos(n.margem).menos(ref.v.efetiva).menos(ref.foraTaxa)));
  const pDentro = r2(d.dividido(UM.menos(n.margem).menos(ef).menos(s.foraTaxa)));
  const credTot = v.cbs_cred.mais(v.ibs_cred);
  const denH = UM.menos(n.margem).menos(ef.vezes(UM.menos(v.p_cbs).menos(v.p_ibs))).menos(s.foraTaxa);
  if (denH.menorOuIgual(0) || UM.menos(n.margem).menos(ef).menos(s.foraTaxa).menorOuIgual(0)) {
    throw new ErroCalculo("A margem somada aos impostos passa de 100% da receita: não há preço que feche a conta. Revise margem e alíquotas.");
  }
  const pSemH = r2(d.menos(credTot).dividido(denH));
  const iiP = r2(pSemH.vezes(ef.vezes(v.p_issicms).mais(s.foraTaxa)));
  const tt = v.t_cbs.mais(v.t_ibs);
  const cobra = c.cobra(ano);
  const precoHib = r2(pSemH.mais(r2(pSemH.menos(iiP).vezes(tt).vezes(cobra))));
  v.d_custo = d;
  v.p_dentro = pDentro;
  v.cred_tot = credTot;
  v.p_sem_h = pSemH;
  v.issicms_p = iiP;
  v.preco_hib = precoHib;

  // extras
  const credDasUnit = r2(pDentro.vezes(ef).vezes(v.p_cbs)).mais(r2(pDentro.vezes(ef).vezes(v.p_ibs)));
  v.custo_real_das_pj = pDentro.menos(credDasUnit);
  v.cbs_ibs_no_preco_das = credDasUnit;
  v.cbs_ibs_no_preco_hib = precoHib.menos(pSemH);
  v.custo_real_hib_pj = precoHib.menos(precoHib.menos(pSemH));
  v.margem_das_se_manter_preco = UM.menos(ef).menos(s.foraTaxa).menos(d.dividido(rec));
  const pSemMant = rec.dividido(UM.mais(UM.menos(ef.vezes(v.p_issicms)).menos(s.foraTaxa).vezes(tt).vezes(cobra)));
  v.margem_hib_se_manter_preco = UM.menos(ef.vezes(UM.menos(v.p_cbs).menos(v.p_ibs))).menos(s.foraTaxa).menos(d.menos(credTot).dividido(pSemMant));

  if (m) {
    const sp = "Simples: ";
    const fP = c.fonte("preco");
    m.add(`${sp}Custo bruto calibrado (hoje)`, `receita ${brl(rec)} × (1 − margem ${pct(n.margem)} − alíquota efetiva do ano de referência ${pct(ref.v.efetiva, 6)}) = ${brl(d)}`, d, "R$", fP);
    m.add(`${sp}DAS puro: preço que mantém a margem`, `custo ${brl(d)} ÷ (1 − margem ${pct(n.margem)} − efetiva ${pct(ef, 6)}) = ${brl(pDentro)}`, pDentro, "R$", fP);
    m.add(`${sp}DAS puro: custo real para o cliente PJ`, `preço ${brl(pDentro)} − crédito de CBS/IBS do DAS ${brl(credDasUnit)} = ${brl(v.custo_real_das_pj)}`, v.custo_real_das_pj, "R$", c.fonte("credito_simples"));
    m.add(`${sp}Híbrido: preço sem CBS/IBS`, `(custo ${brl(d)} − créditos ${brl(credTot)}) ÷ (1 − margem − efetiva × (1 − partilha CBS/IBS)) = ${brl(pSemH)}`, pSemH, "R$", fP);
    m.add(`${sp}Híbrido: preço final`, `${brl(pSemH)} + (${brl(pSemH)} − ISS/ICMS ${brl(iiP)}) × ${pct(tt)} = ${brl(precoHib)}`, precoHib, "R$", fP);
    m.add(`${sp}Híbrido: custo real para o cliente PJ`, `preço ${brl(precoHib)} − crédito de CBS/IBS destacado ${brl(precoHib.menos(pSemH))} = ${brl(v.custo_real_hib_pj)}`, v.custo_real_hib_pj, "R$", fP);
  }
}

// ------------------------------------------------------------------ MEI

function calcMei(c: Ctx, n: Norm, ano: number, m: Memoria | null): Rec {
  const t = c.P.mei[String(ano)];
  if (!t) throw new ErroCalculo(`Valores do MEI de ${ano} não cadastrados.`);
  const comercio = n.atividadeMei !== "servico";
  const servico = n.atividadeMei !== "comercio";
  const icms = comercio ? D(t.icms) : ZERO;
  const iss = servico ? D(t.iss) : ZERO;
  const cbs = D(t.cbs);
  const ibs = D(t.ibs);
  const total = r2(icms.mais(iss).mais(cbs).mais(ibs));
  if (m) m.add("MEI: valor fixo mensal (DAS-MEI sem INSS)", `ICMS ${brl(icms)} + ISS ${brl(iss)} + CBS ${numeroBR(cbs, 3)} + IBS ${numeroBR(ibs, 3)} = ${brl(total)}`, total, "R$", t.fonte);
  return { iss, icms, cbs, ibs, total, anual: total.vezes(12) };
}

// ------------------------------------------------------------------ opções e avisos

function opcao(id: OpcaoPreco["id"], rotulo: string, preco: Dec, cbsIbs: Dec, custoReal: Dec, margemMant: Dec, margem: Dec, imposto: Dec, reajuste: Dec): OpcaoPreco {
  return {
    id, rotulo, precoNecessario: preco.texto(2), cbsIbsNoPreco: cbsIbs.texto(2), custoRealClientePJ: custoReal.texto(2),
    margemComPrecoNecessario: margem.texto(12), margemSeManterPreco: margemMant.texto(12), impostoRecolhido: imposto.texto(2), reajustePreco: reajuste.texto(12),
  };
}

function avisoDe(p: Param<unknown> | null, codigo: string, avisos: Map<string, Aviso>) {
  if (p && p.status === "ESTIMATIVA" && p.aviso && !avisos.has(p.aviso)) avisos.set(p.aviso, { codigo, tipo: "estimativa", texto: p.aviso, fonte: p.fonte });
}

// ------------------------------------------------------------------ cálculo completo

export function calcularReforma(entrada: EntradaCliente, parametros: Parametros, tabelas: TabelasSimples): RetornoCalculo {
  const { erros, n } = normalizar(entrada, parametros);
  if (!n) return { ok: false, erros };
  try {
    return { ok: true, resultado: calcularNormalizado(n, parametros, tabelas) };
  } catch (e) {
    if (e instanceof ErroCalculo) return { ok: false, erros: [e.message] };
    throw e;
  }
}

function calcularNormalizado(n: Norm, P: Parametros, T: TabelasSimples): ResultadoReforma {
  const c = criarCtx(P, T);
  const anos = [...P.anos].sort((a, b) => a - b);
  const ano0 = anos[0];
  const avisos = new Map<string, Aviso>();
  const resultado: Record<number, ResultadoAno> = {};
  const regimeRegular = n.regime === "presumido" || n.regime === "real" ? n.regime : null;

  // 1ª passada: números por ano
  const regPorAno = new Map<number, Rec>();
  const rgPorAno = new Map<number, Rec>();
  const simPorAno = new Map<number, SimplesCalc>();
  const meiPorAno = new Map<number, Rec>();
  const mem = new Map<number, Memoria>();
  const motivos = new Map<number, string[]>();
  for (const ano of anos) {
    const m = new Memoria();
    mem.set(ano, m);
    const mot: string[] = [];
    motivos.set(ano, mot);
    if (!P.anosComGabarito.includes(ano)) mot.push(`${ano} não tem caso-ouro: usa os parâmetros do ano (ver avisos de estimativa).`);
    if (regimeRegular) regPorAno.set(ano, calcRegular(c, n, ano, regimeRegular, n.iss, n.icms, n.red, m, ""));
    if (n.regime === "simples") {
      simPorAno.set(ano, calcSimples(c, n, ano, mot, m));
      if (n.comparativo) rgPorAno.set(ano, calcRegular(c, n, ano, n.comparativo.regime, n.comparativo.iss, n.comparativo.icms, ZERO, m, "Comparativo regular: "));
    }
    if (n.regime === "mei") meiPorAno.set(ano, calcMei(c, n, ano, m));
  }
  if (regimeRegular) finalizaRegular(regPorAno, ano0);
  if (rgPorAno.size) finalizaRegular(rgPorAno, ano0);
  if (n.regime === "simples") {
    const ref = simPorAno.get(ano0) as SimplesCalc;
    for (const ano of anos) precosSimples(c, n, ano, simPorAno.get(ano) as SimplesCalc, ref, mem.get(ano) as Memoria);
    const p0 = (simPorAno.get(ano0) as SimplesCalc).v;
    // p_dentro do ano de referência precisa existir antes de calcular os reajustes
    for (const ano of anos) {
      const v = (simPorAno.get(ano) as SimplesCalc).v;
      v.reaj_dentro = v.p_dentro.dividido(p0.p_dentro).menos(1);
      v.reaj_hib = v.preco_hib.dividido(p0.p_dentro).menos(1);
    }
  }
  if (n.regime === "mei") {
    const b = meiPorAno.get(ano0) as Rec;
    for (const r of meiPorAno.values()) r.delta = r.total.menos(b.total);
  }

  // 2ª passada: montar saída
  for (const ano of anos) {
    const opcoes: OpcaoPreco[] = [];
    const out: ResultadoAno = {
      ano,
      semGabarito: false,
      motivosSemGabarito: [],
      aliquotas: { cbsPadrao: c.cbsPadrao(ano).texto(12), ibsPadrao: c.ibs(ano).texto(12), fatorIcmsIss: c.fator(ano).texto(12), cobraCbsIbs: c.cobra(ano).igual(1) },
      opcoes,
      memoria: (mem.get(ano) as Memoria).linhas,
    };
    const rg = regPorAno.get(ano);
    if (rg) {
      out.regular = paraBloco(rg);
      opcoes.push(opcao("regime_atual", `Regime ${n.regime === "real" ? "Lucro Real" : "Lucro Presumido"}`, rg.preco_final, rg.cbs_ibs_no_preco, rg.custo_real_cliente_pj, rg.margem_se_manter_preco, n.margem, rg.total, rg.reajuste));
      delete (out.regular as Bloco).cbs_ibs_no_preco;
      delete (out.regular as Bloco).custo_real_cliente_pj;
      delete (out.regular as Bloco).margem_se_manter_preco;
    }
    const sm = simPorAno.get(ano);
    if (sm) {
      const v = sm.v;
      out.simples = paraBloco(v);
      for (const k of ["custo_real_das_pj", "cbs_ibs_no_preco_das", "cbs_ibs_no_preco_hib", "custo_real_hib_pj", "margem_das_se_manter_preco", "margem_hib_se_manter_preco"]) delete out.simples[k];
      opcoes.push(opcao("das", "Simples: tudo dentro do DAS", v.p_dentro, v.cbs_ibs_no_preco_das, v.custo_real_das_pj, v.margem_das_se_manter_preco, n.margem, v.das.mais(sm.fora), v.reaj_dentro));
      opcoes.push(opcao("hibrido", "Simples híbrido (IBS/CBS por fora do DAS)", v.preco_hib, v.cbs_ibs_no_preco_hib, v.custo_real_hib_pj, v.margem_hib_se_manter_preco, n.margem, v.total_hib.mais(sm.fora), v.reaj_hib));
    }
    const cr = rgPorAno.get(ano);
    if (cr) {
      out.comparativoRegular = paraBloco(cr);
      for (const k of ["cbs_ibs_no_preco", "custo_real_cliente_pj", "margem_se_manter_preco"]) delete out.comparativoRegular[k];
    }
    const me = meiPorAno.get(ano);
    if (me) out.mei = paraBloco(me);
    const mot = motivos.get(ano) as string[];
    out.motivosSemGabarito = [...new Set(mot)];
    out.semGabarito = out.motivosSemGabarito.length > 0;
    resultado[ano] = out;
  }

  // avisos
  const todosMotivos = new Set<string>();
  for (const a of anos) for (const mt of motivos.get(a) as string[]) if (!mt.includes("não tem caso-ouro")) todosMotivos.add(mt);
  for (const a of anos) {
    const p = c.pa(a);
    avisoDe(p.cbsReferencia, "cbs_referencia", avisos);
    avisoDe(p.ibsFixo, "ibs", avisos);
    avisoDe(p.ibsFracaoPleno, "ibs_fracao", avisos);
    avisoDe(p.cbsMenosPP, "cbs_menos", avisos);
    avisoDe(p.fatorIcmsIss, "fator", avisos);
  }
  avisoDe(P.totalEstimado2033, "total_2033", avisos);
  for (const a of P.avisosFixos) avisos.set(a.codigo, { codigo: a.codigo, tipo: a.tipo, texto: a.texto, fonte: a.fonte });
  const anosSem = anos.filter((a) => !P.anosComGabarito.includes(a));
  if (anosSem.length) avisos.set("anos_sem_gabarito", { codigo: "anos_sem_gabarito", tipo: "atencao", texto: `Anos ${anosSem.join(", ")} não têm caso-ouro: calculados só pelos parâmetros (2028 = regras de 2027; IBS de 2030 a 2032 proporcional, estimativa).` });
  avisos.set("premissa_fornecedores", {
    codigo: "premissa_fornecedores",
    tipo: "atencao",
    texto: n.premissa === "sem_imposto"
      ? "Premissa: os fornecedores mantêm o preço sem imposto (o CBS/IBS entra por fora e vira crédito)."
      : "Premissa: os fornecedores mantêm o preço final (o crédito sai de dentro do preço: valor × alíquota ÷ (1 + alíquota)).",
  });
  if (n.red.maior(0)) {
    const cat = P.reducoes.find((r) => r.codigo === n.redMotivo);
    avisos.set("reducao", { codigo: "reducao", tipo: "atencao", texto: `Redução de ${pct(n.red, 0)} (${cat?.descricao ?? n.redMotivo}): confirme os requisitos legais antes de aplicar.`, fonte: cat?.fonte });
    if (n.regime === "simples") avisos.set("reducao_simples", { codigo: "reducao_simples", tipo: "atencao", texto: "A redução setorial só vale no regime regular de IBS/CBS (híbrido); dentro do DAS vale a partilha da tabela." });
  }
  if (n.regime === "simples") {
    for (const pz of P.prazosSimples) avisos.set(pz.codigo, { codigo: pz.codigo, tipo: "atencao", texto: pz.texto, fonte: pz.fonte });
    if (n.forn.length) avisos.set("fornecedor_simples", { codigo: "fornecedor_simples", tipo: "atencao", texto: "Crédito de compra do Simples = compra × alíquota efetiva do fornecedor × partilha de CBS/IBS; a alíquota efetiva do fornecedor vem do RBT12 informado (ou da alíquota efetiva informada)." });
    if (anos.some((a) => c.T.linhas.some((l) => l.ano === a && l.anexo === n.anexo && l.conferir))) {
      avisos.set("tabela_2026", { codigo: "tabela_2026", tipo: "atencao", texto: "Tabela do Simples de 2026 marcada para conferir no Planalto (LC 123 vigente)." });
    }
  }
  if (n.regime === "mei") avisos.set("mei", { codigo: "mei", tipo: "pendencia", texto: "MEI: o crédito de quem compra do MEI e o regulamento do valor fixo de IBS/CBS não estão definidos; confira se o R$ 1 de CBS/IBS soma ao DAS-MEI de quem só presta serviço ou só vende mercadoria." });
  for (const mt of todosMotivos) avisos.set("sg:" + mt, { codigo: "sem_gabarito", tipo: "atencao", texto: mt });

  return { regime: n.regime, versaoParametros: P.versao, anos: resultado, avisos: [...avisos.values()] };
}
