// Pocket Portuguese: regras puras (sem banco, testadas em tests/pocket-portuguese.test.mjs).
import { createHmac, timingSafeEqual } from "node:crypto";

export const PP_AREA_SLUG = "pocket-portuguese";
export const PP_PRODUCTS = ["pp-core", "pp-rio-slang", "pp-love-family", "pp-carnaval", "pp-complete"] as const;
export type PpSlug = (typeof PP_PRODUCTS)[number];
export type PpEntitlements = { core: boolean; rio_slang: boolean; love_family: boolean; carnaval: boolean; complete: boolean };

const ENTITLEMENT_KEY: Record<PpSlug, keyof PpEntitlements> = {
  "pp-core": "core",
  "pp-rio-slang": "rio_slang",
  "pp-love-family": "love_family",
  "pp-carnaval": "carnaval",
  "pp-complete": "complete",
};

export type PpAccessRow = { status: string; expires_at?: string | null; slug: string };

// Regra "Complete libera os 3 pacotes" calculada na LEITURA (sem gravar linhas extras em mp_access):
// reembolso do Complete tira os 3 sozinho, e quem comprou um pacote avulso não o perde.
// Complete NÃO inclui o Core (o Core é o produto da frente).
export function entitlementsFrom(rows: PpAccessRow[], nowMs = Date.now()): PpEntitlements {
  const active = new Set(
    rows
      .filter((row) => row.status === "active" && (!row.expires_at || new Date(row.expires_at).getTime() > nowMs))
      .map((row) => row.slug),
  );
  const out: PpEntitlements = { core: false, rio_slang: false, love_family: false, carnaval: false, complete: false };
  for (const slug of PP_PRODUCTS) if (active.has(slug)) out[ENTITLEMENT_KEY[slug]] = true;
  if (out.complete) {
    out.rio_slang = true;
    out.love_family = true;
    out.carnaval = true;
  }
  return out;
}

// Quem pode pedir o link de entrada: tem o Core ou o Complete ativo.
export const canEnterApp = (e: PpEntitlements) => e.core || e.complete;

export function slugFromParam(value: string | null): PpSlug | null {
  const v = (value || "").trim().toLowerCase().replace(/_/g, "-");
  const map: Record<string, PpSlug> = {
    core: "pp-core", "pp-core": "pp-core",
    "rio-slang": "pp-rio-slang", "pp-rio-slang": "pp-rio-slang",
    "love-family": "pp-love-family", "pp-love-family": "pp-love-family",
    carnaval: "pp-carnaval", "pp-carnaval": "pp-carnaval",
    complete: "pp-complete", "pp-complete": "pp-complete",
  };
  return map[v] || null;
}

export function buildCheckoutUrl(base: string, slug: string, email?: string) {
  const url = new URL(base);
  if (email) url.searchParams.set("email", email);
  if (!url.searchParams.get("utm_source")) url.searchParams.set("utm_source", "app");
  url.searchParams.set("utm_medium", "paywall");
  url.searchParams.set("utm_campaign", slug);
  url.searchParams.set("utm_content", "pocket-portuguese-app");
  return url.toString();
}

export function validEmail(value: unknown) {
  const email = String(value || "").trim().toLowerCase();
  return /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/.test(email) && email.length <= 254 ? email : "";
}

// ---- HMAC da Cakto
export function hmacSecretFor(areaSlug: string) {
  const key = `CAKTO_HMAC_SECRET_${areaSlug.toUpperCase().replace(/[^A-Z0-9]/g, "_")}`;
  return (process.env[key] || "").trim();
}

// Aceita HMAC-SHA256 do corpo bruto em hex ou base64, com ou sem prefixo "sha256=".
export function verifyCaktoSignature(rawBody: string, header: string | null, secret: string) {
  const got = (header || "").trim().replace(/^sha256=/i, "");
  if (!got || !secret) return false;
  const digest = createHmac("sha256", secret).update(rawBody).digest();
  const candidates = [digest.toString("hex"), digest.toString("base64"), digest.toString("base64url")];
  const a = Buffer.from(got);
  return candidates.some((c) => {
    const b = Buffer.from(c);
    return a.length === b.length && timingSafeEqual(a, b);
  });
}

// ---- CORS (origem do app em PP_APP_ORIGIN; vírgula separa várias)
export function corsHeaders(request: Request) {
  const allowed = (process.env.PP_APP_ORIGIN || "").split(",").map((o) => o.trim().replace(/\/$/, "")).filter(Boolean);
  const origin = request.headers.get("origin") || "";
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
  if (origin && allowed.includes(origin)) headers["Access-Control-Allow-Origin"] = origin;
  return headers;
}

export function ppJson(request: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", ...corsHeaders(request) } });
}

export const ppPreflight = (request: Request) => new Response(null, { status: 204, headers: corsHeaders(request) });

export const ppAppUrl = () => (process.env.PP_APP_URL || "").trim();

// ---- E-mails em inglês
const esc = (t: string) => t.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] as string);

function shell(title: string, body: string, button: string, href: string, note: string) {
  return `<!doctype html><html><body style="margin:0;background:#f6f4ee;font-family:Arial,Helvetica,sans-serif;color:#17202a">
<div style="max-width:520px;margin:0 auto;padding:32px 20px">
<h1 style="font-size:24px;margin:0 0 16px">${esc(title)}</h1>
<p style="font-size:16px;line-height:1.5;margin:0 0 24px">${body}</p>
<p style="margin:0 0 24px"><a href="${esc(href)}" style="background:#0a8f4e;color:#fff;text-decoration:none;padding:14px 26px;border-radius:10px;font-weight:bold;display:inline-block">${esc(button)}</a></p>
<p style="font-size:13px;line-height:1.5;color:#5b6670;margin:0">${note}</p>
</div></body></html>`;
}

export function accessEmail(email: string, appUrl: string) {
  return {
    subject: "Your Pocket Portuguese is ready",
    html: shell(
      "Your Pocket Portuguese is ready",
      "Thanks for your purchase! Your access is active. Open the app and sign in with the email you used at checkout:",
      "Open Pocket Portuguese",
      appUrl,
      `Sign in with <b>${esc(email)}</b>. We will email you a 6-digit code and a one-tap link, no password needed.<br><br>` +
        `<b>Put it on your phone's Home Screen</b> (works offline):<br>` +
        `&bull; <b>iPhone:</b> open the link in <b>Safari</b> &rarr; tap Share &rarr; <b>Add to Home Screen</b> &rarr; Add. Then open it from the new icon and sign in with the code.<br>` +
        `&bull; <b>Android:</b> open the link in <b>Chrome</b> &rarr; menu &#8942; &rarr; <b>Install app</b>.<br><br>` +
        `Questions? Just reply to this email.`,
    ),
  };
}

export function loginEmail(link: string, code?: string) {
  const codeBlock = code
    ? `<div style="background:#fff;border:2px dashed #0a8f4e;border-radius:12px;padding:16px;text-align:center;margin:0 0 24px"><div style="font-size:14px;color:#5b6670">Your code</div><div style="font-size:36px;font-weight:bold;letter-spacing:8px;color:#17202a">${esc(code)}</div><div style="font-size:13px;color:#5b6670">Type it in the app</div></div>`
    : "";
  return {
    subject: code ? `Your Pocket Portuguese code: ${code}` : "Your Pocket Portuguese sign-in link",
    html: shell(
      "Sign in to Pocket Portuguese",
      `${codeBlock}Using the installed app? Type the code above in the app. Prefer a link? Tap the button below (it opens in your browser).`,
      "Sign in",
      link,
      "Your code and link work once and expire soon. If you did not ask for this, you can ignore this email.",
    ),
  };
}

// ---- Login por código (verify-code)
export const CODE_MAX_ATTEMPTS = 5;
export const CODE_WINDOW_MS = 15 * 60 * 1000;
export const validCode = (value: unknown) => {
  const code = String(value ?? "").replace(/\s/g, "");
  return /^\d{6}$/.test(code) ? code : "";
};

export type VerifySession = { access_token: string; refresh_token: string; expires_at: number };
export type VerifyDeps = {
  attemptsInWindow: (email: string) => Promise<number>;
  recordAttempt: (email: string) => Promise<void>;
  hasAccess: (email: string) => Promise<boolean>;
  // Tenta o código no Supabase; devolve a sessão ou null.
  verifyOtp: (email: string, code: string) => Promise<VerifySession | null>;
};
export type VerifyResult = { status: 200; body: VerifySession } | { status: 400 | 429; body: { error: string } };

// Ordem: limite de tentativas -> registra tentativa -> acesso -> código. Erro de código e de acesso têm a MESMA resposta.
export async function verifyCodeFlow(deps: VerifyDeps, emailIn: unknown, codeIn: unknown): Promise<VerifyResult> {
  const email = validEmail(emailIn);
  const code = validCode(codeIn);
  const generic = { status: 400 as const, body: { error: "Invalid or expired code." } };
  if (!email || !code) return generic;
  if ((await deps.attemptsInWindow(email)) >= CODE_MAX_ATTEMPTS) return { status: 429, body: { error: "Too many attempts. Try again in 15 minutes." } };
  await deps.recordAttempt(email);
  if (!(await deps.hasAccess(email))) return generic;
  const session = await deps.verifyOtp(email, code);
  return session ? { status: 200, body: session } : generic;
}
