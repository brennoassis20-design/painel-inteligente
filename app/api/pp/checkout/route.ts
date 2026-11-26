import { supabaseRest } from "@/lib/panel-server";
import { buildCheckoutUrl, ppJson, ppPreflight, slugFromParam, validEmail } from "@/lib/pp";
import { ppAreaId } from "@/lib/pp-server";

export const OPTIONS = ppPreflight;

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const slug = slugFromParam(params.get("product"));
  if (!slug) return ppJson(request, { error: "Unknown product." }, 400);
  const email = validEmail(params.get("email"));
  try {
    const areaId = await ppAreaId();
    const rows = areaId
      ? await supabaseRest<{ checkout_url: string | null }[]>(`/mp_products?area_id=eq.${areaId}&slug=eq.${slug}&published=eq.true&select=checkout_url&limit=1`)
      : [];
    const base = rows[0]?.checkout_url;
    if (!base) return ppJson(request, { error: "Checkout not available." }, 404);
    return ppJson(request, { url: buildCheckoutUrl(base, slug, email || undefined) });
  } catch (error) {
    console.error("pp-checkout", error instanceof Error ? error.message : error);
    return ppJson(request, { error: "Could not open checkout." }, 500);
  }
}
