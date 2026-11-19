import { jsonError, supabaseAuthRequest, syncProfileAccess } from "@/lib/panel-server";
import { panelRedirectFor } from "@/lib/membros";
import { areaSlugFrom } from "@/lib/membros-http";

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as {
      email?: string;
      password?: string;
    };
    const email = payload.email?.trim().toLowerCase() || "";
    const password = payload.password || "";

    if (!email || !password) {
      return jsonError("Preencha email e senha.", 400);
    }

    const response = await supabaseAuthRequest("/token?grant_type=password", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    const data = await response.json();

    if (!response.ok) {
      return jsonError("E-mail ou senha incorretos.", response.status);
    }

    const user = {
      id: data.user.id,
      email: String(data.user.email || "").toLowerCase(),
      name: data.user.user_metadata?.name,
    };
    // Entrada pela área de membros (cabeçalho X-Area ou X-Membros): não cria perfil do Painel.
    if (request.headers.get("x-membros") === "1" || areaSlugFrom(request)) {
      return Response.json({
        session: { accessToken: data.access_token, refreshToken: data.refresh_token, expiresIn: data.expires_in },
        user,
        profile: null,
      });
    }

    // Painel: quem é aluno de uma área e não tem acesso ao Painel vai para a área dele (sem criar perfil "pendente").
    const redirect = await panelRedirectFor(user, data.user.user_metadata || null).catch(() => null);
    if (redirect) return Response.json({ redirect });

    const profile = await syncProfileAccess(user);

    return Response.json({
      session: {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresIn: data.expires_in,
      },
      user,
      profile,
    });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Erro ao acessar.", 500);
  }
}
