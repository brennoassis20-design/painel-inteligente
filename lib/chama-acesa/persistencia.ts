// Lado do servidor: lê e grava o estado da jornada nas tabelas chama_perfil e chama_dias (sempre filtrando por user_id).
import { supabaseRest } from "@/lib/panel-server";
import { checksVazios, estadoVazio, type Aviso, type Checks, type Estado, type Medalha } from "./regras";

type LinhaPerfil = {
  inicio: string | null;
  horario_lembrete: string | null;
  brasas: number;
  chama_atual: number;
  maior_chama: number;
  ultima_data: string | null;
  medalhas: string[];
  avisos: string[];
};
type LinhaDia = { dia: number; concluido_em: string | null; checks: Partial<Checks> | null; jejum: boolean };

export async function carregarEstado(userId: string): Promise<Estado> {
  const [perfis, dias] = await Promise.all([
    supabaseRest<LinhaPerfil[]>(`/chama_perfil?user_id=eq.${userId}&select=inicio,horario_lembrete,brasas,chama_atual,maior_chama,ultima_data,medalhas,avisos`),
    supabaseRest<LinhaDia[]>(`/chama_dias?user_id=eq.${userId}&select=dia,concluido_em,checks,jejum&order=dia.asc`),
  ]);
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
  }
  for (const d of dias) {
    if (d.concluido_em) e.concluidos[d.dia] = d.concluido_em;
    e.checks[d.dia] = { ...checksVazios(), ...(d.checks || {}) };
    if (d.jejum) e.jejum[d.dia] = true;
  }
  return e;
}

export async function salvarEstado(userId: string, areaId: number, e: Estado) {
  const agora = new Date().toISOString();
  await supabaseRest(`/chama_perfil?on_conflict=user_id`, {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({
      user_id: userId,
      area_id: areaId,
      inicio: e.inicio,
      horario_lembrete: e.lembrete,
      brasas: e.brasas,
      chama_atual: e.chama,
      maior_chama: e.maior,
      ultima_data: e.ultimaData,
      medalhas: e.medalhas,
      avisos: e.avisos,
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
