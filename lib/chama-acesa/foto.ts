// Foto de perfil no navegador: recorta o quadrado do meio e reduz para 256x256 antes de subir (só no cliente).
import { LADO_FOTO, MAX_FOTO_BYTES } from "./conta";

export interface FotoPronta { dados: string; mime: string; previa: string }

function paraBase64(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

/** Arquivo escolhido -> quadrado 256x256 em WebP (ou JPEG nos navegadores que não gravam WebP). */
export async function reduzirFoto(arquivo: File): Promise<FotoPronta> {
  if (!/^image\//.test(arquivo.type)) throw new Error("Escolha uma imagem (foto).");
  let img: ImageBitmap;
  try {
    img = await createImageBitmap(arquivo);
  } catch {
    throw new Error("Não deu para abrir essa imagem. Tente outra foto.");
  }
  const lado = Math.min(img.width, img.height);
  const canvas = document.createElement("canvas");
  canvas.width = LADO_FOTO;
  canvas.height = LADO_FOTO;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Seu navegador não conseguiu preparar a foto.");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, (img.width - lado) / 2, (img.height - lado) / 2, lado, lado, 0, 0, LADO_FOTO, LADO_FOTO);
  img.close?.();
  for (const [tipo, q] of [["image/webp", 0.85], ["image/jpeg", 0.85], ["image/jpeg", 0.7]] as const) {
    const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, tipo, q));
    // O Safari às vezes devolve PNG quando não sabe gravar WebP: nesse caso tenta o próximo formato.
    if (!blob || blob.type !== tipo || blob.size > MAX_FOTO_BYTES) continue;
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const dados = paraBase64(bytes);
    return { dados, mime: tipo, previa: `data:${tipo};base64,${dados}` };
  }
  throw new Error("Não deu para reduzir essa foto. Tente outra.");
}
