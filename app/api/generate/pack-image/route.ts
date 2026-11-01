import {
  AccessError,
  assertActiveProfile,
  getServerAiKey,
  getUserFromRequest,
  jsonError,
  supabaseRest,
  syncProfileAccess,
} from "@/lib/panel-server";
import { generatePackImage, normalizePack, packImagePrompt } from "@/lib/pack";
import { readCachedImage, saveCachedImage } from "@/lib/storage";

export const runtime = "nodejs";
export const maxDuration = 60;

// Gera UMA arte do pack por chamada (o ZIP chama de 4 em 4). O prompt vem do projeto salvo, nunca do navegador.
export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    const profile = await syncProfileAccess(user);
    assertActiveProfile(profile);

    const { projectId, index } = (await request.json()) as { projectId?: unknown; index?: unknown };
    if (typeof projectId !== "string" || !Number.isInteger(index)) return jsonError("Pedido inválido.", 400);

    const [project] = await supabaseRest<{ id: string; payload: { pack?: unknown } }[]>(
      `/projects?id=eq.${encodeURIComponent(projectId)}&user_id=eq.${encodeURIComponent(user.id)}&select=id,payload`,
    );
    const pack = normalizePack(project?.payload?.pack);
    const position = index as number;
    if (!pack || position < 0 || position >= pack.items.length) return jsonError("Arte não encontrada neste projeto.", 404);

    // Sem extensão no Storage: o tipo (PNG ou JPEG) fica no content-type do objeto.
    const path = `${user.id}/${project.id}/${position}`;
    let image = await readCachedImage(path);
    if (!image) {
      const apiKey = getServerAiKey();
      if (!apiKey) return jsonError("Chave de IA não configurada.", 500);
      image = await generatePackImage(apiKey, packImagePrompt(pack, position));
      await saveCachedImage(path, image);
    }

    return new Response(new Uint8Array(image.bytes), {
      headers: { "Content-Type": image.type, "Content-Length": String(image.bytes.byteLength), "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (error instanceof AccessError) {
      return jsonError("Acesso indisponivel para gerar o pack.", 403, { accessStatus: error.status });
    }

    console.error("Arte do pack falhou.", error);
    return jsonError("Não foi possível gerar esta arte.", 500);
  }
}
