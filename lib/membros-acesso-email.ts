// E-mail transacional "seu acesso chegou" (Brevo) para compra aprovada e para o lembrete de acesso.
// O link vem de /admin/generate_link (o Supabase NÃO manda e-mail próprio): o aluno recebe só este.
// Sem Brevo / área com e-mail desligado / falha no envio: volta ao convite do Supabase (comportamento anterior).
import { after } from "next/server";
import { findAuthAccount, supabaseAdminAuthRequest, supabaseRest } from "@/lib/panel-server";
import { type Area, areaUrl, inviteToArea, isMainArea, logEvent, MEMBROS_URL, tagAccountWithArea } from "@/lib/membros";
import {
  ACCESS_EMAIL_KIND, type AccessProduct, accessEmailHtml, accessSubject, NO_ORDER_WINDOW_MS, ORDER_SETTLE_MS, platformName,
} from "@/lib/membros-acesso-regra";

const enc = encodeURIComponent;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export type SaleAccessInput = {
  email: string;
  name?: string;
  provider: string;
  orderId?: string;
  // Produtos desta chamada (o pedido pode chegar em vários webhooks; o envio relê o pedido inteiro).
  products: (AccessProduct & { id?: string })[];
};

export function brevoReady(area: Pick<Area, "email_enabled">) {
  return Boolean(area.email_enabled && process.env.BREVO_API_KEY);
}

// Link de entrada: conta nova = invite (cria a senha); conta existente = magiclink (entra direto).
async function accessLink(area: Area, email: string, name: string | undefined, products: AccessProduct[], provider: string) {
  const redirect = areaUrl(area);
  const main = products[0]?.title;
  const existing = await findAuthAccount(email).catch(() => null);
  if (!existing) {
    const data = {
      ...(name ? { name } : {}),
      ...(isMainArea(area) ? {} : { area_nome: area.brand_name, area_url: redirect }),
      ...(main ? { produto_nome: main } : {}),
      ...(provider ? { plataforma: platformName(provider) } : {}),
    };
    const response = await supabaseAdminAuthRequest("/admin/generate_link", {
      method: "POST",
      body: JSON.stringify({ type: "invite", email, redirect_to: redirect, data }),
    });
    if (response.ok) {
      const json = (await response.json()) as { action_link?: string; id?: string };
      if (json.action_link) return { url: json.action_link, newAccount: true, createdId: json.id };
    } else {
      const text = await response.text();
      if (!/already|exists|registered/i.test(text)) throw new Error(text || `generate_link ${response.status}`);
    }
  }
  const account = existing || (await findAuthAccount(email).catch(() => null));
  if (account) await tagAccountWithArea(account.id, area);
  const response = await supabaseAdminAuthRequest("/admin/generate_link", {
    method: "POST",
    body: JSON.stringify({ type: "magiclink", email, redirect_to: redirect }),
  });
  if (!response.ok) throw new Error((await response.text()) || `generate_link ${response.status}`);
  const json = (await response.json()) as { action_link?: string };
  if (!json.action_link) throw new Error("generate_link sem action_link");
  return { url: json.action_link, newAccount: false, createdId: undefined as string | undefined };
}

function sender(area: Area) {
  const main = isMainArea(area);
  const ownSender = !main && area.email_from ? area.email_from : null;
  const from = { name: main ? process.env.MEMBROS_EMAIL_NOME || "Brenno Lima" : area.brand_name.slice(0, 60), email: ownSender || process.env.MEMBROS_EMAIL_DE || "material@brennolimaoficial.com" };
  const replyTo = ownSender
    ? area.email_reply_to || ownSender
    : main || !area.owner_email
      ? process.env.MEMBROS_EMAIL_RESPOSTA || "contato@brennolimaoficial.com"
      : area.owner_email;
  return { from, replyTo };
}

// E-mail simples com assunto e HTML próprios (ex.: cobrança do Chama Acesa). Só chamar com brevoReady().
export async function sendCustomViaBrevo(area: Area, email: string, subject: string, html: string, tag: string) {
  const { from, replyTo } = sender(area);
  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": process.env.BREVO_API_KEY as string, "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({ sender: from, replyTo: { email: replyTo }, to: [{ email }], subject, htmlContent: html, tags: ["genio-play", `area-${area.id}`, tag] }),
  });
  if (!response.ok) throw new Error(`brevo ${response.status} ${(await response.text()).slice(0, 160)}`);
}

// Gera o link e manda pela Brevo. Lança erro se falhar (quem chama decide o plano B). Só chamar com brevoReady().
export async function sendAccessViaBrevo(
  area: Area,
  email: string,
  opts: { name?: string; provider?: string; products: AccessProduct[]; reminder?: boolean },
) {
  const key = process.env.BREVO_API_KEY as string;
  const link = await accessLink(area, email, opts.name, opts.products, opts.provider || "");
  try {
    const { from, replyTo } = sender(area);
    const icon = isMainArea(area) || !area.logo_url ? `${MEMBROS_URL}/membros/app/icone-192.png` : area.logo_url;
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "api-key": key, "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({
        sender: from,
        replyTo: { email: replyTo },
        to: [{ email }],
        subject: accessSubject(opts.products, opts.reminder),
        htmlContent: accessEmailHtml({
          brandName: area.brand_name, areaUrl: areaUrl(area), iconUrl: icon, link: link.url, email,
          products: opts.products, platform: platformName(opts.provider), reminder: opts.reminder, newAccount: link.newAccount,
        }),
        tags: ["genio-play", `area-${area.id}`, opts.reminder ? "lembrete-acesso" : "acesso"],
      }),
    });
    if (!response.ok) throw new Error(`brevo ${response.status} ${(await response.text()).slice(0, 160)}`);
  } catch (error) {
    // Conta criada agora só para este envio e sem e-mail entregue: desfaz, para o convite do Supabase poder criá-la.
    if (link.createdId) await supabaseAdminAuthRequest(`/admin/users/${enc(link.createdId)}`, { method: "DELETE" }).catch(() => undefined);
    throw error;
  }
}

// Trava de repetição: uma linha acesso_email por (e-mail, pedido). Com o índice único (ver migration) a corrida entre
// webhooks simultâneos é decidida pelo banco; sem o índice, vale a checagem dos últimos 10 min.
async function claimOrder(area: Area, email: string, order: string) {
  const since = new Date(Date.now() - NO_ORDER_WINDOW_MS).toISOString();
  const recent = await supabaseRest<{ id: string }[]>(
    `/mp_events?kind=eq.${ACCESS_EMAIL_KIND}&email=eq.${enc(email)}&meta->>order=eq.${enc(order)}&created_at=gte.${enc(since)}&select=id&limit=1`,
  ).catch(() => []);
  if (recent.length) return null;
  try {
    const rows = await supabaseRest<{ id: string }[]>("/mp_events", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ area_id: area.id, email, kind: ACCESS_EMAIL_KIND, meta: { order, status: "pendente" } }),
    });
    return rows?.[0]?.id || "ok";
  } catch (error) {
    if (/23505|duplicate key/i.test(error instanceof Error ? error.message : String(error))) return null;
    throw error;
  }
}

// Produtos do pedido inteiro (a Eduzz manda um webhook por item), com a marca de bump gravada no evento "compra".
async function orderProducts(area: Area, email: string, orderId: string | undefined, fallback: SaleAccessInput["products"]) {
  const byId = new Map<string, AccessProduct>();
  const fromEvent = [...fallback];
  if (orderId) {
    const rows = await supabaseRest<{ product_id: string; mp_products: { id: string; title: string; position: number; area_id: number } }[]>(
      `/mp_access?email=eq.${enc(email)}&order_id=eq.${enc(orderId)}&status=eq.active&select=product_id,mp_products!inner(id,title,position,area_id)&mp_products.area_id=eq.${area.id}`,
    ).catch(() => []);
    const bumps = await supabaseRest<{ product_id: string | null; meta: { bump?: boolean } }[]>(
      `/mp_events?kind=eq.compra&email=eq.${enc(email)}&meta->>order=eq.${enc(orderId)}&select=product_id,meta`,
    ).catch(() => []);
    const bumpIds = new Set(bumps.filter((row) => row.meta?.bump && row.product_id).map((row) => row.product_id as string));
    for (const row of rows) byId.set(row.product_id, { title: row.mp_products.title, position: row.mp_products.position, bump: bumpIds.has(row.product_id) });
  }
  for (const item of fromEvent) {
    if (item.id && byId.has(item.id)) continue;
    if (![...byId.values()].some((other) => other.title === item.title)) byId.set(item.id || item.title, item);
  }
  return [...byId.values()];
}

async function sendSaleEmail(area: Area, input: SaleAccessInput, order: string, claimId: string) {
  const products = await orderProducts(area, input.email, input.orderId, input.products);
  let via: "brevo" | "supabase" = "brevo";
  try {
    if (!brevoReady(area)) throw new Error("brevo desligado");
    await sendAccessViaBrevo(area, input.email, { name: input.name, provider: input.provider, products });
  } catch (error) {
    if (brevoReady(area)) console.error("acesso-email-brevo", input.email, error instanceof Error ? error.message : error);
    via = "supabase";
    try {
      const extra = { produto_nome: products[0]?.title, plataforma: platformName(input.provider) };
      await inviteToArea(area, input.email, input.name, "", extra);
    } catch (second) {
      console.error("convite-falhou", input.provider, input.email, second instanceof Error ? second.message : second);
      await logEvent(area.id, input.email, null, "convite_falhou", { provider: input.provider, order: input.orderId });
      // Libera a trava: o próximo webhook do pedido ou o lembrete pode tentar de novo.
      if (claimId !== "ok") await supabaseRest(`/mp_events?id=eq.${claimId}`, { method: "DELETE" }).catch(() => undefined);
      return "invite_failed";
    }
  }
  const meta = { order, produtos: products.map((item) => item.title), via };
  if (claimId !== "ok") await supabaseRest(`/mp_events?id=eq.${claimId}`, { method: "PATCH", body: JSON.stringify({ meta }) }).catch(() => undefined);
  else await logEvent(area.id, input.email, null, ACCESS_EMAIL_KIND, meta);
  return via === "brevo" ? "email_brevo" : "invited";
}

// Compra aprovada. Só o primeiro webhook do pedido envia; ele espera uns segundos (depois de responder ao webhook)
// para que os outros itens do pedido (order bumps da Eduzz) já estejam gravados e entrem na lista.
export async function deliverSaleAccess(area: Area, input: SaleAccessInput) {
  const order = input.orderId || `sem-pedido:${Math.floor(Date.now() / NO_ORDER_WINDOW_MS)}`;
  const claimId = await claimOrder(area, input.email, order);
  if (!claimId) return "duplicado";
  const run = async () => {
    if (input.orderId) await sleep(ORDER_SETTLE_MS);
    return sendSaleEmail(area, input, order, claimId);
  };
  if (!input.orderId) return run();
  try {
    after(() => run().catch((error) => console.error("acesso-email", error)));
    return "email_agendado";
  } catch {
    // Fora de uma requisição (ex.: script): espera aqui mesmo.
    return run();
  }
}
