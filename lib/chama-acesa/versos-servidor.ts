// Lado do servidor do aviso de domingo "Palavra no coração": lê a Bíblia e os dias da jornada em lote e grava o total da semana.
import { supabaseRest } from "@/lib/panel-server";
import { registrarEnvio } from "./lembretes";
import { registroVersos } from "./versos-domingo";

const em = (ids: string[]) => ids.filter((id) => /^[0-9a-f-]{36}$/i.test(id));
const pedacos = <T,>(l: T[], n: number) => Array.from({ length: Math.ceil(l.length / n) }, (_, i) => l.slice(i * n, i * n + n));

/** Capítulos lidos de várias pessoas (10 por consulta: no máximo 66 livros cada, abaixo do limite de 1000 linhas). */
export async function lidosEmLote(ids: string[]): Promise<Map<string, Record<string, number[]>>> {
  const mapa = new Map<string, Record<string, number[]>>();
  for (const grupo of pedacos(em(ids), 10)) {
    const linhas = await supabaseRest<{ user_id: string; sigla: string; caps: number[] }[]>(`/chama_biblia_lidos?user_id=in.(${grupo.join(",")})&select=user_id,sigla,caps&limit=1000`).catch(() => []);
    for (const l of linhas) mapa.set(l.user_id, { ...(mapa.get(l.user_id) ?? {}), [l.sigla]: l.caps });
  }
  return mapa;
}

/** Dias concluídos da jornada (1 a 21) de várias pessoas (40 por consulta: no máximo 21 linhas cada). */
export async function diasJornadaEmLote(ids: string[]): Promise<Map<string, number[]>> {
  const mapa = new Map<string, number[]>();
  for (const grupo of pedacos(em(ids), 40)) {
    const linhas = await supabaseRest<{ user_id: string; dia: number }[]>(`/chama_dias?user_id=in.(${grupo.join(",")})&dia=lte.21&concluido_em=not.is.null&select=user_id,dia&limit=1000`);
    for (const l of linhas) mapa.set(l.user_id, [...(mapa.get(l.user_id) ?? []), l.dia]);
  }
  return mapa;
}

/**
 * Grava versosSemana mesclado ao extras que está no banco AGORA (lido segundos antes, não o da carga do início do cron),
 * mais a marca no histórico. Risco de corrida: se o app gravar o perfil entre a leitura e o PATCH (janela de milissegundos),
 * a gravação do app vence e o total da semana se perde: no domingo seguinte o texto sai só com o total. Nada mais é afetado.
 */
export async function gravarVersosSemana(userId: string, hoje: string, total: number, chave: string, hist: Record<string, string>) {
  const atual = await supabaseRest<{ extras: Record<string, unknown> | null; lembretes_hist: Record<string, string> | null }[]>(`/chama_perfil?user_id=eq.${userId}&select=extras,lembretes_hist`);
  const extras = { ...(atual[0]?.extras ?? {}), versosSemana: registroVersos(hoje, total) };
  await supabaseRest(`/chama_perfil?user_id=eq.${userId}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ extras, lembretes_hist: registrarEnvio(atual[0]?.lembretes_hist ?? hist, chave, hoje) }),
  });
}
