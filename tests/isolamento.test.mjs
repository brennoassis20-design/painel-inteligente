// Teste rápido: node tests/isolamento.test.mjs
import { readFileSync, readdirSync } from "node:fs";
import { pickCandidates, maskEmail, HOUR, suspiciousEmail, invitedRecently } from "../lib/membros-lembrete-regra.ts";

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
  row("Novo@X.com", 21), row("cedo@x.com", 2), row("velho@x.com", 24 * 8), row("entrou@x.com", 30),
  row("semlogin@x.com", 30), row("recente@x.com", 30), row("dois@x.com", 150), row("um@x.com", 150), row("novo@x.com", 22, 4),
];
const r = pickCandidates(acessos, accounts, lembretes, now);
const emails = r.map((c) => `${c.email}|${c.areaId}`).sort();
console.log(emails);
ok(r.some((c) => c.email === "novo@x.com" && c.areaId === 3 && !c.has_account), "comprador sem conta (21 h) entra, e-mail em minúsculas");
ok(!r.some((c) => c.email === "cedo@x.com"), "menos de 3 h fica de fora");
ok(!r.some((c) => c.email === "velho@x.com"), "mais de 7 dias fica de fora");
ok(!r.some((c) => c.email === "entrou@x.com"), "quem já entrou fica de fora");
ok(r.some((c) => c.email === "semlogin@x.com" && c.has_account), "conta que nunca entrou entra");
ok(!r.some((c) => c.email === "recente@x.com"), "lembrete há menos de 12 h bloqueia");
ok(!r.some((c) => c.email === "dois@x.com"), "máximo de 2 lembretes");
ok(r.some((c) => c.email === "um@x.com" && c.reminders === 1), "1 lembrete há 60 h: pode o segundo");
ok(r.some((c) => c.email === "novo@x.com" && c.areaId === 4), "mesma pessoa em outra área conta separado");
ok(maskEmail("brenno@gmail.com") === "br****@gmail.com" && !maskEmail("ab@x.com").includes("ab@"), "e-mail mascarado");

// --- modelos de e-mail: área de produtor nunca mostra Painel / Gênio / aula gratuita
for (const f of readdirSync("supabase/emails").filter((name) => name.endsWith(".html"))) {
  const s = readFileSync(`supabase/emails/${f}`, "utf8");
  const start = s.indexOf("{{ if .Data.area_nome }}") + "{{ if .Data.area_nome }}".length;
  ok(s.includes("{{ if .Data.area_nome }}"), `${f}: tem ramo para área`);
  const branch = s.slice(start, s.slice(start).search(/\{\{ else/) + start);
  ok(!/Painel Inteligente|Gênio|aula gratuita|icone-192|lampada/.test(branch), `${f}: ramo de área sem Painel/Gênio/aula gratuita`);
  ok(branch.includes("{{ .ConfirmationURL }}") && branch.includes("{{ .Data.area_nome }}"), `${f}: ramo de área usa ConfirmationURL e area_nome`);
}

// --- e-mail suspeito e convite recente (19/11)
ok(suspiciousEmail("leudete@outlok.com"), "outlok.com é pulado");
ok(suspiciousEmail("fulano@gmail.cim"), "gmail.cim é pulado");
ok(suspiciousEmail("sem-arroba.com"), "formato ruim é pulado");
ok(!suspiciousEmail("fulano@gmail.com") && !suspiciousEmail("x@uil.com.br") && !suspiciousEmail("y@sege.srv.br"), "e-mails normais passam");
ok(invitedRecently({ invited_at: ago(1) }, now), "convite há 1h = recente");
ok(!invitedRecently({ invited_at: ago(4) }, now) && !invitedRecently(undefined, now), "convite há 4h ou sem conta = não recente");
ok(invitedRecently(undefined, now, now - HOUR) && !invitedRecently(undefined, now, now - 5 * HOUR), "e-mail acesso_email há 1h = recente; há 5h = não");
{
  const acc = new Map([["recente@gmail.com", { email: "recente@gmail.com", invited_at: ago(1) }]]);
  const c = pickCandidates([row("recente@gmail.com", 30), row("typo@outlok.com", 30), row("novo@gmail.com", 30)], acc, [], now).map((x) => x.email);
  ok(c.length === 1 && c[0] === "novo@gmail.com", "lembrete pula convite recente e e-mail com erro");
}

// --- lembrete 3 h / 24 h e acesso_email (19/11)
{
  const r2 = (rows, rem = [], evs = []) => pickCandidates(rows, new Map(), rem, now, evs).map((x) => x.email);
  ok(r2([row("a@x.com", 3.5)]).includes("a@x.com"), "1º lembrete com 3,5 h de compra");
  ok(!r2([row("a@x.com", 2.5)]).includes("a@x.com"), "sem lembrete com 2,5 h");
  ok(!r2([row("a@x.com", 10)], [{ email: "a@x.com", area_id: 3, created_at: ago(6) }]).includes("a@x.com"), "2º lembrete não sai com 10 h de compra");
  ok(r2([row("a@x.com", 25)], [{ email: "a@x.com", area_id: 3, created_at: ago(20) }]).includes("a@x.com"), "2º lembrete sai com 25 h (1º há 20 h)");
  ok(!r2([row("a@x.com", 25)], [{ email: "a@x.com", area_id: 3, created_at: ago(5) }]).includes("a@x.com"), "2º lembrete respeita intervalo de 12 h");
  ok(!r2([row("a@x.com", 4)], [], [{ email: "a@x.com", area_id: 3, created_at: ago(1) }]).includes("a@x.com"), "acesso_email há 1 h bloqueia lembrete");
  ok(r2([row("a@x.com", 4)], [], [{ email: "a@x.com", area_id: 3, created_at: ago(4) }]).includes("a@x.com"), "acesso_email há 4 h não bloqueia");
  const multi = pickCandidates([row("a@x.com", 5), { ...row("a@x.com", 5), mp_products: { area_id: 3, title: "Bônus" } }], new Map(), [], now);
  ok(multi.length === 1 && multi[0].products.length === 2, "produtos da mesma área são juntados");
}

// --- e-mail "seu acesso chegou"
{
  const { accessSubject, accessEmailHtml, platformName, pickMain } = await import("../lib/membros-acesso-regra.ts");
  const reforma = [{ title: "Bônus 1", position: 2, bump: true }, { title: "Reforma Desenhada", position: 1 }, { title: "Bônus 2", position: 3, bump: true }, { title: "Bônus 3", position: 4, bump: true }];
  ok(accessSubject(reforma) === "Reforma Desenhada + 3 bônus: seu acesso chegou ✅", "assunto com 3 bumps: " + accessSubject(reforma));
  ok(accessSubject([{ title: "Método Gênio" }]) === "Método Gênio: seu acesso chegou ✅", "assunto 1 produto");
  ok(accessSubject(reforma, true) === "Lembrete: seu acesso a Reforma Desenhada está esperando", "assunto do lembrete");
  ok(pickMain([{ title: "B", position: 5 }, { title: "A", position: 2 }]).title === "A", "sem bump: menor position");
  ok(pickMain([{ title: "B", bump: true }, { title: "A", bump: true, position: 1 }]).title === "A", "todos bump: menor position");
  ok(accessSubject([{ title: "x".repeat(300) }]).length <= 150, "assunto até 150");
  ok(platformName("eduzz") === "Eduzz" && platformName("cakto") === "Cakto" && platformName("ticto") === "Ticto", "nomes das plataformas");
  const html = accessEmailHtml({ brandName: "Reforma Desenhada", areaUrl: "https://membros.bagencymidia.site/reforma", iconUrl: "https://x/i.png", link: "https://sb/verify?a=1&b=2", email: "a@x.com", products: reforma, platform: "Eduzz", newAccount: true });
  ok(html.includes("O conteúdo NÃO fica na Eduzz") && html.includes("Entrar na área") && html.includes("Esqueci a senha") && html.includes("a=1&amp;b=2"), "html tem aviso, botão e plano B");
}
if (falhas) { console.log(`${falhas} falha(s)`); process.exit(1); }
console.log("tudo certo");
