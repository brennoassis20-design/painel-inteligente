import {
  AccessError,
  PRODUCT_LIMIT,
  assertActiveProfile,
  createProductForUser,
  generateProductPayload,
  getUsage,
  getUserFromRequest,
  jsonError,
  syncProfileAccess,
} from "@/lib/panel-server";
import { productTypes, toneOptions } from "@/lib/product-engine";

export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    const profile = await syncProfileAccess(user);
    assertActiveProfile(profile);

    const usage = await getUsage(user.id);

    if (usage.productsUsed >= PRODUCT_LIMIT) {
      return jsonError("Limite mensal de produtos atingido.", 429, { usage });
    }

    const payload = (await request.json()) as {
      niche?: string;
      audience?: string;
      productType?: string;
      tone?: string;
      productBrief?: string;
      language?: string;
    };
    const niche = payload.niche?.trim() || "marmita fit";
    const audience = payload.audience?.trim() || "pessoas que querem vender comida saudavel";
    const productType = productTypes.includes(payload.productType || "") ? payload.productType || productTypes[0] : productTypes[0];
    const tone = toneOptions.includes(payload.tone || "") ? payload.tone || toneOptions[0] : toneOptions[0];
    const productBrief = payload.productBrief?.trim().slice(0, 1800) || "";
    const language = payload.language === "es" ? "es" : "pt";
    const generated = await generateProductPayload({ niche, audience, productType, tone, productBrief, language });
    const project = await createProductForUser(user.id, generated.product);
    const nextUsage = await getUsage(user.id);

    return Response.json({ project, product: generated.product, usage: nextUsage, source: generated.source }, { status: 201 });
  } catch (error) {
    if (error instanceof AccessError) {
      return jsonError("Acesso indisponivel para gerar produtos.", 403, { accessStatus: error.status });
    }

    return jsonError(error instanceof Error ? error.message : "Erro ao criar produto.", 500);
  }
}
