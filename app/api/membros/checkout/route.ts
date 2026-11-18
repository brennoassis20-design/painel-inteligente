import { checkoutLink } from "@/lib/membros";
import { withUser } from "@/lib/membros-http";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { produto?: string; via?: string; content?: string; utm?: Record<string, unknown> };
  return withUser(request, (user, area) => checkoutLink(user, area, String(body.produto || ""), { via: body.via, content: body.content, utm: body.utm }));
}
