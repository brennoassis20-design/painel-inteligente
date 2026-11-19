import { findAuthAccount, getPublicAppUrl, inviteBuyer, jsonError, supabaseAuthRequest, supabaseRest } from "@/lib/panel-server";
import { areaUrl, panelAreaFor, tagAccountWithArea } from "@/lib/membros";

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as { email?: string };
    const email = payload.email?.trim().toLowerCase() || "";

    if (!email) {
      return jsonError("Informe seu email.", 400);
    }

    let redirectTo = getPublicAppUrl(request);

    // Comprador cujo convite nao chegou ainda nao tem conta: cria e envia o convite agora.
    const entitlements = await supabaseRest<{ access_status: string }[]>(
      `/entitlements?email=eq.${encodeURIComponent(email)}&select=access_status`,
    );

    if (entitlements[0]?.access_status === "active") {
      const result = await inviteBuyer(email, undefined, redirectTo).catch(() => "invite_failed");
      if (result === "invited") {
        return Response.json({
          ok: true,
          message: "Se este email tiver acesso, voce vai receber um link para definir a senha.",
        });
      }
    }

    // Aluno de uma área de membros sem acesso ao Painel: o link volta para a área dele, com o nome dela no e-mail.
    const account = await findAuthAccount(email).catch(() => null);
    if (account) {
      const own = await panelAreaFor({ id: account.id, email }, account.user_metadata || null).catch(() => null);
      if (own) {
        redirectTo = areaUrl(own);
        await tagAccountWithArea(account.id, own);
      }
    }

    // Se o envio falhar, o aluno precisa saber (antes a tela dizia "enviado" mesmo com erro).
    const sent = await supabaseAuthRequest(`/recover?redirect_to=${encodeURIComponent(redirectTo)}`, {
      method: "POST",
      body: JSON.stringify({ email }),
    });
    if (!sent.ok) {
      const detail = (await sent.text()).slice(0, 200);
      console.error("recover-falhou", sent.status, detail);
      if (sent.status === 429) {
        return Response.json({ ok: true, message: "Acabamos de enviar um link para este e-mail. Confira a caixa de entrada, Promoções e Spam. Se precisar de outro, aguarde 1 minuto e peça de novo." });
      }
      return jsonError("Não foi possível enviar o link agora. Tente de novo em 1 minuto.", 502);
    }

    // Mesma resposta para qualquer email, para nao revelar quem tem conta.
    return Response.json({
      ok: true,
      message: "Se este email tiver acesso, voce vai receber um link para definir a senha.",
    });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Erro ao enviar o link.", 500);
  }
}
