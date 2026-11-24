import { jsonError, supabaseRest } from "@/lib/panel-server";
import { areaUrl, getArea } from "@/lib/membros";
import { pushParaUsuarios } from "@/lib/membros-avisos";
import { areaDoChama } from "@/lib/chama-acesa/acesso-regra";
import { dataSP } from "@/lib/chama-acesa/regras";

export const maxDuration = 60;

// Lembrete diário do Chama Acesa ("Sua chama de N dias está te esperando"). PRECISA SER CHAMADO DE HORA EM HORA
// (cron externo ou Vercel Pro: "0 * * * *"). Ainda NÃO está em vercel.json de propósito. Mesmo segredo dos outros crons (CRON_SECRET).
// Manda para quem escolheu a hora atual (fuso de São Paulo) e ainda não completou o dia hoje. ?dry=1 só conta; ?hora=07 força a hora.
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
    const perfis = await supabaseRest<{ user_id: string; chama_atual: number; ultima_data: string | null }[]>(
      `/chama_perfil?area_id=eq.${area.id}&horario_lembrete=like.${hora}:*&select=user_id,chama_atual,ultima_data`,
    );
    // Quem já completou o dia hoje não é incomodado.
    const alvos = perfis.filter((p) => p.ultima_data !== hoje);
    if (params.get("dry") === "1") return Response.json({ dry: true, hora, total: alvos.length });
    let enviados = 0;
    // O texto depende do tamanho da chama: agrupa por N.
    const porChama = new Map<number, string[]>();
    for (const p of alvos) porChama.set(p.chama_atual, [...(porChama.get(p.chama_atual) || []), p.user_id]);
    for (const [n, ids] of porChama) {
      enviados += await pushParaUsuarios(area.id, ids, {
        title: n > 0 ? `🔥 Sua chama de ${n} ${n === 1 ? "dia" : "dias"} está te esperando` : "🔥 Acenda a sua chama hoje",
        body: "São só 5 minutos com Deus. Não deixe apagar.",
        url: `${areaUrl(area)}/?app=1`,
        tag: "chama-lembrete",
      });
    }
    return Response.json({ dry: false, hora, alvos: alvos.length, enviados });
  } catch (error) {
    console.error("chama-lembrete", error);
    return jsonError(error instanceof Error ? error.message : "Erro no lembrete.", 500);
  }
}
