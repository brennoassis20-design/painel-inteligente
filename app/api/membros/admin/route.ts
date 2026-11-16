import { createApiKey, getSettings, listApiKeys, OpError, opsAsTools, revokeApiKey, runOp } from "@/lib/membros";
import { withAdmin } from "@/lib/membros-http";
import { supabaseRest } from "@/lib/panel-server";

// Painel de administração: as mesmas operações do conector de IA + chaves e integrações (só pela tela).
export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { op?: string; args?: Record<string, unknown> };
  const origin = new URL(request.url).origin;
  return withAdmin(request, async () => {
    const op = String(body.op || "");
    const args = body.args || {};
    switch (op) {
      case "ferramentas":
        return opsAsTools();
      case "chaves_listar":
        return listApiKeys();
      case "chave_criar": {
        const key = await createApiKey(String(args.nome || "Conector de IA"));
        return { key, url: `${origin}/api/mcp/${key}` };
      }
      case "chave_revogar":
        return revokeApiKey(String(args.id || ""));
      case "integracoes": {
        const settings = await getSettings();
        return {
          hotmart: `${origin}/api/webhooks/membros/hotmart`,
          cakto: `${origin}/api/webhooks/membros/cakto?secret=${settings.webhook_secret}`,
          eduzz: `${origin}/api/webhooks/membros/eduzz?secret=${settings.webhook_secret}`,
          generico: `${origin}/api/webhooks/membros/{plataforma}?secret=${settings.webhook_secret}`,
          hotmart_hottok_salvo: Boolean(settings.hotmart_hottok),
        };
      }
      case "salvar_hottok": {
        const hottok = String(args.hottok || "").trim();
        if (!hottok) throw new OpError("Cole o hottok da Hotmart.");
        await supabaseRest("/mp_settings?id=eq.1", { method: "PATCH", body: JSON.stringify({ hotmart_hottok: hottok }) });
        return { ok: true };
      }
      default:
        return runOp(op, args);
    }
  });
}
