// Modelo do cliente do contador: formulário em texto (formato brasileiro), validação por passo
// e conversão para a entrada do motor (lib/reforma). Nenhuma regra da lei fica aqui: tudo vem de parametros.json.
import { D } from "../reforma/decimal.ts";
import { PARAMETROS_PADRAO, TABELAS_SIMPLES_PADRAO, calcularComPadrao } from "../reforma/padrao.ts";
import type { AnexoSimples, AtividadeMei, EntradaCliente, FornecedorSimples, PremissaFornecedores, Regime, RetornoCalculo } from "../reforma/tipos.ts";
import { fracaoParaCampoPercentual, lerNumeroBR, lerPercentualBR, numeroParaBR } from "./numeros.ts";
import { CHECKLIST_127, acharSetor } from "./setores.ts";

export interface FornecedorForm {
  id: string;
  nome: string;
  valor: string;
  anexo: AnexoSimples | "";
  rbt12: string;
  aliquota: string;
}

export interface ClienteForm {
  nome: string;
  uf: string;
  municipio: string;
  setorId: string;
  /** Código da redução (parametros.json). Começa na sugestão do setor, a pessoa pode trocar. */
  reducaoCodigo: string;
  reducaoOutroPct: string;
  reducaoOutroMotivo: string;
  checklist: Record<string, boolean>;
  regime: Regime | "";
  anexo: AnexoSimples | "";
  atividadeMei: AtividadeMei | "";
  receitaMensal: string;
  rbt12: string;
  pctPJ: string;
  iss: string;
  icms: string;
  comprasRegulares: string;
  fornecedores: FornecedorForm[];
  margem: string;
  premissa: PremissaFornecedores;
}

export interface Cliente {
  id: string;
  criadoEm: string;
  atualizadoEm: string;
  rascunho: boolean;
  /** Último passo aberto (1 a 5), para continuar o rascunho de onde parou. */
  passo: number;
  form: ClienteForm;
}

export interface Escritorio {
  nome: string;
  crc: string;
  whatsapp: string;
  cor: string;
  /** Imagem em data URL (reduzida no navegador). */
  logo: string | null;
  configurado: boolean;
  atualizadoEm: string;
}

export const ESCRITORIO_VAZIO: Escritorio = { nome: "", crc: "", whatsapp: "", cor: "#1F4E79", logo: null, configurado: false, atualizadoEm: "" };

export const UFS = ["AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"];

export const ROTULO_REGIME: Record<Regime, string> = {
  simples: "Simples Nacional",
  presumido: "Lucro Presumido",
  real: "Lucro Real",
  mei: "MEI",
};

export const ANEXOS: { id: AnexoSimples; rotulo: string }[] = [
  { id: "I", rotulo: "Anexo I (comércio)" },
  { id: "II", rotulo: "Anexo II (indústria)" },
  { id: "III", rotulo: "Anexo III (serviços e locação)" },
  { id: "IV", rotulo: "Anexo IV (construção, vigilância, limpeza…)" },
  { id: "V", rotulo: "Anexo V (serviços intelectuais)" },
];

/** Identificador no formato UUID (o mesmo que o banco usa para o cliente). */
export function novoId(): string {
  const c = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (c?.randomUUID) return c.randomUUID();
  const h = () => Math.floor(Math.random() * 16).toString(16);
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (ch) => (ch === "x" ? h() : ((Math.floor(Math.random() * 4) + 8).toString(16))));
}

export function formVazio(): ClienteForm {
  return {
    nome: "", uf: "", municipio: "", setorId: "", reducaoCodigo: "nenhuma", reducaoOutroPct: "", reducaoOutroMotivo: "",
    checklist: {}, regime: "", anexo: "", atividadeMei: "",
    receitaMensal: "", rbt12: "", pctPJ: "", iss: "", icms: "",
    comprasRegulares: "", fornecedores: [], margem: "15", premissa: PARAMETROS_PADRAO.premissaFornecedoresPadrao,
  };
}

export function fornecedorVazio(): FornecedorForm {
  return { id: novoId(), nome: "", valor: "", anexo: "", rbt12: "", aliquota: "" };
}

// ---------------------------------------------------------------- redução

export interface ReducaoEfetiva {
  /** Fração decimal ("0.3") ou "0". */
  percentual: string;
  motivo: string;
  aplicada: boolean;
  /** Quando a sugestão do setor NÃO está sendo aplicada, o porquê (mostrado na tela). */
  aviso?: string;
}

export function checklistCompleto(f: ClienteForm): boolean {
  return CHECKLIST_127.every((c) => f.checklist[c.id] === true);
}

export function reducaoEfetiva(f: ClienteForm): ReducaoEfetiva {
  const codigo = f.reducaoCodigo || "nenhuma";
  if (codigo === "nenhuma") return { percentual: "0", motivo: "", aplicada: false };
  const cat = PARAMETROS_PADRAO.reducoes.find((r) => r.codigo === codigo);
  const setor = acharSetor(f.setorId);
  if (codigo === "profissao_regulamentada") {
    if (setor?.educacaoFisica) return { percentual: "0", motivo: codigo, aplicada: false, aviso: "Empresa (PJ) de educação física não tem a redução de 30% (art. 127 §3º). O cálculo segue sem redução." };
    if (!checklistCompleto(f)) return { percentual: "0", motivo: codigo, aplicada: false, aviso: "Marque todas as condições do art. 127 para aplicar os −30%. Enquanto isso, o cálculo segue sem redução." };
  }
  if (codigo === "outro") {
    const p = lerPercentualBR(f.reducaoOutroPct);
    if (p === null) return { percentual: "0", motivo: "outro", aplicada: false, aviso: "Informe o percentual da redução." };
    return { percentual: p, motivo: "outro", aplicada: !D(p).ehZero() };
  }
  if (!cat || cat.percentual === null) return { percentual: "0", motivo: "", aplicada: false };
  return { percentual: cat.percentual, motivo: codigo, aplicada: !D(cat.percentual).ehZero() };
}

export function descricaoReducao(codigo: string): string {
  return PARAMETROS_PADRAO.reducoes.find((r) => r.codigo === codigo)?.descricao ?? "Sem redução";
}

export function percentualDaReducao(codigo: string): string | null {
  return PARAMETROS_PADRAO.reducoes.find((r) => r.codigo === codigo)?.percentual ?? null;
}

// ---------------------------------------------------------------- limites

/** Receita anual a partir da qual o ISS/ICMS passa a ser cobrado por fora do DAS (6ª faixa da tabela do anexo). */
export function limiteIssIcmsForaDoDas(anexo: AnexoSimples | ""): number | null {
  if (!anexo) return null;
  const faixa = PARAMETROS_PADRAO.simples.issIcmsForaDoDasAPartirDaFaixa.valor;
  const linha = TABELAS_SIMPLES_PADRAO.linhas.find((l) => l.anexo === anexo && l.faixa === faixa);
  if (!linha) return null;
  const n = Number(linha.de);
  return Number.isFinite(n) ? n : null;
}

export function mostraIssIcms(f: ClienteForm): boolean {
  if (f.regime === "presumido" || f.regime === "real") return true;
  if (f.regime === "simples") {
    const lim = limiteIssIcmsForaDoDas(f.anexo);
    const rbt = lerNumeroBR(f.rbt12);
    return lim !== null && rbt !== null && Number(rbt) >= lim;
  }
  return false;
}

export function rbt12Sugerido(f: ClienteForm): string {
  const r = lerNumeroBR(f.receitaMensal);
  return r === null ? "" : numeroParaBR(D(r).vezes(12).texto(2), 2);
}

// ---------------------------------------------------------------- validação por passo

export type Erros = Record<string, string>;

const LIMITE_SIMPLES = () => D(PARAMETROS_PADRAO.simples.limiteRBT12.valor);
const LIMITE_MEI = () => D(PARAMETROS_PADRAO.meiLimiteAnual.valor);

function dinheiroOpcional(valor: string, campo: string, rotulo: string, erros: Erros): string | null {
  if (!valor.trim()) return null;
  const n = lerNumeroBR(valor);
  if (n === null || n.startsWith("-")) {
    erros[campo] = `${rotulo}: digite um valor em reais, como 1.234,56.`;
    return null;
  }
  return n;
}

function percentual(valor: string, campo: string, rotulo: string, erros: Erros, obrigatorio: boolean): string | null {
  if (!valor.trim()) {
    if (obrigatorio) erros[campo] = `${rotulo}: informe um percentual entre 0% e 100%.`;
    return null;
  }
  const p = lerPercentualBR(valor);
  if (p === null || p.startsWith("-")) {
    erros[campo] = `${rotulo}: digite um percentual, como 12,5.`;
    return null;
  }
  if (D(p).maior(1)) {
    erros[campo] = `${rotulo} não pode passar de 100%.`;
    return null;
  }
  return p;
}

export function validarPasso(passo: number, f: ClienteForm): Erros {
  const e: Erros = {};
  if (passo === 1) {
    if (!f.nome.trim()) e.nome = "Informe o nome da empresa.";
    if (!f.uf) e.uf = "Escolha o estado (UF).";
    if (!f.municipio.trim()) e.municipio = "Informe o município.";
    if (!f.setorId) e.setorId = "Escolha a atividade da empresa.";
    if (f.reducaoCodigo === "outro") {
      const p = percentual(f.reducaoOutroPct, "reducaoOutroPct", "Redução", e, true);
      if (p !== null && !PARAMETROS_PADRAO.reducoesPermitidas.valor.some((x) => D(x).igual(p))) {
        e.reducaoOutroPct = `Essa redução não existe na lei. Valores possíveis: ${PARAMETROS_PADRAO.reducoesPermitidas.valor.map((x) => `${D(x).vezes(100).texto(0)}%`).join(", ")}.`;
      }
      if (!f.reducaoOutroMotivo.trim()) e.reducaoOutroMotivo = "Escreva a base legal da redução (artigo ou anexo).";
    }
    if (!f.regime) e.regime = "Escolha o regime atual da empresa.";
    if (f.regime === "simples" && !f.anexo) e.anexo = "Escolha o anexo do Simples.";
    if (f.regime === "mei" && !f.atividadeMei) e.atividadeMei = "Diga se o MEI vende mercadoria, presta serviço ou os dois.";
  }
  if (passo === 2) {
    const rec = dinheiroOpcional(f.receitaMensal, "receitaMensal", "Receita média mensal", e);
    if (!f.receitaMensal.trim()) e.receitaMensal = "Informe a receita média mensal.";
    else if (rec !== null && D(rec).ehZero()) e.receitaMensal = "A receita média mensal precisa ser maior que zero.";
    if (f.regime === "mei" && rec !== null && D(rec).vezes(12).maior(LIMITE_MEI())) {
      e.receitaMensal = `Receita de R$ ${numeroParaBR(D(rec).vezes(12).texto(2))} por ano passa do limite do MEI (R$ ${numeroParaBR(LIMITE_MEI().texto(2))}).`;
    }
    if (f.regime === "simples") {
      const rbt = dinheiroOpcional(f.rbt12, "rbt12", "RBT12", e);
      if (!f.rbt12.trim()) e.rbt12 = "Informe o RBT12 (receita bruta dos últimos 12 meses).";
      else if (rbt !== null && D(rbt).ehZero()) e.rbt12 = "O RBT12 precisa ser maior que zero.";
      else if (rbt !== null && D(rbt).maior(LIMITE_SIMPLES())) e.rbt12 = `RBT12 acima do limite do Simples (R$ ${numeroParaBR(LIMITE_SIMPLES().texto(2))}). Acima disso a empresa não pode ficar no Simples.`;
    } else if (f.regime === "mei") {
      dinheiroOpcional(f.rbt12, "rbt12", "Receita dos últimos 12 meses", e);
    }
    if (f.regime !== "mei") percentual(f.pctPJ, "pctPJ", "Percentual vendido para empresas", e, true);
    if (mostraIssIcms(f)) {
      percentual(f.iss, "iss", "ISS", e, false);
      percentual(f.icms, "icms", "ICMS", e, false);
    }
  }
  if (passo === 3 && f.regime !== "mei") {
    dinheiroOpcional(f.comprasRegulares, "comprasRegulares", "Compras de fornecedores regulares", e);
    f.fornecedores.forEach((fo, i) => {
      const k = `forn_${fo.id}`;
      const vazio = !fo.nome.trim() && !fo.valor.trim() && !fo.rbt12.trim() && !fo.aliquota.trim() && !fo.anexo;
      if (vazio) return;
      const nome = fo.nome.trim() || `Fornecedor do Simples ${i + 1}`;
      const v = dinheiroOpcional(fo.valor, `${k}_valor`, `${nome}: valor comprado`, e);
      if (!fo.valor.trim()) e[`${k}_valor`] = `${nome}: informe o valor comprado por mês.`;
      else if (v !== null && D(v).ehZero()) e[`${k}_valor`] = `${nome}: o valor precisa ser maior que zero.`;
      if (!fo.anexo) e[`${k}_anexo`] = `${nome}: escolha o anexo do Simples do fornecedor.`;
      const r = dinheiroOpcional(fo.rbt12, `${k}_rbt12`, `${nome}: RBT12`, e);
      if (!fo.rbt12.trim()) e[`${k}_rbt12`] = `${nome}: informe o RBT12 do fornecedor (define a faixa e a parte de CBS/IBS do DAS dele).`;
      else if (r !== null && (D(r).ehZero() || D(r).maior(LIMITE_SIMPLES()))) e[`${k}_rbt12`] = `${nome}: o RBT12 deve ficar entre R$ 0,01 e R$ ${numeroParaBR(LIMITE_SIMPLES().texto(2))}.`;
      percentual(fo.aliquota, `${k}_aliquota`, `${nome}: alíquota efetiva`, e, false);
    });
  }
  if (passo === 4 && f.regime !== "mei") {
    const m = percentual(f.margem, "margem", "Margem atual", e, true);
    if (m !== null && D(m).maiorOuIgual(1)) e.margem = "A margem atual precisa ser menor que 100%.";
  }
  return e;
}

/** Todos os passos de uma vez; devolve o primeiro passo com erro (ou 0). */
export function primeiroPassoComErro(f: ClienteForm): number {
  for (const p of [1, 2, 3, 4]) if (Object.keys(validarPasso(p, f)).length) return p;
  return 0;
}

// ---------------------------------------------------------------- conversão para o motor

export function formParaEntrada(f: ClienteForm): EntradaCliente | null {
  if (!f.regime) return null;
  const regime = f.regime;
  const e: EntradaCliente = {
    nome: f.nome.trim() || undefined,
    regime,
    receitaMensal: lerNumeroBR(f.receitaMensal) ?? "",
    percentualVendasPJ: regime === "mei" ? "0" : (lerPercentualBR(f.pctPJ) ?? ""),
  };
  if (regime === "simples") e.anexoSimples = f.anexo || undefined;
  if (regime === "simples" || f.rbt12.trim()) {
    const r = lerNumeroBR(f.rbt12);
    if (r !== null) e.rbt12 = r;
  }
  if (regime === "mei") {
    e.atividadeMei = f.atividadeMei || undefined;
    return e;
  }
  if (mostraIssIcms(f)) {
    e.issPercentual = lerPercentualBR(f.iss) ?? "0";
    e.icmsPercentual = lerPercentualBR(f.icms) ?? "0";
  }
  const red = reducaoEfetiva(f);
  if (red.aplicada) {
    e.reducao = { percentual: red.percentual, motivo: red.motivo };
  }
  const fornecedoresSimples: FornecedorSimples[] = [];
  for (const fo of f.fornecedores) {
    if (!fo.valor.trim() && !fo.rbt12.trim() && !fo.aliquota.trim()) continue;
    const item: FornecedorSimples = {
      nome: fo.nome.trim() || undefined,
      valor: lerNumeroBR(fo.valor) ?? "",
      anexo: (fo.anexo || "I") as AnexoSimples,
      rbt12: lerNumeroBR(fo.rbt12) ?? "",
    };
    // alíquota efetiva informada substitui a calculada pelo RBT12 (o RBT12 segue definindo a faixa da partilha)
    if (fo.aliquota.trim()) item.aliquotaEfetiva = lerPercentualBR(fo.aliquota) ?? "";
    fornecedoresSimples.push(item);
  }
  e.comprasComCredito = {
    fornecedoresRegulares: lerNumeroBR(f.comprasRegulares) ?? "0",
    ...(fornecedoresSimples.length ? { fornecedoresSimples } : {}),
  };
  e.margemAtual = lerPercentualBR(f.margem) ?? "";
  e.premissaFornecedores = f.premissa;
  return e;
}

export function calcularCliente(f: ClienteForm): RetornoCalculo {
  const entrada = formParaEntrada(f);
  if (!entrada) return { ok: false, erros: ["Escolha o regime atual da empresa."] };
  return calcularComPadrao(entrada);
}

/** Texto curto para a lista de clientes. */
export function resumoCliente(f: ClienteForm): string {
  const partes: string[] = [];
  if (f.regime) partes.push(ROTULO_REGIME[f.regime]);
  const setor = acharSetor(f.setorId);
  if (setor) partes.push(setor.nome);
  if (f.municipio && f.uf) partes.push(`${f.municipio}/${f.uf}`);
  return partes.join(" · ");
}

export { fracaoParaCampoPercentual };
