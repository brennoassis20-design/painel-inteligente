// Folhas de prévia: capas como aparecem no card da área (degradê de baixo + texto) e banners 16:9.
// Uso: node tools/capas/previa.mjs <pasta_saida>
import { readdirSync } from "node:fs";
import sharp from "sharp";

const DIR = new URL("../../public/membros/capas/", import.meta.url).pathname;
const out = process.argv[2] || "/tmp";
const files = readdirSync(DIR).filter((f) => f.endsWith(".jpg"));
const capas = files.filter((f) => !f.includes("-banner")).sort();
const banners = files.filter((f) => f.includes("-banner")).sort();

// Card 2:3 com o mesmo degradê da área: linear-gradient(180deg, transparent 45%, #0a0c12ee)
const W = 260;
const H = 390;
const fade = Buffer.from(`<svg width="${W}" height="${H}"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0.45" stop-color="#0a0c12" stop-opacity="0"/><stop offset="1" stop-color="#0a0c12" stop-opacity="0.93"/></linearGradient></defs><rect width="${W}" height="${H}" fill="url(#g)"/><rect x="14" y="${H - 44}" width="120" height="28" rx="7" fill="#0a0c12" opacity=".85"/><text x="24" y="${H - 25}" font-family="Helvetica" font-size="15" font-weight="700" fill="#7CE3A1">R$ 17,00</text></svg>`);
const cols = 7;
const cards = await Promise.all(
  capas.map(async (f, i) => ({
    input: await sharp(await sharp(DIR + f).resize(W, H).toBuffer()).composite([{ input: fade }]).png().toBuffer(),
    left: 12 + (i % cols) * (W + 12),
    top: 12 + Math.floor(i / cols) * (H + 12),
  })),
);
await sharp({ create: { width: 12 + cols * (W + 12), height: 12 + Math.ceil(capas.length / cols) * (H + 12), channels: 3, background: "#0a0c12" } })
  .composite(cards)
  .png()
  .toFile(`${out}/previa-capas.png`);

const BW = 480;
const BH = 270;
const bcols = 4;
const bs = await Promise.all(
  banners.map(async (f, i) => ({ input: await sharp(DIR + f).resize(BW, BH).toBuffer(), left: 12 + (i % bcols) * (BW + 12), top: 12 + Math.floor(i / bcols) * (BH + 12) })),
);
await sharp({ create: { width: 12 + bcols * (BW + 12), height: 12 + Math.ceil(banners.length / bcols) * (BH + 12), channels: 3, background: "#0a0c12" } })
  .composite(bs)
  .png()
  .toFile(`${out}/previa-banners.png`);
console.log(capas.length, "capas", banners.length, "banners");
