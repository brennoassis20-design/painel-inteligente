// Gênio Play: área de membros própria.
// Todas as operações de configuração passam pelo registro OPS abaixo, usado pelo
// painel de administração e pelo conector de IA (MCP). Assim os dois fazem sempre o mesmo.
import { createHash, randomBytes } from "node:crypto";
import { inviteBuyer, supabaseRest } from "@/lib/panel-server";
import { createNotice, inviteBuyersWithoutAccount, listLeads, noticeNewProduct, studentNotices } from "@/lib/membros-avisos";

const enc = encodeURIComponent;
const DAY_MS = 24 * 60 * 60 * 1000;

export const MEMBROS_URL = (process.env.MEMBROS_URL || "https://membros.bagencymidia.site").replace(/\/$/, "");

export type Settings = {
  id: number;
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
  updated_at: string;
};

export type Product = {
  id: string;
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

// ---------------------------------------------------------------- leitura

export async function getSettings() {
  const rows = await supabaseRest<Settings[]>("/mp_settings?id=eq.1&select=*");
  return rows[0];
}

export async function listProducts(onlyPublished = false) {
  return supabaseRest<Product[]>(
    `/mp_products?select=*${onlyPublished ? "&published=eq.true" : ""}&order=position.asc,created_at.asc`,
  );
}

export async function findProduct(ref: string) {
  const value = need(String(ref || "").trim(), "Informe o produto (id ou slug).");
  const filter = isUuid(value) ? `id=eq.${value}` : `slug=eq.${enc(value)}`;
  const rows = await supabaseRest<Product[]>(`/mp_products?${filter}&select=*`);
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

export async function isAdmin(email: string) {
  const rows = await supabaseRest<{ email: string }[]>(`/mp_admins?email=eq.${enc(cleanEmail(email))}&select=email`);
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

function publicProduct(product: Product) {
  return {
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

export async function studentHome(user: { id: string; email: string }) {
  const [settings, products] = await Promise.all([getSettings(), listProducts(true)]);
  const access = await accessMap(user.email, products);
  const lessons = await supabaseRest<{ id: string; product_id: string; module_id: string; title: string; position: number }[]>(
    `/mp_lessons?published=eq.true&select=id,product_id,module_id,title,position`,
  );
  const progress = await supabaseRest<{ lesson_id: string; product_id: string; completed: boolean; updated_at: string }[]>(
    `/mp_progress?user_id=eq.${user.id}&select=lesson_id,product_id,completed,updated_at&order=updated_at.desc`,
  );

  const items = products.map((product) => {
    const own = lessons.filter((lesson) => lesson.product_id === product.id);
    const done = progress.filter((row) => row.product_id === product.id && row.completed).length;
    return {
      ...publicProduct(product),
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
      brand_name: settings.brand_name,
      logo_url: settings.logo_url,
      accent: settings.accent,
      hero_title: settings.hero_title,
      hero_text: settings.hero_text,
      support_url: settings.support_url,
      meta_pixel_id: settings.meta_pixel_id,
    },
    hero,
    products: items,
    continueWatching,
    notices: await studentNotices(user.id).catch(() => ({ items: [], unread: 0 })),
    isAdmin: await isAdmin(user.email),
  };
}

export async function studentProduct(user: { id: string; email: string }, slug: string) {
  const product = await findProduct(slug);
  const admin = await isAdmin(user.email);
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
    const target = await supabaseRest<Product[]>(`/mp_products?id=eq.${product.upsell_product_id}&published=eq.true&select=*`);
    if (target[0]) {
      const owned = (await accessMap(user.email, [target[0]])).has(target[0].id);
      if (!owned) upsell = { ...publicProduct(target[0]), text: product.upsell_text };
    }
  }

  return { product: { ...publicProduct(product), owned: Boolean(access) }, modules, upsell };
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

export async function logEvent(email: string | null, productId: string | null, kind: string, meta: Record<string, unknown> = {}) {
  await supabaseRest("/mp_events", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ email: email ? cleanEmail(email) : null, product_id: productId, kind, meta }),
  }).catch(() => undefined);
}

// Link do checkout com nome e e-mail já preenchidos e UTMs para medir a venda que sai da área.
// Padrão: utm_source=membros, utm_medium=area, utm_campaign={slug}, utm_content={cadeado|upsell}.
// Se o aluno chegou na área com UTMs (ex.: link de WhatsApp ou e-mail), elas têm prioridade.
const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"] as const;

export async function checkoutLink(
  user: { email: string; name?: string },
  productRef: string,
  extra: { via?: string; utm?: Record<string, unknown> } = {},
) {
  const product = await findProduct(productRef);
  const url = need(product.checkout_url, "Este produto ainda não tem link de pagamento.");
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
  await logEvent(user.email, product.id, "checkout_aberto", { provider: product.checkout_provider, ...tags });
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

export async function applySale(event: SaleEvent) {
  if (!event.email) throw new OpError("Venda sem e-mail do comprador.");
  const ids = event.externalIds.filter(Boolean).map((id) => `${event.provider}:${id}`);
  if (!ids.length) return { matched: [] as string[] };

  const filter = `{${ids.map((id) => `"${id.replaceAll('"', "")}"`).join(",")}}`;
  const products = await supabaseRest<Product[]>(`/mp_products?external_ids=ov.${enc(filter)}&select=*`);

  if (event.kind === "pending") {
    for (const product of products) await logEvent(event.email, product.id, "pagamento_gerado", { provider: event.provider });
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
    await logEvent(event.email, product.id, event.kind === "approved" ? "compra" : "reembolso", { provider: event.provider, order: event.orderId });

    // Produto do Método Gênio vendido fora da Cakto também libera o Painel Inteligente.
    // Prazo = access_days do produto (padrão 1 ano + 7 dias; 36500+ = vitalício). Nunca encurta um acesso maior.
    // Reembolso de complemento (produto oculto, ex.: Vitalício) não derruba o Painel do Gênio: fica para revisão.
    if (product.special === "painel" && event.provider !== "cakto") {
      if (event.kind !== "approved" && !product.published) {
        await logEvent(event.email, product.id, "reembolso_complemento_revisar", { provider: event.provider, order: event.orderId });
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
    account = await inviteBuyer(event.email, event.name, MEMBROS_URL).catch(() => "invite_failed");
  }
  return { matched: products.map((product) => product.slug), account };
}

// ---------------------------------------------------------------- chaves do conector de IA

function hashKey(key: string) {
  return createHash("sha256").update(key).digest("hex");
}

export async function createApiKey(name: string) {
  const key = `gp_${randomBytes(24).toString("base64url")}`;
  await supabaseRest("/mp_api_keys", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ name: name || "Conector de IA", prefix: key.slice(0, 9), key_hash: hashKey(key) }),
  });
  return key;
}

export async function listApiKeys() {
  return supabaseRest<{ id: string; name: string; prefix: string; created_at: string; last_used_at: string | null; revoked_at: string | null }[]>(
    "/mp_api_keys?select=id,name,prefix,created_at,last_used_at,revoked_at&order=created_at.desc",
  );
}

export async function revokeApiKey(id: string) {
  await supabaseRest(`/mp_api_keys?id=eq.${enc(id)}`, { method: "PATCH", body: JSON.stringify({ revoked_at: now() }) });
  return { ok: true };
}

export async function verifyApiKey(key: string) {
  if (!key || !key.startsWith("gp_")) return false;
  const rows = await supabaseRest<{ id: string; revoked_at: string | null }[]>(`/mp_api_keys?key_hash=eq.${hashKey(key)}&select=id,revoked_at`);
  const row = rows[0];
  if (!row || row.revoked_at) return false;
  await supabaseRest(`/mp_api_keys?id=eq.${row.id}`, { method: "PATCH", body: JSON.stringify({ last_used_at: now() }) }).catch(() => undefined);
  return true;
}

// ---------------------------------------------------------------- operações (admin + IA)

type Args = Record<string, unknown>;
type Op = {
  description: string;
  input: Record<string, unknown>;
  required?: string[];
  run: (args: Args) => Promise<unknown>;
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
  if (args.gratuito !== undefined) body.is_free = Boolean(args.gratuito);
  body.updated_at = now();
  return body;
}

async function nextPosition(table: string, filter: string) {
  const rows = await supabaseRest<{ position: number }[]>(`/${table}?${filter}select=position&order=position.desc&limit=1`);
  return (rows[0]?.position ?? -1) + 1;
}

async function findModule(ref: string, productId?: string) {
  const value = need(String(ref || "").trim(), "Informe o módulo.");
  if (isUuid(value)) {
    const rows = await supabaseRest<Module[]>(`/mp_modules?id=eq.${value}&select=*`);
    if (rows[0]) return rows[0];
  }
  if (productId) {
    const rows = await supabaseRest<Module[]>(`/mp_modules?product_id=eq.${productId}&title=ilike.${enc(value)}&select=*`);
    if (rows[0]) return rows[0];
  }
  throw new OpError(`Módulo não encontrado: ${value}`);
}

async function findLesson(id: string) {
  const rows = await supabaseRest<Lesson[]>(`/mp_lessons?id=eq.${enc(need(String(id || ""), "Informe a aula."))}&select=*`);
  if (!rows[0]) throw new OpError("Aula não encontrada.");
  return rows[0];
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
    run: async () => {
      const [settings, products, lessons, access, events] = await Promise.all([
        getSettings(),
        listProducts(),
        supabaseRest<{ product_id: string }[]>("/mp_lessons?select=product_id"),
        supabaseRest<{ email: string; product_id: string; status: string }[]>("/mp_access?select=email,product_id,status"),
        supabaseRest<{ kind: string; product_id: string | null }[]>(`/mp_events?created_at=gte.${new Date(Date.now() - 30 * DAY_MS).toISOString()}&select=kind,product_id`),
      ]);
      const { webhook_secret: _secret, hotmart_hottok: _hottok, ...visible } = settings;
      void _secret;
      void _hottok;
      return {
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
    },
    run: async (args) => {
      const body: Record<string, unknown> = { updated_at: now() };
      if (args.nome !== undefined) body.brand_name = args.nome;
      if (args.logo_url !== undefined) body.logo_url = args.logo_url || null;
      if (args.cor !== undefined) body.accent = args.cor;
      if (args.produto_destaque !== undefined) body.hero_product_id = args.produto_destaque ? (await findProduct(String(args.produto_destaque))).id : null;
      if (args.titulo_banner !== undefined) body.hero_title = args.titulo_banner || null;
      if (args.texto_banner !== undefined) body.hero_text = args.texto_banner || null;
      if (args.suporte_url !== undefined) body.support_url = args.suporte_url || null;
      if (args.pixel_meta !== undefined) body.meta_pixel_id = String(args.pixel_meta || "").replace(/\D/g, "") || null;
      await supabaseRest("/mp_settings?id=eq.1", { method: "PATCH", body: JSON.stringify(body) });
      return { ok: true };
    },
  },

  listar_produtos: {
    description: "Lista todos os produtos (publicados e rascunhos) com preço, checkout e ids externos.",
    input: {},
    run: async () => listProducts(),
  },

  ver_produto: {
    description: "Mostra um produto com seus módulos e aulas.",
    input: { produto: str("Id ou slug do produto.") },
    required: ["produto"],
    run: async (args) => {
      const product = await findProduct(String(args.produto));
      return { produto: product, modulos: await productTree(product.id) };
    },
  },

  criar_produto: {
    description: "Cria um produto na vitrine. Nasce como rascunho (publicado=false) a não ser que publicado=true. Ao publicar, todos os alunos recebem aviso (sino + celular).",
    input: { ...PRODUCT_FIELDS, avisar: bool("false = publica sem mandar aviso aos alunos (padrão: avisa).") },
    required: ["titulo"],
    run: async (args) => {
      need(args.titulo, "Informe o título.");
      const body = productBody(args, false);
      if (body.position === undefined) body.position = await nextPosition("mp_products", "");
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
    run: async (args) => {
      const product = await findProduct(String(args.produto));
      const rows = await supabaseRest<Product[]>(`/mp_products?id=eq.${product.id}`, {
        method: "PATCH",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify(productBody(args, true)),
      });
      // Rascunho virou publicado: avisa todos os alunos uma única vez por produto.
      if (!product.published && rows[0]?.published && args.avisar !== false) await noticeNewProduct(rows[0]);
      return rows[0];
    },
  },

  remover_produto: {
    description: "Apaga um produto com todos os módulos, aulas e acessos. Não tem volta.",
    input: { produto: str("Id ou slug."), confirmar },
    required: ["produto", "confirmar"],
    run: async (args) => {
      if (args.confirmar !== true) throw new OpError("Confirme com o usuário e envie confirmar=true.");
      const product = await findProduct(String(args.produto));
      await supabaseRest(`/mp_products?id=eq.${product.id}`, { method: "DELETE" });
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
    run: async (args) => {
      const product = await findProduct(String(args.produto));
      const target = args.oferecer ? await findProduct(String(args.oferecer)) : null;
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
    run: async (args) => {
      const product = await findProduct(String(args.produto));
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
    run: async (args) => {
      const mod = await findModule(String(args.modulo));
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
    run: async (args) => {
      if (args.confirmar !== true) throw new OpError("Confirme com o usuário e envie confirmar=true.");
      const mod = await findModule(String(args.modulo));
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
    },
    required: ["modulo", "titulo"],
    run: async (args) => {
      // Sem produto: o módulo precisa ser um id, e o produto vem dele.
      const product = args.produto
        ? await findProduct(String(args.produto))
        : await findProduct((await findModule(String(args.modulo))).product_id);
      let mod: Module;
      try {
        mod = await findModule(String(args.modulo), product.id);
      } catch {
        mod = (await OPS.criar_modulo.run({ produto: product.id, titulo: args.modulo })) as Module;
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
      return rows[0];
    },
  },

  atualizar_aula: {
    description: "Altera uma aula (só os campos enviados mudam). Para mudar de módulo, envie modulo.",
    input: { aula: str("Id da aula."), modulo: str("Id do novo módulo (opcional)."), ...LESSON_FIELDS },
    required: ["aula"],
    run: async (args) => {
      const lesson = await findLesson(String(args.aula));
      const body = lessonBody(args);
      if (args.modulo) {
        const mod = await findModule(String(args.modulo), lesson.product_id);
        body.module_id = mod.id;
        body.product_id = mod.product_id;
      }
      const rows = await supabaseRest<Lesson[]>(`/mp_lessons?id=eq.${lesson.id}`, {
        method: "PATCH",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify(body),
      });
      return rows[0];
    },
  },

  remover_aula: {
    description: "Apaga uma aula. Não tem volta.",
    input: { aula: str("Id da aula."), confirmar },
    required: ["aula", "confirmar"],
    run: async (args) => {
      if (args.confirmar !== true) throw new OpError("Confirme com o usuário e envie confirmar=true.");
      const lesson = await findLesson(String(args.aula));
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
    run: async (args) => {
      const table = { produtos: "mp_products", modulos: "mp_modules", aulas: "mp_lessons" }[String(args.tipo)];
      if (!table) throw new OpError("tipo deve ser produtos, modulos ou aulas.");
      const ids = Array.isArray(args.ids) ? args.ids.map(String) : [];
      for (const [index, id] of ids.entries()) {
        await supabaseRest(`/${table}?id=eq.${enc(id)}`, { method: "PATCH", body: JSON.stringify({ position: index }) });
      }
      return { ok: true, total: ids.length };
    },
  },

  listar_alunos: {
    description: "Lista acessos (aluno × produto). Filtre por produto ou e-mail.",
    input: { produto: str("Id ou slug (opcional)."), email: str("E-mail (opcional)."), limite: num("Máximo de linhas (padrão 100).") },
    run: async (args) => {
      let filter = "";
      if (args.produto) filter += `&product_id=eq.${(await findProduct(String(args.produto))).id}`;
      if (args.email) filter += `&email=eq.${enc(cleanEmail(args.email))}`;
      const limit = Math.min(Number(args.limite || 100), 1000);
      return supabaseRest(`/mp_access?select=email,status,expires_at,provider,created_at,mp_products(slug,title)${filter}&order=created_at.desc&limit=${limit}`);
    },
  },

  liberar_acesso: {
    description: "Libera um produto para um e-mail (cortesia, troca, suporte). Envia convite se a pessoa ainda não tem conta.",
    input: { email: str("E-mail do aluno."), produto: str("Id ou slug."), dias: num("Dias de acesso (vazio = segue o produto)."), confirmar },
    required: ["email", "produto", "confirmar"],
    run: async (args) => {
      if (args.confirmar !== true) throw new OpError("Confirme com o usuário e envie confirmar=true.");
      const product = await findProduct(String(args.produto));
      const email = need(cleanEmail(args.email), "Informe o e-mail.");
      const days = args.dias ? Number(args.dias) : product.access_days;
      await supabaseRest("/mp_access?on_conflict=email,product_id", {
        method: "POST",
        headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
        body: JSON.stringify({ email, product_id: product.id, status: "active", expires_at: days ? new Date(Date.now() + days * DAY_MS).toISOString() : null, provider: "manual", updated_at: now() }),
      });
      const account = await inviteBuyer(email, undefined, MEMBROS_URL).catch(() => "invite_failed");
      return { ok: true, email, produto: product.slug, conta: account };
    },
  },

  bloquear_acesso: {
    description: "Tira o acesso de um e-mail a um produto.",
    input: { email: str("E-mail do aluno."), produto: str("Id ou slug."), confirmar },
    required: ["email", "produto", "confirmar"],
    run: async (args) => {
      if (args.confirmar !== true) throw new OpError("Confirme com o usuário e envie confirmar=true.");
      const product = await findProduct(String(args.produto));
      await supabaseRest(`/mp_access?email=eq.${enc(cleanEmail(args.email))}&product_id=eq.${product.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "blocked", updated_at: now() }),
      });
      return { ok: true };
    },
  },
};

OPS.enviar_notificacao = {
  description: "Manda um aviso para TODOS os alunos (cadastro grátis e compradores): aparece no sino da área e chega no celular de quem ligou os avisos.",
  input: {
    titulo: str("Título curto do aviso."),
    texto: str("Texto do aviso (opcional)."),
    produto: str("Id ou slug do produto que abre ao tocar (opcional)."),
    confirmar,
  },
  required: ["titulo", "confirmar"],
  run: async (args) => {
    if (args.confirmar !== true) throw new OpError("Confirme com o usuário e envie confirmar=true.");
    const product = args.produto ? await findProduct(String(args.produto)) : null;
    return createNotice({ title: String(need(args.titulo, "Informe o título.")), body: args.texto ? String(args.texto) : null, productId: product?.id, slug: product?.slug });
  },
};

OPS.listar_notificacoes = {
  description: "Lista os últimos avisos enviados e quantos celulares receberam cada um.",
  input: {},
  run: async () => supabaseRest("/mp_notifications?select=id,title,body,kind,push_sent,created_at,mp_products(slug,title)&order=created_at.desc&limit=50"),
};

OPS.listar_cadastros_gratis = {
  description: "Lista quem se cadastrou grátis (nome, e-mail, WhatsApp, UTM de origem), mais recentes primeiro.",
  input: { limite: num("Máximo de linhas (padrão 200).") },
  run: async (args) => {
    const [leads, subs] = await Promise.all([
      listLeads(Number(args.limite || 200)),
      supabaseRest<{ email: string }[]>("/mp_push_subs?select=email"),
    ]);
    const withPush = new Set(subs.map((row) => row.email));
    return { total: leads.length, celulares_com_aviso: subs.length, cadastros: leads.map((lead) => ({ ...lead, aviso_no_celular: withPush.has(lead.email) })) };
  },
};

OPS.convidar_compradores = {
  description: "Manda o e-mail de convite (criar senha) para todo comprador com acesso ativo que ainda não tem conta. Quem já tem conta não recebe nada. Até 80 por vez (limite de e-mails por hora).",
  input: { confirmar },
  required: ["confirmar"],
  run: async (args) => {
    if (args.confirmar !== true) throw new OpError("Confirme com o usuário e envie confirmar=true.");
    return inviteBuyersWithoutAccount(80);
  },
};

export function opsAsTools() {
  return Object.entries(OPS).map(([name, op]) => ({
    name,
    description: op.description,
    inputSchema: { type: "object", properties: op.input, ...(op.required?.length ? { required: op.required } : {}) },
  }));
}

export async function runOp(name: string, args: Args) {
  const op = OPS[name];
  if (!op) throw new OpError(`Operação desconhecida: ${name}`);
  return op.run(args || {});
}
