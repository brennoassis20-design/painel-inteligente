import { AccessError, assertActiveProfile, getMonthKey, getUserFromRequest, jsonError, supabaseRest, syncProfileAccess } from "@/lib/panel-server";

// Sugestões de melhoria: o aluno manda até 5 por mês. Com o segredo (sugestoes.sh), Claude lista e avalia.
const LIMIT = 5;
const STATUS = ["recebida", "aprovada", "feita", "avaliada"];
type Suggestion = { id: string; text: string; status: string; note: string; created_at: string; email?: string };

function isAdmin(request: Request) {
  const secrets = [process.env.UPDATES_SECRET?.trim(), process.env.TREND_REFRESH_SECRET?.trim()].filter(Boolean);
  const bearer = (request.headers.get("authorization") || "").match(/^Bearer\s+(.+)$/i)?.[1];
  return Boolean(bearer) && secrets.includes(bearer);
}

async function student(request: Request) {
  const user = await getUserFromRequest(request);
  assertActiveProfile(await syncProfileAccess(user));
  return user;
}

function failure(error: unknown) {
  if (error instanceof AccessError) return jsonError("Acesso indisponível.", 403);
  return jsonError("Entre de novo no painel.", 401);
}

export async function GET(request: Request) {
  if (isAdmin(request)) {
    const status = new URL(request.url).searchParams.get("status") || "recebida";
    const filter = status === "todas" ? "" : `status=eq.${encodeURIComponent(status)}&`;
    return Response.json({ suggestions: await supabaseRest<Suggestion[]>(`/panel_suggestions?${filter}select=id,email,text,status,note,created_at&order=created_at.asc&limit=200`) });
  }
  try {
    const user = await student(request);
    const month = getMonthKey();
    const mine = await supabaseRest<(Suggestion & { month_key: string })[]>(
      `/panel_suggestions?user_id=eq.${encodeURIComponent(user.id)}&select=id,text,status,note,created_at,month_key&order=created_at.desc&limit=30`,
    );
    return Response.json({ suggestions: mine, remaining: Math.max(0, LIMIT - mine.filter((item) => item.month_key === month).length), limit: LIMIT });
  } catch (error) {
    return failure(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await student(request);
    const { text } = (await request.json().catch(() => ({}))) as { text?: unknown };
    const clean = typeof text === "string" ? text.replace(/\s+/g, " ").trim().slice(0, 800) : "";
    if (clean.length < 15) return jsonError("Conte um pouco mais da sua ideia (pelo menos 15 letras).", 400);
    const month = getMonthKey();
    const used = await supabaseRest<{ id: string }[]>(`/panel_suggestions?user_id=eq.${encodeURIComponent(user.id)}&month_key=eq.${month}&select=id`);
    if (used.length >= LIMIT) return jsonError(`Você já mandou ${LIMIT} sugestões este mês. No mês que vem libera de novo.`, 429);
    const [row] = await supabaseRest<Suggestion[]>("/panel_suggestions", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ user_id: user.id, email: user.email, text: clean, month_key: month }),
    });
    return Response.json({ suggestion: { id: row.id, text: row.text, status: row.status, note: row.note, created_at: row.created_at }, remaining: LIMIT - used.length - 1 });
  } catch (error) {
    if (error instanceof Error && /panel_suggestions/.test(error.message)) return jsonError("Sugestões indisponíveis agora. Tente mais tarde.", 503);
    return failure(error);
  }
}

// Claude marca a avaliação: { id, status: aprovada|feita|avaliada, note }.
export async function PATCH(request: Request) {
  if (!isAdmin(request)) return jsonError("Nao autorizado.", 401);
  const { id, status, note } = (await request.json().catch(() => ({}))) as { id?: unknown; status?: unknown; note?: unknown };
  if (typeof id !== "string" || !STATUS.includes(String(status))) return jsonError("Informe id e status.", 400);
  const [row] = await supabaseRest<Suggestion[]>(`/panel_suggestions?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ status, ...(typeof note === "string" ? { note: note.slice(0, 400) } : {}) }),
  });
  return Response.json({ suggestion: row });
}
