import { getBearerToken, jsonError, supabaseAuthRequest } from "@/lib/panel-server";

export async function POST(request: Request) {
  try {
    const token = getBearerToken(request);
    const payload = (await request.json()) as { password?: string };
    const password = payload.password || "";

    if (!token) {
      return jsonError("Link invalido ou expirado. Peca um novo em Esqueci minha senha.", 401);
    }

    if (password.length < 8) {
      return jsonError("A senha precisa ter pelo menos 8 caracteres.", 400);
    }

    const response = await supabaseAuthRequest("/user", {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ password }),
    });
    const data = await response.json();

    if (!response.ok) {
      return jsonError(data?.msg || "Link invalido ou expirado. Peca um novo em Esqueci minha senha.", response.status);
    }

    return Response.json({ ok: true });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Erro ao salvar a senha.", 500);
  }
}
