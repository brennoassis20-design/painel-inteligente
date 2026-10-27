import {
  AccessError,
  assertActiveProfile,
  getServerAiKey,
  getSupabaseConfig,
  getUserFromRequest,
  jsonError,
  supabaseRest,
  syncProfileAccess,
} from "@/lib/panel-server";
import { PACK_STORAGE_BUCKET, generatePackImage, normalizePack, packImageExtensions, packImagePrompt } from "@/lib/pack";

export const runtime = "nodejs";
export const maxDuration = 60;

// Gera UMA arte do pack por chamada (o ZIP chama de 4 em 4). O prompt vem do projeto salvo, nunca do navegador,
// e a arte fica guardada no Storage: baixar o pacote de novo não gera (nem cobra) outra vez.
function storageHeaders(serviceKey: string, extra: Record<string, string> = {}) {
  return { Authorization: `Bearer ${serviceKey}`, apikey: serviceKey, ...extra };
}

async function readCached(url: string, serviceKey: string, path: string) {
  const response = await fetch(`${url}/storage/v1/object/${PACK_STORAGE_BUCKET}/${path}`, { headers: storageHeaders(serviceKey) });
  const type = response.headers.get("content-type") || "";
  return response.ok && packImageExtensions[type] ? { bytes: Buffer.from(await response.arrayBuffer()), type } : null;
}

async function saveCached(url: string, serviceKey: string, path: string, image: { bytes: Buffer; type: string }) {
  const upload = () =>
    fetch(`${url}/storage/v1/object/${PACK_STORAGE_BUCKET}/${path}`, {
      method: "POST",
      headers: storageHeaders(serviceKey, { "Content-Type": image.type, "x-upsert": "true" }),
      body: new Uint8Array(image.bytes),
    });
  let response = await upload();
  if (!response.ok && /bucket not found/i.test(await response.text())) {
    // Primeiro pack do painel: cria o bucket privado e tenta de novo.
    await fetch(`${url}/storage/v1/bucket`, {
      method: "POST",
      headers: storageHeaders(serviceKey, { "Content-Type": "application/json" }),
      body: JSON.stringify({ id: PACK_STORAGE_BUCKET, name: PACK_STORAGE_BUCKET, public: false }),
    });
    response = await upload();
  }
  if (!response.ok) console.warn("Arte do pack não foi guardada.", path, response.status);
}

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

    const { url, serviceKey } = getSupabaseConfig();
    // Sem extensão no Storage: o tipo (PNG ou JPEG) fica no content-type do objeto.
    const path = `${user.id}/${project.id}/${position}`;
    let image = await readCached(url, serviceKey, path);
    if (!image) {
      const apiKey = getServerAiKey();
      if (!apiKey) return jsonError("Chave de IA não configurada.", 500);
      image = await generatePackImage(apiKey, packImagePrompt(pack, position));
      await saveCached(url, serviceKey, path, image);
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
