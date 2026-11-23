// Testes do App da Reforma (lógica sem tela): node --test tests/reforma-app.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { lerNumeroBR, lerPercentualBR, numeroParaBR, fracaoParaCampoPercentual } from "../lib/reforma-app/numeros.ts";
import { formVazio, formParaEntrada, validarPasso, calcularCliente } from "../lib/reforma-app/modelo.ts";
import { calcularAcesso } from "../lib/reforma-app-acesso-regra.ts";
import { criarArmazenamentoLocal } from "../lib/reforma-app/armazenamento.ts";

test("números em formato brasileiro", () => {
  assert.equal(lerNumeroBR("R$ 1.234,56"), "1234.56");
  assert.equal(lerNumeroBR("1.234"), "1234");
  assert.equal(lerNumeroBR("abc"), null);
  assert.equal(lerPercentualBR("12,5%"), "0.125");
  assert.equal(numeroParaBR("60000"), "60.000,00");
  assert.equal(fracaoParaCampoPercentual("0.125"), "12,5");
});

const caso1 = () => ({ ...formVazio(), nome: "X", uf: "SP", municipio: "Campinas", setorId: "contabilidade", reducaoCodigo: "profissao_regulamentada", checklist: { habilitacao: true, socio_pj: true, socia_pj: true, atividade: true, socios_prestam: true }, regime: "presumido", receitaMensal: "60.000,00", pctPJ: "90", iss: "5", comprasRegulares: "8.000,00", margem: "15" });

test("Caso 1 do gabarito pelo formulário: imposto 2027 = 6.604,70", () => {
  const r = calcularCliente(caso1());
  assert.ok(r.ok);
  assert.equal(r.resultado.anos[2027].regular.total, "6604.70");
  assert.equal(r.resultado.anos[2033].regular.total, "9010.00");
});

test("Caso 2 do gabarito pelo formulário (Simples III)", () => {
  const f = { ...caso1(), regime: "simples", anexo: "III", receitaMensal: "40.000,00", rbt12: "480.000,00", iss: "", comprasRegulares: "5.000,00" };
  const r = calcularCliente(f);
  assert.ok(r.ok);
  assert.equal(r.resultado.anos[2027].opcoes.find((o) => o.id === "hibrido").precoNecessario, "41356.59");
});

test("checklist incompleto não aplica a redução de 30%", () => {
  const f = { ...caso1(), checklist: { habilitacao: true } };
  assert.equal(formParaEntrada(f).reducao, undefined);
});

test("validações em português", () => {
  const e = validarPasso(1, formVazio());
  assert.match(e.nome, /nome da empresa/);
  assert.match(validarPasso(2, { ...caso1(), pctPJ: "150" }).pctPJ, /100%/);
  assert.match(validarPasso(2, { ...caso1(), regime: "simples", anexo: "III", rbt12: "5.000.000,00" }).rbt12, /limite do Simples/);
});

test("acesso: só com o produto, dono vê tudo, liberação local não vale em produção", () => {
  const base = { areaSlug: "reforma", produtos: [{ slug: "app-47", owned: true }, { slug: "kit-67", owned: false }], admin: false };
  const env = { REFORMA_APP_PRODUCT_SLUGS: "app-47,kit-67", REFORMA_KIT_PRODUCT_SLUGS: "kit-67" };
  assert.deepEqual([calcularAcesso({ ...base, env }).app, calcularAcesso({ ...base, env }).kit], [true, false]);
  assert.equal(calcularAcesso({ ...base, produtos: [], env }).app, false);
  assert.equal(calcularAcesso({ ...base, areaSlug: "genio-play", env }), null);
  assert.equal(calcularAcesso({ ...base, produtos: [], admin: true, env }).kit, true);
  assert.equal(calcularAcesso({ ...base, produtos: [], env: { ...env, REFORMA_APP_DEV_LIBERAR: "app+kit", NODE_ENV: "production" } }).app, false);
  assert.equal(calcularAcesso({ ...base, produtos: [], env: { ...env, REFORMA_APP_DEV_LIBERAR: "app+kit", NODE_ENV: "development" } }).kit, true);
});

test("armazenamento local: salvar, duplicar e apagar", async () => {
  const mem = new Map();
  const st = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v) };
  const a = criarArmazenamentoLocal("t", st);
  const c = { id: "1", criadoEm: "2026-11-23", atualizadoEm: "2026-11-23", rascunho: false, passo: 5, form: caso1() };
  await a.salvarCliente(c);
  await a.salvarCliente({ ...c, id: "2", atualizadoEm: "2026-11-24" });
  assert.deepEqual((await a.carregar()).clientes.map((x) => x.id), ["2", "1"]);
  await a.apagarCliente("1");
  assert.equal((await a.carregar()).clientes.length, 1);
});
