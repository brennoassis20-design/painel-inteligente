// Onde fica a jornada. Duas implementações com a mesma interface:
//  - remoto: servidor (rota /api/membros/chama; as regras rodam lá)
//  - local: no navegador (bancada /membros/chama-dev e uso sem a migration aplicada); roda as MESMAS regras.
import type { Dia } from "./dias.ts";
import { diasLiberados, type Painel } from "./painel.ts";
import { aplicarAcao, atualizarParaHoje, dataSP, estadoVazio, somarDias, type Acao, type Estado, type Medalha } from "./regras.ts";

export interface RespostaAcao extends Painel {
  completouDia: number | null;
  novasMedalhas: Medalha[];
  ganhouBrasa: boolean;
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

export interface ArmazemLocal extends Armazem {
  /** Controles de teste (bancada). */
  dev: {
    avancar(dias: number): void;
    alternarCompra(): boolean;
    zerar(): void;
    ler(): { deslocamento: number; pago: boolean; hoje: string };
  };
}

type Mem = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function criarArmazemLocal(
  chave: string,
  opcoes: { buscarDias: () => Promise<Dia[]>; storage?: Mem; checkoutUrl?: string | null; oferta365Url?: string | null; pagoInicial?: boolean; relogio?: () => string },
): ArmazemLocal {
  const k = `chama-acesa:v1:${chave}`;
  const st: Mem | undefined = opcoes.storage ?? (typeof window !== "undefined" ? window.localStorage : undefined);
  const ler = (): Guardado => {
    try {
      const bruto = st?.getItem(k);
      if (bruto) {
        const d = JSON.parse(bruto) as Partial<Guardado>;
        return { estado: { ...estadoVazio(), ...(d.estado ?? {}) }, deslocamento: Number(d.deslocamento) || 0, pago: Boolean(d.pago) };
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
  const painel = async (g: Guardado): Promise<Painel> => {
    const todos = await opcoes.buscarDias();
    const hoje = hojeDe(g);
    return { estado: g.estado, hoje, pago: g.pago, dias: diasLiberados(todos, g.pago), checkoutUrl: opcoes.checkoutUrl ?? null, oferta365Url: opcoes.oferta365Url ?? null, exemplo: false };
  };
  return {
    tipo: "local",
    async carregar() {
      const g = ler();
      g.estado = atualizarParaHoje(g.estado, hojeDe(g));
      gravar(g);
      return painel(g);
    },
    async agir(acao) {
      const g = ler();
      const r = aplicarAcao(g.estado, acao, hojeDe(g), g.pago);
      if (r.erro) throw new Error(r.erro);
      g.estado = r.estado;
      gravar(g);
      return { ...(await painel(g)), completouDia: r.completouDia, novasMedalhas: r.novasMedalhas, ganhouBrasa: r.ganhouBrasa };
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
      ler() {
        const g = ler();
        return { deslocamento: g.deslocamento, pago: g.pago, hoje: hojeDe(g) };
      },
    },
  };
}
