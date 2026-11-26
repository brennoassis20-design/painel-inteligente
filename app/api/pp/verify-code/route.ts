import { ppJson, ppPreflight, verifyCodeFlow } from "@/lib/pp";
import { ppAreaId, verifyDeps } from "@/lib/pp-server";

export const maxDuration = 30;
export const OPTIONS = ppPreflight;

// Login por código de 6 dígitos (para o app instalado no iPhone, que não compartilha sessão com o Safari).
export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { email?: string; code?: string };
  try {
    const areaId = await ppAreaId();
    if (!areaId) return ppJson(request, { error: "Invalid or expired code." }, 400);
    const result = await verifyCodeFlow(verifyDeps(areaId), body.email, body.code);
    return ppJson(request, result.body, result.status);
  } catch (error) {
    console.error("pp-verify-code", error instanceof Error ? error.message : error);
    return ppJson(request, { error: "Could not verify the code." }, 500);
  }
}
