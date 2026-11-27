// Ligas semanais (ranking fictício, como a carreira do Duolingo). Lógica pura e determinística:
// a semana vai de segunda 00h a domingo 23h59 (fuso de São Paulo); o grupo de 30 tem 29 participantes fictícios
// gerados a partir de user_id + semana, com XP que cresce ao longo da semana e calibrado pelo nível da liga.
import { TALENTOS_GANHO } from "./talentos.ts";
import { inicioSemana, type Estado, type ResultadoLiga } from "./regras.ts";

export interface Liga { id: string; nome: string; cor: string; icone: string; descricao: string }
export interface ConfigLigas { ligas: Liga[]; sobem: number; descem: number; tamanho: number; nomes: string[] }

const txt = (v: unknown, padrao = "") => (typeof v === "string" && v.trim() ? v.trim() : padrao);

/** Aceita o ligas.json cru (ou o exemplo) e completa o que faltar. */
export function normalizarLigas(cru: unknown): ConfigLigas {
  const o = (cru ?? {}) as Record<string, unknown>;
  const ligas = (Array.isArray(o.ligas) ? (o.ligas as Record<string, unknown>[]) : []).map((l, i) => ({
    id: txt(l.id, `liga-${i + 1}`), nome: txt(l.nome, `Liga ${i + 1}`), cor: txt(l.cor, "#f97316"), icone: txt(l.icone, "🔥"), descricao: txt(l.descricao),
  }));
  const num = (v: unknown, p: number) => (Number.isInteger(v) && (v as number) > 0 ? (v as number) : p);
  return {
    ligas: ligas.length ? ligas : [{ id: "faisca", nome: "Faísca", cor: "#9CA3AF", icone: "✨", descricao: "" }],
    sobem: num(o.sobem, 7),
    descem: num(o.descem, 5),
    tamanho: num(o.tamanho_grupo, 30),
    nomes: (Array.isArray(o.nomes) ? (o.nomes as unknown[]) : []).map((n) => txt(n)).filter(Boolean),
  };
}

// ------------------------------------------------------------------ aleatório determinístico

function semente(texto: string): number {
  let h = 2166136261;
  for (let i = 0; i < texto.length; i += 1) {
    h ^= texto.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function aleatorio(chave: string): () => number {
  let a = semente(chave);
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ------------------------------------------------------------------ grupo fictício

export interface Bot { nome: string; perfil: "ativo" | "medio" | "parado"; diario: number[] }

/** XP semanal "típico" da liga: sobe com o nível, para a disputa ficar apertada mas vencível. */
export const xpTipico = (indice: number) => 140 + 45 * indice;

export function gerarBots(semente_: string, semana: string, indice: number, cfg: Pick<ConfigLigas, "nomes" | "tamanho">): Bot[] {
  const rnd = aleatorio(`${semente_}|${semana}|${indice}`);
  const total = Math.max(1, cfg.tamanho - 1);
  const nParados = Math.round(total * 0.17);
  const nAtivos = Math.round(total * 0.17);
  const perfis: Bot["perfil"][] = [...Array(nParados).fill("parado"), ...Array(nAtivos).fill("ativo"), ...Array(total - nParados - nAtivos).fill("medio")];
  // embaralha perfis e nomes com a mesma semente
  for (let i = perfis.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rnd() * (i + 1));
    [perfis[i], perfis[j]] = [perfis[j], perfis[i]];
  }
  const nomes = [...cfg.nomes];
  for (let i = nomes.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rnd() * (i + 1));
    [nomes[i], nomes[j]] = [nomes[j], nomes[i]];
  }
  const M = xpTipico(indice);
  return perfis.map((perfil, i) => {
    const alvo = perfil === "parado" ? M * rnd() * 0.15 : perfil === "medio" ? M * (0.4 + rnd() * 0.9) : M * (1.4 + rnd() * 0.8);
    const pesos = Array.from({ length: 7 }, () => (perfil === "parado" && rnd() < 0.5 ? 0 : 0.3 + rnd() * 1.4));
    const soma = pesos.reduce((a, b) => a + b, 0) || 1;
    return { nome: nomes[i] ?? `Participante ${i + 1}`, perfil, diario: pesos.map((p) => Math.round((p / soma) * alvo)) };
  });
}

/** XP do participante fictício no instante t (0 a 7 dias desde a segunda 00h): cresce de forma contínua ao longo do dia. */
export function xpDoBot(b: Bot, t: number): number {
  const tt = Math.max(0, Math.min(7, t));
  const d = Math.min(6, Math.floor(tt));
  let xp = 0;
  for (let i = 0; i < d; i += 1) xp += b.diario[i];
  xp += b.diario[d] * (tt >= 7 ? 1 : tt - d);
  return Math.round(xp);
}

/** Linha do ranking. No ranking real vem com a foto (ou null = só a inicial) e `anonimo` (quem desligou "mostrar no ranking"). */
export interface Linha { nome: string; xp: number; voce: boolean; posicao: number; foto?: string | null; anonimo?: boolean }

/** Classificação do grupo no instante t. Empate: a pessoa fica na frente. */
export function classificar(xpUsuario: number, bots: Bot[], t: number, nomeUsuario = "Você", outros: Linha[] = []): Linha[] {
  // Liga mista: membros reais (abaixo do mínimo do ranking real) ocupam o lugar dos últimos fictícios; o grupo segue do mesmo tamanho.
  const reais = outros.filter((o) => !o.voce).slice(0, bots.length).map((o) => ({ nome: o.nome, xp: Math.max(0, Math.round(o.xp)), voce: false, foto: o.foto ?? null, anonimo: !!o.anonimo }));
  const usados = bots.slice(0, bots.length - reais.length);
  const todos: Omit<Linha, "posicao">[] = [{ nome: nomeUsuario, xp: xpUsuario, voce: true }, ...reais, ...usados.map((b) => ({ nome: b.nome, xp: xpDoBot(b, t), voce: false }))];
  todos.sort((a, b) => b.xp - a.xp || Number(b.voce) - Number(a.voce) || a.nome.localeCompare(b.nome));
  return todos.map((l, i) => ({ ...l, posicao: i + 1 }));
}

export type Zona = "sobe" | "desce" | "neutra";

export function zonaDe(posicao: number, indice: number, cfg: Pick<ConfigLigas, "ligas" | "sobem" | "descem" | "tamanho">): Zona {
  if (posicao <= cfg.sobem && indice < cfg.ligas.length - 1) return "sobe";
  if (posicao > cfg.tamanho - cfg.descem && indice > 0) return "desce";
  return "neutra";
}

export interface LimitesGrupo { sobem: number; descem: number; tamanho: number }

/** Quantos sobem e descem num grupo real de n pessoas (mesma proporção do grupo de 30 fictício: 7 sobem, 5 descem). */
export function limitesReal(n: number, cfg: Pick<ConfigLigas, "sobem" | "descem" | "tamanho">): LimitesGrupo {
  const sobem = Math.max(1, Math.round((n * cfg.sobem) / cfg.tamanho));
  let descem = Math.max(1, Math.round((n * cfg.descem) / cfg.tamanho));
  if (sobem + descem >= n) descem = Math.max(0, n - sobem - 1); // sempre sobra gente na zona segura
  return { sobem, descem, tamanho: n };
}

/** Quanto falta para a semana acabar (domingo 23h59). */
export function restanteSemana(t: number): { dias: number; horas: number } {
  const horas = Math.max(0, Math.round((7 - t) * 24));
  return { dias: Math.floor(horas / 24), horas: horas % 24 };
}

// ------------------------------------------------------------------ virada de semana

/** Fecha a semana guardada, aplica subida/descida e deixa o resultado esperando a pessoa ver. Idempotente. */
export function atualizarLiga(e: Estado, hoje: string, semente_: string, cfg: ConfigLigas, real?: Linha[] | null, outros?: Linha[] | null): Estado {
  const atual = inicioSemana(hoje);
  const l = e.liga;
  if (l.semana === atual) return e;
  if (l.semana === null) return { ...e, liga: { ...l, semana: atual } };
  const xp = e.xpSemana[l.semana] ?? 0;
  // Ranking real (classificação final da semana que fechou, vinda do servidor) ou o grupo fictício.
  const reais = real && real.some((x) => x.voce) ? real : null;
  const linhas = reais ?? classificar(xp, gerarBots(semente_, l.semana, l.indice, cfg), 7, "Você", outros ?? []);
  const posicao = linhas.find((x) => x.voce)!.posicao;
  const zona = zonaDe(posicao, l.indice, reais ? { ...cfg, ...limitesReal(reais.length, cfg) } : cfg);
  const para = zona === "sobe" ? l.indice + 1 : zona === "desce" ? l.indice - 1 : l.indice;
  const resultado: ResultadoLiga = { semana: l.semana, liga: l.indice, para, posicao, xp, resultado: zona === "sobe" ? "subiu" : zona === "desce" ? "desceu" : "ficou" };
  const { para: _p, ...hist } = resultado;
  void _p;
  const talentos = (e.talentos ?? 0) + (resultado.resultado === "subiu" ? TALENTOS_GANHO.ligaSubiu : resultado.resultado === "ficou" ? TALENTOS_GANHO.ligaFicou : 0);
  return { ...e, talentos, liga: { indice: para, semana: atual, historico: [...l.historico, hist].slice(-20), resultado } };
}

/** Situação atual da pessoa na liga (para a tela e para os lembretes). */
export function situacaoNaLiga(e: Estado, hoje: string, hora: number, semente_: string, cfg: ConfigLigas, nome = "Você", real?: Linha[] | null, outros?: Linha[] | null) {
  const sem = inicioSemana(hoje);
  const t = Math.min(7, Math.max(0, (new Date(`${hoje}T00:00:00Z`).getTime() - new Date(`${sem}T00:00:00Z`).getTime()) / 86_400_000 + hora / 24));
  const reais = real && real.some((x) => x.voce) ? real : null;
  const mistos = !reais && outros?.some((o) => !o.voce) ? outros : null;
  const linhas = reais ?? classificar(e.xpSemana[sem] ?? 0, gerarBots(semente_, sem, e.liga.indice, cfg), t, nome, mistos ?? []);
  const eu = linhas.find((l) => l.voce)!;
  const limites: LimitesGrupo = reais ? limitesReal(reais.length, cfg) : { sobem: cfg.sobem, descem: cfg.descem, tamanho: cfg.tamanho };
  return { linhas, modo: (reais ? "real" : mistos ? "misto" : "ficticio") as "real" | "misto" | "ficticio", limites, posicao: eu.posicao, zona: zonaDe(eu.posicao, e.liga.indice, { ...cfg, ...limites }), t, liga: cfg.ligas[Math.min(e.liga.indice, cfg.ligas.length - 1)], restante: restanteSemana(t) };
}
