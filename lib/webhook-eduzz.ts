// Eduzz -> SaleEvent (função pura, sem banco: testada em tests/chama-acesa.test.mjs).
import type { SaleEvent } from "./membros.ts";

type Json = Record<string, unknown>;
const obj = (value: unknown) => (value && typeof value === "object" ? (value as Json) : {});
const txt = (value: unknown) => (value === undefined || value === null ? "" : String(value));
const money = (value: unknown, cents = false) => {
  const n = Number(String(value ?? "").replace(",", "."));
  if (!Number.isFinite(n) || n <= 0) return null;
  return cents ? n / 100 : n;
};

/**
 * Evento de contrato (assinatura) da Eduzz: myeduzz.contract_updated com data.contract.status
 * (upToDate, awaitingPayment, late, canceled, defaulter, suspended, trial, finished, free) e data.reason.
 * Documentação: developers.eduzz.com/reference/webhook/myeduzz-contract-updated.
 *  - canceled, defaulter (inadimplente) e suspended: o acesso acaba ("ended").
 *  - late (atrasada): acaba só se o contrato tem contentAccess.removeOnLatePayment (a regra da própria Eduzz).
 *  - finished: acaba só se o contrato tem contentAccess.removeOnContractEnd; contrato finito que terminou de pagar (ex.: vitalício parcelado) mantém o acesso.
 *  - upToDate com reason "reactivation": o acesso volta ("approved"). Renovação normal chega como invoice_paid.
 */
export function kindDeContratoEduzz(contract: Json, reason: string): SaleEvent["kind"] {
  const status = txt(contract.status);
  const acesso = obj(contract.contentAccess);
  if (["canceled", "defaulter", "suspended"].includes(status)) return "ended";
  if (status === "late") return acesso.removeOnLatePayment === true ? "ended" : "ignored";
  if (status === "finished") return acesso.removeOnContractEnd === true ? "ended" : "ignored";
  if (status === "upToDate" && reason === "reactivation") return "approved";
  return "ignored";
}

// Eduzz (Developer Hub, eventos myeduzz.*): data.buyer/student, data.items[].productId; contratos: data.customer, data.products[].id.
export function eduzz(payload: Json): SaleEvent {
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
      bumpIds: ["1", "true"].includes(txt(fields.edz_order_bump_item).toLowerCase()) ? [txt(fields.edz_cnt_cod)] : [],
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
  if (/(^|\.)contract_updated$/.test(type) && obj(data.contract).id) {
    const contract = obj(data.contract);
    const customer = obj(data.customer);
    const produtos = Array.isArray(data.products) ? (data.products as unknown[]).map(obj) : [];
    return {
      provider: "eduzz",
      kind: kindDeContratoEduzz(contract, txt(data.reason)),
      rawType: type,
      email: txt(customer.email).toLowerCase().trim(),
      name: txt(customer.name) || undefined,
      externalIds: produtos.map((p) => txt(p.id)),
      orderId: `contrato-${txt(contract.id)}`,
    };
  }
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


/** Estado do acesso (mp_access.status) que cada tipo de evento grava. Assinatura encerrada = "expired"; reembolso = "refunded". */
export function statusDoAcesso(kind: SaleEvent["kind"]): "active" | "refunded" | "expired" | null {
  return kind === "approved" ? "active" : kind === "refunded" ? "refunded" : kind === "ended" ? "expired" : null;
}
