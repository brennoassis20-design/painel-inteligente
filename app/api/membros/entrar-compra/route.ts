import { type Area, areaUrl, isMainArea } from "@/lib/membros";
import { areaFrom } from "@/lib/membros-http";
import { findAuthAccount, jsonError, supabaseAdminAuthRequest, supabaseRest } from "@/lib/panel-server";

// Volta do checkout da Eduzz (?transactionkey=...): entra sozinho na área, sem pedir e-mail e senha.
// Só vale na janela entre o webhook chegar e o e-mail de acesso sair (~8 s, ORDER_SETTLE_MS): o link do e-mail é gerado
// depois e continua válido. Passou da janela, a tela manda abrir o e-mail (gerar outro link aqui invalidaria o do e-mail).
const KEY = /^[a-f0-9]{32}$/i;
const MAX_AGE_MS = 3 * 60 * 60 * 1000;
const SAFE_WINDOW_MS = 6000;

type Json = Record<string, unknown>;
const txt = (value: unknown) => (typeof value === "string" ? value : value == null ? "" : String(value));

function maskEmail(email: string) {
  const [user, domain] = email.split("@");
  if (!domain) return email;
  return `${user.slice(0, 2)}${"•".repeat(Math.max(1, Math.min(6, user.length - 2)))}@${domain}`;
}

async function sessionFor(email: string, name: string, area: Area) {
  if (!(await findAuthAccount(email).catch(() => null))) {
    const metadata = { ...(name ? { name } : {}), ...(isMainArea(area) ? {} : { area_nome: area.brand_name, area_url: areaUrl(area) }) };
    const created = await supabaseAdminAuthRequest("/admin/users", {
      method: "POST",
      body: JSON.stringify({ email, email_confirm: true, user_metadata: metadata }),
    });
    if (!created.ok && !/already|exists|registered/i.test(await created.text())) return null;
  }
  const link = await supabaseAdminAuthRequest("/admin/generate_link", { method: "POST", body: JSON.stringify({ type: "magiclink", email }) });
  if (!link.ok) return null;
  const data = (await link.json()) as Json & { properties?: Json };
  const hash = txt(data.hashed_token || data.properties?.hashed_token);
  if (!hash) return null;
  const verify = await supabaseAdminAuthRequest("/verify", { method: "POST", body: JSON.stringify({ type: "magiclink", token_hash: hash }) });
  if (!verify.ok) return null;
  const session = (await verify.json()) as { access_token?: string; refresh_token?: string };
  return session.access_token ? { accessToken: session.access_token, refreshToken: session.refresh_token } : null;
}

export async function POST(request: Request) {
  let area: Area;
  try {
    area = await areaFrom(request);
  } catch {
    return jsonError("Área não encontrada.", 404);
  }
  try {
    const body = (await request.json().catch(() => ({}))) as Json;
    const key = txt(body.key).trim();
    if (!KEY.test(key)) return jsonError("Código inválido.", 400);

    const rows = await supabaseRest<{ payload: Json; processed_at: string | null }[]>(
      `/webhook_events?event_type=eq.entrega_create&payload->fields->>edz_transaction_key=eq.${key}&select=payload,processed_at&limit=1`,
    );
    if (!rows.length) return Response.json({ status: "pending" });
    const fields = (rows[0].payload.fields || {}) as Json;
    const created = Date.parse(txt(rows[0].processed_at) || txt(fields.edz_fat_dtcadastro));
    if (Number.isFinite(created) && Date.now() - created > MAX_AGE_MS) return Response.json({ status: "expired" });

    const email = txt(fields.edz_cli_email).toLowerCase().trim();
    const order = txt(fields.edz_fat_cod);
    if (!email || !order) return Response.json({ status: "expired" });

    const access = await supabaseRest<{ id: string }[]>(
      `/mp_access?email=eq.${encodeURIComponent(email)}&order_id=eq.${encodeURIComponent(order)}&status=eq.active&select=id&limit=1`,
    );
    if (!access.length) return Response.json({ status: "pending" });

    // E-mail de acesso já saiu (ou está saindo): não gera outro link, manda abrir o e-mail.
    // A trava do e-mail nasce com o 1º webhook e o link do e-mail é gerado 8 s depois: só entra antes de 6 s.
    const claim = await supabaseRest<{ meta: Json; created_at: string }[]>(
      `/mp_events?kind=eq.acesso_email&email=eq.${encodeURIComponent(email)}&meta->>order=eq.${encodeURIComponent(order)}&select=meta,created_at&limit=1`,
    );
    const late = claim.some((row) => row.meta?.via || Date.now() - Date.parse(row.created_at) > SAFE_WINDOW_MS);
    if (late) return Response.json({ status: "email", email: maskEmail(email) });

    const session = await sessionFor(email, txt(fields.edz_cli_rsocial), area);
    if (!session) return Response.json({ status: "email", email: maskEmail(email) });
    return Response.json({ status: "ok", ...session });
  } catch (error) {
    console.error("entrar-compra", error);
    return jsonError("Erro ao liberar o acesso.", 500);
  }
}
