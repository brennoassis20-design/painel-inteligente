import { AccessError, jsonError, supabaseRest } from "@/lib/panel-server";
import { createPremiumAds } from "@/lib/premium";
import { SessionError, loadOwnProject, openRouterMessage, studentKey } from "../shared";

// Anúncios da Lâmpada de Ouro (centavos de dólar). Ficam salvos na edição: abrir de novo não cobra.
export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: Request) {
  try {
    const { projectId, redo } = (await request.json()) as { projectId?: unknown; redo?: unknown };
    const { project, edition } = await loadOwnProject(request, projectId);
    if (!project || !edition) return jsonError("Edição não encontrada.", 404);
    if (edition.ads && redo !== true) return Response.json({ ads: edition.ads, reused: true });

    const key = studentKey(request);
    if (!key) return jsonError("Coloque sua chave da OpenRouter.", 400, { needsKey: true });
    const ads = await createPremiumAds(key, edition, project.payload);
    await supabaseRest(`/projects?id=eq.${encodeURIComponent(project.id)}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ payload: { ...project.payload, premium: { ...edition, ads } }, updated_at: new Date().toISOString() }),
    });
    return Response.json({ ads });
  } catch (error) {
    if (error instanceof SessionError) return jsonError("Entre de novo no painel.", 401);
    if (error instanceof AccessError) return jsonError("Acesso indisponível.", 403, { accessStatus: error.status });
    console.error("Anúncios premium falharam.", error instanceof Error ? error.message.slice(0, 300) : error);
    return jsonError(openRouterMessage(error) || "Não foi possível escrever os anúncios.", 500);
  }
}
