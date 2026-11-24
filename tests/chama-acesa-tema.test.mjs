// Testes do tema do Chama Acesa: claro é o padrão e a escolha vem do localStorage (sem nunca lançar erro).
import { test } from "node:test";
import assert from "node:assert/strict";
import { CHAVE_TEMA, COR_DO_TEMA, ehTema, lerTema, salvarTema, SCRIPT_TEMA, TEMA_PADRAO } from "../lib/chama-acesa/tema.ts";
import { PRECO_MENSAL, TOTAL_MENSAL_12_MESES } from "../lib/chama-acesa/precos.ts";

const memoria = (ini = {}) => {
  const d = { ...ini };
  return { getItem: (k) => (k in d ? d[k] : null), setItem: (k, v) => { d[k] = String(v); }, d };
};

test("o tema padrão é o claro, para todo mundo", () => {
  assert.equal(TEMA_PADRAO, "claro");
  assert.equal(lerTema(memoria()), "claro");
  assert.equal(lerTema(null), "claro");
});

test("lê o tema salvo e ignora valores estranhos", () => {
  assert.equal(lerTema(memoria({ [CHAVE_TEMA]: "escuro" })), "escuro");
  assert.equal(lerTema(memoria({ [CHAVE_TEMA]: "claro" })), "claro");
  assert.equal(lerTema(memoria({ [CHAVE_TEMA]: "roxo" })), "claro");
  assert.equal(ehTema("escuro"), true);
  assert.equal(ehTema(undefined), false);
});

test("localStorage bloqueado não quebra: cai no claro e salvar devolve false", () => {
  const quebrado = { getItem: () => { throw new Error("bloqueado"); }, setItem: () => { throw new Error("bloqueado"); } };
  assert.equal(lerTema(quebrado), "claro");
  assert.equal(salvarTema("escuro", quebrado), false);
});

test("salvar e ler de volta", () => {
  const m = memoria();
  assert.equal(salvarTema("escuro", m), true);
  assert.equal(m.d[CHAVE_TEMA], "escuro");
  assert.equal(lerTema(m), "escuro");
});

test("script anti-piscada e cores da barra do navegador", () => {
  assert.ok(SCRIPT_TEMA.includes(CHAVE_TEMA) && SCRIPT_TEMA.includes("data-chama-tema"));
  assert.doesNotThrow(() => new Function(SCRIPT_TEMA));
  assert.equal(COR_DO_TEMA.claro, "#FBF7F2");
  assert.equal(COR_DO_TEMA.escuro, "#0B0D14");
});

test("texto de comparação do mensal bate com 12 x o preço mensal", () => {
  const centavos = (t) => Math.round(parseFloat(t.replace("R$", "").trim().replace(".", "").replace(",", ".")) * 100);
  assert.equal(centavos(PRECO_MENSAL) * 12, centavos(TOTAL_MENSAL_12_MESES));
});
