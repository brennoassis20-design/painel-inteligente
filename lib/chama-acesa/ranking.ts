// Ranking real da liga: XP da semana dos membros reais da área, na mesma liga. Lógica pura (o servidor só busca os dados).
// Só sai daqui primeiro nome, foto e XP. Quem desligou "mostrar no ranking" vira "Membro", sem foto.
import { aleatorio, type ConfigLigas, type Linha } from "./ligas.ts";
import { primeiroNome } from "./conta.ts";

export const MINIMO_PADRAO = 10;

/** CHAMA_LIGA_REAL_MINIMO: quantos membros reais ativos na liga na semana para trocar o fictício pelo real (padrão 10). */
export function ligaRealMinimo(env: Record<string, string | undefined> = process.env): number {
  const n = Number(String(env.CHAMA_LIGA_REAL_MINIMO ?? "").trim());
  return Number.isInteger(n) && n >= 2 ? n : MINIMO_PADRAO;
}

export interface MembroRanking {
  id: string;
  nome: string | null;
  foto: string | null;
  mostrar: boolean;
  /** XP da semana em disputa. */
  xp: number;
}

/**
 * Grupo real da pessoa, ou null (fica o fictício) se houver menos de `minimo` membros ativos na liga.
 * `membros` = todos os ativos da mesma liga na semana (a própria pessoa incluída). Acima de `tamanho`, a liga é dividida
 * em grupos de até `tamanho` pessoas, sorteados por semana; um grupo final pequeno é juntado ao anterior.
 */
export function montarGrupoReal(membros: MembroRanking[], userId: string, semana: string, minimo: number, tamanho: number): MembroRanking[] | null {
  const unicos = [...new Map(membros.map((m) => [m.id, m])).values()];
  if (unicos.length < minimo || !unicos.some((m) => m.id === userId)) return null;
  const ordem = unicos.map((m) => ({ m, k: aleatorio(`${semana}|${m.id}`)() })).sort((a, b) => a.k - b.k || a.m.id.localeCompare(b.m.id)).map((x) => x.m);
  const grupos: MembroRanking[][] = [];
  for (let i = 0; i < ordem.length; i += tamanho) grupos.push(ordem.slice(i, i + tamanho));
  if (grupos.length > 1 && grupos[grupos.length - 1].length < minimo) {
    const resto = grupos.pop()!;
    grupos[grupos.length - 1].push(...resto);
  }
  return grupos.find((g) => g.some((m) => m.id === userId)) ?? null;
}

/** Linha pública de uma pessoa: primeiro nome e foto, ou "Membro" sem foto se ela desligou a opção. A própria pessoa sempre se vê. */
export function linhaPublica(m: MembroRanking, voce: boolean): Pick<Linha, "nome" | "foto" | "anonimo"> {
  if (!voce && !m.mostrar) return { nome: "Membro", foto: null, anonimo: true };
  return { nome: primeiroNome(m.nome), foto: m.foto || null, anonimo: false };
}

/** Classificação do grupo (empate: a pessoa fica na frente). */
export function classificarReal(grupo: MembroRanking[], userId: string): Linha[] {
  const todos = grupo.map((m) => ({ ...linhaPublica(m, m.id === userId), xp: Math.max(0, Math.round(m.xp)), voce: m.id === userId, id: m.id }));
  todos.sort((a, b) => b.xp - a.xp || Number(b.voce) - Number(a.voce) || a.id.localeCompare(b.id));
  return todos.map(({ id: _id, ...l }, i) => {
    void _id;
    return { ...l, posicao: i + 1 };
  });
}

/** Ranking real de uma pessoa (ou null = usa o fictício). */
export function rankingReal(membros: MembroRanking[], userId: string, semana: string, cfg: ConfigLigas, minimo = MINIMO_PADRAO): Linha[] | null {
  const grupo = montarGrupoReal(membros, userId, semana, minimo, cfg.tamanho);
  if (!grupo) return null;
  return classificarReal(grupo, userId); // zonas de subir/descer: ligas.ts (situacaoNaLiga e atualizarLiga)
}

// ------------------------------------------------------------------ quem estava em qual liga em cada semana

export interface PerfilRanking {
  user_id: string;
  nome: string | null;
  nome_exibicao?: string | null;
  foto_url?: string | null;
  mostrar_no_ranking?: boolean | null;
  xp_semana: Record<string, number> | null;
  liga: { indice?: number; semana?: string | null; historico?: { semana: string; liga: number }[] } | null;
}

/** Liga em que a pessoa estava naquela semana (null = não dá para saber ou não jogou). */
export function ligaNaSemana(p: PerfilRanking, semana: string): number | null {
  const l = p.liga;
  if (!l) return null;
  if (l.semana === semana && Number.isInteger(l.indice)) return l.indice as number;
  const h = (l.historico ?? []).find((x) => x.semana === semana);
  return h ? h.liga : null;
}

/** Membros ativos (XP > 0 na semana) que estavam na liga `indice` naquela semana, já no formato do ranking. */
export function membrosDaLiga(perfis: PerfilRanking[], semana: string, indice: number): MembroRanking[] {
  const out: MembroRanking[] = [];
  for (const p of perfis) {
    const xp = Number(p.xp_semana?.[semana] ?? 0);
    if (!(xp > 0) || ligaNaSemana(p, semana) !== indice) continue;
    out.push({ id: p.user_id, nome: p.nome_exibicao || p.nome, foto: p.foto_url || null, mostrar: p.mostrar_no_ranking !== false, xp });
  }
  return out;
}

/**
 * Liga mista (abaixo do mínimo do ranking real): os OUTROS membros reais ativos da liga, para entrarem no lugar de fictícios.
 * Mesma regra de privacidade do ranking real (primeiro nome e foto, ou "Membro"). Limite: `vagas` (tamanho do grupo - 1), os de mais XP.
 */
export function outrosReais(membros: MembroRanking[], userId: string, vagas: number): Linha[] {
  const unicos = [...new Map(membros.map((m) => [m.id, m])).values()].filter((m) => m.id !== userId && m.xp > 0);
  unicos.sort((a, b) => b.xp - a.xp || a.id.localeCompare(b.id));
  return unicos.slice(0, Math.max(0, vagas)).map((m) => ({ ...linhaPublica(m, false), xp: Math.max(0, Math.round(m.xp)), voce: false, posicao: 0 }));
}
