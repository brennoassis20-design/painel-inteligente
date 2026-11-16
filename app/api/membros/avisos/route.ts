import { OpError } from "@/lib/membros";
import { withUser } from "@/lib/membros-http";
import { markNoticesSeen, removePushSub, savePushSub, studentNotices, vapidPublicKey } from "@/lib/membros-avisos";

export async function GET(request: Request) {
  return withUser(request, async (user) => ({ ...(await studentNotices(user.id)), vapid: await vapidPublicKey() }));
}

// acao: "lidas" (zera o sino), "inscrever" (liga aviso no celular), "sair" (desliga).
export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { acao?: string; subscription?: { endpoint: string; keys?: { p256dh?: string; auth?: string } } };
  const agent = request.headers.get("user-agent") || "";
  return withUser(request, async (user) => {
    if (body.acao === "lidas") return markNoticesSeen(user.id);
    if (body.acao === "inscrever") return savePushSub(user, body.subscription as never, agent);
    if (body.acao === "sair") return removePushSub(String(body.subscription?.endpoint || ""));
    throw new OpError("Ação inválida.");
  });
}
