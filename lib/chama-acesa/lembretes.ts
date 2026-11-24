// Lembretes diários estilo Duolingo: quem recebe, qual categoria e qual texto. Lógica pura (testável);
// a rota /api/membros/chama-lembrete só executa o que sai daqui.
import { aleatorio, situacaoNaLiga, type ConfigLigas } from "./ligas.ts";
import { DIAS_METAS_PADRAO, ehMeta, proximaMeta } from "./marcos.ts";
import { diffDias, estadoVazio, type Estado, type LigaEstado } from "./regras.ts";

export interface Texto { cat: string; tom: string; titulo: string; corpo: string }
export type Tipo = "manha" | "noite";
export const HORA_NOITE = 21;
export const DIAS_SEM_REPETIR = 7;
export const MAX_DIAS_SUMIDO = 14;

export function normalizarTextos(cru: unknown): Texto[] {
  if (!Array.isArray(cru)) return [];
  return (cru as Record<string, unknown>[])
    .map((t) => ({ cat: String(t?.cat ?? "").trim(), tom: String(t?.tom ?? "").trim(), titulo: String(t?.titulo ?? "").trim(), corpo: String(t?.corpo ?? "").trim() }))
    .filter((t) => t.cat && t.titulo);
}

export interface PerfilLembrete {
  user_id: string;
  nome?: string | null;
  chama_atual: number;
  maior_chama?: number;
  ultima_data: string | null;
  ultimo_acesso?: string | null;
  horario_lembrete: string | null;
  dias_feitos?: number;
  xp_semana?: Record<string, number>;
  liga?: LigaEstado;
  lembretes_hist?: Record<string, string>;
}

/** Perfil mínimo a partir do estado (bancada e testes). */
export function perfilDeEstado(e: Estado, userId: string, nome?: string): PerfilLembrete {
  return {
    user_id: userId, nome: nome ?? null, chama_atual: e.chama, maior_chama: e.maior, ultima_data: e.ultimaData, ultimo_acesso: e.ultimoAcesso,
    horario_lembrete: e.lembrete, dias_feitos: Object.keys(e.concluidos).length, xp_semana: e.xpSemana, liga: e.liga, lembretes_hist: e.lembretesHist,
  };
}

export const chaveDoTexto = (t: Texto) => `${t.cat}|${t.titulo}`;

/** Sorteia sem repetir a mesma mensagem por 7 dias; se todas foram usadas há pouco, volta à mais antiga. */
export function escolherTexto(textos: Texto[], cat: string, hist: Record<string, string>, hoje: string, rnd: () => number): Texto | null {
  const todos = textos.filter((t) => t.cat === cat);
  if (!todos.length) return null;
  const livres = todos.filter((t) => !hist[chaveDoTexto(t)] || diffDias(hist[chaveDoTexto(t)], hoje) >= DIAS_SEM_REPETIR);
  if (livres.length) return livres[Math.floor(rnd() * livres.length)];
  return [...todos].sort((a, b) => hist[chaveDoTexto(a)].localeCompare(hist[chaveDoTexto(b)]))[0];
}

export function preencher(modelo: string, vars: Record<string, string | number>): string {
  return modelo.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? "")).replace(/\s+/g, " ").trim();
}

export interface Contexto {
  tipo: Tipo;
  hoje: string;
  chama: number;
  maior: number;
  ultimaData: string | null;
  ultimoAcesso: string | null;
  diasFeitos: number;
  posicao: number;
  zona: "sobe" | "desce" | "neutra";
  sobem: number;
  /** Dias das metas (marcos.json). Sem isso vale a lista padrão. */
  diasMetas?: readonly number[];
}

/** Quantos dias sem abrir o app. */
export function diasSemAbrir(c: Pick<Contexto, "hoje" | "ultimoAcesso" | "ultimaData">): number {
  const ref = c.ultimoAcesso ?? c.ultimaData;
  return ref ? Math.max(0, diffDias(ref, c.hoje)) : 0;
}

/** Em que situação a pessoa está: decide a categoria do texto. null = não manda nada. */
export function categoriaDoLembrete(c: Contexto): string | null {
  const sumido = diasSemAbrir(c);
  if (c.tipo === "noite") {
    if (sumido >= 2) return null;
    if (c.chama >= 7) return "chama_alta_risco";
    if (c.zona === "desce") return "liga_risco_descer";
    return "noite_risco";
  }
  if (sumido > MAX_DIAS_SUMIDO) return null; // depois de 14 dias, para de insistir
  if (sumido === MAX_DIAS_SUMIDO) return "sumiu_14_dias";
  if (sumido >= 5) return "sumiu_5_dias";
  if (sumido >= 2) return "sumiu_2_dias";
  if (c.chama > 0 && ehMeta(c.chama + 1, c.diasMetas ?? DIAS_METAS_PADRAO)) return "medalha_perto";
  if (c.zona === "desce") return "liga_risco_descer";
  if (c.posicao > c.sobem && c.posicao <= c.sobem + 3 && c.zona === "neutra") return "liga_perto_subir";
  if (c.chama === 1 && c.maior > 1) return "voltou";
  if (c.diasFeitos >= 1 && new Date(`${c.hoje}T00:00:00Z`).getUTCDay() === 6) return "convite_amigo";
  return "manha_normal";
}

export interface Mensagem { tipo: Tipo | "checkout"; categoria: string; chave: string; titulo: string; corpo: string }
export interface Entrega { perfil: PerfilLembrete; mensagem: Mensagem }

/** Monta a mensagem de um perfil num horário (ou null se não deve receber). */
export function montarMensagem(p: PerfilLembrete, tipo: Tipo, hoje: string, hora: number, textos: Texto[], cfg: ConfigLigas, rnd?: () => number, diasMetas: readonly number[] = DIAS_METAS_PADRAO): Mensagem | null {
  const e: Estado = { ...estadoVazio(), chama: p.chama_atual, xpSemana: p.xp_semana ?? {}, liga: p.liga ?? estadoVazio().liga };
  const sit = situacaoNaLiga(e, hoje, hora, p.user_id, cfg, p.nome ?? "Você");
  const ctx: Contexto = {
    tipo, hoje, chama: p.chama_atual, maior: p.maior_chama ?? p.chama_atual, ultimaData: p.ultima_data, ultimoAcesso: p.ultimo_acesso ?? null,
    diasFeitos: p.dias_feitos ?? 0, posicao: sit.posicao, zona: sit.zona, sobem: cfg.sobem, diasMetas,
  };
  const cat = categoriaDoLembrete(ctx);
  if (!cat) return null;
  const texto = escolherTexto(textos, cat, p.lembretes_hist ?? {}, hoje, rnd ?? aleatorio(`${p.user_id}|${hoje}|${tipo}`));
  if (!texto) return null;
  // Meta seguinte da chama, sem teto (a chama é infinita): "{meta}" nos textos é o número de dias da meta.
  const proximoMarco = proximaMeta(p.chama_atual, diasMetas);
  const vars = {
    nome: (p.nome || "amigo").split(" ")[0], dias: p.chama_atual, liga: sit.liga.nome, posicao: sit.posicao,
    meta: proximoMarco, faltam: Math.max(1, proximoMarco - p.chama_atual), proximo_dia: (p.dias_feitos ?? 0) + 1,
  };
  return { tipo, categoria: cat, chave: chaveDoTexto(texto), titulo: preencher(texto.titulo, vars), corpo: preencher(texto.corpo, vars) };
}

/**
 * Quem recebe agora (hora = "HH" em São Paulo, hoje = AAAA-MM-DD). Só quem ligou o lembrete (tem horário) e ainda não completou hoje.
 * Manhã: a hora escolhida. Noite: 21h (quem escolheu 21h recebe só o da noite). A categoria e o texto vêm da situação da pessoa.
 */
export function quemRecebe(perfis: PerfilLembrete[], hora: string, hoje: string, textos: Texto[], cfg: ConfigLigas, diasMetas: readonly number[] = DIAS_METAS_PADRAO): Entrega[] {
  const out: Entrega[] = [];
  for (const p of perfis) {
    if (!p.horario_lembrete || p.ultima_data === hoje) continue;
    const tipo: Tipo | null = hora === String(HORA_NOITE) ? "noite" : p.horario_lembrete.slice(0, 2) === hora ? "manha" : null;
    if (!tipo) continue;
    const mensagem = montarMensagem(p, tipo, hoje, Number(hora), textos, cfg, undefined, diasMetas);
    if (mensagem) out.push({ perfil: p, mensagem });
  }
  return out;
}

/** Marca a mensagem como enviada no histórico (e poda o que passou de 14 dias). */
export function registrarEnvio(hist: Record<string, string>, chave: string, hoje: string): Record<string, string> {
  const novo: Record<string, string> = {};
  for (const [k, d] of Object.entries(hist)) if (diffDias(d, hoje) < 14) novo[k] = d;
  novo[chave] = hoje;
  return novo;
}

// ------------------------------------------------------------------ cobrança do dia 3 (grátis -> compra)

export interface CandidatoCobranca { user_id: string; nome?: string | null; chama_atual: number; dia3: string | null; pago: boolean; enviada: boolean; dias_feitos?: number; lembretes_hist?: Record<string, string> }

/** No dia seguinte ao dia 3 completo, quem ainda não comprou (e ainda não foi avisado) recebe push + e-mail. */
export function quemRecebeCobranca(cands: CandidatoCobranca[], hoje: string, textos: Texto[]): { candidato: CandidatoCobranca; titulo: string; corpo: string; chave: string }[] {
  const out: { candidato: CandidatoCobranca; titulo: string; corpo: string; chave: string }[] = [];
  for (const c of cands) {
    if (c.pago || c.enviada || !c.dia3 || diffDias(c.dia3, hoje) !== 1) continue;
    const t = escolherTexto(textos, "checkout_dia4", c.lembretes_hist ?? {}, hoje, aleatorio(`${c.user_id}|${hoje}|dia4`)) ?? { cat: "checkout_dia4", tom: "", titulo: "🔥 Sua chama de 3 dias vai apagar sem o dia 4", corpo: "Garante a sua jornada e continue de onde parou." };
    const vars = { nome: (c.nome || "amigo").split(" ")[0], dias: c.chama_atual, proximo_dia: 4 };
    out.push({ candidato: c, titulo: preencher(t.titulo, vars), corpo: preencher(t.corpo, vars), chave: chaveDoTexto(t) });
  }
  return out;
}

