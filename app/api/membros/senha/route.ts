import { inviteBuyer, jsonError, supabaseAuthRequest, supabaseRest } from "@/lib/panel-server";
import { accountExists } from "@/lib/membros-avisos";

const MESSAGE = "Se este e-mail tiver acesso, você vai receber um link para criar ou trocar a senha.";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as { email?: string };
    const email = String(body.email || "").trim().toLowerCase();
    if (!email) return jsonError("Informe seu e-mail.", 400);
    const redirectTo = new URL(request.url).origin;

    // Comprador que ainda não criou a conta recebe o convite agora.
    const access = await supabaseRest<{ status: string }[]>(`/mp_access?email=eq.${encodeURIComponent(email)}&status=eq.active&select=status&limit=1`);
    if (access.length) {
      const result = await inviteBuyer(email, undefined, redirectTo).catch(() => "invite_failed");
      if (result === "invited") return Response.json({ ok: true, message: MESSAGE });
    }

    // Sem conta e sem compra: em vez de fingir que mandou, convida para o cadastro grátis.
    if (!(await accountExists(email))) {
      return Response.json({ ok: false, sem_conta: true, message: "Não encontramos uma conta com este e-mail. Confira se digitou certo ou crie seu acesso grátis." });
    }

    await supabaseAuthRequest(`/recover?redirect_to=${encodeURIComponent(redirectTo)}`, {
      method: "POST",
      body: JSON.stringify({ email }),
    });
    return Response.json({ ok: true, message: MESSAGE });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Erro ao enviar o link.", 500);
  }
}
