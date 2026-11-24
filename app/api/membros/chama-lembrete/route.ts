import { jsonError, supabaseRest } from "@/lib/panel-server";
import { areaUrl, getArea } from "@/lib/membros";
import { pushParaUsuarios } from "@/lib/membros-avisos";
import { areaDoChama } from "@/lib/chama-acesa/acesso-regra";
import { dataSP } from "@/lib/chama-acesa/regras";
import { quemRecebe, textoLembrete, type PerfilLembrete, type Tipo } from "@/lib/chama-acesa/lembretes";

export const maxDuration = 60;

// Lembrete diário do Chama Acesa ("Sua chama de N dias está te esperando"). PRECISA SER CHAMADO DE HORA EM HORA
// (cron externo ou Vercel Pro: "0 * * * *"). Ainda NÃO está em vercel.json de propósito. Mesmo segredo dos outros crons (CRON_SECRET).
// Manda o lembrete da hora escolhida e o das 21h (São Paulo) só para quem ainda não completou o dia hoje. ?dry=1 só conta; ?hora=07 força a hora.
function authorized(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const bearer = (request.headers.get("authorization") || "").match(/^Bearer\s+(.+)$/i)?.[1];
  return bearer === secret || new URL(request.url).searchParams.get("secret") === secret;
}

export async function GET(request: Request) {
  if (!authorized(request)) return jsonError("Não autorizado.", 401);
  try {
    const params = new URL(request.url).searchParams;
    const hora = params.get("hora") || new Intl.DateTimeFormat("en-GB", { timeZone: "America/Sao_Paulo", hour: "2-digit", hour12: false }).format(new Date()).slice(0, 2);
    if (!/^([01]\d|2[0-3])$/.test(hora)) return jsonError("Hora inválida.", 400);
    const hoje = dataSP();
    const area = await getArea(areaDoChama());
    // Todos com lembrete ligado; a regra pura (lib/chama-acesa/lembretes.ts) decide quem recebe o da manhã e o das 21h.
    const perfis = await supabaseRest<PerfilLembrete[]>(`/chama_perfil?area_id=eq.${area.id}&horario_lembrete=not.is.null&select=user_id,chama_atual,ultima_data,horario_lembrete`);
    const alvos = quemRecebe(perfis, hora, hoje);
    if (params.get("dry") === "1") return Response.json({ dry: true, hora, total: alvos.length });
    let enviados = 0;
    // O texto depende do tipo e do tamanho da chama: agrupa.
    const grupos = new Map<string, { tipo: Tipo; chama: number; ids: string[] }>();
    for (const { tipo, perfil } of alvos) {
      const k = `${tipo}:${perfil.chama_atual}`;
      const g = grupos.get(k) ?? { tipo, chama: perfil.chama_atual, ids: [] };
      g.ids.push(perfil.user_id);
      grupos.set(k, g);
    }
    for (const g of grupos.values()) {
      enviados += await pushParaUsuarios(area.id, g.ids, { ...textoLembrete(g.tipo, g.chama), url: `${areaUrl(area)}/?app=1`, tag: "chama-lembrete" });
    }
    return Response.json({ dry: false, hora, alvos: alvos.length, enviados });
  } catch (error) {
    console.error("chama-lembrete", error);
    return jsonError(error instanceof Error ? error.message : "Erro no lembrete.", 500);
  }
}
