import {
  AccessError,
  LimitError,
  assertActiveProfile,
  getUsage,
  getUserFromRequest,
  jsonError,
  syncProfileAccess,
  updateCopyForProject,
} from "@/lib/panel-server";
import { toneOptions } from "@/lib/product-engine";

export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    const profile = await syncProfileAccess(user);
    assertActiveProfile(profile);

    const payload = (await request.json()) as {
      projectId?: string;
      audience?: string;
      tone?: string;
      copyBrief?: string;
    };
    const projectId = payload.projectId?.trim() || "";

    if (!projectId) {
      return jsonError("Selecione um produto para alterar a copy.", 400);
    }

    const tone = toneOptions.includes(payload.tone || "") ? payload.tone || toneOptions[0] : toneOptions[0];
    const result = await updateCopyForProject(user.id, projectId, {
      audience: payload.audience?.trim() || "pessoas que querem uma solucao simples",
      tone,
      copyBrief: payload.copyBrief?.trim() || "",
    });
    const usage = await getUsage(user.id);

    return Response.json({ ...result, usage });
  } catch (error) {
    if (error instanceof AccessError) {
      return jsonError("Acesso indisponivel para alterar copy.", 403, { accessStatus: error.status });
    }

    if (error instanceof LimitError) {
      return jsonError(error.message, 429);
    }

    return jsonError(error instanceof Error ? error.message : "Erro ao alterar copy.", 500);
  }
}
