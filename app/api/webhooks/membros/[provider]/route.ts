import { applySale, getSettings, type SaleEvent } from "@/lib/membros";
import { jsonError, supabaseRest } from "@/lib/panel-server";

// Receptor universal de vendas: cada plataforma é traduzida para o mesmo formato.
// Hotmart: autentica pelo hottok (cabeçalho X-HOTMART-HOTTOK). Demais: ?secret=.
type Json = Record<string, unknown>;

const obj = (value: unknown) => (value && typeof value === "object" ? (value as Json) : {});
const txt = (value: unknown) => (value === undefined || value === null ? "" : String(value));

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
  };
}

// Eduzz (Developer Hub, eventos myeduzz.*): data.buyer/student, data.items[].productId.
function eduzz(payload: Json): SaleEvent {
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
  };
}

export async function POST(request: Request, { params }: { params: Promise<{ provider: string }> }) {
  try {
    const provider = (await params).provider.toLowerCase().replace(/[^a-z0-9_-]/g, "");
    const raw = await request.text();
    const payload = JSON.parse(raw || "{}") as Json;
    const settings = await getSettings();
    const url = new URL(request.url);

    const hottok = request.headers.get("x-hotmart-hottok") || txt(payload.hottok);
    const secret = url.searchParams.get("secret") || request.headers.get("x-webhook-secret") || "";
    const authorized =
      secret === settings.webhook_secret || (provider === "hotmart" && Boolean(settings.hotmart_hottok) && hottok === settings.hotmart_hottok);
    if (!authorized) return jsonError("Webhook não autorizado.", 401);

    const event = provider === "hotmart" ? hotmart(payload) : provider === "eduzz" ? eduzz(payload) : generic(provider, payload);

    await supabaseRest("/webhook_events", {
      method: "POST",
      headers: { Prefer: "resolution=ignore-duplicates,return=minimal" },
      body: JSON.stringify({
        provider: `membros:${provider}`,
        event_id: `${event.rawType}:${event.orderId || Date.now()}`,
        event_type: event.rawType || "unknown",
        payload,
      }),
    }).catch(() => undefined);

    if (!event.email) return Response.json({ ok: true, ignored: "sem e-mail" });
    const result = await applySale(event);
    return Response.json({ ok: true, kind: event.kind, ...result });
  } catch (error) {
    console.error("webhook-membros", error);
    return jsonError(error instanceof Error ? error.message : "Erro no webhook.", 500);
  }
}
