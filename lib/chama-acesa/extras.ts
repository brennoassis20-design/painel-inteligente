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
}

/**
 * GANCHO-EXTRAS (atualizarParaHoje): recebe os dias de calendário pulados e devolve quais ficam cobertos
 * por extras (ex.: domingo com escudo) ANTES de gastar brasa. Implementação inicial: nenhum.
 */
export function diasCobertosPorExtras(_extras: Extras, _pulados: string[]): string[] {
  return [];
}

/** GANCHO-EXTRAS (somarXp): multiplicador de XP no instante `agora` (Hora da vigília). Implementação inicial: 1. */
export function multiplicadorXp(_extras: Extras, _agora: number): number {
  return 1;
}
