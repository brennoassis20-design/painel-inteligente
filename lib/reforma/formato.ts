// Formatação em português do Brasil para a memória de cálculo (só texto; os valores exatos ficam em decimal).
import type { Dec } from "./decimal.ts";

function milhares(inteiro: string): string {
  return inteiro.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/** 1234.5 -> "1.234,50" */
export function numeroBR(x: Dec, casas = 2): string {
  const t = x.texto(casas);
  const neg = t.startsWith("-");
  const [i, f] = (neg ? t.slice(1) : t).split(".");
  return (neg ? "-" : "") + milhares(i) + (f ? "," + f : "");
}

export function brl(x: Dec): string {
  return "R$ " + numeroBR(x, 2);
}

/** 0.0784 -> "7,84%" (até `casas` casas, sem zeros sobrando) */
export function pct(x: Dec, casas = 4): string {
  const t = x.vezes(100).texto(casas);
  const limpo = t.includes(".") ? t.replace(/0+$/, "").replace(/\.$/, "") : t;
  return limpo.replace(".", ",") + "%";
}
