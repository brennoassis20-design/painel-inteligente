// Talentos, brasas por plano e restaurar a chama: node --test --experimental-strip-types tests/chama-acesa-talentos.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { aplicarAcao, atualizarParaHoje, estadoVazio, premiarConvite, somarDias } from "../lib/chama-acesa/regras.ts";
import { maxBrasasDoPlano, PRECO, TALENTOS_GANHO } from "../lib/chama-acesa/talentos.ts";
import { atualizarLiga, normalizarLigas } from "../lib/chama-acesa/ligas.ts";

const D0 = "2026-12-01";
const pratica5 = (e, hoje, acertos = 5) => aplicarAcao(e, { tipo: "pratica", acertos, ids: ["a", "b", "c", "d", "e"] }, hoje, true);

function completar(e, dia, hoje, ctx = {}) {
  let r;
  for (const check of ["leu", "orou", "missao"]) {
    r = aplicarAcao(e, { tipo: "check", dia, check }, hoje, true, undefined, ctx);
    assert.equal(r.erro, undefined, r.erro);
    e = r.estado;
  }
  return r;
}
/** Chama de `n` dias seguidos a partir de D0 (último dia = D0 + n - 1). */
function chamaDe(n, ctx) {
  let e = estadoVazio();
  for (let d = 1; d <= n; d += 1) e = completar(e, d, somarDias(D0, d - 1), ctx).estado;
  return e;
}

test("talentos: dia completo +5, prática perfeita +3, estudo +10, convite +10", () => {
  let e = completar(estadoVazio(), 1, D0).estado;
  assert.equal(e.talentos, TALENTOS_GANHO.dia);
  e = pratica5(e, D0).estado;
  assert.equal(e.talentos, TALENTOS_GANHO.dia + TALENTOS_GANHO.praticaPerfeita);
  assert.equal(pratica5(e, D0, 4).estado.talentos, e.talentos); // 4/5 não ganha
  assert.equal(premiarConvite(e, D0).talentos, e.talentos + TALENTOS_GANHO.convite);
});

test("talentos: meta de chama alcançada rende +20 além do dia", () => {
  const e = chamaDe(3); // 3 é meta padrão
  assert.ok(e.medalhas.includes("meta3"));
  assert.equal(e.talentos, 3 * TALENTOS_GANHO.dia + TALENTOS_GANHO.meta);
});

test("talentos: liga que sobe rende +20, que fica +5, que desce 0", () => {
  const cfg = normalizarLigas(null);
  const e = { ...estadoVazio(), talentos: 0, liga: { indice: 0, semana: "2026-11-23", historico: [], resultado: null }, xpSemana: { "2026-11-23": 99999 } };
  const r = atualizarLiga(e, "2026-12-01", "semente", cfg);
  const esperado = { subiu: TALENTOS_GANHO.ligaSubiu, ficou: TALENTOS_GANHO.ligaFicou, desceu: 0 }[r.liga.resultado.resultado];
  assert.equal(r.talentos, esperado);
});

test("comprar brasa: custa 50 talentos e respeita o limite (2; vitalício 3)", () => {
  const e = { ...completar(estadoVazio(), 1, D0).estado, talentos: 200, brasas: 2 };
  assert.match(aplicarAcao(e, { tipo: "comprarBrasa" }, D0, true).erro, /máximo/);
  const vit = aplicarAcao(e, { tipo: "comprarBrasa" }, D0, true, undefined, { maxBrasas: 3 });
  assert.equal(vit.erro, undefined);
  assert.equal(vit.estado.brasas, 3);
  assert.equal(vit.estado.talentos, 200 - PRECO.brasa);
  assert.match(aplicarAcao({ ...e, brasas: 0, talentos: 49 }, { tipo: "comprarBrasa" }, D0, true).erro, /Faltam talentos/);
});

test("limite por plano: só vitalício e admin guardam 3", () => {
  assert.equal(maxBrasasDoPlano("gratis"), 2);
  assert.equal(maxBrasasDoPlano("mensal"), 2);
  assert.equal(maxBrasasDoPlano("vitalicio"), 3);
  assert.equal(maxBrasasDoPlano("admin"), 3);
  // vitalício ganha a 3ª brasa no 21º dia
  assert.equal(chamaDe(21).brasas, 2);
  assert.equal(chamaDe(21, { maxBrasas: 3 }).brasas, 3);
});

test("chama apagou: fica restaurável até 48 h depois do dia perdido; depois some", () => {
  const e = chamaDe(5); // último dia feito = D0+4; perdido = D0+5
  const abriu = atualizarParaHoje(e, somarDias(D0, 6));
  assert.equal(abriu.chama, 0);
  assert.deepEqual(abriu.restauravel, { chama: 5, ate: somarDias(D0, 7), desde: somarDias(D0, 6), passos: {} });
  assert.equal(atualizarParaHoje(abriu, somarDias(D0, 7)).restauravel?.chama, 5); // ainda dá
  assert.equal(atualizarParaHoje(abriu, somarDias(D0, 8)).restauravel, null); // passou
  // abriu tarde demais: nem oferece
  assert.equal(atualizarParaHoje(e, somarDias(D0, 8)).restauravel, null);
});

test("restaurar com talentos: chama volta inteira e o dia de hoje continua por fazer", () => {
  const hoje = somarDias(D0, 6);
  const apagada = { ...atualizarParaHoje(chamaDe(5), hoje), talentos: 150 };
  const r = aplicarAcao(apagada, { tipo: "restaurar", modo: "talentos" }, hoje, true);
  assert.equal(r.erro, undefined);
  assert.equal(r.estado.chama, 5);
  assert.equal(r.estado.talentos, 150 - PRECO.restaurar);
  assert.equal(r.estado.restauravel, null);
  assert.ok(r.estado.avisos.includes("chama_restaurada"));
  // completa hoje: vira 6, sem apagar
  assert.equal(completar(r.estado, 6, hoje).estado.chama, 6);
  // e amanhã segue normal
  assert.equal(completar(completar(r.estado, 6, hoje).estado, 7, somarDias(hoje, 1)).estado.chama, 7);
  assert.match(aplicarAcao({ ...apagada, talentos: 99 }, { tipo: "restaurar", modo: "talentos" }, hoje, true).erro, /Faltam talentos/);
});

test("restaurar por esforço: dia de hoje + prática completa + leitura da volta", () => {
  const hoje = somarDias(D0, 6);
  let e = atualizarParaHoje(chamaDe(5), hoje);
  e = aplicarAcao(e, { tipo: "leituraVolta" }, hoje, true).estado;
  assert.equal(e.restauravel.passos.leitura, true);
  e = pratica5(e, hoje, 2).estado; // prática completa conta mesmo errando
  assert.equal(e.restauravel.passos.pratica, true);
  assert.equal(e.chama, 0);
  e = completar(e, 6, hoje).estado; // último passo
  assert.equal(e.restauravel, null);
  assert.equal(e.chama, 6); // 5 antigos + hoje
  assert.equal(e.maior, 6);
  // amanhã continua
  assert.equal(completar(e, 7, somarDias(hoje, 1)).estado.chama, 7);
});

test("sem chama apagada não dá para restaurar", () => {
  const e = chamaDe(2);
  assert.match(aplicarAcao({ ...e, talentos: 500 }, { tipo: "restaurar", modo: "talentos" }, somarDias(D0, 2), true).erro, /Não há chama/);
});

test("perfil antigo sem talentos/extras continua funcionando", () => {
  const velho = { ...estadoVazio() };
  delete velho.talentos; delete velho.extras; delete velho.restauravel;
  const r = completar(velho, 1, D0);
  assert.equal(r.estado.talentos, TALENTOS_GANHO.dia);
});

// ------------------------------------------------------------ teste grátis por calendário (27/11)
import { podeAbrir, registrarAcesso, testeAcabou, ultimoDiaGratis } from "../lib/chama-acesa/regras.ts";
import { quemRecebeCobranca } from "../lib/chama-acesa/lembretes.ts";

test("teste grátis: 3 dias de calendário desde o 1º acesso, mesmo sem concluir 3 dias", () => {
  const e = registrarAcesso(estadoVazio(), D0); // instalou em D0
  assert.equal(e.inicio, D0);
  assert.equal(registrarAcesso(e, somarDias(D0, 5)).inicio, D0); // não muda depois
  assert.deepEqual(podeAbrir(e, 1, somarDias(D0, 2), false), { ok: true }); // 3º dia: ainda grátis
  assert.equal(ultimoDiaGratis(e, somarDias(D0, 2)), true);
  assert.equal(testeAcabou(e, somarDias(D0, 3)), true);
  assert.deepEqual(podeAbrir(e, 1, somarDias(D0, 3), false), { ok: false, motivo: "pagamento" }); // 4º dia: tranca até o dia 1
  assert.deepEqual(podeAbrir(e, 1, somarDias(D0, 3), true), { ok: true }); // quem pagou segue
  // concluiu 1 dia e sumiu: no 4º dia de calendário o dia 2 está trancado
  const um = completar(e, 1, D0).estado;
  assert.deepEqual(podeAbrir(um, 2, somarDias(D0, 4), false), { ok: false, motivo: "pagamento" });
  assert.deepEqual(podeAbrir(um, 1, somarDias(D0, 4), false), { ok: true }); // dia já feito pode rever
});

test("cobrança: aviso do fim do teste usa texto próprio (sem 'dia 4')", () => {
  const base = { user_id: "u", nome: "Ana", chama_atual: 1, dia3: D0, pago: false, enviada: false };
  const [t] = quemRecebeCobranca([{ ...base, motivo: "teste" }], somarDias(D0, 1), []);
  assert.match(t.titulo, /grátis acabaram/);
  const [d] = quemRecebeCobranca([{ ...base, motivo: "dia3" }], somarDias(D0, 1), []);
  assert.match(d.titulo, /dia 4/);
  assert.equal(quemRecebeCobranca([{ ...base, motivo: "teste", pago: true }], somarDias(D0, 1), []).length, 0);
});
