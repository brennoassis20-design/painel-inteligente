import { getPublicAppUrl, jsonError, supabaseAuthRequest } from "@/lib/panel-server";

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as {
      name?: string;
      email?: string;
      password?: string;
    };
    const email = payload.email?.trim().toLowerCase() || "";
    const password = payload.password || "";
    const name = payload.name?.trim() || "Usuario";

    if (!email || !password) {
      return jsonError("Preencha email e senha.", 400);
    }

    const redirectTo = getPublicAppUrl(request);
    const response = await supabaseAuthRequest(`/signup?redirect_to=${encodeURIComponent(redirectTo)}`, {
      method: "POST",
      body: JSON.stringify({
        email,
        password,
        data: { name },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return jsonError(data?.msg || data?.error_description || "Nao foi possivel criar a conta.", response.status);
    }

    return Response.json({
      ok: true,
      message: "Conta criada. Confirme seu email antes de acessar.",
    });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Erro ao criar conta.", 500);
  }
}
