import { findProduct, logEvent, OpError } from "@/lib/membros";
import { withUser } from "@/lib/membros-http";

const KINDS = new Set(["cadeado_aberto", "upsell_visto"]);

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { produto?: string; tipo?: string };
  return withUser(request, async (user) => {
    if (!KINDS.has(String(body.tipo))) throw new OpError("Evento inválido.");
    const product = await findProduct(String(body.produto || ""));
    await logEvent(user.email, product.id, String(body.tipo));
    return { ok: true };
  });
}
