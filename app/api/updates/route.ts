import { addPanelUpdate, changePanelUpdate, jsonError, listPanelUpdates, panelUpdateKinds, type PanelUpdateKind } from "@/lib/panel-server";

// Novidades do painel. Leitura vai junto do /api/auth/me; aqui só quem tem o segredo publica
// (Claude/Jarvis pelo novidade.sh). Mesmo segredo da coleta de nichos.
function isAuthorized(request: Request) {
  const secrets = [process.env.UPDATES_SECRET?.trim(), process.env.TREND_REFRESH_SECRET?.trim()].filter(Boolean);
  const bearer = (request.headers.get("authorization") || "").match(/^Bearer\s+(.+)$/i)?.[1];
  return Boolean(bearer) && secrets.includes(bearer);
}

const text = (value: unknown, max: number) => (typeof value === "string" ? value.trim().slice(0, max) : "");
const kindOf = (value: unknown) => (panelUpdateKinds.includes(value as PanelUpdateKind) ? (value as PanelUpdateKind) : undefined);

export async function GET(request: Request) {
  if (!isAuthorized(request)) return jsonError("Nao autorizado.", 401);
  return Response.json({ updates: await listPanelUpdates() });
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) return jsonError("Nao autorizado.", 401);
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const kind = kindOf(body.kind) || "melhoria";
  const title = text(body.title, 120);
  if (!title) return jsonError("Informe o titulo da novidade.", 400);
  try {
    return Response.json({ update: await addPanelUpdate({ kind, title, body: text(body.body, 600), view: text(body.view, 40) || null }) });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Erro ao publicar a novidade.", 500);
  }
}

// Ex.: item "em construção" que ficou pronto → { id, kind: "melhoria", bump: true }; tirar do ar → { id, is_active: false }.
export async function PATCH(request: Request) {
  if (!isAuthorized(request)) return jsonError("Nao autorizado.", 401);
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const id = text(body.id, 60);
  if (!id) return jsonError("Informe o id.", 400);
  const changes: Parameters<typeof changePanelUpdate>[1] = {};
  if (kindOf(body.kind)) changes.kind = kindOf(body.kind);
  if (text(body.title, 120)) changes.title = text(body.title, 120);
  if (typeof body.body === "string") changes.body = text(body.body, 600);
  if (typeof body.view === "string") changes.view = text(body.view, 40) || null;
  if (typeof body.is_active === "boolean") changes.is_active = body.is_active;
  if (body.bump === true) changes.bump = true;
  try {
    return Response.json({ update: await changePanelUpdate(id, changes) });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Erro ao alterar a novidade.", 500);
  }
}
