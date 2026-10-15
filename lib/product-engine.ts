import { normalizeSalesExtras, withoutReadingWords, type SalesPageExtras } from "@/lib/sales-page";

export type ProductContentBlock = {
  title: string;
  body: string;
  task: string;
  // Campos opcionais usados pelo PDF premium; projetos antigos não têm.
  points?: string[];
  tip?: string;
  example?: string;
  table?: { columns: string[]; rows: string[][] };
  entries?: { name: string; detail: string; tag?: string }[];
};

export type ProductFormat = "editorial" | "manual" | "catalogo";

// O formato do PDF segue o tipo de produto escolhido no painel.
export function productFormatFor(productType: string): ProductFormat {
  const value = productType.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (/protocolo|plano|dias|rotina|desafio|passo a passo|cronograma/.test(value)) return "manual";
  if (/checklist|catalogo|lista|curadoria|selecao|diretorio/.test(value)) return "catalogo";
  return "editorial";
}

export type SalesPageContent = SalesPageExtras & {
  headline: string;
  subheadline: string;
  sections: {
    title: string;
    body: string;
  }[];
  cta: string;
};

export type ProductResult = {
  title: string;
  subtitle: string;
  promise: string;
  modules: string[];
  productBlueprint: string[];
  productContent: ProductContentBlock[];
  format?: ProductFormat;
  intro?: string;
  closing?: string;
  copyBlocks: {
    hook: string;
    headline: string;
    bullets: string[];
    cta: string;
  };
  salesPage: SalesPageContent;
  landingSections: string[];
  prompts: string[];
};

export const productTypes = [
  "Guia pratico",
  "Protocolo passo a passo",
  "Plano de 7 dias",
  "Mapa de acao",
  "Checklist premium",
];

export const toneOptions = [
  "Direto e popular",
  "Sofisticado",
  "Emocional",
  "Autoridade",
];

export const defaultAiModel = "openrouter/auto";

function getAiModel() {
  return process.env.OPENROUTER_MODEL?.trim() || defaultAiModel;
}

export function buildProduct(niche: string, productType: string, audience: string, tone: string): ProductResult {
  const cleanNiche = niche.trim() || "marmita fit";
  const cleanAudience = audience.trim() || "pessoas que querem vender comida saudavel";
  const cleanType = productType || productTypes[0];
  const cleanTone = tone || toneOptions[0];
  const title = withoutReadingWords(`${cleanType}: ${capitalize(cleanNiche)}`);

  return {
    title,
    subtitle: `Um produto digital completo para ajudar ${cleanAudience} a sair do zero em ${cleanNiche}.`,
    promise: `Criar uma transformacao clara em ${cleanNiche}, com uma entrega simples de consumir, facil de vender e pronta para virar oferta.`,
    modules: [
      `Diagnostico rapido: onde ${cleanAudience} estao travados hoje`,
      `O plano principal aplicado em ${cleanNiche}`,
      "Plano de execucao sem equipe, sem aparecer e sem conhecimento tecnico",
      "Rotina de ativacao: produto, pagina, anuncio e primeira venda",
      "Erros que fazem o iniciante desistir antes de vender",
    ],
    productBlueprint: [
      "Capa com promessa direta e nome da transformacao",
      "Pagina de boas-vindas com historia curta e promessa do produto",
      "Mapa visual dos passos: escolher nicho, montar produto, publicar oferta",
      "Conteudo principal dividido em aulas curtas ou capitulos objetivos",
      "Checklist final para confirmar que a entrega esta pronta para vender",
    ],
    productContent: [
      {
        title: "Boas-vindas e promessa",
        body: `Este produto mostra para ${cleanAudience} como aplicar ${cleanNiche} de forma simples, com passos curtos, sem excesso de teoria e com foco no primeiro resultado pratico.`,
        task: "Defina o objetivo principal da entrega e marque o primeiro passo que sera executado hoje.",
      },
      {
        title: "Diagnostico rapido",
        body: "Antes de executar, identifique onde esta o principal bloqueio: falta de clareza, falta de rotina, oferta confusa ou dificuldade para transformar conhecimento em acao.",
        task: "Preencha o diagnostico com 3 problemas atuais, 3 recursos disponiveis e 1 meta para os proximos 7 dias.",
      },
      {
        title: "Plano principal",
        body: `A entrega central deve conduzir uma sequencia objetiva: preparar, organizar, executar, revisar e vender a transformacao criada com ${cleanNiche}.`,
        task: "Siga o checklist do modulo e conclua uma versao simples do produto antes de tentar melhorar os detalhes.",
      },
      {
        title: "Ativacao da oferta",
        body: "Com a entrega pronta, o proximo passo e montar uma promessa clara, uma pagina simples e uma chamada direta para levar o comprador ate a decisao.",
        task: "Use a copy criada no painel para publicar a primeira versao da pagina de venda.",
      },
    ],
    copyBlocks: {
      hook: `Para tudo que voce esta fazendo: nos proximos minutos eu vou te mostrar como transformar ${cleanNiche} em um produto digital vendavel, mesmo que voce esteja comecando agora.`,
      headline: `Crie seu primeiro produto sobre ${cleanNiche} sem escrever tudo do zero`,
      bullets: [
        `Ideal para ${cleanAudience} que querem uma entrega simples e rapida`,
        "Estrutura pronta para produto, texto de vendas e pagina",
        "Nao precisa aparecer, falar ingles ou contratar equipe",
        "Pensado para vender no automatico depois da configuracao inicial",
      ],
      cta: "Quero criar meu produto agora",
    },
    salesPage: {
      headline: `Transforme ${cleanNiche} em uma oferta simples, clara e pronta para vender`,
      subheadline: `Um caminho guiado para ${cleanAudience} criarem uma entrega objetiva, uma mensagem persuasiva e uma pagina de venda sem complicar.`,
      sections: [
        {
          title: "Para quem e",
          body: `Criado para ${cleanAudience} que querem sair da ideia solta e montar uma entrega vendavel em ${cleanNiche}.`,
        },
        {
          title: "O problema",
          body: "A maioria das pessoas demora porque tenta criar algo grande demais, sem promessa clara e sem uma sequencia simples de execucao.",
        },
        {
          title: "A solucao",
          body: `O ${cleanType.toLowerCase()} organiza a transformacao em passos curtos, com estrutura, exemplos e acoes praticas para aplicar imediatamente.`,
        },
        {
          title: "O que recebe",
          body: "Estrutura da entrega, roteiro de aplicacao, checklist final, copy de vendas e direcao para montar a pagina.",
        },
      ],
      cta: "Quero acessar agora",
    },
    landingSections: [
      `Hero: ${title} + promessa de resultado sem complexidade`,
      "Prova: mostrar print, numero ou exemplo de transformacao possivel",
      "Dor: explicar por que afiliado, dropshipping e tentativa aleatoria travam o iniciante",
      "Mecanismo: apresentar a solucao como a forma mais simples de chegar no resultado",
      "Oferta: produto, suporte, agente de copy e prompts de alta conversao",
      "Garantia: 90 dias com condicao clara de aplicacao",
      "CTA final: vagas limitadas e chamada para agir hoje",
    ],
    prompts: [
      `Crie a estrutura de um produto digital chamado "${title}" para ${cleanAudience}, com tom ${cleanTone} e sem usar nomes genericos para a entrega.`,
      `Escreva uma pagina de vendas para "${title}" usando gancho, prova, historia, mecanismo, oferta, garantia e CTA.`,
      `Transforme este produto em uma apresentacao visual com capa, promessa, capitulos e checklist final.`,
      `Crie uma pagina de vendas para "${title}" com secao hero, prova, beneficios, garantia e botao de compra.`,
    ],
  };
}

export function normalizeAiProduct(data: Partial<ProductResult>, fallback: ProductResult): ProductResult {
  const normalized = {
    title: withoutReadingWords(data.title || fallback.title),
    subtitle: withoutReadingWords(data.subtitle || fallback.subtitle),
    promise: data.promise || fallback.promise,
    modules: Array.isArray(data.modules) && data.modules.length ? data.modules.slice(0, 7) : fallback.modules,
    productBlueprint:
      Array.isArray(data.productBlueprint) && data.productBlueprint.length
        ? data.productBlueprint.slice(0, 7)
        : fallback.productBlueprint,
    productContent:
      Array.isArray(data.productContent) && data.productContent.length
        ? data.productContent.slice(0, 12).map((block, index) => ({
            title: block?.title || fallback.productContent[index]?.title || `Parte ${index + 1}`,
            body: block?.body || fallback.productContent[index]?.body || fallback.promise,
            task: block?.task || fallback.productContent[index]?.task || "Aplicar este passo antes de avancar.",
            ...normalizeBlockExtras(block),
          }))
        : fallback.productContent,
    copyBlocks: {
      hook: data.copyBlocks?.hook || fallback.copyBlocks.hook,
      headline: data.copyBlocks?.headline || fallback.copyBlocks.headline,
      bullets:
        Array.isArray(data.copyBlocks?.bullets) && data.copyBlocks.bullets.length
          ? data.copyBlocks.bullets.slice(0, 8)
          : fallback.copyBlocks.bullets,
      cta: data.copyBlocks?.cta || fallback.copyBlocks.cta,
    },
    salesPage: {
      ...normalizeSalesExtras(data.salesPage),
      headline: data.salesPage?.headline || fallback.salesPage.headline,
      subheadline: data.salesPage?.subheadline || fallback.salesPage.subheadline,
      sections:
        Array.isArray(data.salesPage?.sections) && data.salesPage.sections.length
          ? data.salesPage.sections.slice(0, 8).map((section, index) => ({
              title: section?.title || fallback.salesPage.sections[index]?.title || `Secao ${index + 1}`,
              body: section?.body || fallback.salesPage.sections[index]?.body || fallback.promise,
            }))
          : fallback.salesPage.sections,
      cta: data.salesPage?.cta || fallback.salesPage.cta,
    },
    landingSections:
      Array.isArray(data.landingSections) && data.landingSections.length
        ? data.landingSections.slice(0, 9)
        : fallback.landingSections,
    prompts: Array.isArray(data.prompts) && data.prompts.length ? data.prompts.slice(0, 6) : fallback.prompts,
    ...(isFormat(data.format) ? { format: data.format } : {}),
    ...(text(data.intro) ? { intro: text(data.intro) } : {}),
    ...(text(data.closing) ? { closing: text(data.closing) } : {}),
  };

  return sanitizeProductLanguage(normalized);
}

function isFormat(value: unknown): value is ProductFormat {
  return value === "editorial" || value === "manual" || value === "catalogo";
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function textList(value: unknown, max: number) {
  return Array.isArray(value) ? value.map(text).filter(Boolean).slice(0, max) : [];
}

// Mantém só os extras bem formados; o template ignora o que vier ausente.
function normalizeBlockExtras(block: Partial<ProductContentBlock> | undefined) {
  const extras: Partial<ProductContentBlock> = {};
  if (!block) return extras;
  const points = textList(block.points, 5);
  if (points.length) extras.points = points;
  if (text(block.tip)) extras.tip = text(block.tip);
  if (text(block.example)) extras.example = text(block.example);
  const columns = textList(block.table?.columns, 4);
  const rows = Array.isArray(block.table?.rows)
    ? block.table.rows
        .filter(Array.isArray)
        .map((row) => columns.map((_, index) => text(row[index])))
        .filter((row) => row.some(Boolean))
        .slice(0, 8)
    : [];
  if (columns.length >= 2 && rows.length) extras.table = { columns, rows };
  const entries = Array.isArray(block.entries)
    ? block.entries
        .map((entry) => ({ name: text(entry?.name), detail: text(entry?.detail), tag: text(entry?.tag) }))
        .filter((entry) => entry.name && entry.detail)
        .map((entry) => (entry.tag ? entry : { name: entry.name, detail: entry.detail }))
        .slice(0, 6)
    : [];
  if (entries.length) extras.entries = entries;
  return extras;
}

function professionalizeText(value: string) {
  return value
    .replace(/\bChecklist final para o aluno saber exatamente quando esta pronto para vender\b/gi, "Checklist final para confirmar que a entrega esta pronta para vender")
    .replace(/\bEscreva o objetivo principal do aluno\b/gi, "Defina o objetivo principal da entrega")
    .replace(/\bo aluno precisa entender\b/gi, "e preciso entender")
    .replace(/\bA entrega central deve guiar o aluno\b/gi, "A entrega central deve conduzir a execucao")
    .replace(/\bpara o aluno concluir\b/gi, "para aplicar")
    .replace(/\bdo aluno\b/gi, "da entrega")
    .replace(/\bpara o aluno\b/gi, "para aplicar")
    .replace(/\bo aluno\b/gi, "a pessoa")
    .replace(/\baluno\b/gi, "pessoa");
}

function sanitizeProductLanguage(product: ProductResult): ProductResult {
  return {
    ...product,
    title: professionalizeText(product.title),
    subtitle: professionalizeText(product.subtitle),
    promise: professionalizeText(product.promise),
    modules: product.modules.map(professionalizeText),
    productBlueprint: product.productBlueprint.map(professionalizeText),
    productContent: product.productContent.map((block) => ({
      ...block,
      title: professionalizeText(block.title),
      body: professionalizeText(block.body),
      task: professionalizeText(block.task),
      ...(block.tip ? { tip: professionalizeText(block.tip) } : {}),
      ...(block.example ? { example: professionalizeText(block.example) } : {}),
      ...(block.points ? { points: block.points.map(professionalizeText) } : {}),
    })),
    ...(product.intro ? { intro: professionalizeText(product.intro) } : {}),
    ...(product.closing ? { closing: professionalizeText(product.closing) } : {}),
    copyBlocks: {
      hook: professionalizeText(product.copyBlocks.hook),
      headline: professionalizeText(product.copyBlocks.headline),
      bullets: product.copyBlocks.bullets.map(professionalizeText),
      cta: professionalizeText(product.copyBlocks.cta),
    },
    salesPage: {
      ...product.salesPage,
      headline: professionalizeText(product.salesPage.headline),
      subheadline: professionalizeText(product.salesPage.subheadline),
      sections: product.salesPage.sections.map((section) => ({
        title: professionalizeText(section.title),
        body: professionalizeText(section.body),
      })),
      cta: professionalizeText(product.salesPage.cta),
    },
    landingSections: product.landingSections.map(professionalizeText),
    prompts: product.prompts.map(professionalizeText),
  };
}

export function extractJsonObject(value: string) {
  const fenced = value.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = fenced?.[1] ?? value;
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");

  if (start === -1 || end === -1) {
    throw new Error("A IA nao retornou um projeto valido.");
  }

  return JSON.parse(body.slice(start, end + 1));
}

async function postAiRequest(apiKey: string, system: string, prompt: string, maxTokens: number, forceJson: boolean) {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey.trim()}`,
      "Content-Type": "application/json",
      "X-OpenRouter-Title": "Painel Inteligente",
    },
    body: JSON.stringify({
      model: getAiModel(),
      temperature: 0.74,
      max_tokens: maxTokens,
      stream: true,
      // Sem raciocínio interno: ele consome o limite de saída e a resposta volta vazia.
      reasoning: { enabled: false },
      ...(forceJson ? { response_format: { type: "json_object" } } : {}),
      messages: [
        {
          role: "system",
          content: `${system}\n\nResponda somente com um objeto JSON valido. Nao use markdown, explicacoes, listas fora do JSON ou texto antes/depois.`,
        },
        { role: "user", content: prompt },
      ],
    }),
  });

  return response;
}

export async function requestAiJson(apiKey: string, system: string, prompt: string, maxTokens = 2000) {
  let response = await postAiRequest(apiKey, system, prompt, maxTokens, true);

  if (!response.ok) {
    const errorBody = await response.text();

    if (/response_format|json_object/i.test(errorBody)) {
      response = await postAiRequest(apiKey, system, prompt, maxTokens, false);
    } else {
      throw new Error(errorBody || "A chamada de IA falhou.");
    }
  }

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(errorBody || "A chamada de IA falhou.");
  }

  const content = await readStreamedContent(response);

  if (!content.trim()) {
    throw new Error("A IA nao retornou texto.");
  }

  return extractJsonObject(content);
}

// A resposta vem em fluxo (SSE): mantém a conexão ativa em gerações longas, que sem fluxo
// eram cortadas por volta de 60 s.
async function readStreamedContent(response: Response) {
  if (!response.body) return "";
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let content = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;
      const chunk = JSON.parse(payload);
      if (chunk.error) throw new Error(chunk.error.message || "A chamada de IA falhou.");
      content += chunk.choices?.[0]?.delta?.content || "";
    }
  }

  return content;
}

function capitalize(value: string) {
  return value
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
