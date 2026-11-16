import { randomBytes } from "node:crypto";
import { getSupabaseConfig } from "@/lib/panel-server";
import { OpError } from "@/lib/membros";
import { withAdmin } from "@/lib/membros-http";

// Envio de imagem do admin (capas, banners, logo) para o Storage público "membros".
const TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const KINDS = new Set(["logo", "inicio", "inicio-celular", "capa", "banner", "modulo"]);
const MAX = 5 * 1024 * 1024;

export async function POST(request: Request) {
  const form = await request.formData().catch(() => null);
  return withAdmin(request, async () => {
    const file = form?.get("arquivo");
    const kind = String(form?.get("tipo") || "");
    if (!(file instanceof File)) throw new OpError("Escolha uma imagem.");
    if (!KINDS.has(kind)) throw new OpError("Tipo de imagem inválido.");
    const ext = TYPES[file.type];
    if (!ext) throw new OpError("Use JPG, PNG ou WEBP.");
    if (file.size > MAX) throw new OpError("A imagem passa de 5 MB. Exporte menor (JPG com qualidade 80 resolve).");

    const path = `${kind}/${Date.now()}-${randomBytes(4).toString("hex")}.${ext}`;
    const config = getSupabaseConfig();
    const response = await fetch(`${config.url}/storage/v1/object/membros/${path}`, {
      method: "POST",
      headers: {
        apikey: config.serviceKey,
        Authorization: `Bearer ${config.serviceKey}`,
        "Content-Type": file.type,
        "Cache-Control": "31536000",
        "x-upsert": "false",
      },
      body: Buffer.from(await file.arrayBuffer()),
    });
    if (!response.ok) throw new Error((await response.text()) || "Falha ao guardar a imagem.");
    return { url: `${config.url}/storage/v1/object/public/membros/${path}` };
  });
}
