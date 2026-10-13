import { buildProduct, normalizeAiProduct, ProductResult, requestAiJson } from "@/lib/product-engine";

export type AccessStatus = "active" | "pending" | "refunded" | "expired" | "blocked";

export type AuthUser = {
  id: string;
  email: string;
  name?: string;
};

export type Profile = {
  id: string;
  email: string;
  name: string | null;
  access_status: AccessStatus;
  access_expires_at: string | null;
};

export type TrendProduct = {
  title: string;
  niche: string;
  audience: string;
  productType: string;
  category: string;
  price: string;
  score: number;
  status?: "Validado" | "Tendencia" | "Promissor";
  promise?: string;
  salesAngle?: string;
  channel?: string;
  creativeFormats?: string[];
  pageType?: string;
  strategicInsight?: string;
  tags?: string[];
  adSignal: string;
  searchSignal: string;
  trendSignal: string;
  angle: string;
};

type SupabaseConfig = {
  url: string;
  anonKey: string;
  serviceKey: string;
};

type TrendOpportunityRow = {
  id?: string;
  slug: string;
  title: string;
  niche: string;
  audience: string;
  product_type: string;
  category: string;
  price: string;
  score: number;
  status: "Validado" | "Tendencia" | "Promissor";
  promise: string;
  sales_angle: string;
  channel: string;
  creative_formats: string[];
  page_type: string;
  strategic_insight: string;
  tags: string[];
  ad_signal: string;
  search_signal: string;
  trend_signal: string;
  angle: string;
  source: string;
  is_active?: boolean;
  collected_at?: string;
};

export const PRODUCT_LIMIT = 5;
export const COPY_EDITS_PER_PRODUCT_LIMIT = 5;

const fallbackTrendProducts: TrendProduct[] = [
  {
    title: "Marmita fit para vender na semana",
    niche: "marmita fit",
    audience: "pessoas que querem vender comida saudavel",
    productType: "Plano de 7 dias",
    category: "Alimentacao",
    price: "R$47 a R$97",
    score: 94,
    status: "Validado",
    promise: "Montar cardapio, precificar e vender as primeiras marmitas em uma semana.",
    salesAngle: "Comida saudavel virou renda extra: comece com uma rotina simples e sem cozinha profissional.",
    channel: "Organico + trafego pago",
    creativeFormats: ["Tutorial curto", "Rotina da semana", "Antes e depois da organizacao"],
    pageType: "Landing curta com prova de cardapio e calculadora de lucro",
    strategicInsight: "Produto visual, facil de demonstrar e com dor recorrente de renda extra + saude.",
    tags: ["facil producao", "visual", "baixo ticket"],
    adSignal: "Criativos com antes/depois, rotina e preparo rapido",
    searchSignal: "Buscas fortes por cardapio, congelamento e precificacao",
    trendSignal: "Alta demanda por renda extra e comida saudavel",
    angle: "Ensinar uma rotina simples para montar cardapio, calcular lucro e vender as primeiras marmitas.",
  },
  {
    title: "Lista de fornecedores para comecar uma loja",
    niche: "lista de fornecedores",
    audience: "pessoas que querem revender produtos com baixo investimento",
    productType: "Checklist premium",
    category: "Renda extra",
    price: "R$27 a R$97",
    score: 91,
    status: "Validado",
    promise: "Encontrar fornecedores confiaveis e iniciar uma revenda com baixo investimento.",
    salesAngle: "Pare de comprar caro: use uma lista organizada para achar margem antes do primeiro pedido.",
    channel: "Trafego pago + organico",
    creativeFormats: ["Dor direta", "Prova de catalogo", "Lista por segmento"],
    pageType: "Landing direta com promessa, bonus e checkout",
    strategicInsight: "A promessa de curadoria economiza tempo e reduz medo de comprar de fornecedor errado.",
    tags: ["renda extra", "facil producao", "alta demanda"],
    adSignal: "Anuncios com promessa direta, prova de catalogo e bonus",
    searchSignal: "Buscas constantes por fornecedores confiaveis e atacado",
    trendSignal: "Procura alta por renda extra com estoque pequeno",
    angle: "Entregar uma curadoria organizada por segmento, margem e primeiro pedido recomendado.",
  },
  {
    title: "Bolo de pote lucrativo",
    niche: "bolo de pote",
    audience: "maes e iniciantes que querem renda extra na cozinha",
    productType: "Guia pratico",
    category: "Alimentacao",
    price: "R$37 a R$97",
    score: 88,
    status: "Validado",
    promise: "Criar receitas, ficha tecnica e roteiro de venda para lucrar com bolo de pote.",
    salesAngle: "Transforme uma receita simples em produto de bairro com preco, embalagem e abordagem certa.",
    channel: "Organico + trafego pago",
    creativeFormats: ["Receita rapida", "Lucro por unidade", "Bastidores da producao"],
    pageType: "Pagina visual com fotos, margem e passo a passo",
    strategicInsight: "Produto muito demonstravel em video curto, bom para criativos simples e prova local.",
    tags: ["culinaria", "visual", "renda extra"],
    adSignal: "Criativos com receita, lucro por unidade e venda no bairro",
    searchSignal: "Buscas por recheios, validade, embalagem e preco",
    trendSignal: "Produto visual, simples e facil de demonstrar em video curto",
    angle: "Mostrar receitas campeas, ficha tecnica, embalagem e roteiro para vender os primeiros potes.",
  },
  {
    title: "Alongamento em casa para destravar o corpo",
    niche: "alongamento em casa",
    audience: "pessoas com dores leves e rotina sedentaria",
    productType: "Protocolo passo a passo",
    category: "Saude",
    price: "R$47 a R$97",
    score: 84,
    status: "Promissor",
    promise: "Seguir uma rotina curta de alongamento para reduzir travas e melhorar mobilidade.",
    salesAngle: "Seu corpo nao precisa de academia para destravar: precisa de 10 minutos bem guiados.",
    channel: "Organico + trafego pago",
    creativeFormats: ["Demonstracao curta", "Dor especifica", "Rotina diaria"],
    pageType: "Landing educativa com protocolo e checklist",
    strategicInsight: "Funciona melhor com avisos de seguranca e foco em bem-estar, sem promessa medica.",
    tags: ["bem estar", "rotina", "demonstravel"],
    adSignal: "Anuncios com demonstracao rapida, dor especifica e rotina curta",
    searchSignal: "Buscas por lombar, postura, pescoco e flexibilidade",
    trendSignal: "Conteudo recorrente em videos curtos de bem-estar",
    angle: "Criar um protocolo diario com sequencias curtas e acompanhamento de evolucao.",
  },
  {
    title: "Organizacao financeira em 30 minutos",
    niche: "organizacao financeira pessoal",
    audience: "pessoas endividadas que precisam de um plano simples",
    productType: "Mapa de acao",
    category: "Financas",
    price: "R$29 a R$97",
    score: 82,
    status: "Validado",
    promise: "Entender para onde o dinheiro vai e montar um plano simples em 30 minutos.",
    salesAngle: "Voce ganha dinheiro, mas o mes nunca fecha? Organize tudo em um mapa simples.",
    channel: "Organico + trafego pago",
    creativeFormats: ["Tutorial curto", "Dor direta", "Planilha na tela"],
    pageType: "Landing curta com prova social e exemplo visual",
    strategicInsight: "Dor permanente com picos em janeiro, inicio de mes e periodos de divida alta.",
    tags: ["facil producao", "dor forte", "planilha"],
    adSignal: "Criativos com planilha, dividas e alivio financeiro",
    searchSignal: "Buscas por controle de gastos, dividas e planejamento",
    trendSignal: "Dor permanente com boa aceitacao para produto simples",
    angle: "Entregar um passo a passo para mapear gastos, cortar excessos e montar o primeiro plano.",
  },
  {
    title: "Skincare simples para pele oleosa",
    niche: "skincare pele oleosa",
    audience: "mulheres que querem rotina barata e facil",
    productType: "Checklist premium",
    category: "Beleza",
    price: "R$27 a R$67",
    score: 79,
    status: "Promissor",
    promise: "Montar uma rotina simples para pele oleosa usando poucos produtos acessiveis.",
    salesAngle: "Pare de comprar 20 produtos: use uma rotina enxuta para controlar oleosidade.",
    channel: "Organico + trafego pago",
    creativeFormats: ["Erros comuns", "Rotina manha/noite", "Produtos acessiveis"],
    pageType: "Pagina visual com rotina, checklist e lista de compra",
    strategicInsight: "Precisa evitar promessa dermatologica pesada; vender como rotina educativa e pratica.",
    tags: ["beleza", "review", "checklist"],
    adSignal: "Anuncios com rotina, erros comuns e produtos acessiveis",
    searchSignal: "Buscas por oleosidade, acne, manchas e protetor",
    trendSignal: "Assunto forte em criativos de beleza e reviews",
    angle: "Organizar uma rotina simples por manha/noite, com erros para evitar e lista de compra.",
  },
];

export function getMonthKey(date = new Date()) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function jsonError(message: string, status = 400, extra?: Record<string, unknown>) {
  return Response.json({ error: message, ...extra }, { status });
}

export function getSupabaseConfig(): SupabaseConfig {
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !anonKey || !serviceKey) {
    throw new Error("Configure SUPABASE_URL, SUPABASE_ANON_KEY e SUPABASE_SERVICE_ROLE_KEY no servidor.");
  }

  return { url: url.replace(/\/$/, ""), anonKey, serviceKey };
}

export function getServerAiKey() {
  return process.env.OPENROUTER_API_KEY?.trim() || "";
}

export function getPublicAppUrl(request?: Request) {
  const explicitUrl = process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL;
  const vercelUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "";
  const requestOrigin = request ? new URL(request.url).origin : "";
  const url = explicitUrl || requestOrigin || vercelUrl;

  return url.replace(/\/$/, "");
}

export function getBearerToken(request: Request) {
  const authorization = request.headers.get("authorization") || "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match?.[1] || "";
}

export async function supabaseAuthRequest(path: string, init: RequestInit = {}) {
  const config = getSupabaseConfig();
  return fetch(`${config.url}/auth/v1${path}`, {
    ...init,
    headers: {
      apikey: config.anonKey,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
}

export async function supabaseRest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const config = getSupabaseConfig();
  const response = await fetch(`${config.url}/rest/v1${path}`, {
    ...init,
    headers: {
      apikey: config.serviceKey,
      Authorization: `Bearer ${config.serviceKey}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });

  if (!response.ok) {
    throw new Error((await response.text()) || `Supabase REST ${response.status}`);
  }

  const text = await response.text();

  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

export async function getUserFromRequest(request: Request): Promise<AuthUser> {
  const token = getBearerToken(request);

  if (!token) {
    throw new Error("Sessao ausente.");
  }

  const response = await supabaseAuthRequest("/user", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error("Sessao invalida ou expirada.");
  }

  const data = await response.json();
  const email = String(data.email || "").toLowerCase();

  if (!data.id || !email) {
    throw new Error("Usuario invalido.");
  }

  return {
    id: data.id,
    email,
    name: data.user_metadata?.name || data.user_metadata?.full_name || undefined,
  };
}

export async function getProfile(email: string) {
  const rows = await supabaseRest<Profile[]>(
    `/profiles?email=eq.${encodeURIComponent(email.toLowerCase())}&select=*`,
  );
  return rows[0] || null;
}

export async function syncProfileAccess(user: AuthUser) {
  const entitlements = await supabaseRest<
    {
      access_status: AccessStatus;
      access_expires_at: string | null;
      cakto_customer_id: string | null;
      cakto_purchase_id: string | null;
    }[]
  >(`/entitlements?email=eq.${encodeURIComponent(user.email)}&select=*`);
  const entitlement = entitlements[0];
  const existing = await getProfile(user.email);
  const status = entitlement?.access_status || existing?.access_status || "pending";
  const expiresAt = entitlement?.access_expires_at || existing?.access_expires_at || null;

  const [profile] = await supabaseRest<Profile[]>("/profiles?on_conflict=id", {
    method: "POST",
    headers: {
      Prefer: "resolution=merge-duplicates,return=representation",
    },
    body: JSON.stringify({
      id: user.id,
      email: user.email,
      name: user.name || existing?.name || null,
      access_status: isExpired(status, expiresAt) ? "expired" : status,
      access_expires_at: expiresAt,
      cakto_customer_id: entitlement?.cakto_customer_id || null,
      cakto_purchase_id: entitlement?.cakto_purchase_id || null,
      updated_at: new Date().toISOString(),
    }),
  });

  return profile;
}

export function assertActiveProfile(profile: Profile) {
  if (profile.access_status !== "active") {
    throw new AccessError(profile.access_status);
  }

  if (isExpired(profile.access_status, profile.access_expires_at)) {
    throw new AccessError("expired");
  }
}

export async function getUsage(userId: string) {
  const monthKey = getMonthKey();
  const projects = await supabaseRest<{ id: string }[]>(
    `/projects?user_id=eq.${encodeURIComponent(userId)}&month_key=eq.${monthKey}&select=id`,
  );
  const productIds = projects.map((project) => project.id);
  const copyUsage: Record<string, number> = {};

  await Promise.all(
    productIds.map(async (projectId) => {
      const rows = await supabaseRest<{ id: string }[]>(
        `/copy_edits?project_id=eq.${encodeURIComponent(projectId)}&month_key=eq.${monthKey}&select=id`,
      );
      copyUsage[projectId] = rows.length;
    }),
  );

  return {
    monthKey,
    productsUsed: projects.length,
    productsLimit: PRODUCT_LIMIT,
    copyEditsPerProductLimit: COPY_EDITS_PER_PRODUCT_LIMIT,
    copyUsage,
  };
}

export async function listProjects(userId: string) {
  return supabaseRest<
    {
      id: string;
      title: string;
      payload: ProductResult;
      created_at: string;
    }[]
  >(`/projects?user_id=eq.${encodeURIComponent(userId)}&select=id,title,payload,created_at&order=created_at.desc&limit=12`);
}

export async function listTrendOpportunities() {
  try {
    const rows = await supabaseRest<TrendOpportunityRow[]>(
      "/trend_opportunities?is_active=eq.true&select=*&order=score.desc,title.asc&limit=24",
    );

    if (rows.length) {
      return rows.map(mapTrendRowToProduct);
    }
  } catch (error) {
    console.warn("Trend opportunities fell back to the local seed.", error);
  }

  return fallbackTrendProducts;
}

export async function refreshTrendOpportunities(force = false) {
  if (!force) {
    const current = await getFreshTrendOpportunities();

    if (current) {
      return {
        updated: 0,
        skipped: true,
        opportunities: current,
      };
    }
  }

  const products = await collectTrendProducts();
  const rows = products.map(mapTrendProductToRow);
  const savedRows = await supabaseRest<TrendOpportunityRow[]>("/trend_opportunities?on_conflict=slug", {
    method: "POST",
    headers: {
      Prefer: "resolution=merge-duplicates,return=representation",
    },
    body: JSON.stringify(rows),
  });

  return {
    updated: savedRows.length,
    skipped: false,
    opportunities: savedRows.map(mapTrendRowToProduct),
  };
}

export async function createProductForUser(userId: string, payload: ProductResult) {
  const [project] = await supabaseRest<{ id: string; title: string; payload: ProductResult; created_at: string }[]>(
    "/projects",
    {
      method: "POST",
      headers: {
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        user_id: userId,
        title: payload.title,
        payload,
        month_key: getMonthKey(),
      }),
    },
  );
  return project;
}

export async function generateProductPayload(input: {
  niche: string;
  productType: string;
  audience: string;
  tone: string;
  productBrief?: string;
}) {
  const fallback = buildProduct(input.niche, input.productType, input.audience, input.tone);
  const apiKey = getServerAiKey();

  if (!apiKey) {
    return {
      product: fallback,
      source: "internal" as const,
    };
  }

  try {
    const data = await requestAiJson(
      apiKey,
      "Voce cria produtos low ticket em portugues do Brasil. Retorne somente JSON valido, sem markdown, sem comentarios e sem chamar a entrega por nomes genericos. Use linguagem profissional e operacional: fale de entrega, comprador, publico, projeto e execucao. Nao use a palavra aluno. O produto final deve ser uma entrega pratica para o comprador, sem bastidores comerciais.",
      `Crie um produto completo, vendavel e pronto para aplicar com estes dados:
Nicho: ${input.niche}
Publico: ${input.audience}
Tipo de produto: ${input.productType}
Tom da copy: ${input.tone}
${input.productBrief ? `\nBriefing validado da oportunidade:\n${input.productBrief}` : ""}

Regras para a entrega:
- productBlueprint deve listar somente componentes do produto final entregue ao comprador. Nao inclua copy, pagina de vendas, landing page, checkout, anuncios, prompts ou bastidores comerciais.
- productContent deve ter pelo menos 10 blocos praticos, com instrucoes concretas, passo a passo, criterios de seguranca/qualidade quando fizer sentido, erros comuns e acao final clara. O produto final em PDF nunca deve parecer curto.
- Nao prometa ilustracao, planilha, tabela, video ou arquivo adicional se isso nao estiver descrito de forma executavel no conteudo.
- Para saude, bem-estar, financas ou assuntos sensiveis, inclua aviso responsavel sem promessa medica, juridica ou financeira.
- A copy e a salesPage sao arquivos comerciais separados e nao devem aparecer como parte interna do produto final.
- salesPage deve ser uma pagina longa de vendas, com argumentos para varias dobras: problema, consequencia, mecanismo, solucao, o que recebe, para quem e, como aplicar, seguranca/garantia, FAQ ou fechamento. Nao gere uma pagina curta de uma ou duas dobras.
- Escolha a arquitetura mais natural para o produto. Nao force todo projeto para o mesmo formato: checklist/curadoria deve parecer uma ferramenta de validacao; protocolo/plano deve parecer uma sequencia guiada; guia/mapa deve parecer um playbook de decisao e aplicacao.
- Pense tambem na direcao visual do produto: lista/fornecedores deve gerar conteudo com cara de catalogo ou diretorio premium; guia consultivo deve gerar conteudo editorial com capitulos, tabelas e exemplos; protocolo deve gerar conteudo de manual pratico com rotina, fichas e acompanhamento. Varie estrutura, tipo de pagina e conteudo conforme o nicho.

Use no maximo 6 modulos, 6 itens de estrutura, 12 blocos de conteudo, 8 secoes de pagina, 10 secoes de landing page e 5 prompts. Escreva textos objetivos, prontos para usar, sem alongar demais. Nao mencione aluno, aula, curso ou bastidores da ferramenta.

Retorne exatamente este formato JSON:
{"title":"string","subtitle":"string","promise":"string","modules":["string"],"productBlueprint":["string"],"productContent":[{"title":"string","body":"string","task":"string"}],"copyBlocks":{"hook":"string","headline":"string","bullets":["string"],"cta":"string"},"salesPage":{"headline":"string","subheadline":"string","sections":[{"title":"string","body":"string"}],"cta":"string"},"landingSections":["string"],"prompts":["string"]}`,
      3600,
    );

    return {
      product: normalizeAiProduct(data, fallback),
      source: "automatic" as const,
    };
  } catch (error) {
    console.warn("Product generation fell back to the internal engine.", error);
    return {
      product: fallback,
      source: "internal" as const,
    };
  }
}

export async function updateCopyForProject(
  userId: string,
  projectId: string,
  input: { audience: string; tone: string; copyBrief?: string },
) {
  const [project] = await supabaseRest<{ id: string; payload: ProductResult }[]>(
    `/projects?id=eq.${encodeURIComponent(projectId)}&user_id=eq.${encodeURIComponent(userId)}&select=id,payload`,
  );

  if (!project) {
    throw new Error("Projeto nao encontrado.");
  }

  const monthKey = getMonthKey();
  const edits = await supabaseRest<{ id: string }[]>(
    `/copy_edits?project_id=eq.${encodeURIComponent(projectId)}&month_key=eq.${monthKey}&select=id`,
  );

  if (edits.length >= COPY_EDITS_PER_PRODUCT_LIMIT) {
    throw new LimitError("Limite de alteracoes deste produto atingido.");
  }

  const base = project.payload;
  const apiKey = getServerAiKey();
  let nextPayload = base;

  if (apiKey) {
    try {
      const data = await requestAiJson(
        apiKey,
        "Voce e especialista em copy de resposta direta para vender produtos low ticket no Brasil. Retorne somente JSON valido, sem markdown. A copy sempre deve vender o produto descrito para o comprador final.",
        `Crie uma copy completa para vender esta oferta ao comprador final:
Titulo: ${base.title}
Subtitulo: ${base.subtitle}
Promessa: ${base.promise}
Modulos e beneficios: ${base.modules.join("; ")}
Pontos da entrega: ${base.productBlueprint.join("; ")}
Publico: ${input.audience}
Tom: ${input.tone}
Pedido especifico: ${input.copyBrief?.trim() || "nenhum"}

Regras obrigatorias:
- Fale com a pessoa que compraria e usaria "${base.title}".
- Destaque a transformacao, os beneficios e a aplicacao pratica desta oferta.
- Nao venda o Painel Inteligente, uma ferramenta, uma IA, um metodo de criacao, um curso, um processo interno ou a criacao de produtos.
- Nao fale sobre o criador, bastidores, painel, prompts, APIs ou como a oferta foi produzida.
- O texto deve fazer sentido mesmo que o comprador nunca tenha ouvido falar de inteligencia artificial.
- Escreva em portugues do Brasil, com clareza e sem promessas absolutas.

Retorne exatamente este JSON:
{"copyBlocks":{"hook":"string","headline":"string","bullets":["string"],"cta":"string"},"prompts":["string"]}`,
        1600,
      );

      nextPayload = {
        ...base,
        copyBlocks: {
          hook: data.copyBlocks?.hook || base.copyBlocks.hook,
          headline: data.copyBlocks?.headline || base.copyBlocks.headline,
          bullets:
            Array.isArray(data.copyBlocks?.bullets) && data.copyBlocks.bullets.length
              ? data.copyBlocks.bullets.slice(0, 8)
              : base.copyBlocks.bullets,
          cta: data.copyBlocks?.cta || base.copyBlocks.cta,
        },
        prompts: Array.isArray(data.prompts) && data.prompts.length ? data.prompts.slice(0, 6) : base.prompts,
      };
    } catch (error) {
      console.warn("Copy generation kept the current project payload.", error);
    }
  } else {
    nextPayload = {
      ...base,
      copyBlocks: {
        hook: `Descubra como aplicar ${base.title.toLowerCase()} com mais clareza e menos tentativa e erro.`,
        headline: `${base.title}: um caminho pratico para comecar`,
        bullets: [
          base.promise,
          ...base.productBlueprint.slice(0, 3),
        ],
        cta: `Clique em saiba mais e conheca ${base.title.toLowerCase()}.`,
      },
    };
  }

  await supabaseRest("/copy_edits", {
    method: "POST",
    body: JSON.stringify({
      user_id: userId,
      project_id: projectId,
      payload: nextPayload.copyBlocks,
      month_key: monthKey,
    }),
  });

  const [updated] = await supabaseRest<{ id: string; title: string; payload: ProductResult; created_at: string }[]>(
    `/projects?id=eq.${encodeURIComponent(projectId)}&user_id=eq.${encodeURIComponent(userId)}`,
    {
      method: "PATCH",
      headers: {
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        payload: nextPayload,
        updated_at: new Date().toISOString(),
      }),
    },
  );

  return {
    project: updated,
    editsUsed: edits.length + 1,
    editsLimit: COPY_EDITS_PER_PRODUCT_LIMIT,
  };
}

async function collectTrendProducts() {
  const external = await fetchExternalTrendProducts();

  if (external.length) {
    return external.map((item, index) => normalizeTrendProduct(item, fallbackTrendProducts[index % fallbackTrendProducts.length]));
  }

  const apiKey = getServerAiKey();

  if (!apiKey) {
    return fallbackTrendProducts;
  }

  try {
    const data = await requestAiJson(
      apiKey,
      "Voce e analista de oportunidades low ticket no Brasil. Retorne somente JSON valido, sem markdown. Use sinais de anuncios, busca e tendencia como hipoteses operacionais, sem citar ferramentas internas.",
      `Atualize uma lista de oportunidades para produtos digitais low ticket de ate R$97.
Data de referencia: ${new Date().toISOString().slice(0, 10)}

Regras:
- Gere de 8 a 12 oportunidades variadas em categorias diferentes.
- Evite repetir sempre os mesmos exemplos.
- Cada oportunidade deve ter promessa concreta, publico, angulo de venda, sinais de anuncios, sinais de busca e sinal de tendencia.
- Nao fale sobre IA, painel, criacao de produtos, aluno, curso ou bastidores.
- Evite promessas medicas, juridicas ou financeiras absolutas.

Retorne exatamente este JSON:
{"items":[{"title":"string","niche":"string","audience":"string","productType":"string","category":"string","price":"string","score":80,"status":"Validado","promise":"string","salesAngle":"string","channel":"string","creativeFormats":["string"],"pageType":"string","strategicInsight":"string","tags":["string"],"adSignal":"string","searchSignal":"string","trendSignal":"string","angle":"string"}]}`,
      2200,
    );
    const items: Partial<TrendProduct>[] = Array.isArray(data.items) ? data.items : [];

    if (items.length) {
      return items.slice(0, 12).map((item, index) => normalizeTrendProduct(item, fallbackTrendProducts[index % fallbackTrendProducts.length]));
    }
  } catch (error) {
    console.warn("AI trend refresh fell back to the local seed.", error);
  }

  return fallbackTrendProducts;
}

async function fetchExternalTrendProducts() {
  const sourceUrl = process.env.TREND_SOURCE_URL?.trim();

  if (!sourceUrl) {
    return [] as Partial<TrendProduct>[];
  }

  try {
    const response = await fetch(sourceUrl, {
      headers: {
        Accept: "application/json",
        ...(process.env.TREND_SOURCE_TOKEN ? { Authorization: `Bearer ${process.env.TREND_SOURCE_TOKEN}` } : {}),
      },
    });

    if (!response.ok) {
      throw new Error(`Fonte externa retornou ${response.status}`);
    }

    const data = await response.json();
    const items = Array.isArray(data) ? data : Array.isArray(data.items) ? data.items : [];
    return items.slice(0, 24) as Partial<TrendProduct>[];
  } catch (error) {
    console.warn("External trend source failed.", error);
    return [];
  }
}

function normalizeTrendProduct(item: Partial<TrendProduct>, fallback: TrendProduct): TrendProduct {
  const score = Number(item.score ?? fallback.score);
  const status = item.status && ["Validado", "Tendencia", "Promissor"].includes(item.status) ? item.status : fallback.status;

  return {
    title: cleanText(item.title, fallback.title),
    niche: cleanText(item.niche, fallback.niche),
    audience: cleanText(item.audience, fallback.audience),
    productType: cleanText(item.productType, fallback.productType),
    category: cleanText(item.category, fallback.category),
    price: cleanText(item.price, fallback.price),
    score: Number.isFinite(score) ? Math.max(1, Math.min(100, Math.round(score))) : fallback.score,
    status,
    promise: cleanText(item.promise, fallback.promise || fallback.angle),
    salesAngle: cleanText(item.salesAngle, fallback.salesAngle || fallback.angle),
    channel: cleanText(item.channel, fallback.channel || "Organico + trafego pago"),
    creativeFormats: cleanList(item.creativeFormats, fallback.creativeFormats || [fallback.adSignal]),
    pageType: cleanText(item.pageType, fallback.pageType || "Landing direta com promessa, prova e checkout"),
    strategicInsight: cleanText(item.strategicInsight, fallback.strategicInsight || fallback.trendSignal),
    tags: cleanList(item.tags, fallback.tags || [fallback.category]),
    adSignal: cleanText(item.adSignal, fallback.adSignal),
    searchSignal: cleanText(item.searchSignal, fallback.searchSignal),
    trendSignal: cleanText(item.trendSignal, fallback.trendSignal),
    angle: cleanText(item.angle, fallback.angle),
  };
}

function mapTrendProductToRow(product: TrendProduct): TrendOpportunityRow {
  const now = new Date().toISOString();

  return {
    slug: slugify(product.title),
    title: product.title,
    niche: product.niche,
    audience: product.audience,
    product_type: product.productType,
    category: product.category,
    price: product.price,
    score: product.score,
    status: product.status || (product.score >= 88 ? "Validado" : product.score >= 82 ? "Tendencia" : "Promissor"),
    promise: product.promise || product.angle,
    sales_angle: product.salesAngle || product.angle,
    channel: product.channel || "Organico + trafego pago",
    creative_formats: product.creativeFormats || [product.adSignal],
    page_type: product.pageType || "Landing direta com promessa, prova e checkout",
    strategic_insight: product.strategicInsight || product.trendSignal,
    tags: product.tags || [product.category],
    ad_signal: product.adSignal,
    search_signal: product.searchSignal,
    trend_signal: product.trendSignal,
    angle: product.angle,
    source: process.env.TREND_SOURCE_URL ? "external" : getServerAiKey() ? "ai-curation" : "seed",
    is_active: true,
    collected_at: now,
  };
}

function mapTrendRowToProduct(row: TrendOpportunityRow): TrendProduct {
  return {
    title: row.title,
    niche: row.niche,
    audience: row.audience,
    productType: row.product_type,
    category: row.category,
    price: row.price,
    score: row.score,
    status: row.status,
    promise: row.promise,
    salesAngle: row.sales_angle,
    channel: row.channel,
    creativeFormats: row.creative_formats || [],
    pageType: row.page_type,
    strategicInsight: row.strategic_insight,
    tags: row.tags || [],
    adSignal: row.ad_signal,
    searchSignal: row.search_signal,
    trendSignal: row.trend_signal,
    angle: row.angle,
  };
}

function cleanText(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, 360) : fallback;
}

function cleanList(value: unknown, fallback: string[]) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && Boolean(item.trim())).map((item) => item.trim().slice(0, 90)).slice(0, 8)
    : fallback;
}

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}

async function getFreshTrendOpportunities() {
  try {
    const intervalDays = Math.max(1, Math.min(30, Number(process.env.TREND_REFRESH_INTERVAL_DAYS || 3) || 3));
    const latest = await supabaseRest<{ collected_at: string }[]>(
      "/trend_opportunities?is_active=eq.true&select=collected_at&order=collected_at.desc&limit=1",
    );
    const latestCollectedAt = latest[0]?.collected_at ? new Date(latest[0].collected_at).getTime() : 0;
    const nextRefreshAt = latestCollectedAt + intervalDays * 24 * 60 * 60 * 1000;

    if (latestCollectedAt && Date.now() < nextRefreshAt) {
      return listTrendOpportunities();
    }
  } catch (error) {
    console.warn("Trend freshness check failed.", error);
  }

  return null;
}

export async function updatePageForProject(userId: string, projectId: string, input: { audience: string; tone: string }) {
  const [project] = await supabaseRest<{ id: string; payload: ProductResult }[]>(
    `/projects?id=eq.${encodeURIComponent(projectId)}&user_id=eq.${encodeURIComponent(userId)}&select=id,payload`,
  );

  if (!project) {
    throw new Error("Projeto nao encontrado.");
  }

  const monthKey = getMonthKey();
  const edits = await supabaseRest<{ id: string }[]>(
    `/copy_edits?project_id=eq.${encodeURIComponent(projectId)}&month_key=eq.${monthKey}&select=id`,
  );

  if (edits.length >= COPY_EDITS_PER_PRODUCT_LIMIT) {
    throw new LimitError("Limite de alteracoes deste produto atingido.");
  }

  const base = project.payload;
  const apiKey = getServerAiKey();
  let nextPayload = base;

  if (apiKey) {
    try {
      const data = await requestAiJson(
        apiKey,
        "Voce cria paginas de venda diretas, claras e persuasivas em portugues do Brasil. Retorne somente JSON valido, sem markdown.",
        `Crie a estrutura completa de uma pagina de venda para esta oferta:
Titulo: ${base.title}
Promessa: ${base.promise}
Copy principal: ${base.copyBlocks.headline}
Publico: ${input.audience}
Tom: ${input.tone}

Retorne exatamente este JSON:
{"salesPage":{"headline":"string","subheadline":"string","sections":[{"title":"string","body":"string"}],"cta":"string"},"landingSections":["string"]}`,
        2200,
      );

      nextPayload = {
        ...base,
        salesPage: {
          headline: data.salesPage?.headline || base.salesPage.headline,
          subheadline: data.salesPage?.subheadline || base.salesPage.subheadline,
          sections:
            Array.isArray(data.salesPage?.sections) && data.salesPage.sections.length
              ? data.salesPage.sections.slice(0, 8).map((section: { title?: string; body?: string }, index: number) => ({
                  title: section.title || base.salesPage.sections[index]?.title || `Secao ${index + 1}`,
                  body: section.body || base.salesPage.sections[index]?.body || base.promise,
                }))
              : base.salesPage.sections,
          cta: data.salesPage?.cta || base.salesPage.cta,
        },
        landingSections:
          Array.isArray(data.landingSections) && data.landingSections.length
            ? data.landingSections.slice(0, 9)
            : base.landingSections,
      };
    } catch (error) {
      console.warn("Sales page generation kept the current project payload.", error);
    }
  }

  await supabaseRest("/copy_edits", {
    method: "POST",
    body: JSON.stringify({
      user_id: userId,
      project_id: projectId,
      payload: {
        salesPage: nextPayload.salesPage,
        landingSections: nextPayload.landingSections,
      },
      month_key: monthKey,
    }),
  });

  const [updated] = await supabaseRest<{ id: string; title: string; payload: ProductResult; created_at: string }[]>(
    `/projects?id=eq.${encodeURIComponent(projectId)}&user_id=eq.${encodeURIComponent(userId)}`,
    {
      method: "PATCH",
      headers: {
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        payload: nextPayload,
        updated_at: new Date().toISOString(),
      }),
    },
  );

  return {
    project: updated,
    editsUsed: edits.length + 1,
    editsLimit: COPY_EDITS_PER_PRODUCT_LIMIT,
  };
}

function isExpired(status: AccessStatus, expiresAt: string | null) {
  return status === "active" && Boolean(expiresAt) && new Date(expiresAt as string).getTime() < Date.now();
}

export class AccessError extends Error {
  constructor(public status: AccessStatus) {
    super("Acesso indisponivel.");
  }
}

export class LimitError extends Error {}
