// Lado do servidor: lê e grava o estado da jornada nas tabelas chama_perfil e chama_dias (sempre filtrando por user_id).
import { supabaseRest } from "@/lib/panel-server";
import { premiarConvite, checksVazios, diasConcluidos, estadoVazio, TOTAL_DIAS, type Aviso, type Checks, type Estado, type LigaEstado, type Medalha, type Restauravel } from "./regras";
import { MAX_BRASAS_AMIGO, type AmigoChama, type Extras } from "./extras";

const enc = encodeURIComponent;

type LinhaPerfil = {
  inicio: string | null;
  horario_lembrete: string | null;
  brasas: number;
  chama_atual: number;
  maior_chama: number;
  ultima_data: string | null;
  medalhas: string[];
  avisos: string[];
  xp: number;
  xp_semana: Record<string, number> | null;
  praticas: Record<string, number> | null;
  amigos: number;
  ultimo_acesso: string | null;
  lembretes_hist: Record<string, string> | null;
  liga: LigaEstado | null;
  dias_feitos: number | null;
  /** Talentos, chama a restaurar e extras (itens 4 a 7). Migração 20261127_chama_talentos.sql. */
  extras: ({ talentos?: number; restauravel?: Restauravel | null } & Extras) | null;
};
type LinhaDia = { dia: number; concluido_em: string | null; checks: Partial<Checks> | null; jejum: boolean };

/** Código curto de convite (primeiros 8 caracteres do id). */
export const codigoDe = (userId: string) => userId.replace(/-/g, "").slice(0, 8).toLowerCase();

const COLUNAS = "inicio,horario_lembrete,brasas,chama_atual,maior_chama,ultima_data,medalhas,avisos,xp,xp_semana,praticas,amigos,ultimo_acesso,lembretes_hist,liga,dias_feitos,extras";

/** Quantos dias recentes (depois do 21) vêm do banco: a chama não tem limite e a lista de dias cresce por anos. */
const DIAS_RECENTES = 30;

export async function carregarEstado(userId: string): Promise<Estado> {
  // Os 21 dias da jornada inicial inteiros + só os últimos dias contínuos. O total vem de chama_perfil.dias_feitos.
  const [perfis, jornada, recentes] = await Promise.all([
    supabaseRest<LinhaPerfil[]>(`/chama_perfil?user_id=eq.${userId}&select=${COLUNAS}`),
    supabaseRest<LinhaDia[]>(`/chama_dias?user_id=eq.${userId}&dia=lte.${TOTAL_DIAS}&select=dia,concluido_em,checks,jejum&order=dia.asc`),
    supabaseRest<LinhaDia[]>(`/chama_dias?user_id=eq.${userId}&dia=gt.${TOTAL_DIAS}&select=dia,concluido_em,checks,jejum&order=dia.desc&limit=${DIAS_RECENTES}`),
  ]);
  const dias = [...jornada, ...recentes];
  const e = estadoVazio();
  const p = perfis[0];
  if (p) {
    e.inicio = p.inicio;
    e.lembrete = p.horario_lembrete;
    e.brasas = p.brasas;
    e.chama = p.chama_atual;
    e.maior = p.maior_chama;
    e.ultimaData = p.ultima_data;
    e.medalhas = (p.medalhas || []) as Medalha[];
    e.avisos = (p.avisos || []) as Aviso[];
    e.xp = p.xp ?? 0;
    e.xpSemana = p.xp_semana ?? {};
    e.praticas = p.praticas ?? {};
    e.amigos = p.amigos ?? 0;
    e.ultimoAcesso = p.ultimo_acesso;
    e.lembretesHist = p.lembretes_hist ?? {};
    e.liga = p.liga ? { ...e.liga, ...p.liga } : e.liga;
    e.diasAtivos = p.dias_feitos ?? 0;
    const { talentos, restauravel, ...extras } = p.extras ?? {};
    e.talentos = Number(talentos) || 0;
    e.restauravel = restauravel ?? null;
    e.extras = extras;
  }
  for (const d of dias) {
    if (d.concluido_em) e.concluidos[d.dia] = d.concluido_em;
    e.checks[d.dia] = { ...checksVazios(), ...(d.checks || {}) };
    if (d.jejum) e.jejum[d.dia] = true;
  }
  e.diasAtivos = Math.max(e.diasAtivos, Object.keys(e.concluidos).length);
  return e;
}

export async function salvarEstado(userId: string, areaId: number, e: Estado, nome?: string) {
  const agora = new Date().toISOString();
  await supabaseRest(`/chama_perfil?on_conflict=user_id`, {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({
      user_id: userId,
      area_id: areaId,
      codigo: codigoDe(userId),
      ...(nome ? { nome: nome.slice(0, 60) } : {}),
      inicio: e.inicio,
      horario_lembrete: e.lembrete,
      brasas: e.brasas,
      chama_atual: e.chama,
      maior_chama: e.maior,
      ultima_data: e.ultimaData,
      medalhas: e.medalhas,
      avisos: e.avisos,
      xp: e.xp,
      xp_semana: e.xpSemana,
      praticas: e.praticas,
      amigos: e.amigos,
      ultimo_acesso: e.ultimoAcesso,
      lembretes_hist: e.lembretesHist,
      liga: e.liga,
      dias_feitos: diasConcluidos(e),
      extras: { ...(e.extras ?? {}), talentos: e.talentos ?? 0, restauravel: e.restauravel ?? null },
      atualizado: agora,
    }),
  });
  const numeros = new Set([...Object.keys(e.checks), ...Object.keys(e.concluidos), ...Object.keys(e.jejum)].map(Number));
  const linhas = [...numeros].map((dia) => ({
    user_id: userId,
    dia,
    concluido_em: e.concluidos[dia] ?? null,
    checks: e.checks[dia] ?? checksVazios(),
    jejum: Boolean(e.jejum[dia]),
    atualizado: agora,
  }));
  if (linhas.length) {
    await supabaseRest(`/chama_dias?on_conflict=user_id,dia`, {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify(linhas),
    });
  }
}

// ---------------------------------------------------------------- convite de amigo

/** Cadastro grátis feito com ?ref=<código>: grava quem convidou (ignora código desconhecido ou o próprio). */
export async function registrarConvite(areaId: number, novoUserId: string, ref: string) {
  const codigo = String(ref || "").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 12);
  if (!codigo) return false;
  const quem = await supabaseRest<{ user_id: string }[]>(`/chama_perfil?area_id=eq.${areaId}&codigo=eq.${enc(codigo)}&select=user_id&limit=1`);
  const convidador = quem[0]?.user_id;
  if (!convidador || convidador === novoUserId) return false;
  await supabaseRest(`/chama_perfil?on_conflict=user_id`, {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({ user_id: novoUserId, area_id: areaId, codigo: codigoDe(novoUserId), convidado_por: convidador }),
  });
  return true;
}

/** O amigo completou o dia 1: quem convidou ganha +50 XP e 1 brasa guardada (uma vez só). */
export async function premiarConvidador(areaId: number, userId: string, hoje: string) {
  const eu = await supabaseRest<{ convidado_por: string | null; convite_premiado: boolean | null }[]>(`/chama_perfil?user_id=eq.${userId}&select=convidado_por,convite_premiado`);
  const l = eu[0];
  if (!l?.convidado_por || l.convite_premiado) return false;
  // Marca primeiro (evita pagar duas vezes numa corrida) e só então premia.
  await supabaseRest(`/chama_perfil?user_id=eq.${userId}&convite_premiado=is.false`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ convite_premiado: true }) });
  const convidador = await carregarEstado(l.convidado_por);
  await salvarEstado(l.convidado_por, areaId, premiarConvite(convidador, hoje));
  return true;
}

// ---------------------------------------------------------------- brasa de irmão (Gl 6:2)

/** Amigos = quem esta pessoa convidou (chama_perfil.convidado_por = userId). */
export async function listarAmigos(userId: string): Promise<AmigoChama[]> {
  const l = await supabaseRest<{ codigo: string | null; nome: string | null; chama_atual: number | null; brasas: number | null }[]>(
    `/chama_perfil?convidado_por=eq.${userId}&select=codigo,nome,chama_atual,brasas&order=chama_atual.desc&limit=50`,
  );
  return l.filter((x) => x.codigo).map((x) => ({ codigo: x.codigo as string, nome: (x.nome || "Amigo").split(" ")[0], chama: x.chama_atual ?? 0, brasas: x.brasas ?? 0 }));
}

/** Dá 1 brasa ao amigo (máximo 2). Só grava se a brasa dele não mudou desde a leitura. Devolve false se não deu. */
export async function darBrasaAoAmigo(userId: string, codigoAmigo: string): Promise<boolean> {
  const l = await supabaseRest<{ user_id: string; brasas: number | null }[]>(
    `/chama_perfil?convidado_por=eq.${userId}&codigo=eq.${enc(codigoAmigo)}&select=user_id,brasas&limit=1`,
  );
  const a = l[0];
  if (!a) return false;
  const atual = a.brasas ?? 0;
  if (atual >= MAX_BRASAS_AMIGO) return false;
  const r = await supabaseRest<{ user_id: string }[]>(`/chama_perfil?user_id=eq.${a.user_id}&brasas=eq.${atual}`, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ brasas: atual + 1 }),
  });
  return Array.isArray(r) && r.length > 0;
}
