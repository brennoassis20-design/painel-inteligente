import { publicAreaInfo } from "@/lib/membros";
import { areaFrom } from "@/lib/membros-http";
import { jsonError } from "@/lib/panel-server";

// Dados públicos da área (tela de entrada antes do login): nome, logo, cores, pixel.
export async function GET(request: Request) {
  try {
    return Response.json(await publicAreaInfo(await areaFrom(request)), { headers: { "Cache-Control": "private, max-age=60" } });
  } catch {
    return jsonError("Área não encontrada.", 404);
  }
}
