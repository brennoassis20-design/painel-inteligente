// Gênio Play: área de membros própria.
// Todas as operações de configuração passam pelo registro OPS abaixo, usado pelo
// painel de administração e pelo conector de IA (MCP). Assim os dois fazem sempre o mesmo.
import { createHash, randomBytes } from "node:crypto";
import { inviteBuyer, supabaseRest } from "@/lib/panel-server";
import { cleanUrl, createNotice, inviteBuyersWithoutAccount, listLeads, nextLive, noticeNewModule, noticeNewProduct, studentEmails, studentNotices } from "@/lib/membros-avisos";

const enc = encodeURIComponent;
const DAY_MS = 24 * 60 * 60 * 1000;

export const MEMBROS_URL = (process.env.MEMBROS_URL || "https://membros.bagencymidia.site").replace(/\/$/, "");

export type Settings = {
  id: number;
  // Endereço da área: membros.bagencymidia.site/<slug>. A área 1 (Gênio Play) também abre na raiz.
  slug: string;
  owner_email: string | null;
  // E-mail dos avisos (Brevo). Áreas de produtores começam desligadas.
  email_enabled: boolean;
  brand_name: string;
  logo_url: string | null;
  accent: string;
  hero_product_id: string | null;
  hero_title: string | null;
  hero_text: string | null;
  support_url: string | null;
  webhook_secret: string;
  hotmart_hottok: string | null;
  meta_pixel_id: string | null;
  bg_color: string;
  hero_image_url: string | null;
  hero_image_mobile_url: string | null;
  promo_enabled: boolean;
  promo_title: string;
  promo_text: string | null;
  promo_ends_at: string | null;
  promo_color: string;
  promo_card: boolean;
  promo_notify: boolean;
  promo_started_at: string | null;
  vapid_public?: string | null;
  vapid_private?: string | null;
  created_at: string;
  updated_at: string;
};

export type Product = {
  id: string;
  area_id: number;
  slug: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  cover_url: string | null;
  banner_url: string | null;
  trailer_youtube: string | null;
  color: string;
  price_cents: number | null;
  checkout_url: string | null;
  checkout_provider: string;
  sales_page_url: string | null;
  external_ids: string[];
  access_days: number | null;
  position: number;
  published: boolean;
  featured: boolean;
  badge: string | null;
  upsell_product_id: string | null;
  upsell_text: string | null;
  special: string | null;
  // Conteúdo gratuito: qualquer pessoa cadastrada assiste.
  is_free: boolean;
  // Promoção: vale só enquanto a promoção geral estiver ligada (mp_settings.promo_enabled e dentro do prazo).
  on_promo: boolean;
  promo_price_cents: number | null;
  promo_checkout_url: string | null;
  created_at: string;
  updated_at: string;
};

export type Module = {
  id: string;
  product_id: string;
  title: string;
  cover_url: string | null;
  position: number;
  release_days: number;
  created_at: string;
};

export type Lesson = {
  id: string;
  product_id: string;
  module_id: string;
  title: string;
  description: string | null;
  youtube_id: string | null;
  video_url: string | null;
  duration_min: number | null;
  materials: { titulo: string; url: string }[];
  position: number;
  free_preview: boolean;
  published: boolean;
  created_at: string;
  updated_at: string;
};

type AccessRow = { product_id: string; status: string; expires_at: string | null; created_at: string };

// ---------------------------------------------------------------- utilidades

export function slugify(text: string) {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function youtubeId(input: string | null | undefined) {
  const value = String(input || "").trim();
  if (!value) return null;
  if (/^[\w-]{11}$/.test(value)) return value;
  const match = value.match(/(?:youtu\.be\/|v=|embed\/|shorts\/|live\/)([\w-]{11})/);
  return match?.[1] || null;
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function now() {
  return new Date().toISOString();
}

function cleanEmail(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

export class OpError extends Error {}

function need<T>(value: T | null | undefined, message: string): T {
  if (value === null || value === undefined || value === "") throw new OpError(message);
  return value;
}

// ---------------------------------------------------------------- áreas (cada produtor tem a sua)

export type Area = Settings;
export const MAIN_AREA_ID = 1;

// Primeiro pedaço do caminho que nunca é nome de área.
// Inclui as rotas que já existem na raiz do site (elas ganhariam do endereço da área).
export const RESERVED_SLUGS = new Set([
  "admin", "gratis", "api", "membros", "app", "_next", "login", "entrar", "sair", "static", "public", "www",
  "brenno", "manual", "metodo-genio", "tools", "w", "icons", "genio-play", "favicon-ico", "gp-sw-js", "robots-txt",
]);

export function isMainArea(area: Pick<Area, "id">) {
  return area.id === MAIN_AREA_ID;
}

// Endereço público da área (a 1 continua na raiz).
export function areaUrl(area: Pick<Area, "id" | "slug">) {
  return isMainArea(area) ? MEMBROS_URL : `${MEMBROS_URL}/${area.slug}`;
}

// Área pelo slug (vazio = área 1). Slug que não existe dá erro: nunca cai na área de outro.
export async function getArea(slug?: string | null) {
  const value = String(slug || "").trim().toLowerCase();
  const filter = value ? `slug=eq.${enc(value)}` : `id=eq.${MAIN_AREA_ID}`;
  const rows = await supabaseRest<Area[]>(`/mp_settings?${filter}&select=*`);
  if (!rows[0]) throw new OpError("Área não encontrada.");
  return rows[0];
}

export async function getAreaById(id: number) {
  const rows = await supabaseRest<Area[]>(`/mp_settings?id=eq.${Number(id)}&select=*`);
  if (!rows[0]) throw new OpError("Área não encontrada.");
  return rows[0];
}

// Compatibilidade: configurações da área 1.
export async function getSettings() {
  return getAreaById(MAIN_AREA_ID);
}

// Dados públicos da área para a tela de entrada (antes do login): nome, logo, cores e pixel.
export function publicArea(area: Area) {
  return {
    slug: area.slug,
    main: isMainArea(area),
    brand_name: area.brand_name,
    logo_url: area.logo_url,
    accent: area.accent,
    bg_color: area.bg_color,
    meta_pixel_id: area.meta_pixel_id,
    support_url: area.support_url,
  };
}

// ---------------------------------------------------------------- leitura

export async function listProducts(area: Pick<Area, "id">, onlyPublished = false) {
  return supabaseRest<Product[]>(
    `/mp_products?area_id=eq.${area.id}&select=*${onlyPublished ? "&published=eq.true" : ""}&order=position.asc,created_at.asc`,
  );
}

// Produto pelo id ou slug, sempre dentro da área (produto de outra área = não encontrado).
export async function findProduct(area: Pick<Area, "id">, ref: string) {
  const value = need(String(ref || "").trim(), "Informe o produto (id ou slug).");
  const filter = isUuid(value) ? `id=eq.${value}` : `slug=eq.${enc(value)}`;
  const rows = await supabaseRest<Product[]>(`/mp_products?area_id=eq.${area.id}&${filter}&select=*`);
  if (!rows[0]) throw new OpError(`Produto não encontrado: ${value}`);
  return rows[0];
}

export async function productTree(productId: string) {
  const [modules, lessons] = await Promise.all([
    supabaseRest<Module[]>(`/mp_modules?product_id=eq.${productId}&select=*&order=position.asc,created_at.asc`),
    supabaseRest<Lesson[]>(`/mp_lessons?product_id=eq.${productId}&select=*&order=position.asc,created_at.asc`),
  ]);
  return modules.map((mod) => ({ ...mod, lessons: lessons.filter((lesson) => lesson.module_id === mod.id) }));
}

// Admin da área (ou da área 1, que administra a plataforma inteira).
export async function isAdmin(email: string, area: Pick<Area, "id">) {
  const rows = await supabaseRest<{ area_id: number }[]>(
    `/mp_admins?email=eq.${enc(cleanEmail(email))}&area_id=in.(${area.id},${MAIN_AREA_ID})&select=area_id`,
  );
  return rows.length > 0;
}

export async function isPlatformAdmin(email: string) {
  const rows = await supabaseRest<{ area_id: number }[]>(`/mp_admins?email=eq.${enc(cleanEmail(email))}&area_id=eq.${MAIN_AREA_ID}&select=area_id`);
  return rows.length > 0;
}

// ---------------------------------------------------------------- acesso do aluno

type AccessInfo = { since: string; expires_at: string | null };

export async function accessMap(email: string, products: Product[]) {
  const map = new Map<string, AccessInfo>();
  const rows = await supabaseRest<AccessRow[]>(
    `/mp_access?email=eq.${enc(cleanEmail(email))}&select=product_id,status,expires_at,created_at`,
  );
  const nowMs = Date.now();

  // Produto gratuito: liberado para todo mundo que tem conta (cadastro grátis ou comprador).
  for (const product of products) if (product.is_free) map.set(product.id, { since: product.created_at, expires_at: null });

  for (const row of rows) {
    if (row.status !== "active") continue;
    if (row.expires_at && new Date(row.expires_at).getTime() < nowMs) continue;
    map.set(row.product_id, { since: row.created_at, expires_at: row.expires_at });
  }

  // Quem tem o Painel Inteligente ativo (compra do Método Gênio pela Cakto) já tem o produto marcado como 'painel'.
  const painel = products.filter((product) => product.special === "painel" && !map.has(product.id));
  if (painel.length) {
    const ent = await supabaseRest<{ access_status: string; access_expires_at: string | null; created_at: string }[]>(
      `/entitlements?email=eq.${enc(cleanEmail(email))}&select=access_status,access_expires_at,created_at`,
    );
    const row = ent[0];
    const active = row?.access_status === "active" && (!row.access_expires_at || new Date(row.access_expires_at).getTime() > nowMs);
    if (active) painel.forEach((product) => map.set(product.id, { since: row.created_at, expires_at: row.access_expires_at }));
  }

  return map;
}

function moduleOpen(mod: Module, access: AccessInfo | undefined) {
  if (!access) return false;
  if (!mod.release_days) return true;
  return Date.now() >= new Date(access.since).getTime() + mod.release_days * DAY_MS;
}

export function promoActive(settings: Pick<Settings, "promo_enabled" | "promo_ends_at">) {
  return Boolean(settings.promo_enabled) && (!settings.promo_ends_at || new Date(settings.promo_ends_at).getTime() > Date.now());
}

function inPromo(product: Product, settings: Settings | null) {
  return Boolean(settings && promoActive(settings) && product.on_promo && product.promo_price_cents && product.price_cents && product.promo_price_cents < product.price_cents);
}

function publicProduct(product: Product, settings: Settings | null = null) {
  const promo = inPromo(product, settings);
  return {
    promo_price_cents: promo ? product.promo_price_cents : null,
    promo_off: promo && product.price_cents ? Math.round((1 - (product.promo_price_cents || 0) / product.price_cents) * 100) : null,
    id: product.id,
    slug: product.slug,
    title: product.title,
    subtitle: product.subtitle,
    description: product.description,
    cover_url: product.cover_url,
    banner_url: product.banner_url,
    trailer_youtube: product.trailer_youtube,
    color: product.color,
    price_cents: product.price_cents,
    badge: product.badge,
    featured: product.featured,
    special: product.special,
    sales_page_url: product.sales_page_url,
    has_checkout: Boolean(product.checkout_url),
    is_free: Boolean(product.is_free),
  };
}

export async function studentHome(user: { id: string; email: string }, area: Area) {
  const settings = area;
  const products = await listProducts(area, true);
  const access = await accessMap(user.email, products);
  const ids = products.map((product) => product.id);
  const lessons = ids.length
    ? await supabaseRest<{ id: string; product_id: string; module_id: string; title: string; position: number }[]>(
        `/mp_lessons?published=eq.true&product_id=in.(${ids.join(",")})&select=id,product_id,module_id,title,position`,
      )
    : [];
  const progress = await supabaseRest<{ lesson_id: string; product_id: string; completed: boolean; updated_at: string }[]>(
    `/mp_progress?user_id=eq.${user.id}&select=lesson_id,product_id,completed,updated_at&order=updated_at.desc`,
  );

  const items = products.map((product) => {
    const own = lessons.filter((lesson) => lesson.product_id === product.id);
    const done = progress.filter((row) => row.product_id === product.id && row.completed).length;
    return {
      ...publicProduct(product, settings),
      owned: access.has(product.id),
      lessons_total: own.length,
      lessons_done: done,
    };
  });

  // Continue assistindo: última aula mexida em cada produto ainda não concluído.
  const seen = new Set<string>();
  const continueWatching = [];
  for (const row of progress) {
    if (seen.has(row.product_id) || !access.has(row.product_id)) continue;
    seen.add(row.product_id);
    const item = items.find((product) => product.id === row.product_id);
    if (!item || item.lessons_done >= item.lessons_total) continue;
    const lesson = lessons.find((entry) => entry.id === row.lesson_id);
    continueWatching.push({ product: item, lesson_id: row.lesson_id, lesson_title: lesson?.title || "" });
  }

  const hero = items.find((product) => product.id === settings.hero_product_id) || items.find((product) => product.featured) || null;

  return {
    settings: {
      slug: settings.slug,
      main: isMainArea(settings),
      brand_name: settings.brand_name,
      logo_url: settings.logo_url,
      accent: settings.accent,
      hero_title: settings.hero_title,
      hero_text: settings.hero_text,
      support_url: settings.support_url,
      meta_pixel_id: settings.meta_pixel_id,
      bg_color: settings.bg_color,
      hero_image_url: settings.hero_image_url,
      hero_image_mobile_url: settings.hero_image_mobile_url,
    },
    promo: promoActive(settings)
      ? { title: settings.promo_title, text: settings.promo_text, ends_at: settings.promo_ends_at, color: settings.promo_color, card: settings.promo_card }
      : null,
    hero,
    products: items,
    continueWatching,
    notices: await studentNotices(user.id, area).catch(() => ({ items: [], unread: 0 })),
    live: await nextLive(area).catch(() => null),
    isAdmin: await isAdmin(user.email, area),
  };
}

export async function studentProduct(user: { id: string; email: string }, area: Area, slug: string) {
  const settings = area;
  const product = await findProduct(area, slug);
  const admin = await isAdmin(user.email, area);
  if (!product.published && !admin) throw new OpError("Produto não encontrado.");
  const access = (await accessMap(user.email, [product])).get(product.id) || (admin ? { since: product.created_at, expires_at: null } : undefined);
  const tree = await productTree(product.id);
  const progress = await supabaseRest<{ lesson_id: string; completed: boolean }[]>(
    `/mp_progress?user_id=eq.${user.id}&product_id=eq.${product.id}&select=lesson_id,completed`,
  );
  const done = new Set(progress.filter((row) => row.completed).map((row) => row.lesson_id));

  const modules = tree.map((mod) => {
    const open = moduleOpen(mod, access);
    const releaseAt = access && mod.release_days ? new Date(new Date(access.since).getTime() + mod.release_days * DAY_MS).toISOString() : null;
    return {
      id: mod.id,
      title: mod.title,
      cover_url: mod.cover_url,
      open,
      release_at: open ? null : releaseAt,
      lessons: mod.lessons
        .filter((lesson) => lesson.published || admin)
        .map((lesson) => {
          const canWatch = open || lesson.free_preview;
          return {
            id: lesson.id,
            title: lesson.title,
            description: canWatch ? lesson.description : null,
            duration_min: lesson.duration_min,
            youtube_id: canWatch ? lesson.youtube_id : null,
            video_url: canWatch ? lesson.video_url : null,
            materials: canWatch ? lesson.materials : [],
            free_preview: lesson.free_preview,
            locked: !canWatch,
            completed: done.has(lesson.id),
          };
        }),
    };
  });

  let upsell = null;
  if (product.upsell_product_id) {
    const target = await supabaseRest<Product[]>(`/mp_products?id=eq.${product.upsell_product_id}&area_id=eq.${area.id}&published=eq.true&select=*`);
    if (target[0]) {
      const owned = (await accessMap(user.email, [target[0]])).has(target[0].id);
      if (!owned) upsell = { ...publicProduct(target[0], settings), text: product.upsell_text };
    }
  }

  return { product: { ...publicProduct(product, settings), owned: Boolean(access) }, modules, upsell };
}

export async function saveProgress(user: { id: string }, lessonId: string, completed: boolean) {
  const lessons = await supabaseRest<{ id: string; product_id: string }[]>(`/mp_lessons?id=eq.${enc(lessonId)}&select=id,product_id`);
  const lesson = lessons[0];
  if (!lesson) throw new OpError("Aula não encontrada.");
  await supabaseRest("/mp_progress?on_conflict=user_id,lesson_id", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({ user_id: user.id, lesson_id: lesson.id, product_id: lesson.product_id, completed, updated_at: now() }),
  });
  return { ok: true };
}

export async function logEvent(areaId: number, email: string | null, productId: string | null, kind: string, meta: Record<string, unknown> = {}) {
  await supabaseRest("/mp_events", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ area_id: areaId, email: email ? cleanEmail(email) : null, product_id: productId, kind, meta }),
  }).catch(() => undefined);
}

// Link do checkout com nome e e-mail já preenchidos e UTMs para medir a venda que sai da área.
// Padrão: utm_source=membros, utm_medium=area, utm_campaign={slug}, utm_content={cadeado|upsell}.
// Se o aluno chegou na área com UTMs (ex.: link de WhatsApp ou e-mail), elas têm prioridade.
const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"] as const;

export async function checkoutLink(
  user: { email: string; name?: string },
  area: Area,
  productRef: string,
  extra: { via?: string; utm?: Record<string, unknown> } = {},
) {
  const settings = area;
  const product = await findProduct(area, productRef);
  // Em promoção: usa o checkout com desconto (se cadastrado).
  const promo = inPromo(product, settings) && product.promo_checkout_url;
  const url = need(promo ? product.promo_checkout_url : product.checkout_url, "Este produto ainda não tem link de pagamento.");
  const link = new URL(url);
  link.searchParams.set("email", user.email);
  if (user.name) link.searchParams.set("name", user.name);
  const via = extra.via === "upsell" ? "upsell" : "cadeado";
  const tags: Record<string, string> = { utm_source: "membros", utm_medium: "area", utm_campaign: product.slug, utm_content: via };
  for (const key of UTM_KEYS) {
    const value = extra.utm?.[key];
    if (typeof value === "string" && value.trim()) tags[key] = value.trim().slice(0, 100);
  }
  for (const [key, value] of Object.entries(tags)) link.searchParams.set(key, value);
  if (product.checkout_provider === "hotmart") link.searchParams.set("sck", `membros_${via}`);
  await logEvent(area.id, user.email, product.id, "checkout_aberto", { provider: product.checkout_provider, promo: Boolean(promo), ...tags });
  return { url: link.toString(), provider: product.checkout_provider };
}

// ---------------------------------------------------------------- vendas (webhook universal)

export type SaleEvent = {
  provider: string;
  kind: "approved" | "refunded" | "pending" | "ignored";
  rawType: string;
  email: string;
  name?: string;
  externalIds: string[];
  orderId?: string;
};

// Venda que chegou pelo link de integração da área: só libera produtos daquela área.
export async function applySale(event: SaleEvent, area: Area) {
  if (!event.email) throw new OpError("Venda sem e-mail do comprador.");
  const ids = event.externalIds.filter(Boolean).map((id) => `${event.provider}:${id}`);
  if (!ids.length) return { matched: [] as string[] };

  const filter = `{${ids.map((id) => `"${id.replaceAll('"', "")}"`).join(",")}}`;
  const products = await supabaseRest<Product[]>(`/mp_products?area_id=eq.${area.id}&external_ids=ov.${enc(filter)}&select=*`);

  if (event.kind === "pending") {
    for (const product of products) await logEvent(area.id, event.email, product.id, "pagamento_gerado", { provider: event.provider });
    return { matched: products.map((product) => product.slug) };
  }
  if (event.kind === "ignored") return { matched: products.map((product) => product.slug) };

  for (const product of products) {
    const status = event.kind === "approved" ? "active" : "refunded";
    const expires = event.kind === "approved" && product.access_days ? new Date(Date.now() + product.access_days * DAY_MS).toISOString() : null;
    await supabaseRest("/mp_access?on_conflict=email,product_id", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify({
        email: event.email,
        product_id: product.id,
        status,
        expires_at: expires,
        provider: event.provider,
        order_id: event.orderId || null,
        updated_at: now(),
      }),
    });
    await logEvent(area.id, event.email, product.id, event.kind === "approved" ? "compra" : "reembolso", { provider: event.provider, order: event.orderId });

    // Produto do Método Gênio vendido fora da Cakto também libera o Painel Inteligente.
    // Prazo = access_days do produto (padrão 1 ano + 7 dias; 36500+ = vitalício). Nunca encurta um acesso maior.
    // Reembolso de complemento (produto oculto, ex.: Vitalício) não derruba o Painel do Gênio: fica para revisão.
    if (product.special === "painel" && isMainArea(area) && event.provider !== "cakto") {
      if (event.kind !== "approved" && !product.published) {
        await logEvent(area.id, event.email, product.id, "reembolso_complemento_revisar", { provider: event.provider, order: event.orderId });
        continue;
      }
      const days = product.access_days || 372;
      const accessStatus = event.kind === "approved" ? "active" : "refunded";
      let until: string | null = null;
      if (event.kind === "approved") {
        until = days >= 36500 ? "2099-12-31T23:59:59.000Z" : new Date(Date.now() + days * DAY_MS).toISOString();
        const current = await supabaseRest<{ access_status: string; access_expires_at: string | null }[]>(
          `/entitlements?email=eq.${enc(event.email)}&select=access_status,access_expires_at`,
        );
        const old = current[0];
        if (old?.access_status === "active" && old.access_expires_at && old.access_expires_at > until) until = old.access_expires_at;
      }
      await supabaseRest("/entitlements?on_conflict=email", {
        method: "POST",
        headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
        body: JSON.stringify({ email: event.email, access_status: accessStatus, access_expires_at: until, last_event_type: `${event.provider}:${event.rawType}`, updated_at: now() }),
      });
      await supabaseRest(`/profiles?email=eq.${enc(event.email)}`, {
        method: "PATCH",
        body: JSON.stringify({ access_status: accessStatus, access_expires_at: until, updated_at: now() }),
      });
    }
  }

  let account = "unchanged";
  if (event.kind === "approved" && products.length) {
    account = await inviteToArea(area, event.email, event.name).catch(() => "invite_failed");
  }
  return { matched: products.map((product) => product.slug), account };
}

// ---------------------------------------------------------------- chaves do conector de IA

function hashKey(key: string) {
  return createHash("sha256").update(key).digest("hex");
}

export async function createApiKey(area: Pick<Area, "id">, name: string) {
  const key = `gp_${randomBytes(24).toString("base64url")}`;
  await supabaseRest("/mp_api_keys", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ area_id: area.id, name: name || "Conector de IA", prefix: key.slice(0, 9), key_hash: hashKey(key) }),
  });
  return key;
}

export async function listApiKeys(area: Pick<Area, "id">) {
  return supabaseRest<{ id: string; name: string; prefix: string; created_at: string; last_used_at: string | null; revoked_at: string | null }[]>(
    `/mp_api_keys?area_id=eq.${area.id}&select=id,name,prefix,created_at,last_used_at,revoked_at&order=created_at.desc`,
  );
}

export async function revokeApiKey(area: Pick<Area, "id">, id: string) {
  await supabaseRest(`/mp_api_keys?id=eq.${enc(id)}&area_id=eq.${area.id}`, { method: "PATCH", body: JSON.stringify({ revoked_at: now() }) });
  return { ok: true };
}

// Chave do conector de IA → área dela (null = inválida ou revogada).
export async function verifyApiKey(key: string) {
  if (!key || !key.startsWith("gp_")) return null;
  const rows = await supabaseRest<{ id: string; area_id: number; revoked_at: string | null }[]>(`/mp_api_keys?key_hash=eq.${hashKey(key)}&select=id,area_id,revoked_at`);
  const row = rows[0];
  if (!row || row.revoked_at) return null;
  await supabaseRest(`/mp_api_keys?id=eq.${row.id}`, { method: "PATCH", body: JSON.stringify({ last_used_at: now() }) }).catch(() => undefined);
  return getAreaById(row.area_id);
}

// Convite (criar senha) que leva para a área certa, com o nome dela no e-mail.
export async function inviteToArea(area: Area, email: string, name?: string, path = "") {
  const extra = isMainArea(area) && !path ? undefined : { area_nome: area.brand_name, area_url: areaUrl(area) };
  return inviteBuyer(email, name, `${areaUrl(area)}${path}`, extra);
}

// ---------------------------------------------------------------- operações (admin + IA)

type Args = Record<string, unknown>;
type Op = {
  description: string;
  input: Record<string, unknown>;
  required?: string[];
  // main = só a área 1 (Gênio Play): coisas do Painel Inteligente e a criação de áreas de produtores.
  main?: boolean;
  run: (args: Args, area: Area) => Promise<unknown>;
};

const str = (description: string) => ({ type: "string", description });
const num = (description: string) => ({ type: "number", description });
const bool = (description: string) => ({ type: "boolean", description });
const confirmar = bool("Precisa ser true. Antes, mostre ao usuário o que vai mudar e peça confirmação.");

const PRODUCT_FIELDS = {
  titulo: str("Nome do produto. Evite as palavras guia, ebook, apostila e leitura."),
  slug: str("Endereço curto (opcional; criado a partir do título)."),
  subtitulo: str("Frase curta abaixo do título."),
  descricao: str("Descrição mostrada na página do produto e no cadeado."),
  capa_url: str("Imagem vertical 2:3 (URL pública)."),
  banner_url: str("Imagem horizontal 16:9 para o destaque da tela inicial (URL pública)."),
  trailer_youtube: str("Link ou id do YouTube do trailer."),
  cor: str("Cor de destaque em hexadecimal, ex.: #F2B441."),
  preco: num("Preço em reais, ex.: 27 ou 9.9."),
  checkout_url: str("Link do checkout (Hotmart, Cakto ou outro)."),
  checkout_plataforma: str("hotmart, cakto, greenn, kiwify, asaas..."),
  pagina_vendas_url: str("Link da página de vendas (opcional)."),
  ids_externos: { type: "array", items: { type: "string" }, description: 'Ids do produto nas plataformas, no formato "plataforma:id" (ex.: "hotmart:1234567"). É assim que a venda libera o acesso.' },
  dias_de_acesso: num("Dias de acesso após a compra. Deixe vazio para vitalício."),
  publicado: bool("true = aparece na vitrine."),
  destaque: bool("true = pode aparecer no banner da tela inicial."),
  selo: str("Etiqueta curta no card, ex.: Novo, Mais vendido."),
  posicao: num("Ordem na vitrine (menor primeiro)."),
  especial: str("'painel' se o produto também libera o Painel Inteligente (Método Gênio). Vazio nos demais."),
  gratuito: bool("true = conteúdo gratuito: qualquer pessoa cadastrada (cadastro grátis) assiste. Os pagos aparecem com cadeado."),
  em_promocao: bool("true = entra na promoção (vale enquanto a promoção geral estiver ligada)."),
  preco_promocional: num("Preço com desconto em reais (menor que o preço normal)."),
  checkout_promocional: str("Link do checkout que cobra o preço com desconto. Sem ele, o aluno cai no checkout normal (preço cheio)."),
};

function productBody(args: Args, partial: boolean) {
  const body: Record<string, unknown> = {};
  const set = (key: string, value: unknown) => {
    if (value !== undefined) body[key] = value === "" ? null : value;
  };
  set("title", args.titulo);
  if (args.slug !== undefined) body.slug = slugify(String(args.slug));
  else if (!partial && args.titulo) body.slug = slugify(String(args.titulo));
  set("subtitle", args.subtitulo);
  set("description", args.descricao);
  set("cover_url", args.capa_url);
  set("banner_url", args.banner_url);
  if (args.trailer_youtube !== undefined) body.trailer_youtube = youtubeId(String(args.trailer_youtube));
  set("color", args.cor);
  if (args.preco !== undefined) body.price_cents = args.preco === null || args.preco === "" ? null : Math.round(Number(args.preco) * 100);
  set("checkout_url", args.checkout_url);
  if (args.checkout_plataforma !== undefined) body.checkout_provider = String(args.checkout_plataforma || "hotmart").toLowerCase();
  set("sales_page_url", args.pagina_vendas_url);
  if (args.ids_externos !== undefined) body.external_ids = (Array.isArray(args.ids_externos) ? args.ids_externos : []).map((id) => String(id).trim()).filter(Boolean);
  if (args.dias_de_acesso !== undefined) body.access_days = args.dias_de_acesso === null || args.dias_de_acesso === "" ? null : Number(args.dias_de_acesso);
  set("published", args.publicado);
  set("featured", args.destaque);
  set("badge", args.selo);
  set("position", args.posicao);
  set("special", args.especial);
  if (body.special && body.special !== "painel") throw new OpError("especial só aceita 'painel'.");
  if (args.gratuito !== undefined) body.is_free = Boolean(args.gratuito);
  if (args.em_promocao !== undefined) body.on_promo = Boolean(args.em_promocao);
  if (args.preco_promocional !== undefined) body.promo_price_cents = args.preco_promocional === null || args.preco_promocional === "" ? null : Math.round(Number(args.preco_promocional) * 100);
  set("promo_checkout_url", args.checkout_promocional);
  body.updated_at = now();
  return body;
}

async function nextPosition(table: string, filter: string) {
  const rows = await supabaseRest<{ position: number }[]>(`/${table}?${filter}select=position&order=position.desc&limit=1`);
  return (rows[0]?.position ?? -1) + 1;
}

// Módulo e aula só valem se o produto deles for da área (o join !inner filtra pela área do produto).
async function findModule(area: Pick<Area, "id">, ref: string, productId?: string) {
  const value = need(String(ref || "").trim(), "Informe o módulo.");
  const inArea = `select=*,mp_products!inner(area_id)&mp_products.area_id=eq.${area.id}`;
  const clean = (row: Module & { mp_products?: unknown }) => {
    const { mp_products: _join, ...mod } = row;
    void _join;
    return mod as Module;
  };
  if (isUuid(value)) {
    const rows = await supabaseRest<Module[]>(`/mp_modules?id=eq.${value}&${inArea}`);
    if (rows[0]) return clean(rows[0]);
  }
  if (productId) {
    const rows = await supabaseRest<Module[]>(`/mp_modules?product_id=eq.${productId}&title=ilike.${enc(value)}&${inArea}`);
    if (rows[0]) return clean(rows[0]);
  }
  throw new OpError(`Módulo não encontrado: ${value}`);
}

async function findLesson(area: Pick<Area, "id">, id: string) {
  const rows = await supabaseRest<(Lesson & { mp_products?: unknown })[]>(
    `/mp_lessons?id=eq.${enc(need(String(id || ""), "Informe a aula."))}&select=*,mp_products!inner(area_id)&mp_products.area_id=eq.${area.id}`,
  );
  if (!rows[0]) throw new OpError("Aula não encontrada.");
  const { mp_products: _join, ...lesson } = rows[0];
  void _join;
  return lesson as Lesson;
}

function lessonBody(args: Args) {
  const body: Record<string, unknown> = { updated_at: now() };
  if (args.titulo !== undefined) body.title = args.titulo;
  if (args.descricao !== undefined) body.description = args.descricao || null;
  if (args.youtube !== undefined) {
    const id = youtubeId(String(args.youtube));
    if (args.youtube && !id) throw new OpError("Não reconheci o link do YouTube.");
    body.youtube_id = id;
  }
  if (args.video_url !== undefined) body.video_url = args.video_url || null;
  if (args.duracao_min !== undefined) body.duration_min = args.duracao_min === null ? null : Number(args.duracao_min);
  if (args.materiais !== undefined) {
    const list = Array.isArray(args.materiais) ? args.materiais : [];
    body.materials = list
      .map((item) => item as Record<string, unknown>)
      .filter((item) => item?.url)
      .map((item) => ({ titulo: String(item.titulo || item.title || "Material"), url: String(item.url) }));
  }
  if (args.aula_gratis !== undefined) body.free_preview = Boolean(args.aula_gratis);
  if (args.publicada !== undefined) body.published = Boolean(args.publicada);
  if (args.posicao !== undefined) body.position = Number(args.posicao);
  return body;
}

const LESSON_FIELDS = {
  titulo: str("Título da aula."),
  youtube: str("Link ou id do vídeo no YouTube (pode ser não listado)."),
  video_url: str("Outro link de vídeo, se não for YouTube."),
  descricao: str("Texto abaixo do vídeo."),
  duracao_min: num("Duração em minutos."),
  materiais: { type: "array", items: { type: "object", properties: { titulo: { type: "string" }, url: { type: "string" } } }, description: "Arquivos para baixar: [{titulo, url}]." },
  aula_gratis: bool("true = quem não comprou também assiste (isca)."),
  publicada: bool("false = esconde dos alunos."),
  posicao: num("Ordem dentro do módulo."),
};

export const OPS: Record<string, Op> = {
  resumo_area: {
    description: "Resumo da área de membros: aparência, produtos, número de aulas e alunos, e o funil dos últimos 30 dias.",
    input: {},
    run: async (_args, area) => {
      const settings = area;
      const products = await listProducts(area);
      const ids = products.map((product) => product.id).join(",") || "00000000-0000-0000-0000-000000000000";
      const [lessons, access, events] = await Promise.all([
        supabaseRest<{ product_id: string }[]>(`/mp_lessons?product_id=in.(${ids})&select=product_id`),
        supabaseRest<{ email: string; product_id: string; status: string }[]>(`/mp_access?product_id=in.(${ids})&select=email,product_id,status`),
        supabaseRest<{ kind: string; product_id: string | null }[]>(
          `/mp_events?area_id=eq.${area.id}&created_at=gte.${new Date(Date.now() - 30 * DAY_MS).toISOString()}&select=kind,product_id`,
        ),
      ]);
      const { webhook_secret: _secret, hotmart_hottok: _hottok, vapid_private: _vapid, ...visible } = settings;
      void _secret;
      void _hottok;
      void _vapid;
      return {
        area: { endereco: areaUrl(area), slug: area.slug },
        aparencia: visible,
        alunos_unicos: new Set(access.filter((row) => row.status === "active").map((row) => row.email)).size,
        produtos: products.map((product) => ({
          id: product.id,
          slug: product.slug,
          titulo: product.title,
          publicado: product.published,
          preco: product.price_cents === null ? null : product.price_cents / 100,
          checkout: product.checkout_provider,
          tem_checkout: Boolean(product.checkout_url),
          aulas: lessons.filter((lesson) => lesson.product_id === product.id).length,
          alunos: access.filter((row) => row.product_id === product.id && row.status === "active").length,
          funil_30d: {
            cadeado_aberto: events.filter((event) => event.product_id === product.id && event.kind === "cadeado_aberto").length,
            checkout_aberto: events.filter((event) => event.product_id === product.id && event.kind === "checkout_aberto").length,
            pagamento_gerado: events.filter((event) => event.product_id === product.id && event.kind === "pagamento_gerado").length,
            compras: events.filter((event) => event.product_id === product.id && event.kind === "compra").length,
          },
        })),
      };
    },
  },

  configurar_aparencia: {
    description: "Muda nome da área, logo, cor de destaque, produto do banner principal e textos do banner.",
    input: {
      nome: str("Nome da área (ex.: Gênio Play)."),
      logo_url: str("URL pública do logo."),
      cor: str("Cor de destaque em hexadecimal."),
      produto_destaque: str("Id ou slug do produto que aparece no banner da tela inicial."),
      titulo_banner: str("Título grande do banner (opcional; padrão = nome do produto)."),
      texto_banner: str("Texto do banner."),
      suporte_url: str("Link de suporte (WhatsApp ou página)."),
      pixel_meta: str("ID do pixel da Meta (Facebook) que mede a área; vazio desliga."),
      cor_fundo: str("Cor de fundo da área em hexadecimal (escura funciona melhor), ex.: #0A0C12."),
      capa_inicio: str("Capa da tela inicial no computador: 1920×1080 px (16:9). URL pública. Vazio = usa o banner do produto em destaque."),
      capa_inicio_celular: str("Capa da tela inicial no celular: 1080×1350 px (4:5). URL pública. Vazio = usa a do computador."),
    },
    run: async (args, area) => {
      const body: Record<string, unknown> = { updated_at: now() };
      if (args.nome !== undefined) body.brand_name = args.nome;
      if (args.logo_url !== undefined) body.logo_url = args.logo_url || null;
      if (args.cor !== undefined) body.accent = args.cor;
      if (args.produto_destaque !== undefined) body.hero_product_id = args.produto_destaque ? (await findProduct(area, String(args.produto_destaque))).id : null;
      if (args.titulo_banner !== undefined) body.hero_title = args.titulo_banner || null;
      if (args.texto_banner !== undefined) body.hero_text = args.texto_banner || null;
      if (args.suporte_url !== undefined) body.support_url = args.suporte_url || null;
      if (args.pixel_meta !== undefined) body.meta_pixel_id = String(args.pixel_meta || "").replace(/\D/g, "") || null;
      if (args.cor_fundo !== undefined) body.bg_color = /^#[0-9a-f]{6}$/i.test(String(args.cor_fundo)) ? args.cor_fundo : "#0A0C12";
      if (args.cor !== undefined && !/^#[0-9a-f]{6}$/i.test(String(args.cor))) throw new OpError("Cor dos botões inválida (use #RRGGBB).");
      if (args.capa_inicio !== undefined) body.hero_image_url = args.capa_inicio || null;
      if (args.capa_inicio_celular !== undefined) body.hero_image_mobile_url = args.capa_inicio_celular || null;
      await supabaseRest(`/mp_settings?id=eq.${area.id}`, { method: "PATCH", body: JSON.stringify(body) });
      return { ok: true };
    },
  },

  listar_produtos: {
    description: "Lista todos os produtos (publicados e rascunhos) com preço, checkout e ids externos.",
    input: {},
    run: async (_args, area) => listProducts(area),
  },

  ver_produto: {
    description: "Mostra um produto com seus módulos e aulas.",
    input: { produto: str("Id ou slug do produto.") },
    required: ["produto"],
    run: async (args, area) => {
      const product = await findProduct(area, String(args.produto));
      return { produto: product, modulos: await productTree(product.id) };
    },
  },

  criar_produto: {
    description: "Cria um produto na vitrine. Nasce como rascunho (publicado=false) a não ser que publicado=true. Ao publicar, todos os alunos recebem aviso (sino + celular).",
    input: { ...PRODUCT_FIELDS, avisar: bool("false = publica sem mandar aviso aos alunos (padrão: avisa).") },
    required: ["titulo"],
    run: async (args, area) => {
      need(args.titulo, "Informe o título.");
      const body = productBody(args, false);
      if (body.special && !isMainArea(area)) throw new OpError("Opção 'especial' não existe nesta área.");
      body.area_id = area.id;
      if (body.position === undefined) body.position = await nextPosition("mp_products", `area_id=eq.${area.id}&`);
      const rows = await supabaseRest<Product[]>("/mp_products", {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify(body),
      });
      // Já nasceu publicado: avisa todos os alunos (sino + celular).
      if (rows[0]?.published && args.avisar !== false) await noticeNewProduct(rows[0]);
      return rows[0];
    },
  },

  atualizar_produto: {
    description: "Altera campos de um produto (só os campos enviados mudam). Se um rascunho for publicado, todos os alunos recebem aviso (uma vez por produto).",
    input: { produto: str("Id ou slug do produto."), ...PRODUCT_FIELDS, avisar: bool("false = publica sem mandar aviso aos alunos (padrão: avisa).") },
    required: ["produto"],
    run: async (args, area) => {
      const product = await findProduct(area, String(args.produto));
      const changes = productBody(args, true);
      if (changes.special && !isMainArea(area)) throw new OpError("Opção 'especial' não existe nesta área.");
      const rows = await supabaseRest<Product[]>(`/mp_products?id=eq.${product.id}&area_id=eq.${area.id}`, {
        method: "PATCH",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify(changes),
      });
      // Rascunho virou publicado: avisa todos os alunos uma única vez por produto.
      if (!product.published && rows[0]?.published && args.avisar !== false) await noticeNewProduct(rows[0]);
      // Entrou na promoção com a promoção no ar: avisa (uma vez por produto em cada promoção).
      if (!product.on_promo && rows[0]?.on_promo && args.avisar !== false) await noticePromoProduct(rows[0], area);
      return rows[0];
    },
  },

  remover_produto: {
    description: "Apaga um produto com todos os módulos, aulas e acessos. Não tem volta.",
    input: { produto: str("Id ou slug."), confirmar },
    required: ["produto", "confirmar"],
    run: async (args, area) => {
      if (args.confirmar !== true) throw new OpError("Confirme com o usuário e envie confirmar=true.");
      const product = await findProduct(area, String(args.produto));
      await supabaseRest(`/mp_products?id=eq.${product.id}&area_id=eq.${area.id}`, { method: "DELETE" });
      return { ok: true, removido: product.slug };
    },
  },

  configurar_upsell: {
    description: "Define o produto oferecido no fim das aulas de outro produto (para quem ainda não tem).",
    input: {
      produto: str("Produto onde a oferta aparece (id ou slug)."),
      oferecer: str("Produto oferecido (id ou slug). Vazio remove a oferta."),
      texto: str("Chamada da oferta, ex.: Quem fez este também levou..."),
    },
    required: ["produto"],
    run: async (args, area) => {
      const product = await findProduct(area, String(args.produto));
      const target = args.oferecer ? await findProduct(area, String(args.oferecer)) : null;
      if (target && target.id === product.id) throw new OpError("O produto não pode oferecer a si mesmo.");
      await supabaseRest(`/mp_products?id=eq.${product.id}`, {
        method: "PATCH",
        body: JSON.stringify({ upsell_product_id: target?.id || null, upsell_text: args.texto ?? product.upsell_text, updated_at: now() }),
      });
      return { ok: true, produto: product.slug, oferece: target?.slug || null };
    },
  },

  criar_modulo: {
    description: "Cria um módulo dentro de um produto.",
    input: {
      produto: str("Id ou slug do produto."),
      titulo: str("Título do módulo."),
      capa_url: str("Imagem do módulo (opcional)."),
      liberar_apos_dias: num("Libera N dias depois da compra (0 = na hora)."),
      posicao: num("Ordem (opcional; vai para o fim)."),
    },
    required: ["produto", "titulo"],
    run: async (args, area) => {
      const product = await findProduct(area, String(args.produto));
      const rows = await supabaseRest<Module[]>("/mp_modules", {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({
          product_id: product.id,
          title: need(args.titulo, "Informe o título."),
          cover_url: args.capa_url || null,
          release_days: Number(args.liberar_apos_dias || 0),
          position: args.posicao ?? (await nextPosition("mp_modules", `product_id=eq.${product.id}&`)),
        }),
      });
      return rows[0];
    },
  },

  atualizar_modulo: {
    description: "Altera título, capa, liberação ou ordem de um módulo.",
    input: {
      modulo: str("Id do módulo."),
      titulo: str("Novo título."),
      capa_url: str("Nova capa."),
      liberar_apos_dias: num("Dias após a compra."),
      posicao: num("Ordem."),
    },
    required: ["modulo"],
    run: async (args, area) => {
      const mod = await findModule(area, String(args.modulo));
      const body: Record<string, unknown> = {};
      if (args.titulo !== undefined) body.title = args.titulo;
      if (args.capa_url !== undefined) body.cover_url = args.capa_url || null;
      if (args.liberar_apos_dias !== undefined) body.release_days = Number(args.liberar_apos_dias || 0);
      if (args.posicao !== undefined) body.position = Number(args.posicao);
      const rows = await supabaseRest<Module[]>(`/mp_modules?id=eq.${mod.id}`, {
        method: "PATCH",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify(body),
      });
      return rows[0];
    },
  },

  remover_modulo: {
    description: "Apaga um módulo e todas as aulas dele. Não tem volta.",
    input: { modulo: str("Id do módulo."), confirmar },
    required: ["modulo", "confirmar"],
    run: async (args, area) => {
      if (args.confirmar !== true) throw new OpError("Confirme com o usuário e envie confirmar=true.");
      const mod = await findModule(area, String(args.modulo));
      await supabaseRest(`/mp_modules?id=eq.${mod.id}`, { method: "DELETE" });
      return { ok: true };
    },
  },

  criar_aula: {
    description: "Cria uma aula. Informe o módulo pelo id ou pelo título; se o título não existir no produto, o módulo é criado.",
    input: {
      produto: str("Id ou slug do produto (opcional se 'modulo' for o id do módulo)."),
      modulo: str("Id ou título do módulo."),
      ...LESSON_FIELDS,
      avisar: bool("false = não avisa os alunos quando for a 1ª aula de um módulo novo (padrão: avisa)."),
    },
    required: ["modulo", "titulo"],
    run: async (args, area) => {
      // Sem produto: o módulo precisa ser um id, e o produto vem dele.
      const product = args.produto
        ? await findProduct(area, String(args.produto))
        : await findProduct(area, (await findModule(area, String(args.modulo))).product_id);
      let mod: Module;
      try {
        mod = await findModule(area, String(args.modulo), product.id);
      } catch {
        mod = (await OPS.criar_modulo.run({ produto: product.id, titulo: args.modulo }, area)) as Module;
      }
      const body = lessonBody(args);
      body.product_id = product.id;
      body.module_id = mod.id;
      if (body.position === undefined) body.position = await nextPosition("mp_lessons", `module_id=eq.${mod.id}&`);
      const rows = await supabaseRest<Lesson[]>("/mp_lessons", {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify(body),
      });
      // 1ª aula publicada de um módulo novo em produto já no ar: avisa os alunos (avisar=false pula).
      if (args.avisar !== false && rows[0]?.published !== false) {
        const live = await supabaseRest<{ id: string }[]>(`/mp_lessons?module_id=eq.${mod.id}&published=eq.true&select=id`).catch(() => []);
        if (live.length === 1) await noticeNewModule(product, mod);
      }
      return rows[0];
    },
  },

  atualizar_aula: {
    description: "Altera uma aula (só os campos enviados mudam). Para mudar de módulo, envie modulo.",
    input: { aula: str("Id da aula."), modulo: str("Id do novo módulo (opcional)."), ...LESSON_FIELDS, avisar: bool("false = não avisa se publicar a 1ª aula de um módulo (padrão: avisa).") },
    required: ["aula"],
    run: async (args, area) => {
      const lesson = await findLesson(area, String(args.aula));
      const body = lessonBody(args);
      if (args.modulo) {
        const mod = await findModule(area, String(args.modulo), lesson.product_id);
        body.module_id = mod.id;
        body.product_id = mod.product_id;
      }
      const rows = await supabaseRest<Lesson[]>(`/mp_lessons?id=eq.${lesson.id}`, {
        method: "PATCH",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify(body),
      });
      // Aula que estava escondida e foi publicada: se for a 1ª do módulo, avisa como módulo novo.
      if (!lesson.published && rows[0]?.published && args.avisar !== false) {
        const live = await supabaseRest<{ id: string }[]>(`/mp_lessons?module_id=eq.${rows[0].module_id}&published=eq.true&select=id`).catch(() => []);
        if (live.length === 1) await noticeNewModule(await findProduct(area, rows[0].product_id), await findModule(area, rows[0].module_id));
      }
      return rows[0];
    },
  },

  remover_aula: {
    description: "Apaga uma aula. Não tem volta.",
    input: { aula: str("Id da aula."), confirmar },
    required: ["aula", "confirmar"],
    run: async (args, area) => {
      if (args.confirmar !== true) throw new OpError("Confirme com o usuário e envie confirmar=true.");
      const lesson = await findLesson(area, String(args.aula));
      await supabaseRest(`/mp_lessons?id=eq.${lesson.id}`, { method: "DELETE" });
      return { ok: true };
    },
  },

  reordenar: {
    description: "Reordena produtos, módulos ou aulas: envie os ids na ordem desejada.",
    input: {
      tipo: { type: "string", enum: ["produtos", "modulos", "aulas"], description: "O que reordenar." },
      ids: { type: "array", items: { type: "string" }, description: "Ids na nova ordem." },
    },
    required: ["tipo", "ids"],
    run: async (args, area) => {
      const table = { produtos: "mp_products", modulos: "mp_modules", aulas: "mp_lessons" }[String(args.tipo)];
      if (!table) throw new OpError("tipo deve ser produtos, modulos ou aulas.");
      const ids = Array.isArray(args.ids) ? args.ids.map(String) : [];
      // Confere que todos os ids são desta área antes de mexer em qualquer um.
      for (const id of ids) {
        if (!isUuid(id)) throw new OpError(`Id inválido: ${id}`);
        if (table === "mp_products") await findProduct(area, id);
        else if (table === "mp_modules") await findModule(area, id);
        else await findLesson(area, id);
      }
      for (const [index, id] of ids.entries()) {
        await supabaseRest(`/${table}?id=eq.${enc(id)}`, { method: "PATCH", body: JSON.stringify({ position: index }) });
      }
      return { ok: true, total: ids.length };
    },
  },

  listar_alunos: {
    description: "Lista acessos (aluno × produto). Filtre por produto ou e-mail.",
    input: { produto: str("Id ou slug (opcional)."), email: str("E-mail (opcional)."), limite: num("Máximo de linhas (padrão 100).") },
    run: async (args, area) => {
      let filter = `&mp_products.area_id=eq.${area.id}`;
      if (args.produto) filter += `&product_id=eq.${(await findProduct(area, String(args.produto))).id}`;
      if (args.email) filter += `&email=eq.${enc(cleanEmail(args.email))}`;
      const limit = Math.min(Number(args.limite || 100), 1000);
      return supabaseRest(`/mp_access?select=email,status,expires_at,provider,created_at,mp_products!inner(slug,title,area_id)${filter}&order=created_at.desc&limit=${limit}`);
    },
  },

  liberar_acesso: {
    description: "Libera um produto para um e-mail (cortesia, troca, suporte). Envia convite se a pessoa ainda não tem conta.",
    input: { email: str("E-mail do aluno."), produto: str("Id ou slug."), dias: num("Dias de acesso (vazio = segue o produto)."), confirmar },
    required: ["email", "produto", "confirmar"],
    run: async (args, area) => {
      if (args.confirmar !== true) throw new OpError("Confirme com o usuário e envie confirmar=true.");
      const product = await findProduct(area, String(args.produto));
      const email = need(cleanEmail(args.email), "Informe o e-mail.");
      const days = args.dias ? Number(args.dias) : product.access_days;
      await supabaseRest("/mp_access?on_conflict=email,product_id", {
        method: "POST",
        headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
        body: JSON.stringify({ email, product_id: product.id, status: "active", expires_at: days ? new Date(Date.now() + days * DAY_MS).toISOString() : null, provider: "manual", updated_at: now() }),
      });
      const account = await inviteToArea(area, email).catch(() => "invite_failed");
      return { ok: true, email, produto: product.slug, conta: account };
    },
  },

  bloquear_acesso: {
    description: "Tira o acesso de um e-mail a um produto.",
    input: { email: str("E-mail do aluno."), produto: str("Id ou slug."), confirmar },
    required: ["email", "produto", "confirmar"],
    run: async (args, area) => {
      if (args.confirmar !== true) throw new OpError("Confirme com o usuário e envie confirmar=true.");
      const product = await findProduct(area, String(args.produto));
      await supabaseRest(`/mp_access?email=eq.${enc(cleanEmail(args.email))}&product_id=eq.${product.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "blocked", updated_at: now() }),
      });
      return { ok: true };
    },
  },
};

async function noticePromoProduct(product: Product, area: Area) {
  const settings = await getAreaById(area.id);
  if (!settings.promo_notify || !inPromo(product, settings) || !product.published) return null;
  const since = settings.promo_started_at || new Date(0).toISOString();
  const exists = await supabaseRest<{ id: string }[]>(`/mp_notifications?product_id=eq.${product.id}&kind=eq.promo&created_at=gte.${enc(since)}&select=id`);
  if (exists.length) return null;
  const brl = (cents: number) => (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  return createNotice({
    areaId: area.id,
    title: `${settings.promo_title}: ${product.title}`,
    body: `De ${brl(product.price_cents || 0)} por ${brl(product.promo_price_cents || 0)}. Toque para aproveitar.`,
    productId: product.id,
    slug: product.slug,
    kind: "promo",
  }).catch(() => null);
}

OPS.configurar_promocao = {
  description: "Liga/desliga a promoção (ex.: Black Friday) e define título, texto, data de fim, cor do preço, card no canto e avisos. Os produtos entram pela opção em_promocao + preco_promocional de cada produto. Ao ligar com avisos ativos, todos os alunos recebem um aviso.",
  input: {
    ligada: bool("true = promoção no ar."),
    titulo: str("Ex.: Black Friday."),
    texto: str("Frase curta do card, ex.: Só até domingo."),
    termina_em: str("Data/hora de fim (ISO, ex.: 2026-11-30T23:59:00-03:00). Vazio = sem prazo."),
    cor: str("Cor do preço com desconto, ex.: #22C55E."),
    card_no_canto: bool("true = mostra o card pequeno da promoção no canto da tela."),
    avisos: bool("true = manda aviso no sino e no celular ao ligar e quando um produto entra na promoção."),
  },
  run: async (args, area) => {
    const current = area;
    const body: Record<string, unknown> = { updated_at: now() };
    if (args.titulo !== undefined) body.promo_title = String(args.titulo || "Promoção").slice(0, 40);
    if (args.texto !== undefined) body.promo_text = args.texto ? String(args.texto).slice(0, 120) : null;
    if (args.termina_em !== undefined) {
      const date = args.termina_em ? new Date(String(args.termina_em)) : null;
      if (date && Number.isNaN(date.getTime())) throw new OpError("Data de fim inválida.");
      body.promo_ends_at = date ? date.toISOString() : null;
    }
    if (args.cor !== undefined) body.promo_color = /^#[0-9a-f]{6}$/i.test(String(args.cor)) ? args.cor : "#22C55E";
    if (args.card_no_canto !== undefined) body.promo_card = Boolean(args.card_no_canto);
    if (args.avisos !== undefined) body.promo_notify = Boolean(args.avisos);
    const turningOn = args.ligada === true && !current.promo_enabled;
    if (args.ligada !== undefined) body.promo_enabled = Boolean(args.ligada);
    if (turningOn) body.promo_started_at = now();
    await supabaseRest(`/mp_settings?id=eq.${area.id}`, { method: "PATCH", body: JSON.stringify(body) });
    const settings = await getAreaById(area.id);
    let aviso = null;
    if (turningOn && settings.promo_notify && promoActive(settings)) {
      const products = (await listProducts(area, true)).filter((product) => inPromo(product, settings));
      const best = Math.max(0, ...products.map((product) => Math.round((1 - (product.promo_price_cents || 0) / (product.price_cents || 1)) * 100)));
      aviso = await createNotice({
        areaId: area.id,
        title: `${settings.promo_title} no ar${best ? `: até ${best}% off` : ""}`,
        body: settings.promo_text || `${products.length} produto(s) com desconto. Toque para ver.`,
        kind: "promo_geral",
      }).catch(() => null);
    }
    return { ok: true, promocao_no_ar: promoActive(settings), aviso_enviado: Boolean(aviso) };
  },
};

OPS.enviar_notificacao = {
  description:
    "Manda um aviso para TODOS os alunos (cadastro grátis e compradores): aparece no sino da área, chega no celular de quem ligou os avisos e, com email=true, vai por e-mail. Para live/conteúdo ao vivo use ao_vivo=true + quando + link: aparece também como faixa no topo da área até 3 h depois do início.",
  input: {
    titulo: str("Título curto do aviso (ex.: Live: como escalar o seu produto)."),
    texto: str("Texto do aviso (opcional)."),
    produto: str("Id ou slug do produto que abre ao tocar (opcional; ignorado se tiver link)."),
    link: str("Link que abre ao tocar (https://...), ex.: YouTube, Instagram, Meet, grupo de WhatsApp."),
    botao: str("Texto do botão (ex.: Entrar na live). Opcional."),
    ao_vivo: bool("true = é uma live / conteúdo ao vivo."),
    quando: str("Data e hora da live em ISO com fuso (ex.: 2026-11-20T20:00:00-03:00). Obrigatório se ao_vivo=true."),
    email: bool("true = manda também por e-mail para todos os alunos."),
    confirmar,
  },
  required: ["titulo", "confirmar"],
  run: async (args, area) => {
    if (args.confirmar !== true) throw new OpError("Confirme com o usuário e envie confirmar=true.");
    const live = args.ao_vivo === true;
    let startsAt: string | null = null;
    if (args.quando) {
      const date = new Date(String(args.quando));
      if (Number.isNaN(date.getTime())) throw new OpError("Data/hora inválida.");
      startsAt = date.toISOString();
    }
    if (live && !startsAt) throw new OpError("Informe quando a live começa.");
    const url = cleanUrl(args.link);
    if (live && !url) throw new OpError("Informe o link da live.");
    const product = args.produto && !url ? await findProduct(area, String(args.produto)) : null;
    return createNotice({
      areaId: area.id,
      title: String(need(args.titulo, "Informe o título.")),
      body: args.texto ? String(args.texto) : null,
      productId: product?.id,
      slug: product?.slug,
      kind: live ? "ao_vivo" : "aviso",
      url,
      buttonLabel: args.botao ? String(args.botao) : null,
      startsAt,
      email: args.email === true,
    });
  },
};

OPS.listar_notificacoes = {
  description: "Lista os últimos avisos enviados e quantos celulares receberam cada um.",
  input: {},
  run: async (_args, area) => supabaseRest(`/mp_notifications?area_id=eq.${area.id}&select=id,title,body,kind,url,starts_at,push_sent,email_sent,created_at,mp_products(slug,title)&order=created_at.desc&limit=50`),
};

OPS.listar_cadastros_gratis = {
  description: "Lista quem se cadastrou grátis (nome, e-mail, WhatsApp, UTM de origem), mais recentes primeiro.",
  input: { limite: num("Máximo de linhas (padrão 200).") },
  run: async (args, area) => {
    const [leads, subs, emails] = await Promise.all([
      listLeads(area, Number(args.limite || 200)),
      supabaseRest<{ email: string }[]>(`/mp_push_subs?area_id=eq.${area.id}&select=email`),
      studentEmails(area).catch(() => []),
    ]);
    const withPush = new Set(subs.map((row) => row.email));
    return { total: leads.length, celulares_com_aviso: subs.length, alunos_com_email: emails.length, email_ligado: area.email_enabled, cadastros: leads.map((lead) => ({ ...lead, aviso_no_celular: withPush.has(lead.email) })) };
  },
};

OPS.convidar_compradores = {
  description: "Manda o e-mail de convite (criar senha) para todo comprador com acesso ativo que ainda não tem conta. Quem já tem conta não recebe nada. Até 80 por vez (limite de e-mails por hora).",
  input: { confirmar },
  required: ["confirmar"],
  run: async (args, area) => {
    if (args.confirmar !== true) throw new OpError("Confirme com o usuário e envie confirmar=true.");
    return inviteBuyersWithoutAccount(area, 80);
  },
};

// ---------------------------------------------------------------- áreas de produtores (só a área 1)

OPS.listar_areas = {
  description: "Lista as áreas de membros de produtores (nome, endereço, dono, produtos e alunos).",
  input: {},
  main: true,
  run: async () => {
    const areas = await supabaseRest<Area[]>("/mp_settings?select=*&order=id.asc");
    const products = await supabaseRest<{ id: string; area_id: number }[]>("/mp_products?select=id,area_id");
    const access = await supabaseRest<{ email: string; mp_products: { area_id: number } }[]>("/mp_access?status=eq.active&select=email,mp_products!inner(area_id)");
    return areas.map((area) => ({
      id: area.id,
      nome: area.brand_name,
      slug: area.slug,
      endereco: areaUrl(area),
      dono: area.owner_email,
      email_avisos_ligado: area.email_enabled,
      produtos: products.filter((row) => row.area_id === area.id).length,
      alunos: new Set(access.filter((row) => row.mp_products.area_id === area.id).map((row) => row.email)).size,
      criada_em: area.created_at,
    }));
  },
};

OPS.criar_area = {
  description:
    "Cria a área de membros de um produtor (por convite). O endereço fica membros.bagencymidia.site/<slug> (slug sai do nome). O dono vira administrador da área e recebe por e-mail o convite para criar a senha (quem já tem conta só entra). E-mail de avisos começa desligado.",
  input: {
    nome: str("Nome da área (ex.: Academia do Daniel)."),
    slug: str("Endereço curto (opcional; sai do nome)."),
    email_dono: str("E-mail do produtor dono da área."),
    cor: str("Cor dos botões em hexadecimal (opcional)."),
    confirmar,
  },
  required: ["nome", "email_dono", "confirmar"],
  main: true,
  run: async (args) => {
    if (args.confirmar !== true) throw new OpError("Confirme com o usuário e envie confirmar=true.");
    const name = String(need(args.nome, "Informe o nome da área.")).trim().slice(0, 60);
    const slug = slugify(String(args.slug || name)).slice(0, 40);
    const owner = need(cleanEmail(args.email_dono), "Informe o e-mail do produtor.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(owner)) throw new OpError("E-mail do produtor inválido.");
    if (slug.length < 3) throw new OpError("O endereço precisa ter pelo menos 3 letras.");
    if (RESERVED_SLUGS.has(slug)) throw new OpError(`O endereço "${slug}" é reservado. Escolha outro.`);
    const taken = await supabaseRest<{ id: number }[]>(`/mp_settings?slug=eq.${enc(slug)}&select=id`);
    if (taken.length) throw new OpError(`Já existe uma área com o endereço "${slug}".`);
    const color = /^#[0-9a-f]{6}$/i.test(String(args.cor || "")) ? String(args.cor) : "#F2B441";
    const rows = await supabaseRest<Area[]>("/mp_settings", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ slug, brand_name: name, owner_email: owner, accent: color, email_enabled: false, promo_enabled: false }),
    });
    const area = rows[0];
    await supabaseRest("/mp_admins?on_conflict=email,area_id", {
      method: "POST",
      headers: { Prefer: "resolution=ignore-duplicates,return=minimal" },
      body: JSON.stringify({ email: owner, area_id: area.id }),
    });
    const conta = await inviteToArea(area, owner, undefined, "/admin").catch(() => "invite_failed");
    return {
      ok: true,
      area: { id: area.id, nome: area.brand_name, slug: area.slug },
      endereco_alunos: areaUrl(area),
      endereco_admin: `${areaUrl(area)}/admin`,
      convite: conta === "invited" ? "enviado (criar senha)" : conta === "existing" ? "já tem conta: é só entrar com o e-mail e a senha" : "falhou",
    };
  },
};

OPS.adicionar_admin_area = {
  description: "Dá acesso de administrador de uma área a mais um e-mail (sócio, editor).",
  input: { area: str("Slug da área."), email: str("E-mail."), confirmar },
  required: ["area", "email", "confirmar"],
  main: true,
  run: async (args) => {
    if (args.confirmar !== true) throw new OpError("Confirme com o usuário e envie confirmar=true.");
    const area = await getArea(String(args.area || ""));
    const email = need(cleanEmail(args.email), "Informe o e-mail.");
    await supabaseRest("/mp_admins?on_conflict=email,area_id", {
      method: "POST",
      headers: { Prefer: "resolution=ignore-duplicates,return=minimal" },
      body: JSON.stringify({ email, area_id: area.id }),
    });
    const conta = await inviteToArea(area, email, undefined, "/admin").catch(() => "invite_failed");
    return { ok: true, area: area.slug, email, conta };
  },
};

OPS.ligar_email_area = {
  description: "Liga ou desliga o envio de avisos por e-mail (Brevo) de uma área. Ligar só quando o plano pago do Brevo estiver ativo.",
  input: { area: str("Slug da área."), ligado: bool("true = liga."), confirmar },
  required: ["area", "ligado", "confirmar"],
  main: true,
  run: async (args) => {
    if (args.confirmar !== true) throw new OpError("Confirme com o usuário e envie confirmar=true.");
    const area = await getArea(String(args.area || ""));
    await supabaseRest(`/mp_settings?id=eq.${area.id}`, { method: "PATCH", body: JSON.stringify({ email_enabled: args.ligado === true }) });
    return { ok: true, area: area.slug, email_ligado: args.ligado === true };
  },
};

function opsFor(area: Pick<Area, "id">) {
  return Object.entries(OPS).filter(([, op]) => !op.main || isMainArea(area));
}

export function opsAsTools(area: Pick<Area, "id">) {
  return opsFor(area).map(([name, op]) => ({
    name,
    description: op.description,
    inputSchema: { type: "object", properties: op.input, ...(op.required?.length ? { required: op.required } : {}) },
  }));
}

export async function runOp(name: string, args: Args, area: Area) {
  const op = OPS[name];
  if (!op || (op.main && !isMainArea(area))) throw new OpError(`Operação desconhecida: ${name}`);
  return op.run(args || {}, area);
}
