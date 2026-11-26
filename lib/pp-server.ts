// Pocket Portuguese: partes com banco/e-mail (a regra pura fica em lib/pp.ts).
import { supabaseAdminAuthRequest, supabaseAuthRequest, supabaseRest } from "@/lib/panel-server";
import { type PpEntitlements, type VerifyDeps, type VerifySession, CODE_WINDOW_MS, accessEmail, canEnterApp, entitlementsFrom, loginEmail, PP_AREA_SLUG } from "@/lib/pp";

const enc = encodeURIComponent;

export async function ppAreaId() {
  const rows = await supabaseRest<{ id: number }[]>(`/mp_settings?slug=eq.${PP_AREA_SLUG}&select=id&limit=1`);
  return rows[0]?.id ?? null;
}

export async function entitlementsFor(email: string): Promise<PpEntitlements> {
  const areaId = await ppAreaId();
  if (!areaId) return entitlementsFrom([]);
  const rows = await supabaseRest<{ status: string; expires_at: string | null; mp_products: { slug: string; area_id: number } }[]>(
    `/mp_access?email=eq.${enc(email)}&status=eq.active&select=status,expires_at,mp_products!inner(slug,area_id)&mp_products.area_id=eq.${areaId}`,
  );
  return entitlementsFrom(rows.map((r) => ({ status: r.status, expires_at: r.expires_at, slug: r.mp_products.slug })));
}

function brevoSender() {
  return {
    name: process.env.PP_EMAIL_NOME || "Pocket Portuguese",
    email: process.env.PP_EMAIL_DE || process.env.MEMBROS_EMAIL_DE || "material@brennolimaoficial.com",
  };
}

export async function sendPpEmail(to: string, mail: { subject: string; html: string }, tag: string) {
  const key = process.env.BREVO_API_KEY;
  if (!key) throw new Error("BREVO_API_KEY ausente");
  const replyTo = process.env.PP_EMAIL_RESPOSTA || process.env.MEMBROS_EMAIL_RESPOSTA || "contato@brennolimaoficial.com";
  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": key, "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({ sender: brevoSender(), replyTo: { email: replyTo }, to: [{ email: to }], subject: mail.subject, htmlContent: mail.html, tags: ["pocket-portuguese", tag] }),
  });
  if (!response.ok) throw new Error(`brevo ${response.status} ${(await response.text()).slice(0, 160)}`);
}

// Link mágico gerado pelo admin do Supabase e enviado por nós (e-mail em inglês, sem mexer no template global do Supabase,
// que serve Gênio Play / Chama Acesa).
export async function sendLoginLink(email: string, appUrl: string) {
  const response = await supabaseAdminAuthRequest("/admin/generate_link", {
    method: "POST",
    body: JSON.stringify({ type: "magiclink", email, redirect_to: appUrl }),
  });
  if (!response.ok) throw new Error(`generate_link ${response.status}`);
  // GoTrue devolve email_otp na raiz (versões antigas: dentro de properties).
  const json = (await response.json()) as { action_link?: string; email_otp?: string; properties?: { email_otp?: string } };
  if (!json.action_link) throw new Error("generate_link sem action_link");
  const code = json.email_otp || json.properties?.email_otp;
  await sendPpEmail(email, loginEmail(json.action_link, code), "login");
}

// Anti-abuso: no máximo 1 link por e-mail a cada 60 s (usa mp_events, sem tabela nova).
export async function loginLinkRecent(email: string, areaId: number) {
  const since = new Date(Date.now() - 60_000).toISOString();
  const rows = await supabaseRest<{ id: string }[]>(
    `/mp_events?kind=eq.pp_login_link&email=eq.${enc(email)}&created_at=gte.${enc(since)}&select=id&limit=1`,
  ).catch(() => []);
  void areaId;
  return rows.length > 0;
}

export async function logPp(areaId: number, email: string, kind: string, meta: Record<string, unknown> = {}) {
  await supabaseRest("/mp_events", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ area_id: areaId, email, kind, meta }),
  }).catch(() => undefined);
}

// Compra com pp-core aprovada: e-mail "Your Pocket Portuguese is ready" (1 por e-mail + pedido).
export async function deliverPpAccess(areaId: number, email: string, orderId: string | undefined, appUrl: string) {
  if (!appUrl) return "sem_PP_APP_URL";
  const order = orderId || "sem-pedido";
  const sent = await supabaseRest<{ id: string }[]>(
    `/mp_events?kind=eq.pp_acesso_email&email=eq.${enc(email)}&meta->>order=eq.${enc(order)}&select=id&limit=1`,
  ).catch(() => []);
  if (sent.length) return "duplicado";
  // Reserva antes de enviar (evita dois webhooks simultâneos mandarem 2 e-mails).
  await logPp(areaId, email, "pp_acesso_email", { order });
  try {
    await sendPpEmail(email, accessEmail(email, appUrl), "acesso");
    return "email_enviado";
  } catch (error) {
    console.error("pp-acesso-email", email, error instanceof Error ? error.message : error);
    await supabaseRest(`/mp_events?kind=eq.pp_acesso_email&email=eq.${enc(email)}&meta->>order=eq.${enc(order)}`, { method: "DELETE" }).catch(() => undefined);
    await logPp(areaId, email, "convite_falhou", { order, app: "pocket-portuguese" });
    return "email_falhou";
  }
}

// ---- verify-code: dependências reais
async function verifyOtpSupabase(email: string, code: string): Promise<VerifySession | null> {
  // O código vem de generate_link type=magiclink: conta existente = tipo "magiclink"; conta nova = "signup". "email" é o último recurso.
  for (const type of ["magiclink", "signup", "email"]) {
    const response = await supabaseAuthRequest("/verify", { method: "POST", body: JSON.stringify({ type, email, token: code }) });
    if (!response.ok) continue;
    const data = (await response.json()) as { access_token?: string; refresh_token?: string; expires_at?: number; expires_in?: number };
    if (!data.access_token || !data.refresh_token) continue;
    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: data.expires_at || Math.floor(Date.now() / 1000) + (data.expires_in || 3600),
    };
  }
  return null;
}

// Tentativas guardadas em mp_events (valem entre instâncias do servidor).
export function verifyDeps(areaId: number): VerifyDeps {
  return {
    attemptsInWindow: async (email) => {
      const since = new Date(Date.now() - CODE_WINDOW_MS).toISOString();
      const rows = await supabaseRest<{ id: string }[]>(
        `/mp_events?kind=eq.pp_code_attempt&email=eq.${enc(email)}&created_at=gte.${enc(since)}&select=id&limit=50`,
      ).catch(() => []);
      return rows.length;
    },
    recordAttempt: (email) => logPp(areaId, email, "pp_code_attempt"),
    hasAccess: async (email) => canEnterApp(await entitlementsFor(email)),
    verifyOtp: verifyOtpSupabase,
  };
}
