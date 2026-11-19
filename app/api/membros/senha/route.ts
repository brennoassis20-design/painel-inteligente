import { findAuthAccount, jsonError, supabaseAuthRequest, supabaseRest } from "@/lib/panel-server";
import { type Area, areaHasFree, areaUrl, inviteToArea, isAdmin, isMainArea, MAIN_AREA_ID, otherAreaFor, tagAccountWithArea } from "@/lib/membros";
import { areaFrom } from "@/lib/membros-http";

const MESSAGE = "Se este e-mail tiver acesso, você vai receber um link para criar ou trocar a senha.";
const enc = encodeURIComponent;

// A pessoa tem ligação com esta área? (compra ativa, cadastro grátis nela ou administra)
async function belongsTo(email: string, area: Area) {
  const [access, leads] = await Promise.all([
    supabaseRest<{ status: string }[]>(`/mp_access?email=eq.${enc(email)}&status=eq.active&select=status,mp_products!inner(area_id)&mp_products.area_id=eq.${area.id}&limit=1`),
    supabaseRest<{ area_id: number }[]>(`/mp_leads?email=eq.${enc(email)}&area_id=eq.${area.id}&select=area_id&limit=1`),
  ]);
  return access.length > 0 || leads.length > 0 || (await isAdmin(email, area));
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as { email?: string };
    const email = String(body.email || "").trim().toLowerCase();
    if (!email) return jsonError("Informe seu e-mail.", 400);
    const area = await areaFrom(request);

    // Comprador que ainda não criou a conta recebe o convite agora (já volta para a área da compra).
    const access = await supabaseRest<{ status: string }[]>(
      `/mp_access?email=eq.${enc(email)}&status=eq.active&select=status,mp_products!inner(area_id)&mp_products.area_id=eq.${area.id}&limit=1`,
    );
    if (access.length) {
      const result = await inviteToArea(area, email).catch(() => "invite_failed");
      if (result === "invited") return Response.json({ ok: true, message: MESSAGE });
    }

    // Sem conta e sem compra: não finge que mandou. Só sugere cadastro grátis se a área tiver conteúdo grátis.
    const hasFree = await areaHasFree(area);
    const notFound = () =>
      Response.json({
        ok: false,
        sem_conta: true,
        message: hasFree
          ? "Não encontramos uma conta com este e-mail. Confira se digitou certo ou crie seu acesso grátis."
          : "Não encontramos compra com este e-mail nesta área. Use o mesmo e-mail da compra ou fale com o suporte.",
      });
    const account = await findAuthAccount(email).catch(() => undefined);
    if (account === null) return notFound();

    // Para onde o link volta: sempre a área do aluno, nunca a Gênio Play nem o Painel por engano.
    let target: Area;
    if (await belongsTo(email, area)) target = area;
    else if (isMainArea(area)) target = (await otherAreaFor({ id: account?.id, email }, { meta: account?.user_metadata || null })) || area;
    else if (!hasFree) return notFound();
    else target = area;

    // Painel→painel só para quem é do Painel (tem acesso lá e não tem área própria); o resto usa o endereço da área.
    let redirectTo = areaUrl(target);
    if (target.id === MAIN_AREA_ID) {
      const panel = await supabaseRest<{ access_status: string }[]>(`/entitlements?email=eq.${enc(email)}&select=access_status&limit=1`);
      if (panel.length) redirectTo = new URL(request.url).origin;
    }

    // O modelo de e-mail do Supabase lê area_nome/area_url do usuário: atualiza antes de mandar.
    if (account?.id) await tagAccountWithArea(account.id, target);

    await supabaseAuthRequest(`/recover?redirect_to=${enc(redirectTo)}`, {
      method: "POST",
      body: JSON.stringify({ email }),
    });
    return Response.json({ ok: true, message: MESSAGE });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Erro ao enviar o link.", 500);
  }
}
