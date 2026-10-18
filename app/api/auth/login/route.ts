import { jsonError, supabaseAuthRequest, syncProfileAccess } from "@/lib/panel-server";

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
