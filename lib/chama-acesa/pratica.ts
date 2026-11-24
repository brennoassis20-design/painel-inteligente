// Prática extra (como a lição do Duolingo): 5 perguntas sorteadas do banco lib/chama-acesa/versiculos.json.
// Lógica pura: não completa o dia nem mexe na chama.
export interface Versiculo {
  id: string;
  referencia: string;
  texto: string;
  lacuna: string;
  distratores: string[];
  tema?: string;
}

export interface Pergunta {
  tipo: "lacuna" | "referencia";
  id: string;
  enunciado: string;
  /** Versículo (com a lacuna "_____" no tipo lacuna). */
  trecho: string;
  opcoes: string[];
  correta: number;
  referencia: string;
  texto: string;
}

const texto = (v: unknown) => (typeof v === "string" ? v.trim() : "");

/** Aceita o JSON cru e devolve só itens válidos (a palavra da lacuna precisa aparecer no texto). */
export function normalizarVersiculos(cru: unknown): Versiculo[] {
  if (!Array.isArray(cru)) return [];
  const out: Versiculo[] = [];
  for (const i of cru as Record<string, unknown>[]) {
    const v: Versiculo = {
      id: texto(i?.id),
      referencia: texto(i?.referencia),
      texto: texto(i?.texto),
      lacuna: texto(i?.lacuna),
      distratores: Array.isArray(i?.distratores) ? (i.distratores as unknown[]).map(texto).filter(Boolean) : [],
      tema: texto(i?.tema) || undefined,
    };
    if (v.id && v.referencia && v.texto && v.lacuna && v.texto.toLowerCase().includes(v.lacuna.toLowerCase()) && !out.some((o) => o.id === v.id)) out.push(v);
  }
  return out;
}

function embaralhar<T>(lista: T[], rnd: () => number): T[] {
  const a = [...lista];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function esconder(textoCheio: string, lacuna: string): string {
  const i = textoCheio.toLowerCase().indexOf(lacuna.toLowerCase());
  return i < 0 ? textoCheio : `${textoCheio.slice(0, i)}_____${textoCheio.slice(i + lacuna.length)}`;
}

/** Monta a sessão: os versículos menos vistos primeiro, sem repetir o mesmo na sessão. */
export function montarSessao(banco: Versiculo[], vistos: Record<string, number>, rnd: () => number = Math.random, n = 5): Pergunta[] {
  const ordem = banco
    .map((v) => ({ v, nota: (vistos[v.id] ?? 0) + rnd() * 0.99 }))
    .sort((a, b) => a.nota - b.nota)
    .slice(0, n)
    .map((x) => x.v);
  return embaralhar(ordem, rnd).map((v) => {
    const outras = [...new Set(banco.filter((o) => o.id !== v.id && o.referencia !== v.referencia).map((o) => o.referencia))];
    const comReferencia = outras.length >= 1 && rnd() < 0.5;
    if (comReferencia) {
      const opcoes = embaralhar([v.referencia, ...embaralhar(outras, rnd).slice(0, 3)], rnd);
      return { tipo: "referencia" as const, id: v.id, enunciado: "Qual é a referência deste versículo?", trecho: v.texto, opcoes, correta: opcoes.indexOf(v.referencia), referencia: v.referencia, texto: v.texto };
    }
    const dist = [...new Set(v.distratores.filter((d) => d.toLowerCase() !== v.lacuna.toLowerCase()))].slice(0, 3);
    const opcoes = embaralhar([v.lacuna, ...dist], rnd);
    return { tipo: "lacuna" as const, id: v.id, enunciado: "Complete a palavra que falta", trecho: esconder(v.texto, v.lacuna), opcoes, correta: opcoes.indexOf(v.lacuna), referencia: v.referencia, texto: v.texto };
  });
}
