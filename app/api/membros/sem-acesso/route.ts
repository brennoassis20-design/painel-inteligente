import { jsonError, supabaseRest } from "@/lib/panel-server";
import { logEvent } from "@/lib/membros";
import { authAccountsByEmail } from "@/lib/membros-lembrete";
import { ACCESS_EMAIL_KIND, REMINDER_KIND } from "@/lib/membros-lembrete-regra";

export const maxDuration = 60;
const enc = encodeURIComponent;

// Só leitura, para o agente Carteiro (Jarvis, VPS). Segredo próprio: variável CARTEIRO_SECRET na Vercel.
// Aceita o cabeçalho "x-carteiro-secret" ou ?secret=. Sem a variável configurada, a rota fica fechada.
function authorized(request: Request) {
  const secret = process.env.CARTEIRO_SECRET?.trim();
  if (!secret) return false;
  const given = request.headers.get("x-carteiro-secret") || new URL(request.url).searchParams.get("secret");
  return given === secret;
}

type Row = {
  email: string; status: string; provider?: string | null; order_id?: string | null; created_at: string;
  mp_products: { title: string; area_id: number };
};
type Ev = { email: string; area_id: number | null; created_at: string; meta?: { via?: string } | null };
type Area = { id: number; slug: string | null; brand_name: string | null; owner_email?: string | null };

// POST {email, area_id, n}: o Carteiro avisa que mandou um lembrete. Vira evento lembrete_acesso (via=carteiro): o cron do app
// também passa a contá-lo e não manda lembrete a mais (máximo 2 no total).
export async function POST(request: Request) {
  if (!authorized(request)) return jsonError("Não autorizado.", 401);
  const body = (await request.json().catch(() => ({}))) as { email?: string; area_id?: number; n?: number };
  const email = String(body.email || "").trim().toLowerCase();
  if (!email || !Number(body.area_id)) return jsonError("Informe email e area_id.", 400);
  await logEvent(Number(body.area_id), email, null, REMINDER_KIND, { via: "carteiro", n: Number(body.n) || 1 });
  return Response.json({ ok: true });
}

// GET /api/membros/sem-acesso?dias=7            -> quem pagou (status active) e nunca entrou
// GET /api/membros/sem-acesso?email=x@y.com     -> situação de uma pessoa (qualquer status), para conferir resposta
// GET /api/membros/sem-acesso?resumo=1&dias=1   -> contagem por área: pagaram x entraram
export async function GET(request: Request) {
  if (!authorized(request)) return jsonError("Não autorizado.", 401);
  try {
    const params = new URL(request.url).searchParams;
    const email = (params.get("email") || "").trim().toLowerCase();
    const dias = Math.max(1, Math.min(Number(params.get("dias")) || 7, 30));
    const desde = new Date(Date.now() - dias * 86400000).toISOString();
    const filtro = email ? `email=eq.${enc(email)}` : `created_at=gte.${enc(desde)}`;
    const [rows, areas, accounts, acessoMail, lembretes, admins] = await Promise.all([
      supabaseRest<Row[]>(`/mp_access?${filtro}&select=email,status,provider,order_id,created_at,mp_products!inner(title,area_id)&order=created_at.asc&limit=2000`),
      supabaseRest<Area[]>(`/mp_settings?select=id,slug,brand_name,owner_email`),
      authAccountsByEmail(),
      supabaseRest<Ev[]>(`/mp_events?kind=eq.${ACCESS_EMAIL_KIND}&${email ? `email=eq.${enc(email)}` : `created_at=gte.${enc(desde)}`}&select=email,area_id,created_at&limit=5000`),
      supabaseRest<Ev[]>(`/mp_events?kind=eq.${REMINDER_KIND}&${email ? `email=eq.${enc(email)}` : `created_at=gte.${enc(desde)}`}&select=email,area_id,created_at,meta&limit=5000`),
      supabaseRest<{ email: string; area_id: number }[]>(`/mp_admins?select=email,area_id&limit=500`).catch(() => []),
    ]);
    // equipe/dono/admin da área: nunca recebe lembrete
    const internos = new Set<string>([...admins.map((a) => a.email.toLowerCase()), ...areas.map((a) => (a.owner_email || "").toLowerCase()).filter(Boolean)]);
    const slugs = new Map(areas.map((a) => [a.id, a]));
    const por = new Map<string, any>();
    for (const r of rows) {
      const e = r.email.trim().toLowerCase();
      const area = slugs.get(r.mp_products.area_id);
      const key = `${e}|${r.mp_products.area_id}|${r.order_id || ""}`;
      const conta = accounts.get(e) as any;
      const item = por.get(key) || {
        email: e, nome: conta?.user_metadata?.name || conta?.user_metadata?.full_name || null,
        area_id: r.mp_products.area_id, area_slug: area?.slug || null, area_nome: area?.brand_name || null,
        provider: r.provider || "", order_id: r.order_id || "", comprou_em: r.created_at, produtos: [] as string[], status: [] as string[],
        entrou: Boolean(conta?.last_sign_in_at), confirmou: Boolean(conta?.email_confirmed_at), tem_conta: Boolean(conta),
        interno: internos.has(e),
        convidado_em: conta?.invited_at || null,
        emails_acesso: acessoMail.filter((x) => x.email.toLowerCase() === e).length,
        // lembretes_app = os do cron do app (o Carteiro conta os dele à parte); lembretes_total = todos
        lembretes_app: lembretes.filter((x) => x.email.toLowerCase() === e && x.area_id === r.mp_products.area_id && x.meta?.via !== "carteiro").length,
        lembretes_total: lembretes.filter((x) => x.email.toLowerCase() === e && x.area_id === r.mp_products.area_id).length,
        ultimo_lembrete_app: lembretes.filter((x) => x.email.toLowerCase() === e).map((x) => x.created_at).sort().pop() || null,
      };
      if (!item.produtos.includes(r.mp_products.title)) item.produtos.push(r.mp_products.title);
      if (!item.status.includes(r.status)) item.status.push(r.status);
      por.set(key, item);
    }
    const todos = [...por.values()];
    if (email) return Response.json({ ok: true, email, compras: todos });
    if (params.get("resumo") === "1") {
      const out: Record<string, { pagaram: number; entraram: number }> = {};
      for (const i of todos.filter((x) => x.status.includes("active"))) {
        const k = i.area_slug || String(i.area_id);
        out[k] = out[k] || { pagaram: 0, entraram: 0 };
        out[k].pagaram += 1;
        if (i.entrou || i.confirmou) out[k].entraram += 1;
      }
      return Response.json({ ok: true, dias, areas: out });
    }
    const lista = todos.filter((x) => x.status.length === 1 && x.status[0] === "active" && !x.entrou && !x.confirmou);
    return Response.json({ ok: true, dias, total: lista.length, compras: lista });
  } catch (error) {
    console.error("sem-acesso", error);
    return jsonError(error instanceof Error ? error.message : "Erro.", 500);
  }
}
