// Bíblia do Chama Acesa: planos de leitura, progresso, notas, destaques e lembrete da leitura. Lógica PURA (sem banco, sem tela):
// o servidor (rota /api/membros/chama-biblia) e a bancada (armazém local) rodam exatamente este código.
// Tudo aqui é grátis e fica FORA da jornada: não mexe em chama, XP, brasa nem dias da jornada.
import { LIVROS_BIBLIA, PLANOS_DADOS, type PlanoDados, type TrechoDados } from "./biblia-planos-dados.ts";
import { diffDias, somarDias } from "./regras.ts";

export const TOTAL_CAPITULOS = 1189;
export const MAX_NOTAS = 3000;
export const MAX_TEXTO_NOTA = 4000;
export const MAX_TEMA = 60;
export const MAX_DIAS_GUARDADOS = 400;
export const DIAS_SEM_INSISTIR = 14;

export const CORES_DESTAQUE = ["amarelo", "verde", "azul", "rosa", "laranja"] as const;
export type CorDestaque = (typeof CORES_DESTAQUE)[number];
export const NOMES_COR: Record<CorDestaque, string> = { amarelo: "Amarelo", verde: "Verde", azul: "Azul", rosa: "Rosa", laranja: "Laranja" };

export interface Posicao { sigla: string; cap: number }
export interface Nota { id: string; sigla: string; cap: number; vIni: number; vFim: number; texto: string; tema: string; criado: string; atualizado: string }
export interface Destaque { sigla: string; cap: number; v: number; cor: CorDestaque }
export interface PlanoAtivo { id: string; inicio: string; feitos: number[] }
export interface EstadoBiblia {
  plano: PlanoAtivo | null;
  /** sigla -> capítulos lidos (únicos, em ordem). */
  lidos: Record<string, number[]>;
  /** Datas (AAAA-MM-DD) em que a pessoa leu a Bíblia: base dos "dias seguidos" (separado da chama da jornada). */
  dias: string[];
  /** Horário do lembrete da leitura ("HH:MM") ou null = desligado. */
  lembrete: string | null;
  /** Desde quando o lembrete está ligado (para parar de insistir se a pessoa sumir). */
  lembreteDesde: string | null;
  notas: Nota[];
  destaques: Destaque[];
}

export const estadoBibliaVazio = (): EstadoBiblia => ({ plano: null, lidos: {}, dias: [], lembrete: null, lembreteDesde: null, notas: [], destaques: [] });

// ------------------------------------------------------------------ livros e nomes

const LIVRO = new Map(LIVROS_BIBLIA.map(([sigla, nome, capitulos, testamento]) => [sigla, { sigla, nome, capitulos, testamento }]));
export const livrosBiblia = () => LIVROS_BIBLIA.map(([sigla, nome, capitulos, testamento]) => ({ sigla, nome, capitulos, testamento }));
export const nomeDoLivro = (sigla: string) => LIVRO.get(sigla)?.nome ?? sigla;
export const capituloValido = (sigla: string, cap: number) => {
  const l = LIVRO.get(sigla);
  return Boolean(l) && Number.isInteger(cap) && cap >= 1 && cap <= (l?.capitulos ?? 0);
};
export const ordemDoLivro = (sigla: string) => LIVROS_BIBLIA.findIndex((l) => l[0] === sigla);

/** "João 3", "Gênesis 1–3", "Gênesis 11 e Jó 1–2". */
export function nomeDosTrechos(trechos: TrechoDados[]): string {
  const partes = trechos.map(([s, a, b]) => `${nomeDoLivro(s)} ${a === b ? a : `${a}–${b}`}`);
  return partes.length <= 1 ? (partes[0] ?? "") : `${partes.slice(0, -1).join(", ")} e ${partes[partes.length - 1]}`;
}

export function capitulosDosTrechos(trechos: TrechoDados[]): Posicao[] {
  const out: Posicao[] = [];
  for (const [sigla, a, b] of trechos) for (let cap = a; cap <= b; cap++) out.push({ sigla, cap });
  return out;
}

// ------------------------------------------------------------------ planos

export const PLANOS: PlanoDados[] = PLANOS_DADOS;
export const planoPorId = (id: string | null | undefined): PlanoDados | null => PLANOS.find((p) => p.id === id) ?? null;

/** Dia do plano hoje: o dia do início é o dia 1. */
export const diaDoPlano = (inicio: string, hoje: string) => Math.max(1, diffDias(inicio, hoje) + 1);

export interface LeituraDoDia { dia: number; titulo: string | null; nome: string; trechos: TrechoDados[]; capitulos: Posicao[]; feito: boolean }

export function leituraDoDia(plano: PlanoDados, dia: number, feitos: number[]): LeituraDoDia | null {
  const trechos = plano.dias[dia - 1];
  if (!trechos) return null;
  return { dia, titulo: plano.titulos?.[dia - 1] ?? null, nome: nomeDosTrechos(trechos), trechos, capitulos: capitulosDosTrechos(trechos), feito: feitos.includes(dia) };
}

export interface SituacaoPlano {
  plano: PlanoDados;
  diaHoje: number;
  total: number;
  /** Leitura de hoje; se o plano já passou do último dia, é o primeiro dia que falta. null = plano concluído. */
  hoje: LeituraDoDia | null;
  atrasadas: LeituraDoDia[];
  feitos: number;
  percentual: number;
  concluido: boolean;
}

export function situacaoDoPlano(a: PlanoAtivo, hoje: string): SituacaoPlano | null {
  const plano = planoPorId(a.id);
  if (!plano) return null;
  const total = plano.dias.length;
  const diaHoje = diaDoPlano(a.inicio, hoje);
  const feitosValidos = a.feitos.filter((d) => d >= 1 && d <= total);
  const limite = Math.min(diaHoje, total);
  const atrasadas: LeituraDoDia[] = [];
  // Passou do último dia: todo dia que falta (inclusive o último) conta como atrasado.
  const ate = diaHoje > total ? total : limite - 1;
  for (let d = 1; d <= ate; d++) if (!feitosValidos.includes(d)) atrasadas.push(leituraDoDia(plano, d, feitosValidos)!);
  const concluido = feitosValidos.length >= total;
  let dia = limite;
  // Passou do último dia do plano: mostra o primeiro que falta.
  if (diaHoje > total && !concluido) dia = atrasadas[0]?.dia ?? total;
  const leitura = concluido ? null : leituraDoDia(plano, dia, feitosValidos);
  const atr = diaHoje > total ? atrasadas.filter((x) => x.dia !== dia) : atrasadas;
  return { plano, diaHoje, total, hoje: leitura, atrasadas: atr, feitos: feitosValidos.length, percentual: Math.round((feitosValidos.length / total) * 100), concluido };
}

// ------------------------------------------------------------------ progresso

export interface ProgressoLivro { sigla: string; nome: string; lidos: number; total: number; percentual: number; testamento: "at" | "nt" }
export interface ProgressoBiblia { lidos: number; total: number; percentual: number; porLivro: ProgressoLivro[] }

export function progressoBiblia(lidos: Record<string, number[]>): ProgressoBiblia {
  const porLivro: ProgressoLivro[] = LIVROS_BIBLIA.map(([sigla, nome, total, testamento]) => {
    const n = new Set((lidos[sigla] ?? []).filter((c) => Number.isInteger(c) && c >= 1 && c <= total)).size;
    return { sigla, nome, lidos: n, total, percentual: Math.round((n / total) * 100), testamento };
  });
  const soma = porLivro.reduce((s, l) => s + l.lidos, 0);
  return { lidos: soma, total: TOTAL_CAPITULOS, percentual: Math.round((soma / TOTAL_CAPITULOS) * 1000) / 10, porLivro };
}

/** Dias seguidos de leitura bíblica. Se ainda não leu hoje, a sequência de ontem continua valendo. */
export function sequenciaBiblia(dias: string[], hoje: string): { atual: number; lidoHoje: boolean } {
  const s = new Set(dias);
  const lidoHoje = s.has(hoje);
  let d = lidoHoje ? hoje : somarDias(hoje, -1);
  let n = 0;
  while (s.has(d)) {
    n++;
    d = somarDias(d, -1);
  }
  return { atual: n, lidoHoje };
}

export const capituloLido = (e: EstadoBiblia, p: Posicao) => (e.lidos[p.sigla] ?? []).includes(p.cap);

// ------------------------------------------------------------------ ações

export type AcaoBiblia =
  | { tipo: "plano"; id: string | null }
  | { tipo: "marcarDia"; dia: number }
  | { tipo: "lido"; sigla: string; cap: number; valor?: boolean }
  | { tipo: "lembrete"; horario: string | null }
  | { tipo: "nota"; id?: string; sigla: string; cap: number; vIni: number; vFim: number; texto: string; tema?: string }
  | { tipo: "apagarNota"; id: string }
  | { tipo: "destaque"; sigla: string; cap: number; versiculos: number[]; cor: CorDestaque | null };

export interface ContextoBiblia { novoId: () => string; agora?: string }
export interface ResultadoBiblia { estado: EstadoBiblia; erro?: string; /** Capítulos que passaram a contar como lidos agora. */ novosLidos: Posicao[]; nota?: Nota }

export const HORARIO_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const MAX_VERSICULO = 176;

const limpar = (s: unknown, max: number) => String(s ?? "").replace(/\s+/g, " ").trim().slice(0, max);

function registrarLeitura(e: EstadoBiblia, caps: Posicao[], hoje: string): { estado: EstadoBiblia; novos: Posicao[] } {
  const lidos: Record<string, number[]> = { ...e.lidos };
  const novos: Posicao[] = [];
  for (const p of caps) {
    if (!capituloValido(p.sigla, p.cap)) continue;
    const atual = lidos[p.sigla] ?? [];
    if (atual.includes(p.cap)) continue;
    lidos[p.sigla] = [...atual, p.cap].sort((a, b) => a - b);
    novos.push(p);
  }
  const dias = e.dias.includes(hoje) ? e.dias : [...e.dias, hoje].sort().slice(-MAX_DIAS_GUARDADOS);
  return { estado: { ...e, lidos, dias }, novos };
}

export function aplicarBiblia(e: EstadoBiblia, acao: AcaoBiblia, hoje: string, ctx: ContextoBiblia): ResultadoBiblia {
  const falha = (erro: string): ResultadoBiblia => ({ estado: e, erro, novosLidos: [] });
  const agora = ctx.agora ?? new Date().toISOString();
  switch (acao.tipo) {
    case "plano": {
      if (acao.id === null) return { estado: { ...e, plano: null }, novosLidos: [] };
      if (!planoPorId(acao.id)) return falha("Plano de leitura desconhecido.");
      if (e.plano?.id === acao.id) return { estado: e, novosLidos: [] };
      return { estado: { ...e, plano: { id: acao.id, inicio: hoje, feitos: [] } }, novosLidos: [] };
    }
    case "marcarDia": {
      if (!e.plano) return falha("Escolha um plano de leitura primeiro.");
      const sit = situacaoDoPlano(e.plano, hoje);
      const dia = Number(acao.dia);
      if (!sit || !Number.isInteger(dia) || dia < 1 || dia > sit.total) return falha("Esse dia não existe neste plano.");
      if (dia > sit.diaHoje) return falha("Esse dia ainda não chegou.");
      const leitura = leituraDoDia(sit.plano, dia, e.plano.feitos)!;
      const feitos = e.plano.feitos.includes(dia) ? e.plano.feitos : [...e.plano.feitos, dia].sort((a, b) => a - b);
      const r = registrarLeitura({ ...e, plano: { ...e.plano, feitos } }, leitura.capitulos, hoje);
      return { estado: r.estado, novosLidos: r.novos };
    }
    case "lido": {
      if (!capituloValido(acao.sigla, Number(acao.cap))) return falha("Capítulo inexistente.");
      const p = { sigla: acao.sigla, cap: Number(acao.cap) };
      if (acao.valor === false) {
        const atual = e.lidos[p.sigla] ?? [];
        return { estado: { ...e, lidos: { ...e.lidos, [p.sigla]: atual.filter((c) => c !== p.cap) } }, novosLidos: [] };
      }
      const r = registrarLeitura(e, [p], hoje);
      return { estado: r.estado, novosLidos: r.novos };
    }
    case "lembrete": {
      if (acao.horario === null) return { estado: { ...e, lembrete: null, lembreteDesde: null }, novosLidos: [] };
      if (!HORARIO_RE.test(acao.horario)) return falha("Horário inválido.");
      return { estado: { ...e, lembrete: acao.horario, lembreteDesde: hoje }, novosLidos: [] };
    }
    case "nota": {
      const cap = Number(acao.cap);
      if (!capituloValido(acao.sigla, cap)) return falha("Capítulo inexistente.");
      const vIni = Math.floor(Number(acao.vIni));
      const vFim = Math.floor(Number(acao.vFim));
      if (!(vIni >= 1 && vFim >= vIni && vFim <= MAX_VERSICULO)) return falha("Versículo inválido.");
      const texto = String(acao.texto ?? "").replace(/\r/g, "").trim().slice(0, MAX_TEXTO_NOTA);
      if (!texto) return falha("Escreva a nota antes de salvar.");
      const tema = limpar(acao.tema, MAX_TEMA);
      const existente = acao.id ? e.notas.find((n) => n.id === acao.id) : undefined;
      if (acao.id && !existente) return falha("Nota não encontrada.");
      if (!existente && e.notas.length >= MAX_NOTAS) return falha("Você chegou ao limite de notas. Apague algumas antigas.");
      const nota: Nota = { id: existente?.id ?? ctx.novoId(), sigla: acao.sigla, cap, vIni, vFim, texto, tema, criado: existente?.criado ?? agora, atualizado: agora };
      const notas = existente ? e.notas.map((n) => (n.id === nota.id ? nota : n)) : [...e.notas, nota];
      return { estado: { ...e, notas }, novosLidos: [], nota };
    }
    case "apagarNota": {
      if (!e.notas.some((n) => n.id === acao.id)) return falha("Nota não encontrada.");
      return { estado: { ...e, notas: e.notas.filter((n) => n.id !== acao.id) }, novosLidos: [] };
    }
    case "destaque": {
      const cap = Number(acao.cap);
      if (!capituloValido(acao.sigla, cap)) return falha("Capítulo inexistente.");
      if (acao.cor !== null && !(CORES_DESTAQUE as readonly string[]).includes(acao.cor)) return falha("Cor inválida.");
      const vs = [...new Set((acao.versiculos ?? []).map(Number).filter((v) => Number.isInteger(v) && v >= 1 && v <= MAX_VERSICULO))].slice(0, MAX_VERSICULO);
      if (!vs.length) return falha("Escolha ao menos um versículo.");
      const sem = e.destaques.filter((d) => !(d.sigla === acao.sigla && d.cap === cap && vs.includes(d.v)));
      const cor = acao.cor;
      return { estado: { ...e, destaques: cor ? [...sem, ...vs.map((v) => ({ sigla: acao.sigla, cap, v, cor }))] : sem }, novosLidos: [] };
    }
    default:
      return falha("Ação desconhecida.");
  }
}

// ------------------------------------------------------------------ notas: filtros e agrupamento

export const semAcentoBusca = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

export const referenciaDaNota = (n: Pick<Nota, "sigla" | "cap" | "vIni" | "vFim">) => `${nomeDoLivro(n.sigla)} ${n.cap}:${n.vIni === n.vFim ? n.vIni : `${n.vIni}–${n.vFim}`}`;

/** Busca por texto, tema ou referência (sem acento/maiúsculas) e, se pedido, só um tema. */
export function filtrarNotas(notas: Nota[], busca: string, tema = ""): Nota[] {
  const q = semAcentoBusca(busca);
  return notas.filter((n) => (!tema || n.tema === tema) && (!q || semAcentoBusca(`${n.texto} ${n.tema} ${referenciaDaNota(n)}`).includes(q)));
}

export interface GrupoNotas { sigla: string; nome: string; notas: Nota[] }
/** Agrupa por livro (ordem da Bíblia) e, dentro do livro, por capítulo e versículo. */
export function agruparNotasPorLivro(notas: Nota[]): GrupoNotas[] {
  const mapa = new Map<string, Nota[]>();
  for (const n of notas) mapa.set(n.sigla, [...(mapa.get(n.sigla) ?? []), n]);
  return [...mapa.entries()]
    .sort((a, b) => ordemDoLivro(a[0]) - ordemDoLivro(b[0]))
    .map(([sigla, ns]) => ({ sigla, nome: nomeDoLivro(sigla), notas: [...ns].sort((a, b) => a.cap - b.cap || a.vIni - b.vIni || a.criado.localeCompare(b.criado)) }));
}

export const temasDasNotas = (notas: Nota[]): string[] => [...new Set(notas.map((n) => n.tema).filter(Boolean))].sort((a, b) => a.localeCompare(b, "pt-BR"));

// ------------------------------------------------------------------ lembrete da leitura (push)

export interface PerfilBiblia {
  user_id: string;
  nome?: string | null;
  horario_lembrete: string | null;
  lembrete_desde?: string | null;
  plano_id: string | null;
  plano_inicio: string | null;
  plano_feitos: number[] | null;
  ultima_leitura: string | null;
}
export interface MensagemBiblia { titulo: string; corpo: string }
export interface EntregaBiblia { perfil: PerfilBiblia; mensagem: MensagemBiblia }

// Curtos, sem culpa. {nome} = primeiro nome; {leitura} = o que está no plano hoje; {dias} = dias seguidos.
export const TEXTOS_COM_PLANO: MensagemBiblia[] = [
  { titulo: "📖 Leitura de hoje", corpo: "{leitura}. Uns minutinhos com a Palavra." },
  { titulo: "📖 Sua leitura está pronta", corpo: "Hoje: {leitura}. Quando puder, é só abrir." },
  { titulo: "📖 {nome}, um tempo com Deus?", corpo: "A leitura de hoje é {leitura}." },
  { titulo: "📖 A Palavra te espera", corpo: "Hoje no seu plano: {leitura}." },
  { titulo: "📖 Que tal agora?", corpo: "{leitura} está esperando por você, sem pressa." },
  { titulo: "📖 Um passo de cada vez", corpo: "Leia {leitura} hoje e siga o seu plano." },
  { titulo: "📖 Hora da Palavra", corpo: "{leitura}. Respire fundo e leia com calma." },
  { titulo: "📖 Leitura do dia", corpo: "Hoje: {leitura}. Deus tem algo para você." },
];
export const TEXTOS_SEM_PLANO: MensagemBiblia[] = [
  { titulo: "📖 Hora da Palavra", corpo: "Que tal ler um capítulo da Bíblia hoje?" },
  { titulo: "📖 {nome}, um tempo com Deus?", corpo: "Abra a Bíblia no app e leia um pouquinho." },
  { titulo: "📖 A Palavra te espera", corpo: "Poucos minutos de leitura fazem diferença no dia." },
  { titulo: "📖 Que tal agora?", corpo: "Continue de onde parou na sua Bíblia." },
  { titulo: "📖 Um capítulo hoje", corpo: "Leia com calma. A Palavra renova o dia." },
];

function codigo(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(h, 31) + s.charCodeAt(i)) >>> 0;
  return h;
}

/** Texto do dia: avança um por dia (nunca repete o de ontem) e cada pessoa começa num ponto diferente da lista. */
export function textoDoLembrete(userId: string, hoje: string, comPlano: boolean): MensagemBiblia {
  const lista = comPlano ? TEXTOS_COM_PLANO : TEXTOS_SEM_PLANO;
  return lista[(diffDias("2026-01-01", hoje) + codigo(userId)) % lista.length];
}

function preencherTexto(t: string, vars: Record<string, string | number>) {
  return t.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? "")).replace(/\s+/g, " ").trim();
}

/** Mensagem de um perfil hoje, ou null se não deve receber (já leu hoje, plano em dia/concluído ou sumiu há mais de 14 dias). */
export function montarMensagemBiblia(p: PerfilBiblia, hoje: string): MensagemBiblia | null {
  if (!p.horario_lembrete) return null;
  if (p.ultima_leitura === hoje) return null;
  const ref = p.ultima_leitura ?? p.lembrete_desde ?? null;
  if (ref && diffDias(ref, hoje) > DIAS_SEM_INSISTIR) return null;
  let leitura = "";
  if (p.plano_id && p.plano_inicio) {
    const sit = situacaoDoPlano({ id: p.plano_id, inicio: p.plano_inicio, feitos: p.plano_feitos ?? [] }, hoje);
    if (sit) {
      if (sit.concluido || !sit.hoje || sit.hoje.feito) return null;
      leitura = sit.hoje.nome;
    }
  }
  const modelo = textoDoLembrete(p.user_id, hoje, Boolean(leitura));
  const vars = { nome: (p.nome || "amigo").split(" ")[0], leitura };
  return { titulo: preencherTexto(modelo.titulo, vars), corpo: preencherTexto(modelo.corpo, vars) };
}

/** Quem recebe agora (hora = "HH" em São Paulo): só quem ligou o lembrete da leitura, nesta hora, e ainda não leu hoje. */
export function quemRecebeBiblia(perfis: PerfilBiblia[], hora: string, hoje: string): EntregaBiblia[] {
  const out: EntregaBiblia[] = [];
  for (const perfil of perfis) {
    if (!perfil.horario_lembrete || perfil.horario_lembrete.slice(0, 2) !== hora) continue;
    const mensagem = montarMensagemBiblia(perfil, hoje);
    if (mensagem) out.push({ perfil, mensagem });
  }
  return out;
}

/** Perfil mínimo a partir do estado (bancada e testes). */
export function perfilDeEstadoBiblia(e: EstadoBiblia, userId: string, nome?: string): PerfilBiblia {
  return {
    user_id: userId, nome: nome ?? null, horario_lembrete: e.lembrete, lembrete_desde: e.lembreteDesde, plano_id: e.plano?.id ?? null,
    plano_inicio: e.plano?.inicio ?? null, plano_feitos: e.plano?.feitos ?? [], ultima_leitura: e.dias.length ? [...e.dias].sort().at(-1)! : null,
  };
}
