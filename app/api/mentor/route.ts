import {
  AccessError,
  assertActiveProfile,
  getUserFromRequest,
  jsonError,
  syncProfileAccess,
} from "@/lib/panel-server";
import { askMentor, getMentorUsage, MentorContext, MentorLimitError } from "@/lib/mentor";

async function authorize(request: Request) {
  const user = await getUserFromRequest(request);
  const profile = await syncProfileAccess(user);
  assertActiveProfile(profile);
  return user;
}

export async function GET(request: Request) {
  try {
    const user = await authorize(request);
    return Response.json({ usage: await getMentorUsage(user.id) });
  } catch (error) {
    if (error instanceof AccessError) {
      return jsonError("Acesso indisponível para o Mentor.", 403, { accessStatus: error.status });
    }
    return jsonError(error instanceof Error ? error.message : "Erro ao abrir o Mentor.", 500);
  }
}

export async function POST(request: Request) {
  try {
    const user = await authorize(request);
    const payload = (await request.json()) as { messages?: unknown; context?: MentorContext };
    const result = await askMentor(user.id, payload.messages, payload.context);
    return Response.json(result);
  } catch (error) {
    if (error instanceof AccessError) {
      return jsonError("Acesso indisponível para o Mentor.", 403, { accessStatus: error.status });
    }
    if (error instanceof MentorLimitError) {
      return jsonError(error.message, 429);
    }
    return jsonError(error instanceof Error ? error.message : "Erro no Mentor.", 500);
  }
}
