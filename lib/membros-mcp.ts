// Servidor MCP (HTTP, sem estado) da área de membros.
// Funciona como conector remoto no Claude (claude.ai, Desktop, Claude Code) e no ChatGPT.
import { type Area, isMainArea, OpError, opsAsTools, runOp, verifyApiKey } from "@/lib/membros";

type RpcRequest = { jsonrpc?: string; id?: string | number | null; method?: string; params?: Record<string, unknown> };

const instructions = (area: Area) => [
  `Você está conectado à área de membros "${area.brand_name}". Tudo o que você vê e muda é só desta área.`,
  "Comece por resumo_area ou listar_produtos para ver o que existe antes de criar algo.",
  "Aulas usam vídeos do YouTube (pode ser não listado): envie o link em 'youtube'.",
  "Para a venda liberar o acesso sozinha, o produto precisa do link do checkout e dos ids externos no formato plataforma:id (ex.: hotmart:1234567).",
  "Produtos novos nascem como rascunho; publique só quando o usuário pedir.",
  "Operações com 'confirmar' (remover, liberar e bloquear acesso) exigem mostrar ao usuário o que vai mudar e pedir OK antes.",
  ...(isMainArea(area) ? ["Nunca use as palavras guia, ebook, apostila ou leitura no nome dos produtos."] : []),
].join(" ");

const HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, Mcp-Session-Id, Mcp-Protocol-Version",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

function reply(id: RpcRequest["id"], result: unknown) {
  return { jsonrpc: "2.0", id: id ?? null, result };
}

function fail(id: RpcRequest["id"], code: number, message: string) {
  return { jsonrpc: "2.0", id: id ?? null, error: { code, message } };
}

async function handle(message: RpcRequest, area: Area) {
  const { id, method, params = {} } = message;
  const isNotification = id === undefined || id === null;

  switch (method) {
    case "initialize":
      return reply(id, {
        protocolVersion: typeof params.protocolVersion === "string" ? params.protocolVersion : "2025-06-18",
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: "genio-play", title: `${area.brand_name} — área de membros`, version: "1.1.0" },
        instructions: instructions(area),
      });
    case "ping":
      return reply(id, {});
    case "tools/list":
      return reply(id, { tools: opsAsTools(area) });
    case "tools/call": {
      const name = String(params.name || "");
      const args = (params.arguments || {}) as Record<string, unknown>;
      try {
        const result = await runOp(name, args, area);
        return reply(id, { content: [{ type: "text", text: JSON.stringify(result ?? { ok: true }, null, 2) }] });
      } catch (error) {
        const text = error instanceof OpError ? error.message : `Erro: ${error instanceof Error ? error.message : "inesperado"}`;
        return reply(id, { content: [{ type: "text", text }], isError: true });
      }
    }
    default:
      if (isNotification) return null;
      return fail(id, -32601, `Método não suportado: ${method}`);
  }
}

export async function mcpPost(request: Request, key: string) {
  const area = await verifyApiKey(key).catch(() => null);
  if (!area) {
    return Response.json(fail(null, -32001, "Chave inválida ou revogada. Gere outra em Configurações > Conectar IA."), { status: 401, headers: HEADERS });
  }

  let body: RpcRequest | RpcRequest[];
  try {
    body = await request.json();
  } catch {
    return Response.json(fail(null, -32700, "JSON inválido."), { status: 400, headers: HEADERS });
  }

  if (Array.isArray(body)) {
    const results = (await Promise.all(body.map((message) => handle(message, area)))).filter(Boolean);
    return results.length ? Response.json(results, { headers: HEADERS }) : new Response(null, { status: 202, headers: HEADERS });
  }

  const result = await handle(body, area);
  return result ? Response.json(result, { headers: HEADERS }) : new Response(null, { status: 202, headers: HEADERS });
}

export function mcpGet() {
  // Sem fluxo de eventos do servidor: o cliente usa só POST.
  return new Response("Use POST (MCP Streamable HTTP).", { status: 405, headers: { ...HEADERS, Allow: "POST" } });
}

export function mcpOptions() {
  return new Response(null, { status: 204, headers: HEADERS });
}
