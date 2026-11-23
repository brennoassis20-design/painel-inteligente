// Aritmética racional exata (BigInt). Sem float para dinheiro.
// Equivale ao Fraction do gabarito (calcula.py): somar, subtrair, multiplicar e dividir não perdem nada;
// só arredondamos quando pedimos (arredondar), sempre "meio centavo para cima" (ROUND_HALF_UP, longe do zero).

const B0 = BigInt(0);
const B1 = BigInt(1);
const B2 = BigInt(2);
const B10 = BigInt(10);

export type Entrada = string | number | bigint | Dec;

function mdc(a: bigint, b: bigint): bigint {
  a = a < B0 ? -a : a;
  b = b < B0 ? -b : b;
  while (b !== B0) {
    [a, b] = [b, a % b];
  }
  return a;
}

const POT10: bigint[] = [];
function pot10(n: number): bigint {
  if (!POT10[n]) {
    let r = B1;
    for (let i = 0; i < n; i++) r *= B10;
    POT10[n] = r;
  }
  return POT10[n];
}

export class Dec {
  readonly n: bigint;
  readonly d: bigint;

  private constructor(n: bigint, d: bigint) {
    if (d === B0) throw new Error("Divisão por zero.");
    if (d < B0) {
      n = -n;
      d = -d;
    }
    const g = mdc(n, d);
    if (g > B1) {
      n /= g;
      d /= g;
    }
    this.n = n;
    this.d = d;
  }

  static de(x: Entrada): Dec {
    if (x instanceof Dec) return x;
    if (typeof x === "bigint") return new Dec(x, B1);
    if (typeof x === "number") {
      if (!Number.isFinite(x)) throw new Error("Número inválido.");
      x = String(x);
    }
    const s = x.trim().replace(",", ".");
    const m = /^([+-]?)(\d+)(?:\.(\d+))?(?:[eE]([+-]?\d+))?$/.exec(s);
    if (!m) throw new Error(`Número decimal inválido: "${x}"`);
    const frac = m[3] ?? "";
    let n = BigInt(m[2] + frac);
    let d = pot10(frac.length);
    const exp = m[4] ? parseInt(m[4], 10) : 0;
    if (exp > 0) n *= pot10(exp);
    else if (exp < 0) d *= pot10(-exp);
    if (m[1] === "-") n = -n;
    return new Dec(n, d);
  }

  static readonly ZERO = new Dec(B0, B1);
  static readonly UM = new Dec(B1, B1);

  mais(o: Entrada): Dec {
    const b = Dec.de(o);
    return new Dec(this.n * b.d + b.n * this.d, this.d * b.d);
  }
  menos(o: Entrada): Dec {
    const b = Dec.de(o);
    return new Dec(this.n * b.d - b.n * this.d, this.d * b.d);
  }
  vezes(o: Entrada): Dec {
    const b = Dec.de(o);
    return new Dec(this.n * b.n, this.d * b.d);
  }
  dividido(o: Entrada): Dec {
    const b = Dec.de(o);
    if (b.n === B0) throw new Error("Divisão por zero.");
    return new Dec(this.n * b.d, this.d * b.n);
  }
  neg(): Dec {
    return new Dec(-this.n, this.d);
  }
  abs(): Dec {
    return this.n < B0 ? this.neg() : this;
  }
  cmp(o: Entrada): -1 | 0 | 1 {
    const b = Dec.de(o);
    const l = this.n * b.d;
    const r = b.n * this.d;
    return l < r ? -1 : l > r ? 1 : 0;
  }
  igual(o: Entrada): boolean {
    return this.cmp(o) === 0;
  }
  menor(o: Entrada): boolean {
    return this.cmp(o) < 0;
  }
  menorOuIgual(o: Entrada): boolean {
    return this.cmp(o) <= 0;
  }
  maior(o: Entrada): boolean {
    return this.cmp(o) > 0;
  }
  maiorOuIgual(o: Entrada): boolean {
    return this.cmp(o) >= 0;
  }
  ehZero(): boolean {
    return this.n === B0;
  }
  sinal(): -1 | 0 | 1 {
    return this.n < B0 ? -1 : this.n > B0 ? 1 : 0;
  }
  max(o: Entrada): Dec {
    const b = Dec.de(o);
    return this.cmp(b) >= 0 ? this : b;
  }
  min(o: Entrada): Dec {
    const b = Dec.de(o);
    return this.cmp(b) <= 0 ? this : b;
  }

  /** Arredonda para `casas` casas decimais; meio para cima (longe do zero). Padrão: centavos. */
  arredondar(casas = 2): Dec {
    const esc = pot10(casas);
    const a = this.n < B0 ? -this.n : this.n;
    const q = (a * esc * B2 + this.d) / (B2 * this.d); // floor(a*esc/d + 1/2)
    return new Dec(this.n < B0 ? -q : q, esc);
  }

  /** Texto decimal com `casas` casas (arredonda meio para cima). Ex.: "3930.00". */
  texto(casas = 2): string {
    const r = this.arredondar(casas);
    const esc = pot10(casas);
    const neg = r.n < B0;
    const a = neg ? -r.n : r.n;
    // r.d divide esc; r.n/r.d = (r.n * esc/r.d)/esc
    const inteiroEscalado = (a * esc) / r.d;
    const int = inteiroEscalado / esc;
    const fr = inteiroEscalado % esc;
    const frs = casas > 0 ? "." + fr.toString().padStart(casas, "0") : "";
    return (neg && inteiroEscalado !== B0 ? "-" : "") + int.toString() + frs;
  }

  /** Só para exibição/comparação. Nunca use para dinheiro. */
  paraNumero(): number {
    return Number(this.texto(12));
  }
}

export const D = (x: Entrada): Dec => Dec.de(x);
