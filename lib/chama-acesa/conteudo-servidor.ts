// Só no servidor: lê dias.json (do Brenno); se não existir, usa dias.exemplo.json.
import { readFileSync } from "node:fs";
import path from "node:path";
import { normalizarDias, type Dia } from "./dias";

const PASTA = path.join(process.cwd(), "lib", "chama-acesa");

function ler(nome: string): Dia[] | null {
  try {
    const dias = normalizarDias(JSON.parse(readFileSync(path.join(PASTA, nome), "utf8")));
    return dias.length ? dias : null;
  } catch {
    return null;
  }
}

export function carregarDias(): { dias: Dia[]; exemplo: boolean } {
  const real = ler("dias.json");
  if (real) return { dias: real, exemplo: false };
  return { dias: ler("dias.exemplo.json") ?? [], exemplo: true };
}
