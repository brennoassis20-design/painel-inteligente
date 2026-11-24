// Cartão 1080x1920 para o story, gerado no navegador (canvas). Só roda no cliente.
import { CHAMA_ALTURA, CHAMA_EXTERNA, CHAMA_INTERNA, CHAMA_LARGURA } from "./chama-svg.ts";

export const CARTAO_L = 1080;
export const CARTAO_A = 1920;

/** Quebra o texto em linhas que cabem em `largura` px (o `medir` vem do canvas). */
export function quebrarLinhas(texto: string, largura: number, medir: (t: string) => number, maxLinhas = 99): string[] {
  const palavras = texto.split(/\s+/).filter(Boolean);
  const linhas: string[] = [];
  let atual = "";
  for (const p of palavras) {
    const tentativa = atual ? `${atual} ${p}` : p;
    if (medir(tentativa) <= largura || !atual) atual = tentativa;
    else {
      linhas.push(atual);
      atual = p;
    }
  }
  if (atual) linhas.push(atual);
  if (linhas.length > maxLinhas) {
    const corte = linhas.slice(0, maxLinhas);
    corte[maxLinhas - 1] = corte[maxLinhas - 1].replace(/[\s,.;:!?]*$/, "") + "…";
    return corte;
  }
  return linhas;
}

/** Versículo curto para caber no cartão. */
export function versiculoCurto(texto: string, max = 140): string {
  const t = texto.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  const corte = t.slice(0, max);
  return corte.slice(0, Math.max(corte.lastIndexOf(" "), 40)).replace(/[\s,.;:!?]*$/, "") + "…";
}

export async function gerarCartao(args: { chama: number; versiculo: string; referencia: string; app?: string }): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = CARTAO_L;
  canvas.height = CARTAO_A;
  const c = canvas.getContext("2d");
  if (!c) throw new Error("Seu navegador não conseguiu montar a imagem.");
  const fonte = (peso: number, px: number) => `${peso} ${px}px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;

  // fundo: noite profunda com brilho de brasa embaixo da chama
  const fundo = c.createLinearGradient(0, 0, 0, CARTAO_A);
  fundo.addColorStop(0, "#070B18");
  fundo.addColorStop(1, "#14090A");
  c.fillStyle = fundo;
  c.fillRect(0, 0, CARTAO_L, CARTAO_A);
  const brilho = c.createRadialGradient(540, 760, 40, 540, 760, 760);
  brilho.addColorStop(0, "rgba(255,140,40,0.55)");
  brilho.addColorStop(1, "rgba(255,140,40,0)");
  c.fillStyle = brilho;
  c.fillRect(0, 0, CARTAO_L, CARTAO_A);

  // chama
  const escala = 5.2;
  c.save();
  c.translate(540 - (CHAMA_LARGURA * escala) / 2, 760 - (CHAMA_ALTURA * escala) / 2);
  c.scale(escala, escala);
  const g1 = c.createLinearGradient(50, 0, 50, CHAMA_ALTURA);
  g1.addColorStop(0, "#FFD36B");
  g1.addColorStop(0.5, "#FF8A1F");
  g1.addColorStop(1, "#E5421A");
  c.fillStyle = g1;
  c.fill(new Path2D(CHAMA_EXTERNA));
  const g2 = c.createLinearGradient(50, 50, 50, 120);
  g2.addColorStop(0, "#FFF3C4");
  g2.addColorStop(1, "#FFC247");
  c.fillStyle = g2;
  c.fill(new Path2D(CHAMA_INTERNA));
  c.restore();

  c.textAlign = "center";
  c.fillStyle = "#FFFFFF";
  c.font = fonte(900, 120);
  c.fillText(String(args.chama), 540, 1180);
  c.font = fonte(800, 64);
  c.fillStyle = "#FFC857";
  c.fillText(`🔥 ${args.chama === 1 ? "1 dia" : `${args.chama} dias`} de chama acesa`, 540, 1270);

  // versículo
  c.fillStyle = "#EDEFF7";
  c.font = fonte(500, 52);
  const linhas = quebrarLinhas(`“${versiculoCurto(args.versiculo)}”`, 880, (t) => c.measureText(t).width, 5);
  let y = 1410;
  for (const l of linhas) {
    c.fillText(l, 540, y);
    y += 70;
  }
  c.font = fonte(700, 44);
  c.fillStyle = "#FF9F1C";
  c.fillText(args.referencia, 540, y + 20);

  c.font = fonte(800, 48);
  c.fillStyle = "#FFFFFF";
  c.fillText(args.app || "Chama Acesa", 540, 1800);

  return new Promise((ok, erro) => canvas.toBlob((b) => (b ? ok(b) : erro(new Error("Não deu para gerar a imagem."))), "image/png"));
}

/** Compartilha pela Web Share API; sem suporte, baixa a imagem. Devolve como foi. */
export async function compartilharCartao(blob: Blob, texto: string): Promise<"compartilhado" | "baixado" | "cancelado"> {
  const arquivo = new File([blob], "minha-chama.png", { type: "image/png" });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (nav.share && nav.canShare?.({ files: [arquivo] })) {
    try {
      await nav.share({ files: [arquivo], text: texto });
      return "compartilhado";
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return "cancelado";
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "minha-chama.png";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  return "baixado";
}
