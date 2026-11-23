// Entrada e saída de números no formato brasileiro (R$ 1.234,56 e 12,5%). Tudo em texto decimal exato, sem float.

/** "R$ 1.234,56" | "1234,5" | "1.234" | "1234.56" -> "1234.56" (ou null se não for número). */
export function lerNumeroBR(texto: string | null | undefined): string | null {
  let t = String(texto ?? "").replace(/R\$|%|\s/g, "");
  if (!t) return null;
  if (!/^-?[\d.,]+$/.test(t)) return null;
  const neg = t.startsWith("-");
  if (neg) t = t.slice(1);
  if (t.includes(",")) {
    // vírgula = decimal; pontos = milhar
    const partes = t.split(",");
    if (partes.length > 2) return null;
    const inteiro = partes[0].replace(/\./g, "");
    if (!/^\d*$/.test(inteiro) || !/^\d*$/.test(partes[1])) return null;
    t = `${inteiro || "0"}.${partes[1] || "0"}`;
  } else if (/^\d{1,3}(\.\d{3})+$/.test(t)) {
    t = t.replace(/\./g, ""); // "1.234" e "1.234.567" são milhares no Brasil
  } else if ((t.match(/\./g) || []).length > 1) {
    return null;
  }
  if (!/^\d+(\.\d+)?$/.test(t)) return null;
  return (neg ? "-" : "") + t.replace(/^0+(?=\d)/, "");
}

/** "12,5" ou "12,5%" -> fração decimal em texto ("0.125"). */
export function lerPercentualBR(texto: string | null | undefined): string | null {
  const n = lerNumeroBR(texto);
  if (n === null) return null;
  return dividirPor100(n);
}

function dividirPor100(n: string): string {
  const neg = n.startsWith("-");
  const [i, f = ""] = (neg ? n.slice(1) : n).split(".");
  const inteiro = i.padStart(3, "0");
  const novo = `${inteiro.slice(0, -2)}.${inteiro.slice(-2)}${f}`.replace(/^0+(?=\d)/, "");
  return (neg ? "-" : "") + novo.replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "");
}

/** Texto decimal INTERNO (ponto é sempre decimal): "1234.5", "0.125". Não confundir com o que a pessoa digita. */
function decimalInterno(valor: string | null | undefined): string | null {
  const t = String(valor ?? "").trim();
  return /^-?\d+(\.\d+)?$/.test(t) ? t : null;
}

function milhares(inteiro: string) {
  return inteiro.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/** "1234.5" -> "1.234,50" */
export function numeroParaBR(valor: string | null | undefined, casas = 2): string {
  const n = decimalInterno(valor);
  if (n === null) return "";
  const neg = n.startsWith("-");
  const [i, f = ""] = (neg ? n.slice(1) : n).split(".");
  const frac = (f + "0".repeat(casas)).slice(0, casas);
  return (neg ? "-" : "") + milhares(i) + (casas ? "," + frac : "");
}

/** Texto do campo de dinheiro ao sair do campo: "1234,5" -> "1.234,50". Vazio ou inválido volta como veio. */
export function formatarCampoDinheiro(texto: string): string {
  const n = lerNumeroBR(texto);
  return n === null ? texto : numeroParaBR(n, 2);
}

/** Fração "0.125" -> "12,5" (campo de percentual: multiplica por 100 movendo a vírgula). */
export function fracaoParaCampoPercentual(fracao: string): string {
  const n = decimalInterno(fracao);
  if (n === null) return "";
  const neg = n.startsWith("-");
  const [i, f = ""] = (neg ? n.slice(1) : n).split(".");
  const fp = (f + "00").slice(0, f.length > 2 ? f.length : 2);
  const inteiro = (i + fp.slice(0, 2)).replace(/^0+(?=\d)/, "");
  const dec = fp.slice(2).replace(/0+$/, "");
  return (neg ? "-" : "") + milhares(inteiro) + (dec ? "," + dec : "");
}

/** Só aceita o que serve num campo numérico brasileiro enquanto a pessoa digita. */
export function limparDigitacao(texto: string): string {
  return texto.replace(/[^\d.,R$\s%-]/g, "");
}
