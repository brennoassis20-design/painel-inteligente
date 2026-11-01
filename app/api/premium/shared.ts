import { assertActiveProfile, getUserFromRequest, supabaseRest, syncProfileAccess } from "@/lib/panel-server";
import { PREMIUM_KEY_HEADER, normalizeEdition } from "@/lib/premium";
import type { ProductResult } from "@/lib/product-engine";

// A chave OpenRouter é do aluno: vem no cabeçalho de cada pedido e nunca é gravada nem registrada em log.
export function studentKey(request: Request) {
  const key = (request.headers.get(PREMIUM_KEY_HEADER) || "").trim();
  return /^sk-or-[\w-]{20,}$/.test(key) ? key : "";
}

export class SessionError extends Error {}

export async function loadOwnProject(request: Request, projectId: unknown) {
  const user = await getUserFromRequest(request).catch(() => {
    throw new SessionError("Sessão inválida.");
  });
  const profile = await syncProfileAccess(user);
  assertActiveProfile(profile);
  if (typeof projectId !== "string" || !projectId) return { user, project: null };
  const [project] = await supabaseRest<{ id: string; payload: ProductResult & { premium?: unknown } }[]>(
    `/projects?id=eq.${encodeURIComponent(projectId)}&user_id=eq.${encodeURIComponent(user.id)}&select=id,payload`,
  );
  return { user, project: project || null, edition: project ? normalizeEdition(project.payload.premium) : null };
}

// Erro da OpenRouter em português, para o aluno saber o que fazer.
export function openRouterMessage(error: unknown) {
  const text = error instanceof Error ? error.message : String(error);
  if (/401|invalid|no auth|user not found/i.test(text)) return "Sua chave da OpenRouter não foi aceita. Confira se colou a chave inteira (começa com sk-or-).";
  if (/402|credit|insufficient|afford/i.test(text)) return "Sua conta da OpenRouter está sem crédito. Coloque crédito em openrouter.ai/credits e tente de novo.";
  if (/429|rate/i.test(text)) return "A OpenRouter pediu para esperar um pouco. Tente de novo em 1 minuto.";
  return "";
}
