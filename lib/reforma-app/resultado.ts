// Do retorno do motor para o que a tela e o PDF mostram: frases, tabelas, recomendação e série do gráfico.
// Nenhuma conta nova aqui além de comparar valores que o motor já calculou.
import { D } from "../reforma/decimal.ts";
import { brl, pct } from "../reforma/formato.ts";
import { PARAMETROS_PADRAO } from "../reforma/padrao.ts";
import type { Aviso, Bloco, OpcaoPreco, ResultadoAno, ResultadoReforma } from "../reforma/tipos.ts";

export const r$ = (t: string | undefined): string => (t === undefined ? "—" : brl(D(t)));
export const pc = (t: string | undefined, casas = 2): string => (t === undefined ? "—" : pct(D(t), casas));
/** Reajuste com sinal: "+3,39%" / "−1,20%" / "0%". */
export function reaj(t: string | undefined): string {
  if (t === undefined) return "—";
  const x = D(t);
  if (x.ehZero()) return "0%";
  return (x.sinal() > 0 ? "+" : "−") + pct(x.abs(), 2);
}

export function dataBR(iso: string): string {
  const [a, m, d] = iso.split("-");
  return a && m && d ? `${d}/${m}/${a}` : iso;
}

export const ATUALIZADO_EM = dataBR(PARAMETROS_PADRAO.atualizadoEm);
export const ANOS = [...PARAMETROS_PADRAO.anos].sort((a, b) => a - b);
export const ANO_HOJE = ANOS[0];
export const ANO_PADRAO = 2027;
export const ANO_FINAL = ANOS[ANOS.length - 1];

export function bloco(a: ResultadoAno): Bloco {
  return (a.regular ?? a.simples ?? a.mei) as Bloco;
}

export function opcao(a: ResultadoAno, id: OpcaoPreco["id"]): OpcaoPreco | undefined {
  return a.opcoes.find((o) => o.id === id);
}

export interface LinhaAno {
  ano: number;
  rotulo: string;
  valor: string;
  pct?: string;
  delta?: string;
}

/** Imposto sobre consumo recolhido por mês (regime regular) ou guia do MEI, nos anos Hoje, 2027 e 2033. */
export function linhasHoje(res: ResultadoReforma): LinhaAno[] {
  const anos = [ANO_HOJE, ANO_PADRAO, ANO_FINAL];
  return anos.map((ano) => {
    const a = res.anos[ano];
    const b = bloco(a);
    return {
      ano,
      rotulo: ano === ANO_HOJE ? "Hoje" : String(ano),
      valor: b.total,
      pct: b.pct_receita,
      delta: b.delta,
    };
  });
}

export function ehSimples(res: ResultadoReforma) {
  return res.regime === "simples";
}

// ---------------------------------------------------------------- recomendação (Simples)

const LIMIAR_EMPATE = "0.005";

export interface Recomendacao {
  escolha: "das" | "hibrido" | "empate";
  titulo: string;
  porque: string[];
  proximosPassos: string[];
}

/** Custo médio que o mercado paga: PJ desconta o crédito, consumidor final paga o preço cheio. */
function custoMedio(o: OpcaoPreco, pj: string): string {
  const f = D(pj);
  return f.vezes(o.custoRealClientePJ).mais(D(1).menos(f).vezes(o.precoNecessario)).texto(12);
}

export function prazosSimples(): { codigo: string; texto: string; fonte: string }[] {
  return PARAMETROS_PADRAO.prazosSimples.map((p) => ({ codigo: p.codigo, texto: p.texto, fonte: p.fonte }));
}

function prazo(codigo: string): string {
  return PARAMETROS_PADRAO.prazosSimples.find((p) => p.codigo === codigo)?.texto ?? "";
}

export function recomendar(res: ResultadoReforma, ano: number, pctPJ: string): Recomendacao | null {
  if (res.regime !== "simples") return null;
  const a = res.anos[ano];
  const das = opcao(a, "das");
  const hib = opcao(a, "hibrido");
  if (!das || !hib) return null;
  const cDas = D(custoMedio(das, pctPJ));
  const cHib = D(custoMedio(hib, pctPJ));
  const dif = cDas.menos(cHib).dividido(cDas); // positivo = híbrido deixa o preço efetivo menor
  const porque: string[] = [];
  const pj = D(pctPJ);
  porque.push(
    `Cliente empresa (PJ) paga, de verdade, ${r$(das.custoRealClientePJ)} no DAS e ${r$(hib.custoRealClientePJ)} no híbrido (preço menos o crédito que ele aproveita).`,
  );
  porque.push(
    `Com ${pct(pj, 0)} das vendas para empresas, o custo médio do seu cliente fica em ${r$(cDas.texto(2))} no DAS e ${r$(cHib.texto(2))} no híbrido.`,
  );
  let escolha: Recomendacao["escolha"];
  let titulo: string;
  if (dif.abs().menor(LIMIAR_EMPATE)) {
    escolha = "empate";
    titulo = "As duas opções ficam praticamente iguais para o seu cliente";
    porque.push("A diferença é menor que 0,5%: vale ficar no DAS, que é mais simples (sem apuração de CBS/IBS por fora) e não exige reajuste de preço.");
  } else if (dif.sinal() > 0) {
    escolha = "hibrido";
    titulo = "Híbrido tende a compensar";
    porque.push(`No híbrido o preço efetivo que o seu cliente paga cai ${pct(dif, 2)} em relação ao DAS, o que ajuda a manter vendas para empresas.`);
    porque.push(`Em contrapartida, para manter a margem o preço precisa de reajuste de ${reaj(hib.reajustePreco)}. Se o preço não for repassado, a margem cai para ${pc(hib.margemSeManterPreco)}.`);
  } else {
    escolha = "das";
    titulo = "Ficar no DAS tende a compensar";
    porque.push(`No DAS o preço efetivo que o seu cliente paga é ${pct(dif.abs(), 2)} menor do que no híbrido, e a margem se mantém em ${pc(das.margemSeManterPreco)} sem reajuste.`);
  }
  const proximosPassos: string[] = [];
  if (escolha === "hibrido") {
    proximosPassos.push("Para entrar no híbrido: " + prazo("opcao_set_2026") + " " + prazo("proxima_janela"));
  } else {
    proximosPassos.push("Se a empresa já optou pelo híbrido e a conta indica o DAS: " + prazo("cancelamento_2026"));
    if (escolha === "empate") proximosPassos.push(prazo("proxima_janela"));
  }
  return { escolha, titulo, porque, proximosPassos };
}

// ---------------------------------------------------------------- frase de resumo

export function frase(res: ResultadoReforma, ano: number, nome: string, pctPJ: string): string {
  const empresa = nome.trim() || "a empresa";
  const a = res.anos[ano];
  if (res.regime === "mei") {
    const b = a.mei as Bloco;
    const d = D(b.delta);
    const mov = d.ehZero() ? "igual ao de hoje" : d.sinal() > 0 ? `${r$(d.texto(2))} a mais que hoje` : `${r$(d.abs().texto(2))} a menos que hoje`;
    return `Em ${ano}, a guia mensal do MEI de ${empresa} fica em ${r$(b.total)}, ${mov}.`;
  }
  if (res.regime === "simples") {
    const das = opcao(a, "das") as OpcaoPreco;
    const hib = opcao(a, "hibrido") as OpcaoPreco;
    const rec = recomendar(res, ano, pctPJ);
    const fim = rec ? ` ${rec.escolha === "hibrido" ? "O híbrido tende a compensar." : rec.escolha === "das" ? "O DAS tende a compensar." : "As duas opções ficam praticamente iguais."}` : "";
    return `Em ${ano}, para manter a margem, ${empresa} precisaria cobrar ${r$(das.precoNecessario)} dentro do DAS ou ${r$(hib.precoNecessario)} no híbrido (reajuste de ${reaj(das.reajustePreco)} e ${reaj(hib.reajustePreco)}).${fim}`;
  }
  const b = bloco(a);
  const hoje = bloco(res.anos[ANO_HOJE]);
  const d = D(b.delta);
  const mov = d.ehZero() ? "o mesmo valor de hoje" : d.sinal() > 0 ? `${r$(d.texto(2))} a mais do que hoje` : `${r$(d.abs().texto(2))} a menos do que hoje`;
  const op = opcao(a, "regime_atual") as OpcaoPreco;
  return `Em ${ano}, ${empresa} passa a recolher ${r$(b.total)} por mês de imposto sobre consumo (${pc(b.pct_receita)} da receita), ${mov} (hoje: ${r$(hoje.total)}). Para manter a margem, o preço muda ${reaj(op.reajustePreco)}.`;
}

// ---------------------------------------------------------------- série do gráfico

export interface Serie {
  nome: string;
  cor: "a" | "b";
  pontos: { ano: number; valor: number; texto: string }[];
}

export interface GraficoDados {
  titulo: string;
  unidade: string;
  series: Serie[];
}

export function grafico(res: ResultadoReforma): GraficoDados {
  const ponto = (ano: number, t: string) => ({ ano, valor: Number(t), texto: r$(t) });
  if (res.regime === "simples") {
    return {
      titulo: "Preço para manter a margem, mês a mês",
      unidade: "R$ por mês",
      series: [
        { nome: "Dentro do DAS", cor: "a", pontos: ANOS.map((y) => ponto(y, (opcao(res.anos[y], "das") as OpcaoPreco).precoNecessario)) },
        { nome: "Híbrido", cor: "b", pontos: ANOS.map((y) => ponto(y, (opcao(res.anos[y], "hibrido") as OpcaoPreco).precoNecessario)) },
      ],
    };
  }
  return {
    titulo: res.regime === "mei" ? "Guia mensal do MEI" : "Imposto sobre consumo por mês",
    unidade: "R$ por mês",
    series: [{ nome: res.regime === "mei" ? "Guia" : "Imposto recolhido", cor: "a", pontos: ANOS.map((y) => ponto(y, bloco(res.anos[y]).total)) }],
  };
}

// ---------------------------------------------------------------- avisos

export interface Selo {
  estimativas: Aviso[];
  atencao: Aviso[];
  emValidacao: string[];
  atualizadoEm: string;
}

export function selo(res: ResultadoReforma, ano: number): Selo {
  const estimativas = res.avisos.filter((a) => a.tipo === "estimativa");
  const atencao = res.avisos.filter((a) => a.tipo !== "estimativa" && a.codigo !== "sem_gabarito");
  return { estimativas, atencao, emValidacao: res.anos[ano].motivosSemGabarito, atualizadoEm: ATUALIZADO_EM };
}
