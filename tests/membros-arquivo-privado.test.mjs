// Teste: node tests/membros-arquivo-privado.test.mjs
import { resolveMaterials, privatePath, isPrivateMaterial } from "../lib/membros-arquivo-privado.ts";
import { strict as assert } from "node:assert";
import { test } from "node:test";

test("privado vira link assinado, público passa direto", async () => {
  const sign = async (path) => `https://x/sign/${path}?token=T`;
  const out = await resolveMaterials([
    { titulo: "Zip", url: "privado:maquina-de-videos/Maquina-de-Videos-v1.zip" },
    { titulo: "Site", url: "https://exemplo.com/a.pdf" },
  ], sign);
  assert.equal(out[0].url, "https://x/sign/maquina-de-videos/Maquina-de-Videos-v1.zip?token=T");
  assert.equal(out[1].url, "https://exemplo.com/a.pdf");
});
test("falha na assinatura ou caminho perigoso some da lista (sem vazar)", async () => {
  const out = await resolveMaterials([
    { titulo: "A", url: "privado:pasta/a.zip" },
    { titulo: "B", url: "privado:../outro/b.zip" },
    { titulo: "C", url: "privado:" },
  ], async () => null);
  assert.deepEqual(out, []);
  assert.equal(privatePath("privado:../x"), null);
  assert.equal(privatePath("privado:a//b"), null);
  assert.equal(isPrivateMaterial("https://x"), false);
});

test("assinador fala com o Storage (servidor de mentira) e força download", async () => {
  const { createServer } = await import("node:http");
  const { supabaseSigner } = await import("../lib/membros-arquivo-privado.ts");
  let visto = null;
  const srv = createServer((req, res) => {
    let body = ""; req.on("data", (c) => (body += c));
    req.on("end", () => {
      visto = { url: req.url, auth: req.headers.authorization, body };
      res.setHeader("content-type", "application/json");
      if (req.url.includes("faltando")) { res.statusCode = 400; return res.end("{}"); }
      res.end(JSON.stringify({ signedURL: `/object/sign/membros-privado/${req.url.split("/sign/membros-privado/")[1]}?token=abc` }));
    });
  });
  await new Promise((r) => srv.listen(0, r));
  const url = `http://127.0.0.1:${srv.address().port}`;
  const sign = supabaseSigner({ url, serviceKey: "SERVICE" });
  const link = await sign("maquina-de-videos/Maquina-de-Videos-v1.zip", 21600);
  assert.equal(link, `${url}/storage/v1/object/sign/membros-privado/maquina-de-videos/Maquina-de-Videos-v1.zip?token=abc&download=Maquina-de-Videos-v1.zip`);
  assert.equal(visto.auth, "Bearer SERVICE");
  assert.equal(JSON.parse(visto.body).expiresIn, 21600);
  assert.equal(await sign("faltando/x.zip", 60), null);
  srv.close();
});
