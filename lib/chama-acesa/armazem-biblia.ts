// Onde ficam a leitura, as notas e as explicações da Bíblia. Duas implementações com a mesma interface:
//  - remoto: servidor (rotas /api/membros/chama-biblia e /api/membros/chama-biblia-explicar)
//  - local: no navegador (bancada /membros/chama-dev); roda as MESMAS regras (biblia-estudo.ts) e simula cache e limite da IA.
import type { Chamada } from "./armazem.ts";
import { aplicarBiblia, estadoBibliaVazio, montarMensagemBiblia, perfilDeEstadoBiblia, type AcaoBiblia, type EstadoBiblia, type MensagemBiblia } from "./biblia-estudo.ts";
import { checarLimite, chaveExplicacao, explicacaoMock, LIMITE_IA_DIA, validarPedido, type Explicacao, type PedidoExplicacao, type UsoDia } from "./biblia-ia.ts";
import { dataSP } from "./regras.ts";

export interface InfoIa { disponivel: boolean; restantes: number; limite: number }
export interface PainelBiblia { estado: EstadoBiblia; hoje: string; ia: InfoIa }

export type RespostaExplicacao =
  | { ok: true; explicacao: Explicacao; cache: boolean; restantes: number; exemplo?: boolean }
  | { ok: false; motivo: "indisponivel" | "limite" | "erro"; mensagem: string; restantes?: number };

export interface ArmazemBiblia {
  tipo: "local" | "remoto";
  carregar(): Promise<PainelBiblia>;
  agir(acao: AcaoBiblia): Promise<PainelBiblia>;
  explicar(pedido: PedidoExplicacao): Promise<RespostaExplicacao>;
}

export interface ArmazemBibliaLocal extends ArmazemBiblia {
  dev: {
    zerar(): void;
    /** Texto do lembrete da leitura que a pessoa receberia hoje (null = não receberia). */
    previa(): Promise<MensagemBiblia | null>;
  };
}

export function criarBibliaRemoto(chamar: Chamada): ArmazemBiblia {
  return {
    tipo: "remoto",
    carregar: () => chamar<PainelBiblia>("/api/membros/chama-biblia"),
    agir: (acao) => chamar<PainelBiblia>("/api/membros/chama-biblia", { body: acao }),
    explicar: (pedido) => chamar<RespostaExplicacao>("/api/membros/chama-biblia-explicar", { body: pedido }),
  };
}

// ---------------------------------------------------------------- local

interface Guardado { estado: EstadoBiblia; cache: string[]; uso: UsoDia | null }
type Mem = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function criarBibliaLocal(chave: string, opcoes: { storage?: Mem; hoje?: () => string } = {}): ArmazemBibliaLocal {
  const k = `chama-acesa:biblia:v1:${chave}`;
  const st: Mem | undefined = opcoes.storage ?? (typeof window !== "undefined" ? window.localStorage : undefined);
  const hoje = opcoes.hoje ?? (() => dataSP());
  const ler = (): Guardado => {
    try {
      const bruto = st?.getItem(k);
      if (bruto) {
        const d = JSON.parse(bruto) as Partial<Guardado>;
        return { estado: { ...estadoBibliaVazio(), ...(d.estado ?? {}) }, cache: Array.isArray(d.cache) ? d.cache : [], uso: d.uso ?? null };
      }
    } catch {
      /* dado corrompido: começa vazio */
    }
    return { estado: estadoBibliaVazio(), cache: [], uso: null };
  };
  const gravar = (g: Guardado) => {
    try {
      st?.setItem(k, JSON.stringify(g));
    } catch {
      /* sem espaço */
    }
  };
  const painel = (g: Guardado): PainelBiblia => ({ estado: g.estado, hoje: hoje(), ia: { disponivel: true, restantes: checarLimite(g.uso, hoje()).restantes, limite: LIMITE_IA_DIA } });
  let contador = 0;
  const novoId = () => `local-${Date.now().toString(36)}-${(contador++).toString(36)}`;
  return {
    tipo: "local",
    async carregar() {
      return painel(ler());
    },
    async agir(acao) {
      const g = ler();
      const r = aplicarBiblia(g.estado, acao, hoje(), { novoId });
      if (r.erro) throw new Error(r.erro);
      g.estado = r.estado;
      gravar(g);
      return painel(g);
    },
    async explicar(pedido) {
      const v = validarPedido(pedido);
      if (!v.ok) return { ok: false, motivo: "erro", mensagem: v.erro };
      const g = ler();
      const chaveCache = chaveExplicacao(v.pedido);
      const jaTem = g.cache.includes(chaveCache);
      const lim = checarLimite(g.uso, hoje());
      if (!jaTem && !lim.permitido) return { ok: false, motivo: "limite", mensagem: `Você usou as ${LIMITE_IA_DIA} explicações novas de hoje. As que já foram geradas continuam abertas. Volte amanhã.`, restantes: 0 };
      if (!jaTem) {
        g.cache = [...g.cache, chaveCache];
        g.uso = { dia: hoje(), n: lim.usadas + 1 };
        gravar(g);
      }
      return { ok: true, explicacao: explicacaoMock(v.pedido), cache: jaTem, restantes: checarLimite(g.uso, hoje()).restantes, exemplo: true };
    },
    dev: {
      zerar() {
        st?.removeItem(k);
      },
      async previa() {
        const g = ler();
        return montarMensagemBiblia({ ...perfilDeEstadoBiblia(g.estado, "dev", "Você"), horario_lembrete: g.estado.lembrete ?? "07:00" }, hoje());
      },
    },
  };
}
