import { saveProgress } from "@/lib/membros";
import { withUser } from "@/lib/membros-http";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { aula?: string; concluida?: boolean };
  return withUser(request, (user) => saveProgress(user, String(body.aula || ""), Boolean(body.concluida)));
}
