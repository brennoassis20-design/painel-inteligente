// Talentos: a moeda do Chama Acesa (parábola dos talentos, Mt 25). Ganha cumprindo a jornada e gasta no Tesouro
// (brasa guardada, restaurar a chama e os extras). Valores num lugar só para ajustar sem caçar no código.
import type { PlanoChama } from "./conta.ts";

export const TALENTOS_GANHO = { dia: 5, meta: 20, estudo: 10, praticaPerfeita: 3, ligaSubiu: 20, ligaFicou: 5, convite: 10 } as const;

export const PRECO = { brasa: 50, restaurar: 100, escudoDomingo: 30, voto: 25 } as const;

/** Brasas guardadas: 2 para todos; 3 para quem tem o vitalício (e administrador). */
export const MAX_BRASAS_VITALICIO = 3;
export function maxBrasasDoPlano(plano: PlanoChama | null | undefined, padrao = 2): number {
  return plano === "vitalicio" || plano === "admin" ? MAX_BRASAS_VITALICIO : padrao;
}

/** Janela para restaurar: até 2 dias de calendário depois do dia perdido (48 h depois que ele acabou). */
export const DIAS_PARA_RESTAURAR = 2;

/** Passos do caminho por esforço para restaurar a chama. */
export type PassoVolta = "dia" | "pratica" | "leitura";
export const PASSOS_VOLTA: readonly PassoVolta[] = ["dia", "pratica", "leitura"];

export const LEITURA_VOLTA = {
  titulo: "A volta",
  referencia: "Lucas 15:20-24",
  texto:
    "E, levantando-se, foi para seu pai. E, quando ainda estava longe, viu-o seu pai, e se moveu de íntima compaixão, e, correndo, lançou-se-lhe ao pescoço e o beijou. E o filho lhe disse: Pai, pequei contra o céu e perante ti, e já não sou digno de ser chamado teu filho. Mas o pai disse aos seus servos: Trazei depressa a melhor roupa; e vesti-lho, e ponde-lhe um anel na mão, e alparcas nos pés; e trazei o bezerro cevado, e matai-o; e comamos, e alegremo-nos; porque este meu filho estava morto, e reviveu; tinha-se perdido, e foi achado. E começaram a alegrar-se.",
  reflexao:
    "O filho não precisou consertar tudo antes de voltar. Ele só levantou e foi. O Pai já estava olhando a estrada. Falhar um dia não apaga o que Deus começou em você: a graça te recebe de volta. Hoje é dia de levantar.",
  oracao: "Pai, eu volto. Obrigado porque o Senhor corre ao meu encontro. Reacende em mim o fogo do altar e me ajuda a permanecer. Amém.",
} as const;
