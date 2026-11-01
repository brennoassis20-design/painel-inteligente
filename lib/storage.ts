// Artes geradas por IA ficam guardadas no Storage (bucket privado): baixar de novo não gera (nem cobra) outra vez.
import { getSupabaseConfig } from "@/lib/panel-server";
import { PACK_STORAGE_BUCKET, packImageExtensions } from "@/lib/pack";

function storageHeaders(serviceKey: string, extra: Record<string, string> = {}) {
  return { Authorization: `Bearer ${serviceKey}`, apikey: serviceKey, ...extra };
}

export async function readCachedImage(path: string) {
  const { url, serviceKey } = getSupabaseConfig();
  const response = await fetch(`${url}/storage/v1/object/${PACK_STORAGE_BUCKET}/${path}`, { headers: storageHeaders(serviceKey) });
  const type = response.headers.get("content-type") || "";
  return response.ok && packImageExtensions[type] ? { bytes: Buffer.from(await response.arrayBuffer()), type } : null;
}

export async function saveCachedImage(path: string, image: { bytes: Buffer; type: string }) {
  const { url, serviceKey } = getSupabaseConfig();
  const upload = () =>
    fetch(`${url}/storage/v1/object/${PACK_STORAGE_BUCKET}/${path}`, {
      method: "POST",
      headers: storageHeaders(serviceKey, { "Content-Type": image.type, "x-upsert": "true" }),
      body: new Uint8Array(image.bytes),
    });
  let response = await upload();
  if (!response.ok && /bucket not found/i.test(await response.text())) {
    // Primeira arte do painel: cria o bucket privado e tenta de novo.
    await fetch(`${url}/storage/v1/bucket`, {
      method: "POST",
      headers: storageHeaders(serviceKey, { "Content-Type": "application/json" }),
      body: JSON.stringify({ id: PACK_STORAGE_BUCKET, name: PACK_STORAGE_BUCKET, public: false }),
    });
    response = await upload();
  }
  if (!response.ok) console.warn("Arte não foi guardada.", path, response.status);
}
