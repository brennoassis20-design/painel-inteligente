import { jsonError, supabaseAuthRequest } from "@/lib/panel-server";

// Troca o refresh token por uma sessão nova, para o aluno não precisar entrar de novo a cada hora.
export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { refreshToken?: string };
  if (!body.refreshToken) return jsonError("Sessão ausente.", 401);
  const response = await supabaseAuthRequest("/token?grant_type=refresh_token", {
    method: "POST",
    body: JSON.stringify({ refresh_token: body.refreshToken }),
  });
  const data = await response.json();
  if (!response.ok) return jsonError("Sua sessão expirou. Entre de novo.", 401);
  return Response.json({ accessToken: data.access_token, refreshToken: data.refresh_token });
}
