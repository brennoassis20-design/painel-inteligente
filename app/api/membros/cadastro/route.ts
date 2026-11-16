import { jsonError } from "@/lib/panel-server";
import { OpError } from "@/lib/membros";
import { signupFree } from "@/lib/membros-avisos";
import { areaFrom } from "@/lib/membros-http";

// Cadastro grátis: e-mail + WhatsApp + senha. Entra na hora e recebe o e-mail de acesso.
export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  try {
    const area = await areaFrom(request);
    return Response.json(await signupFree(body as Parameters<typeof signupFree>[0], area));
  } catch (error) {
    if (error instanceof OpError) return jsonError(error.message, 400);
    console.error("cadastro gratis", error);
    return jsonError("Não foi possível criar o acesso agora. Tente de novo em instantes.", 500);
  }
}
