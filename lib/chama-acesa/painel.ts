// Monta o que a tela precisa (estado + conteúdo liberado). Usado pela rota do servidor.
import type { Dia } from "./dias";
import { DIAS_GRATIS, type Estado } from "./regras";

export interface Painel {
  estado: Estado;
  hoje: string;
  pago: boolean;
  dias: Dia[];
  checkoutUrl: string | null;
  oferta365Url: string | null;
  /** true = ainda é o conteúdo de exemplo (dias.json não existe). */
  exemplo: boolean;
}

/** Conteúdo pago nunca sai do servidor para quem não comprou. */
export function diasLiberados(todos: Dia[], pago: boolean): Dia[] {
  return todos.filter((d) => pago || d.dia <= DIAS_GRATIS);
}
