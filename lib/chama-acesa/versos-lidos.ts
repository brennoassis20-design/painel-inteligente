// "Palavra no coração": quantos versículos da Bíblia a pessoa já leu no app (27/11).
// Soma, sem contar o mesmo versículo duas vezes quando dá para saber:
//  - os versículos dos dias concluídos (1 por dia; trecho "6:9-13" conta 5);
//  - os versículos diferentes que caíram no Desafio da Palavra;
//  - os capítulos lidos na aba Bíblia (cada um com o seu número real de versículos).
// Funções puras: a tela e o aviso de domingo usam as mesmas contas.
import VERSOS_POR_CAPITULO from "./versos-por-capitulo.json" with { type: "json" };

export type TabelaVersos = Record<string, number[]>;
export const TABELA_VERSOS = VERSOS_POR_CAPITULO as TabelaVersos;

/** Marcos que ganham tela de comemoração. */
export const MARCOS_VERSOS = [100, 250, 500, 1000, 2500, 5000, 10000] as const;

/** "Mateus 6:9-13" -> 5; "João 3:16" -> 1; sem número de versículo -> 1. */
export function versosDaReferencia(ref: string): number {
  const m = ref.match(/:(\d+)\s*[-–]\s*(\d+)\s*$/);
  if (!m) return 1;
  const n = Number(m[2]) - Number(m[1]) + 1;
  return n >= 1 && n <= 200 ? n : 1;
}

export interface FontesLeitura {
  /** Referências dos dias concluídos (jornada de 21 dias). Dias contínuos sem referência contam 1. */
  refsDosDias: string[];
  /** Dias concluídos depois do 21 (cada um conta 1 versículo). */
  diasContinuos: number;
  /** ids distintos de versículos que já caíram no Desafio (chaves de estado.praticas). */
  idsDesafio: string[];
  /** Bíblia: sigla -> capítulos lidos. */
  lidos: Record<string, number[]>;
}

export function contarVersosLidos(f: FontesLeitura, tabela: TabelaVersos = TABELA_VERSOS): number {
  let n = 0;
  for (const r of f.refsDosDias) n += versosDaReferencia(r);
  n += Math.max(0, f.diasContinuos);
  n += new Set(f.idsDesafio).size;
  for (const [sigla, caps] of Object.entries(f.lidos ?? {})) {
    const t = tabela[sigla];
    if (!t) continue;
    for (const c of new Set(caps)) if (Number.isInteger(c) && c >= 1 && c <= t.length) n += t[c - 1];
  }
  return n;
}

/** Próximo marco ainda não comemorado (null = nenhum novo). */
export function marcoAlcancado(total: number, jaComemorado: number): number | null {
  const m = [...MARCOS_VERSOS].reverse().find((x) => total >= x);
  return m && m > jaComemorado ? m : null;
}

// Livros inteiros (total de versículos na Bíblia Livre) para comparar e animar.
const LIVROS_REFERENCIA: [string, number][] = [
  ["Jonas", 48], ["Rute", 85], ["Filipenses", 104], ["Tiago", 108], ["Gálatas", 149], ["Efésios", 155],
  ["Romanos", 433], ["Marcos", 678], ["João", 879], ["Mateus", 1071], ["Gênesis", 1533], ["Salmos", 2461],
];

/** Frase que anima: "É como ler Filipenses inteiro 3 vezes." null quando ainda é pouco. */
export function comparacaoVersos(total: number): string | null {
  if (total < 48) return null;
  // O maior livro que cabe; se couber mais de uma vez, diz quantas.
  const [nome, v] = [...LIVROS_REFERENCIA].reverse().find(([, x]) => total >= x)!;
  const vezes = Math.floor(total / v);
  return vezes >= 2 ? `É como ler ${nome} inteiro ${vezes} vezes.` : `É como ler ${nome} inteiro.`;
}
