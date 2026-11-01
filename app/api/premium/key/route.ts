import { getUserFromRequest, jsonError } from "@/lib/panel-server";
import { studentKey } from "../shared";

// Testa a chave do aluno e mostra o crédito que sobra (a chave não é guardada).
export async function POST(request: Request) {
  try {
    await getUserFromRequest(request);
  } catch {
    return jsonError("Sessão inválida.", 401);
  }
  const key = studentKey(request);
  if (!key) return jsonError("Chave em formato inválido. Ela começa com sk-or-.", 400);
  const [keyInfo, credits] = await Promise.all([
    fetch("https://openrouter.ai/api/v1/key", { headers: { Authorization: `Bearer ${key}` } }),
    fetch("https://openrouter.ai/api/v1/credits", { headers: { Authorization: `Bearer ${key}` } }),
  ]);
  if (!keyInfo.ok) return jsonError("A OpenRouter não aceitou esta chave. Confira se copiou a chave inteira.", 400);
  const info = ((await keyInfo.json()) as { data?: { limit_remaining?: number | null } }).data || {};
  const balance = credits.ok ? ((await credits.json()) as { data?: { total_credits?: number; total_usage?: number } }).data : undefined;
  const remaining = balance ? (balance.total_credits || 0) - (balance.total_usage || 0) : info.limit_remaining ?? null;
  return Response.json({ ok: true, remaining: typeof remaining === "number" ? Math.max(0, remaining) : null });
}
