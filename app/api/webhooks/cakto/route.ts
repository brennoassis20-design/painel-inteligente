import { jsonError, supabaseRest } from "@/lib/panel-server";

type CaktoPayload = {
  id?: string;
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

    if (secret) {
      const url = new URL(request.url);
      const providedSecret =
        url.searchParams.get("secret") ||
        request.headers.get("x-webhook-secret") ||
        request.headers.get("x-cakto-webhook-secret") ||
        request.headers.get("x-cakto-secret") ||
        request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

      if (providedSecret !== secret) {
        return jsonError("Webhook nao autorizado.", 401);
      }
    }

    const payload = JSON.parse(rawBody) as CaktoPayload;
    const eventType = normalizeEventType(payload);
    const eventId = String(
      payload.id ||
        payload.purchase?.id ||
        payload.transaction?.id ||
        payload.data?.id ||
        `${eventType}:${Date.now()}`,
    );
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
    const purchaseId = String(payload.purchase?.id || payload.transaction?.id || payload.data?.purchase_id || "");
    const customerId = String(payload.customer?.id || payload.data?.customer_id || "");
    const expiresAt =
      payload.access_expires_at ||
      payload.expires_at ||
      stringFromData(payload.data, "access_expires_at") ||
      stringFromData(payload.data, "expires_at") ||
      null;

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

    return Response.json({ ok: true, email, accessStatus });
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

  if (matches(eventType, ["refund", "refunded", "chargeback", "canceled", "cancelled", "subscription_canceled"])) {
    return "refunded";
  }

  if (matches(eventType, ["expired", "subscription_expired", "access_expired"])) {
    return "expired";
  }

  return "pending";
}

function matches(value: string, candidates: string[]) {
  return candidates.some((candidate) => value.includes(candidate));
}

function findEmail(payload: CaktoPayload) {
  const email =
    payload.customer?.email ||
    payload.buyer?.email ||
    payload.client?.email ||
    stringFromData(payload.data, "email") ||
    stringFromData(payload.data, "customer_email") ||
    stringFromData(payload.data, "buyer_email");

  return email ? email.toLowerCase().trim() : "";
}

function stringFromData(data: Record<string, unknown> | undefined, key: string) {
  const value = data?.[key];
  return typeof value === "string" ? value : "";
}
