// Testes do Chama Acesa (regras sem tela): node --test --experimental-strip-types tests/chama-acesa.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { aplicarAcao, atualizarParaHoje, dataSP, diaAtual, estadoVazio, podeAbrir, somarDias, statusDoDia, nivelChama } from "../lib/chama-acesa/regras.ts";
import { calcularAcesso } from "../lib/chama-acesa/acesso-regra.ts";
import { normalizarDias } from "../lib/chama-acesa/dias.ts";

const D0 = "2026-12-01";

// Faz os 3 checks do dia e devolve o estado final.
function completar(e, dia, hoje, pago = true) {
  let r;
  for (const check of ["leu", "orou", "missao"]) {
    r = aplicarAcao(e, { tipo: "check", dia, check }, hoje, pago);
    assert.equal(r.erro, undefined, r.erro);
    e = r.estado;
  }
  return r;
}

test("dias seguidos: a chama sobe um por dia e o dia só vale com os 3 checks", () => {
  let e = estadoVazio();
  let r = aplicarAcao(e, { tipo: "check", dia: 1, check: "leu" }, D0, false);
  assert.equal(r.completouDia, null);
  assert.equal(r.estado.chama, 0);
  r = aplicarAcao(r.estado, { tipo: "check", dia: 1, check: "orou" }, D0, false);
  r = aplicarAcao(r.estado, { tipo: "check", dia: 1, check: "missao" }, D0, false);
  assert.equal(r.completouDia, 1);
  assert.equal(r.estado.chama, 1);
  e = r.estado;
  e = completar(e, 2, somarDias(D0, 1), false).estado;
  assert.equal(e.chama, 2);
  assert.equal(diaAtual(e), 3);
});

test("jejum é opcional e não conta para completar o dia", () => {
  const r = aplicarAcao(estadoVazio(), { tipo: "jejum", dia: 1, valor: true }, D0, false);
  assert.equal(r.estado.jejum[1], true);
  assert.equal(r.estado.concluidos[1], undefined);
  assert.equal(r.estado.chama, 0);
});

test("pular um dia sem brasa apaga a chama, mas a jornada continua do dia onde parou", () => {
  let e = completar(estadoVazio(), 1, D0).estado;
  e = completar(e, 2, somarDias(D0, 1)).estado;
  assert.equal(e.chama, 2);
  const depois = atualizarParaHoje(e, somarDias(D0, 3)); // pulou o dia 2/12... (D0+2)
  assert.equal(depois.chama, 0);
  assert.equal(depois.maior, 2);
  assert.deepEqual(depois.avisos, ["chama_apagou"]);
  assert.equal(diaAtual(depois), 3); // continua do dia 3
  assert.deepEqual(podeAbrir(depois, 3, somarDias(D0, 3), true), { ok: true });
  // idempotente: não repete o aviso
  assert.deepEqual(atualizarParaHoje(depois, somarDias(D0, 3)).avisos, ["chama_apagou"]);
  // recomeça a chama do 1
  assert.equal(completar(depois, 3, somarDias(D0, 3)).estado.chama, 1);
});

test("pular um dia com brasa guardada salva a chama e avisa", () => {
  let e = completar(estadoVazio(), 1, D0).estado;
  e = { ...e, brasas: 1 };
  const depois = atualizarParaHoje(e, somarDias(D0, 2)); // um dia pulado
  assert.equal(depois.chama, 1);
  assert.equal(depois.brasas, 0);
  assert.deepEqual(depois.avisos, ["brasa_salvou"]);
  const r = completar(depois, 2, somarDias(D0, 2));
  assert.equal(r.estado.chama, 2); // a chama continuou
  // a brasa só cobre o dia pulado: dois dias pulados com 1 brasa apagam
  const dois = atualizarParaHoje({ ...e, brasas: 1 }, somarDias(D0, 3));
  assert.equal(dois.chama, 0);
  assert.equal(dois.brasas, 1);
});

test("ganha 1 brasa no 7º dia de chama; limite de 2 guardadas", () => {
  let e = estadoVazio();
  let ganhou = [];
  for (let d = 1; d <= 14; d += 1) {
    const r = completar(e, d, somarDias(D0, d - 1));
    e = r.estado;
    if (r.ganhouBrasa) ganhou.push(d);
    if (d === 6) assert.equal(e.brasas, 0);
    if (d === 7) assert.equal(e.brasas, 1);
  }
  assert.deepEqual(ganhou, [7, 14]);
  assert.equal(e.brasas, 2);
  // já com 2: o 21º dia não passa de 2
  for (let d = 15; d <= 21; d += 1) e = completar(e, d, somarDias(D0, d - 1)).estado;
  assert.equal(e.brasas, 2);
});

test("não abre o dia N+1 no mesmo dia; abre no dia seguinte", () => {
  const e = completar(estadoVazio(), 1, D0).estado;
  assert.deepEqual(podeAbrir(e, 2, D0, true), { ok: false, motivo: "amanha" });
  assert.equal(statusDoDia(e, 2, D0, true), "amanha");
  const r = aplicarAcao(e, { tipo: "check", dia: 2, check: "leu" }, D0, true);
  assert.match(r.erro, /amanhã/);
  assert.deepEqual(podeAbrir(e, 2, somarDias(D0, 1), true), { ok: true });
  assert.deepEqual(podeAbrir(e, 3, somarDias(D0, 1), true), { ok: false, motivo: "anterior" });
});

test("dia 4 sem compra pede pagamento; com compra abre", () => {
  let e = estadoVazio();
  for (let d = 1; d <= 3; d += 1) e = completar(e, d, somarDias(D0, d - 1), false).estado;
  const amanha = somarDias(D0, 3);
  assert.deepEqual(podeAbrir(e, 4, amanha, false), { ok: false, motivo: "pagamento" });
  assert.equal(statusDoDia(e, 4, amanha, false), "pago");
  assert.match(aplicarAcao(e, { tipo: "check", dia: 4, check: "leu" }, amanha, false).erro, /compra/);
  assert.deepEqual(podeAbrir(e, 4, amanha, true), { ok: true });
  assert.equal(e.chama, 3);
});

test("virada de dia no fuso de São Paulo (UTC-3)", () => {
  assert.equal(dataSP(new Date("2026-12-01T02:59:00Z")), "2026-11-30"); // 23:59 em SP
  assert.equal(dataSP(new Date("2026-12-01T03:00:00Z")), "2026-12-01"); // meia-noite em SP
  assert.equal(dataSP(new Date("2026-12-01T14:00:00Z")), "2026-12-01");
  // 23:50 em SP conta como o mesmo dia; 00:10 em SP já é o seguinte
  const e = completar(estadoVazio(), 1, dataSP(new Date("2026-12-01T02:50:00Z"))).estado; // 30/11 23:50
  assert.equal(e.concluidos[1], "2026-11-30");
  assert.equal(podeAbrir(e, 2, dataSP(new Date("2026-12-01T02:55:00Z")), true).ok, false);
  assert.equal(podeAbrir(e, 2, dataSP(new Date("2026-12-01T03:10:00Z")), true).ok, true);
});

test("medalhas: 3, 7, 14, 21 dias de chama e jornada completa", () => {
  let e = estadoVazio();
  const vistas = {};
  for (let d = 1; d <= 21; d += 1) {
    const r = completar(e, d, somarDias(D0, d - 1));
    e = r.estado;
    for (const m of r.novasMedalhas) vistas[m] = d;
  }
  assert.deepEqual(vistas, { chama3: 3, chama7: 7, chama14: 14, chama21: 21, jornada: 21 });
  assert.equal(e.chama, 21);
  assert.equal(diaAtual(e), 22);
  assert.equal(nivelChama(0), 0);
  assert.equal(nivelChama(21), 4);
});

test("lembrete: horário válido e inválido", () => {
  assert.equal(aplicarAcao(estadoVazio(), { tipo: "lembrete", horario: "07:00" }, D0, false).estado.lembrete, "07:00");
  assert.ok(aplicarAcao(estadoVazio(), { tipo: "lembrete", horario: "25:00" }, D0, false).erro);
});

test("acesso: só na área, compra libera, liberação local não vale em produção", () => {
  const base = { areaSlug: "chama-acesa", produtos: [{ slug: "chama-21", owned: false }], admin: false };
  const env = { CHAMA_PRODUCT_SLUGS: "chama-21", CHAMA_CHECKOUT_URL: "https://pay.cakto.com.br/abc", CHAMA_365_URL: "" };
  assert.equal(calcularAcesso({ ...base, env }).pago, false);
  assert.equal(calcularAcesso({ ...base, env }).checkoutUrl, "https://pay.cakto.com.br/abc");
  assert.equal(calcularAcesso({ ...base, env }).oferta365Url, null);
  assert.equal(calcularAcesso({ ...base, produtos: [{ slug: "chama-21", owned: true }], env }).pago, true);
  assert.equal(calcularAcesso({ ...base, areaSlug: "reforma", env }), null);
  assert.equal(calcularAcesso({ ...base, env: { ...env, CHAMA_DEV_LIBERAR: "pago", NODE_ENV: "production" } }).pago, false);
  assert.equal(calcularAcesso({ ...base, env: { ...env, CHAMA_DEV_LIBERAR: "pago", NODE_ENV: "development" } }).pago, true);
});

test("conteúdo: normaliza o dias.json e descarta lixo", () => {
  const dias = normalizarDias([{ dia: 2, titulo: "B", jejum: "" }, { dia: 1, titulo: "A", jejum: "x" }, { dia: 99 }, null]);
  assert.deepEqual(dias.map((d) => d.dia), [1, 2]);
  assert.equal(dias[1].jejum, null);
  assert.equal(dias[0].jejum, "x");
});
