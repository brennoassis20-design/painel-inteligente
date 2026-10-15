import { AccessError, assertActiveProfile, getUserFromRequest, jsonError, syncProfileAccess } from "@/lib/panel-server";
import { renderProductPdf } from "@/lib/pdf-render";
import type { DocumentProduct } from "@/lib/product-document";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BODY = 250_000;

function isProduct(value: unknown): value is DocumentProduct {
  const product = value as DocumentProduct;
  return (
    typeof product?.title === "string" &&
    typeof product.subtitle === "string" &&
    typeof product.promise === "string" &&
    Array.isArray(product.modules) &&
    Array.isArray(product.productContent) &&
    product.productContent.length > 0 &&
    product.productContent.length <= 14 &&
    product.productContent.every((block) => typeof block?.title === "string" && typeof block.body === "string" && typeof block.task === "string")
  );
}

// Renderiza o 01-produto-pronto.pdf com o template premium. O ZIP chama esta rota e, se ela falhar,
// usa o PDF simples gerado no navegador.
export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    const profile = await syncProfileAccess(user);
    assertActiveProfile(profile);

    const raw = await request.text();
    if (raw.length > MAX_BODY) return jsonError("Projeto grande demais para gerar o PDF.", 413);
    const { product } = JSON.parse(raw) as { product?: unknown };
    if (!isProduct(product)) return jsonError("Projeto inválido para gerar o PDF.", 400);

    const pdf = await renderProductPdf(product);
    return new Response(Buffer.from(pdf), {
      headers: { "Content-Type": "application/pdf", "Content-Length": String(pdf.byteLength), "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (error instanceof AccessError) {
      return jsonError("Acesso indisponivel para gerar o PDF.", 403, { accessStatus: error.status });
    }

    console.error("PDF premium falhou.", error);
    return jsonError("Não foi possível gerar o PDF.", 500);
  }
}
