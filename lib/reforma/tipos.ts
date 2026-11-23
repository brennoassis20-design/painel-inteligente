// Tipos do motor de cálculo da Reforma Tributária do consumo (sem telas, sem rede, sem banco).
import type { Entrada } from "./decimal.ts";

export type StatusParametro = "FATO" | "ESTIMATIVA";

export interface Param<T> {
  valor: T;
  /** Artigo/norma de onde vem o número. */
  fonte: string;
  status: StatusParametro;
  /** AAAA-MM-DD da última conferência. */
  atualizadoEm: string;
  /** FATO visto só por resumo: conferir no texto literal. */
  conferir?: boolean;
  nota?: string;
  /** Texto de aviso mostrado ao usuário quando o parâmetro é ESTIMATIVA. */
  aviso?: string;
}

export interface ParametrosAno {
  cbsReferencia: Param<string>;
  cbsMenosPP: Param<string>;
  ibsFixo: Param<string> | null;
  ibsFracaoPleno: Param<string> | null;
  cobraCbsIbs: Param<boolean>;
  pisCofinsAtivo: Param<boolean>;
  fatorIcmsIss: Param<string>;
}

export interface ParametrosPisCofins {
  pis: Param<string>;
  cofins: Param<string>;
  creditaCompras: boolean;
}

export interface ValoresMei {
  icms: string;
  iss: string;
  cbs: string;
  ibs: string;
  fonte: string;
  status: StatusParametro;
  atualizadoEm: string;
}

export interface ReducaoCatalogo {
  codigo: string;
  descricao: string;
  percentual: string | null;
  fonte: string;
  status: StatusParametro;
  atualizadoEm: string;
}

export interface Parametros {
  versao: string;
  atualizadoEm: string;
  anos: number[];
  anosComGabarito: number[];
  porAno: Record<string, ParametrosAno>;
  totalEstimado2033: Param<string>;
  pisCofins: { presumido: ParametrosPisCofins; real: ParametrosPisCofins };
  simples: {
    limiteRBT12: Param<string>;
    coberturaGabarito: Record<string, number[]>;
    issIcmsForaDoDasAPartirDaFaixa: Param<number>;
  };
  mei: Record<string, ValoresMei>;
  meiLimiteAnual: Param<string>;
  reducoesPermitidas: Param<string[]>;
  reducoes: ReducaoCatalogo[];
  premissaFornecedoresPadrao: PremissaFornecedores;
  avisosFixos: { codigo: string; tipo: TipoAviso; texto: string; fonte: string; status: StatusParametro }[];
  prazosSimples: { codigo: string; texto: string; fonte: string; status: StatusParametro; atualizadoEm: string }[];
  fontes: Record<string, string>;
}

export type AnexoSimples = "I" | "II" | "III" | "IV" | "V";

export interface LinhaTabelaSimples {
  anexo: AnexoSimples;
  anexoLei: string;
  ano: number;
  faixa: number;
  de: string;
  ate: string;
  nominal: string;
  deduzir: string;
  partilha: Record<string, string> | null;
  fonte: string;
  status: StatusParametro;
  conferir: boolean;
}

/** Regra especial da 5ª faixa (Anexos III e IV): ISS limitado ao teto e o excedente repartido. */
export interface Faixa5Especial {
  anexo: AnexoSimples;
  ano: number;
  faixa: number;
  efetivaAcimaDe: string;
  issTeto: string;
  partilhaDoExcedente: Record<string, string>;
  fonte: string;
  status: StatusParametro;
  conferir: boolean;
}

export interface TabelasSimples {
  atualizadoEm: string;
  linhas: LinhaTabelaSimples[];
  faixa5Especial: Faixa5Especial[];
}

// ---------------------------------------------------------------- entradas

export type Regime = "simples" | "presumido" | "real" | "mei";
export type PremissaFornecedores = "sem_imposto" | "preco_final";
export type AtividadeMei = "comercio" | "servico" | "comercio_e_servico";

export interface FornecedorSimples {
  nome?: string;
  /** Valor mensal comprado (mesma base das compras regulares). */
  valor: Entrada;
  anexo: AnexoSimples;
  /** RBT12 do fornecedor (define faixa, alíquota efetiva e partilha). */
  rbt12: Entrada;
  /** Se informada, substitui a alíquota efetiva calculada pelo RBT12 (fração: 0,051 = 5,1%). */
  aliquotaEfetiva?: Entrada;
}

export interface ComparativoRegular {
  regime?: "presumido" | "real";
  issPercentual: Entrada;
  icmsPercentual: Entrada;
}

export interface EntradaCliente {
  nome?: string;
  regime: Regime;
  /** Obrigatório no Simples. */
  anexoSimples?: AnexoSimples;
  /** Média mensal de vendas (R$). */
  receitaMensal: Entrada;
  /** Obrigatório no Simples (até o limite de R$ 4,8 mi); no MEI, se informado, confere o limite anual. */
  rbt12?: Entrada;
  /** Fração das vendas feitas a empresas (0 a 1; 0,9 = 90%). */
  percentualVendasPJ: Entrada;
  /** ISS e ICMS efetivos sobre a receita, em fração (0,05 = 5%). */
  issPercentual?: Entrada;
  icmsPercentual?: Entrada;
  reducao?: { percentual: Entrada; motivo: string };
  comprasComCredito?: {
    fornecedoresRegulares?: Entrada;
    fornecedoresSimples?: FornecedorSimples[];
  };
  /** Margem atual sobre o preço (fração: 0,15 = 15%). Obrigatória fora do MEI. */
  margemAtual?: Entrada;
  premissaFornecedores?: PremissaFornecedores;
  /** Só no Simples: compara com o regime regular (como o Caso 5 do gabarito). */
  comparativoRegular?: ComparativoRegular;
  atividadeMei?: AtividadeMei;
}

// ---------------------------------------------------------------- saídas

/** Dinheiro e taxas saem como texto decimal exato (ex.: "3930.00", "0.098250000000"). */
export type Texto = string;
export type Bloco = Record<string, Texto>;

export type TipoAviso = "estimativa" | "pendencia" | "atencao";
export interface Aviso {
  codigo: string;
  tipo: TipoAviso;
  texto: string;
  fonte?: string;
}

export interface LinhaMemoria {
  rotulo: string;
  formula: string;
  /** Valor exato (texto decimal). */
  valor: Texto;
  unidade: "R$" | "%" | "";
  fonte: string;
}

export interface OpcaoPreco {
  id: "regime_atual" | "das" | "hibrido";
  rotulo: string;
  /** Preço final (com IBS/CBS por fora) que mantém a margem atual. */
  precoNecessario: Texto;
  /** Quanto o IBS/CBS destacado soma ao preço (crédito de quem compra). */
  cbsIbsNoPreco: Texto;
  /** Preço menos o crédito que o cliente PJ recebe. Para o cliente consumidor final é o próprio preço. */
  custoRealClientePJ: Texto;
  /** Margem com o preço necessário (igual à margem atual, salvo arredondamento). */
  margemComPrecoNecessario: Texto;
  /** Margem se o preço final continuar igual ao de hoje (receita atual). */
  margemSeManterPreco: Texto;
  /** Imposto recolhido pela empresa no mês (para a memória de cálculo; não é o custo do cliente). */
  impostoRecolhido: Texto;
  /** Reajuste do preço necessário sobre o preço de hoje. */
  reajustePreco: Texto;
}

export interface ResultadoAno {
  ano: number;
  semGabarito: boolean;
  motivosSemGabarito: string[];
  aliquotas: { cbsPadrao: Texto; ibsPadrao: Texto; fatorIcmsIss: Texto; cobraCbsIbs: boolean };
  /** Campos do gabarito (casos-ouro.json), regime Presumido/Real. */
  regular?: Bloco;
  /** Campos do gabarito, Simples (DAS e híbrido). */
  simples?: Bloco;
  /** Campos do gabarito com prefixo rg_ (no gabarito), aqui sem prefixo. */
  comparativoRegular?: Bloco;
  mei?: Bloco;
  opcoes: OpcaoPreco[];
  memoria: LinhaMemoria[];
}

export interface ResultadoReforma {
  regime: Regime;
  versaoParametros: string;
  anos: Record<number, ResultadoAno>;
  avisos: Aviso[];
}

export type RetornoCalculo = { ok: true; resultado: ResultadoReforma } | { ok: false; erros: string[] };
