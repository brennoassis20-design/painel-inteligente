import { readFile } from "node:fs/promises";
import path from "node:path";
import chromium from "@sparticuz/chromium";
import { PDFArray, PDFDict, PDFDocument, PDFHexString, PDFName, PDFRef, PDFString } from "pdf-lib";
import puppeteer, { type Browser } from "puppeteer-core";
import { blockTitle, documentFonts, endTitles, renderProductDocument, resolveDocumentStyle, type DocumentProduct, type RenderOptions } from "@/lib/product-document";

const LOCAL_CHROME = process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const FONT_DIR = path.join(process.cwd(), "lib", "pdf-fonts");

async function launchBrowser(): Promise<Browser> {
  if (process.env.VERCEL) {
    chromium.setGraphicsMode = false;
    return puppeteer.launch({
      args: await puppeteer.defaultArgs({ args: chromium.args, headless: "shell" }),
      executablePath: await chromium.executablePath(),
      headless: "shell",
    });
  }

  return puppeteer.launch({ executablePath: LOCAL_CHROME, headless: true });
}

async function embeddedFontCss(product: DocumentProduct) {
  const { files } = documentFonts[resolveDocumentStyle(product)];
  const faces = await Promise.all(
    files.map(async (font) => {
      const data = await readFile(path.join(FONT_DIR, font.file));
      return `@font-face { font-family: "${font.family}"; font-style: ${font.style}; font-weight: ${font.weight}; font-display: block; src: url(data:font/woff2;base64,${data.toString("base64")}) format("woff2"); }`;
    }),
  );
  return faces.join("\n");
}

function decodeTitle(value: unknown) {
  if (value instanceof PDFString || value instanceof PDFHexString) return value.decodeText().trim();
  return "";
}

// Lê os marcadores (outline) do PDF e devolve, em ordem, { título, página (1-based) }.
export async function readOutline(bytes: Uint8Array) {
  const doc = await PDFDocument.load(bytes);
  const pageIndex = new Map(doc.getPages().map((page, index) => [page.ref.toString(), index + 1]));
  const outlines = doc.catalog.lookupMaybe(PDFName.of("Outlines"), PDFDict);
  const items: { title: string; page: number }[] = [];

  const walk = (ref: unknown) => {
    let current = ref instanceof PDFRef ? doc.context.lookupMaybe(ref, PDFDict) : undefined;
    while (current) {
      const dest = current.lookup(PDFName.of("Dest"));
      const target = dest instanceof PDFArray ? dest.get(0) : undefined;
      const page = target instanceof PDFRef ? pageIndex.get(target.toString()) : undefined;
      if (page) items.push({ title: decodeTitle(current.lookup(PDFName.of("Title"))), page });
      walk(current.get(PDFName.of("First")));
      const next = current.get(PDFName.of("Next"));
      current = next instanceof PDFRef ? doc.context.lookupMaybe(next, PDFDict) : undefined;
    }
  };

  if (outlines) walk(outlines.get(PDFName.of("First")));
  return items;
}

async function printPdf(browser: Browser, html: string) {
  const page = await browser.newPage();
  try {
    await page.setContent(html, { waitUntil: "load", timeout: 30000 });
    await page.evaluate(() => document.fonts.ready);
    return new Uint8Array(await page.pdf({ preferCSSPageSize: true, printBackground: true, outline: true, tagged: true }));
  } finally {
    await page.close();
  }
}

const sameTitle = (a: string, b: string) => a.replace(/\s+/g, "") === b.replace(/\s+/g, "");

// Página inicial de cada capítulo e da última página de conteúdo, lidas dos marcadores do PDF.
async function locateChapters(bytes: Uint8Array, product: DocumentProduct) {
  const outline = await readOutline(bytes);
  let cursor = 0;
  const find = (title: string) => {
    const found = outline.findIndex((item, index) => index >= cursor && sameTitle(item.title, title));
    if (found < 0) return 0;
    cursor = found + 1;
    return outline[found].page;
  };
  const starts = product.productContent.map((block) => find(blockTitle(block)));
  const end = find(endTitles[resolveDocumentStyle(product)]);
  return { starts, end };
}

export async function renderProductPdf(product: DocumentProduct) {
  const fontCss = await embeddedFontCss(product);
  const browser = await launchBrowser();

  try {
    let options: RenderOptions = { fontCss, target: "pdf" };
    let pdf = await printPdf(browser, renderProductDocument(product, options));
    let layout = await locateChapters(pdf, product);
    if (layout.starts.some((page) => !page) || !layout.end) return pdf;

    // Capítulo que passou de uma página é reimpresso com espaçamento mais justo; se ainda passar,
    // perde os elementos opcionais (nível "tight").
    for (const level of ["compact", "tight"] as const) {
      const overflowing = layout.starts
        .map((page, index) => ((layout.starts[index + 1] || layout.end) - page > 1 ? index : -1))
        .filter((index) => index >= 0);
      if (!overflowing.length) break;
      options = { ...options, [level]: overflowing, ...(level === "tight" ? { compact: [...new Set([...(options.compact || []), ...overflowing])] } : {}) };
      pdf = await printPdf(browser, renderProductDocument(product, options));
      layout = await locateChapters(pdf, product);
      if (layout.starts.some((page) => !page) || !layout.end) return pdf;
    }

    return await printPdf(browser, renderProductDocument(product, { ...options, pageNumbers: layout.starts }));
  } finally {
    await browser.close();
  }
}
