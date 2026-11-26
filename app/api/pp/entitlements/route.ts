import { getUserFromRequest } from "@/lib/panel-server";
import { ppJson, ppPreflight } from "@/lib/pp";
import { entitlementsFor } from "@/lib/pp-server";

export const OPTIONS = ppPreflight;

export async function GET(request: Request) {
  let user;
  try {
    user = await getUserFromRequest(request);
  } catch {
    return ppJson(request, { error: "Session expired. Sign in again." }, 401);
  }
  try {
    return ppJson(request, await entitlementsFor(user.email));
  } catch (error) {
    console.error("pp-entitlements", error instanceof Error ? error.message : error);
    return ppJson(request, { error: "Could not load your access." }, 500);
  }
}
