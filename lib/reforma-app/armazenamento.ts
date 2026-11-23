// Onde ficam os clientes e o escritório do contador. Duas implementações com a mesma interface:
//  - local: no navegador (desenvolvimento e uso sem a migration aplicada)
//  - supabase: na conta do contador, pela rota /api/membros/reforma (produção)
// A escolha vem da variável REFORMA_APP_ARMAZENAMENTO ("supabase" ou "local"), entregue pela rota /api/membros/inicio.
import { ESCRITORIO_VAZIO, type Cliente, type Escritorio } from "./modelo.ts";

export interface DadosApp {
  escritorio: Escritorio;
  clientes: Cliente[];
}

export interface Armazenamento {
  tipo: "local" | "supabase";
  carregar(): Promise<DadosApp>;
  salvarEscritorio(e: Escritorio): Promise<void>;
  salvarCliente(c: Cliente): Promise<void>;
  apagarCliente(id: string): Promise<void>;
}

function ordenar(lista: Cliente[]): Cliente[] {
  return [...lista].sort((a, b) => b.atualizadoEm.localeCompare(a.atualizadoEm));
}

export function criarArmazenamentoLocal(chave: string, storage?: Pick<Storage, "getItem" | "setItem">): Armazenamento {
  const k = `reforma-app:v1:${chave}`;
  const st = storage ?? (typeof window !== "undefined" ? window.localStorage : undefined);
  const ler = (): DadosApp => {
    try {
      const bruto = st?.getItem(k);
      if (bruto) {
        const d = JSON.parse(bruto) as Partial<DadosApp>;
        return { escritorio: { ...ESCRITORIO_VAZIO, ...(d.escritorio ?? {}) }, clientes: Array.isArray(d.clientes) ? d.clientes : [] };
      }
    } catch {
      /* dado corrompido: começa vazio */
    }
    return { escritorio: { ...ESCRITORIO_VAZIO }, clientes: [] };
  };
  const gravar = (d: DadosApp) => {
    try {
      st?.setItem(k, JSON.stringify(d));
    } catch {
      throw new Error("Não deu para salvar neste aparelho (armazenamento cheio ou bloqueado).");
    }
  };
  return {
    tipo: "local",
    async carregar() {
      const d = ler();
      return { ...d, clientes: ordenar(d.clientes) };
    },
    async salvarEscritorio(e) {
      const d = ler();
      gravar({ ...d, escritorio: e });
    },
    async salvarCliente(c) {
      const d = ler();
      const clientes = d.clientes.some((x) => x.id === c.id) ? d.clientes.map((x) => (x.id === c.id ? c : x)) : [...d.clientes, c];
      gravar({ ...d, clientes });
    },
    async apagarCliente(id) {
      const d = ler();
      gravar({ ...d, clientes: d.clientes.filter((x) => x.id !== id) });
    },
  };
}

export type Chamada = (caminho: string, init?: { method?: string; body?: unknown }) => Promise<unknown>;

export function criarArmazenamentoSupabase(chamar: Chamada): Armazenamento {
  const URL = "/api/membros/reforma";
  return {
    tipo: "supabase",
    async carregar() {
      const d = (await chamar(URL)) as Partial<DadosApp>;
      return { escritorio: { ...ESCRITORIO_VAZIO, ...(d.escritorio ?? {}) }, clientes: ordenar(Array.isArray(d.clientes) ? d.clientes : []) };
    },
    async salvarEscritorio(e) {
      await chamar(URL, { body: { acao: "escritorio", escritorio: e } });
    },
    async salvarCliente(c) {
      await chamar(URL, { body: { acao: "cliente", cliente: c } });
    },
    async apagarCliente(id) {
      await chamar(URL, { body: { acao: "apagar", id } });
    },
  };
}
