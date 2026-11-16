import { mcpGet, mcpOptions, mcpPost } from "@/lib/membros-mcp";

// Conector com a chave no endereço (para Claude.ai e ChatGPT, que pedem só a URL).
export async function POST(request: Request, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  return mcpPost(request, key);
}
export const GET = mcpGet;
export const OPTIONS = mcpOptions;
