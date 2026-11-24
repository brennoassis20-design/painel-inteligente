// Regra pura dos lembretes diários: quem recebe, e que texto. A rota /api/membros/chama-lembrete só executa isto.
export interface PerfilLembrete {
  user_id: string;
  chama_atual: number;
  ultima_data: string | null;
  horario_lembrete: string | null;
}
export type Tipo = "manha" | "noite";
export const HORA_NOITE = 21;

export function textoLembrete(tipo: Tipo, chama: number): { title: string; body: string } {
  const dias = `${chama} ${chama === 1 ? "dia" : "dias"}`;
  if (tipo === "noite") {
    return chama > 0
      ? { title: `🔥 Sua chama de ${dias} apaga à meia-noite`, body: "Faltam 5 minutos." }
      : { title: "🔥 Ainda dá tempo de acender a sua chama hoje", body: "Faltam 5 minutos." };
  }
  return { title: chama > 0 ? `🔥 Sua chama de ${dias} está te esperando` : "🔥 Acenda a sua chama hoje", body: "São só 5 minutos com Deus. Não deixe apagar." };
}

/**
 * Quem recebe agora (hora = "HH" em São Paulo, hoje = AAAA-MM-DD). Só quem ligou o lembrete (tem horário) e ainda não completou hoje.
 * Manhã: a hora escolhida. Noite: 21h. Quem escolheu 21h recebe só o da noite (nunca dois iguais na mesma hora).
 */
export function quemRecebe(perfis: PerfilLembrete[], hora: string, hoje: string): { tipo: Tipo; perfil: PerfilLembrete }[] {
  const out: { tipo: Tipo; perfil: PerfilLembrete }[] = [];
  for (const p of perfis) {
    if (!p.horario_lembrete || p.ultima_data === hoje) continue;
    if (hora === String(HORA_NOITE)) out.push({ tipo: "noite", perfil: p });
    else if (p.horario_lembrete.slice(0, 2) === hora) out.push({ tipo: "manha", perfil: p });
  }
  return out;
}
