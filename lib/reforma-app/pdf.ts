// PDF do cliente do contador, gerado no navegador (pdf-lib, sem servidor). A4, logo e cor do escritório.
// Fonte Helvetica (WinAnsi): o texto passa por `seguro()` para trocar símbolos que a fonte não tem.
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFImage, type PDFPage } from "pdf-lib";
import { PARAMETROS_PADRAO } from "../reforma/padrao.ts";
import { ROTULO_REGIME, calcularCliente, descricaoReducao, reducaoEfetiva, type Cliente, type Escritorio } from "./modelo.ts";
import { lerPercentualBR } from "./numeros.ts";
import { ANOS, ANO_FINAL, ANO_HOJE, ANO_PADRAO, ATUALIZADO_EM, bloco, frase, grafico, linhasHoje, opcao, pc, prazosSimples, r$, reaj, recomendar, selo } from "./resultado.ts";
import { acharSetor } from "./setores.ts";

const A4 = { w: 595.28, h: 841.89 };
// Avisos que ficam só no app (para o contador), fora do PDF do cliente.
const PDF_SEM_AVISO = ["simples_2026", "tabela_2026", "anos_sem_gabarito"];
const M = 42;

const TROCAS: Record<string, string> = { "−": "-", "→": "->", "≈": "~", "≤": "<=", "≥": ">=", "“": '"', "”": '"', "‘": "'", "’": "'", "…": "...", " ": " ", "‑": "-", "✓": "ok" };
export function seguro(t: string): string {
  return Array.from(String(t))
    .map((c) => TROCAS[c] ?? c)
    .filter((c) => c === "\n" || c.codePointAt(0)! >= 32)
    .map((c) => (c.codePointAt(0)! > 255 && !"–—•€™".includes(c) ? "?" : c))
    .join("");
}

function hex(h: string) {
  const m = /^#?([0-9a-f]{6})$/i.exec(h) ?? ["", "1F4E79"];
  const n = parseInt(m[1], 16);
  return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255 };
}
function cor(h: string) {
  const c = hex(h);
  return rgb(c.r, c.g, c.b);
}
function mistura(h: string, t: number) {
  const c = hex(h);
  return rgb(c.r + (1 - c.r) * t, c.g + (1 - c.g) * t, c.b + (1 - c.b) * t);
}
function luz(h: string) {
  const c = hex(h);
  const l = (v: number) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return 0.2126 * l(c.r) + 0.7152 * l(c.g) + 0.0722 * l(c.b);
}

const CINZA = rgb(0.36, 0.4, 0.46);
const TINTA = rgb(0.09, 0.11, 0.15);
const LINHA = rgb(0.86, 0.88, 0.91);

export function nomeArquivo(cliente: string) {
  const base = cliente.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-+|-+$/g, "").toLowerCase() || "cliente";
  return `reforma-tributaria-${base}.pdf`;
}

export function textoWhatsApp(cliente: string, escritorio: string) {
  return `Olá! Segue a simulação da Reforma Tributária para ${cliente.trim() || "a sua empresa"}, preparada pelo ${escritorio.trim() || "nosso escritório"}. É uma estimativa para apoiar a decisão. Qualquer dúvida, é só me chamar.`;
}

export function linkWhatsApp(texto: string, telefone?: string) {
  const dig = (telefone || "").replace(/\D/g, "");
  const num = dig && dig.length <= 11 ? `55${dig}` : dig;
  return `https://wa.me/${num}?text=${encodeURIComponent(texto)}`;
}

function bytesDeDataUrl(d: string): { bytes: Uint8Array; png: boolean } | null {
  const m = /^data:image\/(png|jpe?g);base64,(.+)$/i.exec(d);
  if (!m) return null;
  const bin = atob(m[2]);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return { bytes, png: m[1].toLowerCase() === "png" };
}

class Folha {
  doc: PDFDocument;
  reg: PDFFont;
  neg: PDFFont;
  page!: PDFPage;
  y = 0;
  cor: string;
  paginas: PDFPage[] = [];
  constructor(doc: PDFDocument, reg: PDFFont, neg: PDFFont, corHex: string) {
    this.doc = doc;
    this.reg = reg;
    this.neg = neg;
    this.cor = corHex;
  }
  nova(): PDFPage {
    this.page = this.doc.addPage([A4.w, A4.h]);
    this.paginas.push(this.page);
    this.y = A4.h - M - 6;
    return this.page;
  }
  garantir(h: number) {
    if (this.y - h < M + 40) this.nova();
  }
  quebrar(t: string, fonte: PDFFont, tam: number, larg: number): string[] {
    const saida: string[] = [];
    for (const par of seguro(t).split("\n")) {
      let atual = "";
      for (const p of par.split(" ")) {
        const tent = atual ? `${atual} ${p}` : p;
        if (fonte.widthOfTextAtSize(tent, tam) <= larg || !atual) atual = tent;
        else {
          saida.push(atual);
          atual = p;
        }
      }
      saida.push(atual);
    }
    return saida;
  }
  /** Escreve um parágrafo e desce o cursor; devolve a altura usada. */
  par(t: string, o: { x?: number; tam?: number; neg?: boolean; cor?: ReturnType<typeof rgb>; larg?: number; entre?: number; depois?: number } = {}) {
    const tam = o.tam ?? 10.5;
    const f = o.neg ? this.neg : this.reg;
    const x = o.x ?? M;
    const larg = o.larg ?? A4.w - M - x;
    const ent = o.entre ?? tam * 0.38;
    for (const linha of this.quebrar(t, f, tam, larg)) {
      this.garantir(tam + ent);
      this.page.drawText(linha, { x, y: this.y - tam, size: tam, font: f, color: o.cor ?? TINTA });
      this.y -= tam + ent;
    }
    this.y -= o.depois ?? 4;
  }
  titulo(t: string) {
    this.garantir(50);
    this.y -= 6;
    this.page.drawRectangle({ x: M, y: this.y - 16, width: 4, height: 18, color: cor(this.cor) });
    this.page.drawText(seguro(t), { x: M + 12, y: this.y - 13, size: 15, font: this.neg, color: TINTA });
    this.y -= 30;
  }
  caixa(x: number, y: number, w: number, h: number, fundo: ReturnType<typeof rgb>, borda?: ReturnType<typeof rgb>, raio = 8) {
    const r = Math.min(raio, h / 2, w / 2);
    const p = `M ${r},0 L ${w - r},0 Q ${w},0 ${w},${r} L ${w},${h - r} Q ${w},${h} ${w - r},${h} L ${r},${h} Q 0,${h} 0,${h - r} L 0,${r} Q 0,0 ${r},0 Z`;
    this.page.drawSvgPath(p, { x, y: y + h, color: fundo, borderColor: borda, borderWidth: borda ? 0.8 : 0 });
  }
  tabela(cols: { w: number; dir?: boolean }[], cab: string[], linhas: string[][], tam = 9.5) {
    const total = cols.reduce((s, c) => s + c.w, 0);
    const alturaCab = 24;
    this.garantir(alturaCab + 30);
    this.page.drawRectangle({ x: M, y: this.y - alturaCab, width: total, height: alturaCab, color: cor(this.cor) });
    const claro = luz(this.cor) > 0.5;
    const corTxt = claro ? TINTA : rgb(1, 1, 1);
    let x = M;
    cab.forEach((c, i) => {
      const t = seguro(c);
      const w = this.neg.widthOfTextAtSize(t, tam);
      this.page.drawText(t, { x: cols[i].dir ? x + cols[i].w - 8 - w : x + 8, y: this.y - alturaCab + 8, size: tam, font: this.neg, color: corTxt });
      x += cols[i].w;
    });
    this.y -= alturaCab;
    linhas.forEach((l, k) => {
      const quebras = l.map((c, i) => this.quebrar(c, i === 0 ? this.neg : this.reg, tam, cols[i].w - 16));
      const nl = Math.max(...quebras.map((q) => q.length));
      const h = nl * (tam + 3) + 12;
      this.garantir(h);
      if (k % 2 === 0) this.page.drawRectangle({ x: M, y: this.y - h, width: total, height: h, color: mistura(this.cor, 0.94) });
      this.page.drawLine({ start: { x: M, y: this.y - h }, end: { x: M + total, y: this.y - h }, thickness: 0.5, color: LINHA });
      let cx = M;
      quebras.forEach((q, i) => {
        q.forEach((linha, j) => {
          const f = i === 0 ? this.neg : this.reg;
          const w = f.widthOfTextAtSize(linha, tam);
          this.page.drawText(linha, { x: cols[i].dir ? cx + cols[i].w - 8 - w : cx + 8, y: this.y - 6 - tam - j * (tam + 3) + 1, size: tam, font: f, color: TINTA });
        });
        cx += cols[i].w;
      });
      this.y -= h;
    });
    this.y -= 10;
  }
}

export async function gerarPdf({ cliente, escritorio, ano }: { cliente: Cliente; escritorio: Escritorio; ano: number }): Promise<Blob> {
  const calc = calcularCliente(cliente.form);
  if (!calc.ok) throw new Error(calc.erros.join(" "));
  const res = calc.resultado;
  const f = cliente.form;
  const corHex = /^#[0-9a-f]{6}$/i.test(escritorio.cor) ? escritorio.cor : "#1F4E79";
  const doc = await PDFDocument.create();
  doc.setTitle(seguro(`Reforma Tributária - ${f.nome}`));
  doc.setAuthor(seguro(escritorio.nome || "Escritório"));
  doc.setCreator("App da Reforma");
  const reg = await doc.embedFont(StandardFonts.Helvetica);
  const neg = await doc.embedFont(StandardFonts.HelveticaBold);
  const w = new Folha(doc, reg, neg, corHex);
  const pj = lerPercentualBR(f.pctPJ) ?? "0";
  const simples = res.regime === "simples";
  const mei = res.regime === "mei";
  const a = res.anos[ano];
  const emissao = new Date().toLocaleDateString("pt-BR");
  const setor = acharSetor(f.setorId);
  const red = reducaoEfetiva(f);

  let logo: PDFImage | null = null;
  const dl = escritorio.logo ? bytesDeDataUrl(escritorio.logo) : null;
  if (dl) {
    try {
      logo = dl.png ? await doc.embedPng(dl.bytes) : await doc.embedJpg(dl.bytes);
    } catch {
      logo = null;
    }
  }

  // ------------------------------------------------ capa
  const p1 = w.nova();
  const altBloco = 400;
  p1.drawRectangle({ x: 0, y: A4.h - altBloco, width: A4.w, height: altBloco, color: cor(corHex) });
  p1.drawRectangle({ x: 0, y: A4.h - altBloco - 6, width: A4.w, height: 6, color: mistura(corHex, 0.55) });
  const txtCapa = luz(corHex) > 0.5 ? TINTA : rgb(1, 1, 1);
  let yTopo = A4.h - 70;
  if (logo) {
    const max = 74;
    const esc = Math.min(max / logo.width, max / logo.height);
    const lw = logo.width * esc;
    const lh = logo.height * esc;
    w.caixa(M, yTopo - 86, lw + 24, 86, rgb(1, 1, 1), undefined, 12);
    p1.drawImage(logo, { x: M + 12, y: yTopo - 86 + (86 - lh) / 2, width: lw, height: lh });
    p1.drawText(seguro(escritorio.nome), { x: M + lw + 42, y: yTopo - 40, size: 17, font: neg, color: txtCapa });
    if (escritorio.crc) p1.drawText(seguro(escritorio.crc), { x: M + lw + 42, y: yTopo - 60, size: 10, font: reg, color: txtCapa });
  } else {
    p1.drawText(seguro(escritorio.nome), { x: M, y: yTopo - 30, size: 20, font: neg, color: txtCapa });
    if (escritorio.crc) p1.drawText(seguro(escritorio.crc), { x: M, y: yTopo - 50, size: 10, font: reg, color: txtCapa });
  }
  yTopo = A4.h - 220;
  p1.drawText("REFORMA TRIBUTÁRIA", { x: M, y: yTopo, size: 12, font: neg, color: txtCapa });
  w.y = yTopo - 14;
  w.par("O que muda de imposto para a sua empresa", { tam: 30, neg: true, cor: txtCapa, entre: 8, depois: 6, larg: A4.w - M * 2 });
  w.par("Simulação de 2026 a 2033, com recomendação e próximos passos.", { tam: 12.5, cor: txtCapa, depois: 0 });
  // cartão do cliente
  const cy = A4.h - altBloco - 150;
  w.caixa(M, cy, A4.w - M * 2, 110, rgb(1, 1, 1), LINHA, 12);
  p1.drawText("PREPARADO PARA", { x: M + 20, y: cy + 86, size: 8.5, font: neg, color: CINZA });
  p1.drawText(seguro(f.nome).slice(0, 48), { x: M + 20, y: cy + 62, size: 18, font: neg, color: TINTA });
  p1.drawText(seguro(`${ROTULO_REGIME[res.regime]}${simples ? ` - Anexo ${f.anexo}` : ""}  |  ${setor?.nome ?? ""}`).slice(0, 90), { x: M + 20, y: cy + 42, size: 10, font: reg, color: CINZA });
  p1.drawText(seguro(`${f.municipio}/${f.uf}  |  Emitido em ${emissao}`), { x: M + 20, y: cy + 24, size: 10, font: reg, color: CINZA });
  w.y = cy - 30;
  w.caixa(M, w.y - 62, A4.w - M * 2, 62, mistura(corHex, 0.92));
  w.y -= 12;
  w.par("Estimativa, apoio à decisão. Os valores seguem as regras da Reforma Tributária conhecidas em " + ATUALIZADO_EM + " e podem mudar quando o Senado e a Receita definirem os detalhes. Não substitui a análise do contador.", { x: M + 14, larg: A4.w - M * 2 - 28, tam: 9.5, cor: TINTA });

  // ------------------------------------------------ resumo
  w.nova();
  w.titulo("Resumo");
  w.caixa(M, w.y - 82, A4.w - M * 2, 82, mistura(corHex, 0.92));
  const yIni = w.y;
  w.y -= 10;
  w.par(frase(res, ano, f.nome, pj), { x: M + 14, larg: A4.w - M * 2 - 28, tam: 12, neg: true, entre: 5 });
  w.y = Math.min(w.y, yIni - 82) - 10;
  if (red.aplicada) w.par(`Esta atividade tem redução de ${Math.round(Number(red.percentual) * 100)}% nas alíquotas de CBS e IBS (${descricaoReducao(f.reducaoCodigo)}).`, { cor: CINZA });

  w.titulo(simples ? "Preço para manter a sua margem" : mei ? "Guia mensal do MEI" : "Imposto sobre consumo por mês");
  if (simples) {
    const anos = [ANO_HOJE, ANO_PADRAO, ANO_FINAL];
    w.tabela(
      [{ w: 150 }, ...anos.map(() => ({ w: (A4.w - M * 2 - 150) / 3, dir: true }))],
      ["Opção", ...anos.map((y) => (y === ANO_HOJE ? "Hoje" : String(y)))],
      (["das", "hibrido"] as const).map((id) => [id === "das" ? "Dentro do DAS" : "Híbrido", ...anos.map((y) => r$(opcao(res.anos[y], id)!.precoNecessario))]),
    );
  } else {
    const l = linhasHoje(res);
    w.tabela(
      [{ w: 150 }, ...l.map(() => ({ w: (A4.w - M * 2 - 150) / 3, dir: true }))],
      [" ", ...l.map((x) => x.rotulo)],
      [
        [mei ? "Guia por mês" : "Imposto por mês", ...l.map((x) => r$(x.valor))],
        ...(mei ? [] : [["% da receita", ...l.map((x) => pc(x.pct))]]),
        ["Diferença para hoje", ...l.map((x) => (x.ano === ANO_HOJE ? "-" : r$(x.delta)))],
      ],
    );
  }

  // ------------------------------------------------ comparação / preço
  const das = opcao(a, "das");
  const hib = opcao(a, "hibrido");
  const at = opcao(a, "regime_atual");
  const nomeAno = ano === ANO_HOJE ? "hoje" : String(ano);
  if (simples && das && hib) {
    w.titulo(`Dentro do DAS ou híbrido (${nomeAno})`);
    const cw = (A4.w - M * 2 - 190) / 2;
    w.tabela(
      [{ w: 190 }, { w: cw, dir: true }, { w: cw, dir: true }],
      ["", "Dentro do DAS", "Híbrido"],
      [
        ["Preço para manter a margem", r$(das.precoNecessario), r$(hib.precoNecessario)],
        ["Custo real para o cliente empresa", r$(das.custoRealClientePJ), r$(hib.custoRealClientePJ)],
        ["Margem se o preço não mudar", pc(das.margemSeManterPreco), pc(hib.margemSeManterPreco)],
        ["Reajuste de preço", reaj(das.reajustePreco), reaj(hib.reajustePreco)],
      ],
    );
    const rec = recomendar(res, ano, pj);
    if (rec) {
      w.titulo("Recomendação");
      w.par(rec.titulo, { tam: 13, neg: true, depois: 6 });
      rec.porque.forEach((p) => w.par("•  " + p, { x: M + 6, larg: A4.w - M * 2 - 6 }));
      rec.proximosPassos.forEach((p) => w.par(p, { cor: CINZA }));
    }
  } else if (at) {
    w.titulo(`Preço (${nomeAno})`);
    const cw = A4.w - M * 2 - 260;
    w.tabela(
      [{ w: 260 }, { w: cw, dir: true }],
      ["", "Valor"],
      [
        ["Preço para manter a margem", r$(at.precoNecessario)],
        ["Custo real para o cliente empresa", r$(at.custoRealClientePJ)],
        ["Margem se o preço não mudar", pc(at.margemSeManterPreco)],
        ["Reajuste de preço", reaj(at.reajustePreco)],
      ],
    );
    w.par("O CBS e o IBS são cobrados por fora e repassados no preço; o cliente empresa recupera esse valor como crédito.", { cor: CINZA });
  }

  // ------------------------------------------------ gráfico
  const g = grafico(res);
  const alt = 150;
  w.garantir(alt + 40 + 60); // título e gráfico na mesma página (título não fica sozinho no pé)
  w.titulo("Linha do tempo 2026 a 2033");
  w.garantir(alt + 40);
  const base = w.y - alt - 20;
  const largTot = A4.w - M * 2;
  const grupo = largTot / ANOS.length;
  const max = Math.max(1, ...g.series.flatMap((s) => s.pontos.map((p) => p.valor)));
  const bw = Math.min(26, (grupo - 10) / g.series.length);
  w.page.drawLine({ start: { x: M, y: base }, end: { x: M + largTot, y: base }, thickness: 0.8, color: LINHA });
  ANOS.forEach((y, i) => {
    const x0 = M + i * grupo + (grupo - bw * g.series.length) / 2;
    g.series.forEach((s, j) => {
      const p = s.pontos[i];
      const h = Math.max(1.5, (p.valor / max) * alt);
      w.page.drawRectangle({ x: x0 + j * bw, y: base, width: bw - 2, height: h, color: s.cor === "a" ? cor(corHex) : mistura(corHex, 0.55) });
      const t = p.valor >= 1000 ? `${(p.valor / 1000).toFixed(1).replace(".", ",")}k` : p.valor.toFixed(0);
      w.page.drawText(t, { x: x0 + j * bw + (bw - 2) / 2 - reg.widthOfTextAtSize(t, 7) / 2, y: base + h + 3, size: 7, font: reg, color: CINZA });
    });
    const ty = String(y);
    w.page.drawText(ty, { x: M + i * grupo + grupo / 2 - neg.widthOfTextAtSize(ty, 9) / 2, y: base - 14, size: 9, font: y === ano ? neg : reg, color: y === ano ? TINTA : CINZA });
  });
  w.y = base - 28;
  w.par(g.titulo + " (R$ por mês, em milhares onde há 'k'). " + g.series.map((s) => `${s.cor === "a" ? "Barra escura" : "Barra clara"}: ${s.nome}.`).join(" "), { tam: 8.5, cor: CINZA });

  // ------------------------------------------------ próximos passos
  w.titulo("Próximos passos");
  const passos = [
    "Conferir com o escritório se os dados desta simulação (faturamento, compras e margem) estão corretos.",
    ...(simples ? ["Decidir entre ficar dentro do DAS ou optar pelo híbrido, respeitando os prazos abaixo."] : []),
    "Revisar a tabela de preços: o reajuste indicado mantém a margem, mas depende do mercado e dos concorrentes.",
    "Refazer a simulação quando o Senado fixar a alíquota de referência da CBS e quando as regras mudarem.",
  ];
  passos.forEach((p, i) => w.par(`${i + 1}.  ${p}`, { x: M + 4, larg: A4.w - M * 2 - 4 }));
  if (simples) {
    w.par("Prazos do Simples Nacional", { neg: true, tam: 11, depois: 2 });
    prazosSimples().forEach((p) => w.par("•  " + p.texto, { x: M + 6, larg: A4.w - M * 2 - 6, tam: 9.5 }));
  }
  if (escritorio.whatsapp) w.par(`Fale com o ${escritorio.nome}: ${escritorio.whatsapp}`, { neg: true, cor: cor(corHex), tam: 11 });

  // ------------------------------------------------ memória
  w.nova();
  w.titulo(`Memória de cálculo (${nomeAno})`);
  w.par("Cada número com a fórmula e a fonte, para o contador conferir.", { cor: CINZA });
  for (const l of a.memoria) {
    const valor = l.unidade === "R$" ? r$(l.valor) : l.unidade === "%" ? pc(l.valor, 4) : l.valor;
    w.garantir(60);
    w.par(l.rotulo, { neg: true, tam: 10, depois: 0 });
    // a fórmula do motor às vezes já termina no resultado ("... = R$ 3.930,00"): não repetir
    w.par(l.formula.includes("=") ? l.formula : `${l.formula}  =  ${valor}`, { tam: 9.5, depois: 0 });
    w.par("Fonte: " + l.fonte, { tam: 8, cor: CINZA, depois: 7 });
  }
  // no Simples o bloco não tem total único (DAS puro × híbrido já estão na memória acima)
  if (!mei && bloco(a).total) {
    w.par("Imposto recolhido pela empresa no mês", { neg: true, tam: 10, depois: 0 });
    w.par(`${r$(bloco(a).total)}`, { tam: 9.5, depois: 8 });
  }
  const sl = selo(res, ano);
  w.titulo("O que é estimativa");
  // O PDF vai para o cliente do contador: sem notas internas de validação e sem repetir os prazos já listados.
  const fora = new Set([...PDF_SEM_AVISO, ...(simples ? prazosSimples().map((p) => p.codigo) : [])]);
  [...sl.estimativas, ...sl.atencao].filter((x) => !fora.has(x.codigo)).forEach((x) => w.par("•  " + x.texto, { x: M + 6, larg: A4.w - M * 2 - 6, tam: 9 }));
  if (a.semGabarito) w.par("Faixa ainda em validação: " + sl.emValidacao.join(" "), { tam: 9, cor: CINZA });
  w.par(`Regras atualizadas em ${ATUALIZADO_EM} (versão ${res.versaoParametros}). Estimativa, apoio à decisão.`, { tam: 9, cor: CINZA });

  // ------------------------------------------------ rodapé em todas as páginas
  const n = w.paginas.length;
  w.paginas.forEach((p, i) => {
    if (i === 0) return;
    p.drawLine({ start: { x: M, y: 46 }, end: { x: A4.w - M, y: 46 }, thickness: 0.6, color: LINHA });
    p.drawText(seguro(`${escritorio.nome}${escritorio.crc ? "  |  " + escritorio.crc : ""}`), { x: M, y: 32, size: 8, font: reg, color: CINZA });
    const t = `Estimativa, apoio à decisão  |  ${i + 1} de ${n}`;
    p.drawText(seguro(t), { x: A4.w - M - reg.widthOfTextAtSize(seguro(t), 8), y: 32, size: 8, font: reg, color: CINZA });
  });
  void PARAMETROS_PADRAO;
  const bytes = await doc.save();
  return new Blob([bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer], { type: "application/pdf" });
}
