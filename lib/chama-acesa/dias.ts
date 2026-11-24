// Formato do conteúdo dos 21 dias (arquivo lib/chama-acesa/dias.json, escrito pelo Brenno).
export interface Dia {
  dia: number;
  titulo: string;
  referencia: string;
  versiculo: string;
  reflexao: string;
  oracao: string;
  missao: string;
  jejum: string | null;
  medalha: string | null;
}

const texto = (v: unknown) => (typeof v === "string" ? v : "");

/** Aceita o JSON cru e devolve só dias válidos, ordenados e sem repetir. */
export function normalizarDias(cru: unknown): Dia[] {
  if (!Array.isArray(cru)) return [];
  const mapa = new Map<number, Dia>();
  for (const item of cru as Record<string, unknown>[]) {
    const dia = Number(item?.dia);
    if (!Number.isInteger(dia) || dia < 1 || dia > 21) continue;
    mapa.set(dia, {
      dia,
      titulo: texto(item.titulo),
      referencia: texto(item.referencia),
      versiculo: texto(item.versiculo),
      reflexao: texto(item.reflexao),
      oracao: texto(item.oracao),
      missao: texto(item.missao),
      jejum: texto(item.jejum).trim() ? texto(item.jejum) : null,
      medalha: texto(item.medalha).trim() ? texto(item.medalha) : null,
    });
  }
  return [...mapa.values()].sort((a, b) => a.dia - b.dia);
}
