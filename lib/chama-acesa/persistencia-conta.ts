// Lado do servidor: conta (nome, foto, preferência do ranking) e leitura do ranking real. Usa a chave de serviço,
// sempre filtrando por user_id; do ranking só saem primeiro nome, foto e XP (ranking.ts).
import { getSupabaseConfig, supabaseRest } from "@/lib/panel-server";
import { BUCKET_AVATARES, caminhoAvatar, podeMexerNoAvatar, urlAvatar, validarAvatar, validarNome } from "./conta";
import { codigoDe } from "./persistencia";
import { membrosDaLiga, type MembroRanking, type PerfilRanking } from "./ranking";

export interface ContaGuardada { nomeExibicao: string | null; nomeAuth: string | null; foto: string | null; mostrarNoRanking: boolean }

/** Lê nome, foto e preferência. Antes do SQL banco-conta-ranking.sql as colunas novas não existem: devolve o padrão. */
export async function carregarConta(userId: string): Promise<ContaGuardada> {
  try {
    const r = await supabaseRest<{ nome: string | null; nome_exibicao: string | null; foto_url: string | null; mostrar_no_ranking: boolean | null }[]>(
      `/chama_perfil?user_id=eq.${userId}&select=nome,nome_exibicao,foto_url,mostrar_no_ranking`,
    );
    const p = r[0];
    return { nomeExibicao: p?.nome_exibicao ?? null, nomeAuth: p?.nome ?? null, foto: p?.foto_url ?? null, mostrarNoRanking: p?.mostrar_no_ranking !== false };
  } catch {
    return { nomeExibicao: null, nomeAuth: null, foto: null, mostrarNoRanking: true };
  }
}

async function gravarPerfil(userId: string, areaId: number, campos: Record<string, unknown>) {
  await supabaseRest(`/chama_perfil?on_conflict=user_id`, {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({ user_id: userId, area_id: areaId, codigo: codigoDe(userId), ...campos, atualizado: new Date().toISOString() }),
  });
}

export async function salvarNomeExibicao(userId: string, areaId: number, nome: unknown): Promise<string> {
  const v = validarNome(nome);
  if (!v.ok) throw new Error(v.erro);
  await gravarPerfil(userId, areaId, { nome_exibicao: v.nome });
  return v.nome;
}

export async function salvarMostrarNoRanking(userId: string, areaId: number, valor: boolean) {
  await gravarPerfil(userId, areaId, { mostrar_no_ranking: Boolean(valor) });
}

async function storage(metodo: "POST" | "DELETE", caminho: string, corpo?: Uint8Array, tipo?: string) {
  const c = getSupabaseConfig();
  const r = await fetch(`${c.url}/storage/v1/object/${BUCKET_AVATARES}/${caminho}`, {
    method: metodo,
    headers: { apikey: c.serviceKey, Authorization: `Bearer ${c.serviceKey}`, ...(tipo ? { "Content-Type": tipo, "x-upsert": "true", "cache-control": "3600" } : {}) },
    body: corpo ? Buffer.from(corpo) : undefined,
  });
  if (!r.ok && !(metodo === "DELETE" && r.status === 404)) throw new Error("Não deu para salvar a foto agora. Tente de novo.");
}

/** Sobe a foto (já recortada e reduzida no navegador) para a pasta da própria pessoa. O caminho nunca vem do cliente. */
export async function salvarFoto(userId: string, areaId: number, base64: unknown): Promise<string> {
  const bytes = Uint8Array.from(Buffer.from(String(base64 ?? ""), "base64"));
  const v = validarAvatar(bytes);
  if (!v.ok) throw new Error(v.erro);
  const caminho = caminhoAvatar(userId);
  if (!podeMexerNoAvatar(userId, caminho)) throw new Error("Não permitido.");
  await storage("POST", caminho, bytes, v.tipo);
  const url = urlAvatar(getSupabaseConfig().url, userId, Date.now());
  await gravarPerfil(userId, areaId, { foto_url: url });
  return url;
}

export async function removerFoto(userId: string, areaId: number) {
  const caminho = caminhoAvatar(userId);
  if (!podeMexerNoAvatar(userId, caminho)) throw new Error("Não permitido.");
  await storage("DELETE", caminho);
  await gravarPerfil(userId, areaId, { foto_url: null });
}

/** Perfis ativos da área desde o começo da semana (para montar o ranking real). Erro (ex.: colunas ainda não criadas) = sem ranking real. */
export async function membrosAtivos(areaId: number, semana: string, indice: number): Promise<MembroRanking[] | null> {
  try {
    const perfis = await supabaseRest<PerfilRanking[]>(
      `/chama_perfil?area_id=eq.${areaId}&ultimo_acesso=gte.${semana}&select=user_id,nome,nome_exibicao,foto_url,mostrar_no_ranking,xp_semana,liga&limit=5000`,
    );
    return membrosDaLiga(perfis, semana, indice);
  } catch (e) {
    console.error("chama-ranking", e instanceof Error ? e.message.slice(0, 200) : e);
    return null;
  }
}
