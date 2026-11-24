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
import { LIVROS_BIBLIA } from "../lib/chama-acesa/biblia-planos-dados.ts";
import {
  aplicarBiblia, agruparNotasPorLivro, capitulosDosTrechos, diaDoPlano, estadoBibliaVazio, filtrarNotas, montarMensagemBiblia, nomeDosTrechos, PLANOS,
  progressoBiblia, quemRecebeBiblia, sequenciaBiblia, situacaoDoPlano, TEXTOS_COM_PLANO, textoDoLembrete, TOTAL_CAPITULOS,
} from "../lib/chama-acesa/biblia-estudo.ts";
import { checarLimite, chaveExplicacao, compactarVersiculos, explicacaoMock, formatarCitacao, LIMITE_IA_DIA, montarPrompt, normalizarExplicacao, validarPedido } from "../lib/chama-acesa/biblia-ia.ts";
import { criarBibliaLocal } from "../lib/chama-acesa/armazem-biblia.ts";
import { criarArmazemLocal } from "../lib/chama-acesa/armazem.ts";
import { readFileSync } from "node:fs";
import { completouHoje } from "../lib/chama-acesa/selo.ts";
import { DIAS_METAS_PADRAO, diasDasMetas, ehMeta, marcosLiberados, metaDoDia, metasAlcancadas, normalizarMarcos, proximaMeta, temMeta } from "../lib/chama-acesa/marcos.ts";
import { montarDiaContinuo, ORACOES_CONTINUAS } from "../lib/chama-acesa/continuo.ts";
import { diasConcluidos, jornadaCompleta, MAX_DIA } from "../lib/chama-acesa/regras.ts";
import { eduzz, kindDeContratoEduzz, statusDoAcesso } from "../lib/webhook-eduzz.ts";
import { textosVitalicio, PARCELA_PADRAO } from "../lib/chama-acesa/precos.ts";

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

test("metas: 3, 7, 14, 21 dias de chama e jornada completa", () => {
  let e = estadoVazio();
  const vistas = {};
  for (let d = 1; d <= 21; d += 1) {
    const r = completar(e, d, somarDias(D0, d - 1));
    e = r.estado;
    for (const m of r.novasMedalhas) vistas[m] = d;
  }
  assert.deepEqual(vistas, { meta3: 3, meta7: 7, meta12: 12, meta14: 14, meta21: 21, jornada: 21 });
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


// ================================================================== Bíblia: planos, progresso, notas, lembrete e IA

const caps = (plano) => plano.dias.flatMap(capitulosDosTrechos).map((p) => `${p.sigla}:${p.cap}`);
const TODOS = LIVROS_BIBLIA.flatMap(([sigla, , n]) => Array.from({ length: n }, (_, i) => `${sigla}:${i + 1}`));
const plano = (id) => PLANOS.find((p) => p.id === id);
const novoId = (() => { let n = 0; return () => `id-${++n}`; })();
const bib = (e, acao, hoje = D0) => aplicarBiblia(e, acao, hoje, { novoId, agora: `${hoje}T10:00:00.000Z` });

test("Bíblia: são 66 livros e 1189 capítulos, e o texto de cada livro bate com o índice", () => {
  assert.equal(LIVROS_BIBLIA.length, 66);
  assert.equal(TODOS.length, TOTAL_CAPITULOS);
  assert.equal(TOTAL_CAPITULOS, 1189);
  for (const [sigla, , n] of LIVROS_BIBLIA) {
    const t = JSON.parse(readFileSync(new URL(`../public/chama-acesa/biblia/${sigla}.json`, import.meta.url), "utf8"));
    assert.equal(t.capitulos.length, n, sigla);
  }
});

test("plano completo em 1 ano: 365 leituras, ordem canônica e os 1189 capítulos exatamente uma vez", () => {
  const p = plano("completa-1-ano");
  assert.equal(p.dias.length, 365);
  assert.ok(p.dias.every((d) => d.length > 0));
  const lista = caps(p);
  assert.deepEqual(lista, TODOS, "mesma ordem da Bíblia, sem repetir nem faltar");
});

test("plano cronológico: 365 leituras, os 1189 capítulos exatamente uma vez e ordem histórica (não a canônica)", () => {
  const p = plano("cronologica-1-ano");
  assert.equal(p.dias.length, 365);
  assert.ok(p.dias.every((d) => d.length > 0));
  const lista = caps(p);
  assert.equal(lista.length, 1189);
  assert.deepEqual([...lista].sort(), [...TODOS].sort());
  assert.notDeepEqual(lista, TODOS);
  const pos = (k) => lista.indexOf(k);
  assert.ok(pos("gen:11") < pos("job:1") && pos("job:42") < pos("gen:12"), "Jó entra depois de Gênesis 11 e antes de Gênesis 12");
  assert.ok(pos("2sa:11") < pos("psa:51") && pos("psa:51") < pos("2sa:13"), "Salmo 51 junto do pecado de Davi");
  assert.ok(pos("psa:90") > pos("num:1") && pos("psa:90") < pos("deu:1"), "Salmo 90 (Moisés) em Números");
  assert.ok(pos("jon:1") < pos("amo:1") && pos("amo:9") < pos("hos:1"), "profetas na ordem dos reinados");
  assert.ok(pos("act:12") < pos("gal:1") && pos("gal:6") < pos("act:15") && pos("1th:1") < pos("1co:1") && pos("1co:16") < pos("rom:1"), "cartas de Paulo dentro de Atos");
  assert.ok(pos("act:28") < pos("eph:1") && pos("rev:22") === lista.length - 1, "cartas da prisão após Atos; Apocalipse por último");
  assert.ok(pos("mal:4") < pos("joh:1"), "Antigo Testamento antes dos Evangelhos");
});

test("os dias dos planos são trechos válidos e as cargas ficam equilibradas", () => {
  const versos = (sigla, cap) => JSON.parse(readFileSync(new URL(`../public/chama-acesa/biblia/${sigla}.json`, import.meta.url), "utf8")).capitulos[cap - 1].length;
  const cache = {};
  const v = (s, c) => (cache[`${s}${c}`] ??= versos(s, c));
  for (const p of PLANOS) {
    for (const d of p.dias) for (const [s, a, b] of d) {
      const l = LIVROS_BIBLIA.find((x) => x[0] === s);
      assert.ok(l && a >= 1 && b >= a && b <= l[2], `${p.id}: trecho ${s} ${a}-${b}`);
    }
  }
  for (const id of ["completa-1-ano", "cronologica-1-ano"]) {
    const cargas = plano(id).dias.map((d) => capitulosDosTrechos(d).reduce((t, c) => t + v(c.sigla, c.cap), 0));
    assert.ok(Math.min(...cargas) >= 40, `${id}: nenhuma leitura minúscula`);
    assert.ok(Math.max(...cargas) <= 176, `${id}: só o Salmo 119 passa de 150 versículos`);
  }
});

test("Conhecer Jesus: 30 dias, cada capítulo dos 4 Evangelhos uma vez e os textos-chave", () => {
  const p = plano("conhecer-jesus");
  assert.equal(p.dias.length, 30);
  assert.equal(p.titulos.length, 30);
  const lista = caps(p);
  const ev = lista.filter((k) => /^(mat|mar|luk|joh):/.test(k));
  assert.equal(ev.length, 89);
  assert.equal(new Set(ev).size, 89);
  for (const [s, n] of [["mat", 28], ["mar", 16], ["luk", 24], ["joh", 21]]) for (let c = 1; c <= n; c++) assert.ok(lista.includes(`${s}:${c}`), `${s} ${c}`);
  for (const k of ["isa:53", "psa:22", "1co:15"]) assert.ok(lista.includes(k), k);
  assert.equal(new Set(lista).size, lista.length, "nada repetido");
});

test("Novo Testamento em 90 dias e Salmos e Provérbios em 31 dias", () => {
  const nt = plano("novo-testamento-90");
  assert.equal(nt.dias.length, 90);
  assert.deepEqual(caps(nt), TODOS.filter((k) => /^(mat|mar|luk|joh|act|rom|1co|2co|gal|eph|phi|col|1th|2th|1ti|2ti|tit|phm|heb|jam|1pe|2pe|1jo|2jo|3jo|jud|rev):/.test(k)));
  assert.equal(caps(nt).length, 260);
  const sp = plano("salmos-proverbios-31");
  assert.equal(sp.dias.length, 31);
  const lista = caps(sp);
  assert.equal(lista.filter((k) => k.startsWith("psa:")).length, 150);
  assert.equal(lista.filter((k) => k.startsWith("pro:")).length, 31);
  // dia N tem Provérbios N (como o dia do mês)
  sp.dias.forEach((d, i) => assert.ok(capitulosDosTrechos(d).some((c) => c.sigla === "pro" && c.cap === i + 1), `dia ${i + 1}`));
  assert.equal(new Set(lista).size, 181);
});

test("nome dos trechos em português", () => {
  assert.equal(nomeDosTrechos([["joh", 3, 3]]), "João 3");
  assert.equal(nomeDosTrechos([["gen", 1, 3]]), "Gênesis 1–3");
  assert.equal(nomeDosTrechos([["gen", 11, 11], ["job", 1, 2]]), "Gênesis 11 e Jó 1–2");
});

test("plano: o dia 1 é o dia do início; escolher, trocar e encerrar", () => {
  assert.equal(diaDoPlano("2026-12-01", "2026-12-01"), 1);
  assert.equal(diaDoPlano("2026-12-01", "2026-12-10"), 10);
  let e = estadoBibliaVazio();
  assert.match(bib(e, { tipo: "plano", id: "nao-existe" }).erro, /desconhecido/);
  e = bib(e, { tipo: "plano", id: "conhecer-jesus" }, D0).estado;
  assert.deepEqual(e.plano, { id: "conhecer-jesus", inicio: D0, feitos: [] });
  const mesmo = bib(e, { tipo: "plano", id: "conhecer-jesus" }, somarDias(D0, 3));
  assert.equal(mesmo.estado.plano.inicio, D0, "escolher o mesmo plano não zera");
  const troca = bib(e, { tipo: "plano", id: "novo-testamento-90" }, somarDias(D0, 3)).estado;
  assert.deepEqual(troca.plano, { id: "novo-testamento-90", inicio: somarDias(D0, 3), feitos: [] });
  assert.equal(bib(troca, { tipo: "plano", id: null }).estado.plano, null);
});

test("leitura de hoje, marcar como lida, atrasadas e recuperação", () => {
  let e = bib(estadoBibliaVazio(), { tipo: "plano", id: "conhecer-jesus" }, D0).estado;
  let s = situacaoDoPlano(e.plano, D0);
  assert.equal(s.diaHoje, 1);
  assert.equal(s.hoje.dia, 1);
  assert.equal(s.hoje.nome, "João 1 e Isaías 53");
  assert.equal(s.hoje.titulo, "Quem é Jesus");
  assert.equal(s.atrasadas.length, 0);
  // dia 4 sem ter lido nada: 3 atrasadas
  const d4 = somarDias(D0, 3);
  s = situacaoDoPlano(e.plano, d4);
  assert.equal(s.diaHoje, 4);
  assert.deepEqual(s.atrasadas.map((x) => x.dia), [1, 2, 3]);
  // dia futuro não vale
  assert.match(bib(e, { tipo: "marcarDia", dia: 4 }, D0).erro, /ainda não chegou/);
  assert.match(bib(e, { tipo: "marcarDia", dia: 99 }, D0).erro, /não existe/);
  assert.match(bib(estadoBibliaVazio(), { tipo: "marcarDia", dia: 1 }, D0).erro, /plano/);
  // marca o dia 2 (recupera atrasada): conta os capítulos como lidos e o dia 2 sai das atrasadas
  const r = bib(e, { tipo: "marcarDia", dia: 2 }, d4);
  assert.deepEqual(r.novosLidos.map((p) => `${p.sigla}:${p.cap}`), ["luk:1", "luk:2"]);
  e = r.estado;
  s = situacaoDoPlano(e.plano, d4);
  assert.deepEqual(s.atrasadas.map((x) => x.dia), [1, 3]);
  assert.equal(s.feitos, 1);
  assert.equal(s.percentual, 3);
  assert.deepEqual(e.lidos.luk, [1, 2]);
  assert.deepEqual(e.dias, [d4]);
  // marcar de novo é idempotente
  assert.equal(bib(e, { tipo: "marcarDia", dia: 2 }, d4).novosLidos.length, 0);
});

test("plano passou do último dia: mostra o que falta; todos feitos = concluído", () => {
  let e = bib(estadoBibliaVazio(), { tipo: "plano", id: "salmos-proverbios-31" }, D0).estado;
  const tarde = somarDias(D0, 60);
  let s = situacaoDoPlano(e.plano, tarde);
  assert.equal(s.hoje.dia, 1);
  assert.equal(s.atrasadas.length, 30);
  for (let d = 1; d <= 31; d++) e = bib(e, { tipo: "marcarDia", dia: d }, tarde).estado;
  s = situacaoDoPlano(e.plano, tarde);
  assert.equal(s.concluido, true);
  assert.equal(s.hoje, null);
  assert.equal(s.percentual, 100);
});

test("capítulo lido: 'Li este capítulo' conta uma vez, desmarcar tira, capítulo inexistente é recusado", () => {
  let e = estadoBibliaVazio();
  assert.match(bib(e, { tipo: "lido", sigla: "joh", cap: 22 }).erro, /inexistente/);
  assert.match(bib(e, { tipo: "lido", sigla: "xxx", cap: 1 }).erro, /inexistente/);
  e = bib(e, { tipo: "lido", sigla: "joh", cap: 3 }).estado;
  e = bib(e, { tipo: "lido", sigla: "joh", cap: 3 }).estado;
  assert.deepEqual(e.lidos.joh, [3]);
  let p = progressoBiblia(e.lidos);
  assert.equal(p.lidos, 1);
  e = bib(e, { tipo: "lido", sigla: "joh", cap: 1 }).estado;
  assert.deepEqual(e.lidos.joh, [1, 3]);
  e = bib(e, { tipo: "lido", sigla: "joh", cap: 3, valor: false }).estado;
  assert.deepEqual(e.lidos.joh, [1]);
  assert.equal(progressoBiblia(e.lidos).lidos, 1);
});

test("progresso: % da Bíblia, por livro e dias seguidos separados da chama", () => {
  const lidos = { joh: Array.from({ length: 21 }, (_, i) => i + 1), gen: [1, 2, 3, 3, 99], xxx: [1] };
  const p = progressoBiblia(lidos);
  assert.equal(p.total, 1189);
  assert.equal(p.lidos, 24, "únicos, só capítulos que existem");
  assert.equal(p.percentual, Math.round((24 / 1189) * 1000) / 10);
  const joao = p.porLivro.find((l) => l.sigla === "joh");
  assert.equal(joao.percentual, 100);
  const gen = p.porLivro.find((l) => l.sigla === "gen");
  assert.deepEqual([gen.lidos, gen.total, gen.percentual], [3, 50, 6]);
  assert.equal(p.porLivro.length, 66);
  assert.equal(progressoBiblia({}).percentual, 0);
  // sequência
  assert.deepEqual(sequenciaBiblia([], D0), { atual: 0, lidoHoje: false });
  assert.deepEqual(sequenciaBiblia(["2026-11-29", "2026-11-30", D0], D0), { atual: 3, lidoHoje: true });
  assert.deepEqual(sequenciaBiblia(["2026-11-29", "2026-11-30"], D0), { atual: 2, lidoHoje: false }, "ontem ainda vale");
  assert.deepEqual(sequenciaBiblia(["2026-11-28"], D0), { atual: 0, lidoHoje: false }, "quebrou");
  assert.deepEqual(sequenciaBiblia(["2026-11-20", "2026-11-21", D0], D0), { atual: 1, lidoHoje: true }, "buraco zera");
  // ler a Bíblia não mexe na chama da jornada
  const j = estadoVazio();
  const antes = JSON.stringify(j);
  bib(estadoBibliaVazio(), { tipo: "lido", sigla: "joh", cap: 3 });
  assert.equal(JSON.stringify(j), antes);
});

test("notas: criar, editar, apagar, buscar por texto/tema/livro e agrupar por livro", () => {
  let e = estadoBibliaVazio();
  assert.match(bib(e, { tipo: "nota", sigla: "joh", cap: 3, vIni: 16, vFim: 16, texto: "   " }).erro, /Escreva/);
  assert.match(bib(e, { tipo: "nota", sigla: "joh", cap: 3, vIni: 18, vFim: 16, texto: "x" }).erro, /inválido/);
  assert.match(bib(e, { tipo: "nota", sigla: "joh", cap: 40, vIni: 1, vFim: 1, texto: "x" }).erro, /inexistente/);
  let r = bib(e, { tipo: "nota", sigla: "joh", cap: 3, vIni: 16, vFim: 17, texto: "Deus amou primeiro", tema: "  Graça   de Deus " });
  e = r.estado;
  const id = r.nota.id;
  assert.equal(r.nota.tema, "Graça de Deus");
  e = bib(e, { tipo: "nota", sigla: "rom", cap: 5, vIni: 8, vFim: 8, texto: "Cristo morreu por nós", tema: "Graça de Deus" }).estado;
  e = bib(e, { tipo: "nota", sigla: "gen", cap: 1, vIni: 1, vFim: 1, texto: "No princípio", tema: "Criação" }).estado;
  assert.equal(e.notas.length, 3);
  assert.deepEqual(agruparNotasPorLivro(e.notas).map((g) => g.nome), ["Gênesis", "João", "Romanos"], "ordem da Bíblia");
  assert.equal(filtrarNotas(e.notas, "graca").length, 2, "sem acento");
  assert.equal(filtrarNotas(e.notas, "", "Criação").length, 1);
  assert.equal(filtrarNotas(e.notas, "joão 3:16").length, 1, "por referência");
  assert.equal(filtrarNotas(e.notas, "inexistente").length, 0);
  // editar mantém id e data de criação
  r = bib(e, { tipo: "nota", id, sigla: "joh", cap: 3, vIni: 16, vFim: 16, texto: "Editada", tema: "" }, "2026-12-05");
  assert.equal(r.nota.id, id);
  assert.equal(r.nota.criado, "2026-12-01T10:00:00.000Z");
  assert.equal(r.estado.notas.find((n) => n.id === id).texto, "Editada");
  assert.equal(r.estado.notas.length, 3);
  assert.match(bib(e, { tipo: "nota", id: "alheio", sigla: "joh", cap: 3, vIni: 1, vFim: 1, texto: "x" }).erro, /não encontrada/, "id de outra pessoa não vale");
  e = bib(r.estado, { tipo: "apagarNota", id }).estado;
  assert.equal(e.notas.length, 2);
  assert.match(bib(e, { tipo: "apagarNota", id }).erro, /não encontrada/);
});

test("destaques: colorir vários versículos, trocar a cor e tirar", () => {
  let e = estadoBibliaVazio();
  assert.match(bib(e, { tipo: "destaque", sigla: "joh", cap: 3, versiculos: [16], cor: "preto" }).erro, /Cor/);
  assert.match(bib(e, { tipo: "destaque", sigla: "joh", cap: 3, versiculos: [], cor: "verde" }).erro, /ao menos um/);
  e = bib(e, { tipo: "destaque", sigla: "joh", cap: 3, versiculos: [16, 17, 16], cor: "amarelo" }).estado;
  assert.deepEqual(e.destaques.map((d) => [d.v, d.cor]), [[16, "amarelo"], [17, "amarelo"]]);
  e = bib(e, { tipo: "destaque", sigla: "joh", cap: 3, versiculos: [17], cor: "azul" }).estado;
  assert.deepEqual(e.destaques.map((d) => [d.v, d.cor]).sort(), [[16, "amarelo"], [17, "azul"]]);
  e = bib(e, { tipo: "destaque", sigla: "joh", cap: 3, versiculos: [16, 17], cor: null }).estado;
  assert.equal(e.destaques.length, 0);
});

test("lembrete da leitura: horário próprio, liga e desliga, e não mexe no lembrete da jornada", () => {
  let e = estadoBibliaVazio();
  assert.match(bib(e, { tipo: "lembrete", horario: "25:00" }).erro, /inválido/);
  e = bib(e, { tipo: "lembrete", horario: "06:30" }, D0).estado;
  assert.equal(e.lembrete, "06:30");
  assert.equal(e.lembreteDesde, D0);
  assert.equal(bib(e, { tipo: "lembrete", horario: null }).estado.lembrete, null);
  assert.equal(estadoVazio().lembrete, null, "o lembrete da jornada é outro campo");
});

const perfil = (o = {}) => ({ user_id: "u1", nome: "Maria Silva", horario_lembrete: "07:00", lembrete_desde: "2026-11-25", plano_id: null, plano_inicio: null, plano_feitos: [], ultima_leitura: null, ...o });

test("quem recebe o lembrete da leitura: só na hora certa, só quem ligou, e nunca quem já leu hoje", () => {
  const hoje = "2026-12-01";
  const lista = [
    perfil({ user_id: "a" }),
    perfil({ user_id: "b", horario_lembrete: null }),
    perfil({ user_id: "c", horario_lembrete: "08:15" }),
    perfil({ user_id: "d", ultima_leitura: hoje }),
    perfil({ user_id: "e", horario_lembrete: "07:45" }),
  ];
  assert.deepEqual(quemRecebeBiblia(lista, "07", hoje).map((x) => x.perfil.user_id), ["a", "e"]);
  assert.deepEqual(quemRecebeBiblia(lista, "08", hoje).map((x) => x.perfil.user_id), ["c"]);
  assert.deepEqual(quemRecebeBiblia(lista, "09", hoje), []);
});

test("lembrete da leitura: plano em dia ou concluído não recebe; com plano mostra a leitura de hoje", () => {
  const hoje = "2026-12-03";
  const com = perfil({ plano_id: "conhecer-jesus", plano_inicio: "2026-12-01", plano_feitos: [1, 2] });
  assert.match(montarMensagemBiblia(com, hoje).corpo + montarMensagemBiblia(com, hoje).titulo, /Mateus 1–2/, "dia 3 = Mateus 1–2");
  const feito = perfil({ plano_id: "conhecer-jesus", plano_inicio: "2026-12-01", plano_feitos: [1, 2, 3] });
  assert.equal(montarMensagemBiblia(feito, hoje), null, "leitura de hoje já feita");
  const tudo = perfil({ plano_id: "salmos-proverbios-31", plano_inicio: "2026-11-01", plano_feitos: Array.from({ length: 31 }, (_, i) => i + 1), lembrete_desde: "2026-11-30" });
  assert.equal(montarMensagemBiblia(tudo, hoje), null, "plano concluído");
  const sem = montarMensagemBiblia(perfil(), hoje);
  assert.ok(sem && !sem.titulo.includes("{") && !sem.corpo.includes("{"), "sem plano: texto genérico, sem chaves");
});

test("lembrete da leitura: para de insistir depois de 14 dias sem ler e o texto varia a cada dia", () => {
  assert.ok(montarMensagemBiblia(perfil({ ultima_leitura: "2026-11-20", lembrete_desde: "2026-11-01" }), "2026-12-03"), "13 dias: ainda lembra");
  assert.equal(montarMensagemBiblia(perfil({ ultima_leitura: "2026-11-10" }), "2026-12-03"), null, "23 dias sem ler: para");
  assert.equal(montarMensagemBiblia(perfil({ ultima_leitura: null, lembrete_desde: "2026-11-01" }), "2026-12-03"), null, "nunca leu e ligou há mais de 14 dias");
  assert.ok(montarMensagemBiblia(perfil({ ultima_leitura: null, lembrete_desde: "2026-12-01" }), "2026-12-03"), "ligou há 2 dias: lembra");
  let anterior = "";
  const vistos = new Set();
  for (let i = 0; i < 16; i++) {
    const t = textoDoLembrete("u1", somarDias("2026-12-01", i), true).corpo;
    assert.notEqual(t, anterior, "nunca o mesmo texto dois dias seguidos");
    anterior = t;
    vistos.add(t);
  }
  assert.equal(vistos.size, TEXTOS_COM_PLANO.length);
  for (const t of TEXTOS_COM_PLANO) assert.ok(t.titulo.length <= 40 && t.corpo.length <= 70, `curto: ${t.corpo}`);
  // não repete o aviso da jornada: é outra tag e outro módulo; perfilDeEstado não precisa do estado da chama
  const chat = montarMensagemBiblia(perfil({ nome: null }), "2026-12-03");
  assert.ok(chat);
});

test("chave do cache: mesma passagem = mesma chave, em qualquer ordem; capítulo e versículos são diferentes", () => {
  assert.equal(compactarVersiculos([18, 16, 17, 20, 16]), "16-18,20");
  assert.equal(compactarVersiculos([5]), "5");
  const a = chaveExplicacao({ tipo: "versiculos", sigla: "joh", cap: 3, versiculos: [17, 16, 18, 20] });
  const b = chaveExplicacao({ tipo: "versiculos", sigla: "joh", cap: 3, versiculos: [16, 17, 18, 20, 20] });
  assert.equal(a, b);
  assert.equal(a, "v1|versiculos|joh|3|16-18,20");
  assert.equal(chaveExplicacao({ tipo: "capitulo", sigla: "joh", cap: 3 }), "v1|capitulo|joh|3|todos");
  assert.notEqual(a, chaveExplicacao({ tipo: "versiculos", sigla: "joh", cap: 3, versiculos: [16] }));
  assert.notEqual(a, chaveExplicacao({ tipo: "versiculos", sigla: "joh", cap: 4, versiculos: [16, 17, 18, 20] }));
});

test("pedido de explicação: valida livro, capítulo e versículos (nunca confia no cliente)", () => {
  assert.equal(validarPedido({ tipo: "capitulo", sigla: "JOH", cap: 3 }).pedido.sigla, "joh");
  assert.equal(validarPedido({ tipo: "capitulo", sigla: "joh", cap: 22 }).ok, false);
  assert.equal(validarPedido({ tipo: "capitulo", sigla: "../x", cap: 1 }).ok, false);
  assert.equal(validarPedido({ tipo: "outro", sigla: "joh", cap: 1 }).ok, false);
  assert.equal(validarPedido({ tipo: "versiculos", sigla: "joh", cap: 3, versiculos: [] }).ok, false);
  assert.equal(validarPedido({ tipo: "versiculos", sigla: "joh", cap: 3, versiculos: [0, -1, "a"] }).ok, false);
  assert.deepEqual(validarPedido({ tipo: "versiculos", sigla: "joh", cap: 3, versiculos: [17, "16", 16, 999] }).pedido.versiculos, [16, 17]);
  assert.equal(validarPedido({ tipo: "versiculos", sigla: "psa", cap: 119, versiculos: Array.from({ length: 41 }, (_, i) => i + 1) }).ok, false);
  assert.equal(validarPedido(null).ok, false);
});

test("limite diário da IA: 30 gerações novas por pessoa por dia, zera no dia seguinte", () => {
  assert.equal(LIMITE_IA_DIA, 30);
  assert.deepEqual(checarLimite(null, D0), { permitido: true, usadas: 0, restantes: 30 });
  assert.deepEqual(checarLimite({ dia: D0, n: 29 }, D0), { permitido: true, usadas: 29, restantes: 1 });
  assert.deepEqual(checarLimite({ dia: D0, n: 30 }, D0), { permitido: false, usadas: 30, restantes: 0 });
  assert.deepEqual(checarLimite({ dia: D0, n: 45 }, D0), { permitido: false, usadas: 45, restantes: 0 });
  assert.deepEqual(checarLimite({ dia: "2026-11-30", n: 30 }, D0), { permitido: true, usadas: 0, restantes: 30 }, "outro dia");
  assert.equal(checarLimite({ dia: D0, n: 5 }, D0, 5).permitido, false);
});

test("resposta da IA: normaliza, limita e recusa resposta vazia", () => {
  assert.equal(normalizarExplicacao(null), null);
  assert.equal(normalizarExplicacao({ foo: 1 }), null);
  const e = normalizarExplicacao({
    contexto: "  Contexto\n\n histórico ", autor_destinatarios: "João", antes_depois: "x", explicacao: "Explica", palavras_chave: [{ palavra: "amor", original: "agapē", significado: "amor que se dá" }, { palavra: "", significado: "lixo" }],
    referencias: [{ ref: "Romanos 5:8", motivo: "ligação" }, "texto solto"], pontos_de_vista: [{ leitura: "A", descricao: "descrição" }], consenso: "Não há consenso: ...", aplicacao: "Aplique", esboco: ["1", "2", "3", "4"],
  });
  assert.equal(e.contexto, "Contexto histórico");
  assert.equal(e.palavrasChave.length, 1);
  assert.equal(e.referencias.length, 1);
  assert.equal(e.esboco.length, 3, "esboço de 3 tópicos");
  assert.equal(e.pontosDeVista[0].leitura, "A");
  const m = explicacaoMock({ tipo: "capitulo", sigla: "joh", cap: 3 });
  assert.ok(normalizarExplicacao({ contexto: m.contexto, autor_destinatarios: m.autorDestinatarios, explicacao: m.explicacao, esboco: m.esboco }));
});

test("prompt da IA manda não inventar e dizer 'não há consenso'; texto bíblico e referência entram no pedido", () => {
  const { system, user } = montarPrompt({ tipo: "versiculos", sigla: "joh", cap: 3, versiculos: [16, 17] }, "16. Porque Deus amou o mundo");
  assert.match(system, /NÃO invente/);
  assert.match(system, /não há consenso/i);
  assert.match(system, /sem atacar/);
  assert.match(system, /exatamente 3 tópicos/);
  assert.match(user, /João 3:16–17/);
  assert.match(user, /Porque Deus amou/);
  assert.match(montarPrompt({ tipo: "capitulo", sigla: "joh", cap: 3 }, "").user, /capítulo inteiro João 3/);
  assert.equal(formatarCitacao("joh", 3, [[17, "B"], [16, "A"]]), "“16 A 17 B”\n— João 3:16–17 (Bíblia Livre)");
});

function memoria() {
  const m = new Map();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) };
}

test("armazém local da Bíblia: guarda no navegador e a IA de teste usa cache e limite como o servidor", async () => {
  const st = memoria();
  let hoje = D0;
  const b = criarBibliaLocal("t", { storage: st, hoje: () => hoje });
  let p = await b.carregar();
  assert.equal(p.ia.restantes, 30);
  p = await b.agir({ tipo: "plano", id: "completa-1-ano" });
  assert.equal(p.estado.plano.id, "completa-1-ano");
  p = await b.agir({ tipo: "lido", sigla: "gen", cap: 1 });
  // recarregando de novo (outra instância, mesmo storage) mantém
  const b2 = criarBibliaLocal("t", { storage: st, hoje: () => hoje });
  assert.deepEqual((await b2.carregar()).estado.lidos.gen, [1]);
  await assert.rejects(() => b.agir({ tipo: "marcarDia", dia: 50 }), /ainda não chegou/);
  // IA: a primeira gera, a segunda igual vem do cache e não gasta
  const r1 = await b.explicar({ tipo: "capitulo", sigla: "gen", cap: 1 });
  assert.equal(r1.ok, true);
  assert.equal(r1.cache, false);
  assert.equal(r1.restantes, 29);
  const r2 = await b.explicar({ tipo: "capitulo", sigla: "gen", cap: 1 });
  assert.equal(r2.cache, true);
  assert.equal(r2.restantes, 29);
  for (let c = 2; c <= 30; c++) assert.equal((await b.explicar({ tipo: "capitulo", sigla: "gen", cap: c })).ok, true);
  const bloqueada = await b.explicar({ tipo: "capitulo", sigla: "gen", cap: 31 });
  assert.equal(bloqueada.ok, false);
  assert.equal(bloqueada.motivo, "limite");
  assert.equal((await b.explicar({ tipo: "capitulo", sigla: "gen", cap: 1 })).ok, true, "o que já está no cache continua abrindo");
  hoje = somarDias(D0, 1);
  assert.equal((await b.explicar({ tipo: "capitulo", sigla: "gen", cap: 31 })).ok, true, "no dia seguinte o limite volta");
  assert.equal((await b.explicar({ tipo: "versiculos", sigla: "gen", cap: 1, versiculos: [] })).ok, false);
  b.dev.zerar();
  assert.equal((await b.carregar()).estado.plano, null);
});

test("bancada: a Bíblia usa o relógio simulado e 'zerar' limpa também a Bíblia", async () => {
  const st = memoria();
  const conteudo = async () => ({ dias: [], versiculos: [], ligas: normalizarLigas(null), textos: [] });
  const a = criarArmazemLocal("b", { buscarConteudo: conteudo, storage: st, relogio: () => D0 });
  await a.biblia.agir({ tipo: "plano", id: "conhecer-jesus" });
  a.dev.avancar(3);
  const p = await a.biblia.carregar();
  assert.equal(p.hoje, somarDias(D0, 3));
  assert.equal(situacaoDoPlano(p.estado.plano, p.hoje).diaHoje, 4);
  const m = await a.biblia.dev.previa();
  assert.ok(m, "prévia do lembrete com plano em andamento");
  a.dev.zerar();
  assert.equal((await a.biblia.carregar()).estado.plano, null);
});


// ============================================================ chama infinita, metas, dia contínuo, assinatura

const lerJson = (n) => JSON.parse(readFileSync(new URL(`../lib/chama-acesa/${n}`, import.meta.url), "utf8"));

// Estado de quem já está na chama N (21 dias feitos, chama contínua até ontem).
function veterano(chama, hoje = D0) {
  const concluidos = {};
  for (let d = 1; d <= 21; d += 1) concluidos[d] = somarDias(hoje, -(chama - d + 1));
  const total = Math.max(chama, 21);
  concluidos[total] = somarDias(hoje, -1); // o último dia feito (ontem): é o que libera o seguinte
  return { ...estadoVazio(), chama, maior: chama, ultimaData: somarDias(hoje, -1), concluidos, diasAtivos: total, medalhas: ["jornada"] };
}

test("chama infinita: passa do 21, do 100 e do 1000 sem travar, e o dia contínuo segue (22, 23...)", () => {
  let e = veterano(21);
  assert.equal(diaAtual(e), 22);
  assert.equal(jornadaCompleta(e), true);
  const r = completar(e, 22, D0);
  assert.equal(r.estado.chama, 22);
  assert.equal(r.estado.diasAtivos, 22);
  assert.equal(diaAtual(r.estado), 23);
  assert.equal(r.estado.concluidos[22], D0);
  e = veterano(99);
  assert.equal(completar(e, diaAtual(e), D0).estado.chama, 100);
  e = veterano(999);
  assert.equal(diaAtual(e), 1000);
  const r1000 = completar(e, 1000, D0);
  assert.equal(r1000.estado.chama, 1000);
  assert.equal(r1000.estado.maior, 1000);
  assert.ok(r1000.novasMedalhas.includes("meta1000"));
  assert.equal(podeAbrir(r1000.estado, MAX_DIA + 1, D0, true).ok, false);
});

test("dia depois do 21: continua exigindo acesso pago, um dia por dia de calendário e o anterior feito", () => {
  const e = veterano(21);
  assert.equal(podeAbrir(e, 22, D0, true).ok, true);
  assert.deepEqual(podeAbrir(e, 22, D0, false), { ok: false, motivo: "pagamento" }); // assinatura caiu: trava de novo
  assert.deepEqual(podeAbrir(e, 24, D0, true), { ok: false, motivo: "anterior" });
  const feito = completar(e, 22, D0).estado;
  assert.deepEqual(podeAbrir(feito, 23, D0, true), { ok: false, motivo: "amanha" });
  assert.equal(podeAbrir(feito, 23, somarDias(D0, 1), true).ok, true);
  assert.equal(statusDoDia(feito, 22, D0, false), "feito"); // nada é apagado: o dia feito continua feito sem assinatura
  assert.equal(feito.chama, 22);
});

test("anos de dias ativos: o total fica em diasAtivos mesmo com só os dias recentes carregados", () => {
  // Servidor: 21 dias da jornada + últimos 30 dias contínuos carregados; o total vem de dias_feitos.
  const concluidos = {};
  for (let d = 1; d <= 21; d += 1) concluidos[d] = "2026-01-01";
  for (let d = 771; d <= 800; d += 1) concluidos[d] = d === 800 ? somarDias(D0, -1) : "2028-01-01";
  const e = { ...estadoVazio(), chama: 800, maior: 800, ultimaData: somarDias(D0, -1), concluidos, diasAtivos: 800 };
  assert.equal(diasConcluidos(e), 800);
  assert.equal(diaAtual(e), 801);
  const r = aplicarAcao(e, { tipo: "check", dia: 801, check: "leu" }, D0, true);
  assert.equal(r.erro, undefined);
});

test("níveis visuais da chama crescem sem limite: 30, 50, 100 e 365 dias", () => {
  assert.deepEqual([0, 1, 2, 3, 7, 14, 21, 29, 30, 49, 50, 99, 100, 364, 365, 1000].map(nivelChama), [0, 1, 1, 2, 3, 4, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8]);
});

test("metas: disparam no dia exato, uma vez, e quem já tinha a medalha antiga não ganha de novo", () => {
  const marcos = normalizarMarcos(lerJson("marcos.json"));
  const dias = diasDasMetas(marcos);
  for (const d of [3, 7, 12, 14, 21, 25, 30, 40, 50, 70, 75, 100, 120, 150, 153, 200, 300, 365, 490, 500, 1000]) assert.ok(dias.includes(d), `meta ${d}`);
  let e = veterano(69);
  const r = completar(e, diaAtual(e), D0);
  assert.deepEqual(r.novasMedalhas, ["meta70"]);
  assert.equal(metaDoDia(70, marcos).dia, 70);
  assert.ok(!metaDoDia(70, marcos).generica);
  // dia seguinte (71): nenhuma meta; voltar a 70 (chama apagou e subiu de novo) não repete a medalha.
  const r71 = completar(r.estado, diaAtual(r.estado), somarDias(D0, 1));
  assert.deepEqual(r71.novasMedalhas, []);
  const refeita = { ...veterano(69), medalhas: ["jornada", "meta70"] };
  assert.deepEqual(completar(refeita, diaAtual(refeita), D0).novasMedalhas, []);
  // medalha antiga "chama7" vale como a meta 7
  assert.equal(temMeta(["chama7"], 7), true);
  const antigo = { ...veterano(21), chama: 6, medalhas: ["jornada", "chama3", "chama7"] };
  assert.deepEqual(completar(antigo, diaAtual(antigo), D0).novasMedalhas, []);
});

test("metas: depois do 365 vem uma genérica a cada 100 dias (sem estudo próprio); metas fixas seguem valendo", () => {
  assert.equal(ehMeta(400), true);
  assert.equal(ehMeta(600), true);
  assert.equal(ehMeta(1100), true);
  assert.equal(ehMeta(401), false);
  assert.equal(ehMeta(300, DIAS_METAS_PADRAO), true);
  assert.equal(ehMeta(200, [3]), false); // lista própria sem o 200 e antes do 365: não é meta
  const g = metaDoDia(600, [], DIAS_METAS_PADRAO);
  assert.equal(g.generica, true);
  assert.match(g.nome, /600/);
  assert.ok(g.estudo.length > 100 && g.oracao && g.pergunta);
  assert.equal(proximaMeta(0), 3);
  assert.equal(proximaMeta(21), 25);
  assert.equal(proximaMeta(365), 400);
  assert.equal(proximaMeta(400), 490);
  assert.equal(proximaMeta(500), 600);
  assert.equal(proximaMeta(1000), 1100);
  assert.equal(proximaMeta(1234), 1300);
  const r = completar(veterano(599), 600, D0);
  assert.deepEqual(r.novasMedalhas, ["meta600"]);
  // as genéricas não colidem com as metas com estudo próprio (500 e 1000 usam o estudo da lista; 490 não é múltiplo de 100)
  const marcos = normalizarMarcos(lerJson("marcos.json"));
  assert.equal(metaDoDia(500, marcos).generica, undefined);
  assert.equal(metaDoDia(1000, marcos).generica, undefined);
  assert.equal(metaDoDia(400, marcos).generica, true);
  assert.equal(metaDoDia(490, marcos).generica, undefined);
});

test("metas: estudo só de meta alcançada, XP bônus uma vez; servidor não manda o estudo das não alcançadas", () => {
  const marcos = normalizarMarcos(lerJson("marcos.json"));
  const e = { ...veterano(75), medalhas: ["meta70"] };
  const bloqueada = aplicarAcao(e, { tipo: "estudo", dia: 100 }, D0, true);
  assert.ok(bloqueada.erro);
  const ok = aplicarAcao(e, { tipo: "estudo", dia: 70 }, D0, true);
  assert.equal(ok.xpGanho, XP.estudo);
  assert.equal(ok.estado.xp, XP.estudo);
  const de_novo = aplicarAcao(ok.estado, { tipo: "estudo", dia: 70 }, D0, true);
  assert.equal(de_novo.xpGanho, 0);
  assert.equal(aplicarAcao(e, { tipo: "estudo", dia: 71 }, D0, true).erro !== undefined, true); // 71 não é meta
  const lib = marcosLiberados(marcos, 75);
  assert.ok(lib.find((m) => m.dia === 70).estudo);
  assert.equal(lib.find((m) => m.dia === 100).estudo, "");
  assert.deepEqual(metasAlcancadas({ medalhas: [], maior: 75 }, marcos).map((m) => m.dia).slice(0, 3), [75, 70, 50]);
  assert.equal(metasAlcancadas({ medalhas: [], maior: 700 }, marcos)[0].dia, 700); // genérica já alcançada aparece
});

test("marcos.json: formato esperado, 21 metas e nenhum texto provisório", () => {
  const cru = lerJson("marcos.json");
  const m = normalizarMarcos(cru);
  assert.equal(m.length, cru.length);
  assert.deepEqual(m.map((x) => x.dia), [3, 7, 12, 14, 21, 25, 30, 40, 50, 70, 75, 100, 120, 150, 153, 200, 300, 365, 490, 500, 1000]);
  for (const x of m) {
    assert.ok(x.nome && x.referencia && x.versiculo && x.estudo && x.pergunta && x.oracao, `meta ${x.dia} completa`);
    assert.ok(!/PROVISÓRIO/.test(JSON.stringify(x)), `meta ${x.dia} ainda provisória`);
    assert.ok(x.estudo.split(/\n{2,}/).length >= 3, `meta ${x.dia}: estudo com 3 a 5 parágrafos`);
  }
});

test("lembretes: medalha_perto usa as metas sem teto de 21 e {meta} é o número da meta", () => {
  const base = { tipo: "manha", hoje: "2026-12-04", chama: 69, maior: 69, ultimaData: "2026-12-03", ultimoAcesso: "2026-12-03", diasFeitos: 69, posicao: 15, zona: "neutra", sobem: 7 };
  assert.equal(categoriaDoLembrete({ ...base, chama: 69 }), "medalha_perto"); // amanhã é a meta 70
  assert.equal(categoriaDoLembrete({ ...base, chama: 50 }), "manha_normal");
  assert.equal(categoriaDoLembrete({ ...base, chama: 399 }), "medalha_perto"); // genérica 400
  const perfil = { user_id: "u", nome: "Ana", chama_atual: 69, ultima_data: "2026-12-03", ultimo_acesso: "2026-12-03", horario_lembrete: "07:00", dias_feitos: 69, xp_semana: {}, lembretes_hist: {} };
  const textos = [{ cat: "medalha_perto", tom: "x", titulo: "Perto", corpo: "Mais um dia: meta de {meta} dias, faltam {faltam}." }];
  const m = quemRecebe([perfil], "07", "2026-12-04", textos, CFG_L)[0].mensagem;
  assert.equal(m.corpo, "Mais um dia: meta de 70 dias, faltam 1.");
});

test("dia contínuo: Palavra do plano ativo; sem plano, versículo do dia; oração e missão que giram", () => {
  const missoes = lerJson("missoes.json");
  assert.ok(missoes.length >= 55);
  const versiculos = normalizarVersiculos(lerJson("versiculos.json"));
  const com = montarDiaContinuo({ dia: 40, missoes, versiculos, leitura: { nome: "João 3", plano: "Evangelho em 30 dias" } });
  assert.equal(com.doPlano, true);
  assert.equal(com.referencia, "João 3");
  assert.match(com.reflexao, /João 3/);
  const sem = montarDiaContinuo({ dia: 40, missoes, versiculos, leitura: null });
  assert.equal(sem.doPlano, false);
  assert.ok(sem.versiculo && sem.referencia);
  assert.equal(com.missao, sem.missao);
  assert.ok(missoes.includes(com.missao) && ORACOES_CONTINUAS.includes(com.oracao));
  // estável no mesmo dia e variando de um dia para o outro
  assert.equal(montarDiaContinuo({ dia: 40, missoes, versiculos }).missao, sem.missao);
  const distintas = new Set(Array.from({ length: 30 }, (_, i) => montarDiaContinuo({ dia: 22 + i, missoes, versiculos }).missao));
  assert.ok(distintas.size >= 25);
  // vazio não quebra
  assert.ok(montarDiaContinuo({ dia: 22, missoes: [], versiculos: [] }).missao);
});

test("missoes.json: curtas, em português e com Deus/Jesus/Bíblia/Senhor/Palavra em maiúscula", () => {
  const m = lerJson("missoes.json");
  assert.equal(new Set(m).size, m.length);
  for (const t of m) {
    assert.ok(t.length > 15 && t.length <= 140, t);
    assert.ok(!/\b(deus|jesus|senhor|bíblia)\b/.test(t), `minúscula: ${t}`);
    assert.ok(!/dieta|jejum/i.test(t), t);
  }
});

test("acesso: assinatura em dia libera; caiu = só o grátis; Bíblia sempre; admin vê tudo; ofertas novas e legado", () => {
  const env = { CHAMA_AREA_SLUG: "chama-acesa", CHAMA_PRODUCT_SLUGS: "chama-acesa-21-dias,chama-acesa-mensal", NODE_ENV: "production" };
  const prod = (mensal, vital) => [{ slug: "chama-acesa-21-dias", owned: vital }, { slug: "chama-acesa-mensal", owned: mensal }];
  const a = (produtos, admin = false, extra = {}) => calcularAcesso({ areaSlug: "chama-acesa", produtos, admin, env: { ...env, ...extra } });
  assert.equal(a(prod(true, false)).pago, true); // assinatura mensal em dia
  assert.equal(a(prod(false, true)).pago, true); // vitalício
  const caiu = a(prod(false, false));
  assert.equal(caiu.pago, false);
  assert.equal(caiu.biblia, true);
  assert.equal(a(prod(false, false), true).pago, true);
  assert.equal(calcularAcesso({ areaSlug: "outra", produtos: [], admin: true, env }), null);
  // links: novos + parcela padrão; legado como alternativa
  const novo = a(prod(false, false), false, { CHAMA_CHECKOUT_VITALICIO_URL: "https://chk.eduzz.com/mznmfsl3", CHAMA_CHECKOUT_MENSAL_URL: "https://chk.eduzz.com/mensal", CHAMA_CHECKOUT_URL: "https://chk.eduzz.com/antigo" });
  assert.equal(novo.ofertas.vitalicioUrl, "https://chk.eduzz.com/mznmfsl3");
  assert.equal(novo.ofertas.parcelaVitalicio, PARCELA_PADRAO);
  assert.equal(novo.checkoutUrl, "https://chk.eduzz.com/antigo");
  assert.equal(a(prod(false, false), false, { CHAMA_PARCELA_VITALICIO: "12x de R$ 14,96" }).ofertas.parcelaVitalicio, "12x de R$ 14,96");
  assert.equal(a(prod(false, false), false, { CHAMA_PARCELA_VITALICIO: "" }).ofertas.parcelaVitalicio, null);
  assert.equal(a(prod(false, false), false, { CHAMA_CHECKOUT_VITALICIO_URL: "http://inseguro" }).ofertas.vitalicioUrl, null);
  assert.deepEqual(textosVitalicio("12x de R$ 15,20"), { grande: "12x de R$ 15,20", apoio: "ou R$ 147 à vista" });
  assert.deepEqual(textosVitalicio(null), { grande: "R$ 147 à vista ou parcelado", apoio: "pagamento único" });
});

test("webhook Eduzz: assinatura cancelada/inadimplente/suspensa tira o acesso; renovação e reativação devolvem", () => {
  const contrato = (status, reason = "status_updated", contentAccess = {}) => ({
    id: "e1", event: "myeduzz.contract_updated",
    data: { products: [{ id: "3158827", name: "Chama" }], contract: { id: "C9", status, contentAccess }, customer: { name: "Ana", email: "Ana@Ex.com" }, reason },
  });
  for (const st of ["canceled", "defaulter", "suspended"]) {
    const ev = eduzz(contrato(st));
    assert.equal(ev.kind, "ended", st);
    assert.equal(ev.email, "ana@ex.com");
    assert.deepEqual(ev.externalIds, ["3158827"]);
    assert.equal(statusDoAcesso(ev.kind), "expired");
  }
  assert.equal(eduzz(contrato("late")).kind, "ignored"); // tolerância da Eduzz: ainda não cortou
  assert.equal(eduzz(contrato("late", "status_updated", { removeOnLatePayment: true })).kind, "ended");
  assert.equal(eduzz(contrato("finished")).kind, "ignored"); // vitalício parcelado que terminou de pagar mantém o acesso
  assert.equal(eduzz(contrato("finished", "status_updated", { removeOnContractEnd: true })).kind, "ended");
  assert.equal(eduzz(contrato("upToDate", "reactivation")).kind, "approved");
  assert.equal(eduzz(contrato("upToDate", "readjustment")).kind, "ignored");
  assert.equal(eduzz(contrato("awaitingPayment")).kind, "ignored");
  // renovação = fatura paga (acesso de volta)
  const paga = eduzz({ event: "myeduzz.invoice_paid", id: "x", data: { id: "F1", buyer: { email: "ana@ex.com" }, items: [{ productId: "3158827" }], contract: { id: "C9" } } });
  assert.equal(paga.kind, "approved");
  assert.equal(statusDoAcesso(paga.kind), "active");
  assert.equal(kindDeContratoEduzz({ status: "canceled" }, ""), "ended");
});

test("webhook Eduzz: compra única de outros produtos continua exatamente como antes", () => {
  const inv = (event, extra = {}) => eduzz({ event, id: "ev", data: { id: "F77", buyer: { name: "Bia", email: "Bia@x.com" }, items: [{ productId: "555", parentId: "444" }], paid: { value: 27 }, utm: { source: "membros", medium: "cadeado" }, ...extra } });
  const paga = inv("myeduzz.invoice_paid");
  assert.deepEqual([paga.kind, paga.email, paga.externalIds, paga.orderId, paga.amount, paga.utmSource], ["approved", "bia@x.com", ["555", "444"], "F77", 27, "membros"]);
  assert.equal(inv("myeduzz.invoice_refunded").kind, "refunded");
  assert.equal(inv("myeduzz.invoice_chargeback").kind, "refunded");
  assert.equal(inv("myeduzz.invoice_waiting_payment").kind, "pending");
  assert.equal(inv("myeduzz.invoice_opened").kind, "pending");
  assert.equal(inv("myeduzz.invoice_waiting_refund").kind, "ignored");
  // cancelada/expirada de fatura (compra única não paga) segue ignorada: nada é tirado
  assert.equal(inv("myeduzz.invoice_canceled").kind, "ignored");
  assert.equal(inv("myeduzz.invoice_expired").kind, "ignored");
  // eventos de contrato sem contrato válido não viram nada
  assert.equal(eduzz({ event: "myeduzz.contract_created", data: { contract: { id: "C", status: "canceled" }, customer: { email: "a@b.c" }, products: [{ id: "1" }] } }).kind, "ignored");
  // entrega customizada (create/remove) intacta
  const entrega = eduzz({ type: "create", fields: { edz_cli_email: "C@x.com", edz_cnt_cod: "9", edz_fat_cod: "7" } });
  assert.deepEqual([entrega.kind, entrega.email, entrega.rawType], ["approved", "c@x.com", "entrega_create"]);
  assert.equal(eduzz({ type: "remove", fields: { edz_cli_email: "c@x.com", edz_cnt_cod: "9" } }).kind, "refunded");
  // status de acesso: aprovado ativa, reembolso estorna, fim de assinatura expira; pendente/ignorado não gravam
  assert.deepEqual(["approved", "refunded", "ended", "pending", "ignored"].map(statusDoAcesso), ["active", "refunded", "expired", null, null]);
});
