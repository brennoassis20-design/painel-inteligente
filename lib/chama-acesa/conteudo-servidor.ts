// Só no servidor: lê os JSON de conteúdo (escritos pelo Brenno). Se o arquivo real não existir, usa o .exemplo.json.
import { readFileSync } from "node:fs";
import path from "node:path";
import { normalizarDias, type Dia } from "./dias";
import { normalizarMarcos, type Meta } from "./marcos";
import { normalizarLigas, type ConfigLigas } from "./ligas";
import { normalizarTextos, type Texto } from "./lembretes";
import { normalizarVersiculos, type Versiculo } from "./pratica";

const PASTA = path.join(process.cwd(), "lib", "chama-acesa");

function lerJson(nome: string): unknown {
  try {
    return JSON.parse(readFileSync(path.join(PASTA, nome), "utf8"));
  } catch {
    return null;
  }
}

function com<T>(real: string, exemplo: string, normalizar: (x: unknown) => T, vazio: (v: T) => boolean): { dados: T; exemplo: boolean } {
  const r = normalizar(lerJson(real));
  if (!vazio(r)) return { dados: r, exemplo: false };
  return { dados: normalizar(lerJson(exemplo)), exemplo: true };
}

export function carregarDias(): { dias: Dia[]; exemplo: boolean } {
  const { dados, exemplo } = com("dias.json", "dias.exemplo.json", normalizarDias, (v) => !v.length);
  return { dias: dados, exemplo };
}

export function carregarVersiculos(): Versiculo[] {
  return com("versiculos.json", "versiculos.exemplo.json", normalizarVersiculos, (v) => !v.length).dados;
}

export function carregarLigas(): ConfigLigas {
  return com("ligas.json", "ligas.exemplo.json", normalizarLigas, (v) => !v.nomes.length).dados;
}

export function carregarTextos(): Texto[] {
  return com("lembretes-textos.json", "lembretes-textos.exemplo.json", normalizarTextos, (v) => !v.length).dados;
}

export function carregarMarcos(): Meta[] {
  return normalizarMarcos(lerJson("marcos.json"));
}

/** Banco de missões dos dias depois do 21 (missoes.json: lista de textos curtos). */
export function carregarMissoes(): string[] {
  const cru = lerJson("missoes.json");
  return Array.isArray(cru) ? cru.map((m) => (typeof m === "string" ? m.trim() : "")).filter(Boolean) : [];
}
