// Lado do servidor: lê e grava a Bíblia (plano, leituras, notas, destaques) e o cache/limite da IA nas tabelas chama_biblia_*.
// Sempre filtra por user_id (a chave de serviço ignora o RLS). Esquema: Projetos/Chama Acesa/banco-biblia-estudo.sql.
import { supabaseRest } from "@/lib/panel-server";
import { CORES_DESTAQUE, MAX_DIAS_GUARDADOS, estadoBibliaVazio, type AcaoBiblia, type CorDestaque, type Destaque, type EstadoBiblia, type Nota, type PerfilBiblia, type ResultadoBiblia } from "./biblia-estudo";
import type { Explicacao, UsoDia } from "./biblia-ia";

const enc = encodeURIComponent;

type LinhaPerfil = { plano_id: string | null; plano_inicio: string | null; plano_feitos: number[] | null; horario_lembrete: string | null; lembrete_desde: string | null };
type LinhaLidos = { sigla: string; caps: number[] };
type LinhaNota = { id: string; sigla: string; cap: number; v_ini: number; v_fim: number; texto: string; tema: string | null; criado: string; atualizado: string };
type LinhaDestaque = { sigla: string; cap: number; cores: Record<string, string> };

/** Lê tudo de uma consulta, página por página (o PostgREST limita cada resposta, em geral a 1000 linhas). */
async function paginar<T>(caminho: string): Promise<T[]> {
  const out: T[] = [];
  for (let de = 0; de < 20000; de += 1000) {
    const parte = await supabaseRest<T[]>(`${caminho}&limit=1000&offset=${de}`);
    out.push(...parte);
    if (parte.length < 1000) break;
  }
  return out;
}

export async function carregarEstadoBiblia(userId: string): Promise<EstadoBiblia> {
  const [perfis, lidos, dias, notas, destaques] = await Promise.all([
    supabaseRest<LinhaPerfil[]>(`/chama_biblia_perfil?user_id=eq.${userId}&select=plano_id,plano_inicio,plano_feitos,horario_lembrete,lembrete_desde`),
    supabaseRest<LinhaLidos[]>(`/chama_biblia_lidos?user_id=eq.${userId}&select=sigla,caps`),
    supabaseRest<{ dia: string }[]>(`/chama_biblia_dias?user_id=eq.${userId}&select=dia&order=dia.desc&limit=${MAX_DIAS_GUARDADOS}`),
    paginar<LinhaNota>(`/chama_biblia_notas?user_id=eq.${userId}&select=id,sigla,cap,v_ini,v_fim,texto,tema,criado,atualizado&order=criado.asc`),
    paginar<LinhaDestaque>(`/chama_biblia_destaques?user_id=eq.${userId}&select=sigla,cap,cores&order=sigla.asc,cap.asc`),
  ]);
  const e = estadoBibliaVazio();
  const p = perfis[0];
  if (p) {
    if (p.plano_id && p.plano_inicio) e.plano = { id: p.plano_id, inicio: p.plano_inicio, feitos: p.plano_feitos ?? [] };
    e.lembrete = p.horario_lembrete;
    e.lembreteDesde = p.lembrete_desde;
  }
  for (const l of lidos) e.lidos[l.sigla] = [...l.caps].sort((a, b) => a - b);
  e.dias = dias.map((d) => d.dia).sort();
  e.notas = notas.map((n): Nota => ({ id: n.id, sigla: n.sigla, cap: n.cap, vIni: n.v_ini, vFim: n.v_fim, texto: n.texto, tema: n.tema ?? "", criado: n.criado, atualizado: n.atualizado }));
  for (const d of destaques) {
    for (const [v, cor] of Object.entries(d.cores ?? {})) {
      if ((CORES_DESTAQUE as readonly string[]).includes(cor)) e.destaques.push({ sigla: d.sigla, cap: d.cap, v: Number(v), cor: cor as CorDestaque });
    }
  }
  return e;
}

const MERGE = { Prefer: "resolution=merge-duplicates,return=minimal" };

async function upsert(tabela: string, conflito: string, corpo: unknown) {
  await supabaseRest(`/${tabela}?on_conflict=${conflito}`, { method: "POST", headers: MERGE, body: JSON.stringify(corpo) });
}

const ultimaLeitura = (e: EstadoBiblia) => (e.dias.length ? [...e.dias].sort().at(-1)! : null);

/** Grava só o que a ação mexeu. `depois` é o estado que as regras devolveram. */
export async function salvarAcaoBiblia(userId: string, areaId: number, acao: AcaoBiblia, r: ResultadoBiblia, hoje: string) {
  const e = r.estado;
  const agora = new Date().toISOString();
  const perfil = { user_id: userId, area_id: areaId, atualizado: agora };
  switch (acao.tipo) {
    case "plano":
      await upsert("chama_biblia_perfil", "user_id", { ...perfil, plano_id: e.plano?.id ?? null, plano_inicio: e.plano?.inicio ?? null, plano_feitos: e.plano?.feitos ?? [] });
      return;
    case "lembrete":
      await upsert("chama_biblia_perfil", "user_id", { ...perfil, horario_lembrete: e.lembrete, lembrete_desde: e.lembreteDesde });
      return;
    case "marcarDia":
    case "lido": {
      const siglas = [...new Set(r.novosLidos.map((p) => p.sigla))];
      if (acao.tipo === "lido" && acao.valor === false) siglas.push(acao.sigla);
      if (siglas.length) await upsert("chama_biblia_lidos", "user_id,sigla", siglas.map((sigla) => ({ user_id: userId, sigla, caps: e.lidos[sigla] ?? [], atualizado: agora })));
      if (!(acao.tipo === "lido" && acao.valor === false)) {
        await upsert("chama_biblia_dias", "user_id,dia", { user_id: userId, dia: hoje });
        await upsert("chama_biblia_perfil", "user_id", { ...perfil, ultima_leitura: ultimaLeitura(e), ...(acao.tipo === "marcarDia" ? { plano_feitos: e.plano?.feitos ?? [] } : {}) });
      }
      return;
    }
    case "nota": {
      const n = r.nota;
      if (!n) return;
      await upsert("chama_biblia_notas", "id", { id: n.id, user_id: userId, sigla: n.sigla, cap: n.cap, v_ini: n.vIni, v_fim: n.vFim, texto: n.texto, tema: n.tema, criado: n.criado, atualizado: n.atualizado });
      return;
    }
    case "apagarNota":
      await supabaseRest(`/chama_biblia_notas?id=eq.${enc(acao.id)}&user_id=eq.${userId}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
      return;
    case "destaque": {
      const doCap: Destaque[] = e.destaques.filter((d) => d.sigla === acao.sigla && d.cap === Number(acao.cap));
      if (!doCap.length) {
        await supabaseRest(`/chama_biblia_destaques?user_id=eq.${userId}&sigla=eq.${enc(acao.sigla)}&cap=eq.${Number(acao.cap)}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
        return;
      }
      await upsert("chama_biblia_destaques", "user_id,sigla,cap", { user_id: userId, sigla: acao.sigla, cap: Number(acao.cap), cores: Object.fromEntries(doCap.map((d) => [String(d.v), d.cor])), atualizado: agora });
      return;
    }
  }
}

// ---------------------------------------------------------------- lembrete (lido pelo timer horário)

export async function perfisComLembreteBiblia(areaId: number): Promise<PerfilBiblia[]> {
  const linhas = await supabaseRest<(PerfilBiblia & { nome?: string | null })[]>(
    `/chama_biblia_perfil?area_id=eq.${areaId}&horario_lembrete=not.is.null&select=user_id,horario_lembrete,lembrete_desde,plano_id,plano_inicio,plano_feitos,ultima_leitura`,
  );
  const ids = linhas.map((l) => l.user_id);
  if (!ids.length) return linhas;
  const mapa = new Map<string, string | null>();
  for (let i = 0; i < ids.length; i += 80) {
    const nomes = await supabaseRest<{ user_id: string; nome: string | null }[]>(`/chama_perfil?user_id=in.(${ids.slice(i, i + 80).join(",")})&select=user_id,nome`).catch(() => []);
    for (const n of nomes) mapa.set(n.user_id, n.nome);
  }
  return linhas.map((l) => ({ ...l, nome: mapa.get(l.user_id) ?? null }));
}

// ---------------------------------------------------------------- IA: cache compartilhado e limite por dia

export async function lerCache(chave: string): Promise<Explicacao | null> {
  const r = await supabaseRest<{ conteudo: Explicacao }[]>(`/chama_biblia_explicacoes?chave=eq.${enc(chave)}&select=conteudo&limit=1`);
  return r[0]?.conteudo ?? null;
}

export async function gravarCache(chave: string, p: { tipo: string; sigla: string; cap: number; versiculos: string }, conteudo: Explicacao, modelo: string) {
  // ignore-duplicates: se duas pessoas pediram ao mesmo tempo, vale a primeira.
  await supabaseRest(`/chama_biblia_explicacoes?on_conflict=chave`, {
    method: "POST",
    headers: { Prefer: "resolution=ignore-duplicates,return=minimal" },
    body: JSON.stringify({ chave, tipo: p.tipo, sigla: p.sigla, cap: p.cap, versiculos: p.versiculos, conteudo, modelo: modelo.slice(0, 80) }),
  });
}

export async function lerUsoIa(userId: string, hoje: string): Promise<UsoDia | null> {
  const r = await supabaseRest<{ dia: string; n: number }[]>(`/chama_biblia_ia_uso?user_id=eq.${userId}&dia=eq.${hoje}&select=dia,n&limit=1`).catch(() => []);
  return r[0] ?? null;
}

export async function gravarUsoIa(userId: string, hoje: string, n: number) {
  await upsert("chama_biblia_ia_uso", "user_id,dia", { user_id: userId, dia: hoje, n: Math.max(0, n) });
}
