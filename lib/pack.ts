// Packs de arquivos (decisão do Brenno, 21/10 e 27/10/2026): nos nichos de pack (stickers, cliparts, artes para
// imprimir, desenhos para colorir...) a IA gera as artes de verdade, uma por chamada, e o ZIP leva as imagens
// + o kit de prompts. Listas de fornecedores ficam fora do painel; nichos com obra ou marca de terceiros também.

export const PACK_SIZE = 20;
export const PACK_STORAGE_BUCKET = "packs";
export const packImageExtensions: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };
// ~US$ 0,034 por arte de 1024 px (teste de 27/10/2026); um pack de 20 ≈ US$ 0,67.
const defaultPackImageModel = "google/gemini-3.1-flash-lite-image";

export type PackItem = { name: string; prompt: string };
export type ProductPack = { style: string; items: PackItem[] };

function plain(value: string) {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

const PACK_HINT =
  /\b(stickers?|adesivos? digita|figurinhas?|cliparts?|estampas?|papeis? digita|scrapbook|colorir|artes? para imprimir|quadros? decorativos?|pack de (artes|imagens|ilustrac)|ilustracoes|pegatinas?|imprimibles?|laminas decorativas|colorear|papel digital)/;

// Obra ou marca de terceiros: vender isso é pirataria (ex.: "pack de quadrinhos e mangás" da coleta de 17/10).
const PIRACY_HINT =
  /(quadrinhos|\bhqs?\b|historietas|comics?\b|mangas?\b|animes?\b|disney|marvel|pokemon|naruto|dragon ball|harry potter|barbie|hello kitty|stitch|frozen|minecraft|roblox|personage(m|ns) (famos|de desenho|de filme)|personajes|desenhos animados|caricaturas animadas|(pack|pdf|download|baixar|descarga) de (filmes|series|livros|cursos|peliculas|libros)|times? de futebol|escudos de|logos? de marcas?|marcas famosas)/;

const SUPPLIER_HINT = /(fornecedor|proveedor|atacadista|mayorista|onde comprar|donde comprar)/;

export function isPackNiche(value: string) {
  return PACK_HINT.test(plain(value));
}

export function isPiracyRisk(value: string) {
  return PIRACY_HINT.test(plain(value));
}

export function isSupplierNiche(value: string) {
  return SUPPLIER_HINT.test(plain(value));
}

// Motivo para recusar o nicho antes de gastar a geração do mês (null = pode gerar).
export function blockedNicheReason(value: string) {
  if (isPiracyRisk(value)) {
    return "Esse nicho usa personagens, marcas ou obras de terceiros. Vender isso é pirataria e pode bloquear sua conta de pagamento. Escolha um tema próprio (ex.: stickers de café, estampas florais).";
  }
  if (isSupplierNiche(value)) {
    return "Listas de fornecedores não estão disponíveis no painel. Escolha outro tipo de produto.";
  }
  return null;
}

export const packJsonShape = '"pack":{"style":"string","items":[{"name":"string","prompt":"string"}]}';

export const packRules = `
ESTE PRODUTO E UM PACK DE ARQUIVOS: o comprador recebe ${PACK_SIZE} artes em imagem geradas por IA + o PDF de uso + um kit de prompts.
- pack.style: 1 frase EM INGLES com o estilo visual unico do pack (tecnica, paleta, traço, fundo), igual para todas as artes. Escolha pelo uso:
  * stickers/adesivos/figurinhas: ilustracao COLORIDA, contorno grosso, borda branca de recorte (die-cut sticker), fundo branco liso;
  * desenhos para colorir: so contorno preto grosso, sem cor, sem sombra, fundo branco;
  * estampas/papel digital: padrao continuo (seamless pattern) colorido ocupando a imagem toda;
  * cliparts/artes para imprimir/quadros: ilustracao colorida e caprichada, fundo branco liso (ou composicao inteira, no caso de quadro).
- pack.items: exatamente ${PACK_SIZE} itens, todos diferentes entre si e dentro do tema. name: nome curto em portugues (ate 5 palavras). prompt: EM INGLES, 1 a 2 frases descrevendo SO o objeto/cena da arte (sem repetir o estilo).
- As artes nunca tem texto, letras, logos, marcas, personagens conhecidos ou pessoas reais.
- productBlueprint: liste "${PACK_SIZE} artes em alta resolução (1024 px)", "Kit de prompts para criar novas artes" e os componentes do PDF de uso.
- productContent (8 a 10 blocos) ensina o comprador a USAR os arquivos: imprimir (papel, tamanho, configuracao), recortar ou aplicar, combinar as artes, ideias de uso e de revenda permitida, erros comuns. Nao descreva arte por arte.
- Aqui pode prometer os arquivos de imagem: eles sao gerados e entram no pacote.
- QUANTIDADE: o pack tem exatamente ${PACK_SIZE} artes. Se o titulo, a promessa, a copy ou a pagina citarem quantidade, use ${PACK_SIZE}, mesmo que o briefing fale em outro numero. Nao cite formato de arquivo (PNG, JPG).`;

function clean(value: unknown, max: number) {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);
}

const COUNTED_ITEMS = "(stickers?|adesivos?|figurinhas?|artes?|cliparts?|estampas?|desenhos?|ilustra(?:ç|c)(?:ões|oes|ão|ao)|imagens?|pegatinas?|láminas?|laminas?|dibujos?)";

// A IA às vezes copia a quantidade do card do nicho ("Kit 30 stickers") e o pack entrega 20: aqui o número
// bate com as artes geradas nos textos de venda (teste no ar de 27/10/2026). O conteúdo do PDF fica como está,
// porque lá "publique 3 stickers por semana" é instrução, não promessa.
const SALES_FIELDS = ["title", "subtitle", "promise", "productBlueprint", "copyBlocks", "salesPage", "landingSections", "ads"] as const;

export function alignPackCount<T extends { pack?: ProductPack }>(product: T): T {
  if (!product.pack) return product;
  const total = product.pack.items.length;
  const fix = (value: unknown) =>
    JSON.parse(
      JSON.stringify(value)
        .replace(new RegExp(`\\b\\d{1,4}(\\s+${COUNTED_ITEMS})`, "gi"), `${total}$1`)
        .replace(/\s+(em|en)\s+(PNG|JPG|JPEG)\b/gi, ""),
    );
  const fixed: Record<string, unknown> = { ...product };
  for (const field of SALES_FIELDS) if (fixed[field] !== undefined) fixed[field] = fix(fixed[field]);
  return fixed as T;
}

export function normalizePack(value: unknown): ProductPack | undefined {
  const pack = value as { style?: unknown; items?: unknown } | undefined;
  if (!pack || !Array.isArray(pack.items)) return undefined;
  const items = pack.items
    .map((item: { name?: unknown; prompt?: unknown }) => ({ name: clean(item?.name, 60), prompt: clean(item?.prompt, 400) }))
    .filter((item) => item.name && item.prompt)
    .slice(0, PACK_SIZE);
  if (items.length < 6) return undefined;
  return { style: clean(pack.style, 300), items };
}

// O servidor fecha o prompt: fundo limpo e nada de texto, marca ou personagem, seja qual for o pedido.
export function packImagePrompt(pack: ProductPack, index: number) {
  const item = pack.items[index];
  return `${item.prompt}. Style: ${pack.style}. High detail, print ready. No text, no letters, no watermark, no logos, no brands, no copyrighted characters, no real people.`;
}

export async function generatePackImage(apiKey: string, prompt: string) {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey.trim()}`,
      "Content-Type": "application/json",
      "X-OpenRouter-Title": "Painel Inteligente",
    },
    body: JSON.stringify({
      model: process.env.PACK_IMAGE_MODEL?.trim() || defaultPackImageModel,
      modalities: ["image", "text"],
      // Sem isso o modelo mistura imagens largas (1408x768) e quadradas no mesmo pack.
      image_config: { aspect_ratio: "1:1" },
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!response.ok) throw new Error((await response.text()) || "A geração da arte falhou.");
  const data = (await response.json()) as { choices?: { message?: { images?: { image_url?: { url?: string } }[] } }[] };
  const url = data.choices?.[0]?.message?.images?.[0]?.image_url?.url || "";
  // O modelo pode devolver PNG ou JPEG: o tipo segue junto para o nome do arquivo sair certo.
  const match = /^data:(image\/(?:png|jpeg|webp));base64,(.+)$/.exec(url);
  if (!match) throw new Error("A IA não devolveu a arte.");
  return { bytes: Buffer.from(match[2], "base64"), type: match[1] };
}

export function packPromptsText(pack: ProductPack) {
  return [
    "KIT DE PROMPTS DO PACK",
    "",
    "Use estes prompts em qualquer gerador de imagem (ChatGPT, Gemini, Leonardo, Ideogram) para criar variações ou artes novas no mesmo estilo.",
    "Troque só a primeira parte (o objeto) e mantenha o estilo para o pack continuar com a mesma cara.",
    "",
    `Estilo do pack: ${pack.style}`,
    "",
    ...pack.items.map((item, index) => `${String(index + 1).padStart(2, "0")}. ${item.name}\n${item.prompt}. Style: ${pack.style}. No text.\n`),
  ].join("\n");
}
