import { getPublicAppUrl, inviteBuyer, jsonError, supabaseRest } from "@/lib/panel-server";

type CaktoPayload = {
  id?: string;
  secret?: string;
  event?: string;
  event_type?: string;
  type?: string;
  status?: string;
  customer?: {
    id?: string;
    email?: string;
    name?: string;
  };
  buyer?: {
    email?: string;
    name?: string;
  };
  client?: {
    email?: string;
    name?: string;
  };
  purchase?: {
    id?: string;
    status?: string;
  };
  transaction?: {
    id?: string;
    status?: string;
  };
  data?: Record<string, unknown>;
  access_expires_at?: string;
  expires_at?: string;
};

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const secret = process.env.CAKTO_WEBHOOK_SECRET?.trim();

    if (!secret) {
      return jsonError("Webhook sem segredo configurado no servidor.", 503);
    }

    const payload = JSON.parse(rawBody) as CaktoPayload;

    const url = new URL(request.url);
    const providedSecret =
      payload.secret ||
      url.searchParams.get("secret") ||
      request.headers.get("x-webhook-secret") ||
      request.headers.get("x-cakto-webhook-secret") ||
      request.headers.get("x-cakto-secret") ||
      request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

    if (providedSecret !== secret) {
      return jsonError("Webhook nao autorizado.", 401);
    }

    delete payload.secret;
    const eventType = normalizeEventType(payload);
    const eventId = `${eventType}:${String(
      payload.id || payload.purchase?.id || payload.transaction?.id || payload.data?.id || Date.now(),
    )}`;
    const email = findEmail(payload);

    if (!email) {
      return jsonError("Webhook sem email do comprador.", 400);
    }

    await supabaseRest("/webhook_events", {
      method: "POST",
      headers: {
        Prefer: "resolution=ignore-duplicates",
      },
      body: JSON.stringify({
        provider: "cakto",
        event_id: eventId,
        event_type: eventType,
        payload,
      }),
    });

    const accessStatus = mapEventToAccessStatus(eventType);

    // PIX/boleto gerado, abandono de carrinho etc. nao mexem no acesso de quem ja comprou.
    if (!accessStatus) {
      return Response.json({ ok: true, email, ignored: eventType });
    }

    const dataCustomer = objectFromData(payload.data, "customer");
    const purchaseId = String(payload.purchase?.id || payload.transaction?.id || payload.data?.id || payload.data?.purchase_id || "");
    const customerId = String(payload.customer?.id || dataCustomer?.id || payload.data?.customer_id || "");
    const expiresAt = accessStatus === "active" ? await annualExpiry(email) : null;

    await supabaseRest("/entitlements?on_conflict=email", {
      method: "POST",
      headers: {
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify({
        email,
        access_status: accessStatus,
        access_expires_at: expiresAt,
        cakto_customer_id: customerId || null,
        cakto_purchase_id: purchaseId || null,
        last_event_type: eventType,
        updated_at: new Date().toISOString(),
      }),
    });

    await supabaseRest(`/profiles?email=eq.${encodeURIComponent(email)}`, {
      method: "PATCH",
      body: JSON.stringify({
        access_status: accessStatus,
        access_expires_at: expiresAt,
        cakto_customer_id: customerId || null,
        cakto_purchase_id: purchaseId || null,
        updated_at: new Date().toISOString(),
      }),
    });

    let account = "unchanged";

    if (accessStatus === "active") {
      const name = payload.customer?.name || payload.buyer?.name || payload.client?.name || stringFrom(dataCustomer, "name");
      // O acesso ja foi gravado; se o email falhar, o comprador recupera por "Esqueci minha senha".
      account = await inviteBuyer(email, name || undefined, getPublicAppUrl(request)).catch((error) => {
        console.error("cakto-invite-failed", email, error instanceof Error ? error.message : error);
        return "invite_failed";
      });
    }

    return Response.json({ ok: true, email, accessStatus, account });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Erro no webhook.", 500);
  }
}

function normalizeEventType(payload: CaktoPayload) {
  return String(payload.event || payload.event_type || payload.type || payload.status || payload.purchase?.status || payload.transaction?.status || "unknown")
    .toLowerCase()
    .replaceAll(" ", "_");
}

function mapEventToAccessStatus(eventType: string) {
  if (matches(eventType, ["approved", "paid", "completed", "purchase_approved", "payment_approved", "subscription_renewed"])) {
    return "active";
  }

  // Cancelar a assinatura so impede a renovacao: o acesso segue ate access_expires_at.
  if (matches(eventType, ["subscription_canceled", "subscription_cancelled"])) {
    return null;
  }

  if (matches(eventType, ["refund", "refunded", "chargeback", "estorno"])) {
    return "refunded";
  }

  if (matches(eventType, ["expired", "subscription_expired", "access_expired"])) {
    return "expired";
  }

  return null;
}

function matches(value: string, candidates: string[]) {
  return candidates.some((candidate) => value.includes(candidate));
}

function findEmail(payload: CaktoPayload) {
  const email =
    payload.customer?.email ||
    payload.buyer?.email ||
    payload.client?.email ||
    stringFrom(objectFromData(payload.data, "customer"), "email") ||
    stringFromData(payload.data, "email") ||
    stringFromData(payload.data, "customer_email") ||
    stringFromData(payload.data, "buyer_email");

  return email ? email.toLowerCase().trim() : "";
}

function stringFromData(data: Record<string, unknown> | undefined, key: string) {
  const value = data?.[key];
  return typeof value === "string" ? value : "";
}

function objectFromData(data: Record<string, unknown> | undefined, key: string) {
  const value = data?.[key];
  return value && typeof value === "object" ? (value as Record<string, unknown>) : undefined;
}

function stringFrom(data: Record<string, unknown> | undefined, key: string) {
  const value = data?.[key];
  return typeof value === "string" ? value : "";
}

const ACCESS_DAYS = 365;
const GRACE_DAYS = 7;

// Assinatura anual: compra e renovacao garantem 1 ano (+ folga para a cobranca da renovacao).
// Usa o maior prazo entre o atual e o novo, para eventos repetidos nao somarem anos extras.
async function annualExpiry(email: string) {
  const rows = await supabaseRest<{ access_expires_at: string | null }[]>(
    `/entitlements?email=eq.${encodeURIComponent(email)}&select=access_expires_at`,
  );
  const current = rows[0]?.access_expires_at ? new Date(rows[0].access_expires_at).getTime() : 0;
  const next = Date.now() + (ACCESS_DAYS + GRACE_DAYS) * 24 * 60 * 60 * 1000;
  return new Date(Math.max(current, next)).toISOString();
}
