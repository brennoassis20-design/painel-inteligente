import { AccessError, jsonError } from "@/lib/panel-server";
import { generatePackImage } from "@/lib/pack";
import { premiumImageModel, premiumImagePrompt, premiumPhotos } from "@/lib/premium";
import { readCachedImage, saveCachedImage } from "@/lib/storage";
import { SessionError, loadOwnProject, openRouterMessage, studentKey } from "../shared";

// Uma foto por chamada (o navegador chama de 3 em 3). Já gerada → vem do Storage, sem chave e sem custo.
export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const { projectId, photoId } = (await request.json()) as { projectId?: unknown; photoId?: unknown };
    const { user, project, edition } = await loadOwnProject(request, projectId);
    if (!project || !edition) return jsonError("Edição não encontrada.", 404);
    const photo = premiumPhotos(edition).find((item) => item.id === photoId);
    if (!photo) return jsonError("Foto não encontrada nesta edição.", 404);

    // A data da edição entra no caminho: refazer a edição gera fotos novas.
    const path = `${user.id}/${project.id}/premium-${edition.createdAt.replace(/\D/g, "")}-${photo.id}`;
    let image = await readCachedImage(path);
    if (!image) {
      const key = studentKey(request);
      if (!key) return jsonError("Coloque sua chave da OpenRouter.", 400, { needsKey: true });
      image = await generatePackImage(key, premiumImagePrompt(photo), photo.aspect, premiumImageModel());
      await saveCachedImage(path, image);
    }
    return new Response(new Uint8Array(image.bytes), {
      headers: { "Content-Type": image.type, "Content-Length": String(image.bytes.byteLength), "Cache-Control": "private, max-age=3600" },
    });
  } catch (error) {
    if (error instanceof SessionError) return jsonError("Entre de novo no painel.", 401);
    if (error instanceof AccessError) return jsonError("Acesso indisponível.", 403, { accessStatus: error.status });
    console.error("Foto premium falhou.", error instanceof Error ? error.message.slice(0, 300) : error);
    return jsonError(openRouterMessage(error) || "Não foi possível gerar esta foto.", 500);
  }
}
