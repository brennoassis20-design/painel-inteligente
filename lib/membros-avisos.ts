// Gênio Play: cadastro grátis (lead), notificações (sino) e avisos no celular (web push).
import webpush from "web-push";
import { supabaseAdminAuthRequest, supabaseAuthRequest, supabaseRest } from "@/lib/panel-server";
import { MEMBROS_URL, OpError } from "@/lib/membros";

const enc = encodeURIComponent;

// ---------------------------------------------------------------- cadastro grátis

export function cleanWhatsapp(value: unknown) {
  let digits = String(value || "").replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  // Número brasileiro digitado sem o 55 (DDD + 8 ou 9 dígitos).
  if (digits.length === 10 || digits.length === 11) digits = `55${digits}`;
  return digits;
}

type Signup = { nome?: string; email?: string; whatsapp?: string; senha?: string; utm?: Record<string, unknown> };

export async function signupFree(input: Signup) {
  const email = String(input.email || "").trim().toLowerCase();
  const name = String(input.nome || "").trim().slice(0, 80);
  const whatsapp = cleanWhatsapp(input.whatsapp);
  const password = String(input.senha || "");

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) throw new OpError("Confira o seu e-mail.");
  if (whatsapp.length < 12 || whatsapp.length > 15) throw new OpError("Confira o seu WhatsApp com DDD.");
  if (password.length < 8) throw new OpError("A senha precisa ter pelo menos 8 caracteres.");

  const utm: Record<string, string> = {};
  for (const [key, value] of Object.entries(input.utm || {})) {
    if (key.startsWith("utm_") && typeof value === "string") utm[key] = value.slice(0, 100);
  }

  // Conta já confirmada: a pessoa entra na hora, sem esperar e-mail.
  const created = await supabaseAdminAuthRequest("/admin/users", {
    method: "POST",
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
      user_metadata: { ...(name ? { name } : {}), whatsapp, origem: "gratis" },
    }),
  });
  if (!created.ok) {
    const text = await created.text();
    if (created.status === 422 || /already|exists|registered/i.test(text)) {
      throw new OpError("Este e-mail já tem acesso. Entre com a sua senha ou toque em Esqueci minha senha.");
    }
    throw new Error(text || "Não foi possível criar o acesso.");
  }
  const user = (await created.json()) as { id: string };

  await supabaseRest("/mp_leads?on_conflict=email", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({ email, user_id: user.id, name: name || null, whatsapp, source: "gratis", utm }),
  });
  await supabaseRest("/mp_events", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ email, kind: "cadastro_gratis", meta: utm }),
  }).catch(() => undefined);

  const login = await supabaseAuthRequest("/token?grant_type=password", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  const session = (await login.json()) as { access_token?: string; refresh_token?: string };
  if (!login.ok || !session.access_token) throw new Error("Acesso criado. Entre com o seu e-mail e senha.");

  // E-mail de boas-vindas = link de acesso (modelo "Magic Link" do Supabase). Falha no e-mail não trava a entrada.
  const mail = await supabaseAuthRequest(`/otp?redirect_to=${enc(MEMBROS_URL)}`, {
    method: "POST",
    body: JSON.stringify({ email, create_user: false }),
  }).catch(() => null);

  return {
    session: { accessToken: session.access_token, refreshToken: session.refresh_token },
    email_enviado: Boolean(mail?.ok),
  };
}

export async function listLeads(limit = 200) {
  return supabaseRest<{ email: string; name: string | null; whatsapp: string | null; utm: Record<string, string>; created_at: string }[]>(
    `/mp_leads?select=email,name,whatsapp,utm,created_at&order=created_at.desc&limit=${Math.min(limit, 2000)}`,
  );
}

// ---------------------------------------------------------------- notificações

export type Notice = { id: string; title: string; body: string | null; product_id: string | null; kind: string; created_at: string };

export async function studentNotices(userId: string) {
  const [list, seen] = await Promise.all([
    supabaseRest<Notice[]>("/mp_notifications?select=id,title,body,product_id,kind,created_at&order=created_at.desc&limit=30"),
    supabaseRest<{ seen_at: string }[]>(`/mp_notification_seen?user_id=eq.${userId}&select=seen_at`),
  ]);
  const seenAt = seen[0]?.seen_at || "1970-01-01T00:00:00Z";
  return { items: list, unread: list.filter((item) => item.created_at > seenAt).length };
}

export async function markNoticesSeen(userId: string) {
  await supabaseRest("/mp_notification_seen?on_conflict=user_id", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({ user_id: userId, seen_at: new Date().toISOString() }),
  });
  return { ok: true };
}

// Cria o aviso no sino e manda para todos os celulares com aviso ligado.
export async function createNotice(input: { title: string; body?: string | null; productId?: string | null; slug?: string | null; kind?: string }) {
  const rows = await supabaseRest<Notice[]>("/mp_notifications", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ title: input.title.slice(0, 120), body: input.body?.slice(0, 300) || null, product_id: input.productId || null, kind: input.kind || "aviso" }),
  });
  const notice = rows[0];
  const sent = await pushAll({
    title: notice.title,
    body: notice.body || "Toque para ver na sua área.",
    url: input.slug ? `${MEMBROS_URL}/?p=${enc(input.slug)}` : MEMBROS_URL,
    tag: notice.id,
  }).catch((error) => {
    console.error("push", error);
    return 0;
  });
  await supabaseRest(`/mp_notifications?id=eq.${notice.id}`, { method: "PATCH", body: JSON.stringify({ push_sent: sent }) }).catch(() => undefined);
  return { ...notice, push_enviados: sent };
}

// Produto novo publicado: um aviso por produto (o índice único impede repetir).
export async function noticeNewProduct(product: { id: string; slug: string; title: string; subtitle: string | null; is_free?: boolean }) {
  const exists = await supabaseRest<{ id: string }[]>(`/mp_notifications?product_id=eq.${product.id}&kind=eq.produto_novo&select=id`);
  if (exists.length) return null;
  return createNotice({
    title: product.is_free ? `Liberado grátis: ${product.title}` : `Novo na área: ${product.title}`,
    body: product.subtitle || (product.is_free ? "Já está liberado para você. Toque para assistir." : "Toque para ver o que tem dentro."),
    productId: product.id,
    slug: product.slug,
    kind: "produto_novo",
  }).catch((error) => {
    console.error("aviso produto novo", error);
    return null;
  });
}

// ---------------------------------------------------------------- push

async function vapid() {
  const rows = await supabaseRest<{ vapid_public: string | null; vapid_private: string | null }[]>("/mp_settings?id=eq.1&select=vapid_public,vapid_private");
  let { vapid_public: pub, vapid_private: priv } = rows[0] || {};
  if (!pub || !priv) {
    const keys = webpush.generateVAPIDKeys();
    pub = keys.publicKey;
    priv = keys.privateKey;
    // Só grava se ainda estiver vazio (duas chamadas ao mesmo tempo não trocam a chave).
    await supabaseRest("/mp_settings?id=eq.1&vapid_public=is.null", { method: "PATCH", body: JSON.stringify({ vapid_public: pub, vapid_private: priv }) });
    const again = await supabaseRest<{ vapid_public: string; vapid_private: string }[]>("/mp_settings?id=eq.1&select=vapid_public,vapid_private");
    pub = again[0].vapid_public;
    priv = again[0].vapid_private;
  }
  return { pub, priv };
}

export async function vapidPublicKey() {
  return (await vapid()).pub;
}

type Sub = { endpoint: string; keys?: { p256dh?: string; auth?: string } };

export async function savePushSub(user: { id: string; email: string }, sub: Sub, userAgent: string) {
  if (!sub?.endpoint || !/^https:\/\//.test(sub.endpoint) || !sub.keys?.p256dh || !sub.keys?.auth) throw new OpError("Inscrição de aviso inválida.");
  await supabaseRest("/mp_push_subs?on_conflict=endpoint", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({ endpoint: sub.endpoint, user_id: user.id, email: user.email, p256dh: sub.keys.p256dh, auth: sub.keys.auth, user_agent: userAgent.slice(0, 200) }),
  });
  return { ok: true };
}

export async function removePushSub(endpoint: string) {
  await supabaseRest(`/mp_push_subs?endpoint=eq.${enc(endpoint)}`, { method: "DELETE" });
  return { ok: true };
}

async function pushAll(payload: { title: string; body: string; url: string; tag: string }) {
  const { pub, priv } = await vapid();
  webpush.setVapidDetails(MEMBROS_URL, pub, priv);
  const subs = await supabaseRest<{ endpoint: string; p256dh: string; auth: string }[]>("/mp_push_subs?select=endpoint,p256dh,auth");
  const data = JSON.stringify(payload);
  let sent = 0;
  for (let i = 0; i < subs.length; i += 50) {
    const batch = subs.slice(i, i + 50);
    await Promise.all(
      batch.map(async (sub) => {
        try {
          await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, data, { TTL: 60 * 60 * 24 * 3 });
          sent += 1;
        } catch (error) {
          const status = (error as { statusCode?: number }).statusCode;
          // Celular desinstalou ou tirou a permissão: apaga a inscrição.
          if (status === 404 || status === 410) await removePushSub(sub.endpoint).catch(() => undefined);
        }
      }),
    );
  }
  return sent;
}
