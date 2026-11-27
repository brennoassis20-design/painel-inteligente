// Onde fica a jornada. Duas implementações com a mesma interface:
//  - remoto: servidor (rota /api/membros/chama; as regras rodam lá)
//  - local: no navegador (bancada /membros/chama-dev e uso sem a migração aplicada); roda as MESMAS regras.
import type { Dia } from "./dias.ts";
import { criarBibliaLocal, criarBibliaRemoto, type ArmazemBiblia, type ArmazemBibliaLocal } from "./armazem-biblia.ts";
import { primeiroNome, validarNome, type Conta, type PlanoChama } from "./conta.ts";
import { aleatorio, atualizarLiga, gerarBots, xpDoBot, type ConfigLigas } from "./ligas.ts";
import { MINIMO_PADRAO, rankingReal, type MembroRanking } from "./ranking.ts";
import { escolherTexto, montarMensagem, perfilDeEstado, preencher, type Mensagem, type Texto, type Tipo } from "./lembretes.ts";
import { diasDasMetas, marcosLiberados, type Meta } from "./marcos.ts";
import { diasLiberados, type Painel } from "./painel.ts";
import type { OfertasChama } from "./precos.ts";
import type { Versiculo } from "./pratica.ts";
import { maxBrasasDoPlano } from "./talentos.ts";
import type { PremioMana } from "./mana.ts";
import { aplicarAcao, atualizarParaHoje, diffDias, dataSP, estadoVazio, horaSP, inicioSemana, premiarConvite, registrarAcesso, somarDias, somarXp, XP, type Acao, type Estado, type Medalha } from "./regras.ts";

export interface RespostaAcao extends Painel {
  completouDia: number | null;
  novasMedalhas: Medalha[];
  ganhouBrasa: boolean;
  xpGanho: number;
  /** Prêmio(s) do Maná do dia, na ação abrirMana. */
  mana?: PremioMana[];
}

export type AcaoConta =
  | { tipo: "nome"; nome: string }
  | { tipo: "mostrar"; valor: boolean }
  /** `dados` = a foto já recortada e reduzida, em base64 (sem o prefixo data:). */
  | { tipo: "foto"; dados: string; mime: string }
  | { tipo: "removerFoto" };

export interface ArmazemConta {
  carregar(): Promise<Conta>;
  agir(acao: AcaoConta): Promise<Conta>;
}

export interface Armazem {
  tipo: "local" | "remoto";
  /** Conta (nome, foto, preferência do ranking, plano). */
  conta?: ArmazemConta;
  carregar(): Promise<Painel>;
  agir(acao: Acao): Promise<RespostaAcao>;
  /** Bíblia (leitura, planos, notas, explicações): grátis e separada da jornada. */
  biblia?: ArmazemBiblia;
}

export type Chamada = <T = unknown>(path: string, init?: { method?: string; body?: unknown }) => Promise<T>;

export function criarArmazemRemoto(chamar: Chamada): Armazem {
  return {
    tipo: "remoto",
    biblia: criarBibliaRemoto(chamar),
    conta: {
      carregar: () => chamar<Conta>("/api/membros/chama-conta"),
      agir: (a) => chamar<Conta>("/api/membros/chama-conta", { body: a.tipo === "nome" ? { acao: "nome", nome: a.nome } : a.tipo === "mostrar" ? { acao: "mostrar", valor: a.valor } : a.tipo === "foto" ? { acao: "foto", dados: a.dados } : { acao: "removerFoto" } }),
    },
    carregar: () => chamar<Painel>("/api/membros/chama"),
    agir: (acao) => {
      const corpo =
        acao.tipo === "check" ? { acao: "check", dia: acao.dia, check: acao.check }
        : acao.tipo === "jejum" ? { acao: "jejum", dia: acao.dia, valor: acao.valor }
        : acao.tipo === "estudo" ? { acao: "estudo", dia: acao.dia }
        : acao.tipo === "lembrete" ? { acao: "lembrete", horario: acao.horario }
        : acao.tipo === "pratica" ? { acao: "pratica", acertos: acao.acertos, ids: acao.ids, certos: acao.certos }
        : { ...acao, tipo: undefined, acao: acao.tipo }; // limparAvisos, limparResultadoLiga, comprarBrasa, restaurar, leituraVolta e extras
      return chamar<RespostaAcao>("/api/membros/chama", { body: corpo });
    },
  };
}

// ---------------------------------------------------------------- local

interface Guardado {
  estado: Estado;
  /** Dias somados ao relógio (só na bancada: simula a passagem do tempo). */
  deslocamento: number;
  pago: boolean;
  /** Bancada: quantos membros "reais" simulados entram na liga (0 = nenhum). */
  simulados?: number;
  /** Conta local (nome, foto como data URL, preferência do ranking). */
  conta?: { nome: string; foto: string | null; mostrar: boolean };
}

export interface Conteudo { dias: Dia[]; versiculos: Versiculo[]; ligas: ConfigLigas; textos: Texto[]; marcos?: Meta[]; missoes?: string[] }

export interface ArmazemLocal extends Armazem {
  biblia: ArmazemBibliaLocal;
  /** Controles de teste (bancada). */
  dev: {
    avancar(dias: number): void;
    alternarCompra(): boolean;
    zerar(): void;
    ganharXp(n: number): void;
    ganharTalentos(n: number): void;
    definirChama(dias: number): void;
    /** Estado coerente de quem vem usando o app: N dias concluídos até ontem (histórico, checks, XP, semana e metas). Só bancada. */
    simularHistorico(dias: number): void;
    /** Pula para a próxima segunda-feira 00h (fecha a semana da liga). */
    virarSemana(): void;
    /** Entram N membros reais simulados na liga (com fotos e alguns anônimos); 0 desliga. Passando do mínimo, o ranking vira "real". */
    simularMembros(n: number): void;
    /** Um amigo convidado completou o dia 1: +50 XP e 1 brasa. */
    simularAmigo(): void;
    ler(): { deslocamento: number; pago: boolean; hoje: string };
    /** Texto do lembrete que a pessoa receberia; `semAbrir` simula dias sem abrir o app. */
    previa(tipo: Tipo | "dia4", semAbrir?: number): Promise<Mensagem | null>;
  };
}

type Mem = Pick<Storage, "getItem" | "setItem" | "removeItem">;
export const SEMENTE_LOCAL = "dev";

export function criarArmazemLocal(
  chave: string,
  opcoes: { buscarConteudo: () => Promise<Conteudo>; storage?: Mem; checkoutUrl?: string | null; ofertas?: OfertasChama; oferta365Url?: string | null; pagoInicial?: boolean; relogio?: () => string; conviteBase?: string; ligaRealMinimo?: number },
): ArmazemLocal {
  const k = `chama-acesa:v2:${chave}`;
  const st: Mem | undefined = opcoes.storage ?? (typeof window !== "undefined" ? window.localStorage : undefined);
  const ler = (): Guardado => {
    try {
      const bruto = st?.getItem(k);
      if (bruto) {
        const d = JSON.parse(bruto) as Partial<Guardado>;
        const base = estadoVazio();
        return { estado: { ...base, ...(d.estado ?? {}), liga: { ...base.liga, ...(d.estado?.liga ?? {}) } }, deslocamento: Number(d.deslocamento) || 0, pago: Boolean(d.pago), simulados: Number(d.simulados) || 0, conta: d.conta };
      }
    } catch {
      /* dado corrompido: começa vazio */
    }
    return { estado: estadoVazio(), deslocamento: 0, pago: Boolean(opcoes.pagoInicial) };
  };
  const gravar = (g: Guardado) => {
    try {
      st?.setItem(k, JSON.stringify(g));
    } catch {
      /* sem espaço */
    }
  };
  const hojeDe = (g: Guardado) => somarDias((opcoes.relogio ?? (() => dataSP()))(), g.deslocamento);
  const emDia = (g: Guardado, c: Conteudo) => {
    const hoje = hojeDe(g);
    return atualizarLiga(atualizarParaHoje(registrarAcesso(g.estado, hoje), hoje), hoje, SEMENTE_LOCAL, c.ligas);
  };
  const biblia = criarBibliaLocal(chave, { storage: st, hoje: () => hojeDe(ler()) });
  const contaDe = (g: Guardado): Conta => ({ nome: g.conta?.nome ?? "Você", email: "voce@exemplo.com", foto: g.conta?.foto ?? null, mostrarNoRanking: g.conta?.mostrar !== false, plano: (g.pago ? "vitalicio" : "gratis") as PlanoChama });
  const FOTOS = ["#f97316", "#22c55e", "#3b82f6", "#a855f7", "#ef4444", "#eab308"].map((cor) => `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='${cor}'/><stop offset='1' stop-color='#0a0f1f'/></linearGradient></defs><rect width='64' height='64' fill='url(#g)'/><circle cx='32' cy='25' r='11' fill='#fff' fill-opacity='.85'/><path d='M10 64c2-16 12-22 22-22s20 6 22 22z' fill='#fff' fill-opacity='.85'/></svg>`)}`);
  // Ranking real simulado (só bancada): reaproveita os nomes do ligas.json como "membros" com foto, e alguns que desligaram o ranking.
  const rankingLocal = (g: Guardado, c: Conteudo, hoje: string) => {
    if (!g.simulados || g.simulados < 1) return null;
    const sem = inicioSemana(hoje);
    const t = Math.min(7, diffDias(sem, hoje) + horaSP() / 24);
    const bots = gerarBots(SEMENTE_LOCAL, sem, g.estado.liga.indice, { ...c.ligas, tamanho: Math.max(g.simulados + 1, 2) }).slice(0, g.simulados);
    const outros: MembroRanking[] = bots.map((b, i) => ({ id: `sim-${i}`, nome: `${b.nome} Sobrenome`, foto: i % 4 === 3 ? null : FOTOS[i % FOTOS.length], mostrar: i % 5 !== 4, xp: xpDoBot(b, t) || 10 + i }));
    const eu: MembroRanking = { id: "eu", nome: g.conta?.nome ?? "Você", foto: g.conta?.foto ?? null, mostrar: g.conta?.mostrar !== false, xp: g.estado.xpSemana[sem] ?? 0 };
    return rankingReal([...outros, eu], "eu", sem, c.ligas, opcoes.ligaRealMinimo ?? MINIMO_PADRAO);
  };
  const painel = (g: Guardado, c: Conteudo): Painel => ({
    estado: g.estado, hoje: hojeDe(g), hora: horaSP(), pago: g.pago, dias: diasLiberados(c.dias, g.pago), versiculos: c.versiculos, ligas: c.ligas,
    semente: SEMENTE_LOCAL, nome: g.conta?.nome ? primeiroNome(g.conta.nome) : "Você", perfil: { foto: g.conta?.foto ?? null, mostrarNoRanking: g.conta?.mostrar !== false, plano: contaDe(g).plano }, ranking: rankingLocal(g, c, hojeDe(g)), codigo: "dev12345", conviteBase: opcoes.conviteBase ?? "http://localhost:3000/membros/chama-dev",
    checkoutUrl: opcoes.checkoutUrl ?? null, ofertas: opcoes.ofertas ?? { vitalicioUrl: null, mensalUrl: null, parcelaVitalicio: null },
    marcos: marcosLiberados(c.marcos ?? [], g.estado.maior), missoes: c.missoes ?? [], oferta365Url: opcoes.oferta365Url ?? null, exemplo: false,
  });
  return {
    tipo: "local",
    biblia,
    conta: {
      async carregar() {
        return contaDe(ler());
      },
      async agir(a) {
        const g = ler();
        const atual = g.conta ?? { nome: "Você", foto: null, mostrar: true };
        if (a.tipo === "nome") {
          const v = validarNome(a.nome);
          if (!v.ok) throw new Error(v.erro);
          g.conta = { ...atual, nome: v.nome };
        } else if (a.tipo === "mostrar") g.conta = { ...atual, mostrar: a.valor };
        else if (a.tipo === "foto") g.conta = { ...atual, foto: `data:${a.mime};base64,${a.dados}` };
        else g.conta = { ...atual, foto: null };
        gravar(g);
        return contaDe(g);
      },
    },
    async carregar() {
      const c = await opcoes.buscarConteudo();
      const g = ler();
      g.estado = emDia(g, c);
      gravar(g);
      return painel(g, c);
    },
    async agir(acao) {
      const c = await opcoes.buscarConteudo();
      const g = ler();
      const r = aplicarAcao(emDia(g, c), acao, hojeDe(g), g.pago, diasDasMetas(c.marcos), { maxBrasas: maxBrasasDoPlano(contaDe(g).plano) });
      if (r.erro) throw new Error(r.erro);
      g.estado = r.estado;
      gravar(g);
      return { ...painel(g, c), completouDia: r.completouDia, novasMedalhas: r.novasMedalhas, ganhouBrasa: r.ganhouBrasa, xpGanho: r.xpGanho, mana: r.mana };
    },
    dev: {
      avancar(dias) {
        const g = ler();
        g.deslocamento += dias;
        gravar(g);
      },
      alternarCompra() {
        const g = ler();
        g.pago = !g.pago;
        gravar(g);
        return g.pago;
      },
      zerar() {
        st?.removeItem(k);
        biblia.dev.zerar();
      },
      definirChama(dias) {
        // Bancada: põe a sequência num número qualquer (ex.: 1000) para ver a chama e as metas.
        const g = ler();
        const hoje = hojeDe(g);
        g.estado = { ...g.estado, chama: dias, maior: Math.max(g.estado.maior, dias), ultimaData: dias > 0 ? somarDias(hoje, -1) : null, diasAtivos: Math.max(g.estado.diasAtivos ?? 0, dias) };
        gravar(g);
      },
      simularHistorico(n) {
        const g = ler();
        const hoje = hojeDe(g);
        const concluidos: Record<number, string> = {};
        const checks: Estado["checks"] = {};
        const xpSemana: Record<string, number> = {};
        let xp = 0;
        // Como no servidor: os 21 dias da jornada + só os últimos 30 dias contínuos vêm com data.
        for (let k = 1; k <= n; k += 1) {
          if (k > 21 && k <= n - 30) continue;
          const data = somarDias(hoje, -(n - k + 1));
          concluidos[k] = data;
          checks[k] = { leu: true, orou: true, missao: true };
        }
        for (let k = 1; k <= n; k += 1) {
          const dia = XP.leu + XP.orou + XP.missao + XP.bonusDia;
          xp += dia;
          const data = somarDias(hoje, -(n - k + 1));
          const s = inicioSemana(data);
          xpSemana[s] = (xpSemana[s] ?? 0) + dia;
        }
        const medalhas: Medalha[] = [...diasDasMetas(null)].filter((d) => d <= n).map((d) => `meta${d}`);
        if (n >= 21) medalhas.push("jornada");
        g.estado = { ...g.estado, chama: n, maior: Math.max(g.estado.maior, n), ultimaData: n > 0 ? somarDias(hoje, -1) : null, diasAtivos: n, inicio: n > 0 ? somarDias(hoje, -n) : null, concluidos, checks, xp, xpSemana, medalhas, brasas: Math.min(2, Math.floor(n / 7)), lembrete: "07:00" };
        gravar(g);
      },
      simularMembros(n) {
        const g = ler();
        g.simulados = Math.max(0, Math.floor(n));
        gravar(g);
      },
      ganharXp(n) {
        const g = ler();
        g.estado = somarXp(g.estado, n, hojeDe(g));
        gravar(g);
      },
      ganharTalentos(n) {
        const g = ler();
        g.estado = { ...g.estado, talentos: (g.estado.talentos ?? 0) + n };
        gravar(g);
      },
      virarSemana() {
        const g = ler();
        const hoje = hojeDe(g);
        g.deslocamento += 7 - diffDias(inicioSemana(hoje), hoje);
        gravar(g);
      },
      simularAmigo() {
        const g = ler();
        g.estado = premiarConvite(g.estado, hojeDe(g));
        gravar(g);
      },
      ler() {
        const g = ler();
        return { deslocamento: g.deslocamento, pago: g.pago, hoje: hojeDe(g) };
      },
      async previa(tipo, semAbrir = 0) {
        const c = await opcoes.buscarConteudo();
        const g = ler();
        const hoje = hojeDe(g);
        const e = g.estado;
        if (tipo === "dia4") {
          const t = escolherTexto(c.textos, "checkout_dia4", e.lembretesHist, hoje, aleatorio(`${hoje}|dia4`));
          if (!t) return null;
          const vars = { nome: "amigo", dias: e.chama, proximo_dia: 4 };
          return { tipo: "checkout", categoria: t.cat, chave: `${t.cat}|${t.titulo}`, titulo: preencher(t.titulo, vars), corpo: preencher(t.corpo, vars) };
        }
        const perfil = { ...perfilDeEstado(e, SEMENTE_LOCAL, "Você"), horario_lembrete: e.lembrete ?? "07:00", ultimo_acesso: semAbrir ? somarDias(hoje, -semAbrir) : e.ultimoAcesso };
        return montarMensagem(perfil, tipo, hoje, tipo === "noite" ? 21 : 7, c.textos, c.ligas, aleatorio(`${hoje}|${tipo}|${semAbrir}|${e.xp}`));
      },
    },
  };
}
