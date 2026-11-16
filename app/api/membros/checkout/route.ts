import { checkoutLink } from "@/lib/membros";
import { withUser } from "@/lib/membros-http";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { produto?: string; via?: string; utm?: Record<string, unknown> };
  return withUser(request, (user) => checkoutLink(user, String(body.produto || ""), { via: body.via, utm: body.utm }));
}
