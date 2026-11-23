"use client";

// Reduz a logo no navegador (máx. 360 px) e devolve um data URL pequeno (PNG; JPEG se o PNG ficar grande).
const MAX_LADO = 360;
const MAX_CARACTERES = 380_000;

export async function reduzirLogo(arquivo: File): Promise<string> {
  if (!arquivo.type.startsWith("image/")) throw new Error("Escolha um arquivo de imagem (PNG, JPG ou WebP).");
  if (arquivo.size > 8_000_000) throw new Error("A imagem é grande demais (máximo 8 MB).");
  const url = URL.createObjectURL(arquivo);
  try {
    const img = await new Promise<HTMLImageElement>((ok, erro) => {
      const i = new Image();
      i.onload = () => ok(i);
      i.onerror = () => erro(new Error("Não consegui abrir essa imagem. Tente outro arquivo (PNG ou JPG)."));
      i.src = url;
    });
    const escala = Math.min(1, MAX_LADO / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.max(1, Math.round(img.naturalWidth * escala));
    const h = Math.max(1, Math.round(img.naturalHeight * escala));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Seu navegador não conseguiu preparar a imagem.");
    ctx.drawImage(img, 0, 0, w, h);
    let saida = canvas.toDataURL("image/png");
    if (saida.length > MAX_CARACTERES) {
      // JPEG não tem transparência: fundo branco
      const c2 = document.createElement("canvas");
      c2.width = w;
      c2.height = h;
      const x2 = c2.getContext("2d");
      if (x2) {
        x2.fillStyle = "#ffffff";
        x2.fillRect(0, 0, w, h);
        x2.drawImage(img, 0, 0, w, h);
        saida = c2.toDataURL("image/jpeg", 0.85);
      }
    }
    if (saida.length > MAX_CARACTERES) throw new Error("A logo ficou grande demais. Use uma imagem mais simples.");
    return saida;
  } finally {
    URL.revokeObjectURL(url);
  }
}
