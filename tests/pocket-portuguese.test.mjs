// node --test --experimental-strip-types tests/pocket-portuguese.test.mjs
// Simula payloads Cakto -> generic() -> casamento com os produtos da migration -> mp_access (mock em memória) -> entitlements.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import { generic } from "../lib/webhook-generic.ts";
import { statusDoAcesso } from "../lib/webhook-eduzz.ts";
import { entitlementsFrom, verifyCaktoSignature, buildCheckoutUrl, canEnterApp, slugFromParam, verifyCodeFlow, loginEmail, validCode } from "../lib/pp.ts";

const P = {
  "pp-core": ["cakto:83a59ff5-2eb6-4b2e-bd75-7a0675b5047b", "cakto:oferta:d7tpcq7"],
  "pp-rio-slang": ["cakto:8572ff60-9cb5-4bae-8c32-51408727e5ca", "cakto:oferta:qewi5dv"],
  "pp-love-family": ["cakto:21a717a7-4bdc-499a-bbad-5388c505eed8", "cakto:oferta:mw42jhw"],
  "pp-carnaval": ["cakto:27ff6603-adc5-4e33-ad15-14bdbce507d7", "cakto:oferta:ar7noug"],
  "pp-complete": ["cakto:12db36d2-21b8-4614-84d7-173de4dcffca", "cakto:oferta:3cmj7rw"],
};
const ID = { core: "83a59ff5-2eb6-4b2e-bd75-7a0675b5047b", rio: "8572ff60-9cb5-4bae-8c32-51408727e5ca", complete: "12db36d2-21b8-4614-84d7-173de4dcffca" };

// Os ids da migration têm que ser os mesmos do mock acima.
test("migration contém os ids esperados", () => {
  const sql = readFileSync(new URL("../supabase/migrations/20261126_pocket_portuguese.sql", import.meta.url), "utf8");
  for (const ids of Object.values(P)) for (const id of ids) assert.ok(sql.includes(id), id);
  assert.match(sql, /add column if not exists currency text not null default 'BRL'/);
});

// Mock do applySale: mesma regra (ov nos external_ids; status por statusDoAcesso).
function applyMock(db, event) {
  const ids = event.externalIds.filter(Boolean).map((id) => `${event.provider}:${id}`);
  const matched = Object.entries(P).filter(([, ext]) => ext.some((e) => ids.includes(e))).map(([slug]) => slug);
  if (event.kind === "pending" || event.kind === "ignored") return matched;
  for (const slug of matched) db.set(`${event.email}|${slug}`, { status: statusDoAcesso(event.kind) ?? "refunded", slug, email: event.email });
  return matched;
}
const rowsOf = (db, email) => [...db.values()].filter((r) => r.email === email);
const ev = (event, product, offer, type, extra = {}) =>
  generic("cakto", { event, data: { id: `o-${Math.random()}`, offer_type: type, product: { id: product }, offer: { id: offer }, customer: { email: "Ana@Test.com", name: "Ana" }, ...extra } });

test("frente (main) libera só o core", () => {
  const db = new Map();
  assert.deepEqual(applyMock(db, ev("purchase_approved", ID.core, "d7tpcq7", "main")), ["pp-core"]);
  const e = entitlementsFrom(rowsOf(db, "ana@test.com"));
  assert.deepEqual(e, { core: true, rio_slang: false, love_family: false, carnaval: false, complete: false });
});

test("bump (pedido separado, orderbump) libera o pacote certo", () => {
  const db = new Map();
  applyMock(db, ev("purchase_approved", ID.core, "d7tpcq7", "main"));
  assert.deepEqual(applyMock(db, ev("purchase_approved", ID.rio, "qewi5dv", "orderbump", { parent_order: "x" })), ["pp-rio-slang"]);
  const e = entitlementsFrom(rowsOf(db, "ana@test.com"));
  assert.equal(e.core, true); assert.equal(e.rio_slang, true); assert.equal(e.love_family, false); assert.equal(e.complete, false);
});

test("upsell Complete libera os 3 pacotes (e mantém o core)", () => {
  const db = new Map();
  applyMock(db, ev("purchase_approved", ID.core, "d7tpcq7", "main"));
  assert.deepEqual(applyMock(db, ev("purchase_approved", ID.complete, "3cmj7rw", "upsell")), ["pp-complete"]);
  const e = entitlementsFrom(rowsOf(db, "ana@test.com"));
  assert.deepEqual(e, { core: true, rio_slang: true, love_family: true, carnaval: true, complete: true });
});

test("reembolso do complete tira os 3; chargeback do core tira o core; bump avulso permanece", () => {
  const db = new Map();
  applyMock(db, ev("purchase_approved", ID.core, "d7tpcq7", "main"));
  applyMock(db, ev("purchase_approved", ID.rio, "qewi5dv", "orderbump"));
  applyMock(db, ev("purchase_approved", ID.complete, "3cmj7rw", "upsell"));
  applyMock(db, ev("refund", ID.complete, "3cmj7rw", "upsell"));
  let e = entitlementsFrom(rowsOf(db, "ana@test.com"));
  assert.deepEqual(e, { core: true, rio_slang: true, love_family: false, carnaval: false, complete: false });
  applyMock(db, ev("chargeback", ID.core, "d7tpcq7", "main"));
  e = entitlementsFrom(rowsOf(db, "ana@test.com"));
  assert.equal(e.core, false); assert.equal(canEnterApp(e), false);
});

test("pendente não libera; só oferta (sem product id) também casa", () => {
  const db = new Map();
  applyMock(db, ev("waiting_payment", ID.core, "d7tpcq7", "main"));
  assert.equal(entitlementsFrom(rowsOf(db, "ana@test.com")).core, false);
  const only = generic("cakto", { event: "purchase_approved", data: { id: "z", offer: { id: "qewi5dv" }, customer: { email: "b@b.com" } } });
  assert.deepEqual(applyMock(db, only), ["pp-rio-slang"]);
});

test("acesso expirado não conta", () => {
  const e = entitlementsFrom([{ status: "active", slug: "pp-core", expires_at: "2020-01-01T00:00:00Z" }]);
  assert.equal(e.core, false);
});

test("HMAC: válido (hex, base64, sha256=), inválido e ausente", () => {
  const body = '{"event":"purchase_approved"}', secret = "s3cr3t";
  const hex = createHmac("sha256", secret).update(body).digest("hex");
  const b64 = createHmac("sha256", secret).update(body).digest("base64");
  assert.equal(verifyCaktoSignature(body, hex, secret), true);
  assert.equal(verifyCaktoSignature(body, `sha256=${hex}`, secret), true);
  assert.equal(verifyCaktoSignature(body, b64, secret), true);
  assert.equal(verifyCaktoSignature(body + " ", hex, secret), false);
  assert.equal(verifyCaktoSignature(body, "abc", secret), false);
  assert.equal(verifyCaktoSignature(body, null, secret), false);
});

test("checkout: utm_source=app, e-mail e slug", () => {
  const u = new URL(buildCheckoutUrl("https://pay.cakto.com.br/qewi5dv", "pp-rio-slang", "a@b.com"));
  assert.equal(u.searchParams.get("utm_source"), "app");
  assert.equal(u.searchParams.get("email"), "a@b.com");
  assert.equal(u.searchParams.get("utm_campaign"), "pp-rio-slang");
  assert.equal(slugFromParam("rio_slang"), "pp-rio-slang");
  assert.equal(slugFromParam("xx"), null);
});

// ---- verify-code
const SESSION = { access_token: "a", refresh_token: "r", expires_at: 1790000000 };
function deps({ access = true, goodCode = "123456", attempts = 0 } = {}) {
  const calls = { recorded: 0, otp: 0 };
  return {
    calls,
    d: {
      attemptsInWindow: async () => attempts + calls.recorded,
      recordAttempt: async () => { calls.recorded++; },
      hasAccess: async () => access,
      verifyOtp: async (_e, code) => { calls.otp++; return code === goodCode ? SESSION : null; },
    },
  };
}

test("verify-code: código certo + acesso devolve a sessão", async () => {
  const { d } = deps();
  const r = await verifyCodeFlow(d, "Ana@Test.com", " 123 456 ");
  assert.equal(r.status, 200);
  assert.deepEqual(r.body, SESSION);
});

test("verify-code: código errado = erro genérico 400", async () => {
  const { d } = deps();
  const r = await verifyCodeFlow(d, "ana@test.com", "000000");
  assert.equal(r.status, 400);
  assert.deepEqual(r.body, { error: "Invalid or expired code." });
});

test("verify-code: sem acesso = mesma resposta e nem chama o Supabase", async () => {
  const { d, calls } = deps({ access: false });
  const r = await verifyCodeFlow(d, "ana@test.com", "123456");
  assert.equal(r.status, 400);
  assert.deepEqual(r.body, { error: "Invalid or expired code." });
  assert.equal(calls.otp, 0);
});

test("verify-code: limite de 5 tentativas por e-mail (6a = 429, mesmo com código certo)", async () => {
  const { d } = deps();
  for (let i = 0; i < 5; i++) assert.equal((await verifyCodeFlow(d, "ana@test.com", "000000")).status, 400);
  const r = await verifyCodeFlow(d, "ana@test.com", "123456");
  assert.equal(r.status, 429);
});

test("verify-code: entrada inválida e formato do código", async () => {
  const { d, calls } = deps();
  assert.equal((await verifyCodeFlow(d, "nao-email", "123456")).status, 400);
  assert.equal((await verifyCodeFlow(d, "a@b.com", "12345")).status, 400);
  assert.equal(calls.recorded, 0);
  assert.equal(validCode("12 34 56"), "123456");
});

test("e-mail de login traz o código em destaque e o botão do link", () => {
  const m = loginEmail("https://x/link", "482910");
  assert.match(m.html, /482910/);
  assert.match(m.html, /Type it in the app/);
  assert.match(m.html, /href="https:\/\/x\/link"/);
  assert.match(m.subject, /482910/);
});
