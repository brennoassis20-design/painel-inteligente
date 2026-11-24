// O dia depois do 21: a jornada inicial (dias.json) acaba, mas a chama continua. Cada dia novo tem
// Palavra (o capítulo do plano de leitura ativo ou, sem plano, um versículo) + oração + missão do dia.
// Lógica pura: o número do dia é contínuo (22, 23, ... milhares) e guarda os dias ativos ao longo dos anos.
import type { Dia } from "./dias.ts";
import type { Versiculo } from "./pratica.ts";

export const PRIMEIRO_DIA_CONTINUO = 22;

/** Leitura que o plano bíblico ativo da pessoa marca para hoje. */
export interface LeituraPlano { nome: string; /** Nome do plano (ex.: "Bíblia completa em 1 ano"). */ plano?: string }

export interface DiaContinuo extends Dia {
  /** true = a Palavra de hoje é um capítulo do plano ativo (a tela oferece abrir a Bíblia). */
  doPlano: boolean;
}

export const ORACOES_CONTINUAS = [
  "Senhor, obrigado por mais um dia. Abre os meus olhos para a Tua Palavra e o meu coração para fazer o que ela diz. Amém.",
  "Deus, eu entrego o meu dia nas Tuas mãos. Guarda os meus passos, as minhas palavras e os meus pensamentos. Amém.",
  "Pai, ensina-me a confiar quando eu não entendo. Que a Tua paz guarde a minha casa e as pessoas que eu amo. Amém.",
  "Senhor, dá-me coragem para o que eu preciso enfrentar hoje e gentileza com quem eu encontrar. Amém.",
  "Deus, agradeço pelo que eu já tenho e peço sabedoria para o que ainda não sei. Fica comigo neste dia. Amém.",
  "Jesus, eu venho como estou, cansado ou animado. Acende de novo em mim o desejo de estar perto de Ti. Amém.",
  "Senhor, perdoa o que eu errei e ajuda-me a perdoar quem me feriu. Que o meu dia seja inteiro Teu. Amém.",
];

function mdc(a: number, b: number): number {
  return b === 0 ? a : mdc(b, a % b);
}

/** Escolha estável: o mesmo dia sempre cai no mesmo item, e dias seguidos não parecem uma lista em ordem. */
export function escolherPorDia<T>(lista: readonly T[], dia: number, passoBase = 7): T | undefined {
  const n = lista.length;
  if (!n) return undefined;
  let passo = passoBase;
  while (mdc(passo, n) !== 1) passo += 1;
  return lista[(((dia * passo) % n) + n) % n];
}

/** Monta o conteúdo do dia contínuo. `leitura` vem do plano de leitura ativo (null = sem plano ou plano concluído). */
export function montarDiaContinuo(args: { dia: number; missoes: readonly string[]; versiculos: readonly Versiculo[]; leitura?: LeituraPlano | null }): DiaContinuo {
  const { dia, missoes, versiculos, leitura } = args;
  const oracao = escolherPorDia(ORACOES_CONTINUAS, dia, 3) ?? ORACOES_CONTINUAS[0];
  const missao = escolherPorDia(missoes, dia, 7) ?? "Agradeça a Deus por 3 coisas antes de dormir.";
  if (leitura?.nome) {
    return {
      dia,
      titulo: "A Palavra de hoje",
      referencia: leitura.nome,
      versiculo: "",
      reflexao: `Hoje a sua Palavra é ${leitura.nome}${leitura.plano ? `, do plano "${leitura.plano}"` : ", do seu plano de leitura"}.\n\nAbra a Bíblia, leia com calma e escolha uma frase para levar com você. Depois volte aqui e marque que leu.`,
      oracao,
      missao,
      jejum: null,
      medalha: null,
      doPlano: true,
    };
  }
  const v = escolherPorDia(versiculos, dia, 11);
  return {
    dia,
    titulo: "A Palavra de hoje",
    referencia: v?.referencia ?? "Salmos 119:105",
    versiculo: v?.texto ?? "A Tua palavra é lâmpada para os meus pés e luz para o meu caminho.",
    reflexao: "Leia o versículo duas vezes, devagar.\n\nO que ele diz sobre Deus? E o que ele pede de você hoje? Escolha uma palavra dele para carregar durante o dia.\n\nQuer ler mais? Escolha um plano de leitura na aba Bíblia e a Palavra de cada dia passa a ser o capítulo do seu plano.",
    oracao,
    missao,
    jejum: null,
    medalha: null,
    doPlano: false,
  };
}
