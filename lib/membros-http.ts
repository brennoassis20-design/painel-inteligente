import { getUserFromRequest, jsonError } from "@/lib/panel-server";
import { type Area, getArea, isAdmin, OpError } from "@/lib/membros";

// Área do pedido: cabeçalho X-Area (a tela manda o slug do endereço) ou ?area=. Vazio = área 1.
export function areaSlugFrom(request: Request) {
  const raw = request.headers.get("x-area") || new URL(request.url).searchParams.get("area") || "";
  return raw.trim().toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 60);
}

export async function areaFrom(request: Request) {
  return getArea(areaSlugFrom(request));
}

type User = { id: string; email: string; name?: string };

export async function withUser<T>(request: Request, handler: (user: User, area: Area) => Promise<T>) {
  let area: Area;
  try {
    area = await areaFrom(request);
  } catch {
    return jsonError("Área não encontrada.", 404);
  }
  let user;
  try {
    user = await getUserFromRequest(request);
  } catch {
    return jsonError("Sua sessão expirou. Entre de novo.", 401);
  }
  try {
    return Response.json(await handler(user, area));
  } catch (error) {
    if (error instanceof OpError) return jsonError(error.message, 400);
    console.error("membros", error);
    return jsonError(error instanceof Error ? error.message : "Erro inesperado.", 500);
  }
}

export async function withAdmin<T>(request: Request, handler: (user: User, area: Area) => Promise<T>) {
  return withUser(request, async (user, area) => {
    if (!(await isAdmin(user.email, area))) throw new OpError("Só administradores podem fazer isso.");
    return handler(user, area);
  });
}
