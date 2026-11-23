// Testes do motor da Reforma: node --test tests/reforma-motor.test.mjs
//  1) casos-ouro.json (gabarito da planilha): todos os campos, diferença 0 (R$ no centavo; taxas até 1e-9, como o compara.py do gabarito)
//  2) casos-estendidos.json (tests/reforma/calcula_estendido.py): 10 casos nos 8 anos + 11 casos NOVOS (5ª/6ª faixa, Anexos II/IV/V, premissa, fornecedor do Simples)
//  3) bordas, validações e parâmetros injetados.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { calcularReforma } from "../lib/reforma/motor.ts";
import { PARAMETROS_PADRAO as P, TABELAS_SIMPLES_PADRAO as T } from "../lib/reforma/padrao.ts";
import { D } from "../lib/reforma/decimal.ts";

const lerJson = (nome) => JSON.parse(readFileSync(new URL(`./reforma/${nome}`, import.meta.url), "utf8"));
const OURO = lerJson("casos-ouro.json").casos;
const EXT = lerJson("casos-estendidos.json");
const FMT = lerJson("formatos-campos.json");

// ---------------------------------------------------------------- entradas dos casos (mesmas do calcula.py)
const F = (o) => ({ margemAtual: "0.15", ...o });
const CASOS = {
  Caso01: F({ regime: "presumido", receitaMensal: 60000, issPercentual: "0.05", percentualVendasPJ: "0.9", reducao: { percentual: "0.3", motivo: "profissao_regulamentada" }, comprasComCredito: { fornecedoresRegulares: 8000 } }),
  Caso02: F({ regime: "simples", anexoSimples: "III", receitaMensal: 40000, rbt12: 480000, percentualVendasPJ: "0.9", reducao: { percentual: "0.3", motivo: "profissao_regulamentada" }, comprasComCredito: { fornecedoresRegulares: 5000 } }),
  Caso03: F({ regime: "presumido", receitaMensal: 120000, issPercentual: "0.03", percentualVendasPJ: 0, reducao: { percentual: "0.6", motivo: "saude" }, comprasComCredito: { fornecedoresRegulares: 15000 } }),
  Caso04: F({ regime: "simples", anexoSimples: "I", receitaMensal: 90000, rbt12: 1080000, percentualVendasPJ: 0, reducao: { percentual: "0.4", motivo: "restaurantes_hotelaria" }, comprasComCredito: { fornecedoresRegulares: 17500, fornecedoresSimples: [{ nome: "fornecedor do Simples", valor: 17500, anexo: "I", rbt12: 270000 }] } }),
  Caso05: F({ regime: "simples", anexoSimples: "I", receitaMensal: 250000, rbt12: 3000000, percentualVendasPJ: 1, comprasComCredito: { fornecedoresRegulares: 170000 }, comparativoRegular: { issPercentual: "0", icmsPercentual: "0.03" } }),
  Caso06: F({ regime: "real", receitaMensal: 400000, icmsPercentual: "0.04", percentualVendasPJ: 0, comprasComCredito: { fornecedoresRegulares: 260000 } }),
  Caso07: F({ regime: "presumido", receitaMensal: 80000, issPercentual: "0.02", percentualVendasPJ: 1, comprasComCredito: { fornecedoresRegulares: 10000 } }),
  Caso08: F({ regime: "simples", anexoSimples: "III", receitaMensal: 30000, rbt12: 360000, percentualVendasPJ: 1, comprasComCredito: { fornecedoresRegulares: 3000 } }),
  Caso09: F({ regime: "presumido", receitaMensal: 50000, issPercentual: "0.05", percentualVendasPJ: "0.8", reducao: { percentual: "0.3", motivo: "profissao_regulamentada" }, comprasComCredito: { fornecedoresRegulares: 4000 } }),
  Caso10: { regime: "mei", receitaMensal: 5000, percentualVendasPJ: 0, atividadeMei: "servico" },
  // novos
  Caso11: F({ regime: "simples", anexoSimples: "III", receitaMensal: 250000, rbt12: 3000000, percentualVendasPJ: "0.9", reducao: { percentual: "0.3", motivo: "profissao_regulamentada" }, comprasComCredito: { fornecedoresRegulares: 20000 } }),
  Caso12: F({ regime: "simples", anexoSimples: "III", receitaMensal: 60000, rbt12: 1900000, percentualVendasPJ: "0.9", comprasComCredito: { fornecedoresRegulares: 5000 } }),
  Caso13: F({ regime: "simples", anexoSimples: "II", receitaMensal: 50000, rbt12: 600000, percentualVendasPJ: 1, comprasComCredito: { fornecedoresRegulares: 15000, fornecedoresSimples: [{ valor: 10000, anexo: "II", rbt12: 600000 }] } }),
  Caso14: F({ regime: "simples", anexoSimples: "IV", receitaMensal: 120000, rbt12: 2500000, percentualVendasPJ: 1, reducao: { percentual: "0.3", motivo: "profissao_regulamentada" }, comprasComCredito: { fornecedoresRegulares: 30000 } }),
  Caso15: F({ regime: "simples", anexoSimples: "IV", receitaMensal: 40000, rbt12: 500000, percentualVendasPJ: "0.5", comprasComCredito: { fornecedoresRegulares: 6000 } }),
  Caso16: F({ regime: "simples", anexoSimples: "V", receitaMensal: 35000, rbt12: 600000, percentualVendasPJ: "0.8", comprasComCredito: { fornecedoresRegulares: 4000 } }),
  Caso17: F({ regime: "simples", anexoSimples: "I", receitaMensal: 350000, rbt12: 4000000, percentualVendasPJ: 1, icmsPercentual: "0.03", comprasComCredito: { fornecedoresRegulares: 200000 } }),
  Caso18: F({ regime: "simples", anexoSimples: "III", receitaMensal: 380000, rbt12: 4200000, percentualVendasPJ: "0.9", issPercentual: "0.05", comprasComCredito: { fornecedoresRegulares: 20000 } }),
  Caso19: F({ regime: "presumido", receitaMensal: 60000, issPercentual: "0.05", percentualVendasPJ: "0.9", reducao: { percentual: "0.3", motivo: "profissao_regulamentada" }, premissaFornecedores: "preco_final", comprasComCredito: { fornecedoresRegulares: 8000 } }),
  Caso20: F({ regime: "presumido", receitaMensal: 80000, issPercentual: "0.02", percentualVendasPJ: "0.7", reducao: { percentual: "0.3", motivo: "profissao_regulamentada" }, comprasComCredito: { fornecedoresRegulares: 12000, fornecedoresSimples: [{ valor: 18000, anexo: "III", rbt12: 500000 }] } }),
  Caso21: F({ regime: "simples", anexoSimples: "III", receitaMensal: 250000, rbt12: 3000000, percentualVendasPJ: "0.9", reducao: { percentual: "0.3", motivo: "profissao_regulamentada" }, comprasComCredito: { fornecedoresRegulares: 14000, fornecedoresSimples: [{ valor: 6000, anexo: "IV", rbt12: 2500000 }] } }),
};

const calc = (e, p = P, t = T) => {
  const r = calcularReforma(e, p, t);
  assert.ok(r.ok, `cálculo falhou: ${JSON.stringify(r.erros)}`);
  return r.resultado;
};
const RESULT = Object.fromEntries(Object.entries(CASOS).map(([c, e]) => [c, calc(e)]));

// onde mora cada campo do gabarito no resultado do motor
function acha(ano, k) {
  if (ano.mei) return [ano.mei, k];
  if (k.startsWith("rg_")) return [ano.comparativoRegular, k.slice(3)];
  return [ano.regular ?? ano.simples, k];
}

// ---------------------------------------------------------------- 1) gabarito casos-ouro.json
test("casos-ouro.json: todos os campos, diferença 0", () => {
  let campos = 0;
  const falhas = [];
  const porCaso = {};
  for (const caso of Object.keys(OURO).sort()) {
    let n = 0;
    for (const [anoStr, campo] of Object.entries(OURO[caso].anos)) {
      const ano = RESULT[caso].anos[Number(anoStr)];
      for (const [k, esperado] of Object.entries(campo)) {
        const [bloco, kk] = acha(ano, k);
        const txt = bloco?.[kk];
        n++;
        campos++;
        if (txt === undefined) { falhas.push(`${caso} ${anoStr} ${k}: campo ausente no motor`); continue; }
        const got = Number(txt);
        const fmt = FMT[caso][k];
        if (fmt === "money" || fmt === "int" || fmt === "num") {
          // dinheiro: diferença exatamente 0 (compara o texto decimal com o valor do gabarito)
          if (got !== esperado) falhas.push(`${caso} ${anoStr} ${k}: gabarito ${esperado} × motor ${txt}`);
        } else if (Math.abs(got - esperado) > 1e-9) {
          falhas.push(`${caso} ${anoStr} ${k}: gabarito ${esperado} × motor ${txt}`);
        }
      }
    }
    porCaso[caso] = n;
  }
  console.log(`  casos-ouro: ${campos} campos comparados em ${Object.keys(porCaso).length} casos, ${falhas.length} diferenças`);
  assert.deepEqual(falhas, []);
  assert.equal(campos, 1376);
});

// ---------------------------------------------------------------- 2) calcula_estendido.py (8 anos + casos novos)
const EXTRAS = {
  // campo do python -> [bloco, campo] no motor ou função que pega da opção
  cbs_ibs_no_preco: (a) => a.opcoes.find((o) => o.id === "regime_atual").cbsIbsNoPreco,
  custo_real_cliente_pj: (a) => a.opcoes.find((o) => o.id === "regime_atual").custoRealClientePJ,
  margem_se_manter_preco: (a) => a.opcoes.find((o) => o.id === "regime_atual").margemSeManterPreco,
  cbs_ibs_no_preco_das: (a) => a.opcoes.find((o) => o.id === "das").cbsIbsNoPreco,
  custo_real_das_pj: (a) => a.opcoes.find((o) => o.id === "das").custoRealClientePJ,
  margem_das_se_manter_preco: (a) => a.opcoes.find((o) => o.id === "das").margemSeManterPreco,
  cbs_ibs_no_preco_hib: (a) => a.opcoes.find((o) => o.id === "hibrido").cbsIbsNoPreco,
  custo_real_hib_pj: (a) => a.opcoes.find((o) => o.id === "hibrido").custoRealClientePJ,
  margem_hib_se_manter_preco: (a) => a.opcoes.find((o) => o.id === "hibrido").margemSeManterPreco,
};
test("calcula_estendido.py: 21 casos nos 8 anos (texto decimal idêntico)", () => {
  let campos = 0;
  const falhas = [];
  for (const caso of Object.keys(EXT)) {
    for (const [anoStr, c] of Object.entries(EXT[caso])) {
      const ano = RESULT[caso].anos[Number(anoStr)];
      for (const [k, esperado] of Object.entries(c)) {
        let got;
        if (k.startsWith("rg_") && k.slice(3) in EXTRAS) continue; // extras de preço do comparativo não são expostos
        if (k in EXTRAS) got = EXTRAS[k](ano);
        else { const [b, kk] = acha(ano, k); got = b?.[kk]; }
        campos++;
        if (got !== esperado) falhas.push(`${caso} ${anoStr} ${k}: python ${esperado} × motor ${got}`);
      }
    }
  }
  console.log(`  estendido: ${campos} campos comparados em ${Object.keys(EXT).length} casos × 8 anos, ${falhas.length} diferenças`);
  assert.deepEqual(falhas.slice(0, 20), []);
});

test("casos fora do gabarito vêm marcados semGabarito, com o motivo", () => {
  const sg = (caso, ano) => RESULT[caso].anos[ano].semGabarito;
  const motivos = (caso, ano) => RESULT[caso].anos[ano].motivosSemGabarito.join(" | ");
  assert.equal(sg("Caso01", 2027), false);
  assert.equal(sg("Caso01", 2028), true); // ano sem gabarito
  assert.equal(sg("Caso02", 2033), false);
  assert.equal(sg("Caso11", 2027), true);
  assert.match(motivos("Caso11", 2027), /5ª faixa com alíquota efetiva acima de 14,92537%/);
  assert.match(motivos("Caso13", 2027), /Anexo II/);
  assert.match(motivos("Caso14", 2027), /Anexo IV/);
  assert.match(motivos("Caso16", 2027), /Anexo V/);
  assert.match(motivos("Caso17", 2027), /6ª faixa/);
  assert.equal(sg("Caso12", 2029), true); // III, 5ª faixa: sem caso-ouro
  assert.equal(sg("Caso05", 2029), false); // I, 5ª faixa: coberto
  // um caso coberto não deve ganhar motivo sem querer
  assert.deepEqual(RESULT.Caso08.anos[2027].motivosSemGabarito, []);
});

// ---------------------------------------------------------------- 3) bordas e leis
test("Anexo III 5ª faixa: regra especial do teto de ISS só acima de 14,92537%", () => {
  const acima = RESULT.Caso11.anos[2027].simples; // efetiva 16,81%
  const abaixo = RESULT.Caso12.anos[2027].simples; // efetiva 14,39%
  // acima: ISS fixo em 5% => parte do ISS = 0,05 / efetiva; CBS = (ef - 5%) x 23,20% / ef
  const ef = Number(acima.efetiva);
  assert.ok(Math.abs(Number(acima.p_issicms) - 0.05 / ef) < 1e-9);
  assert.ok(Math.abs(Number(acima.p_cbs) - ((ef - 0.05) * 0.232) / ef) < 1e-9);
  assert.ok(Math.abs(Number(acima.p_ibs) - ((ef - 0.05) * 0.0026) / ef) < 1e-9);
  // abaixo: a linha da tabela (ISS 33,5%, CBS 15,43%, IBS 0,17%)
  assert.equal(abaixo.p_issicms, "0.335000000000");
  assert.equal(abaixo.p_cbs, "0.154300000000");
  // a soma das partes do DAS continua 100% no excedente (CBS + IBS + ISS + IRPJ + CSLL + CPP)
  const esp = T.faixa5Especial.filter((x) => x.anexo === "III" && x.ano === 2027)[0];
  const soma = Object.values(esp.partilhaDoExcedente).reduce((s, v) => s.mais(v), D(0));
  assert.ok(soma.igual("1"));
});

test("dentro do DAS a redução setorial não vale; no híbrido vale", () => {
  const s = RESULT.Caso02.anos[2027].simples;
  assert.equal(s.t_cbs, "0.078400000000");
  assert.equal(s.t_ibs, "0.000700000000");
});

test("fator ICMS/ISS e cronograma 2028 e 2030-2032 vêm dos parâmetros", () => {
  const a = RESULT.Caso01.anos;
  assert.equal(a[2028].aliquotas.cbsPadrao, a[2027].aliquotas.cbsPadrao); // 2028 = regras de 2027
  assert.equal(a[2028].regular.total, a[2027].regular.total);
  assert.equal(a[2029].aliquotas.fatorIcmsIss, "0.900000000000");
  assert.equal(a[2030].aliquotas.fatorIcmsIss, "0.800000000000");
  assert.equal(a[2031].aliquotas.fatorIcmsIss, "0.700000000000");
  assert.equal(a[2032].aliquotas.fatorIcmsIss, "0.600000000000");
  // IBS proporcional (estimativa): 20% / 30% / 40% do pleno de 15,2%
  assert.equal(a[2030].aliquotas.ibsPadrao, "0.030400000000");
  assert.equal(a[2031].aliquotas.ibsPadrao, "0.045600000000");
  assert.equal(a[2032].aliquotas.ibsPadrao, "0.060800000000");
  assert.equal(a[2033].aliquotas.ibsPadrao, "0.152000000000");
});

test("o motor lê os parâmetros do argumento: mudar a CBS de 2027 muda o resultado", () => {
  const p2 = structuredClone(P);
  p2.porAno["2027"].cbsReferencia.valor = "0.12";
  const r = calc(CASOS.Caso01, p2);
  // 12% - 0,1 p.p. = 11,9%; x 0,7 = 8,33%
  assert.equal(r.anos[2027].regular.t_cbs, "0.083300000000");
  assert.notEqual(r.anos[2027].regular.total, RESULT.Caso01.anos[2027].regular.total);
  assert.equal(r.anos[2026].regular.total, RESULT.Caso01.anos[2026].regular.total);
});

test("arredondamento: meio centavo para cima (empate do Caso 5, 250.000 x 11,39% x 15,5%)", () => {
  assert.equal(D("250000").vezes("0.1139").vezes("0.155").arredondar().texto(), "4413.63");
  assert.equal(D("0.005").arredondar().texto(), "0.01");
  assert.equal(D("1.005").arredondar().texto(), "1.01"); // em float daria 1.00
  assert.equal(D("0.1").mais("0.2").texto(20), "0.30000000000000000000"); // sem erro de float
});

test("Jarvis: preço, custo real do cliente PJ e margem, DAS × híbrido (Caso 2, 2027)", () => {
  const a = RESULT.Caso02.anos[2027];
  const das = a.opcoes.find((o) => o.id === "das");
  const hib = a.opcoes.find((o) => o.id === "hibrido");
  assert.equal(das.precoNecessario, "40000.00");
  assert.equal(hib.precoNecessario, "41356.59");
  assert.equal(hib.custoRealClientePJ, "38414.99"); // preço - crédito de CBS/IBS destacado
  assert.equal(das.custoRealClientePJ, "39347.62"); // 40.000 - 652,38 de crédito dentro do DAS
  assert.ok(Number(hib.custoRealClientePJ) < Number(das.custoRealClientePJ)); // híbrido sai mais barato para o cliente PJ
  assert.ok(Number(hib.precoNecessario) > Number(das.precoNecessario)); // mesmo com preço de tabela maior
  assert.equal(das.impostoRecolhido, "3930.00");
  assert.equal(hib.impostoRecolhido, "5775.59");
  assert.ok(Math.abs(Number(hib.margemSeManterPreco)) < Number(hib.margemComPrecoNecessario)); // sem reajustar, a margem do híbrido cai
});

test("memória de cálculo e avisos", () => {
  const r = RESULT.Caso02;
  for (const ano of Object.values(r.anos)) {
    assert.ok(ano.memoria.length >= 8);
    for (const l of ano.memoria) {
      assert.ok(l.rotulo && l.formula && l.fonte && l.valor !== undefined, JSON.stringify(l));
    }
  }
  const textos = r.avisos.map((a) => a.texto).join("\n");
  assert.match(textos, /11,3% \(cálculo do TCU\)/);
  assert.match(textos, /Senado/);
  assert.match(textos, /20\/12\/2026/);
  assert.ok(r.avisos.some((a) => a.tipo === "estimativa"));
  assert.match(RESULT.Caso19.avisos.map((a) => a.texto).join("\n"), /mantêm o preço final/);
});

test("MEI: valores fixos por ano, comércio e serviço", () => {
  const r = RESULT.Caso10.anos;
  assert.equal(r[2027].mei.total, "6.00");
  assert.equal(r[2029].mei.total, "5.70");
  assert.equal(r[2033].mei.total, "3.00");
  const c = calc({ regime: "mei", receitaMensal: 5000, percentualVendasPJ: 0, atividadeMei: "comercio_e_servico" });
  assert.equal(c.anos[2027].mei.total, "7.00"); // Anexo VII: 1 + 5 + 0,994 + 0,006
  assert.equal(c.anos[2032].mei.total, "5.40");
});

// ---------------------------------------------------------------- validações
const erros = (e) => {
  const r = calcularReforma(e, P, T);
  assert.equal(r.ok, false, "deveria dar erro");
  return r.erros.join(" | ");
};
const ok = CASOS.Caso01;

test("validações em português", () => {
  assert.match(erros({ ...ok, receitaMensal: -1 }), /Receita mensal não pode ser negativo/);
  assert.match(erros({ ...ok, receitaMensal: 0 }), /maior que zero/);
  assert.match(erros({ ...ok, receitaMensal: "abc" }), /não é um número válido/);
  assert.match(erros({ ...ok, percentualVendasPJ: 1.5 }), /não pode passar de 100%/);
  assert.match(erros({ ...ok, percentualVendasPJ: 90 }), /fração entre 0 e 1/);
  assert.match(erros({ ...ok, issPercentual: "-0.05" }), /ISS efetivo não pode ser negativo/);
  assert.match(erros({ ...ok, margemAtual: "1" }), /Margem atual deve ser menor que 100%/);
  assert.match(erros({ ...ok, margemAtual: undefined }), /Margem atual: informe um valor/);
  assert.match(erros({ ...ok, reducao: { percentual: "0.35", motivo: "x" } }), /não existe na lei/);
  assert.match(erros({ ...ok, reducao: { percentual: "0.3", motivo: "" } }), /sem o motivo/);
  assert.match(erros({ ...ok, reducao: { percentual: "0.6", motivo: "profissao_regulamentada" } }), /prevê redução de 30%/);
  assert.match(erros({ ...CASOS.Caso02, rbt12: 4800000.01 }), /acima do limite do Simples/);
  assert.match(erros({ ...CASOS.Caso02, rbt12: undefined }), /RBT12/);
  assert.match(erros({ ...CASOS.Caso02, anexoSimples: undefined }), /anexo do Simples/);
  assert.match(erros({ ...ok, regime: "lucro" }), /Regime inválido/);
  assert.match(erros({ ...ok, comprasComCredito: { fornecedoresRegulares: -5 } }), /não pode ser negativo/);
  assert.match(erros({ ...ok, comprasComCredito: { fornecedoresSimples: [{ valor: 100, anexo: "I", rbt12: 5000000 }] } }), /acima do limite do Simples/);
  assert.match(erros({ ...ok, premissaFornecedores: "tanto-faz" }), /Premissa dos fornecedores inválida/);
  assert.match(erros({ regime: "mei", receitaMensal: 8000, percentualVendasPJ: 0 }), /limite do MEI/);
  // margem + impostos impossíveis: erro legível em vez de número absurdo
  assert.match(erros({ ...ok, margemAtual: "0.95", issPercentual: "0.1" }), /passa de 100% da receita/);
});

test("borda do Simples: RBT12 = R$ 4.800.000,00 passa (6ª faixa); 180.000,00 e 180.000,01 mudam de faixa", () => {
  const e = { ...CASOS.Caso02, rbt12: "4800000", receitaMensal: 300000 };
  assert.equal(calc(e).anos[2027].simples.faixa, "6");
  assert.equal(calc({ ...CASOS.Caso02, rbt12: "180000" }).anos[2027].simples.faixa, "1");
  assert.equal(calc({ ...CASOS.Caso02, rbt12: "180000.01" }).anos[2027].simples.faixa, "2");
  assert.equal(calc({ ...CASOS.Caso02, rbt12: "3600000.01", receitaMensal: 300000 }).anos[2027].simples.faixa, "6");
});

test("saída é texto decimal: nada de float em dinheiro", () => {
  const b = RESULT.Caso02.anos[2027].simples;
  for (const [k, v] of Object.entries(b)) assert.equal(typeof v, "string", k);
  assert.match(b.das, /^\d+\.\d{2}$/);
});

test("fornecedor do Simples: alíquota efetiva informada substitui a calculada", () => {
  const base = CASOS.Caso04;
  const comEf = calc({ ...base, comprasComCredito: { fornecedoresRegulares: 17500, fornecedoresSimples: [{ valor: 17500, anexo: "I", rbt12: 270000, aliquotaEfetiva: "0.10" }] } });
  assert.equal(comEf.anos[2027].simples.f_efetiva, "0.100000000000");
  assert.notEqual(comEf.anos[2027].simples.cbs_cred, RESULT.Caso04.anos[2027].simples.cbs_cred);
});

test("premissa 'preço final': o crédito sai de dentro do preço", () => {
  const sem = RESULT.Caso01.anos[2027].regular;
  const fin = RESULT.Caso19.anos[2027].regular;
  assert.ok(Number(fin.cbs_cred) < Number(sem.cbs_cred));
  // 8000 / (1 + 11,2% + 0,1%) x 11,2% = 805,03
  assert.equal(fin.cbs_cred, "805.03");
});
