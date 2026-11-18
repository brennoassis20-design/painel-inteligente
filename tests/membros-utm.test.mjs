// Teste rápido do padrão de UTM: node tests/membros-utm.test.mjs
import { tagLink, tagPlainLink, compactOrigin, normalizeMedium } from "../lib/membros-utm.ts";

const origem = { utm_source: "meta", utm_campaign: "rd-teste", utm_content: "r7", fbclid: "IwAR123" };
const { fbclid, ...so } = origem;
const casos = [
  ["eduzz", "https://chk.eduzz.com/vehdszcy?u=1"],
  ["cakto", "https://pay.cakto.com.br/abc123"],
  ["hotmart", "https://pay.hotmart.com/X1234?off=zz"],
  ["cakto-promo-black", "https://pay.cakto.com.br/xyz?utm_source=black6meses&utm_campaign=black"],
];
const vias = [["cadeado", "tile"], ["cadeado-aula", "aula-bloqueada"], ["upsell-aula", "proximo-passo"], ["promo", "comprar-por"], ["ofertas", "quero-este"]];
let falhas = 0;
const ok = (c, m) => { if (!c) { falhas++; console.log("FALHOU:", m); } };
for (const [prov, url] of casos) {
  for (const [via, content] of vias) {
    for (const com of [true, false]) {
      const r = tagLink(url, { medium: normalizeMedium(via), campaign: "reforma-desenhada", content, origin: com ? so : null, provider: prov.split("-")[0], email: "a@b.com", fbclid: com ? fbclid : undefined });
      if (prov === "eduzz" || prov.startsWith("cakto-promo")) { if (via === "cadeado" || via === "promo") console.log(`${prov} | ${via} | ${com ? "com origem" : "sem origem"}\n  ${r.url}`); }
      else if (via === "cadeado-aula" || via === "upsell-aula") console.log(`${prov} | ${via} | ${com ? "com origem" : "sem origem"}\n  ${r.url}`);
      const u = new URL(r.url);
      if (!prov.includes("black")) {
        ok(u.searchParams.get("utm_source") === "membros", "source " + r.url);
        ok(u.searchParams.get("utm_medium") === via, "medium " + r.url);
        ok(com ? u.searchParams.get("utm_term") === "meta.rd-teste.r7" : !u.searchParams.has("utm_term"), "term " + r.url);
      } else {
        ok(u.searchParams.get("utm_source") === "black6meses", "black source " + r.url);
        ok(u.searchParams.get("utm_campaign") === "black", "black campaign " + r.url);
        ok(u.searchParams.get("utm_medium") === via, "black medium preenchido " + r.url);
      }
      if (prov === "eduzz") ok(!u.searchParams.has("sck"), "eduzz sem sck");
      else ok(u.searchParams.get("sck") === `membros_${via}_${content}`, "sck " + r.url);
    }
  }
}
console.log("compactOrigin vazio:", JSON.stringify(compactOrigin({})), "| origem da própria área:", JSON.stringify(compactOrigin({ utm_source: "membros" })));
console.log("aviso-email:", tagPlainLink("https://membros.bagencymidia.site/?p=reforma-desenhada", { medium: "aviso-email", campaign: "reforma-desenhada", content: "uuid-1" }));
console.log("ver tudo:", tagPlainLink("https://reforma.kitsepromocoes.site/", { medium: "pagina-produto", campaign: "reforma-desenhada", content: "ver-tudo", term: "meta.rd-teste.r7" }));
console.log("suporte:", tagPlainLink("https://wa.me/5511999999999", { medium: "link", content: "suporte" }));
console.log(falhas ? `${falhas} FALHAS` : "OK: todas as verificações passaram");
process.exit(falhas ? 1 : 0);
