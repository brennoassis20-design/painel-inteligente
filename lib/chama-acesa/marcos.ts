// Metas da chama (dias seguidos) com estudo bíblico. Lógica pura: o conteúdo vem de lib/chama-acesa/marcos.json.
// Depois da última meta da lista (365), a cada 100 dias entra uma meta genérica gerada aqui, sem estudo próprio.
export interface Meta {
  dia: number;
  nome: string;
  referencia: string;
  versiculo: string;
  /** 3 a 5 parágrafos, separados por linha em branco. */
  estudo: string;
  pergunta: string;
  oracao: string;
  /** true = gerada em código (a cada 100 dias depois da última meta com estudo próprio). */
  generica?: boolean;
}

/** Dias das metas quando o marcos.json não existe ou está vazio. */
export const DIAS_METAS_PADRAO = [3, 7, 12, 14, 21, 25, 30, 40, 50, 70, 75, 100, 120, 150, 153, 200, 300, 365, 490, 500, 1000];
/** Depois deste dia, a cada INTERVALO_GENERICAS dias há uma meta genérica. */
export const GENERICAS_APOS = 365;
export const INTERVALO_GENERICAS = 100;

const texto = (v: unknown) => (typeof v === "string" ? v.trim() : "");

/** Aceita o JSON cru e devolve só metas válidas (dia inteiro >= 1), ordenadas e sem repetir o dia. */
export function normalizarMarcos(cru: unknown): Meta[] {
  if (!Array.isArray(cru)) return [];
  const mapa = new Map<number, Meta>();
  for (const i of cru as Record<string, unknown>[]) {
    const dia = Number(i?.dia);
    if (!Number.isInteger(dia) || dia < 1) continue;
    mapa.set(dia, { dia, nome: texto(i.nome), referencia: texto(i.referencia), versiculo: texto(i.versiculo), estudo: texto(i.estudo), pergunta: texto(i.pergunta), oracao: texto(i.oracao) });
  }
  return [...mapa.values()].sort((a, b) => a.dia - b.dia);
}

/** Dias de meta: os do marcos.json (ou a lista padrão se vazio) mais as genéricas, que são calculadas na hora. */
export function diasDasMetas(marcos?: Pick<Meta, "dia">[] | null): number[] {
  const lista = marcos && marcos.length ? marcos.map((m) => m.dia) : DIAS_METAS_PADRAO;
  return [...new Set(lista)].sort((a, b) => a - b);
}

const ehGenerica = (dia: number) => dia > GENERICAS_APOS && dia % INTERVALO_GENERICAS === 0;

/** Este dia de chama é uma meta? */
export function ehMeta(dia: number, dias: readonly number[] = DIAS_METAS_PADRAO): boolean {
  return Number.isInteger(dia) && dia >= 1 && (dias.includes(dia) || ehGenerica(dia));
}

/** Próxima meta depois deste número de dias de chama (as fixas da lista ou a próxima genérica, a que vier primeiro). */
export function proximaMeta(chama: number, dias: readonly number[] = DIAS_METAS_PADRAO): number {
  const fixa = [...dias].sort((a, b) => a - b).find((d) => d > chama);
  const generica = (Math.floor(Math.max(chama, GENERICAS_APOS) / INTERVALO_GENERICAS) + 1) * INTERVALO_GENERICAS;
  return fixa === undefined ? generica : Math.min(fixa, generica);
}

export const NOME_GENERICA = (dia: number) => `${dia} dias de chama`;

/** Meta genérica: um estudo curto de constância, igual para todas (só o número muda). */
export function metaGenerica(dia: number): Meta {
  return {
    dia,
    nome: NOME_GENERICA(dia),
    referencia: "Gálatas 6:9",
    versiculo: "Não nos cansemos de fazer o bem, pois no tempo próprio colheremos, se não desanimarmos.",
    estudo: [
      `${dia} dias seguidos. Isso não aconteceu num dia só: aconteceu num dia de cada vez, e cada um deles começou com uma decisão simples de voltar.`,
      "A Bíblia fala muito de constância. Paulo escreve que não devemos nos cansar de fazer o bem, porque existe um tempo próprio para a colheita. O que se planta hoje nem sempre aparece amanhã, mas aparece.",
      "Reparar no caminho já percorrido também é uma forma de gratidão. Olhe para trás por um instante: houve dias fáceis e dias pesados, e a chama continuou acesa.",
      "Hoje não é dia de provar nada a ninguém. É dia de agradecer pelo fôlego até aqui e pedir a Deus força para o próximo dia, que é o único que precisa de você agora.",
    ].join("\n\n"),
    pergunta: "O que mudou em você, por dentro, desde que você começou a voltar todos os dias?",
    oracao: "Senhor, obrigado por me sustentar até aqui. Eu não me orgulho da minha força, agradeço pela Tua. Ensina-me a continuar, um dia de cada vez, sem me cansar de fazer o bem. Amém.",
    generica: true,
  };
}

/** Conteúdo da meta: o do marcos.json ou, se for genérica (ou faltar), o texto de constância. null = este dia não é meta. */
export function metaDoDia(dia: number, marcos: Meta[], dias: readonly number[] = diasDasMetas(marcos)): Meta | null {
  if (!ehMeta(dia, dias)) return null;
  const m = marcos.find((x) => x.dia === dia);
  if (m && m.nome) return m;
  return metaGenerica(dia);
}

export const idMeta = (dia: number) => `meta${dia}`;
export const idEstudo = (dia: number) => `estudo${dia}`;
const idAntigo = (dia: number) => `chama${dia}`;

/** Quem já tem a medalha da meta (inclusive o id antigo "chamaN" das medalhas fixas da primeira versão). */
export function temMeta(medalhas: readonly string[], dia: number): boolean {
  return medalhas.includes(idMeta(dia)) || medalhas.includes(idAntigo(dia));
}

/** Meta alcançada alguma vez: medalha guardada ou a maior sequência já passou dela. */
export function metaAlcancada(e: { medalhas: readonly string[]; maior: number }, dia: number): boolean {
  return temMeta(e.medalhas, dia) || e.maior >= dia;
}

/** Metas alcançadas (da mais recente para a mais antiga), com conteúdo. Inclui as genéricas já passadas. */
export function metasAlcancadas(e: { medalhas: readonly string[]; maior: number }, marcos: Meta[]): Meta[] {
  const dias = diasDasMetas(marcos);
  const todos = new Set<number>(dias.filter((d) => metaAlcancada(e, d)));
  for (let d = (Math.floor(GENERICAS_APOS / INTERVALO_GENERICAS) + 1) * INTERVALO_GENERICAS; d <= e.maior; d += INTERVALO_GENERICAS) todos.add(d);
  return [...todos].sort((a, b) => b - a).map((d) => metaDoDia(d, marcos, dias)).filter((m): m is Meta => m !== null);
}

/** O que sai do servidor: o estudo só das metas que a pessoa já alcançou (as outras ficam só com dia e nome). */
export function marcosLiberados(marcos: Meta[], maior: number): Meta[] {
  return marcos.map((m) => (m.dia <= maior ? m : { ...m, versiculo: "", estudo: "", pergunta: "", oracao: "", referencia: "" }));
}
