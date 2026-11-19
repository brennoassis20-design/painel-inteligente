// Teste rápido: node tests/isolamento.test.mjs
import { readFileSync, readdirSync } from "node:fs";
import { pickCandidates, maskEmail, HOUR } from "../lib/membros-lembrete-regra.ts";

let falhas = 0;
const ok = (c, m) => { if (!c) { falhas++; console.log("FALHOU:", m); } else console.log("ok:", m); };

// --- lembrete de acesso
const now = Date.parse("2026-11-19T13:00:00Z");
const ago = (h) => new Date(now - h * HOUR).toISOString();
const row = (email, h, area = 3) => ({ email, created_at: ago(h), mp_products: { area_id: area, title: "Produto" } });
const accounts = new Map([
  ["entrou@x.com", { last_sign_in_at: ago(5) }],
  ["semlogin@x.com", { last_sign_in_at: null, email_confirmed_at: ago(30) }],
]);
const lembretes = [
  { email: "recente@x.com", area_id: 3, created_at: ago(10) },
  { email: "dois@x.com", area_id: 3, created_at: ago(100) },
  { email: "dois@x.com", area_id: 3, created_at: ago(60) },
  { email: "um@x.com", area_id: 3, created_at: ago(60) },
];
const acessos = [
  row("Novo@X.com", 21), row("cedo@x.com", 10), row("velho@x.com", 24 * 8), row("entrou@x.com", 30),
  row("semlogin@x.com", 30), row("recente@x.com", 30), row("dois@x.com", 150), row("um@x.com", 150), row("novo@x.com", 22, 4),
];
const r = pickCandidates(acessos, accounts, lembretes, now);
const emails = r.map((c) => `${c.email}|${c.areaId}`).sort();
console.log(emails);
ok(r.some((c) => c.email === "novo@x.com" && c.areaId === 3 && !c.has_account), "comprador sem conta (21 h) entra, e-mail em minúsculas");
ok(!r.some((c) => c.email === "cedo@x.com"), "menos de 20 h fica de fora");
ok(!r.some((c) => c.email === "velho@x.com"), "mais de 7 dias fica de fora");
ok(!r.some((c) => c.email === "entrou@x.com"), "quem já entrou fica de fora");
ok(r.some((c) => c.email === "semlogin@x.com" && c.has_account), "conta que nunca entrou entra");
ok(!r.some((c) => c.email === "recente@x.com"), "lembrete há menos de 48 h bloqueia");
ok(!r.some((c) => c.email === "dois@x.com"), "máximo de 2 lembretes");
ok(r.some((c) => c.email === "um@x.com" && c.reminders === 1), "1 lembrete há 60 h: pode o segundo");
ok(r.some((c) => c.email === "novo@x.com" && c.areaId === 4), "mesma pessoa em outra área conta separado");
ok(maskEmail("brenno@gmail.com") === "br****@gmail.com" && !maskEmail("ab@x.com").includes("ab@"), "e-mail mascarado");

// --- modelos de e-mail: área de produtor nunca mostra Painel / Gênio / aula gratuita
for (const f of readdirSync("supabase/emails")) {
  const s = readFileSync(`supabase/emails/${f}`, "utf8");
  const start = s.indexOf("{{ if .Data.area_nome }}") + "{{ if .Data.area_nome }}".length;
  ok(s.includes("{{ if .Data.area_nome }}"), `${f}: tem ramo para área`);
  const branch = s.slice(start, s.slice(start).search(/\{\{ else/) + start);
  ok(!/Painel Inteligente|Gênio|aula gratuita|icone-192|lampada/.test(branch), `${f}: ramo de área sem Painel/Gênio/aula gratuita`);
  ok(branch.includes("{{ .ConfirmationURL }}") && branch.includes("{{ .Data.area_nome }}"), `${f}: ramo de área usa ConfirmationURL e area_nome`);
}
if (falhas) { console.log(`${falhas} falha(s)`); process.exit(1); }
console.log("tudo certo");
