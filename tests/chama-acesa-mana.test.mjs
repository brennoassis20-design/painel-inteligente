// Maná do dia e contagem de versículos: node --test --experimental-strip-types tests/chama-acesa-mana.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { aplicarAcao, estadoVazio, somarDias } from "../lib/chama-acesa/regras.ts";
import { diasParaSabado, sortearMana, TALENTOS_NO_LUGAR_DA_BRASA } from "../lib/chama-acesa/mana.ts";
import { comparacaoVersos, contarVersosLidos, marcoAlcancado, versosDaReferencia } from "../lib/chama-acesa/versos-lidos.ts";

const D0 = "2026-12-01";
const AGORA = Date.UTC(2026, 11, 1, 15);
function completar(e, dia, hoje) {
  for (const check of ["leu", "orou", "missao"]) e = aplicarAcao(e, { tipo: "check", dia, check }, hoje, true, undefined, { agora: AGORA - 3_600_000 }).estado;
  return e;
}
const abrir = (e, hoje, sorteio, ctx = {}) => aplicarAcao(e, { tipo: "abrirMana" }, hoje, true, undefined, { agora: AGORA, sorteio, ...ctx });
const XP_ = [0.1, 0.5, 0, 0, 0, 0]; // cai em XP
const BRASA = [0.9, 0, 0, 0, 0, 0]; // cai em brasa (88–98)
const DOBRADO = [0.995, 0, 0.1, 0.5, 0.5, 0.5]; // dobrado: XP + talentos

test("maná: só depois de fazer o dia, e uma vez por dia", () => {
  assert.match(abrir(estadoVazio(), D0, XP_).erro, /depois que você faz o dia/);
  const e = completar(estadoVazio(), 1, D0);
  const r = abrir(e, D0, XP_);
  assert.equal(r.erro, undefined);
  assert.equal(r.mana[0].tipo, "xp");
  assert.ok(r.mana[0].n >= 10 && r.mana[0].n <= 20);
  assert.equal(r.estado.xp, e.xp + r.mana[0].n);
  assert.match(abrir(r.estado, D0, XP_).erro, /já recolheu/);
});

test("maná: brasa respeita o limite e vira talentos com as brasas cheias", () => {
  const e = { ...completar(estadoVazio(), 1, D0), brasas: 2 };
  const r = abrir(e, D0, BRASA);
  assert.deepEqual(r.mana[0], { tipo: "talentos", n: TALENTOS_NO_LUGAR_DA_BRASA, deBrasa: true });
  assert.equal(r.estado.brasas, 2);
  const vit = abrir(e, D0, BRASA, { maxBrasas: 3 });
  assert.equal(vit.mana[0].tipo, "brasa");
  assert.equal(vit.estado.brasas, 3);
});

test("maná: dobrado traz dois prêmios; vigília estende o XP em dobro", () => {
  assert.equal(sortearMana(DOBRADO, false).length, 2);
  const e = completar(estadoVazio(), 1, D0);
  const r = abrir(e, D0, [0.8, 0, 0, 0, 0, 0]); // 70–88 = vigília
  assert.equal(r.mana[0].tipo, "vigilia");
  assert.ok(r.estado.extras.vigiliaAte >= AGORA + 10 * 60_000);
});

test("maná: 7 dias seguidos = maná de sábado (valores maiores)", () => {
  let e = estadoVazio();
  let r;
  for (let d = 1; d <= 7; d += 1) {
    const hoje = somarDias(D0, d - 1);
    e = completar(e, d, hoje);
    r = abrir(e, hoje, XP_);
    e = r.estado;
    if (d < 7) assert.ok(r.mana[0].n <= 20);
  }
  assert.ok(r.mana[0].n >= 25, "sábado dá mais XP");
  assert.equal(e.extras.mana.seq, 7);
  // pulou um dia de maná: sequência recomeça
  assert.equal(diasParaSabado({ dia: D0, seq: 3 }, somarDias(D0, 2), somarDias(D0, 1)), 6);
});

test("versículos lidos: dias + desafio + capítulos, sem repetir", () => {
  assert.equal(versosDaReferencia("Lamentações 3:22-23"), 2);
  const n = contarVersosLidos({ refsDosDias: ["João 3:16", "Lamentações 3:22-23"], diasContinuos: 2, idsDesafio: ["a", "a", "b"], lidos: { joh: [3, 3] } });
  assert.equal(n, 1 + 2 + 2 + 2 + 36); // João 3 tem 36 versículos
  assert.equal(marcoAlcancado(260, 100), 250);
  assert.equal(marcoAlcancado(260, 250), null);
  assert.equal(comparacaoVersos(40), null);
  assert.equal(comparacaoVersos(320), "É como ler Efésios inteiro 2 vezes.");
});
