import {
  getUsage,
  getUserFromRequest,
  jsonError,
  listProjects,
  listTrendOpportunities,
  syncProfileAccess,
} from "@/lib/panel-server";

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    const profile = await syncProfileAccess(user);
    const [usage, projects, trends] = await Promise.all([
      getUsage(user.id),
      listProjects(user.id),
      listTrendOpportunities(),
    ]);

    return Response.json({ user, profile, usage, projects, trends });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Sessao invalida.", 401);
  }
}
