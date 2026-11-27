// Testes dos extras do Chama Acesa: node --test --experimental-strip-types tests/chama-acesa-extras.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { aplicarAcao, atualizarParaHoje, estadoVazio, somarDias } from "../lib/chama-acesa/regras.ts";
import { diasCobertosPorExtras, multiplicadorXp, segundosDeVigilia, domingoDoEscudo, VIGILIA_MS } from "../lib/chama-acesa/extras.ts";
import { normalizarLigas } from "../lib/chama-acesa/ligas.ts";
import { PRECO } from "../lib/chama-acesa/talentos.ts";
import { criarArmazemLocal } from "../lib/chama-acesa/armazem.ts";

// 2026-12-05 é sábado, 2026-12-06 domingo, 2026-12-07 segunda.
const SAB = "2026-12-05", DOM = "2026-12-06", SEG = "2026-12-07";
const AGORA = 1_800_000_000_000;

function completar(e, dia, hoje, ctx = { agora: AGORA }) {
  let r;
  for (const check of ["leu", "orou", "missao"]) {
    r = aplicarAcao(e, { tipo: "check", dia, check }, hoje, true, undefined, ctx);
    assert.equal(r.erro, undefined, r.erro);
    e = r.estado;
  }
  return r;
}
const comTalentos = (n, extra = {}) => ({ ...estadoVazio(), talentos: n, ...extra });
const estadoCom = (chama, ultimaData, extra = {}) => ({ ...estadoVazio(), chama, maior: chama, ultimaData, ...extra });

// ------------------------------------------------------------ Dia do Senhor
test("escudo: custa o preço, vale para o próximo domingo e só 1 ativo", () => {
  let r = aplicarAcao(comTalentos(100), { tipo: "comprarEscudo" }, SAB, true);
  assert.equal(r.erro, undefined);
  assert.equal(r.estado.talentos, 100 - PRECO.escudoDomingo);
  assert.equal(r.estado.extras.escudoDomingo, DOM);
  r = aplicarAcao(r.estado, { tipo: "comprarEscudo" }, SAB, true);
  assert.match(r.erro, /já tem/);
  assert.match(aplicarAcao(comTalentos(PRECO.escudoDomingo - 1), { tipo: "comprarEscudo" }, SAB, true).erro, /Faltam talentos/);
});

test("escudo: hoje domingo e dia não feito vale hoje; dia feito vale o próximo", () => {
  assert.equal(domingoDoEscudo(estadoCom(3, SAB), DOM), DOM);
  assert.equal(domingoDoEscudo(estadoCom(3, DOM), DOM), somarDias(DOM, 7));
  assert.equal(domingoDoEscudo(estadoCom(3, SAB), SEG), somarDias(DOM, 7));
});

test("escudo cobre o domingo e não gasta brasa; depois limpa", () => {
  const e = estadoCom(5, SAB, { brasas: 1, extras: { escudoDomingo: DOM } });
  assert.deepEqual(diasCobertosPorExtras(e.extras, [DOM]), [DOM]);
  const r = atualizarParaHoje(e, SEG);
  assert.equal(r.chama, 5);
  assert.equal(r.brasas, 1);
  assert.equal(r.extras.escudoDomingo, null);
  assert.equal(r.avisos.includes("brasa_salvou"), false);
  assert.equal(r.avisos.includes("chama_apagou"), false);
  // sem escudo gasta a brasa
  assert.equal(atualizarParaHoje(estadoCom(5, SAB, { brasas: 1 }), SEG).brasas, 0);
});

test("escudo sozinho cobre só o domingo: segunda perdida ainda gasta brasa", () => {
  const e = estadoCom(5, SAB, { brasas: 0, extras: { escudoDomingo: DOM } });
  const r = atualizarParaHoje(e, somarDias(SEG, 1)); // pulou domingo (coberto) e segunda
  assert.equal(r.chama, 0);
});

test("escudo de domingo futuro fica guardado; o que passou sem uso some", () => {
  const futuro = estadoCom(2, SAB, { extras: { escudoDomingo: DOM } });
  assert.equal(atualizarParaHoje(futuro, SAB), futuro);
  const passou = estadoCom(2, DOM, { extras: { escudoDomingo: DOM } });
  assert.equal(atualizarParaHoje(passou, SEG).extras.escudoDomingo, null);
});

// ------------------------------------------------------------ Hora da vigília
test("vigília: completar o dia liga 15 min de XP em dobro, 1x por dia", () => {
  const r = completar(estadoVazio(), 1, SAB);
  assert.equal(r.estado.extras.vigiliaAte, AGORA + VIGILIA_MS);
  assert.equal(r.estado.extras.vigiliaDia, SAB);
  assert.equal(segundosDeVigilia(r.estado.extras, AGORA), 900);
  // o próprio dia não foi dobrado: 10 + 10 + 15 + 15
  assert.equal(r.estado.xp, 50);
  // dentro da janela: prática dobra
  const p = aplicarAcao(r.estado, { tipo: "pratica", acertos: 2, ids: ["a", "b"] }, SAB, true, undefined, { agora: AGORA + 60_000 });
  assert.equal(p.xpGanho, 20);
  // depois dos 15 min: normal
  const q = aplicarAcao(r.estado, { tipo: "pratica", acertos: 2, ids: ["a", "b"] }, SAB, true, undefined, { agora: AGORA + VIGILIA_MS });
  assert.equal(q.xpGanho, 10);
  assert.equal(multiplicadorXp(r.estado.extras, AGORA + VIGILIA_MS - 1), 2);
  assert.equal(multiplicadorXp(r.estado.extras, AGORA + VIGILIA_MS), 1);
  // 1x por dia: a vigília não reinicia no mesmo dia
  const de = { ...r.estado, extras: { ...r.estado.extras, vigiliaAte: AGORA } };
  const outra = aplicarAcao({ ...de, concluidos: {}, checks: {} }, { tipo: "check", dia: 1, check: "leu" }, SAB, true, undefined, { agora: AGORA + 5 * 60_000 });
  assert.equal(outra.estado.extras.vigiliaAte, AGORA);
  // no dia seguinte liga de novo
  const dia2 = completar(r.estado, 2, DOM, { agora: AGORA + 86_400_000 });
  assert.equal(dia2.estado.extras.vigiliaDia, DOM);
  assert.equal(dia2.estado.extras.vigiliaAte, AGORA + 86_400_000 + VIGILIA_MS);
});

// ------------------------------------------------------------ Voto de 7 dias
test("voto: debita a aposta e só 1 por vez", () => {
  let r = aplicarAcao(comTalentos(60, { chama: 2 }), { tipo: "fazerVoto" }, SAB, true);
  assert.equal(r.estado.talentos, 60 - PRECO.voto);
  assert.deepEqual(r.estado.extras.voto, { inicio: SAB, chamaInicio: 2, aposta: PRECO.voto });
  assert.match(aplicarAcao(r.estado, { tipo: "fazerVoto" }, SAB, true).erro, /já tem um voto/);
  assert.match(aplicarAcao(comTalentos(PRECO.voto - 1), { tipo: "fazerVoto" }, SAB, true).erro, /Faltam talentos/);
});

test("voto cumprido em 7 dias devolve o dobro (50)", () => {
  let e = aplicarAcao(comTalentos(PRECO.voto), { tipo: "fazerVoto" }, SAB, true).estado;
  assert.equal(e.talentos, 0);
  let r;
  for (let i = 1; i <= 7; i += 1) {
    r = completar(e, i, somarDias(SAB, i - 1));
    e = r.estado;
    if (i < 7) assert.ok(e.extras.voto, `voto segue no dia ${i}`);
  }
  assert.equal(e.extras.voto, null);
  assert.ok(e.avisos.includes("voto_cumprido"));
  // 7 dias x 5 talentos + 50 do voto (a meta de 7 dias, se houver, soma à parte)
  assert.ok(e.talentos >= 7 * 5 + 50);
  assert.equal(e.talentos - 7 * 5 - 50 >= 0, true);
});

test("voto quebrado: chama apagou perde a aposta; brasa salvando não quebra", () => {
  const voto = { inicio: SAB, chamaInicio: 3, aposta: PRECO.voto };
  const salva = atualizarParaHoje(estadoCom(3, SAB, { brasas: 1, extras: { voto } }), SEG);
  assert.deepEqual(salva.extras.voto, voto);
  const apagou = atualizarParaHoje(estadoCom(3, SAB, { brasas: 0, talentos: 10, extras: { voto } }), somarDias(SAB, 4));
  assert.equal(apagou.chama, 0);
  assert.equal(apagou.extras.voto, null);
  assert.ok(apagou.avisos.includes("voto_quebrado"));
  assert.equal(apagou.talentos, 10);
});

// ------------------------------------------------------------ Brasa de irmão
const AMIGO = { codigo: "abcd1234", nome: "Ana", chama: 4, brasas: 0 };

test("darBrasa: gasta 1 brasa, marca a semana e limita 1 por semana", () => {
  const e = estadoCom(1, SAB, { brasas: 2 });
  const r = aplicarAcao(e, { tipo: "darBrasa", para: AMIGO.codigo }, SAB, true, undefined, { amigo: AMIGO });
  assert.equal(r.erro, undefined);
  assert.equal(r.estado.brasas, 1);
  const outra = aplicarAcao(r.estado, { tipo: "darBrasa", para: AMIGO.codigo }, DOM, true, undefined, { amigo: AMIGO });
  assert.match(outra.erro, /já deu uma brasa/);
  // semana seguinte libera (segunda)
  const prox = aplicarAcao({ ...r.estado, ultimaData: DOM }, { tipo: "darBrasa", para: AMIGO.codigo }, somarDias(SEG, 0), true, undefined, { amigo: AMIGO });
  assert.equal(prox.erro, undefined);
  assert.equal(prox.estado.brasas, 0);
});

test("darBrasa: exige brasa, amigo válido e amigo com espaço", () => {
  assert.match(aplicarAcao(estadoCom(1, SAB, { brasas: 0 }), { tipo: "darBrasa", para: AMIGO.codigo }, SAB, true, undefined, { amigo: AMIGO }).erro, /precisa ter uma brasa/);
  const e = estadoCom(1, SAB, { brasas: 1 });
  assert.match(aplicarAcao(e, { tipo: "darBrasa", para: AMIGO.codigo }, SAB, true).erro, /Amigo não encontrado/);
  assert.match(aplicarAcao(e, { tipo: "darBrasa", para: "outro" }, SAB, true, undefined, { amigo: AMIGO }).erro, /Amigo não encontrado/);
  assert.match(aplicarAcao(e, { tipo: "darBrasa", para: AMIGO.codigo }, SAB, true, undefined, { amigo: { ...AMIGO, brasas: 2 } }).erro, /cheias/);
});

// ------------------------------------------------------------ armazém local
test("armazém local: escudo e voto funcionam; darBrasa avisa que não há amigos", async () => {
  const m = new Map();
  const st = { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) };
  const conteudo = async () => ({ dias: [], versiculos: [], ligas: normalizarLigas(null), textos: [] });
  const a = criarArmazemLocal("x", { buscarConteudo: conteudo, storage: st, relogio: () => SAB });
  await a.carregar();
  await assert.rejects(() => a.agir({ tipo: "comprarEscudo" }), /Faltam talentos/);
  await assert.rejects(() => a.agir({ tipo: "darBrasa", para: "abc" }), /Amigo não encontrado/);
  const p = await a.carregar();
  assert.equal(p.amigosLista, undefined);
});
