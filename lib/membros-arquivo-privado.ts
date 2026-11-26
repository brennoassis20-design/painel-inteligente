// Download privado: materiais cujo endereço começa com "privado:" ficam no Storage PRIVADO
// (bucket "membros-privado") e só viram link para quem tem acesso à aula.
// Formato no banco (mp_lessons.materials[].url): "privado:<pasta>/<arquivo>", ex.: "privado:maquina-de-videos/Maquina-de-Videos-v1.zip".
// Para trocar de versão: suba o arquivo novo com o MESMO nome no Storage (upsert) ou mude o endereço no material da aula.

export const PRIVATE_BUCKET = "membros-privado";
const PREFIX = "privado:";
const EXPIRES_SECONDS = 6 * 60 * 60;

export type Material = { titulo: string; url: string };
export type SignFn = (path: string, expiresIn: number) => Promise<string | null>;

export function isPrivateMaterial(url: string) {
  return typeof url === "string" && url.startsWith(PREFIX);
}

export function privatePath(url: string) {
  const path = url.slice(PREFIX.length).replace(/^\/+/, "");
  // Sem "..", sem barra dupla: o caminho é sempre dentro do bucket.
  if (!path || path.split("/").some((part) => !part || part === "." || part === "..")) return null;
  return path;
}

// Troca "privado:..." por link assinado; o que não conseguir assinar some da lista (nunca vaza o caminho).
export async function resolveMaterials(materials: Material[], sign: SignFn): Promise<Material[]> {
  const out: Material[] = [];
  for (const material of materials || []) {
    if (!isPrivateMaterial(material.url)) {
      out.push(material);
      continue;
    }
    const path = privatePath(material.url);
    const signed = path ? await sign(path, EXPIRES_SECONDS).catch(() => null) : null;
    if (signed) out.push({ titulo: material.titulo, url: signed });
  }
  return out;
}

// Assinatura real, pelo Storage do Supabase (chave de serviço só no servidor).
export function supabaseSigner(config: { url: string; serviceKey: string }): SignFn {
  return async (path, expiresIn) => {
    const filename = path.split("/").pop() || "arquivo";
    const response = await fetch(`${config.url}/storage/v1/object/sign/${PRIVATE_BUCKET}/${path.split("/").map(encodeURIComponent).join("/")}`, {
      method: "POST",
      headers: { apikey: config.serviceKey, Authorization: `Bearer ${config.serviceKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ expiresIn }),
    });
    if (!response.ok) return null;
    const data = (await response.json()) as { signedURL?: string };
    if (!data.signedURL) return null;
    const rel = data.signedURL.startsWith("/") ? data.signedURL : `/${data.signedURL}`;
    const link = `${config.url}/storage/v1${rel}`;
    return `${link}${link.includes("?") ? "&" : "?"}download=${encodeURIComponent(filename)}`;
  };
}
