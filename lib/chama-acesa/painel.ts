// Monta o que a tela precisa (estado + conteúdo liberado). Usado pela rota do servidor e pelo armazém local.
import type { Dia } from "./dias";
import type { PlanoChama } from "./conta";
import type { ConfigLigas, Linha } from "./ligas";
import type { Meta } from "./marcos";
import type { Versiculo } from "./pratica";
import type { OfertasChama } from "./precos";
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
  /** Foto, preferência do ranking e plano da própria pessoa (e-mail e dados de conta ficam em /api/membros/chama-conta). */
  perfil: { foto: string | null; mostrarNoRanking: boolean; plano: PlanoChama };
  /** Ranking real da semana (só primeiro nome, foto e XP) quando há membros suficientes na liga; null = ranking fictício. */
  ranking: Linha[] | null;
  /** Liga mista: outros membros reais ativos da liga (abaixo do mínimo do ranking real), no lugar de fictícios. Opcional p/ painéis antigos. */
  outrosReais?: Linha[] | null;
  /** Código de convite da pessoa e endereço do cadastro grátis (sem o ?ref=). */
  codigo: string;
  conviteBase: string;
  /** Link antigo (pagamento único); só aparece se `ofertas` estiver sem links. */
  checkoutUrl: string | null;
  ofertas: OfertasChama;
  /** Metas da chama. O estudo só vem preenchido nas metas que a pessoa já alcançou (marcosLiberados). */
  marcos: Meta[];
  /** Banco de missões dos dias depois do 21. */
  missoes: string[];
  oferta365Url: string | null;
  /** true = ainda é o conteúdo de exemplo (dias.json não existe). */
  exemplo: boolean;
}

/** Conteúdo pago nunca sai do servidor para quem não comprou. */
export function diasLiberados(todos: Dia[], pago: boolean): Dia[] {
  return todos.filter((d) => pago || d.dia <= DIAS_GRATIS);
}
