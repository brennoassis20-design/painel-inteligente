import { AccessError, jsonError } from "@/lib/panel-server";
import { premiumFontCss, renderHtmlPdf } from "@/lib/pdf-render";
import { premiumFontFiles, premiumPhotos, renderPremiumHtml } from "@/lib/premium";
import { readCachedImage } from "@/lib/storage";
import { loadOwnProject } from "../shared";

// Monta o PDF da edição com as fotos já guardadas (não usa a chave: não gera nada novo).
export const runtime = "nodejs";
export const maxDuration = 90;

export async function POST(request: Request) {
  try {
    const { projectId } = (await request.json()) as { projectId?: unknown };
    const { user, project, edition } = await loadOwnProject(request, projectId);
    if (!project || !edition) return jsonError("Edição não encontrada.", 404);

    const stamp = edition.createdAt.replace(/\D/g, "");
    const images: Record<string, string> = {};
    await Promise.all(
      premiumPhotos(edition)
        .filter((photo) => !photo.id.startsWith("criativo"))
        .map(async (photo) => {
          const image = await readCachedImage(`${user.id}/${project.id}/premium-${stamp}-${photo.id}`);
          if (image) images[photo.id] = `data:${image.type};base64,${image.bytes.toString("base64")}`;
        }),
    );

    const html = renderPremiumHtml(edition, project.payload, images, await premiumFontCss(premiumFontFiles));
    const pdf = await renderHtmlPdf(html);
    return new Response(Buffer.from(pdf), {
      headers: { "Content-Type": "application/pdf", "Content-Length": String(pdf.byteLength), "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (error instanceof AccessError) return jsonError("Acesso indisponível.", 403, { accessStatus: error.status });
    console.error("PDF premium falhou.", error);
    return jsonError("Não foi possível montar o PDF.", 500);
  }
}
