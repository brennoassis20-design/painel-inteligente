import { marketOf } from "@/lib/locale";
import { jsonError, refreshTrendOpportunities } from "@/lib/panel-server";

// Coleta na Biblioteca de Anúncios + IA leva cerca de 1 a 3 minutos.
export const maxDuration = 300;

// A Vercel Cron envia CRON_SECRET; chamadas manuais podem usar TREND_REFRESH_SECRET.
function isAuthorized(request: Request) {
  const secrets = [process.env.TREND_REFRESH_SECRET?.trim(), process.env.CRON_SECRET?.trim()].filter(Boolean);

  if (!secrets.length) {
    return false;
  }

  const authorization = request.headers.get("authorization") || "";
  const bearer = authorization.match(/^Bearer\s+(.+)$/i)?.[1];
  const querySecret = new URL(request.url).searchParams.get("secret");

  return secrets.some((secret) => bearer === secret || querySecret === secret);
}

async function handleRefresh(request: Request) {
  if (!isAuthorized(request)) {
    return jsonError("Atualizacao nao autorizada.", 401);
  }

  try {
    const params = new URL(request.url).searchParams;
    const force = params.get("force") === "1";
    const result = await refreshTrendOpportunities(force, marketOf(params.get("market")));
    return Response.json(result);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Erro ao atualizar oportunidades.", 500);
  }
}

export async function GET(request: Request) {
  return handleRefresh(request);
}

export async function POST(request: Request) {
  return handleRefresh(request);
}
