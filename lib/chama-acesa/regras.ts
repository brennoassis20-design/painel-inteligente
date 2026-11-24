// Regras do Chama Acesa (funções puras, sem banco e sem relógio: quem chama passa a data de hoje).
// Datas são sempre "AAAA-MM-DD" no fuso de São Paulo.
export const FUSO = "America/Sao_Paulo";
export const TOTAL_DIAS = 21;
export const DIAS_GRATIS = 3;
export const MAX_BRASAS = 2;
export const DIAS_POR_BRASA = 7;
export const MARCOS_CHAMA = [3, 7, 14, 21] as const;

export type Check = "leu" | "orou" | "missao";
export type Checks = Record<Check, boolean>;
export type Medalha = "chama3" | "chama7" | "chama14" | "chama21" | "jornada";
export type Aviso = "brasa_salvou" | "chama_apagou";

export interface HistLiga { semana: string; liga: number; posicao: number; xp: number; resultado: "subiu" | "ficou" | "desceu" }
export interface ResultadoLiga extends HistLiga { para: number }
export interface LigaEstado {
  /** Índice da liga atual (0 = primeira). */
  indice: number;
  /** Segunda-feira (AAAA-MM-DD) da semana em disputa; null = ainda não entrou numa semana. */
  semana: string | null;
  historico: HistLiga[];
  /** Resultado da semana que acabou, esperando a pessoa ver. */
  resultado: ResultadoLiga | null;
}

/** Pontos de experiência (XP). */
export const XP = { leu: 10, orou: 10, missao: 15, jejum: 10, bonusDia: 15, acertoPratica: 5, praticaPerfeita: 10, convite: 50 } as const;

export interface Estado {
  xp: number;
  /** semana (segunda-feira) -> XP ganho nela */
  xpSemana: Record<string, number>;
  /** id do versículo -> quantas vezes caiu na prática */
  praticas: Record<string, number>;
  /** amigos convidados que completaram o dia 1 */
  amigos: number;
  /** Último dia de calendário em que a pessoa abriu o app. */
  ultimoAcesso: string | null;
  /** chave da mensagem de lembrete -> data em que foi enviada (para não repetir em 7 dias) */
  lembretesHist: Record<string, string>;
  liga: LigaEstado;
  /** Data em que começou a jornada (primeiro dia concluído ou aberto). */
  inicio: string | null;
  /** Último dia de calendário coberto pela chama (dia completo ou dia salvo por brasa). */
  ultimaData: string | null;
  chama: number;
  maior: number;
  brasas: number;
  /** dia da jornada -> data em que foi concluído */
  concluidos: Record<number, string>;
  checks: Record<number, Checks>;
  jejum: Record<number, boolean>;
  medalhas: Medalha[];
  avisos: Aviso[];
  /** "HH:MM" do lembrete diário; null = sem lembrete. */
  lembrete: string | null;
}

export function estadoVazio(): Estado {
  return { xp: 0, xpSemana: {}, praticas: {}, amigos: 0, ultimoAcesso: null, lembretesHist: {}, liga: { indice: 0, semana: null, historico: [], resultado: null }, inicio: null, ultimaData: null, chama: 0, maior: 0, brasas: 0, concluidos: {}, checks: {}, jejum: {}, medalhas: [], avisos: [], lembrete: null };
}

export function checksVazios(): Checks {
  return { leu: false, orou: false, missao: false };
}

// ------------------------------------------------------------------ datas

const formatador = new Intl.DateTimeFormat("en-CA", { timeZone: FUSO, year: "numeric", month: "2-digit", day: "2-digit" });

/** Data de calendário em São Paulo (vira à meia-noite de lá, não à do servidor). */
export function dataSP(instante: Date | number = Date.now()): string {
  return formatador.format(instante);
}

function utc(data: string): number {
  const [a, m, d] = data.split("-").map(Number);
  return Date.UTC(a, m - 1, d);
}

/** b - a em dias de calendário. */
export function diffDias(a: string, b: string): number {
  return Math.round((utc(b) - utc(a)) / 86_400_000);
}

export function somarDias(data: string, n: number): string {
  return new Date(utc(data) + n * 86_400_000).toISOString().slice(0, 10);
}

/** Segunda-feira da semana desta data (a semana vai de segunda 00h a domingo 23h59, fuso de São Paulo). */
export function inicioSemana(data: string): string {
  const dow = new Date(utc(data)).getUTCDay(); // 0 = domingo
  return somarDias(data, -((dow + 6) % 7));
}

/** Hora do dia em São Paulo, fracionária (0 a 24). */
export function horaSP(instante: Date | number = Date.now()): number {
  const p = new Intl.DateTimeFormat("en-GB", { timeZone: FUSO, hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(instante);
  const h = Number(p.find((x) => x.type === "hour")?.value) % 24;
  return h + Number(p.find((x) => x.type === "minute")?.value) / 60;
}

/** Quanto da semana já passou, em dias (0 a 7). */
export function tSemana(hoje: string, hora: number): number {
  return diffDias(inicioSemana(hoje), hoje) + hora / 24;
}

/** Soma XP ao total e à semana de `hoje`. */
export function somarXp(e: Estado, n: number, hoje: string): Estado {
  if (n <= 0) return e;
  const sem = inicioSemana(hoje);
  return { ...e, xp: e.xp + n, xpSemana: { ...e.xpSemana, [sem]: (e.xpSemana[sem] ?? 0) + n } };
}

/** Marca que a pessoa abriu o app hoje. */
export function registrarAcesso(e: Estado, hoje: string): Estado {
  return e.ultimoAcesso === hoje ? e : { ...e, ultimoAcesso: hoje };
}

/** Amigo convidado completou o dia 1: +50 XP e 1 brasa guardada (respeita o máximo). */
export function premiarConvite(e: Estado, hoje: string): Estado {
  const s = somarXp(e, XP.convite, hoje);
  return { ...s, amigos: s.amigos + 1, brasas: Math.min(MAX_BRASAS, s.brasas + 1) };
}

// ------------------------------------------------------------------ consultas

export function diasConcluidos(e: Estado): number {
  return Object.keys(e.concluidos).length;
}

/** Próximo dia da jornada a fazer (o primeiro não concluído); 22 = terminou. */
export function diaAtual(e: Estado): number {
  for (let d = 1; d <= TOTAL_DIAS; d += 1) if (!e.concluidos[d]) return d;
  return TOTAL_DIAS + 1;
}

export type Motivo = "pagamento" | "anterior" | "amanha" | "fim";
export type Abertura = { ok: true } | { ok: false; motivo: Motivo };

/** Pode abrir o dia N hoje? Dia 4 em diante exige compra; só um dia por dia de calendário. */
export function podeAbrir(e: Estado, dia: number, hoje: string, pago: boolean): Abertura {
  if (!Number.isInteger(dia) || dia < 1 || dia > TOTAL_DIAS) return { ok: false, motivo: "fim" };
  if (e.concluidos[dia]) return { ok: true }; // dia já feito: pode rever
  if (dia > DIAS_GRATIS && !pago) return { ok: false, motivo: "pagamento" };
  if (dia > 1) {
    const anterior = e.concluidos[dia - 1];
    if (!anterior) return { ok: false, motivo: "anterior" };
    if (diffDias(anterior, hoje) < 1) return { ok: false, motivo: "amanha" };
  }
  return { ok: true };
}

export type StatusDia = "feito" | "hoje" | "amanha" | "bloqueado" | "pago";

export function statusDoDia(e: Estado, dia: number, hoje: string, pago: boolean): StatusDia {
  if (e.concluidos[dia]) return "feito";
  const a = podeAbrir(e, dia, hoje, pago);
  if (a.ok) return "hoje";
  if (a.motivo === "pagamento") return "pago";
  if (a.motivo === "amanha") return "amanha";
  return "bloqueado";
}

/** Precisa de brasa guardada? Quantos dias de calendário ficaram sem completar desde a chama. */
function diasPerdidos(e: Estado, hoje: string): number {
  if (!e.ultimaData || e.chama <= 0) return 0;
  return Math.max(0, diffDias(e.ultimaData, hoje) - 1);
}

// ------------------------------------------------------------------ chama e brasa

/**
 * Resolve o que aconteceu desde a última vez: se pulou dia(s), usa brasa (uma por dia pulado) ou apaga a chama.
 * Pode ser chamada quantas vezes quiser no mesmo dia (não repete aviso).
 */
export function atualizarParaHoje(e: Estado, hoje: string): Estado {
  const perdidos = diasPerdidos(e, hoje);
  if (perdidos === 0) return e;
  if (e.brasas >= perdidos) {
    return { ...e, brasas: e.brasas - perdidos, ultimaData: somarDias(hoje, -1), avisos: [...e.avisos, "brasa_salvou"] };
  }
  return { ...e, chama: 0, ultimaData: null, avisos: [...e.avisos, "chama_apagou"] };
}

export type Acao =
  | { tipo: "check"; dia: number; check: Check }
  | { tipo: "jejum"; dia: number; valor: boolean }
  | { tipo: "lembrete"; horario: string | null }
  | { tipo: "pratica"; acertos: number; ids: string[] }
  | { tipo: "limparResultadoLiga" }
  | { tipo: "limparAvisos" };

export interface Resultado {
  estado: Estado;
  /** Dia que acabou de ficar completo (3 checks). */
  completouDia: number | null;
  novasMedalhas: Medalha[];
  ganhouBrasa: boolean;
  /** XP ganho por esta ação. */
  xpGanho: number;
  erro?: string;
}

const horarioValido = (h: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(h);

/** Aplica uma ação do usuário. Sempre resolve brasa/apagar antes. Nunca lança: devolve `erro`. */
export function aplicarAcao(entrada: Estado, acao: Acao, hoje: string, pago: boolean): Resultado {
  const base = atualizarParaHoje(entrada, hoje);
  const nada = (erro?: string): Resultado => ({ estado: base, completouDia: null, novasMedalhas: [], ganhouBrasa: false, xpGanho: 0, erro });

  if (acao.tipo === "limparAvisos") return { ...nada(), estado: { ...base, avisos: [] } };
  if (acao.tipo === "limparResultadoLiga") return { ...nada(), estado: { ...base, liga: { ...base.liga, resultado: null } } };
  if (acao.tipo === "pratica") {
    const n = acao.ids.length;
    if (n < 1 || n > 5 || !Number.isInteger(acao.acertos) || acao.acertos < 0 || acao.acertos > n) return nada("Prática inválida.");
    const xp = acao.acertos * XP.acertoPratica + (n === 5 && acao.acertos === 5 ? XP.praticaPerfeita : 0);
    const praticas = { ...base.praticas };
    for (const id of acao.ids) praticas[id] = (praticas[id] ?? 0) + 1;
    // Prática não completa o dia nem mexe na chama: só XP e o contador de versículos vistos.
    return { ...nada(), estado: { ...somarXp(base, xp, hoje), praticas }, xpGanho: xp };
  }
  if (acao.tipo === "lembrete") {
    if (acao.horario !== null && !horarioValido(acao.horario)) return nada("Horário inválido.");
    return { ...nada(), estado: { ...base, lembrete: acao.horario } };
  }

  const aberto = podeAbrir(base, acao.dia, hoje, pago);
  if (!aberto.ok) return nada(aberto.motivo === "pagamento" ? "Dia bloqueado: falta a compra." : aberto.motivo === "amanha" ? "Este dia abre amanhã." : "Este dia ainda não abriu.");

  if (acao.tipo === "jejum") {
    // XP do jejum só na primeira vez que marca (desmarcar e marcar de novo não rende de novo).
    const primeira = acao.valor && base.jejum[acao.dia] === undefined;
    const e2 = { ...base, jejum: { ...base.jejum, [acao.dia]: acao.valor } };
    return { ...nada(), estado: primeira ? somarXp(e2, XP.jejum, hoje) : e2, xpGanho: primeira ? XP.jejum : 0 };
  }

  // check
  if (base.concluidos[acao.dia]) return nada();
  const antes = base.checks[acao.dia] ?? checksVazios();
  const checks = { ...antes, [acao.check]: true };
  let xpGanho = antes[acao.check] ? 0 : XP[acao.check];
  let estado: Estado = somarXp({ ...base, inicio: base.inicio ?? hoje, checks: { ...base.checks, [acao.dia]: checks } }, xpGanho, hoje);
  if (!(checks.leu && checks.orou && checks.missao)) return { ...nada(), estado, xpGanho };
  xpGanho += XP.bonusDia;
  estado = somarXp(estado, XP.bonusDia, hoje);

  // Dia completo: a chama sobe um dia (a chama já foi validada por atualizarParaHoje).
  const chama = estado.chama + 1;
  const concluidos = { ...estado.concluidos, [acao.dia]: hoje };
  const ganhouBrasa = chama % DIAS_POR_BRASA === 0 && estado.brasas < MAX_BRASAS;
  estado = {
    ...estado,
    chama,
    maior: Math.max(estado.maior, chama),
    ultimaData: hoje,
    concluidos,
    brasas: ganhouBrasa ? estado.brasas + 1 : estado.brasas,
  };
  const novas: Medalha[] = [];
  for (const m of MARCOS_CHAMA) {
    const id = `chama${m}` as Medalha;
    if (chama >= m && !estado.medalhas.includes(id)) novas.push(id);
  }
  if (Object.keys(concluidos).length >= TOTAL_DIAS && !estado.medalhas.includes("jornada")) novas.push("jornada");
  estado = { ...estado, medalhas: [...estado.medalhas, ...novas] };
  return { estado, completouDia: acao.dia, novasMedalhas: novas, ganhouBrasa, xpGanho };
}

/** Intensidade visual da chama (0 = brasa fraca ... 4 = fogueira), cresce com a sequência. */
export function nivelChama(chama: number): 0 | 1 | 2 | 3 | 4 {
  if (chama <= 0) return 0;
  if (chama < 3) return 1;
  if (chama < 7) return 2;
  if (chama < 14) return 3;
  return 4;
}

export const NOMES_MEDALHA: Record<Medalha, { nome: string; texto: string }> = {
  chama3: { nome: "Faísca", texto: "3 dias de chama seguidos" },
  chama7: { nome: "Fogueira", texto: "7 dias de chama seguidos" },
  chama14: { nome: "Labareda", texto: "14 dias de chama seguidos" },
  chama21: { nome: "Chama inextinguível", texto: "21 dias de chama seguidos" },
  jornada: { nome: "Jornada completa", texto: "Os 21 dias de consagração concluídos" },
};
