// Monta o que a tela precisa (estado + conteúdo liberado). Usado pela rota do servidor e pelo armazém local.
import type { Dia } from "./dias";
import type { ConfigLigas } from "./ligas";
import type { Versiculo } from "./pratica";
import { DIAS_GRATIS, type Estado } from "./regras.ts";

export interface Painel {
  estado: Estado;
  hoje: string;
  /** Hora do dia em São Paulo (0 a 24, fracionária): a liga cresce ao longo do dia. */
  hora: number;
  pago: boolean;
  dias: Dia[];
  versiculos: Versiculo[];
  ligas: ConfigLigas;
  /** Semente do grupo fictício da liga (user_id). */
  semente: string;
  nome: string;
  /** Código de convite da pessoa e endereço do cadastro grátis (sem o ?ref=). */
  codigo: string;
  conviteBase: string;
  checkoutUrl: string | null;
  oferta365Url: string | null;
  /** true = ainda é o conteúdo de exemplo (dias.json não existe). */
  exemplo: boolean;
}

/** Conteúdo pago nunca sai do servidor para quem não comprou. */
export function diasLiberados(todos: Dia[], pago: boolean): Dia[] {
  return todos.filter((d) => pago || d.dia <= DIAS_GRATIS);
}
