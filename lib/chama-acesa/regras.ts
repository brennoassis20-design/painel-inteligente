// Regras do Chama Acesa (funções puras, sem banco e sem relógio: quem chama passa a data de hoje).
// Datas são sempre "AAAA-MM-DD" no fuso de São Paulo.
import { DIAS_METAS_PADRAO, ehMeta, idEstudo, idMeta, metaAlcancada, temMeta } from "./marcos.ts";
import { DIAS_PARA_RESTAURAR, PASSOS_VOLTA, PRECO, TALENTOS_GANHO, type PassoVolta } from "./talentos.ts";
import { aoCompletarDia, comprarEscudo, darBrasa, diasCobertosPorExtras, fazerVoto, multiplicadorXp, quebrarVoto, semEscudoPassado, type AmigoChama, type Extras } from "./extras.ts";

export const FUSO = "America/Sao_Paulo";
/** Dias da jornada inicial (dias.json). Depois do 21 a chama continua: o dia vira Palavra + oração + missão (continuo.ts). */
export const TOTAL_DIAS = 21;
/** Teto de segurança do número do dia (não é regra de produto: a chama não tem limite). */
export const MAX_DIA = 100_000;
export const DIAS_GRATIS = 3;
export const MAX_BRASAS = 2;
export const DIAS_POR_BRASA = 7;

export type Check = "leu" | "orou" | "missao";
export type Checks = Record<Check, boolean>;
/** "metaN" = meta de N dias de chama alcançada; "estudoN" = estudo da meta N concluído; "jornada" = os 21 dias; "chamaN" = medalha antiga. */
export type Medalha = string;
export type Aviso = "brasa_salvou" | "chama_apagou" | "chama_restaurada" | "voto_cumprido" | "voto_quebrado";

/** Chama que apagou e ainda pode voltar (até `ate`, inclusive). `passos` = caminho por esforço já feito. */
export interface Restauravel { chama: number; ate: string; desde: string; passos: Partial<Record<PassoVolta, boolean>> }

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
export const XP = { leu: 10, orou: 10, missao: 15, jejum: 10, bonusDia: 15, acertoPratica: 5, praticaPerfeita: 10, convite: 50, estudo: 30 } as const;

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
  /** dia (contínuo, 1, 2, ... 21, 22, ...) -> data em que foi concluído. O servidor carrega só os dias recentes: veja diasAtivos. */
  concluidos: Record<number, string>;
  /** Quantos dias já foram concluídos no total, ao longo dos anos (guardado em chama_perfil.dias_feitos). */
  diasAtivos: number;
  checks: Record<number, Checks>;
  jejum: Record<number, boolean>;
  medalhas: Medalha[];
  avisos: Aviso[];
  /** "HH:MM" do lembrete diário; null = sem lembrete. */
  lembrete: string | null;
  /** Moeda (talentos.ts). */
  talentos: number;
  /** Chama apagada que ainda pode ser restaurada; null = nada a restaurar. */
  restauravel: Restauravel | null;
  /** Itens 4 a 7 (extras.ts). */
  extras: Extras;
}

export function estadoVazio(): Estado {
  return { xp: 0, xpSemana: {}, praticas: {}, amigos: 0, ultimoAcesso: null, lembretesHist: {}, liga: { indice: 0, semana: null, historico: [], resultado: null }, inicio: null, ultimaData: null, chama: 0, maior: 0, brasas: 0, concluidos: {}, diasAtivos: 0, checks: {}, jejum: {}, medalhas: [], avisos: [], lembrete: null, talentos: 0, restauravel: null, extras: {} };
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
  // O primeiro acesso marca o início do teste grátis (dia em que instalou/abriu o app).
  return e.ultimoAcesso === hoje && e.inicio ? e : { ...e, ultimoAcesso: hoje, inicio: e.inicio ?? hoje };
}

/** Teste grátis: 3 dias de CALENDÁRIO a partir do primeiro acesso (o dia da instalação e os 2 seguintes), não 3 dias concluídos. */
export function testeAcabou(e: Estado, hoje: string): boolean {
  return Boolean(e.inicio) && diffDias(e.inicio!, hoje) >= DIAS_GRATIS;
}

/** Hoje é o último dia do teste grátis? (a oferta aparece ao concluir o dia) */
export function ultimoDiaGratis(e: Estado, hoje: string): boolean {
  return Boolean(e.inicio) && diffDias(e.inicio!, hoje) === DIAS_GRATIS - 1;
}

/** Amigo convidado completou o dia 1: +50 XP e 1 brasa guardada (respeita o máximo). */
export function premiarConvite(e: Estado, hoje: string, maxBrasas = MAX_BRASAS): Estado {
  const s = somarXp(e, XP.convite, hoje);
  return { ...s, amigos: s.amigos + 1, brasas: Math.min(maxBrasas, s.brasas + 1), talentos: (s.talentos ?? 0) + TALENTOS_GANHO.convite };
}

// ------------------------------------------------------------------ consultas

export function diasConcluidos(e: Estado): number {
  return Math.max(e.diasAtivos ?? 0, Object.keys(e.concluidos).length);
}

/** Próximo dia a fazer: o primeiro não concluído dos 21 da jornada; depois, o dia contínuo seguinte (22, 23, ...). */
export function diaAtual(e: Estado): number {
  for (let d = 1; d <= TOTAL_DIAS; d += 1) if (!e.concluidos[d]) return d;
  return Math.max(TOTAL_DIAS, diasConcluidos(e)) + 1;
}

/** Os 21 dias da jornada inicial já foram concluídos? */
export function jornadaCompleta(e: Estado): boolean {
  for (let d = 1; d <= TOTAL_DIAS; d += 1) if (!e.concluidos[d]) return false;
  return true;
}

export type Motivo = "pagamento" | "anterior" | "amanha" | "fim";
export type Abertura = { ok: true } | { ok: false; motivo: Motivo };

/** Pode abrir o dia N hoje? Sem compra: só os dias 1 a 3 e só durante os 3 dias de calendário do teste; um dia por dia de calendário. */
export function podeAbrir(e: Estado, dia: number, hoje: string, pago: boolean): Abertura {
  if (!Number.isInteger(dia) || dia < 1 || dia > MAX_DIA) return { ok: false, motivo: "fim" };
  if (e.concluidos[dia]) return { ok: true }; // dia já feito: pode rever
  if (!pago && (dia > DIAS_GRATIS || testeAcabou(e, hoje))) return { ok: false, motivo: "pagamento" };
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
export function atualizarParaHoje(entrada: Estado, hoje: string): Estado {
  // Restauração que passou do prazo some.
  const e = entrada.restauravel && hoje > entrada.restauravel.ate ? { ...entrada, restauravel: null } : entrada;
  const perdidos = diasPerdidos(e, hoje);
  if (perdidos === 0) {
    const atuais = e.extras ?? {};
    const limpo = semEscudoPassado(atuais, hoje);
    return limpo === atuais ? e : { ...e, extras: limpo };
  }
  const pulados = Array.from({ length: perdidos }, (_, i) => somarDias(e.ultimaData!, i + 1));
  // GANCHO-EXTRAS: dias cobertos por extras (Dia do Senhor) não gastam brasa.
  const cobertos = new Set(diasCobertosPorExtras(e.extras ?? {}, pulados));
  const precisa = pulados.filter((d) => !cobertos.has(d)).length;
  const extras = semEscudoPassado(e.extras ?? {}, hoje);
  if (e.brasas >= precisa) {
    // Brasa (ou escudo) salvando não quebra o voto.
    return { ...e, extras, brasas: e.brasas - precisa, ultimaData: somarDias(hoje, -1), avisos: precisa > 0 ? [...e.avisos, "brasa_salvou"] : e.avisos };
  }
  // Apagou. Dá para restaurar até 48 h depois do 1º dia perdido (se a pessoa abriu a tempo).
  const ate = somarDias(pulados[0], DIAS_PARA_RESTAURAR);
  const restauravel: Restauravel | null = hoje <= ate ? { chama: e.chama, ate, desde: hoje, passos: {} } : null;
  const voto = quebrarVoto(extras, [...e.avisos, "chama_apagou"]);
  return { ...e, chama: 0, ultimaData: null, restauravel, extras: voto.extras, avisos: voto.avisos };
}

/** A chama volta: a antiga + o que a pessoa já fez depois que apagou. Hoje continua valendo (não precisa refazer). */
export function restaurarChama(e: Estado, hoje: string): Estado {
  const r = e.restauravel;
  if (!r) return e;
  const chama = r.chama + e.chama;
  const ultimaData = e.ultimaData ?? somarDias(hoje, -1);
  return { ...e, chama, maior: Math.max(e.maior, chama), ultimaData, restauravel: null, avisos: [...e.avisos.filter((a) => a !== "chama_apagou"), "chama_restaurada"] };
}

/** Marca um passo do caminho por esforço; com os três feitos, restaura. */
export function marcarPassoVolta(e: Estado, passo: PassoVolta, hoje: string): Estado {
  if (!e.restauravel || e.restauravel.passos[passo]) return e;
  const passos = { ...e.restauravel.passos, [passo]: true };
  const s = { ...e, restauravel: { ...e.restauravel, passos } };
  return PASSOS_VOLTA.every((p) => passos[p]) ? restaurarChama(s, hoje) : s;
}

export type Acao =
  | { tipo: "check"; dia: number; check: Check }
  | { tipo: "jejum"; dia: number; valor: boolean }
  | { tipo: "estudo"; dia: number }
  | { tipo: "lembrete"; horario: string | null }
  | { tipo: "pratica"; acertos: number; ids: string[] }
  | { tipo: "limparResultadoLiga" }
  | { tipo: "limparAvisos" }
  | { tipo: "comprarBrasa" }
  | { tipo: "restaurar"; modo: "talentos" }
  | { tipo: "leituraVolta" }
  | { tipo: "comprarEscudo" }
  | { tipo: "fazerVoto" }
  | { tipo: "darBrasa"; para: string };

/** Contexto do servidor: instante atual (vigília) e limite de brasas do plano (vitalício = 3). */
export interface Contexto {
  agora?: number;
  maxBrasas?: number;
  /** Amigo que vai receber a brasa (o servidor confere que foi convidado por esta pessoa). Sem ele, darBrasa falha. */
  amigo?: AmigoChama | null;
}

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
export function aplicarAcao(entrada: Estado, acao: Acao, hoje: string, pago: boolean, diasMetas: readonly number[] = DIAS_METAS_PADRAO, ctx: Contexto = {}): Resultado {
  const r = aplicarAcaoBase(entrada, acao, hoje, pago, diasMetas, ctx);
  // GANCHO-EXTRAS: Hora da vigília multiplica o XP ganho nesta ação.
  const agora = ctx.agora ?? Date.now();
  const mult = r.erro || r.xpGanho <= 0 ? 1 : multiplicadorXp(r.estado.extras ?? {}, agora);
  let out = r;
  if (mult > 1) {
    const extra = Math.round(r.xpGanho * (mult - 1));
    out = { ...r, estado: somarXp(r.estado, extra, hoje), xpGanho: r.xpGanho + extra };
  }
  // Dia completo: liga a vigília (vale a partir daqui, não dobra o XP do próprio dia) e resolve o voto de 7 dias.
  if (!out.erro && out.completouDia != null) out = { ...out, estado: aoCompletarDia(out.estado, hoje, agora) };
  return out;
}

const ganharTalentos = (e: Estado, n: number): Estado => (n > 0 ? { ...e, talentos: (e.talentos ?? 0) + n } : e);

function aplicarAcaoBase(entrada: Estado, acao: Acao, hoje: string, pago: boolean, diasMetas: readonly number[], ctx: Contexto): Resultado {
  const maxBrasas = ctx.maxBrasas ?? MAX_BRASAS;
  const base = atualizarParaHoje(entrada, hoje);
  const nada = (erro?: string): Resultado => ({ estado: base, completouDia: null, novasMedalhas: [], ganhouBrasa: false, xpGanho: 0, erro });

  if (acao.tipo === "limparAvisos") return { ...nada(), estado: { ...base, avisos: [] } };
  if (acao.tipo === "limparResultadoLiga") return { ...nada(), estado: { ...base, liga: { ...base.liga, resultado: null } } };
  if (acao.tipo === "comprarBrasa") {
    if (base.brasas >= maxBrasas) return nada(`Você já tem ${maxBrasas} brasas guardadas (o máximo).`);
    if ((base.talentos ?? 0) < PRECO.brasa) return nada(`Faltam talentos: a brasa custa ${PRECO.brasa}.`);
    return { ...nada(), estado: { ...base, brasas: base.brasas + 1, talentos: base.talentos - PRECO.brasa } };
  }
  if (acao.tipo === "restaurar") {
    if (!base.restauravel) return nada("Não há chama para restaurar.");
    if ((base.talentos ?? 0) < PRECO.restaurar) return nada(`Faltam talentos: restaurar custa ${PRECO.restaurar}.`);
    return { ...nada(), estado: restaurarChama({ ...base, talentos: base.talentos - PRECO.restaurar }, hoje) };
  }
  if (acao.tipo === "comprarEscudo") { const x = comprarEscudo(base, hoje); return { ...nada(x.erro), estado: x.estado }; }
  if (acao.tipo === "fazerVoto") { const x = fazerVoto(base, hoje); return { ...nada(x.erro), estado: x.estado }; }
  if (acao.tipo === "darBrasa") { const x = darBrasa(base, String(acao.para ?? ""), hoje, ctx.amigo); return { ...nada(x.erro), estado: x.estado }; }
  if (acao.tipo === "leituraVolta") {
    if (!base.restauravel) return nada("Não há chama para restaurar.");
    return { ...nada(), estado: marcarPassoVolta(base, "leitura", hoje) };
  }
  if (acao.tipo === "pratica") {
    const n = acao.ids.length;
    if (n < 1 || n > 5 || !Number.isInteger(acao.acertos) || acao.acertos < 0 || acao.acertos > n) return nada("Prática inválida.");
    const xp = acao.acertos * XP.acertoPratica + (n === 5 && acao.acertos === 5 ? XP.praticaPerfeita : 0);
    const praticas = { ...base.praticas };
    for (const id of acao.ids) praticas[id] = (praticas[id] ?? 0) + 1;
    // Prática não completa o dia nem mexe na chama: só XP, talentos (se perfeita) e o contador de versículos vistos.
    let estado: Estado = { ...somarXp(base, xp, hoje), praticas };
    if (n === 5 && acao.acertos === 5) estado = ganharTalentos(estado, TALENTOS_GANHO.praticaPerfeita);
    // Prática completa (5 versículos) conta como passo da volta.
    if (n === 5) estado = marcarPassoVolta(estado, "pratica", hoje);
    return { ...nada(), estado, xpGanho: xp };
  }
  if (acao.tipo === "estudo") {
    // Estudo da meta: só de meta já alcançada, e o bônus de XP vale uma vez só.
    const meta = Number(acao.dia);
    if (!ehMeta(meta, diasMetas) || !metaAlcancada(base, meta)) return nada("Este estudo ainda não foi liberado.");
    if (base.medalhas.includes(idEstudo(meta))) return nada();
    const estado = ganharTalentos(somarXp({ ...base, medalhas: [...base.medalhas, idEstudo(meta)] }, XP.estudo, hoje), TALENTOS_GANHO.estudo);
    return { ...nada(), estado, xpGanho: XP.estudo };
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
  const ganhouBrasa = chama % DIAS_POR_BRASA === 0 && estado.brasas < maxBrasas;
  estado = {
    ...estado,
    chama,
    maior: Math.max(estado.maior, chama),
    ultimaData: hoje,
    concluidos,
    diasAtivos: Math.max((estado.diasAtivos ?? 0) + 1, Object.keys(concluidos).length),
    brasas: ganhouBrasa ? estado.brasas + 1 : estado.brasas,
  };
  const novas: Medalha[] = [];
  // Meta: bate no número exato da chama e nunca repete (quem já tem a medalha, inclusive a antiga "chamaN", não ganha de novo).
  if (ehMeta(chama, diasMetas) && !temMeta(estado.medalhas, chama)) novas.push(idMeta(chama));
  if (jornadaCompleta(estado) && !estado.medalhas.includes("jornada")) novas.push("jornada");
  estado = { ...estado, medalhas: [...estado.medalhas, ...novas] };
  estado = ganharTalentos(estado, TALENTOS_GANHO.dia + novas.filter((m) => m !== "jornada").length * TALENTOS_GANHO.meta);
  // Dia completo conta como passo da volta (se a chama apagou e ainda dá para restaurar).
  estado = marcarPassoVolta(estado, "dia", hoje);
  return { estado, completouDia: acao.dia, novasMedalhas: novas, ganhouBrasa, xpGanho };
}

/** Níveis visuais da chama: 0 apagada, 1 a 4 até 29 dias (como era), 5 a partir de 30, 6 de 50, 7 de 100 e 8 de 365 dias. */
export type NivelChama = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
export const DEGRAUS_CHAMA = [1, 3, 7, 14, 30, 50, 100, 365] as const;

/** Intensidade visual da chama (0 = brasa fraca ... 8 = chama de um ano), cresce com a sequência sem limite. */
export function nivelChama(chama: number): NivelChama {
  if (!(chama > 0)) return 0;
  let n = 0;
  for (const d of DEGRAUS_CHAMA) if (chama >= d) n += 1;
  return n as NivelChama;
}

export const NOME_JORNADA = { nome: "Jornada completa", texto: "Os 21 dias de consagração concluídos" };
