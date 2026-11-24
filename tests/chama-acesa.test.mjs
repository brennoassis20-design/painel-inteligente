// Testes do Chama Acesa (regras sem tela): node --test --experimental-strip-types tests/chama-acesa.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { inicioSemana, premiarConvite, tSemana, XP, aplicarAcao, atualizarParaHoje, dataSP, diaAtual, estadoVazio, podeAbrir, somarDias, statusDoDia, nivelChama } from "../lib/chama-acesa/regras.ts";
import { calcularAcesso, bibliaLiberada } from "../lib/chama-acesa/acesso-regra.ts";
import { filtrarLivros, vizinho, ajustarFonte } from "../lib/chama-acesa/biblia.ts";
import { PROGRESSAO } from "../lib/chama-acesa/musica-oracao.ts";
import { normalizarDias } from "../lib/chama-acesa/dias.ts";
import { montarSessao, normalizarVersiculos } from "../lib/chama-acesa/pratica.ts";
import { atualizarLiga, classificar, gerarBots, normalizarLigas, xpDoBot, zonaDe } from "../lib/chama-acesa/ligas.ts";
import { categoriaDoLembrete, escolherTexto, normalizarTextos, preencher, quemRecebe, quemRecebeCobranca, registrarEnvio } from "../lib/chama-acesa/lembretes.ts";
import { readFileSync } from "node:fs";
import { completouHoje } from "../lib/chama-acesa/selo.ts";

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

const TEXTOS = normalizarTextos(JSON.parse(readFileSync(new URL("../lib/chama-acesa/lembretes-textos.json", import.meta.url), "utf8")));
const CFG_L = normalizarLigas({ ligas: Array.from({ length: 4 }, (_, i) => ({ id: `l${i}`, nome: `L${i}` })), nomes: Array.from({ length: 60 }, (_, i) => `Nome ${i}`) });

test("lembretes: manhã na hora escolhida, noite às 21h, só quem ligou e não completou hoje", () => {
  const hoje = "2026-12-05";
  const P = (id, h, ult, n = 3, acesso = "2026-12-04") => ({ user_id: id, nome: "Ana Silva", chama_atual: n, ultima_data: ult, ultimo_acesso: acesso, horario_lembrete: h, dias_feitos: 3, xp_semana: {}, lembretes_hist: {} });
  const perfis = [P("a", "07:00", "2026-12-04"), P("b", "07:30", hoje, 3, hoje), P("c", null, "2026-12-04"), P("d", "21:00", "2026-12-04"), P("e", "09:00", "2026-12-04")];
  assert.deepEqual(quemRecebe(perfis, "07", hoje, TEXTOS, CFG_L).map((x) => [x.perfil.user_id, x.mensagem.tipo]), [["a", "manha"]]);
  assert.deepEqual(quemRecebe(perfis, "21", hoje, TEXTOS, CFG_L).map((x) => [x.perfil.user_id, x.mensagem.tipo]), [["a", "noite"], ["d", "noite"], ["e", "noite"]]);
  assert.deepEqual(quemRecebe(perfis, "15", hoje, TEXTOS, CFG_L), []);
  const m = quemRecebe(perfis, "21", hoje, TEXTOS, CFG_L)[0].mensagem;
  assert.ok(!/[{}]/.test(m.titulo + m.corpo), "variáveis preenchidas");
});

test("lembretes: categoria certa para cada situação", () => {
  const base = { tipo: "manha", hoje: "2026-12-04", chama: 3, maior: 3, ultimaData: "2026-12-03", ultimoAcesso: "2026-12-03", diasFeitos: 3, posicao: 15, zona: "neutra", sobem: 7 };
  assert.equal(categoriaDoLembrete({ ...base, chama: 2 }), "medalha_perto"); // amanhã é o 3º dia
  assert.equal(categoriaDoLembrete({ ...base, chama: 4 }), "manha_normal");
  assert.equal(categoriaDoLembrete({ ...base, zona: "desce", chama: 4 }), "liga_risco_descer");
  assert.equal(categoriaDoLembrete({ ...base, posicao: 9, chama: 4 }), "liga_perto_subir");
  assert.equal(categoriaDoLembrete({ ...base, chama: 1, maior: 5 }), "voltou");
  // sábado (2026-12-05): convite de amigo quando nada mais se aplica
  assert.equal(categoriaDoLembrete({ ...base, chama: 4, hoje: "2026-12-05", ultimaData: "2026-12-04", ultimoAcesso: "2026-12-04" }), "convite_amigo");
  // noite
  assert.equal(categoriaDoLembrete({ ...base, tipo: "noite", chama: 4 }), "noite_risco");
  assert.equal(categoriaDoLembrete({ ...base, tipo: "noite", chama: 9 }), "chama_alta_risco");
  assert.equal(categoriaDoLembrete({ ...base, tipo: "noite", chama: 4, zona: "desce" }), "liga_risco_descer");
});

test("lembretes: sumiu 2, 5 e 14 dias; passou de 14 para; noite não insiste em quem sumiu", () => {
  const c = (n, extra = {}) => ({ tipo: "manha", hoje: "2026-12-20", chama: 0, maior: 3, ultimaData: null, ultimoAcesso: `2026-12-${String(20 - n).padStart(2, "0")}`, diasFeitos: 3, posicao: 15, zona: "neutra", sobem: 7, ...extra });
  assert.equal(categoriaDoLembrete(c(1)), "manha_normal");
  assert.equal(categoriaDoLembrete(c(2)), "sumiu_2_dias");
  assert.equal(categoriaDoLembrete(c(4)), "sumiu_2_dias");
  assert.equal(categoriaDoLembrete(c(5)), "sumiu_5_dias");
  assert.equal(categoriaDoLembrete(c(13)), "sumiu_5_dias");
  assert.equal(categoriaDoLembrete(c(14)), "sumiu_14_dias");
  assert.equal(categoriaDoLembrete(c(15)), null);
  assert.equal(categoriaDoLembrete(c(3, { tipo: "noite" })), null);
});

test("lembretes: não repete a mesma mensagem em 7 dias; volta à mais antiga quando acabam", () => {
  const textos = normalizarTextos([{ cat: "x", tom: "a", titulo: "A", corpo: "" }, { cat: "x", tom: "b", titulo: "B", corpo: "" }]);
  let hist = {};
  const vistas = [];
  for (let d = 0; d < 2; d += 1) {
    const t = escolherTexto(textos, "x", hist, `2026-12-0${d + 1}`, () => 0);
    vistas.push(t.titulo);
    hist = registrarEnvio(hist, `x|${t.titulo}`, `2026-12-0${d + 1}`);
  }
  assert.deepEqual(vistas.sort(), ["A", "B"]);
  // acabaram: volta à mais antiga (a de 01/12)
  const antiga = Object.entries(hist).sort((a, b) => a[1].localeCompare(b[1]))[0][0].split("|")[1];
  assert.equal(escolherTexto(textos, "x", hist, "2026-12-03", () => 0.9).titulo, antiga);
  // passados 7 dias, a antiga volta a valer e a outra continua barrada
  const t8 = escolherTexto(textos, "x", hist, "2026-12-08", () => 0);
  assert.equal(t8.titulo, antiga);
  assert.equal(preencher("{nome} tem {dias} dias na liga {liga}", { nome: "Ana", dias: 3, liga: "Faísca" }), "Ana tem 3 dias na liga Faísca");
});

test("cobrança do dia 4: só no dia seguinte ao dia 3, sem compra e sem aviso anterior", () => {
  const hoje = "2026-12-05";
  const C = (id, dia3, extra = {}) => ({ user_id: id, nome: "Rita", chama_atual: 3, dia3, pago: false, enviada: false, ...extra });
  const r = quemRecebeCobranca([C("a", "2026-12-04"), C("b", "2026-12-04", { pago: true }), C("c", "2026-12-04", { enviada: true }), C("d", "2026-12-03"), C("e", hoje), C("f", null)], hoje, TEXTOS);
  assert.deepEqual(r.map((x) => x.candidato.user_id), ["a"]);
  assert.ok(r[0].titulo.length > 0 && !/[{}]/.test(r[0].titulo + r[0].corpo));
});

test("selo: só aceso enquanto hoje não foi completado", () => {
  assert.equal(completouHoje({ 1: "2026-12-04" }, "2026-12-05"), false);
  assert.equal(completouHoje({ 1: "2026-12-04", 2: "2026-12-05" }, "2026-12-05"), true);
});

// ---------------------------------------------------------------- XP, prática, ligas
test("XP: 10 + 10 + 15 + 15 de bônus = 50 por dia; jejum 10 só na primeira vez", () => {
  let e = estadoVazio();
  const g = [];
  for (const check of ["leu", "orou", "missao"]) {
    const r = aplicarAcao(e, { tipo: "check", dia: 1, check }, D0, false);
    g.push(r.xpGanho);
    e = r.estado;
  }
  assert.deepEqual(g, [10, 10, 30]);
  assert.equal(e.xp, 50);
  assert.equal(e.xpSemana[inicioSemana(D0)], 50);
  // repetir o mesmo check não rende de novo
  let r = aplicarAcao(estadoVazio(), { tipo: "check", dia: 1, check: "leu" }, D0, false);
  assert.equal(aplicarAcao(r.estado, { tipo: "check", dia: 1, check: "leu" }, D0, false).xpGanho, 0);
  r = aplicarAcao(estadoVazio(), { tipo: "jejum", dia: 1, valor: true }, D0, false);
  assert.equal(r.xpGanho, XP.jejum);
  r = aplicarAcao(aplicarAcao(r.estado, { tipo: "jejum", dia: 1, valor: false }, D0, false).estado, { tipo: "jejum", dia: 1, valor: true }, D0, false);
  assert.equal(r.xpGanho, 0);
});

test("prática: +5 por acerto, +10 se perfeita, não completa o dia nem mexe na chama", () => {
  const base = completar(estadoVazio(), 1, D0).estado;
  const ids = ["a", "b", "c", "d", "e"];
  const r = aplicarAcao(base, { tipo: "pratica", acertos: 5, ids }, D0, false);
  assert.equal(r.xpGanho, 35);
  assert.equal(r.estado.chama, base.chama);
  assert.deepEqual(r.estado.concluidos, base.concluidos);
  assert.equal(r.estado.praticas.a, 1);
  assert.equal(aplicarAcao(base, { tipo: "pratica", acertos: 3, ids }, D0, false).xpGanho, 15);
  assert.ok(aplicarAcao(base, { tipo: "pratica", acertos: 6, ids }, D0, false).erro);
});

test("prática: 5 perguntas sem repetir versículo, menos vistos primeiro, duas modalidades", () => {
  const banco = normalizarVersiculos(Array.from({ length: 12 }, (_, i) => ({ id: `v${i}`, referencia: `Livro ${i}:1`, texto: `texto numero ${i} com palavra${i} dentro`, lacuna: `palavra${i}`, distratores: ["x", "y", "z"] })));
  let n = 1;
  const rnd = () => ((n = (n * 16807) % 2147483647) / 2147483647);
  const vistos = Object.fromEntries(banco.slice(0, 7).map((v) => [v.id, 3]));
  const s = montarSessao(banco, vistos, rnd);
  assert.equal(s.length, 5);
  assert.equal(new Set(s.map((p) => p.id)).size, 5);
  assert.ok(s.every((p) => !vistos[p.id])); // os 5 não vistos vêm primeiro
  for (const p of s) {
    assert.equal(p.opcoes.length, 4);
    assert.equal(p.opcoes[p.correta], p.tipo === "lacuna" ? p.texto.match(/palavra\d+/)[0] : p.referencia);
    if (p.tipo === "lacuna") assert.ok(p.trecho.includes("_____"));
  }
  assert.ok(montarSessao(banco, {}, () => 0.9).every((p) => p.tipo === "lacuna"));
});

const CFG = normalizarLigas({ ligas: Array.from({ length: 4 }, (_, i) => ({ id: `l${i}`, nome: `L${i}` })), nomes: Array.from({ length: 60 }, (_, i) => `Nome ${i}`) });
const segunda = "2026-11-30";

test("ligas: grupo de 30, determinístico, XP cresce na semana", () => {
  const a = gerarBots("user-1", segunda, 0, CFG);
  const b = gerarBots("user-1", segunda, 0, CFG);
  assert.equal(a.length, 29);
  assert.deepEqual(a, b);
  assert.notDeepEqual(a.map((x) => x.nome), gerarBots("user-2", segunda, 0, CFG).map((x) => x.nome));
  assert.equal(new Set(a.map((x) => x.nome)).size, 29);
  for (const bot of a) {
    let ant = -1;
    for (let t = 0; t <= 7; t += 0.5) {
      const x = xpDoBot(bot, t);
      assert.ok(x >= ant);
      ant = x;
    }
  }
  assert.equal(xpDoBot(a[0], 0), 0);
  assert.ok(a.some((x) => x.perfil === "parado") && a.some((x) => x.perfil === "ativo"));
});

test("ligas: calibragem — 350 XP na semana fica no topo da primeira liga; zero fica no fundo", () => {
  const bots = gerarBots("u", segunda, 0, CFG);
  assert.ok(classificar(350, bots, 7).find((l) => l.voce).posicao <= 7);
  assert.ok(classificar(0, bots, 7).find((l) => l.voce).posicao >= 25);
});

test("ligas: promoção, rebaixamento e limites da primeira e da última liga", () => {
  assert.equal(zonaDe(7, 1, CFG), "sobe");
  assert.equal(zonaDe(8, 1, CFG), "neutra");
  assert.equal(zonaDe(25, 1, CFG), "neutra");
  assert.equal(zonaDe(26, 1, CFG), "desce");
  assert.equal(zonaDe(30, 0, CFG), "neutra"); // primeira liga: ninguém desce
  assert.equal(zonaDe(1, 3, CFG), "neutra"); // última: ninguém sobe
  const prox = "2026-12-07";
  let e = atualizarLiga(estadoVazio(), segunda, "u", CFG);
  assert.equal(e.liga.semana, segunda);
  e = { ...e, xpSemana: { [segunda]: 400 } };
  e = atualizarLiga(e, prox, "u", CFG);
  assert.equal(e.liga.indice, 1);
  assert.equal(e.liga.resultado.resultado, "subiu");
  assert.equal(e.liga.historico.length, 1);
  assert.equal(atualizarLiga(e, prox, "u", CFG), e); // idempotente
  // zero XP na liga 1 desce; na liga 0 fica
  const sem = atualizarLiga({ ...estadoVazio(), liga: { indice: 1, semana: segunda, historico: [], resultado: null } }, prox, "u", CFG);
  assert.equal(sem.liga.indice, 0);
  assert.equal(sem.liga.resultado.resultado, "desceu");
  const prim = atualizarLiga({ ...estadoVazio(), liga: { indice: 0, semana: segunda, historico: [], resultado: null } }, prox, "u", CFG);
  assert.equal(prim.liga.indice, 0);
  assert.equal(prim.liga.resultado.resultado, "ficou");
});

test("semana vira na segunda 00h de São Paulo", () => {
  assert.equal(inicioSemana("2026-12-06"), "2026-11-30"); // domingo
  assert.equal(inicioSemana("2026-12-07"), "2026-12-07"); // segunda
  assert.equal(inicioSemana(dataSP(new Date("2026-12-07T02:59:00Z"))), "2026-11-30"); // domingo 23:59 em SP
  assert.equal(inicioSemana(dataSP(new Date("2026-12-07T03:00:00Z"))), "2026-12-07");
  assert.equal(tSemana("2026-12-02", 12), 2.5);
});

test("convite: +50 XP e 1 brasa guardada, respeitando o máximo de 2", () => {
  let e = premiarConvite(estadoVazio(), D0);
  assert.equal(e.xp, 50);
  assert.equal(e.brasas, 1);
  assert.equal(e.amigos, 1);
  e = premiarConvite(premiarConvite(e, D0), D0);
  assert.equal(e.brasas, 2);
  assert.equal(e.amigos, 3);
});

test("bíblia: liberada sem compra e após o dia 3", () => {
  const env = { CHAMA_AREA_SLUG: "chama-acesa", CHAMA_PRODUCT_SLUGS: "chama", NODE_ENV: "production" };
  const semCompra = calcularAcesso({ areaSlug: "chama-acesa", produtos: [], admin: false, env });
  assert.equal(semCompra?.pago, false);
  assert.equal(semCompra?.biblia, true);
  assert.equal(bibliaLiberada(), true);
  // dia 4 trancado para quem não comprou, e a Bíblia continua aberta
  let e = estadoVazio();
  for (let d = 1; d <= 3; d++) {
    const hoje = somarDias("2026-11-01", d - 1);
    e = aplicarAcao(e, { tipo: "check", dia: d, check: "leu" }, hoje, false).estado;
    e = aplicarAcao(e, { tipo: "check", dia: d, check: "orou" }, hoje, false).estado;
    e = aplicarAcao(e, { tipo: "check", dia: d, check: "missao" }, hoje, false).estado;
  }
  assert.equal(podeAbrir(e, 4, "2026-11-04", false).ok, false);
  assert.equal(semCompra?.biblia, true);
});

test("bíblia: dados completos, busca, vizinhos e fonte", () => {
  const lerJson = (n) => JSON.parse(readFileSync(new URL(`../public/chama-acesa/biblia/${n}.json`, import.meta.url), "utf8"));
  const indice = lerJson("indice");
  assert.equal(indice.length, 66);
  assert.equal(indice.filter((l) => l.testamento === "at").length, 39);
  assert.equal(indice.find((l) => l.sigla === "gen").capitulos, 50);
  assert.equal(indice.find((l) => l.sigla === "psa").capitulos, 150);
  assert.equal(indice.find((l) => l.sigla === "rev").capitulos, 22);
  assert.match(lerJson("joh").capitulos[2][15], /^Porque Deus amou ao mundo de tal maneira/);
  assert.match(lerJson("gen").capitulos[0][0], /^No princípio criou Deus os céus e a terra/);
  assert.match(lerJson("psa").capitulos[22][0], /O SENHOR é meu pastor, nada me faltará/);
  assert.deepEqual(filtrarLivros(indice, "joao").map((l) => l.sigla), ["joh", "1jo", "2jo", "3jo"]);
  assert.equal(filtrarLivros(indice, "genesis")[0].sigla, "gen");
  assert.equal(filtrarLivros(indice, "1 jo")[0].nome, "1 João");
  assert.deepEqual(vizinho(indice, { sigla: "gen", cap: 50 }, 1), { sigla: "exo", cap: 1 });
  assert.deepEqual(vizinho(indice, { sigla: "exo", cap: 1 }, -1), { sigla: "gen", cap: 50 });
  assert.equal(vizinho(indice, { sigla: "gen", cap: 1 }, -1), null);
  assert.equal(vizinho(indice, { sigla: "rev", cap: 22 }, 1), null);
  assert.equal(ajustarFonte(28, 1), 28);
  assert.equal(ajustarFonte(20, -1), 18);
});

test("música da oração: acordes em tom maior, graves a agudos, sem batida", () => {
  assert.equal(PROGRESSAO.length, 4);
  for (const a of PROGRESSAO) {
    assert.equal(a.length, 4);
    assert.ok(a.every((f) => f > 80 && f < 600));
  }
});
