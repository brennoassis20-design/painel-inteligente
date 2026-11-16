import { getUserFromRequest, jsonError } from "@/lib/panel-server";
import { isAdmin, OpError } from "@/lib/membros";

export async function withUser<T>(request: Request, handler: (user: { id: string; email: string; name?: string }) => Promise<T>) {
  let user;
  try {
    user = await getUserFromRequest(request);
  } catch {
    return jsonError("Sua sessão expirou. Entre de novo.", 401);
  }
  try {
    return Response.json(await handler(user));
  } catch (error) {
    if (error instanceof OpError) return jsonError(error.message, 400);
    console.error("membros", error);
    return jsonError(error instanceof Error ? error.message : "Erro inesperado.", 500);
  }
}

export async function withAdmin<T>(request: Request, handler: (user: { id: string; email: string; name?: string }) => Promise<T>) {
  return withUser(request, async (user) => {
    if (!(await isAdmin(user.email))) throw new OpError("Só administradores podem fazer isso.");
    return handler(user);
  });
}
