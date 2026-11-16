import { mcpGet, mcpOptions, mcpPost } from "@/lib/membros-mcp";
import { getBearerToken } from "@/lib/panel-server";

// Conector com a chave no cabeçalho: Authorization: Bearer gp_...
export async function POST(request: Request) {
  return mcpPost(request, getBearerToken(request));
}
export const GET = mcpGet;
export const OPTIONS = mcpOptions;
