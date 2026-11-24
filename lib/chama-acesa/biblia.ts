// Bíblia Livre (BLIVRE) dentro do app. Texto em public/chama-acesa/biblia/<sigla>.json (CC BY 4.0).
export interface LivroIndice {
  sigla: string;
  nome: string;
  capitulos: number;
  testamento: "at" | "nt";
}
export interface LivroTexto {
  livro: string;
  capitulos: string[][];
}

export const CREDITO_BIBLIA = "Bíblia Livre (BLIVRE) · Diego Santos, Mario Sérgio e Marco Teles · Licença CC BY 4.0";
export const LINK_LICENCA_BIBLIA = "https://ebible.org/porbr2018/copyright.htm";
export const CHAVE_BIBLIA_ULTIMO = "chama-biblia-ultimo";
export const CHAVE_BIBLIA_FONTE = "chama-biblia-fonte";
export const FONTES_BIBLIA = [16, 18, 20, 22, 25, 28] as const;
export const FONTE_PADRAO = 20;

export const semAcento = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

/** Busca simples por nome (sem acento, sem maiúsculas, "1 jo" acha "1 João"). */
export function filtrarLivros(livros: LivroIndice[], busca: string): LivroIndice[] {
  const q = semAcento(busca).replace(/\s+/g, " ");
  if (!q) return livros;
  return livros.filter((l) => semAcento(l.nome).includes(q) || l.sigla.includes(q));
}

export function ajustarFonte(atual: number, passo: 1 | -1): number {
  const i = FONTES_BIBLIA.findIndex((f) => f === atual);
  const base = i < 0 ? FONTES_BIBLIA.indexOf(FONTE_PADRAO) : i;
  return FONTES_BIBLIA[Math.min(FONTES_BIBLIA.length - 1, Math.max(0, base + passo))];
}

export interface Posicao {
  sigla: string;
  cap: number;
}

/** Capítulo anterior/seguinte, atravessando livros. null no começo/fim da Bíblia. */
export function vizinho(livros: LivroIndice[], p: Posicao, dir: 1 | -1): Posicao | null {
  const i = livros.findIndex((l) => l.sigla === p.sigla);
  if (i < 0) return null;
  const novo = p.cap + dir;
  if (novo >= 1 && novo <= livros[i].capitulos) return { sigla: p.sigla, cap: novo };
  const j = i + dir;
  if (j < 0 || j >= livros.length) return null;
  return { sigla: livros[j].sigla, cap: dir === 1 ? 1 : livros[j].capitulos };
}

export function lerUltimo(livros: LivroIndice[]): Posicao | null {
  try {
    const p = JSON.parse(window.localStorage.getItem(CHAVE_BIBLIA_ULTIMO) || "null") as Posicao | null;
    const l = livros.find((x) => x.sigla === p?.sigla);
    return p && l && Number.isInteger(p.cap) && p.cap >= 1 && p.cap <= l.capitulos ? p : null;
  } catch {
    return null;
  }
}
export function salvarUltimo(p: Posicao): void {
  try {
    window.localStorage.setItem(CHAVE_BIBLIA_ULTIMO, JSON.stringify(p));
  } catch {
    /* ok */
  }
}
