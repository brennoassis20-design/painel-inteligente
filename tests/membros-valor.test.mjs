// node --test tests/membros-valor.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { valoresDaVenda } from "../lib/membros-valor.ts";

const kit = { id: "kit", price_cents: 4700 };
const app = { id: "app", price_cents: 4700 };
const soma = (m) => [...m.values()].reduce((a, b) => a + b, 0);

test("um produto: valor pago vai nele", () => {
  assert.deepEqual([...valoresDaVenda([app], 47, false)], [["app", 47]]);
});

test("pacote (App + Kit por R$ 67): conta 67 uma vez, não 94", () => {
  const m = valoresDaVenda([kit, app], 67, false);
  assert.equal(soma(m), 67);
  assert.equal(m.size, 2);
});

test("pacote: o valor vai no produto de maior preço", () => {
  const m = valoresDaVenda([{ id: "barato", price_cents: 1000 }, { id: "caro", price_cents: 9700 }], 97, false);
  assert.equal(m.get("caro"), 97);
  assert.equal(m.get("barato"), 0);
});

test("pedido com order bump e venda sem valor: não decide (relatório usa o preço de tabela)", () => {
  assert.equal(valoresDaVenda([kit, app], 67, true).size, 0);
  assert.equal(valoresDaVenda([kit, app], null, false).size, 0);
});
