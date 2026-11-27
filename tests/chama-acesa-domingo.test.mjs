// Aviso de domingo "Palavra no coração": node --test --experimental-strip-types tests/chama-acesa-domingo.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { normalizarTextos, MAX_EXTRAS_DIA, enviadosHoje } from "../lib/chama-acesa/lembretes.ts";
import { podeReceberVersos, quemRecebeVersosSemana, versosDaSemana, registroVersos, fontesDoPerfil, totalDoPerfil, MINIMO_VERSOS } from "../lib/chama-acesa/versos-domingo.ts";

const TEXTOS = normalizarTextos(JSON.parse(readFileSync(new URL("../lib/chama-acesa/lembretes-textos.json", import.meta.url), "utf8")));
const DOM = "2026-12-06"; // domingo; segunda da semana = 2026-11-30
const SEG = "2026-11-30";
const C = (o = {}) => ({ user_id: "u1", nome: "Ana Silva", chama_atual: 5, ultima_data: DOM, ultimo_acesso: DOM, horario_lembrete: null, dias_feitos: 5, xp_semana: {}, lembretes_hist: {}, inicio: "2026-11-24", extras: {}, total: 312, ...o });

test("só domingo, só às 20h (e 22h de reserva)", () => {
  assert.equal(podeReceberVersos(C(), 20, DOM), true);
  assert.equal(podeReceberVersos(C(), 22, DOM), true);
  assert.equal(podeReceberVersos(C(), 21, DOM), false);
  assert.equal(podeReceberVersos(C(), 10, DOM), false);
  assert.equal(podeReceberVersos(C(), 20, "2026-12-05"), false); // sábado
  assert.equal(podeReceberVersos(C(), 20, "2026-12-07"), false); // segunda
});

test("quem abriu o app nos últimos 7 dias; sumido fica de fora", () => {
  assert.equal(podeReceberVersos(C({ ultimo_acesso: "2026-11-29" }), 20, DOM), true);
  assert.equal(podeReceberVersos(C({ ultimo_acesso: "2026-11-28" }), 20, DOM), false);
  assert.equal(podeReceberVersos(C({ ultimo_acesso: null, ultima_data: null }), 20, DOM), false);
});

test("mínimo de 10 versículos", () => {
  assert.equal(quemRecebeVersosSemana([C({ total: MINIMO_VERSOS - 1 })], "20", DOM, TEXTOS).length, 0);
  assert.equal(quemRecebeVersosSemana([C({ total: MINIMO_VERSOS })], "20", DOM, TEXTOS).length, 1);
});

test("texto sem semana anterior: só o total e a data de início", () => {
  const [e] = quemRecebeVersosSemana([C()], "20", DOM, TEXTOS);
  assert.equal(e.mensagem.categoria, "versos_semana_inicio");
  const txt = `${e.mensagem.titulo} ${e.mensagem.corpo}`;
  assert.match(txt, /312/);
  assert.match(txt, /24\/11/);
  assert.match(txt, /Efésios inteiro 2 vezes/);
  assert.doesNotMatch(txt, /\{|\}/);
  assert.doesNotMatch(txt, /Nesta semana/);
});

test("texto com semana anterior: diz quantos nesta semana", () => {
  const c = C({ extras: { versosSemana: { semana: "2026-11-23", total: 228 }, talentos: 3 } });
  assert.equal(versosDaSemana(c, DOM), 84);
  const [e] = quemRecebeVersosSemana([c], "20", DOM, TEXTOS);
  assert.equal(e.mensagem.categoria, "versos_semana");
  const txt = `${e.mensagem.titulo} ${e.mensagem.corpo}`;
  assert.match(txt, /84/);
  assert.match(txt, /312/);
  assert.doesNotMatch(txt, /\{|\}/);
});

test("registro mais antigo que a semana passada não vira 'nesta semana'", () => {
  assert.equal(versosDaSemana(C({ extras: { versosSemana: { semana: "2026-11-16", total: 100 } } }), DOM), null);
  assert.equal(versosDaSemana(C({ extras: { versosSemana: { semana: "2026-11-23", total: 312 } } }), DOM), null); // nada novo
});

test("uma vez por semana: já enviado não repete (nem às 22h)", () => {
  assert.equal(podeReceberVersos(C({ extras: { versosSemana: registroVersos(DOM, 300) } }), 22, DOM), false);
  assert.equal(registroVersos(DOM, 300).semana, SEG);
  assert.equal(podeReceberVersos(C({ lembretes_hist: { "versos_semana|Palavra no coração 📖": DOM } }), 22, DOM), false);
});

test("teto: não manda se já está na hora de outro aviso nem se bateu MAX_EXTRAS_DIA", () => {
  assert.equal(quemRecebeVersosSemana([C()], "20", DOM, TEXTOS, new Set(["u1"])).length, 0); // outro aviso às 20h -> tenta às 22h
  assert.equal(quemRecebeVersosSemana([C()], "22", DOM, TEXTOS, new Set()).length, 1);
  const hist = Object.fromEntries(["tranquilo|a", "liga_passou|b", "liga_passou|c", "liga_ultimo|d"].map((k) => [k, DOM]));
  assert.equal(enviadosHoje(hist, DOM), MAX_EXTRAS_DIA);
  assert.equal(quemRecebeVersosSemana([C({ lembretes_hist: hist })], "20", DOM, TEXTOS).length, 0);
});

test("o aviso conta como extra do dia (entra no teto das horas seguintes)", () => {
  assert.equal(enviadosHoje({ "versos_semana|x": DOM }, DOM), 1);
});

test("sem a categoria no JSON, usa o texto reserva do código", () => {
  const [e] = quemRecebeVersosSemana([C()], "20", DOM, []);
  assert.match(e.mensagem.corpo, /312/);
  assert.doesNotMatch(e.mensagem.corpo, /\{/);
});

test("total no servidor: jornada, dias contínuos, Desafio e Bíblia", () => {
  const f = fontesDoPerfil({ dias_feitos: 25, praticas: { a: 2, b: 1 } }, [1, 2, 3], { 1: "João 3:16", 2: "Mateus 6:9-13", 3: "" }, { Jud: [1] });
  assert.deepEqual(f, { refsDosDias: ["João 3:16", "Mateus 6:9-13", ""], diasContinuos: 22, idsDesafio: ["a", "b"], lidos: { Jud: [1] } });
  assert.ok(totalDoPerfil(f) >= 1 + 5 + 1 + 22 + 2);
});
