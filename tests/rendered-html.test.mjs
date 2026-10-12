import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("keeps the Painel Inteligente app ready for Vercel", async () => {
  const [layout, page, packageJson, vercelConfig] = await Promise.all([
    readFile(new URL("app/layout.tsx", root), "utf8"),
    readFile(new URL("app/page.tsx", root), "utf8"),
    readFile(new URL("package.json", root), "utf8"),
    readFile(new URL("vercel.json", root), "utf8"),
  ]);

  assert.match(layout, /title:\s*"Painel Inteligente"/);
  assert.match(page, /Entrar no Painel Inteligente/);
  assert.match(page, /Nichos em alta/);
  assert.match(page, /Agente de Copy/);
  assert.match(packageJson, /"build":\s*"next build --webpack"/);
  assert.match(packageJson, /"next":\s*"16\.4\.0"/);
  assert.match(vercelConfig, /"path":\s*"\/api\/trends\/refresh"/);
  assert.match(vercelConfig, /"schedule":\s*"0 8 \*\/3 \* \*"/);
  assert.doesNotMatch(packageJson, /vinext|wrangler|@cloudflare\/vite-plugin/);

  await access(new URL(".next/BUILD_ID", root));
});
