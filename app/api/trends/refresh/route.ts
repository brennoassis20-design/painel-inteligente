import { jsonError, refreshTrendOpportunities } from "@/lib/panel-server";

function isAuthorized(request: Request) {
  const secret = process.env.TREND_REFRESH_SECRET?.trim() || process.env.CRON_SECRET?.trim();

  if (!secret) {
    return false;
  }

  const authorization = request.headers.get("authorization") || "";
  const bearer = authorization.match(/^Bearer\s+(.+)$/i)?.[1];
  const querySecret = new URL(request.url).searchParams.get("secret");

  return bearer === secret || querySecret === secret;
}

async function handleRefresh(request: Request) {
  if (!isAuthorized(request)) {
    return jsonError("Atualizacao nao autorizada.", 401);
  }

  try {
    const force = new URL(request.url).searchParams.get("force") === "1";
    const result = await refreshTrendOpportunities(force);
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
