import { jsonError } from "@/lib/panel-server";
import { runAccessReminders } from "@/lib/membros-lembrete";

export const maxDuration = 120;

// Vercel Cron manda "Authorization: Bearer <CRON_SECRET>". Chamada manual: mesmo cabeçalho (ou ?secret=).
function authorized(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const bearer = (request.headers.get("authorization") || "").match(/^Bearer\s+(.+)$/i)?.[1];
  return bearer === secret || new URL(request.url).searchParams.get("secret") === secret;
}

// Reenvia o acesso a quem comprou há 20 h a 7 dias e nunca entrou (máx. 2 lembretes, 48 h entre eles). ?dry=1 só lista.
export async function GET(request: Request) {
  if (!authorized(request)) return jsonError("Não autorizado.", 401);
  try {
    const params = new URL(request.url).searchParams;
    const limit = Math.max(1, Math.min(Number(params.get("limit")) || 40, 100));
    return Response.json(await runAccessReminders({ dry: params.get("dry") === "1", limit }));
  } catch (error) {
    console.error("lembrete-acesso", error);
    return jsonError(error instanceof Error ? error.message : "Erro no lembrete de acesso.", 500);
  }
}
