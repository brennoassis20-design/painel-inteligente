// Gênio Play: cadastro grátis (lead), notificações (sino) e avisos no celular (web push).
import { tagPlainLink } from "@/lib/membros-utm";
import webpush from "web-push";
import { supabaseAdminAuthRequest, supabaseAuthRequest, supabaseRest } from "@/lib/panel-server";
import { type Area, areaUrl, getAreaById, inviteToArea, isMainArea, MAIN_AREA_ID, MEMBROS_URL, OpError } from "@/lib/membros";

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

export async function signupFree(input: Signup, area: Area) {
  const home = areaUrl(area);
  // Áreas de produtores: o e-mail de acesso mostra o nome da área (modelo do Supabase lê area_nome).
  const areaData = isMainArea(area) ? {} : { area_nome: area.brand_name, area_url: home };
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
      user_metadata: { ...(name ? { name } : {}), whatsapp, origem: "gratis", ...areaData },
    }),
  });
  if (!created.ok) {
    const text = await created.text();
    if (created.status === 422 || /already|exists|registered/i.test(text)) {
      // Já tem conta (comprador ou aluno do Painel): guarda o WhatsApp e manda o link de acesso no e-mail.
      await supabaseRest("/mp_leads?on_conflict=area_id,email", {
        method: "POST",
        headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
        body: JSON.stringify({ area_id: area.id, email, name: name || null, whatsapp, source: "gratis_conta_existente", utm }),
      }).catch(() => undefined);
      await supabaseAuthRequest(`/otp?redirect_to=${enc(home)}`, {
        method: "POST",
        body: JSON.stringify({ email, create_user: false }),
      }).catch(() => null);
      return {
        existente: true,
        mensagem: "Você já tem acesso com este e-mail. Mandamos agora um link de entrada para o seu e-mail (olhe também em Promoções e Spam).",
      };
    }
    throw new Error(text || "Não foi possível criar o acesso.");
  }
  const user = (await created.json()) as { id: string };

  await supabaseRest("/mp_leads?on_conflict=area_id,email", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({ area_id: area.id, email, user_id: user.id, name: name || null, whatsapp, source: "gratis", utm }),
  });
  await supabaseRest("/mp_events", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ area_id: area.id, email, kind: "cadastro_gratis", meta: utm }),
  }).catch(() => undefined);

  const login = await supabaseAuthRequest("/token?grant_type=password", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  const session = (await login.json()) as { access_token?: string; refresh_token?: string };
  if (!login.ok || !session.access_token) throw new Error("Acesso criado. Entre com o seu e-mail e senha.");

  // E-mail de boas-vindas = link de acesso (modelo "Magic Link" do Supabase). Falha no e-mail não trava a entrada.
  const mail = await supabaseAuthRequest(`/otp?redirect_to=${enc(home)}`, {
    method: "POST",
    body: JSON.stringify({ email, create_user: false }),
  }).catch(() => null);

  return {
    session: { accessToken: session.access_token, refreshToken: session.refresh_token },
    email_enviado: Boolean(mail?.ok),
  };
}

// Existe conta com este e-mail? (gera um link de recuperação sem enviar; 404/422 = não existe)
export async function accountExists(email: string) {
  const response = await supabaseAdminAuthRequest("/admin/generate_link", {
    method: "POST",
    body: JSON.stringify({ type: "recovery", email }),
  });
  if (response.ok) return true;
  const text = await response.text();
  if (/not.?found|no user/i.test(text) || response.status === 404) return false;
  return true; // na dúvida, segue o fluxo normal
}

// Convite para todo comprador com acesso ativo que ainda não criou a conta (máx. por vez por causa do limite de e-mails/hora).
export async function inviteBuyersWithoutAccount(area: Area, limit = 80) {
  const rows = await supabaseRest<{ email: string }[]>(`/mp_access?status=eq.active&select=email,mp_products!inner(area_id)&mp_products.area_id=eq.${area.id}`);
  const emails = [...new Set(rows.map((row) => row.email.trim().toLowerCase()))];
  const result = { convidados: [] as string[], ja_tinham_conta: 0, falhas: [] as string[], restantes: 0 };
  for (const email of emails) {
    if (result.convidados.length >= limit) {
      result.restantes += 1;
      continue;
    }
    try {
      const status = await inviteToArea(area, email);
      if (status === "invited") result.convidados.push(email);
      else result.ja_tinham_conta += 1;
    } catch {
      result.falhas.push(email);
    }
  }
  return { ...result, total_compradores: emails.length };
}

export async function listLeads(area: Pick<Area, "id">, limit = 200) {
  return supabaseRest<{ email: string; name: string | null; whatsapp: string | null; utm: Record<string, string>; created_at: string }[]>(
    `/mp_leads?area_id=eq.${area.id}&select=email,name,whatsapp,utm,created_at&order=created_at.desc&limit=${Math.min(limit, 2000)}`,
  );
}

// ---------------------------------------------------------------- notificações

export type Notice = {
  id: string;
  title: string;
  body: string | null;
  product_id: string | null;
  kind: string;
  url: string | null;
  button_label: string | null;
  starts_at: string | null;
  created_at: string;
};

const NOTICE_FIELDS = "id,title,body,product_id,kind,url,button_label,starts_at,created_at";

export async function studentNotices(userId: string, area: Pick<Area, "id">) {
  const [list, seen] = await Promise.all([
    supabaseRest<Notice[]>(`/mp_notifications?area_id=eq.${area.id}&select=${NOTICE_FIELDS}&order=created_at.desc&limit=30`),
    supabaseRest<{ seen_at: string }[]>(`/mp_notification_seen?user_id=eq.${userId}&area_id=eq.${area.id}&select=seen_at`),
  ]);
  const seenAt = seen[0]?.seen_at || "1970-01-01T00:00:00Z";
  return { items: list, unread: list.filter((item) => item.created_at > seenAt).length };
}

export async function markNoticesSeen(userId: string, area: Pick<Area, "id">) {
  await supabaseRest("/mp_notification_seen?on_conflict=user_id,area_id", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({ user_id: userId, area_id: area.id, seen_at: new Date().toISOString() }),
  });
  return { ok: true };
}

// Próxima live (começa daqui pra frente ou começou há menos de 3 h): vira faixa no topo da área.
export async function nextLive(area: Pick<Area, "id">) {
  const since = new Date(Date.now() - 3 * 3600 * 1000).toISOString();
  const rows = await supabaseRest<Notice[]>(
    `/mp_notifications?area_id=eq.${area.id}&kind=eq.ao_vivo&starts_at=gte.${enc(since)}&select=${NOTICE_FIELDS}&order=starts_at.asc&limit=1`,
  );
  return rows[0] || null;
}

type NewNotice = {
  areaId: number;
  title: string;
  body?: string | null;
  productId?: string | null;
  moduleId?: string | null;
  slug?: string | null;
  kind?: string;
  url?: string | null;
  buttonLabel?: string | null;
  startsAt?: string | null;
  email?: boolean;
};

export function cleanUrl(value: unknown) {
  const url = String(value || "").trim();
  if (!url) return null;
  if (!/^https:\/\/[^\s]+$/i.test(url)) throw new OpError("O link precisa começar com https://");
  return url.slice(0, 500);
}

// Cria o aviso no sino, manda para todos os celulares com aviso ligado e, se pedido, por e-mail.
export async function createNotice(input: NewNotice) {
  const rows = await supabaseRest<Notice[]>("/mp_notifications", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      area_id: input.areaId,
      title: input.title.slice(0, 120),
      body: input.body?.slice(0, 300) || null,
      product_id: input.productId || null,
      module_id: input.moduleId || null,
      kind: input.kind || "aviso",
      url: input.url || null,
      button_label: input.buttonLabel?.slice(0, 40) || null,
      starts_at: input.startsAt || null,
    }),
  });
  const notice = rows[0];
  const area = await getAreaById(input.areaId);
  const home = areaUrl(area);
  const baseTarget = notice.url || (input.slug ? `${home}/?p=${enc(input.slug)}` : home);
  // UTM do padrão: e-mail e push saem com medium próprio; campaign = produto (ou tipo do aviso); content = id do aviso.
  const campaign = input.slug || notice.kind || "aviso";
  const tag = (medium: "aviso-email" | "aviso-push") => tagPlainLink(baseTarget, { medium, campaign, content: notice.id });
  const target = tag("aviso-push");
  const when = notice.starts_at ? `${whenText(notice.starts_at)}. ` : "";
  const sent = await pushAll(area.id, {
    title: notice.kind === "ao_vivo" ? `🔴 ${notice.title}` : notice.title,
    body: `${when}${notice.body || (notice.url ? "Toque para abrir." : "Toque para ver na sua área.")}`.slice(0, 240),
    url: target,
    tag: notice.id,
  }).catch((error) => {
    console.error("push", error);
    return 0;
  });
  const mail = input.email ? await emailAll(area, notice, tag("aviso-email")).catch((error) => ({ enviados: 0, falhas: 0, erro: String(error?.message || error) })) : null;
  await supabaseRest(`/mp_notifications?id=eq.${notice.id}`, {
    method: "PATCH",
    body: JSON.stringify({ push_sent: sent, email_sent: mail?.enviados || 0 }),
  }).catch(() => undefined);
  return { ...notice, push_enviados: sent, emails: mail };
}

// Módulo novo ganhou a 1ª aula num produto já publicado: um aviso por módulo (o índice único impede repetir).
export async function noticeNewModule(
  product: { id: string; area_id: number; slug: string; title: string; published?: boolean },
  mod: { id: string; title: string; release_days?: number },
) {
  if (!product.published || (mod.release_days || 0) > 0) return null;
  const exists = await supabaseRest<{ id: string }[]>(`/mp_notifications?module_id=eq.${mod.id}&kind=eq.modulo_novo&select=id`);
  if (exists.length) return null;
  return createNotice({
    areaId: product.area_id,
    title: `Módulo novo: ${mod.title}`,
    body: `Acabou de entrar em ${product.title}. Toque para assistir.`,
    productId: product.id,
    moduleId: mod.id,
    slug: product.slug,
    kind: "modulo_novo",
  }).catch((error) => {
    console.error("aviso módulo novo", error);
    return null;
  });
}

// ---------------------------------------------------------------- e-mail (Brevo)

const TZ = "America/Sao_Paulo";

export function whenText(iso: string) {
  const date = new Date(iso);
  const day = date.toLocaleDateString("pt-BR", { timeZone: TZ, weekday: "long", day: "2-digit", month: "2-digit" });
  const hour = date.toLocaleTimeString("pt-BR", { timeZone: TZ, hour: "2-digit", minute: "2-digit" }).replace(":00", "h").replace(":", "h");
  const today = new Date().toLocaleDateString("pt-BR", { timeZone: TZ });
  const tomorrow = new Date(Date.now() + 86400000).toLocaleDateString("pt-BR", { timeZone: TZ });
  const label = date.toLocaleDateString("pt-BR", { timeZone: TZ });
  const prefix = label === today ? "Hoje" : label === tomorrow ? "Amanhã" : day.charAt(0).toUpperCase() + day.slice(1);
  return `${prefix}, às ${hour}`;
}

// Todos os alunos: compradores com acesso ativo + cadastros grátis.
export async function studentEmails(area: Pick<Area, "id">) {
  const [access, leads] = await Promise.all([
    supabaseRest<{ email: string }[]>(`/mp_access?status=eq.active&select=email,mp_products!inner(area_id)&mp_products.area_id=eq.${area.id}`),
    supabaseRest<{ email: string }[]>(`/mp_leads?area_id=eq.${area.id}&select=email`),
  ]);
  return [...new Set([...access, ...leads].map((row) => row.email.trim().toLowerCase()).filter((email) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)))];
}

const esc = (text: string) => text.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] as string);

export function noticeEmailHtml(notice: Notice, target: string, area: Pick<Area, "id" | "slug" | "brand_name" | "logo_url"> = { id: MAIN_AREA_ID, slug: "", brand_name: "Gênio Play", logo_url: null }) {
  const live = notice.kind === "ao_vivo";
  const font = "font-family:Sora,'Segoe UI',Helvetica,Arial,sans-serif;";
  const kicker = live ? "🔴 AO VIVO" : esc(area.brand_name.toUpperCase());
  const home = areaUrl(area);
  const icon = isMainArea(area) || !area.logo_url ? `${MEMBROS_URL}/membros/app/icone-192.png` : area.logo_url;
  const when = notice.starts_at ? `<tr><td align="center" style="padding:14px 36px 0;${font}font-size:16px;font-weight:700;color:#ffd27a;">${esc(whenText(notice.starts_at))} (horário de Brasília)</td></tr>` : "";
  const body = notice.body ? `<tr><td align="center" style="padding:12px 36px 0;${font}font-size:15px;line-height:24px;color:#9aa2b8;">${esc(notice.body).replace(/\n/g, "<br>")}</td></tr>` : "";
  const label = esc(notice.button_label || (live ? "Entrar na live" : "Abrir"));
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="dark"><title>${esc(notice.title)}</title></head>
<body style="margin:0;padding:0;background-color:#0a0c12;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#0a0c12;"><tr><td align="center" style="padding:40px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;background-color:#121622;border:1px solid #262c3d;border-radius:24px;">
<tr><td align="center" style="padding:36px 36px 0;"><img src="${esc(icon)}" height="64" alt="" style="display:block;border:0;border-radius:16px;max-width:240px;"></td></tr>
<tr><td align="center" style="padding:14px 36px 0;${font}font-size:11px;font-weight:600;letter-spacing:4px;color:${live ? "#ff5a5a" : "#f2b441"};">${kicker}</td></tr>
<tr><td align="center" style="padding:12px 36px 0;${font}font-size:25px;line-height:32px;font-weight:700;color:#eef0f6;">${esc(notice.title)}</td></tr>
${when}${body}
<tr><td align="center" style="padding:28px 36px 0;"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" bgcolor="#f2b441" style="border-radius:14px;background-color:#f2b441;">
<a href="${esc(target)}" target="_blank" style="display:inline-block;padding:16px 34px;${font}font-size:15px;font-weight:700;color:#1b1405;text-decoration:none;border-radius:14px;">${label} &rarr;</a></td></tr></table></td></tr>
<tr><td align="center" style="padding:28px 36px 32px;${font}font-size:12px;line-height:19px;color:#6b7390;">Você recebe este e-mail porque é aluno de ${esc(area.brand_name)}.<br>Área: <a href="${home}" style="color:#ffd27a;">${home.replace("https://", "")}</a></td></tr>
</table></td></tr></table></body></html>`;
}

async function emailAll(area: Area, notice: Notice, target: string) {
  // Áreas de produtores só mandam e-mail depois de ligado (plano pago do Brevo).
  if (!area.email_enabled) throw new OpError("E-mail de avisos ainda não está liberado nesta área.");
  const key = process.env.BREVO_API_KEY;
  if (!key) throw new OpError("E-mail ainda não configurado (falta BREVO_API_KEY na Vercel).");
  const emails = await studentEmails(area);
  const main = isMainArea(area);
  // Remetente: o domínio verificado no Brevo; o nome é o da área (produtor) e a resposta vai para o dono.
  // Área com remetente próprio (email_from, domínio verificado no Brevo) não mostra o domínio nem o e-mail do dono (ex.: Reforma, vendida sem o Brenno aparecer).
  const ownSender = !main && area.email_from ? area.email_from : null;
  const sender = { name: main ? process.env.MEMBROS_EMAIL_NOME || "Brenno Lima" : area.brand_name.slice(0, 60), email: ownSender || process.env.MEMBROS_EMAIL_DE || "material@brennolimaoficial.com" };
  const replyTo = ownSender
    ? area.email_reply_to || ownSender
    : main || !area.owner_email
      ? process.env.MEMBROS_EMAIL_RESPOSTA || "contato@brennolimaoficial.com"
      : area.owner_email;
  const subject = notice.kind === "ao_vivo" && notice.starts_at ? `🔴 ${notice.title} · ${whenText(notice.starts_at)}` : notice.title;
  const html = noticeEmailHtml(notice, target, area);
  const result = { enviados: 0, falhas: 0, total: emails.length, erro: "" };
  // Um destinatário por versão (ninguém vê o e-mail do outro), 50 por chamada.
  for (let i = 0; i < emails.length; i += 50) {
    const batch = emails.slice(i, i + 50);
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "api-key": key, "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({
        sender,
        replyTo: { email: replyTo },
        subject: subject.slice(0, 150),
        htmlContent: html,
        tags: ["genio-play", `area-${area.id}`, notice.kind],
        messageVersions: batch.map((email) => ({ to: [{ email }] })),
      }),
    });
    if (response.ok) result.enviados += batch.length;
    else {
      result.falhas += batch.length;
      result.erro = (await response.text()).slice(0, 200);
    }
  }
  return result;
}

// Produto novo publicado: um aviso por produto (o índice único impede repetir).
export async function noticeNewProduct(product: { id: string; area_id: number; slug: string; title: string; subtitle: string | null; is_free?: boolean }) {
  const exists = await supabaseRest<{ id: string }[]>(`/mp_notifications?product_id=eq.${product.id}&kind=eq.produto_novo&select=id`);
  if (exists.length) return null;
  return createNotice({
    areaId: product.area_id,
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

export async function savePushSub(user: { id: string; email: string }, sub: Sub, userAgent: string, area: Pick<Area, "id">) {
  if (!sub?.endpoint || !/^https:\/\//.test(sub.endpoint) || !sub.keys?.p256dh || !sub.keys?.auth) throw new OpError("Inscrição de aviso inválida.");
  await supabaseRest("/mp_push_subs?on_conflict=endpoint,area_id", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({ endpoint: sub.endpoint, area_id: area.id, user_id: user.id, email: user.email, p256dh: sub.keys.p256dh, auth: sub.keys.auth, user_agent: userAgent.slice(0, 200) }),
  });
  return { ok: true };
}

// Sem área: o celular desinstalou (vale para todas as áreas). Com área: desligou os avisos só daquela.
export async function removePushSub(endpoint: string, area?: Pick<Area, "id">) {
  await supabaseRest(`/mp_push_subs?endpoint=eq.${enc(endpoint)}${area ? `&area_id=eq.${area.id}` : ""}`, { method: "DELETE" });
  return { ok: true };
}

async function pushAll(areaId: number, payload: { title: string; body: string; url: string; tag: string }) {
  const { pub, priv } = await vapid();
  webpush.setVapidDetails(MEMBROS_URL, pub, priv);
  const subs = await supabaseRest<{ endpoint: string; p256dh: string; auth: string }[]>(`/mp_push_subs?area_id=eq.${areaId}&select=endpoint,p256dh,auth`);
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
