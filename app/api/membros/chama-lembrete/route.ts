import { jsonError, supabaseRest } from "@/lib/panel-server";
import { areaUrl, getArea } from "@/lib/membros";
import { pushParaUsuarios } from "@/lib/membros-avisos";
import { areaDoChama } from "@/lib/chama-acesa/acesso-regra";
import { rodarCobranca } from "@/lib/chama-acesa/cobranca";
import { carregarLigas, carregarTextos } from "@/lib/chama-acesa/conteudo-servidor";
import { quemRecebe, registrarEnvio, type PerfilLembrete } from "@/lib/chama-acesa/lembretes";
import { dataSP } from "@/lib/chama-acesa/regras";

export const maxDuration = 60;

// Lembretes do Chama Acesa. PRECISA SER CHAMADO DE HORA EM HORA (cron externo ou Vercel Pro: "0 * * * *").
// Ainda NÃO está em vercel.json de propósito. Mesmo segredo dos outros crons (CRON_SECRET).
// A cada hora: (1) lembrete da hora escolhida pela pessoa e o das 21h (São Paulo), só para quem ainda não completou o dia,
// com categoria e texto sorteados pela situação (lembretes-textos.json); (2) na hora CHAMA_COBRANCA_HORA (padrão 10), a
// cobrança do dia 4 (push + e-mail) para quem completou o dia 3 ontem e não comprou. ?dry=1 só conta e mostra a prévia; ?hora=07 força a hora.
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
    const dry = params.get("dry") === "1";
    const hora = params.get("hora") || new Intl.DateTimeFormat("en-GB", { timeZone: "America/Sao_Paulo", hour: "2-digit", hour12: false }).format(new Date()).slice(0, 2);
    if (!/^([01]\d|2[0-3])$/.test(hora)) return jsonError("Hora inválida.", 400);
    const hoje = dataSP();
    const area = await getArea(areaDoChama());
    const textos = carregarTextos();
    const perfis = await supabaseRest<PerfilLembrete[]>(
      `/chama_perfil?area_id=eq.${area.id}&horario_lembrete=not.is.null&select=user_id,nome,chama_atual,maior_chama,ultima_data,ultimo_acesso,horario_lembrete,dias_feitos,xp_semana,liga,lembretes_hist`,
    );
    const entregas = quemRecebe(perfis, hora, hoje, textos, carregarLigas());
    let enviados = 0;
    if (!dry) {
      for (const { perfil, mensagem } of entregas) {
        enviados += await pushParaUsuarios(area.id, [perfil.user_id], { title: mensagem.titulo, body: mensagem.corpo, url: `${areaUrl(area)}/?app=1`, tag: "chama-lembrete" });
        await supabaseRest(`/chama_perfil?user_id=eq.${perfil.user_id}`, {
          method: "PATCH",
          headers: { Prefer: "return=minimal" },
          body: JSON.stringify({ lembretes_hist: registrarEnvio(perfil.lembretes_hist ?? {}, mensagem.chave, hoje) }),
        });
      }
    }
    const horaCobranca = String(process.env.CHAMA_COBRANCA_HORA || "10").padStart(2, "0");
    const cobranca = hora === horaCobranca || params.get("cobranca") === "1" ? await rodarCobranca(area, hoje, textos, dry) : null;
    return Response.json({ dry, hora, alvos: entregas.length, enviados, cobranca, ...(dry ? { previa: entregas.slice(0, 20).map((e) => ({ categoria: e.mensagem.categoria, titulo: e.mensagem.titulo, corpo: e.mensagem.corpo })) } : {}) });
  } catch (error) {
    console.error("chama-lembrete", error);
    return jsonError(error instanceof Error ? error.message : "Erro no lembrete.", 500);
  }
}
