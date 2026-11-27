// Maná do dia (Êx 16): um prêmio sorteado por dia, que só pode ser recolhido DEPOIS de fazer o dia.
// 7 dias seguidos recolhendo = "maná de sábado" (chances melhores), como a porção dobrada antes do sábado.
// Puro: o sorteio chega pronto (números de 0 a 1) do servidor; quem aplica XP/talentos/brasa/vigília é regras.ts.

export type PremioMana =
  | { tipo: "xp"; n: number }
  | { tipo: "talentos"; n: number; deBrasa?: boolean }
  | { tipo: "vigilia"; minutos: number }
  | { tipo: "brasa" };

export interface EstadoMana { dia: string | null; seq: number }

/** De quantos em quantos dias seguidos vem o maná de sábado. */
export const DIAS_SABADO = 7;
/** Brasa sorteada com as brasas cheias vira talentos. */
export const TALENTOS_NO_LUGAR_DA_BRASA = 20;
/** Quantos números de sorteio o servidor manda. */
export const SORTEIOS_MANA = 6;

type Faixa = { tipo: "xp" | "talentos" | "vigilia" | "brasa" | "dobrado"; peso: number };
const NORMAL: Faixa[] = [{ tipo: "xp", peso: 40 }, { tipo: "talentos", peso: 30 }, { tipo: "vigilia", peso: 18 }, { tipo: "brasa", peso: 10 }, { tipo: "dobrado", peso: 2 }];
const SABADO: Faixa[] = [{ tipo: "xp", peso: 25 }, { tipo: "talentos", peso: 30 }, { tipo: "vigilia", peso: 20 }, { tipo: "brasa", peso: 20 }, { tipo: "dobrado", peso: 5 }];

const entre = (r: number, min: number, max: number) => min + Math.floor(Math.min(0.999999, Math.max(0, r)) * (max - min + 1));

function escolher(faixas: Faixa[], r: number): Faixa["tipo"] {
  const total = faixas.reduce((s, f) => s + f.peso, 0);
  let x = Math.min(0.999999, Math.max(0, r)) * total;
  for (const f of faixas) {
    if (x < f.peso) return f.tipo;
    x -= f.peso;
  }
  return faixas[0].tipo;
}

function premio(tipo: Exclude<Faixa["tipo"], "dobrado">, r: number, sabado: boolean): PremioMana {
  if (tipo === "xp") return { tipo, n: sabado ? entre(r, 25, 40) : entre(r, 10, 20) };
  if (tipo === "talentos") return { tipo, n: sabado ? entre(r, 15, 25) : entre(r, 5, 10) };
  if (tipo === "vigilia") return { tipo, minutos: sabado ? 20 : 10 };
  return { tipo: "brasa" };
}

/** Sorteia o(s) prêmio(s). `rs` = SORTEIOS_MANA números entre 0 e 1. */
export function sortearMana(rs: readonly number[], sabado: boolean): PremioMana[] {
  const faixas = sabado ? SABADO : NORMAL;
  const r = (i: number) => rs[i] ?? 0.5;
  const t = escolher(faixas, r(0));
  if (t !== "dobrado") return [premio(t, r(1), sabado)];
  // Maná dobrado: dois prêmios (sem outro "dobrado").
  const sem = faixas.filter((f) => f.tipo !== "dobrado");
  return [premio(escolher(sem, r(2)) as Exclude<Faixa["tipo"], "dobrado">, r(3), sabado), premio(escolher(sem, r(4)) as Exclude<Faixa["tipo"], "dobrado">, r(5), sabado)];
}

/** Próximo estado do maná ao recolher hoje (sequência de dias seguidos). */
export function proximoMana(m: EstadoMana | undefined, hoje: string, ontem: string): { mana: EstadoMana; sabado: boolean } {
  const seq = m?.dia === ontem ? (m.seq ?? 0) + 1 : 1;
  return { mana: { dia: hoje, seq }, sabado: seq % DIAS_SABADO === 0 };
}

/** Quantos dias faltam para o maná de sábado (contando o de hoje, se ainda não recolheu). */
export function diasParaSabado(m: EstadoMana | undefined, hoje: string, ontem: string): number {
  const seqHoje = m?.dia === hoje ? m.seq : m?.dia === ontem ? (m.seq ?? 0) + 1 : 1;
  const resto = seqHoje % DIAS_SABADO;
  return resto === 0 ? 0 : DIAS_SABADO - resto;
}

export function textoPremio(p: PremioMana): string {
  if (p.tipo === "xp") return `+${p.n} XP`;
  if (p.tipo === "talentos") return p.deBrasa ? `+${p.n} talentos (suas brasas já estavam cheias)` : `+${p.n} talentos`;
  if (p.tipo === "vigilia") return `XP em dobro por ${p.minutos} minutos`;
  return "1 brasa guardada";
}
