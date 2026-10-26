import type { Market } from "@/lib/locale";
import { productTypes, requestAiJson } from "@/lib/product-engine";
import type { TrendProduct } from "@/lib/panel-server";

// Nichos em alta com dado real: anúncios ativos no Brasil (e na América Latina), na Biblioteca de Anúncios da Meta,
// que começaram há mais de 30 dias (ninguém paga anúncio por um mês sem vender).
// Coleta pelo Apify (igolaizola/facebook-ad-library-scraper, cobrado por anúncio).
// A IA só classifica cada anunciante numa categoria fixa e escreve os textos; os números do card são contados aqui.

const ACTOR = "igolaizola~facebook-ad-library-scraper";
// O Apify busca um país por vez. Na América Latina, as 10 buscas se espalham pelos maiores mercados
// em espanhol (México pesa mais), com o mesmo custo da coleta do Brasil.
const QUERIES: Record<Market, { query: string; country: string }[]> = {
  br: [
    "acesso imediato",
    "receba no seu email",
    "pdf",
    "lista de fornecedores",
    "receitas",
    "moldes",
    "atividades",
    "planner",
    "baixar agora",
    "checklist",
  ].map((query) => ({ query, country: "BR" })),
  latam: [
    { query: "acceso inmediato", country: "MX" },
    { query: "recetas pdf", country: "MX" },
    { query: "descarga inmediata", country: "MX" },
    { query: "lista de proveedores", country: "MX" },
    { query: "moldes", country: "CO" },
    { query: "acceso inmediato", country: "CO" },
    { query: "actividades para imprimir", country: "AR" },
    { query: "planner digital", country: "AR" },
    { query: "descarga inmediata", country: "CL" },
    { query: "acceso inmediato", country: "PE" },
  ],
};

// Brasil: toda segunda até 14/11/2026; a partir de 15/11/2026, dias 1 e 15 (decisão do Brenno em 26/10/2026).
// América Latina: dias 1 e 15 desde o começo. A Vercel chama a rota todo dia às 06:00 de Brasília.
const BR_BIWEEKLY_FROM = Date.UTC(2026, 10, 15);
export function isCollectionDay(market: Market, now = new Date()) {
  const day = now.getUTCDate();
  const biweekly = day === 1 || day === 15;
  if (market === "latam" || now.getTime() >= BR_BIWEEKLY_FROM) return biweekly;
  return now.getUTCDay() === 1;
}
const ADS_PER_QUERY = 80;
const MIN_DAYS_RUNNING = 30;
// Plano grátis do Apify: no máximo 5 execuções ao mesmo tempo.
const CONCURRENCY = 4;
const RUN_TIMEOUT_SECS = 90;

type AdItem = {
  ad_archive_id: string;
  page_id?: string;
  page_name?: string;
  start_date?: number;
  snapshot?: {
    page_name?: string;
    title?: string;
    body?: { text?: string };
    link_url?: string;
    link_description?: string;
  };
};

type Advertiser = {
  id: string;
  name: string;
  ads: number;
  days: number;
  title: string;
  text: string;
  domain: string;
};


function apifyToken() {
  return process.env.APIFY_TOKEN?.trim() || "";
}

export function hasAdLibrarySource() {
  return Boolean(apifyToken());
}

async function apify(path: string, init: RequestInit = {}) {
  const response = await fetch(`https://api.apify.com/v2${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${apifyToken()}`, "Content-Type": "application/json", ...(init.headers || {}) },
  });
  if (!response.ok) throw new Error(`Apify ${response.status}: ${(await response.text()).slice(0, 200)}`);
  return response.json();
}

function dateDaysAgo(days: number) {
  return new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
}

async function runQuery({ query, country }: { query: string; country: string }): Promise<AdItem[]> {
  const input = {
    query,
    country,
    activeStatus: "active",
    maxDate: dateDaysAgo(MIN_DAYS_RUNNING),
    sortBy: "impressions",
    maxItems: ADS_PER_QUERY,
  };
  const started = await apify(`/acts/${ACTOR}/runs?timeout=${RUN_TIMEOUT_SECS}`, { method: "POST", body: JSON.stringify(input) });
  let run = started.data;
  // waitForFinish segura a resposta até 60 s; a execução para sozinha no timeout.
  for (let i = 0; i < 3 && !["SUCCEEDED", "FAILED", "ABORTED", "TIMED-OUT"].includes(run.status); i += 1) {
    run = (await apify(`/actor-runs/${run.id}?waitForFinish=60`)).data;
  }
  // Execução que estourou o tempo ainda guarda o que coletou.
  const items = await apify(`/datasets/${run.defaultDatasetId}/items?clean=1&fields=ad_archive_id,page_id,page_name,start_date,snapshot`);
  return Array.isArray(items) ? items : [];
}

export async function collectAds(market: Market = "br") {
  const results: AdItem[] = [];
  const failures: string[] = [];
  const queue = [...QUERIES[market]];
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      while (queue.length) {
        const query = queue.shift()!;
        try {
          results.push(...(await runQuery(query)));
        } catch (error) {
          failures.push(`${query.query} (${query.country}): ${error instanceof Error ? error.message : "erro"}`);
        }
      }
    }),
  );
  return { ads: results, failures };
}

const PT_HINT = /[ãõçê]|\b(voc[eê]|seu|sua|para|com|agora|receitas?|aprenda|acesso)\b/i;
// Espanhol: ñ, ¿, ¡ ou palavras que não existem em português.
const ES_HINT = /[ñ¿¡]|\b(tu|tus|usted|ahora|recetas?|aprende|acceso|descarga|gratis|hoy|obt[eé]n|incluye)\b/i;
// Sinais de material digital barato (entrega por download, e-mail ou área de membros).
const DIGITAL_HINT =
  /acceso (inmediato|de por vida)|descarga|desc[aá]rga(lo|lo ya)|recetas|proveedores|plantillas|imprimibles?|para imprimir|hotmart|\$ ?\d{1,2}(\.\d{2})? ?(usd|d[oó]lares)|acesso (imediato|vital)|pdf|download|baix(e|ar)|receba (no|agora|seu|na hora)|e-?book|apostila|kit digital|\+ ?\d{2,}[.\d]* ?(receitas|moldes|projetos|atividades|modelos|documentos|artes|fornecedores|planilhas|figurinhas)|lista de fornecedores|receitas|moldes|planner|planilha|checklist|hotmart|kiwify|cakto|pay\.|lovable|vercel|ticto|eduzz|perfectpay|kirvano|greenn|wiapy|herospark|monetizze|por apenas|r\$ ?\d{1,2}[,.]\d{2}/i;

function groupByAdvertiser(ads: AdItem[], market: Market) {
  const languageHint = market === "latam" ? ES_HINT : PT_HINT;
  const seen = new Set<string>();
  const pages = new Map<string, AdItem[]>();
  for (const ad of ads) {
    if (!ad?.ad_archive_id || seen.has(ad.ad_archive_id)) continue;
    seen.add(ad.ad_archive_id);
    const key = ad.page_id || ad.page_name || ad.ad_archive_id;
    pages.set(key, [...(pages.get(key) || []), ad]);
  }

  const now = Date.now();
  const advertisers: Advertiser[] = [];
  for (const [id, list] of pages) {
    const first = list[0];
    const snap = first.snapshot || {};
    const oldest = Math.min(...list.map((ad) => ad.start_date || Infinity));
    const days = Number.isFinite(oldest) ? Math.floor((now - oldest * 1000) / 86400000) : 0;
    const title = (snap.title || "").replace(/\{\{.*?\}\}/g, "").trim();
    const text = (snap.body?.text || snap.link_description || "").replace(/\{\{.*?\}\}/g, "").replace(/\s+/g, " ").trim();
    const domain = (snap.link_url || "").replace(/^https?:\/\/([^/]+).*/, "$1");
    const all = `${title} ${text} ${snap.link_url || ""}`;
    if (!languageHint.test(all) || !DIGITAL_HINT.test(all) || days < MIN_DAYS_RUNNING) continue;
    advertisers.push({
      id,
      name: (snap.page_name || first.page_name || "").slice(0, 40),
      ads: list.length,
      days,
      title: title.slice(0, 80),
      text: text.slice(0, 160),
      domain: domain.slice(0, 40),
    });
  }
  // Tempo no ar pesa até 6 meses; depois disso conta mais quem tem vários anúncios rodando.
  const weight = (a: Advertiser) => Math.min(a.days, 180) + Math.min(a.ads, 5) * 8;
  return advertisers.sort((a, b) => weight(b) - weight(a)).slice(0, 180);
}

function scoreFor(advertisers: number, oldestDays: number, ads: number) {
  return Math.round(50 + Math.min(advertisers, 8) * 4 + (Math.min(oldestDays, 240) / 240) * 12 + (Math.min(ads, 20) / 20) * 5);
}

function statusFor(advertisers: number, oldestDays: number): TrendProduct["status"] {
  if (advertisers >= 3 && oldestDays >= 60) return "Validado";
  if (advertisers >= 2 || oldestDays >= 45) return "Tendencia";
  return "Promissor";
}

// Categorias fixas: a IA só encaixa cada anunciante; quem conta é o código.
const CATEGORIES = [
  "Receitas",
  "Lista de fornecedores",
  "Moldes e projetos",
  "Atividades infantis e educação",
  "Concursos e estudos",
  "Modelos e documentos profissionais",
  "Artesanato para vender",
  "Planner e organização",
  "Idiomas",
  "Saúde e bem-estar",
  "Bebê e maternidade",
  "Casamento e festas",
  "Packs digitais",
  "Fé e espiritualidade",
  "Beleza e estética",
];

async function classifyAdvertisers(advertisers: Advertiser[], aiKey: string, market: Market) {
  const latam = market === "latam";
  const lines = advertisers.map((a) => `${a.id} | ${a.name} | ${a.title} | ${a.text}`).join("\n");
  const data = await requestAiJson(
    aiKey,
    `Voce classifica anuncios ${latam ? "da America Latina (em espanhol)" : "do Brasil"}. Retorne somente JSON valido, sem markdown.`,
    `Cada linha e um anunciante (id | pagina | titulo | texto).

${lines}

Para cada anunciante que vende um MATERIAL DIGITAL BARATO ao consumidor final (PDF, receitas, lista de fornecedores, moldes, atividades para imprimir, planner, planilhas, modelos de documentos, kit digital, pack, aulas gravadas ${latam ? "ate US$ 27" : "ate R$ 97"}), diga a categoria.
Deixe FORA: lojas, produtos fisicos, restaurantes, clinicas, servicos, apps, softwares, grandes marcas, cursos caros ou presenciais, conteudo gratis sem venda, anuncios ${latam ? "que nao estejam em espanhol" : "em outro idioma"}. Na duvida, deixe fora.

Categorias permitidas (responda com o nome exato, em portugues): ${CATEGORIES.join("; ")}.

Retorne exatamente: {"items":[{"id":"string","category":"string","product":"o que vende, ate 8 palavras"}]}`,
    5000,
  );
  return (Array.isArray(data.items) ? data.items : []) as { id?: unknown; category?: unknown; product?: unknown }[];
}

async function writeCards(groups: { category: string; products: string[]; advertisers: number; oldest: number }[], aiKey: string, market: Market) {
  const latam = market === "latam";
  const lines = groups
    .map((g) => `${g.category} | ${g.advertisers} anunciantes | ate ${g.oldest} dias no ar | vendem: ${g.products.join("; ")}`)
    .join("\n");
  const data = await requestAiJson(
    aiKey,
    `Voce e analista de produtos digitais low ticket ${latam ? "para a America Latina, vendidos em dolar" : "no Brasil"}. Retorne somente JSON valido, sem markdown.`,
    `Grupos de anunciantes com anuncios ATIVOS ${latam ? "na America Latina (Mexico, Colombia, Argentina, Chile e Peru)" : "no Brasil"} ha mais de 30 dias (categoria | anunciantes | tempo no ar | o que vendem):

${lines}

Para CADA grupo, escreva uma oportunidade de produto especifica, inspirada no que esses anunciantes vendem (ex.: "Kit 300 receitas de cafe da manha sem pao", e nao "Receitas").

Regras:
- O produto e vendido ao comprador final. Nao fale de IA, painel, curso, aluno ou de ensinar a criar produtos.
- Nunca use "guia", "ebook", "apostila", "livro", "leitura", "paginas" ou "capitulos" no titulo e na promessa. Use metodo, plano, kit, protocolo, mapa, checklist, roteiro, lista.
- productType deve ser um destes: ${productTypes.join(", ")}.
${
  latam
    ? `- Escreva os textos do card em PORTUGUES do Brasil (quem le e o vendedor brasileiro), mas o produto sera vendido em espanhol para a America Latina: title e niche com o nome do produto em portugues e, entre parenteses no niche, o termo em espanhol (ex.: "receitas de cafe da manha (desayunos saludables)"); audience descreve o comprador hispanico.
- price: faixa low ticket em dolar, ex.: "US$ 7 a US$ 17".`
    : `- price: faixa low ticket, ex.: "R$ 9,90 a R$ 27".`
}
- Sem promessas medicas, juridicas ou financeiras absolutas.
- Textos curtos: promise, salesAngle, strategicInsight e angle com no maximo 140 caracteres; ate 3 creativeFormats e 4 tags.

Retorne exatamente:
{"items":[{"category":"string (igual ao grupo)","title":"string","niche":"string","audience":"string","productType":"string","price":"string","promise":"string","salesAngle":"string","channel":"string","creativeFormats":["string"],"pageType":"string","strategicInsight":"string","tags":["string"],"angle":"string"}]}`,
    6000,
  );
  return (Array.isArray(data.items) ? data.items : []) as Partial<TrendProduct>[];
}

export async function collectAdLibraryTrends(aiKey: string, market: Market = "br") {
  if (!hasAdLibrarySource()) throw new Error("APIFY_TOKEN nao configurado.");
  if (!aiKey) throw new Error("Chave de IA nao configurada.");
  const { ads, failures } = await collectAds(market);
  return buildTrendsFromAds(ads, failures, aiKey, market);
}

export async function buildTrendsFromAds(ads: AdItem[], failures: string[], aiKey: string, market: Market = "br") {
  const advertisers = groupByAdvertiser(ads, market);
  if (advertisers.length < 10) {
    throw new Error(`Poucos anunciantes validos (${advertisers.length}). Falhas: ${failures.join("; ") || "nenhuma"}`);
  }

  const byId = new Map(advertisers.map((a) => [a.id, a]));
  const classified = await classifyAdvertisers(advertisers, aiKey, market);
  const groups = new Map<string, { backing: Advertiser[]; products: string[] }>();
  for (const item of classified) {
    const advertiser = byId.get(String(item.id));
    const category = CATEGORIES.find((c) => c.toLowerCase() === String(item.category || "").trim().toLowerCase());
    if (!advertiser || !category) continue;
    const group = groups.get(category) || { backing: [], products: [] };
    if (group.backing.includes(advertiser)) continue;
    group.backing.push(advertiser);
    if (item.product) group.products.push(String(item.product).slice(0, 60));
    groups.set(category, group);
  }

  // Mais anunciantes e mais tempo no ar primeiro; até 10 nichos.
  const ranked = [...groups.entries()]
    .map(([category, g]) => ({
      category,
      backing: g.backing,
      products: g.products.slice(0, 6),
      advertisers: g.backing.length,
      oldest: Math.max(...g.backing.map((a) => a.days)),
      totalAds: g.backing.reduce((sum, a) => sum + a.ads, 0),
    }))
    .sort((a, b) => scoreFor(b.advertisers, b.oldest, b.totalAds) - scoreFor(a.advertisers, a.oldest, a.totalAds))
    .slice(0, 10);
  if (!ranked.length) throw new Error("Nenhum anunciante de produto digital classificado.");

  const cards = await writeCards(ranked, aiKey, market);
  const products: TrendProduct[] = [];
  for (const group of ranked) {
    const card = cards.find((c) => String(c.category || "").trim().toLowerCase() === group.category.toLowerCase());
    if (!card?.title) continue;
    const examples = [...new Set(group.products)].slice(0, 3);
    products.push({
      title: String(card.title),
      niche: String(card.niche || card.title),
      audience: String(card.audience || ""),
      productType: productTypes.includes(String(card.productType)) ? String(card.productType) : productTypes[0],
      category: group.category,
      price: String(card.price || (market === "latam" ? "US$ 7 a US$ 17" : "R$ 9,90 a R$ 27")),
      score: scoreFor(group.advertisers, group.oldest, group.totalAds),
      status: statusFor(group.advertisers, group.oldest),
      promise: card.promise,
      salesAngle: card.salesAngle,
      channel: card.channel,
      creativeFormats: card.creativeFormats,
      pageType: card.pageType,
      strategicInsight: card.strategicInsight,
      tags: card.tags,
      adSignal: `${group.advertisers} ${group.advertisers === 1 ? "anunciante ativo" : "anunciantes ativos"} · o mais antigo no ar há ${group.oldest} dias`,
      searchSignal: examples.length ? `No ar agora: ${examples.map((e) => `“${e}”`).join(", ")}` : "",
      trendSignal: `${group.totalAds} ${group.totalAds === 1 ? "anúncio ativo encontrado" : "anúncios ativos encontrados"} ${market === "latam" ? "nesta coleta (América Latina)" : "nesta coleta"}`,
      angle: String(card.angle || card.salesAngle || ""),
    });
  }

  return {
    products: products.sort((a, b) => b.score - a.score).slice(0, 12),
    stats: { ads: ads.length, advertisers: advertisers.length, failures },
  };
}
