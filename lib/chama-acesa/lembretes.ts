// Lembretes diários estilo Duolingo: quem recebe, qual categoria e qual texto. Lógica pura (testável);
// a rota /api/membros/chama-lembrete só executa o que sai daqui.
import { aleatorio, situacaoNaLiga, type ConfigLigas } from "./ligas.ts";
import { DIAS_METAS_PADRAO, ehMeta, proximaMeta } from "./marcos.ts";
import { diffDias, estadoVazio, inicioSemana, type Estado, type LigaEstado } from "./regras.ts";
import { MINIMO_PADRAO, membrosDaLiga, outrosReais, rankingReal, type PerfilRanking } from "./ranking.ts";

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
  return modelo
    .replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? ""))
    .replace(/\b1 dias\b/g, "1 dia") // "{dias} dias" com chama de 1
    .replace(/\s+/g, " ")
    .trim();
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
  /** Já completou o dia de hoje (à noite recebe o lembrete do dia seguinte). */
  feitoHoje?: boolean;
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
    if (c.feitoHoje) return "noite_feito";
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

/** Membros reais da área (ativos na semana) para o lembrete usar a MESMA liga que a pessoa vê no app (real, mista ou fictícia). */
export interface LigaReal { perfis: PerfilRanking[]; minimo?: number }

/** Mesma regra da rota do app: ranking real com o mínimo; abaixo dele, os outros reais no lugar de fictícios. */
export function ligaDoLembrete(p: PerfilLembrete, e: Estado, hoje: string, cfg: ConfigLigas, liga?: LigaReal) {
  if (!liga) return { real: null, outros: null };
  const semana = inicioSemana(hoje);
  const membros = membrosDaLiga(liga.perfis, semana, e.liga.indice).filter((m) => m.id !== p.user_id);
  const eu = { id: p.user_id, nome: p.nome ?? null, foto: null, mostrar: true, xp: e.xpSemana[semana] ?? 0 };
  const real = rankingReal([...membros, eu], p.user_id, semana, cfg, liga.minimo ?? MINIMO_PADRAO);
  if (real) return { real, outros: null };
  const outros = outrosReais(membros, p.user_id, cfg.tamanho - 1);
  return { real: null, outros: outros.length ? outros : null };
}

/** Monta a mensagem de um perfil num horário (ou null se não deve receber). */
export function montarMensagem(p: PerfilLembrete, tipo: Tipo, hoje: string, hora: number, textos: Texto[], cfg: ConfigLigas, rnd?: () => number, diasMetas: readonly number[] = DIAS_METAS_PADRAO, liga?: LigaReal): Mensagem | null {
  const e: Estado = { ...estadoVazio(), chama: p.chama_atual, xpSemana: p.xp_semana ?? {}, liga: p.liga ?? estadoVazio().liga };
  const { real, outros } = ligaDoLembrete(p, e, hoje, cfg, liga);
  const sit = situacaoNaLiga(e, hoje, hora, p.user_id, cfg, p.nome ?? "Você", real, outros);
  const ctx: Contexto = {
    tipo, hoje, chama: p.chama_atual, maior: p.maior_chama ?? p.chama_atual, ultimaData: p.ultima_data, ultimoAcesso: p.ultimo_acesso ?? null,
    diasFeitos: p.dias_feitos ?? 0, posicao: sit.posicao, zona: sit.zona, sobem: cfg.sobem, diasMetas, feitoHoje: p.ultima_data === hoje,
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
 * Quem recebe agora (hora = "HH" em São Paulo, hoje = AAAA-MM-DD).
 * Manhã: só quem escolheu um horário e ainda não completou hoje. Noite (21h): todo mundo; quem já fez o dia recebe
 * o lembrete do dia seguinte (noite_feito), quem não fez recebe o de risco. Quem escolheu 21h recebe só o da noite.
 * O push só chega a quem tem o aparelho inscrito; sem inscrição a entrega vira 0.
 */
export function quemRecebe(perfis: PerfilLembrete[], hora: string, hoje: string, textos: Texto[], cfg: ConfigLigas, diasMetas: readonly number[] = DIAS_METAS_PADRAO, liga?: LigaReal): Entrega[] {
  const out: Entrega[] = [];
  for (const p of perfis) {
    const noite = hora === String(HORA_NOITE);
    if (!noite && (!p.horario_lembrete || p.ultima_data === hoje || p.horario_lembrete.slice(0, 2) !== hora)) continue;
    // Quem nunca fez nenhum dia não recebe o "boa noite, amanhã é o dia 2".
    if (noite && p.ultima_data !== hoje && !p.horario_lembrete && !(p.dias_feitos ?? 0)) continue;
    const tipo: Tipo = noite ? "noite" : "manha";
    const mensagem = montarMensagem(p, tipo, hoje, Number(hora), textos, cfg, undefined, diasMetas, liga);
    if (mensagem) out.push({ perfil: p, mensagem });
  }
  return out;
}

// ------------------------------------------------------------------ versículo do meio-dia

export const HORA_VERSICULO = 12;
export interface VersiculoAviso { referencia: string; texto: string }

/** O mesmo versículo para todo mundo no dia, girando pelo banco sem repetir até dar a volta. */
export function versiculoDoDia<T extends VersiculoAviso>(versiculos: T[], hoje: string): T | null {
  if (!versiculos.length) return null;
  const dia = Math.floor(Date.parse(`${hoje}T00:00:00Z`) / 86_400_000);
  return versiculos[((dia % versiculos.length) + versiculos.length) % versiculos.length];
}

/** Quem recebe o versículo: todo mundo da área que abriu o app nos últimos 14 dias. */
export function quemRecebeVersiculo(perfis: PerfilLembrete[], hoje: string): PerfilLembrete[] {
  return perfis.filter((p) => {
    const ref = p.ultimo_acesso ?? p.ultima_data;
    return ref ? diffDias(ref, hoje) <= MAX_DIAS_SUMIDO : false;
  });
}

export function mensagemVersiculo(v: VersiculoAviso): { titulo: string; corpo: string } {
  return { titulo: "📖 Palavra do meio-dia", corpo: `“${v.texto}” ${v.referencia}` };
}

/** Marca a mensagem como enviada no histórico (e poda o que passou de 14 dias). */
export function registrarEnvio(hist: Record<string, string>, chave: string, hoje: string): Record<string, string> {
  const novo: Record<string, string> = {};
  for (const [k, d] of Object.entries(hist)) if (diffDias(d, hoje) < 14) novo[k] = d;
  novo[chave] = hoje;
  return novo;
}

// ------------------------------------------------------------------ cobrança do dia 3 (grátis -> compra)

export interface CandidatoCobranca { user_id: string; nome?: string | null; chama_atual: number; dia3: string | null; pago: boolean; /** "dia3" = concluiu o dia 3 ontem; "teste" = os 3 dias grátis de calendário acabaram ontem. */ motivo?: "dia3" | "teste"; enviada: boolean; dias_feitos?: number; lembretes_hist?: Record<string, string> }

/** No dia seguinte ao dia 3 completo, quem ainda não comprou (e ainda não foi avisado) recebe push + e-mail. */
export function quemRecebeCobranca(cands: CandidatoCobranca[], hoje: string, textos: Texto[]): { candidato: CandidatoCobranca; titulo: string; corpo: string; chave: string }[] {
  const out: { candidato: CandidatoCobranca; titulo: string; corpo: string; chave: string }[] = [];
  for (const c of cands) {
    if (c.pago || c.enviada || !c.dia3 || diffDias(c.dia3, hoje) !== 1) continue;
    const teste = c.motivo === "teste";
    const t = teste
      ? escolherTexto(textos, "checkout_teste", c.lembretes_hist ?? {}, hoje, aleatorio(`${c.user_id}|${hoje}|teste`)) ?? { cat: "checkout_teste", tom: "", titulo: "Seus 3 dias grátis acabaram", corpo: "Sua jornada com Deus está guardada. Escolha como continuar e acenda a chama hoje." }
      : escolherTexto(textos, "checkout_dia4", c.lembretes_hist ?? {}, hoje, aleatorio(`${c.user_id}|${hoje}|dia4`)) ?? { cat: "checkout_dia4", tom: "", titulo: "🔥 Sua chama de 3 dias vai apagar sem o dia 4", corpo: "Garante a sua jornada e continue de onde parou." };
    const vars = { nome: (c.nome || "amigo").split(" ")[0], dias: c.chama_atual, proximo_dia: 4 };
    out.push({ candidato: c, titulo: preencher(t.titulo, vars), corpo: preencher(t.corpo, vars), chave: chaveDoTexto(t) });
  }
  return out;
}


// ------------------------------------------------------------------ avisos extras do dia (estilo Duolingo)
// Além da manhã e das 21h: "tá tranquilo" 4–5 h depois de fazer o dia, alguém passou você na liga e o último dia da liga (domingo).
// No máximo MAX_EXTRAS_DIA por pessoa/dia e um por hora. Só entra quem abriu o app nos últimos 2 dias.

export const MAX_EXTRAS_DIA = 4;
export const MAX_PASSOU_DIA = 2;
export const XP_PRATICA_MAX = 5 * 5 + 10; // 5 acertos de 5 XP + prática perfeita
export const HORAS_ULTIMO_DIA = [10, 15, 19] as const;
const CATS_EXTRAS = ["tranquilo", "liga_passou", "liga_ultimo_sobe", "liga_ultimo_perto", "liga_ultimo_desce", "liga_ultimo"];

/** Quantos avisos destas categorias já foram enviados hoje (pelo histórico "cat|titulo" -> data). */
export function enviadosHoje(hist: Record<string, string>, hoje: string, cats: readonly string[] = CATS_EXTRAS): number {
  return Object.entries(hist).filter(([k, d]) => d === hoje && cats.includes(k.split("|")[0])).length;
}

export interface Extra { categoria: string; vars: Record<string, string | number> }

/**
 * Decide o aviso extra de uma pessoa nesta hora (ou null). Prioridade: último dia da liga > alguém passou > tá tranquilo.
 * concluidoEm = instante (ISO) em que a pessoa completou o dia de hoje; agora = instante atual em ms.
 */
export function avisoExtra(p: PerfilLembrete, hoje: string, hora: number, agora: number, concluidoEm: string | null, cfg: ConfigLigas, liga?: LigaReal): Extra | null {
  if (hora < 8 || hora > 22) return null;
  const hist = p.lembretes_hist ?? {};
  if (enviadosHoje(hist, hoje) >= MAX_EXTRAS_DIA) return null;
  if (diasSemAbrir({ hoje, ultimoAcesso: p.ultimo_acesso ?? null, ultimaData: p.ultima_data }) >= 2) return null;
  const e: Estado = { ...estadoVazio(), chama: p.chama_atual, xpSemana: p.xp_semana ?? {}, liga: p.liga ?? estadoVazio().liga };
  const { real, outros } = ligaDoLembrete(p, e, hoje, cfg, liga);
  const nome = p.nome ?? "Você";
  const sit = situacaoNaLiga(e, hoje, hora, p.user_id, cfg, nome, real, outros);
  const meuXp = e.xpSemana[inicioSemana(hoje)] ?? 0;
  const eu = sit.linhas.find((l) => l.voce);
  const acima = sit.linhas.find((l) => l.posicao === sit.posicao - 1);
  const faltamXp = acima && eu ? Math.max(1, acima.xp - eu.xp + 1) : 0;
  const acao = faltamXp && faltamXp <= XP_PRATICA_MAX ? "Uma prática de versículos e você passa de novo." : `Faltam ${faltamXp} XP: faz a prática de versículos e vai somando.`;
  const base = { nome: (p.nome || "").split(" ")[0], liga: sit.liga.nome, posicao: sit.posicao, faltam_xp: faltamXp, horas: sit.restante.dias * 24 + sit.restante.horas, dias: p.chama_atual, acao };

  // 1) Último dia da liga (domingo; a semana começa na segunda): 10h, 15h e 19h, pela zona.
  const domingo = new Date(`${hoje}T00:00:00Z`).getUTCDay() === 0;
  if (domingo && (HORAS_ULTIMO_DIA as readonly number[]).includes(hora) && meuXp > 0) {
    const cat = sit.zona === "sobe" ? "liga_ultimo_sobe" : sit.zona === "desce" ? "liga_ultimo_desce" : sit.posicao <= sit.limites.sobem + 5 ? "liga_ultimo_perto" : "liga_ultimo";
    return { categoria: cat, vars: { ...base, faltam_xp_subir: faltaParaSubir(sit.linhas, sit.limites.sobem, eu?.xp ?? 0) } };
  }
  // 2) Alguém passou você na última hora (só quem está jogando a semana).
  if (meuXp > 0 && hora >= 1 && enviadosHoje(hist, hoje, ["liga_passou"]) < MAX_PASSOU_DIA) {
    const antes = situacaoNaLiga(e, hoje, hora - 1, p.user_id, cfg, nome, real, outros);
    if (sit.posicao > antes.posicao && acima) {
      return { categoria: "liga_passou", vars: { ...base, quem: acima.anonimo || !acima.nome ? "Alguém" : nomeCurto(acima.nome) } };
    }
  }
  // 3) Tá tranquilo: 4 a 5 horas depois de completar o dia, das 9h às 19h, uma vez.
  if (p.ultima_data === hoje && concluidoEm && hora >= 9 && hora <= 19 && enviadosHoje(hist, hoje, ["tranquilo"]) === 0) {
    const horas = (agora - Date.parse(concluidoEm)) / 3_600_000;
    if (horas >= 4 && horas < 5) return { categoria: "tranquilo", vars: base };
  }
  return null;
}

function faltaParaSubir(linhas: { posicao: number; xp: number }[], sobem: number, meuXp: number): number {
  const corte = linhas.find((l) => l.posicao === sobem);
  return corte ? Math.max(1, corte.xp - meuXp + 1) : 1;
}

/** Monta as mensagens extras desta hora para os perfis (só quem tem aparelho inscrito deve entrar aqui). */
export function quemRecebeExtras(perfis: PerfilLembrete[], hora: string, hoje: string, agora: number, concluidos: Record<string, string>, textos: Texto[], cfg: ConfigLigas, liga?: LigaReal): Entrega[] {
  const out: Entrega[] = [];
  for (const p of perfis) {
    const x = avisoExtra(p, hoje, Number(hora), agora, concluidos[p.user_id] ?? null, cfg, liga);
    if (!x) continue;
    const t = escolherTexto(textos, x.categoria, p.lembretes_hist ?? {}, hoje, aleatorio(`${p.user_id}|${hoje}|${hora}|extra`));
    if (!t) continue;
    out.push({ perfil: p, mensagem: { tipo: "manha", categoria: x.categoria, chave: chaveDoTexto(t), titulo: preencher(t.titulo, x.vars), corpo: preencher(t.corpo, x.vars) } });
  }
  return out;
}

const TITULOS = /^(pr|pra|pastor|pastora|seu|dona|irm[aã]|irm[aã]o|dr|dra|ev|mis|miss|di[aá]c|pb|ap)\.?$/i;
/** Primeiro nome para o aviso; "Pr. Marcos" e "Seu Zé" ficam com o título (só o título soa estranho). */
export function nomeCurto(nome: string): string {
  const p = nome.trim().split(/\s+/).filter(Boolean);
  if (!p.length) return "Alguém";
  return p.length > 1 && TITULOS.test(p[0]) ? `${p[0]} ${p[1]}` : p[0];
}
