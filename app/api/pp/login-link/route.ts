import { canEnterApp, ppAppUrl, ppJson, ppPreflight, validEmail } from "@/lib/pp";
import { entitlementsFor, logPp, loginLinkRecent, ppAreaId, sendLoginLink } from "@/lib/pp-server";

export const maxDuration = 30;
export const OPTIONS = ppPreflight;

// Resposta sempre igual (tenha ou não acesso), para não revelar quem é cliente.
const GENERIC = { ok: true, message: "If this email has Pocket Portuguese access, a sign-in link is on its way." };

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { email?: string };
  const email = validEmail(body.email);
  if (!email) return ppJson(request, { error: "Enter a valid email." }, 400);
  try {
    const appUrl = ppAppUrl();
    const areaId = await ppAreaId();
    if (appUrl && areaId && !(await loginLinkRecent(email, areaId))) {
      const ent = await entitlementsFor(email);
      if (canEnterApp(ent)) {
        await logPp(areaId, email, "pp_login_link");
        await sendLoginLink(email, appUrl);
      }
    }
  } catch (error) {
    console.error("pp-login-link", error instanceof Error ? error.message : error);
  }
  return ppJson(request, GENERIC);
}
