#!/usr/bin/env node
// Gera lib/chama-acesa/biblia-planos-dados.ts (planos de leitura da aba Bíblia do Chama Acesa).
// Uso: node scripts/gerar-planos-biblia.mjs   (lê public/chama-acesa/biblia/*.json; confere tudo e só então escreve)
//
// Regras: planos usam SEMPRE capítulos inteiros; cada dia é uma lista de trechos [sigla, capítulo inicial, capítulo final].
// Nos planos de 365 e 90 dias os capítulos são repartidos em dias seguidos com carga parecida (peso = nº de versículos),
// então Salmo 119 fica sozinho e os capítulos curtos se juntam. Nenhum capítulo fica de fora nem repetido (a conferência abaixo
// aborta se isso acontecer).
//
// ORDEM CRONOLÓGICA (critério e fonte): não existe uma única ordem histórica consensual. Esta segue o critério usado nos planos
// "cronológicos" tradicionais (a mesma lógica da Bíblia Cronológica de uso comum, p. ex. "One Year Chronological Bible" e os planos
// do YouVersion/Blue Letter Bible), sempre em capítulos inteiros e de forma APROXIMADA:
//  - Gênesis 1–11, depois Jó (época dos patriarcas), depois Gênesis 12–50; Êxodo a Deuteronômio; Salmo 90 (Moisés) em Números;
//  - Josué, Juízes, Rute; Samuel intercalado com os Salmos de Davi que têm título histórico (59, 34, 56, 52, 57, 142, 54, 7, 51, 32, 3...);
//  - Crônicas junto de Samuel e Reis (mesmos fatos); Salomão: Reis/Crônicas, Cantares, Salmos 45, 72, 127, Provérbios, Eclesiastes;
//  - Reino dividido: profetas junto do reinado em que serviram (Obadias, Joel, Jonas, Amós, Oseias, Isaías, Miqueias, Naum, Sofonias,
//    Habacuque, Jeremias), Salmos de Asafe/Coré e de peregrinação (120–134) nas reformas de Josafá, Ezequias e Josias;
//  - Exílio: Jeremias, Lamentações, Ezequiel, Daniel; retorno: Esdras 1–6, Ageu, Zacarias, Ester, Esdras 7–10, Neemias, Malaquias;
//  - Evangelhos harmonizados por capítulos (Lucas 1–2 e Mateus 1–2 juntos, ministério na Galileia, viagem a Jerusalém, Paixão);
//  - Atos com as cartas de Paulo nos pontos em que foram escritas (Tiago antes de Gálatas; Tessalonicenses em Atos 18; 1 e 2 Coríntios
//    em Atos 19–20; Romanos em Atos 20; cartas da prisão após Atos 28; Pastorais; Hebreus, Pedro, Judas, João e Apocalipse no fim).
// Datas de livros como Jó, Joel, Jonas e Tiago são debatidas; por isso o plano é "aproximado" e isso aparece na descrição para o leitor.
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const PASTA = path.join(RAIZ, "public", "chama-acesa", "biblia");
const indice = JSON.parse(readFileSync(path.join(PASTA, "indice.json"), "utf8"));
const versPorCap = {}; // sigla -> [nº de versículos por capítulo]
for (const l of indice) versPorCap[l.sigla] = JSON.parse(readFileSync(path.join(PASTA, `${l.sigla}.json`), "utf8")).capitulos.map((c) => c.length);

const TOTAL = indice.reduce((s, l) => s + l.capitulos, 0);
if (TOTAL !== 1189) throw new Error(`A Bíblia deveria ter 1189 capítulos e tem ${TOTAL}.`);

// "gen 1-11" ou "psa 59" ou "psa 8,19,23" -> lista de [sigla, cap]
function expandir(spec) {
  const [sigla, resto] = [spec.slice(0, 3), spec.slice(4)];
  const out = [];
  for (const parte of resto.split(",")) {
    const [a, b] = parte.split("-").map(Number);
    for (let c = a; c <= (b ?? a); c++) out.push([sigla, c]);
  }
  return out;
}
const seq = (specs) => specs.flatMap(expandir);

function conferir(nome, caps, exato = true) {
  const visto = new Map();
  for (const [s, c] of caps) {
    const k = `${s}:${c}`;
    if (!versPorCap[s] || c < 1 || c > versPorCap[s].length) throw new Error(`${nome}: capítulo inexistente ${k}`);
    visto.set(k, (visto.get(k) ?? 0) + 1);
  }
  const repetidos = [...visto].filter(([, n]) => n > 1).map(([k]) => k);
  const faltando = [];
  for (const l of indice) for (let c = 1; c <= l.capitulos; c++) if (!visto.has(`${l.sigla}:${c}`)) faltando.push(`${l.sigla}:${c}`);
  if (exato && (repetidos.length || faltando.length)) throw new Error(`${nome}: repetidos=[${repetidos}] faltando=[${faltando.length > 40 ? faltando.length + " capítulos" : faltando}]`);
  return { repetidos, faltando };
}

// Divide a lista em n grupos seguidos com peso (versículos) o mais parecido possível: programação dinâmica que minimiza a soma dos
// quadrados do desvio de cada dia em relação à média. Todo grupo tem pelo menos 1 capítulo (e no máximo 40, para não explodir o custo).
function dividir(caps, n) {
  const pesos = caps.map(([s, c]) => versPorCap[s][c - 1]);
  const N = caps.length;
  const soma = [0];
  for (const p of pesos) soma.push(soma[soma.length - 1] + p);
  const media = soma[N] / n;
  const INF = Infinity;
  // custo[g][i] = melhor custo dividindo os i primeiros capítulos em g grupos
  const custo = Array.from({ length: n + 1 }, () => new Float64Array(N + 1).fill(INF));
  const veio = Array.from({ length: n + 1 }, () => new Int32Array(N + 1).fill(-1));
  custo[0][0] = 0;
  for (let g = 1; g <= n; g++) {
    for (let i = g; i <= N - (n - g); i++) {
      for (let j = i - 1; j >= Math.max(g - 1, i - 40); j--) {
        if (custo[g - 1][j] === INF) continue;
        const c = custo[g - 1][j] + (soma[i] - soma[j] - media) ** 2;
        if (c < custo[g][i]) {
          custo[g][i] = c;
          veio[g][i] = j;
        }
      }
    }
  }
  const grupos = [];
  let i = N;
  for (let g = n; g >= 1; g--) {
    const j = veio[g][i];
    grupos.unshift(caps.slice(j, i));
    i = j;
  }
  return grupos;
}

// [[sigla, cap], ...] -> [[sigla, ini, fim], ...] juntando capítulos seguidos do mesmo livro.
function trechos(caps) {
  const out = [];
  for (const [s, c] of caps) {
    const u = out[out.length - 1];
    if (u && u[0] === s && u[2] === c - 1) u[2] = c;
    else out.push([s, c, c]);
  }
  return out;
}

const canonica = indice.flatMap((l) => Array.from({ length: l.capitulos }, (_, i) => [l.sigla, i + 1]));

// ------------------------------------------------------------------ cronológica (ver critério no topo)
const CRONO = [
  "gen 1-11", "job 1-42", "gen 12-50", "exo 1-40", "lev 1-27", "num 1-36", "psa 90", "deu 1-34",
  "jos 1-24", "jdg 1-21", "rut 1-4",
  "1sa 1-17", "psa 8,19,23,29", "1sa 18-19", "psa 59", "1sa 20-21", "psa 34,56", "1sa 22", "psa 52,57,142", "1sa 23", "psa 54",
  "1sa 24-26", "psa 7", "1sa 27-31", "1ch 1-10",
  "2sa 1-4", "2sa 5", "1ch 11-12", "2sa 6", "1ch 13-16", "psa 15,24,68,96,101,105,106",
  "2sa 7", "1ch 17", "2sa 8-10", "1ch 18-19", "psa 20,21,60", "2sa 11-12", "psa 32,51",
  "2sa 13-18", "psa 3,4,55,61,62,63", "2sa 19-24", "1ch 20-22", "psa 18,30", "1ch 23-29",
  "psa 1,2,5,6,9,10,11,12,13,14,16,17,22,25,26,27,28,31,33,35,36,37,38,39,40,41,53,58,64,65,69,70,86,103,108,109,110,138,139,140,141,143,144,145",
  "1ki 1-4", "2ch 1", "1ki 5-8", "2ch 2-7", "psa 72,136", "1ki 9-10", "2ch 8-9", "sol 1-8", "psa 45", "pro 1-31", "1ki 11", "ecc 1-12",
  "1ki 12-16", "2ch 10-16", "1ki 17-22", "2ch 17-20", "psa 42,43,44,47,49,50,83",
  "oba 1", "2ki 1-8", "2ch 21", "joe 1-3", "2ki 9-11", "2ch 22-24", "2ki 12-13", "jon 1-4", "2ki 14", "2ch 25", "amo 1-9",
  "2ki 15", "2ch 26-27", "hos 1-14", "isa 1-6", "mic 1-7", "2ki 16", "2ch 28", "isa 7-12", "2ki 17", "isa 13-23",
  "2ki 18", "2ch 29-31", "psa 46,48,76,120-134", "isa 24-35", "2ki 19-20", "isa 36-39", "isa 40-66", "2ch 32",
  "2ki 21", "2ch 33", "2ki 22-23", "2ch 34-35", "psa 66,67,71,73,75,77,78,80,81,82,84,85,87,88,89",
  "nah 1-3", "zep 1-3", "jer 1-20", "hab 1-3", "jer 21-25", "dan 1-2", "2ki 24", "2ch 36", "jer 26-36", "eze 1-24", "jer 37-39", "2ki 25",
  "lam 1-5", "psa 74,79,137", "jer 40-52", "eze 25-48", "dan 3-6", "dan 7-12",
  "ezr 1-6", "hag 1-2", "zec 1-14", "psa 91,92,93,94,95,97,98,99,100,102,104,107", "est 1-10", "ezr 7-10", "neh 1-13",
  "psa 111-119,135,146-150", "mal 1-4",
  // Novo Testamento
  "joh 1", "luk 1", "mat 1", "luk 2", "mat 2-4", "mar 1", "luk 3-4", "joh 2-4", "mat 8-9", "mar 2-3", "luk 5", "joh 5", "mat 12", "luk 6",
  "mat 5-7", "luk 7", "mat 11", "luk 8", "mat 13", "mar 4-5", "mat 10", "mat 14", "mar 6", "luk 9", "joh 6", "mat 15", "mar 7-8", "mat 16",
  "mar 9", "mat 17-18", "joh 7-10", "luk 10-16", "joh 11", "luk 17", "mat 19", "mar 10", "mat 20", "luk 18-19", "joh 12", "mat 21", "mar 11",
  "mat 22", "mar 12", "mat 23", "luk 20-21", "mat 24", "mar 13", "mat 25-26", "mar 14", "luk 22", "joh 13-17", "joh 18", "mat 27", "mar 15",
  "luk 23", "joh 19", "mat 28", "mar 16", "luk 24", "joh 20-21",
  "act 1-12", "jam 1-5", "act 13-14", "gal 1-6", "act 15-17", "1th 1-5", "act 18", "2th 1-3", "1co 1-16", "act 19", "2co 1-13", "act 20",
  "rom 1-16", "act 21-28", "col 1-4", "eph 1-6", "phm 1", "phi 1-4", "1ti 1-6", "tit 1-3", "1pe 1-5", "heb 1-13", "2ti 1-4", "2pe 1-3",
  "jud 1", "1jo 1-5", "2jo 1", "3jo 1", "rev 1-22",
];
const cronologica = seq(CRONO);
conferir("cronológica", cronologica);

// ------------------------------------------------------------------ Conhecer Jesus (30 dias)
// [título, trechos] — Evangelhos em capítulos inteiros, cada um uma vez; mais 3 textos-chave (Isaías 53, Salmo 22, 1 Coríntios 15).
const JESUS = [
  ["Quem é Jesus", "joh 1;isa 53"], ["O nascimento", "luk 1-2"], ["A família e os magos", "mat 1-2"], ["Batismo e tentação", "mat 3-4;mar 1"],
  ["O começo do ministério", "luk 3-4"], ["Nascer de novo", "joh 2-3"], ["As bem-aventuranças", "mat 5"], ["Oração e confiança", "mat 6-7"],
  ["Curas e autoridade", "mat 8-9"], ["Jesus e a multidão", "mar 2-3"], ["Parábolas e tempestade", "mar 4-5"], ["Perdão e fé", "luk 5-7"],
  ["Os doze enviados", "mat 10-12"], ["Parábolas do Reino", "mat 13"], ["Jesus ensina e cura", "luk 8-9"], ["Compaixão e tradição", "mar 6-7"],
  ["Água viva e pão da vida", "joh 4-6"], ["Quem é o Filho do Homem", "mat 14-16"], ["Seguir Jesus", "mar 8-9"], ["Humildade e perdão", "mat 17-19"],
  ["O bom samaritano e a oração", "luk 10-12"], ["Luz do mundo", "joh 7-9"], ["Parábolas da graça", "mat 20-22;mar 10-11"], ["Ovelha, moeda e filho perdido", "luk 13-17"],
  ["O bom pastor e Lázaro", "joh 10-13;mar 12"], ["Vigiar e servir", "mat 23-25;mar 13;joh 14"], ["Permanecer em Jesus", "joh 15-17;luk 18-19"],
  ["A última ceia e a cruz", "mat 26-27;mar 14-15;luk 20;psa 22"], ["Ele morreu por nós", "luk 21-23;joh 18-19"], ["Ressuscitou!", "mat 28;mar 16;luk 24;joh 20-21;1co 15"],
];
const jesus = JESUS.map(([, s]) => seq(s.split(";")));
const jesusTodos = jesus.flat();
const evangelhos = jesusTodos.filter(([s]) => ["mat", "mar", "luk", "joh"].includes(s));
const unicos = new Set(evangelhos.map(([s, c]) => `${s}:${c}`));
if (evangelhos.length !== 89 || unicos.size !== 89) throw new Error(`Conhecer Jesus: Evangelhos devem ter 89 capítulos únicos (tem ${evangelhos.length}/${unicos.size}).`);

// ------------------------------------------------------------------ demais planos
const completa = dividir(canonica, 365);
const crono365 = dividir(cronologica, 365);
const nt = canonica.filter(([s]) => indice.find((l) => l.sigla === s).testamento === "nt");
const nt90 = dividir(nt, 90);
const salmos = canonica.filter(([s]) => s === "psa");
const salmosGrupos = dividir(salmos, 31);
const salmosProv = salmosGrupos.map((g, i) => [...g, ["pro", i + 1]]);

for (const [nome, grupos, n] of [["completa", completa, 365], ["cronológica 365", crono365, 365], ["NT 90", nt90, 90], ["Salmos e Provérbios", salmosProv, 31]]) {
  if (grupos.length !== n || grupos.some((g) => g.length === 0)) throw new Error(`${nome}: esperado ${n} dias não vazios.`);
}
conferir("completa", completa.flat());
conferir("cronológica 365", crono365.flat());
if (nt90.flat().length !== 260) throw new Error("NT deve ter 260 capítulos.");
if (salmosProv.flat().length !== 181) throw new Error("Salmos e Provérbios deve ter 181 capítulos.");

const PLANOS = [
  { id: "completa-1-ano", nome: "Bíblia completa em 1 ano", descricao: "Do Gênesis ao Apocalipse na ordem da Bíblia, em 365 leituras de uns 10 minutos.", dias: completa },
  { id: "cronologica-1-ano", nome: "Bíblia cronológica em 1 ano", descricao: "Os mesmos 1189 capítulos, na ordem aproximada em que os fatos aconteceram (Jó entre os patriarcas, profetas junto dos reis, cartas de Paulo dentro de Atos). Ordem aproximada: alguns livros têm data debatida.", dias: crono365 },
  { id: "conhecer-jesus", nome: "Conhecer Jesus", descricao: "30 dias nos quatro Evangelhos, em blocos, com três textos-chave: Isaías 53, Salmo 22 e 1 Coríntios 15.", dias: jesus.map((d) => d), titulos: JESUS.map(([t]) => t) },
  { id: "novo-testamento-90", nome: "Novo Testamento em 90 dias", descricao: "Mateus a Apocalipse em 90 dias, de uns 3 capítulos por dia.", dias: nt90 },
  { id: "salmos-proverbios-31", nome: "Salmos e Provérbios em 31 dias", descricao: "Um capítulo de Provérbios e alguns Salmos por dia, o mês inteiro.", dias: salmosProv },
].map((p) => ({ ...p, dias: p.dias.map(trechos) }));

const livros = indice.map((l) => [l.sigla, l.nome, l.capitulos, l.testamento]);
const saida = `// GERADO por scripts/gerar-planos-biblia.mjs — não editar à mão (rode o script de novo).
// Cada dia = lista de trechos [sigla, capítulo inicial, capítulo final] (capítulos inteiros). Critério da ordem cronológica: ver o topo do script.
export type TrechoDados = [string, number, number];
export interface PlanoDados { id: string; nome: string; descricao: string; dias: TrechoDados[][]; titulos?: string[] }
export const LIVROS_BIBLIA: [string, string, number, "at" | "nt"][] = ${JSON.stringify(livros)};
export const PLANOS_DADOS: PlanoDados[] = ${JSON.stringify(PLANOS)};
`;
writeFileSync(path.join(RAIZ, "lib", "chama-acesa", "biblia-planos-dados.ts"), saida);
console.log("OK:", PLANOS.map((p) => `${p.id}=${p.dias.length} dias`).join(" · "));
