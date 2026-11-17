// Gera os ícones do app da Reforma Desenhada (fundo #17213A, "RD" e mapa dobrado em #FFD23F).
// Uso: node tools/icones/reforma.mjs   -> public/membros/app/reforma/
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import puppeteer from "puppeteer-core";

const OUT = new URL("../../public/membros/app/reforma/", import.meta.url).pathname;
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
mkdirSync(OUT, { recursive: true });

// scale = tamanho do desenho dentro do quadro (maskable usa a zona segura de 80%)
const html = (scale) => `<!doctype html><meta charset="utf-8"><style>
html,body{margin:0;width:1024px;height:1024px;background:#17213A;overflow:hidden}
svg{width:1024px;height:1024px;display:block}
text{font-family:"Helvetica Neue",Arial,sans-serif;font-weight:900;fill:#FFD23F}
</style>
<svg viewBox="0 0 1024 1024"><g transform="translate(512 512) scale(${scale}) translate(-512 -512)"><g transform="translate(0 -60)">
  <!-- mapa dobrado em três partes -->
  <path d="M170 300 L400 240 L624 300 L854 240 L854 640 L624 700 L400 640 L170 700 Z" fill="none" stroke="#FFD23F" stroke-width="30" stroke-linejoin="round"/>
  <path d="M400 240 L400 640 M624 300 L624 700" stroke="#FFD23F" stroke-width="30" stroke-linecap="round"/></g>
  <text x="512" y="880" font-size="250" text-anchor="middle" letter-spacing="10">RD</text>
</g></svg>`;

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ["--no-sandbox"] });
const page = await browser.newPage();
await page.setViewport({ width: 1024, height: 1024, deviceScaleFactor: 1 });
async function shot(scale, size, name) {
  await page.setContent(html(scale));
  const buf = await page.screenshot({ type: "png", clip: { x: 0, y: 0, width: 1024, height: 1024 } });
  const sharp = (await import("sharp")).default;
  writeFileSync(join(OUT, name), await sharp(buf).resize(size, size).flatten({ background: "#17213A" }).png().toBuffer());
  console.log("ok", name);
}
await shot(1.0, 192, "icone-192.png");
await shot(1.0, 512, "icone-512.png");
await shot(0.78, 512, "icone-maskable-512.png");
await shot(1.0, 180, "apple-touch-icon.png");
await browser.close();
