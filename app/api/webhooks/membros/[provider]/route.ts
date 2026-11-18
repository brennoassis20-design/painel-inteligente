import { applySale, type Area, type SaleEvent } from "@/lib/membros";
import { jsonError, supabaseRest } from "@/lib/panel-server";

// Receptor universal de vendas: cada plataforma é traduzida para o mesmo formato.
// Hotmart: autentica pelo hottok (cabeçalho X-HOTMART-HOTTOK). Demais: ?secret=.
type Json = Record<string, unknown>;

const obj = (value: unknown) => (value && typeof value === "object" ? (value as Json) : {});
const txt = (value: unknown) => (value === undefined || value === null ? "" : String(value));
// Valor em reais: aceita número, "27", "27,90" ou centavos inteiros (quando a plataforma manda em centavos).
const money = (value: unknown, cents = false) => {
  const n = Number(String(value ?? "").replace(",", "."));
  if (!Number.isFinite(n) || n <= 0) return null;
  return cents ? n / 100 : n;
};

function hotmartOrigin(origin: Json) {
  const src = txt(origin.src);
  const sck = txt(origin.sck);
  const match = /^membros_([a-z-]+)_(.+)$/.exec(sck);
  if (match) return { utmSource: "membros", utmMedium: match[1], utmContent: match[2], utmTerm: src || null };
  return { utmSource: src || sck || null };
}

function hotmart(payload: Json): SaleEvent {
  const data = obj(payload.data);
  const product = obj(data.product);
  const buyer = obj(data.buyer);
  const purchase = obj(data.purchase);
  const type = txt(payload.event).toUpperCase();
  const kind: SaleEvent["kind"] = ["PURCHASE_APPROVED", "PURCHASE_COMPLETE"].includes(type)
    ? "approved"
    : ["PURCHASE_REFUNDED", "PURCHASE_CHARGEBACK"].includes(type)
      ? "refunded"
      : ["PURCHASE_BILLET_PRINTED", "PURCHASE_DELAYED"].includes(type)
        ? "pending"
        : "ignored";
  return {
    provider: "hotmart",
    kind,
    rawType: type,
    email: txt(buyer.email).toLowerCase().trim(),
    name: txt(buyer.name) || undefined,
    externalIds: [txt(product.id), txt(product.ucode)],
    orderId: txt(purchase.transaction) || txt(payload.id),
    amount: money(obj(purchase.price).value) ?? money(obj(purchase.full_price).value),
    // Link da área: sck=membros_<medium>_<content> e src=<origem do aluno> (utm_term).
    ...hotmartOrigin(obj(purchase.origin)),
  };
}

// Eduzz (Developer Hub, eventos myeduzz.*): data.buyer/student, data.items[].productId.
function eduzz(payload: Json): SaleEvent {
  // Entrega customizada da Eduzz: { type: "create" | "remove", fields: { edz_cli_email, edz_cnt_cod, ... } }
  const fields = obj(payload.fields);
  if (fields.edz_cli_email || payload.type === "create" || payload.type === "remove") {
    const type = txt(payload.type).toLowerCase();
    return {
      provider: "eduzz",
      kind: type === "create" ? "approved" : type === "remove" ? "refunded" : "ignored",
      rawType: `entrega_${type || "teste"}`,
      email: txt(fields.edz_cli_email).toLowerCase().trim(),
      name: txt(fields.edz_cli_rsocial) || undefined,
      externalIds: [txt(fields.edz_cnt_cod), fields.edz_cnt_paicod ? txt(fields.edz_cnt_paicod) : ""],
      orderId: txt(fields.edz_fat_cod) || undefined,
      amount: money(fields.edz_valorpago),
      utmSource: txt(fields.edz_gtr_param1) || null,
      utmContent: txt(fields.edz_gtr_param4) || null,
      utmCampaign: txt(fields.edz_gtr_param2) || null,
      utmMedium: txt(fields.edz_gtr_param3) || null,
      utmTerm: txt(fields.edz_gtr_param5) || null,
    };
  }
  const data = obj(payload.data);
  const type = txt(payload.event).toLowerCase();
  const student = obj(data.student);
  const buyer = obj(data.buyer);
  const items = Array.isArray(data.items) ? (data.items as unknown[]).map(obj) : [];
  const kind: SaleEvent["kind"] = /waiting_refund/.test(type)
    ? "ignored"
    : /invoice_paid/.test(type)
      ? "approved"
      : /refunded|chargeback/.test(type)
        ? "refunded"
        : /waiting_payment|invoice_opened/.test(type)
          ? "pending"
          : "ignored";
  return {
    provider: "eduzz",
    kind,
    rawType: type,
    // Compra de presente: quem estuda é o "student"; senão, o comprador.
    email: txt(student.email || buyer.email).toLowerCase().trim(),
    name: txt(student.name || buyer.name) || undefined,
    externalIds: items.flatMap((item) => [txt(item.productId), item.parentId ? txt(item.parentId) : ""]),
    orderId: txt(data.id || payload.id),
    amount: money(obj(data.paid).value) ?? money(obj(data.price).value),
    utmSource: txt(obj(data.utm).source) || null,
    utmContent: txt(obj(data.utm).content) || null,
    utmCampaign: txt(obj(data.utm).campaign) || null,
    utmMedium: txt(obj(data.utm).medium) || null,
    utmTerm: txt(obj(data.utm).term) || null,
  };
}

function generic(provider: string, payload: Json): SaleEvent {
  // Formato Cakto e parecidos: { event, data: { id, product: { id }, offer: { id }, customer: { email, name } } }
  const data = obj(payload.data);
  const product = obj(data.product || payload.product);
  const offer = obj(data.offer || payload.offer);
  const customer = obj(data.customer || payload.customer || payload.buyer || data.buyer);
  const type = txt(payload.event || payload.event_type || payload.type || data.status || payload.status).toLowerCase();
  const kind: SaleEvent["kind"] = /approved|paid|complete|aprovad/.test(type) && !/refund/.test(type)
    ? "approved"
    : /refund|chargeback|estorn|reembols/.test(type)
      ? "refunded"
      : /pix_gerado|pix_generated|boleto|waiting|pending|aguardando/.test(type)
        ? "pending"
        : "ignored";
  return {
    provider,
    kind,
    rawType: type,
    email: txt(customer.email || data.email || payload.email).toLowerCase().trim(),
    name: txt(customer.name) || undefined,
    externalIds: [txt(product.id), offer.id ? `oferta:${txt(offer.id)}` : ""],
    orderId: txt(data.id || payload.id),
    amount: money(data.amount) ?? money(data.baseAmount),
    utmSource: txt(data.utm_source || payload.utm_source) || null,
    utmContent: txt(data.utm_content || payload.utm_content) || null,
    utmCampaign: txt(data.utm_campaign || payload.utm_campaign) || null,
    utmMedium: txt(data.utm_medium || payload.utm_medium) || null,
    utmTerm: txt(data.utm_term || payload.utm_term) || null,
  };
}

// Aceita JSON ou formulário (a Eduzz manda "fields[edz_cli_email]=..." em algumas integrações).
function parseBody(raw: string): Json {
  const text = raw.trim();
  if (!text) return {};
  if (text.startsWith("{") || text.startsWith("[")) {
    try {
      return JSON.parse(text) as Json;
    } catch {
      return {};
    }
  }
  const out: Json = {};
  for (const [key, value] of new URLSearchParams(text)) {
    const nested = key.match(/^([^[]+)\[([^\]]+)\]$/);
    if (nested) {
      const parent = obj(out[nested[1]]);
      parent[nested[2]] = value;
      out[nested[1]] = parent;
    } else out[key] = value;
  }
  // Formulário "solto" (edz_* na raiz) vira o mesmo formato de { fields }.
  if (!out.fields && Object.keys(out).some((key) => key.startsWith("edz_"))) out.fields = { ...out };
  return out;
}

export async function POST(request: Request, { params }: { params: Promise<{ provider: string }> }) {
  try {
    const provider = (await params).provider.toLowerCase().replace(/[^a-z0-9_-]/g, "");
    const raw = await request.text();
    const payload = parseBody(raw);
    const url = new URL(request.url);

    // O segredo do link diz de qual área é a venda; a Hotmart também pode se identificar pelo hottok da área.
    const hottok = request.headers.get("x-hotmart-hottok") || txt(payload.hottok);
    const secret = (url.searchParams.get("secret") || request.headers.get("x-webhook-secret") || "").trim();
    let area: Area | null = null;
    if (/^[a-f0-9]{16,80}$/i.test(secret)) {
      const rows = await supabaseRest<Area[]>(`/mp_settings?webhook_secret=eq.${secret}&select=*`);
      area = rows[0] || null;
    }
    if (!area && provider === "hotmart" && hottok) {
      const rows = await supabaseRest<Area[]>(`/mp_settings?hotmart_hottok=eq.${encodeURIComponent(hottok)}&select=*`);
      area = rows.length === 1 ? rows[0] : null;
    }
    if (!area) return jsonError("Webhook não autorizado.", 401);

    const event = provider === "hotmart" ? hotmart(payload) : provider === "eduzz" ? eduzz(payload) : generic(provider, payload);

    await supabaseRest("/webhook_events", {
      method: "POST",
      headers: { Prefer: "resolution=ignore-duplicates,return=minimal" },
      body: JSON.stringify({
        provider: area.id === 1 ? `membros:${provider}` : `membros:a${area.id}:${provider}`,
        event_id: `${event.rawType}:${event.orderId || Date.now()}`,
        event_type: event.rawType || "unknown",
        payload,
      }),
    }).catch(() => undefined);

    if (!event.email) return Response.json({ ok: true, ignored: "sem e-mail" });
    const result = await applySale(event, area);
    return Response.json({ ok: true, kind: event.kind, ...result });
  } catch (error) {
    console.error("webhook-membros", error);
    return jsonError(error instanceof Error ? error.message : "Erro no webhook.", 500);
  }
}
