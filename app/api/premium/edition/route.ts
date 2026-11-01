import { AccessError, jsonError, supabaseRest } from "@/lib/panel-server";
import { createPremiumEdition, premiumPhotos } from "@/lib/premium";
import { loadOwnProject, openRouterMessage, studentKey } from "../shared";

// A IA forte escreve a edição inteira (1 a 3 min). Fica salva no projeto: gerar o PDF de novo não cobra.
export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: Request) {
  try {
    const { projectId, redo } = (await request.json()) as { projectId?: unknown; redo?: unknown };
    const { project, edition: saved } = await loadOwnProject(request, projectId);
    if (!project) return jsonError("Projeto não encontrado.", 404);
    if (saved && redo !== true) return Response.json({ edition: saved, photos: premiumPhotos(saved), reused: true });

    const key = studentKey(request);
    if (!key) return jsonError("Coloque sua chave da OpenRouter para usar a Lâmpada de Ouro.", 400, { needsKey: true });

    const edition = await createPremiumEdition(key, project.payload);
    await supabaseRest(`/projects?id=eq.${encodeURIComponent(project.id)}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ payload: { ...project.payload, premium: edition }, updated_at: new Date().toISOString() }),
    });
    return Response.json({ edition, photos: premiumPhotos(edition) });
  } catch (error) {
    if (error instanceof AccessError) return jsonError("Acesso indisponível.", 403, { accessStatus: error.status });
    console.error("Edição premium falhou.", error instanceof Error ? error.message.slice(0, 300) : error);
    return jsonError(openRouterMessage(error) || "Não foi possível criar a edição. Tente de novo.", 500);
  }
}
