// Onde fica a jornada. Duas implementações com a mesma interface:
//  - remoto: servidor (rota /api/membros/chama; as regras rodam lá)
//  - local: no navegador (bancada /membros/chama-dev e uso sem a migração aplicada); roda as MESMAS regras.
import type { Dia } from "./dias.ts";
import { aleatorio, atualizarLiga, type ConfigLigas } from "./ligas.ts";
import { escolherTexto, montarMensagem, perfilDeEstado, preencher, type Mensagem, type Texto, type Tipo } from "./lembretes.ts";
import { diasLiberados, type Painel } from "./painel.ts";
import type { Versiculo } from "./pratica.ts";
import { aplicarAcao, atualizarParaHoje, diffDias, dataSP, estadoVazio, horaSP, inicioSemana, premiarConvite, registrarAcesso, somarDias, somarXp, type Acao, type Estado, type Medalha } from "./regras.ts";

export interface RespostaAcao extends Painel {
  completouDia: number | null;
  novasMedalhas: Medalha[];
  ganhouBrasa: boolean;
  xpGanho: number;
}

export interface Armazem {
  tipo: "local" | "remoto";
  carregar(): Promise<Painel>;
  agir(acao: Acao): Promise<RespostaAcao>;
}

export type Chamada = <T = unknown>(path: string, init?: { method?: string; body?: unknown }) => Promise<T>;

export function criarArmazemRemoto(chamar: Chamada): Armazem {
  return {
    tipo: "remoto",
    carregar: () => chamar<Painel>("/api/membros/chama"),
    agir: (acao) => {
      const corpo =
        acao.tipo === "check" ? { acao: "check", dia: acao.dia, check: acao.check }
        : acao.tipo === "jejum" ? { acao: "jejum", dia: acao.dia, valor: acao.valor }
        : acao.tipo === "lembrete" ? { acao: "lembrete", horario: acao.horario }
        : acao.tipo === "pratica" ? { acao: "pratica", acertos: acao.acertos, ids: acao.ids }
        : acao.tipo === "limparResultadoLiga" ? { acao: "limparResultadoLiga" }
        : { acao: "limparAvisos" };
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
}

export interface Conteudo { dias: Dia[]; versiculos: Versiculo[]; ligas: ConfigLigas; textos: Texto[] }

export interface ArmazemLocal extends Armazem {
  /** Controles de teste (bancada). */
  dev: {
    avancar(dias: number): void;
    alternarCompra(): boolean;
    zerar(): void;
    ganharXp(n: number): void;
    /** Pula para a próxima segunda-feira 00h (fecha a semana da liga). */
    virarSemana(): void;
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
  opcoes: { buscarConteudo: () => Promise<Conteudo>; storage?: Mem; checkoutUrl?: string | null; oferta365Url?: string | null; pagoInicial?: boolean; relogio?: () => string; conviteBase?: string },
): ArmazemLocal {
  const k = `chama-acesa:v2:${chave}`;
  const st: Mem | undefined = opcoes.storage ?? (typeof window !== "undefined" ? window.localStorage : undefined);
  const ler = (): Guardado => {
    try {
      const bruto = st?.getItem(k);
      if (bruto) {
        const d = JSON.parse(bruto) as Partial<Guardado>;
        const base = estadoVazio();
        return { estado: { ...base, ...(d.estado ?? {}), liga: { ...base.liga, ...(d.estado?.liga ?? {}) } }, deslocamento: Number(d.deslocamento) || 0, pago: Boolean(d.pago) };
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
  const painel = (g: Guardado, c: Conteudo): Painel => ({
    estado: g.estado, hoje: hojeDe(g), hora: horaSP(), pago: g.pago, dias: diasLiberados(c.dias, g.pago), versiculos: c.versiculos, ligas: c.ligas,
    semente: SEMENTE_LOCAL, nome: "Você", codigo: "dev12345", conviteBase: opcoes.conviteBase ?? "http://localhost:3000/membros/chama-dev",
    checkoutUrl: opcoes.checkoutUrl ?? null, oferta365Url: opcoes.oferta365Url ?? null, exemplo: false,
  });
  return {
    tipo: "local",
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
      const r = aplicarAcao(emDia(g, c), acao, hojeDe(g), g.pago);
      if (r.erro) throw new Error(r.erro);
      g.estado = r.estado;
      gravar(g);
      return { ...painel(g, c), completouDia: r.completouDia, novasMedalhas: r.novasMedalhas, ganhouBrasa: r.ganhouBrasa, xpGanho: r.xpGanho };
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
      },
      ganharXp(n) {
        const g = ler();
        g.estado = somarXp(g.estado, n, hojeDe(g));
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
