import { PRECO } from "./talentos.ts";
import type { Aviso, Estado } from "./regras.ts";

// Extras do Chama Acesa (itens 4 a 7 do plano 2026-11-27): Dia do Senhor, Hora da vigília, Voto de 7 dias, Brasa de irmão.
// Funções puras. regras.ts chama os GANCHOS abaixo; o resto da lógica fica aqui.
// Gravado em chama_perfil.extras (jsonb) junto com talentos e restauravel.

/** Estado dos extras. Todos opcionais: perfis antigos chegam com {}. */
export interface Extras {
  /** Domingo (AAAA-MM-DD) coberto pelo escudo do Dia do Senhor. */
  escudoDomingo?: string | null;
  /** Instante (ms) até quando o XP vale em dobro (Hora da vigília). */
  vigiliaAte?: number | null;
  /** Data da última vigília (1 por dia). */
  vigiliaDia?: string | null;
  /** Voto de 7 dias em andamento. */
  voto?: { inicio: string; chamaInicio: number; aposta: number } | null;
  /** semana (segunda) -> já deu brasa a um irmão nesta semana. */
  presentes?: Record<string, boolean>;
  /** Desafio da Palavra: id do versículo -> quantas vezes a pessoa acertou (3+ = guardado no coração). */
  versos?: Record<string, number>;
  /** Maná do dia: último dia recolhido e quantos dias seguidos. */
  mana?: { dia: string | null; seq: number };
}

export const VIGILIA_MS = 15 * 60 * 1000;
export const DIAS_DO_VOTO = 7;
/** Máximo de brasas que um amigo guarda (não sabemos o plano dele). */
export const MAX_BRASAS_AMIGO = 2;

/** Amigo (quem a pessoa convidou) como a tela vê. */
export interface AmigoChama { codigo: string; nome: string; chama: number; brasas: number }

// Datas locais (evita import circular com regras.ts).
const utc = (d: string) => { const [a, m, x] = d.split("-").map(Number); return Date.UTC(a, m - 1, x); };
const somar = (d: string, n: number) => new Date(utc(d) + n * 86_400_000).toISOString().slice(0, 10);
const semanaDe = (d: string) => somar(d, -((new Date(utc(d)).getUTCDay() + 6) % 7));

type Res = { estado: Estado; erro?: string };
const ex = (e: Estado): Extras => e.extras ?? {};
const erro = (estado: Estado, msg: string): Res => ({ estado, erro: msg });

// ------------------------------------------------------------------ 4. Dia do Senhor

/** Domingo que o escudo protegeria: hoje (se é domingo e o dia ainda não foi feito) ou o próximo. */
export function domingoDoEscudo(e: Estado, hoje: string): string {
  const dow = new Date(utc(hoje)).getUTCDay();
  if (dow === 0 && e.ultimaData !== hoje) return hoje;
  return somar(hoje, (7 - dow) % 7 || 7);
}

export function escudoAtivo(e: Estado, hoje: string): boolean {
  const d = ex(e).escudoDomingo;
  if (!d || d < hoje) return false;
  return !(d === hoje && e.ultimaData === hoje);
}

export function comprarEscudo(e: Estado, hoje: string): Res {
  if (escudoAtivo(e, hoje)) return erro(e, "Você já tem um escudo guardado para o domingo.");
  if ((e.talentos ?? 0) < PRECO.escudoDomingo) return erro(e, `Faltam talentos: o escudo custa ${PRECO.escudoDomingo}.`);
  return { estado: { ...e, talentos: e.talentos - PRECO.escudoDomingo, extras: { ...ex(e), escudoDomingo: domingoDoEscudo(e, hoje) } } };
}

/** Limpa o escudo que já passou (usado ou não). Devolve o mesmo objeto se nada mudou. */
export function semEscudoPassado(extras: Extras, hoje: string): Extras {
  return extras.escudoDomingo && extras.escudoDomingo < hoje ? { ...extras, escudoDomingo: null } : extras;
}

/**
 * GANCHO-EXTRAS (atualizarParaHoje): recebe os dias de calendário pulados e devolve quais ficam cobertos
 * por extras (domingo com escudo) ANTES de gastar brasa.
 */
export function diasCobertosPorExtras(extras: Extras, pulados: string[]): string[] {
  const d = extras.escudoDomingo;
  return d && pulados.includes(d) ? [d] : [];
}

// ------------------------------------------------------------------ 5. Hora da vigília

/** GANCHO-EXTRAS (somarXp): XP em dobro enquanto a vigília durar. */
export function multiplicadorXp(extras: Extras, agora: number): number {
  return extras.vigiliaAte != null && agora < extras.vigiliaAte ? 2 : 1;
}

/** Segundos que faltam da vigília (0 = não há). */
export function segundosDeVigilia(extras: Extras, agora: number): number {
  return extras.vigiliaAte != null && agora < extras.vigiliaAte ? Math.ceil((extras.vigiliaAte - agora) / 1000) : 0;
}

// ------------------------------------------------------------------ 6. Voto de 7 dias

export function fazerVoto(e: Estado, hoje: string): Res {
  if (ex(e).voto) return erro(e, "Você já tem um voto em andamento.");
  if ((e.talentos ?? 0) < PRECO.voto) return erro(e, `Faltam talentos: o voto custa ${PRECO.voto}.`);
  return { estado: { ...e, talentos: e.talentos - PRECO.voto, extras: { ...ex(e), voto: { inicio: hoje, chamaInicio: e.chama, aposta: PRECO.voto } } } };
}

/** Chama apagou com voto ativo: a aposta se perde. */
export function quebrarVoto(extras: Extras, avisos: Aviso[]): { extras: Extras; avisos: Aviso[] } {
  return extras.voto ? { extras: { ...extras, voto: null }, avisos: [...avisos, "voto_quebrado"] } : { extras, avisos };
}

// ------------------------------------------------------------------ ao completar o dia (vigília e voto)

export function aoCompletarDia(e: Estado, hoje: string, agora: number): Estado {
  let extras = ex(e);
  let estado = e;
  if (extras.vigiliaDia !== hoje) extras = { ...extras, vigiliaDia: hoje, vigiliaAte: agora + VIGILIA_MS };
  const v = extras.voto;
  if (v && e.chama >= v.chamaInicio + DIAS_DO_VOTO) {
    extras = { ...extras, voto: null };
    estado = { ...estado, talentos: (estado.talentos ?? 0) + v.aposta * 2, avisos: [...estado.avisos, "voto_cumprido"] };
  }
  return { ...estado, extras };
}

// ------------------------------------------------------------------ 7. Brasa de irmão

export function podeDarBrasa(e: Estado, hoje: string): string | null {
  if (ex(e).presentes?.[semanaDe(hoje)]) return "Você já deu uma brasa esta semana. Na segunda pode dar outra.";
  if (e.brasas < 1) return "Você precisa ter uma brasa guardada para dar.";
  return null;
}

/** Lado de quem dá: gasta 1 brasa e marca a semana. `amigo` vem do servidor (null = não é amigo). */
export function darBrasa(e: Estado, para: string, hoje: string, amigo: AmigoChama | null | undefined): Res {
  if (!amigo || amigo.codigo !== para) return erro(e, "Amigo não encontrado. Só dá para presentear quem você convidou.");
  const m = podeDarBrasa(e, hoje);
  if (m) return erro(e, m);
  if (amigo.brasas >= MAX_BRASAS_AMIGO) return erro(e, "Seu amigo já está com as brasas cheias.");
  const sem = semanaDe(hoje);
  return { estado: { ...e, brasas: e.brasas - 1, extras: { ...ex(e), presentes: { [sem]: true } } } };
}
