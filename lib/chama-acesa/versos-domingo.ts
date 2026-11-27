// Aviso de domingo "Palavra no coração" (27/11): quantos versículos a pessoa leu na semana e desde que começou.
// Lógica pura (testável). A rota /api/membros/chama-lembrete só carrega os dados e envia o que sai daqui.
import { aleatorio } from "./ligas.ts";
import { chaveDoTexto, enviadosHoje, escolherTexto, MAX_EXTRAS_DIA, preencher, type Entrega, type PerfilLembrete, type Texto } from "./lembretes.ts";
import { diffDias, inicioSemana, somarDias } from "./regras.ts";
import { comparacaoVersos, contarVersosLidos, type FontesLeitura } from "./versos-lidos.ts";

/** Horas (São Paulo) do aviso: 20h é a janela; 22h é a reserva se a pessoa já recebeu outro aviso às 20h. */
export const HORAS_VERSOS = [20, 22] as const;
export const MINIMO_VERSOS = 10;
/** Abriu o app nos últimos 7 dias. */
export const DIAS_ATIVO_VERSOS = 7;
export const CAT_VERSOS = "versos_semana";
export const CAT_VERSOS_INICIO = "versos_semana_inicio";

export interface VersosSemana { semana: string; total: number }

export interface CandidatoVersos extends PerfilLembrete {
  /** chama_perfil.inicio (AAAA-MM-DD). */
  inicio?: string | null;
  extras?: { versosSemana?: VersosSemana | null } | null;
  /** Total de versículos lidos (contarVersosLidos). */
  total: number;
}

export const ehDomingo = (hoje: string) => new Date(`${hoje}T00:00:00Z`).getUTCDay() === 0;

/** Pré-filtro barato (antes de ler a Bíblia de cada um): domingo, hora da janela, abriu o app, ainda não recebeu. */
export function podeReceberVersos(p: PerfilLembrete & { extras?: { versosSemana?: VersosSemana | null } | null }, hora: number, hoje: string, jaNaHora: ReadonlySet<string> = new Set()): boolean {
  if (!ehDomingo(hoje) || !(HORAS_VERSOS as readonly number[]).includes(hora)) return false;
  const ref = p.ultimo_acesso ?? p.ultima_data;
  if (!ref || diffDias(ref, hoje) > DIAS_ATIVO_VERSOS) return false;
  if (p.extras?.versosSemana?.semana === inicioSemana(hoje)) return false; // já enviado nesta semana
  const hist = p.lembretes_hist ?? {};
  if (enviadosHoje(hist, hoje, [CAT_VERSOS, CAT_VERSOS_INICIO]) > 0) return false;
  if (enviadosHoje(hist, hoje) >= MAX_EXTRAS_DIA) return false; // teto de extras do dia
  if (jaNaHora.has(p.user_id)) return false; // 1 aviso por hora: o outro tem prioridade, este tenta na reserva
  return true;
}

/** Total lido na semana: diferença para o total gravado no domingo anterior (null se não há semana anterior). */
export function versosDaSemana(c: Pick<CandidatoVersos, "extras" | "total">, hoje: string): number | null {
  const ant = c.extras?.versosSemana;
  if (!ant || ant.semana !== somarDias(inicioSemana(hoje), -7)) return null;
  const n = c.total - ant.total;
  return n > 0 ? n : null;
}

const dataCurta = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}`;

const FALLBACK: Record<string, Texto> = {
  [CAT_VERSOS]: { cat: CAT_VERSOS, tom: "carinhoso", titulo: "Palavra no coração 📖", corpo: "Nesta semana você leu {semana} versículos. Desde {desde}, {total}. {comparacao}" },
  [CAT_VERSOS_INICIO]: { cat: CAT_VERSOS_INICIO, tom: "carinhoso", titulo: "Palavra no coração 📖", corpo: "Desde {desde} você já leu {total} versículos. {comparacao}" },
};

/** Monta o aviso de domingo de cada candidato (já filtrado por quem tem aparelho). jaNaHora = quem já recebe outro aviso nesta hora. */
export function quemRecebeVersosSemana(cands: CandidatoVersos[], hora: string, hoje: string, textos: Texto[], jaNaHora: ReadonlySet<string> = new Set()): Entrega[] {
  const out: Entrega[] = [];
  for (const c of cands) {
    if (c.total < MINIMO_VERSOS || !podeReceberVersos(c, Number(hora), hoje, jaNaHora)) continue;
    const semana = versosDaSemana(c, hoje);
    const cat = semana ? CAT_VERSOS : CAT_VERSOS_INICIO;
    const t = escolherTexto(textos, cat, c.lembretes_hist ?? {}, hoje, aleatorio(`${c.user_id}|${hoje}|versos`)) ?? FALLBACK[cat];
    const vars = {
      nome: (c.nome || "amigo").split(" ")[0], total: c.total, semana: semana ?? "", desde: c.inicio ? dataCurta(c.inicio) : "o começo", comparacao: comparacaoVersos(c.total) ?? "",
    };
    out.push({ perfil: c, mensagem: { tipo: "noite", categoria: cat, chave: chaveDoTexto(t), titulo: preencher(t.titulo, vars), corpo: preencher(t.corpo, vars) } });
  }
  return out;
}

/** O que gravar em chama_perfil.extras.versosSemana depois do envio. */
export const registroVersos = (hoje: string, total: number): VersosSemana => ({ semana: inicioSemana(hoje), total });

/** Fontes do total de um perfil (referências dos dias 1–21, dias contínuos, Desafio, Bíblia). */
export function fontesDoPerfil(p: { dias_feitos?: number | null; praticas?: Record<string, number> | null }, diasJornada: number[], refPorDia: Record<number, string>, lidos: Record<string, number[]>): FontesLeitura {
  return {
    refsDosDias: diasJornada.map((d) => refPorDia[d] ?? ""),
    diasContinuos: Math.max(0, (p.dias_feitos ?? 0) - diasJornada.length),
    idsDesafio: Object.keys(p.praticas ?? {}),
    lidos,
  };
}

export const totalDoPerfil = (f: FontesLeitura) => contarVersosLidos(f);
