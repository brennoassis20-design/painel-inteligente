// Cakto e parecidos -> SaleEvent (função pura, sem banco: testada em tests/pocket-portuguese.test.mjs).
// Cakto manda order bump e upsell como PEDIDOS SEPARADOS, cada um com o product.id / offer.id do próprio item
// (data.offer_type = main | orderbump | upsell, data.parent_order = pedido da frente). Por isso basta casar por id.
import type { SaleEvent } from "./membros.ts";

type Json = Record<string, unknown>;
const obj = (value: unknown) => (value && typeof value === "object" ? (value as Json) : {});
const txt = (value: unknown) => (value === undefined || value === null ? "" : String(value));
const money = (value: unknown, cents = false) => {
  const n = Number(String(value ?? "").replace(",", "."));
  if (!Number.isFinite(n) || n <= 0) return null;
  return cents ? n / 100 : n;
};

export function generic(provider: string, payload: Json): SaleEvent {
  // Formato Cakto e parecidos: { event, data: { id, product: { id }, offer: { id }, customer: { email, name } } }
  const data = obj(payload.data);
  const product = obj(data.product || payload.product);
  const offer = obj(data.offer || payload.offer);
  const customer = obj(data.customer || payload.customer || payload.buyer || data.buyer);
  // Order bumps (Ticto manda em "bumps": [{ product_id, product_code }]): cada bump libera o produto dele.
  const bumps = [payload.bumps, data.bumps].flatMap((list) => (Array.isArray(list) ? list.map(obj) : []));
  const item = obj(payload.item);
  const order = obj(payload.order);
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
    externalIds: [
      txt(product.id),
      offer.id ? `oferta:${txt(offer.id)}` : "",
      txt(item.product_id),
      txt(item.product_code),
      ...bumps.flatMap((bump) => [txt(bump.product_id), txt(bump.product_code)]),
    ],
    orderId: txt(data.id || payload.id || order.hash || order.id),
    bumpIds: bumps.flatMap((bump) => [txt(bump.product_id), txt(bump.product_code)]).filter(Boolean),
    amount: money(data.amount) ?? money(data.baseAmount),
    utmSource: txt(data.utm_source || payload.utm_source) || null,
    utmContent: txt(data.utm_content || payload.utm_content) || null,
    utmCampaign: txt(data.utm_campaign || payload.utm_campaign) || null,
    utmMedium: txt(data.utm_medium || payload.utm_medium) || null,
    utmTerm: txt(data.utm_term || payload.utm_term) || null,
  };
}
