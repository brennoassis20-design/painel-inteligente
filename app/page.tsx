"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type AccessStatus = "active" | "pending" | "refunded" | "expired" | "blocked";
type ActiveView = "radar" | "gerador" | "produto" | "copy" | "arquivos";

type ProductContentBlock = {
  title: string;
  body: string;
  task: string;
};

type SalesPageContent = {
  headline: string;
  subheadline: string;
  sections: {
    title: string;
    body: string;
  }[];
  cta: string;
};

type ProductResult = {
  title: string;
  subtitle: string;
  promise: string;
  modules: string[];
  productBlueprint: string[];
  productContent: ProductContentBlock[];
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

type TrendProduct = {
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

type UsageState = {
  productsUsed: number;
  productsLimit: number;
  copyEditsPerProductLimit: number;
  copyUsage: Record<string, number>;
};

type SavedProject = {
  id: string;
  title: string;
  payload: ProductResult;
  created_at?: string;
};

const productTypes = [
  "Guia pratico",
  "Protocolo passo a passo",
  "Plano de 7 dias",
  "Mapa de acao",
  "Checklist premium",
];

const toneOptions = [
  "Direto e popular",
  "Sofisticado",
  "Emocional",
  "Autoridade",
];

const menuItems: { id: ActiveView; label: string }[] = [
  { id: "radar", label: "Nichos em alta" },
  { id: "gerador", label: "Gerador" },
  { id: "produto", label: "Produto criado" },
  { id: "copy", label: "Copy" },
  { id: "arquivos", label: "Meus arquivos" },
];

const sessionKey = "painel-inteligente-session";

const trendProducts: TrendProduct[] = [
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
    adSignal: "Muitos criativos com antes/depois, rotina e preparo rapido",
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
    creativeFormats: ["Dor -> solucao", "Prova de catalogo", "Lista por segmento"],
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
    creativeFormats: ["Tutorial curto", "Dor -> solucao", "Planilha na tela"],
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

function getTrendStatus(product: TrendProduct) {
  return product.status || (product.score >= 88 ? "Validado" : product.score >= 82 ? "Tendencia" : "Promissor");
}

function getOpportunityBrief(product: TrendProduct) {
  return [
    `Produto sugerido: ${product.title}`,
    `Formato: ${product.productType}`,
    `Ticket: ${product.price}`,
    `Categoria: ${product.category}`,
    `Status: ${getTrendStatus(product)}`,
    `Promessa: ${product.promise || product.angle}`,
    `Publico-alvo: ${product.audience}`,
    `Angulo de venda: ${product.salesAngle || product.angle}`,
    `Canal recomendado: ${product.channel || "Organico + trafego pago"}`,
    `Formatos de criativo: ${(product.creativeFormats || [product.adSignal, product.trendSignal]).join(", ")}`,
    `Tipo de pagina sugerida: ${product.pageType || "Landing curta com promessa clara, prova e checkout"}`,
    `Insight estrategico: ${product.strategicInsight || product.trendSignal}`,
  ].join("\n");
}

function buildProduct(niche: string, productType: string, audience: string, tone: string): ProductResult {
  const cleanNiche = niche.trim() || "marmita fit";
  const cleanAudience = audience.trim() || "pessoas que querem vender comida saudavel";
  const cleanType = productType || productTypes[0];
  const cleanTone = tone || toneOptions[0];
  const title = `${cleanType}: ${capitalize(cleanNiche)}`;

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

function capitalize(value: string) {
  return value
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function slugify(value: string) {
  return (
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 72) || "produto"
  );
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function cleanPdfText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function pdfEscape(value: string) {
  return cleanPdfText(value).replaceAll("\\", "\\\\").replaceAll("(", "\\(").replaceAll(")", "\\)");
}

function wrapPdfText(value: string, maxLength: number) {
  const words = cleanPdfText(value).split(" ").filter(Boolean);
  const lines: string[] = [];
  let current = "";

  words.forEach((word) => {
    const next = current ? `${current} ${word}` : word;

    if (next.length > maxLength && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  });

  if (current) lines.push(current);
  return lines;
}

function buildCopyText(product: ProductResult) {
  const videoCreatives = buildVideoCreatives(product);
  const adCopies = buildAdCopies(product);

  return [
    `COPY DA PAGINA DE VENDAS - ${product.title}`,
    "",
    "ROTEIROS PARA CRIATIVOS EM VIDEO",
    "",
    ...videoCreatives.flatMap((creative, index) => [
      `CRIATIVO ${index + 1} - ${creative.angle.toUpperCase()}`,
      "GANCHO",
      creative.hook,
      "CONTEXTO",
      creative.context,
      "DESENVOLVIMENTO",
      creative.development,
      "CTA",
      creative.cta,
      "TEXTO NA TELA",
      creative.screenText,
      "",
    ]),
    "COPY PARA ANUNCIOS",
    "",
    ...adCopies.flatMap((ad, index) => [
      `ANUNCIO ${index + 1} - ${ad.angle.toUpperCase()}`,
      "TEXTO PRINCIPAL",
      ad.primaryText,
      "TITULO",
      ad.headline,
      "DESCRICAO",
      ad.description,
      "",
    ]),
    "COPY DA PAGINA",
    "",
    "GANCHO",
    product.copyBlocks.hook,
    "",
    "HEADLINE",
    product.copyBlocks.headline,
    "",
    "BULLETS",
    ...product.copyBlocks.bullets.map((bullet) => `- ${bullet}`),
    "",
    "CHAMADA",
    product.copyBlocks.cta,
    "",
    "ESTRUTURA DA PAGINA",
    `Headline: ${product.salesPage.headline}`,
    `Subheadline: ${product.salesPage.subheadline}`,
    ...product.salesPage.sections.flatMap((section, index) => [
      "",
      `${index + 1}. ${section.title}`,
      section.body,
    ]),
  ].join("\n");
}

type VideoCreative = {
  angle: string;
  hook: string;
  context: string;
  development: string;
  cta: string;
  screenText: string;
};

type AdCopy = {
  angle: string;
  primaryText: string;
  headline: string;
  description: string;
};

function getCleanProductTitle(product: ProductResult) {
  return product.title.replace(/^(Guia pratico|Protocolo passo a passo|Plano de 7 dias|Mapa de acao|Checklist premium):\s*/i, "");
}

function inferBuyerPain(product: ProductResult) {
  const text = `${product.title} ${product.subtitle} ${product.promise}`.toLowerCase();

  if (text.includes("fornecedor") || text.includes("revender")) {
    return "Quer vender, mas ainda nao sabe onde comprar com preco bom e margem para lucrar?";
  }

  if (text.includes("financeir") || text.includes("dinheiro") || text.includes("orcamento")) {
    return "Voce ganha dinheiro, mas sente que o mes nunca fecha e nao sabe exatamente para onde ele vai?";
  }

  if (text.includes("alongamento") || text.includes("corpo") || text.includes("dor")) {
    return "Seu corpo vive travado e voce sente que precisa de uma rotina simples para voltar a se movimentar melhor?";
  }

  if (text.includes("marmita") || text.includes("bolo") || text.includes("comida")) {
    return "Voce quer vender comida, mas ainda fica em duvida sobre cardapio, preco e primeiros pedidos?";
  }

  if (text.includes("noiva") || text.includes("casamento")) {
    return "Voce quer organizar tudo com mais seguranca, sem se perder em gastos, prazos e decisoes de ultima hora?";
  }

  return "Voce sabe que precisa resolver isso, mas ainda nao encontrou um caminho simples, organizado e facil de aplicar?";
}

function inferBuyerOutcome(product: ProductResult) {
  const title = getCleanProductTitle(product).toLowerCase();
  const firstModule = product.modules[0]?.toLowerCase();
  const secondModule = product.modules[1]?.toLowerCase();
  const path = [firstModule, secondModule].filter(Boolean).join(", ");

  if (path) {
    return `seguir um passo a passo com ${path} e transformar ${title} em um plano pratico`;
  }

  return `aplicar ${title} com mais clareza e menos tentativa e erro`;
}

function withBrief(value: string, brief = "") {
  const cleanBrief = brief.trim();
  return cleanBrief ? `${value} Direcao pedida: ${cleanBrief}` : value;
}

function buildVideoCreatives(product: ProductResult, brief = ""): VideoCreative[] {
  const title = getCleanProductTitle(product);
  const pain = inferBuyerPain(product);
  const outcome = inferBuyerOutcome(product);
  const firstBenefit = product.copyBlocks.bullets[0] || product.promise;
  const secondBenefit = product.copyBlocks.bullets[1] || product.subtitle;

  return [
    {
      angle: "Dor direta",
      hook: pain,
      context: `Muita gente tenta resolver no improviso, pula etapas importantes e acaba desistindo porque nao tem um caminho claro para seguir.`,
      development: withBrief(
        `${title} mostra como ${outcome}. A ideia e sair da confusao e aplicar uma sequencia objetiva, sem depender de teoria pesada ou informacoes espalhadas.`,
        brief,
      ),
      cta: `Clique em saiba mais e veja como comecar com ${title.toLowerCase()} ainda hoje.`,
      screenText: `Comece com ${title}`,
    },
    {
      angle: "Resultado desejado",
      hook: `Imagine ter um plano simples para resolver ${title.toLowerCase()} sem ficar perdido no comeco.`,
      context: `O que costuma travar nao e falta de vontade. E nao saber o que fazer primeiro, o que evitar e como transformar informacao em acao pratica.`,
      development: withBrief(
        `${firstBenefit}. Alem disso, ${secondBenefit.toLowerCase()}. Tudo foi estruturado para facilitar a execucao e ajudar a pessoa a avancar com seguranca.`,
        brief,
      ),
      cta: `Clique em saiba mais para conhecer ${title} e aplicar o passo a passo.`,
      screenText: "Um plano simples para sair do improviso",
    },
    {
      angle: "Erro comum",
      hook: `O erro que faz muita gente continuar travada em ${title.toLowerCase()} e tentar resolver tudo sem metodo.`,
      context: `Quando a pessoa tenta juntar dicas soltas, ela perde tempo, fica insegura e quase sempre abandona antes de ver resultado.`,
      development: withBrief(
        `${title} organiza o processo em etapas claras, com orientacao pratica e foco no que precisa ser feito agora para sair da estagnacao.`,
        brief,
      ),
      cta: `Clique em saiba mais e veja como aplicar ${title.toLowerCase()} com mais clareza.`,
      screenText: "Pare de depender de dicas soltas",
    },
  ];
}

function buildAdCopies(product: ProductResult, brief = ""): AdCopy[] {
  const cleanTitle = getCleanProductTitle(product);
  const pain = inferBuyerPain(product);
  const outcome = inferBuyerOutcome(product);
  const firstBenefit = product.copyBlocks.bullets[0] || product.promise;
  const secondBenefit = product.copyBlocks.bullets[1] || product.subtitle;
  const briefLine = brief.trim() ? `\nDirecao extra: ${brief.trim()}` : "";

  return [
    {
      angle: "Dor direta",
      primaryText: [
        pain,
        `${cleanTitle} foi criado para te guiar com uma sequencia simples, direta e facil de acompanhar.`,
        `Voce vai entender como ${outcome}, sem depender de informacoes soltas ou tentativa e erro.`,
        `Clique em saiba mais e veja como comecar hoje.${briefLine}`,
      ].join("\n"),
      headline: `${cleanTitle} passo a passo`,
      description: "Um caminho simples para comecar com mais clareza.",
    },
    {
      angle: "Beneficio pratico",
      primaryText: [
        `Se voce quer uma forma mais simples de aplicar ${cleanTitle.toLowerCase()}, este material foi feito para isso.`,
        `${firstBenefit}.`,
        `${secondBenefit}.`,
        `Acesse agora e veja como transformar uma situacao confusa em um plano claro de execucao.${briefLine}`,
      ].join("\n"),
      headline: "Saia do improviso",
      description: "Metodo pratico para aplicar no seu ritmo.",
    },
    {
      angle: "Antes e depois",
      primaryText: [
        `Antes: duvidas, excesso de informacao e dificuldade para saber por onde comecar.`,
        `Depois: um passo a passo claro para aplicar ${cleanTitle.toLowerCase()} com mais seguranca.`,
        `${product.promise}`,
        `Clique em saiba mais e veja se este material faz sentido para o seu momento.${briefLine}`,
      ].join("\n"),
      headline: "Organize o proximo passo",
      description: "Conteudo direto para aplicar sem complicar.",
    },
  ];
}

function formatVideoCreatives(creatives: VideoCreative[]) {
  return creatives
    .map(
      (creative, index) =>
        `Criativo ${index + 1} - ${creative.angle}\n\nGancho:\n${creative.hook}\n\nContexto:\n${creative.context}\n\nDesenvolvimento:\n${creative.development}\n\nCTA:\n${creative.cta}\n\nTexto na tela:\n${creative.screenText}`,
    )
    .join("\n\n---\n\n");
}

function formatAdCopies(ads: AdCopy[]) {
  return ads
    .map(
      (ad, index) =>
        `Anuncio ${index + 1} - ${ad.angle}\n\nTexto principal:\n${ad.primaryText}\n\nTitulo:\n${ad.headline}\n\nDescricao:\n${ad.description}`,
    )
    .join("\n\n---\n\n");
}

function buildPromptsText(product: ProductResult) {
  return [
    `PROMPTS DO PROJETO - ${product.title}`,
    "",
    ...product.prompts.flatMap((prompt, index) => [`${index + 1}. ${prompt}`, ""]),
  ].join("\n");
}

type ProjectTheme = {
  name: string;
  label: string;
  accent: string;
  accentInk: string;
  bg: string;
  surface: string;
  ink: string;
  muted: string;
  coverA: string;
  coverB: string;
  soft: string;
  border: string;
};

type ProductFormat = {
  name: "protocol" | "checklist" | "playbook";
  label: string;
  pdfMapTitle: string;
  pdfPromiseTitle: string;
  pdfIntroTitle: string;
  pdfIntroKicker: string;
  pdfExecutionTitle: string;
  pdfExecutionKicker: string;
  pdfPracticeTitle: string;
  pdfPracticeKicker: string;
  pdfTrackerTitle: string;
  pdfTrackerKicker: string;
  pdfTrackerIntro: string;
  landing: "guided" | "direct" | "editorial";
};

type VisualDirection = {
  label: string;
  coverStyle: string;
  internalStyle: string;
  contentArchitecture: string;
  imagePrompt: string;
};

const projectThemes: ProjectTheme[] = [
  {
    name: "alimentacao",
    label: "Cozinha lucrativa",
    accent: "#f59e0b",
    accentInk: "#2d1600",
    bg: "#fff8ed",
    surface: "#ffffff",
    ink: "#26180b",
    muted: "#7b6244",
    coverA: "#542713",
    coverB: "#d97706",
    soft: "#fff0cf",
    border: "#f5c46c",
  },
  {
    name: "beleza",
    label: "Beleza pratica",
    accent: "#ec4899",
    accentInk: "#37051f",
    bg: "#fff5fa",
    surface: "#ffffff",
    ink: "#2a101d",
    muted: "#815166",
    coverA: "#4a1530",
    coverB: "#db2777",
    soft: "#ffe4f1",
    border: "#f9a8d4",
  },
  {
    name: "saude",
    label: "Rotina saudavel",
    accent: "#22c55e",
    accentInk: "#06230f",
    bg: "#f2fbf5",
    surface: "#ffffff",
    ink: "#112016",
    muted: "#55705e",
    coverA: "#12351f",
    coverB: "#16a34a",
    soft: "#dff7e8",
    border: "#86efac",
  },
  {
    name: "financas",
    label: "Plano financeiro",
    accent: "#38bdf8",
    accentInk: "#042433",
    bg: "#f1f9ff",
    surface: "#ffffff",
    ink: "#0b1b24",
    muted: "#4d6a7a",
    coverA: "#0b2a3a",
    coverB: "#0284c7",
    soft: "#d9f1ff",
    border: "#7dd3fc",
  },
  {
    name: "renda",
    label: "Oferta campea",
    accent: "#d9ff57",
    accentInk: "#172009",
    bg: "#f8faef",
    surface: "#ffffff",
    ink: "#172009",
    muted: "#66724d",
    coverA: "#172009",
    coverB: "#5d7226",
    soft: "#efffba",
    border: "#d9ff57",
  },
];

function resolveProjectTheme(product: ProductResult) {
  const value = `${product.title} ${product.subtitle} ${product.promise}`.toLowerCase();

  if (/marmita|bolo|pote|comida|receita|cozinha|aliment/i.test(value)) return projectThemes[0];
  if (/beleza|skincare|pele|maquiagem|cabelo|estet/i.test(value)) return projectThemes[1];
  if (/saude|alongamento|dor|corpo|fitness|treino|postura/i.test(value)) return projectThemes[2];
  if (/finan|dinheiro|divida|gasto|orcamento|invest/i.test(value)) return projectThemes[3];

  return projectThemes[4];
}

function resolveProductFormat(product: ProductResult): ProductFormat {
  const value = `${product.title} ${product.subtitle} ${product.promise} ${product.modules.join(" ")}`.toLowerCase();

  if (/checklist|lista|fornecedor|skincare|pele|beleza|validacao|curadoria/i.test(value)) {
    return {
      name: "checklist",
      label: "Checklist operacional",
      pdfMapTitle: "CHECKLIST MESTRE",
      pdfPromiseTitle: "PROMESSA E CRITERIOS",
      pdfIntroTitle: "Como validar a entrega",
      pdfIntroKicker: "validacao",
      pdfExecutionTitle: "Blocos de verificacao",
      pdfExecutionKicker: "checklist",
      pdfPracticeTitle: "Checklist de aplicacao",
      pdfPracticeKicker: "execucao",
      pdfTrackerTitle: "Controle rapido",
      pdfTrackerKicker: "progresso",
      pdfTrackerIntro: "Marque cada item concluido e registre o que ainda precisa ser ajustado antes da proxima aplicacao.",
      landing: "direct",
    };
  }

  if (/mapa|guia|financeir|organizacao|orcamento|dinheiro|plano de acao|gestao/i.test(value)) {
    return {
      name: "playbook",
      label: "Playbook pratico",
      pdfMapTitle: "MAPA DE DECISAO",
      pdfPromiseTitle: "DIRECAO DA ENTREGA",
      pdfIntroTitle: "Ponto de partida",
      pdfIntroKicker: "diagnostico",
      pdfExecutionTitle: "Plano de acao",
      pdfExecutionKicker: "prioridades",
      pdfPracticeTitle: "Quadro de decisao",
      pdfPracticeKicker: "aplicacao",
      pdfTrackerTitle: "Plano de acompanhamento",
      pdfTrackerKicker: "revisao",
      pdfTrackerIntro: "Use o quadro para acompanhar decisoes, ajustes e proximas acoes. A cada ciclo, revise o que gerou mais clareza.",
      landing: "editorial",
    };
  }

  return {
    name: "protocol",
    label: "Protocolo guiado",
    pdfMapTitle: "MAPA DA ENTREGA",
    pdfPromiseTitle: "PROMESSA",
    pdfIntroTitle: "Antes de comecar",
    pdfIntroKicker: "preparacao",
    pdfExecutionTitle: "Plano de execucao",
    pdfExecutionKicker: "passo a passo",
    pdfPracticeTitle: "Fichas praticas",
    pdfPracticeKicker: "aplicacao",
    pdfTrackerTitle: "Plano de acompanhamento",
    pdfTrackerKicker: "acompanhamento",
    pdfTrackerIntro: "Use esta pagina para acompanhar consistencia. Marque cada dia concluido e anote rapidamente o que mudou.",
    landing: "guided",
  };
}

function resolveVisualDirection(product: ProductResult, format = resolveProductFormat(product)): VisualDirection {
  const value = `${product.title} ${product.subtitle} ${product.promise}`.toLowerCase();

  if (format.name === "checklist") {
    return {
      label: "Catalogo premium de oportunidades",
      coverStyle: "Capa comercial forte, com sensacao de anuncio, mockup do produto, chamada grande e contraste alto.",
      internalStyle: "Paginas em grade, divisorias por categoria, fichas curtas, campos de verificacao e visual de diretorio.",
      contentArchitecture: "Aviso inicial, recomendacoes de seguranca, categorias, catalogo principal, criterios de escolha e controle de aplicacao.",
      imagePrompt: `Capa premium para produto digital sobre ${product.title}, estilo catalogo comercial, pessoa feliz segurando caixa ou produto, fundo de deposito ou loja, contraste alto, textos grandes, cores fortes, visual de venda.`,
    };
  }

  if (format.name === "playbook" || /noiva|casamento|decoracao|beleza|organiza/i.test(value)) {
    return {
      label: "Guia editorial ilustrado",
      coverStyle: "Capa elegante com imagem central do nicho, tipografia editorial grande, respiro e atmosfera aspiracional.",
      internalStyle: "Capitulos longos, paginas com imagem de abertura, tabelas, comparativos, cronogramas e blocos de dica.",
      contentArchitecture: "Introducao narrativa, capitulos, exemplos praticos, tabelas de decisao, cronogramas e checklist final.",
      imagePrompt: `Capa editorial elegante para guia chamado ${product.title}, imagem realista ligada ao nicho, luz natural, composicao premium, tipografia sofisticada, fundo limpo, visual de revista.`,
    };
  }

  return {
    label: "Manual pratico guiado",
    coverStyle: "Capa objetiva de manual, promessa clara, blocos visuais fortes e sensacao de acompanhamento passo a passo.",
    internalStyle: "Sequencia de etapas, fichas praticas, plano de dias, paginas de registro e checklist de progresso.",
    contentArchitecture: "Preparacao, passo a passo, fichas de aplicacao, acompanhamento e revisao final.",
    imagePrompt: `Capa de manual pratico para ${product.title}, visual limpo e moderno, pessoa aplicando a rotina, elementos de checklist e progresso, cores do nicho, composicao profissional.`,
  };
}

function hexToRgb(hex: string) {
  const clean = hex.replace("#", "");
  const value = Number.parseInt(clean, 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
}

function hexToPdfRgb(hex: string) {
  const { r, g, b } = hexToRgb(hex);
  return `${(r / 255).toFixed(3)} ${(g / 255).toFixed(3)} ${(b / 255).toFixed(3)}`;
}

function buildReviewText(product: ProductResult) {
  const theme = resolveProjectTheme(product);
  const format = resolveProductFormat(product);
  const visual = resolveVisualDirection(product, format);

  return [
    `REVISAO DA ENTREGA - ${product.title}`,
    "",
    "Status: pacote gerado com produto, copy, pagina de vendas, prompts e dados do projeto.",
    "",
    "Direcao visual aplicada",
    `- Tema: ${theme.label}`,
    `- Formato do pacote: ${format.label}`,
    `- Direcao criativa: ${visual.label}`,
    `- Cor principal: ${theme.accent}`,
    `- Fundo do produto: ${theme.bg}`,
    `- Capa: ${visual.coverStyle}`,
    `- Interno: ${visual.internalStyle}`,
    "",
    "Checklist de coerencia",
    `- Promessa principal: ${product.promise}`,
    `- Headline da pagina: ${product.salesPage.headline}`,
    `- CTA principal: ${product.copyBlocks.cta}`,
    "- Conferir se o exemplo, a promessa e a pagina falam com o mesmo publico.",
    "- Antes de publicar, inserir link de checkout real nos botoes da pagina HTML.",
  ].join("\n");
}

function buildVisualDirectionText(product: ProductResult) {
  const theme = resolveProjectTheme(product);
  const format = resolveProductFormat(product);
  const visual = resolveVisualDirection(product, format);

  return [
    `DIRECAO VISUAL - ${product.title}`,
    "",
    `Formato: ${format.label}`,
    `Direcao criativa: ${visual.label}`,
    `Tema de cor: ${theme.label}`,
    `Cor principal: ${theme.accent}`,
    "",
    "Capa",
    visual.coverStyle,
    "",
    "Paginas internas",
    visual.internalStyle,
    "",
    "Arquitetura do conteudo",
    visual.contentArchitecture,
    "",
    "Prompt sugerido para imagem de capa",
    visual.imagePrompt,
  ].join("\n");
}

function buildProductHtml(product: ProductResult) {
  const theme = resolveProjectTheme(product);
  const format = resolveProductFormat(product);
  const visual = resolveVisualDirection(product, format);
  const modules = product.modules.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
  const blueprint = product.productBlueprint.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
  const directoryItems = [...product.productBlueprint, ...product.productContent.map((block) => block.title)]
    .slice(0, 12)
    .map(
      (item, index) => `
        <article>
          <small>ITEM ${String(index + 1).padStart(2, "0")}</small>
          <h3>${escapeHtml(item)}</h3>
          <p>Validar criterio, aplicacao e proximo passo antes de avancar.</p>
        </article>`,
    )
    .join("");
  const blocks = product.productContent
    .map(
      (block, index) => `
        <section class="block">
          <span>${String(index + 1).padStart(2, "0")}</span>
          <div>
            <h2>${escapeHtml(block.title)}</h2>
            <p>${escapeHtml(block.body)}</p>
            <strong>${escapeHtml(block.task)}</strong>
          </div>
        </section>`,
    )
    .join("");

  if (format.name === "checklist") {
    return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(product.title)}</title>
  <style>
    :root { --dark: #201b35; --gold: ${theme.accent}; --ink: #fffaf0; --paper: #f7f2e7; --red: #b91c1c; }
    * { box-sizing: border-box; }
    body { margin: 0; background: var(--paper); color: #251c13; font-family: Arial, sans-serif; line-height: 1.55; }
    main { width: min(1040px, calc(100% - 32px)); margin: 0 auto; padding-bottom: 72px; }
    .cover { min-height: 760px; display: grid; grid-template-columns: .9fr 1.1fr; align-items: center; gap: 28px; margin: 0 calc(50% - 50vw) 48px; padding: 54px max(46px, calc((100vw - 1040px) / 2)); background: radial-gradient(circle at 70% 30%, rgba(255,255,255,.24), transparent 18rem), linear-gradient(135deg, #171326, #3d315f); color: var(--ink); overflow: hidden; }
    .mockup { position: relative; min-height: 420px; transform: rotate(-7deg); border: 5px solid rgba(255,255,255,.72); background: linear-gradient(160deg, var(--gold), #7c4b00); box-shadow: 0 34px 80px rgba(0,0,0,.38); padding: 34px; }
    .mockup::after { content: ""; position: absolute; inset: 42% -18% auto 20%; height: 120px; background: rgba(255,255,255,.28); transform: rotate(-14deg); }
    .badge { display: inline-block; border-radius: 999px; padding: 10px 16px; background: var(--gold); color: #171006; font-weight: 900; text-transform: uppercase; }
    h1 { margin: 24px 0; font-size: clamp(46px, 8vw, 86px); line-height: .9; text-transform: uppercase; }
    .cover p { max-width: 580px; color: rgba(255,255,255,.84); font-size: 22px; }
    h2 { margin: 0 0 18px; font-size: clamp(32px, 4vw, 52px); line-height: 1; }
    section { margin: 42px 0; }
    .notice { border-left: 10px solid var(--gold); padding: 26px; background: #fff; box-shadow: 0 20px 60px rgba(0,0,0,.08); }
    .grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 22px; }
    article { min-height: 160px; position: relative; padding: 24px; background: #fff; border: 2px solid #b58b32; box-shadow: 10px 10px 0 rgba(99,62,8,.22); }
    article small { display: inline-block; margin-bottom: 18px; color: var(--red); font-weight: 900; }
    article h3 { margin: 0 0 12px; color: var(--red); font-size: 23px; }
    article p, li { color: #5f4a35; }
    .category { margin: 54px 0 24px; padding: 28px; background: var(--dark); color: #fff; text-align: center; }
    .category h2 { margin: 0; color: #fff; text-transform: uppercase; }
    @media (max-width: 820px) { .cover, .grid { grid-template-columns: 1fr; } .cover { min-height: auto; } }
  </style>
</head>
<body>
  <main>
    <section class="cover">
      <div class="mockup"><span class="badge">${escapeHtml(visual.label)}</span><h2>${escapeHtml(product.title)}</h2></div>
      <div><span class="badge">Campeao de aplicacao</span><h1>${escapeHtml(product.title)}</h1><p>${escapeHtml(product.promise)}</p></div>
    </section>
    <section class="notice"><h2>Leia antes de aplicar</h2><p>${escapeHtml(product.subtitle)}</p><ul>${modules}</ul></section>
    <section class="category"><h2>Catalogo principal</h2></section>
    <section class="grid">${directoryItems}</section>
    <section class="notice"><h2>Criterios de validacao</h2><ul>${blueprint}</ul></section>
  </main>
</body>
</html>`;
  }

  if (format.name === "playbook") {
    return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(product.title)}</title>
  <style>
    :root { --paper: #f5eee4; --ink: #5e5043; --soft: #fffaf4; --accent: ${theme.accent}; --dark: ${theme.coverA}; }
    * { box-sizing: border-box; }
    body { margin: 0; background: var(--paper); color: var(--ink); font-family: Georgia, 'Times New Roman', serif; line-height: 1.65; }
    main { width: min(980px, calc(100% - 32px)); margin: 0 auto; padding-bottom: 80px; }
    .cover { min-height: 820px; margin: 0 calc(50% - 50vw) 58px; padding: 80px max(42px, calc((100vw - 980px) / 2)); background: linear-gradient(rgba(245,238,228,.2), rgba(245,238,228,.84)), radial-gradient(circle at 50% 46%, ${theme.soft}, transparent 22rem), linear-gradient(135deg, #ead5bf, #fff7ef); text-align: center; }
    .photo { width: min(560px, 100%); height: 420px; margin: 24px auto 34px; border-radius: 999px 999px 22px 22px; background: radial-gradient(circle at 50% 34%, #fff, ${theme.soft} 28%, ${theme.coverB}); box-shadow: 0 30px 80px rgba(80,56,32,.2); }
    .script { font-size: clamp(68px, 12vw, 132px); line-height: .86; font-style: italic; color: #5b3b35; }
    .subtitle { max-width: 700px; margin: 18px auto; font-size: 28px; color: #6d5f50; }
    h2 { margin: 0 0 18px; font-size: clamp(34px, 5vw, 62px); line-height: 1.02; color: #665848; }
    h3 { font-size: 28px; color: #665848; }
    p, li { font-size: 20px; }
    section { margin: 64px 0; }
    .chapter { padding: 44px; background: var(--soft); border-radius: 4px; box-shadow: 0 18px 50px rgba(80,56,32,.08); }
    .hero-image { height: 260px; margin: -44px -44px 42px; background: linear-gradient(135deg, ${theme.soft}, ${theme.coverB}); }
    table { width: 100%; border-collapse: collapse; margin-top: 28px; background: #fff; font-family: Arial, sans-serif; }
    th, td { border: 1px solid #e0d8ce; padding: 22px; text-align: left; font-size: 18px; }
    th { background: #fffaf5; color: #584a3d; }
    .quote { border-left: 8px solid var(--accent); padding: 22px 28px; background: #fff; font-size: 24px; }
  </style>
</head>
<body>
  <main>
    <section class="cover"><div class="script">${escapeHtml(product.title)}</div><p class="subtitle">${escapeHtml(product.promise)}</p><div class="photo"></div></section>
    <section class="chapter"><div class="hero-image"></div><h2>Introducao</h2><p>${escapeHtml(product.subtitle)}</p><p class="quote">${escapeHtml(product.promise)}</p></section>
    <section class="chapter"><h2>Capitulos principais</h2><ol>${modules}</ol></section>
    <section class="chapter"><h2>Quadro de decisao</h2><table><thead><tr><th>Etapa</th><th>Prioridade</th></tr></thead><tbody>${product.productContent
      .slice(0, 5)
      .map((block) => `<tr><td>${escapeHtml(block.title)}</td><td>${escapeHtml(block.task)}</td></tr>`)
      .join("")}</tbody></table></section>
    <section class="chapter"><h2>Checklist final</h2><ul>${blueprint}</ul></section>
  </main>
</body>
</html>`;
  }

  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(product.title)}</title>
  <style>
    :root { color-scheme: light; --ink: ${theme.ink}; --accent: ${theme.accent}; --accent-ink: ${theme.accentInk}; --muted: ${theme.muted}; --bg: ${theme.bg}; --surface: ${theme.surface}; --soft: ${theme.soft}; --border: ${theme.border}; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: Arial, sans-serif; color: var(--ink); background: var(--bg); line-height: 1.6; }
    main { width: min(940px, calc(100% - 32px)); margin: 0 auto; padding: 36px 0 64px; }
    .cover { position: relative; min-height: 560px; display: grid; align-content: end; gap: 18px; overflow: hidden; border-radius: 24px; padding: 48px; background: linear-gradient(135deg, ${theme.coverA}, ${theme.coverB}); color: #fffdf5; page-break-after: always; }
    .cover::before { content: ""; position: absolute; inset: auto -12% -22% 18%; height: 280px; border-radius: 999px; background: rgba(255,255,255,.12); transform: rotate(-8deg); }
    .cover > * { position: relative; z-index: 1; }
    .pill { width: fit-content; border-radius: 999px; padding: 10px 16px; background: var(--accent); color: var(--accent-ink); font-weight: 900; text-transform: uppercase; }
    h1 { margin: 0; font-size: clamp(42px, 8vw, 78px); line-height: .95; }
    h2 { margin: 0 0 10px; font-size: 26px; line-height: 1.15; }
    p { margin: 0 0 14px; }
    .lead { max-width: 760px; color: #f1f4ea; font-size: 22px; }
    .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 24px; margin: 32px 0; }
    .card, .block { border: 1px solid var(--border); border-radius: 16px; padding: 24px; background: var(--surface); box-shadow: 0 14px 38px rgba(0,0,0,.05); }
    li { margin: 0 0 10px; }
    .block { display: grid; grid-template-columns: 54px 1fr; gap: 18px; margin: 18px 0; }
    .block span { display: grid; width: 42px; height: 42px; place-items: center; border-radius: 50%; background: var(--accent); color: var(--accent-ink); font-weight: 900; }
    .checklist .block { grid-template-columns: 32px 1fr; }
    .checklist .block span { width: 24px; height: 24px; border-radius: 6px; font-size: 0; }
    .checklist .block span::after { content: ""; width: 10px; height: 10px; border: 2px solid var(--accent-ink); border-top: 0; border-left: 0; transform: rotate(45deg) translateY(-1px); }
    .playbook .cover { align-content: center; }
    .playbook .grid { grid-template-columns: .85fr 1.15fr; }
    strong { color: var(--coverB); }
    @media print { body { background: #fff; } main { width: 100%; padding: 0; } .card, .block, .cover { break-inside: avoid; border-radius: 0; } }
  </style>
</head>
<body class="${format.name}">
  <main>
    <section class="cover">
      <span class="pill">${escapeHtml(format.label)}</span>
      <h1>${escapeHtml(product.title)}</h1>
      <p class="lead">${escapeHtml(product.promise)}</p>
    </section>
    <section>
      <h2>Promessa da entrega</h2>
      <p>${escapeHtml(product.subtitle)}</p>
      <div class="grid">
        <div class="card"><h2>Modulos sugeridos</h2><ol>${modules}</ol></div>
        <div class="card"><h2>Estrutura da entrega</h2><ul>${blueprint}</ul></div>
      </div>
      ${blocks}
    </section>
  </main>
</body>
</html>`;
}

function buildSalesPageHtml(product: ProductResult) {
  const theme = resolveProjectTheme(product);
  const format = resolveProductFormat(product);
  const configComment =
    '<!-- CONFIGURACAO: antes de publicar, troque todos os links href="#checkout" pelo link real do seu checkout. -->';
  const sections = product.salesPage.sections.slice(0, 6);
  const bullets = product.copyBlocks.bullets.map((bullet) => `<li>${escapeHtml(bullet)}</li>`).join("");
  const trustItems = [
    "Acesso imediato",
    "Produto digital",
    "Aplicacao passo a passo",
    "Material editavel",
  ].map((item) => `<span>${escapeHtml(item)}</span>`).join("");
  const modules = product.modules
    .slice(0, 6)
    .map(
      (module, index) => `
        <article class="step-card">
          <span>${String(index + 1).padStart(2, "0")}</span>
          <h3>${escapeHtml(module)}</h3>
        </article>`,
    )
    .join("");
  const deliverables = product.productBlueprint
    .slice(0, 6)
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join("");
  const contentBlocks = product.productContent
    .slice(0, 8)
    .map(
      (block, index) => `
        <article class="content-card">
          <span>${String(index + 1).padStart(2, "0")}</span>
          <div>
            <h3>${escapeHtml(block.title)}</h3>
            <p>${escapeHtml(block.body)}</p>
            <strong>${escapeHtml(block.task)}</strong>
          </div>
        </article>`,
    )
    .join("");
  const salesSections = sections
    .map(
      (section, index) => `
        <article class="argument-card">
          <span>${String(index + 1).padStart(2, "0")}</span>
          <h3>${escapeHtml(section.title)}</h3>
          <p>${escapeHtml(section.body)}</p>
        </article>`,
    )
    .join("");
  const faqItems = [
    {
      question: "Como vou receber o acesso?",
      answer: "Depois da compra, voce recebe o material principal e pode iniciar pela primeira etapa indicada na entrega.",
    },
    {
      question: "Preciso ter experiencia?",
      answer: "Nao. A estrutura foi criada para comecar pelo basico, seguir uma ordem clara e aplicar uma etapa por vez.",
    },
    {
      question: "Em quanto tempo consigo aplicar?",
      answer: "A proposta e usar uma rotina simples e objetiva. O tempo exato depende do tema, mas a entrega foi pensada para execucao rapida.",
    },
    {
      question: "E se eu nao souber por onde comecar?",
      answer: "Comece pelo diagnostico ou preparacao inicial, siga o passo a passo e marque o progresso no checklist.",
    },
  ]
    .map(
      (item) => `
        <details>
          <summary>${escapeHtml(item.question)}</summary>
          <p>${escapeHtml(item.answer)}</p>
        </details>`,
    )
    .join("");

  if (format.landing === "direct") {
    return `${configComment}
<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(product.salesPage.headline)}</title>
  <style>
    :root { --bg: ${theme.bg}; --ink: ${theme.ink}; --muted: ${theme.muted}; --accent: ${theme.accent}; --accent-ink: ${theme.accentInk}; --dark: ${theme.coverA}; --dark-2: ${theme.coverB}; --soft: ${theme.soft}; --line: rgba(0,0,0,.12); }
    * { box-sizing: border-box; }
    html { scroll-behavior: smooth; }
    body { margin: 0; font-family: Arial, sans-serif; color: var(--ink); background: var(--bg); line-height: 1.55; }
    .wrap { width: min(1080px, calc(100% - 32px)); margin: 0 auto; }
    .top { position: sticky; top: 0; z-index: 5; border-bottom: 1px solid rgba(255,255,255,.14); background: rgba(0,0,0,.78); backdrop-filter: blur(14px); color: #fff; }
    .top .wrap { min-height: 64px; display: flex; align-items: center; justify-content: space-between; gap: 18px; }
    .top strong { font-size: 15px; }
    .button { display: inline-flex; min-height: 52px; align-items: center; justify-content: center; border-radius: 8px; padding: 0 22px; background: var(--accent); color: var(--accent-ink); font-weight: 900; text-decoration: none; }
    header { padding: 76px 0 54px; background: linear-gradient(135deg, var(--dark), var(--dark-2)); color: #fffdf7; }
    .hero { display: grid; grid-template-columns: minmax(0, .95fr) minmax(280px, .65fr); gap: 38px; align-items: end; }
    .eyebrow { margin: 0 0 12px; color: var(--accent); font-size: 12px; font-weight: 900; letter-spacing: .06em; text-transform: uppercase; }
    h1, h2, h3, p { margin-top: 0; }
    h1 { max-width: 720px; margin-bottom: 16px; font-size: clamp(34px, 5vw, 56px); line-height: 1.02; }
    h2 { margin-bottom: 18px; font-size: clamp(28px, 3.5vw, 42px); line-height: 1.08; }
    p { color: rgba(255,255,255,.76); font-size: 18px; }
    .hero ul, .check ul { display: grid; gap: 10px; margin: 24px 0 0; padding: 0; list-style: none; }
    .hero li, .check li { position: relative; padding: 15px 16px 15px 44px; border: 1px solid rgba(255,255,255,.16); border-radius: 8px; background: rgba(255,255,255,.08); font-weight: 800; }
    .hero li::before, .check li::before { content: ""; position: absolute; left: 18px; top: 20px; width: 12px; height: 12px; border-radius: 3px; background: var(--accent); }
    .product { min-height: 360px; display: grid; align-content: end; border: 1px solid rgba(255,255,255,.2); border-radius: 14px; padding: 26px; background: rgba(0,0,0,.18); box-shadow: 0 28px 70px rgba(0,0,0,.28); }
    .product span { width: fit-content; margin-bottom: 16px; border-radius: 999px; padding: 8px 12px; background: var(--accent); color: var(--accent-ink); font-size: 12px; font-weight: 900; text-transform: uppercase; }
    .product strong { font-size: clamp(26px, 3.2vw, 40px); line-height: 1.04; }
    section { padding: 74px 0; }
    .light p, .light li { color: rgba(0,0,0,.68); }
    .split { display: grid; grid-template-columns: .82fr 1.18fr; gap: 42px; align-items: start; }
    .cards, .modules, .faq { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
    .argument-card, .step-card, details, .offer { border: 1px solid var(--line); border-radius: 10px; padding: 22px; background: #fff; }
    .argument-card span, .step-card span { display: inline-grid; min-width: 38px; height: 28px; place-items: center; margin-bottom: 14px; border-radius: 999px; background: var(--accent); color: var(--accent-ink); font-size: 13px; font-weight: 900; }
    .band { background: #090d0a; color: #fffdf7; }
    .band .argument-card, .band .step-card, .band details { border-color: rgba(255,255,255,.14); background: rgba(255,255,255,.06); }
    .offer { max-width: 760px; margin: 0 auto; text-align: center; background: linear-gradient(135deg, var(--dark), var(--dark-2)); color: #fff; }
    .offer p { color: rgba(255,255,255,.76); }
    summary { cursor: pointer; font-weight: 900; }
    @media (max-width: 820px) { .hero, .split, .cards, .modules, .faq { grid-template-columns: 1fr; } .top .wrap { align-items: flex-start; flex-direction: column; padding: 12px 0; } }
  </style>
</head>
<body>
  <nav class="top"><div class="wrap"><strong>${escapeHtml(product.title)}</strong><a class="button" href="#checkout">${escapeHtml(product.salesPage.cta)}</a></div></nav>
  <header>
    <div class="wrap hero">
      <div>
        <p class="eyebrow">${escapeHtml(format.label)}</p>
        <h1>${escapeHtml(product.salesPage.headline)}</h1>
        <p>${escapeHtml(product.salesPage.subheadline)}</p>
        <ul>${bullets}</ul>
      </div>
      <aside class="product"><span>${escapeHtml(theme.label)}</span><strong>${escapeHtml(product.title)}</strong><p>${escapeHtml(product.promise)}</p></aside>
    </div>
  </header>
  <section class="light"><div class="wrap split"><div><p class="eyebrow">Diagnostico</p><h2>Veja exatamente o que precisa sair do papel.</h2></div><div class="cards">${salesSections}</div></div></section>
  <section class="band"><div class="wrap split"><div><p class="eyebrow">Aplicacao</p><h2>Uma sequencia de verificacao para executar com clareza.</h2><p>${escapeHtml(product.subtitle)}</p></div><div class="modules">${modules}</div></div></section>
  <section class="light check" id="conteudo"><div class="wrap split"><div><p class="eyebrow">O que recebe</p><h2>Itens objetivos para usar, marcar e revisar.</h2></div><ul>${deliverables}</ul></div></section>
  <section class="band"><div class="wrap"><div class="faq">${faqItems}</div></div></section>
  <section id="checkout"><div class="wrap"><div class="offer"><p class="eyebrow">Acesso imediato</p><h2>${escapeHtml(product.copyBlocks.headline)}</h2><p>${escapeHtml(product.copyBlocks.hook)}</p><a class="button" href="#checkout">${escapeHtml(product.copyBlocks.cta)}</a></div></div></section>
</body>
</html>`;
  }

  if (format.landing === "editorial") {
    return `${configComment}
<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(product.salesPage.headline)}</title>
  <style>
    :root { --paper: ${theme.bg}; --ink: ${theme.ink}; --muted: ${theme.muted}; --accent: ${theme.accent}; --accent-ink: ${theme.accentInk}; --dark: ${theme.coverA}; --soft: ${theme.soft}; }
    * { box-sizing: border-box; }
    html { scroll-behavior: smooth; }
    body { margin: 0; font-family: Georgia, 'Times New Roman', serif; color: var(--ink); background: var(--paper); line-height: 1.6; }
    .wrap { width: min(1040px, calc(100% - 32px)); margin: 0 auto; }
    .eyebrow { margin: 0 0 12px; color: var(--dark); font: 900 12px/1 Arial, sans-serif; letter-spacing: .08em; text-transform: uppercase; }
    h1, h2, h3, p { margin-top: 0; }
    h1 { max-width: 840px; margin-bottom: 18px; font-size: clamp(38px, 6vw, 70px); line-height: .98; }
    h2 { max-width: 780px; font-size: clamp(30px, 4vw, 48px); line-height: 1.05; }
    p, li { color: rgba(0,0,0,.68); font-size: 19px; }
    .button { display: inline-flex; min-height: 54px; align-items: center; justify-content: center; border-radius: 8px; padding: 0 24px; background: var(--accent); color: var(--accent-ink); font: 900 16px Arial, sans-serif; text-decoration: none; }
    header { padding: 76px 0 44px; border-bottom: 1px solid rgba(0,0,0,.1); }
    .hero { display: grid; grid-template-columns: minmax(0, 1fr) 320px; gap: 42px; align-items: end; }
    .note { border-left: 8px solid var(--accent); padding: 24px; background: #fff; box-shadow: 0 20px 60px rgba(0,0,0,.08); }
    .note strong { display: block; margin-bottom: 12px; font: 900 24px/1.1 Arial, sans-serif; }
    .strip { display: grid; grid-template-columns: repeat(4, 1fr); border-bottom: 1px solid rgba(0,0,0,.1); background: #fff; }
    .strip span { min-height: 72px; display: grid; place-items: center; padding: 14px; border-right: 1px solid rgba(0,0,0,.08); font: 900 14px Arial, sans-serif; text-align: center; }
    section { padding: 82px 0; }
    .split { display: grid; grid-template-columns: .72fr 1.28fr; gap: 52px; align-items: start; }
    .timeline { display: grid; gap: 18px; }
    .argument-card, .step-card, .content-card { display: grid; grid-template-columns: 56px 1fr; gap: 18px; border-bottom: 1px solid rgba(0,0,0,.12); padding-bottom: 20px; }
    .argument-card span, .step-card span, .content-card > span { display: grid; width: 44px; height: 44px; place-items: center; border-radius: 50%; background: var(--dark); color: #fff; font: 900 13px Arial, sans-serif; }
    .dark { background: var(--dark); color: #fffdf7; }
    .dark p, .dark li { color: rgba(255,255,255,.72); }
    .deliver { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; padding: 0; list-style: none; }
    .deliver li, details { border: 1px solid rgba(0,0,0,.1); border-radius: 8px; padding: 18px; background: #fff; font: 900 16px Arial, sans-serif; }
    details { color: var(--ink); }
    summary { cursor: pointer; }
    .offer { border-radius: 14px; padding: 42px; background: #fff; text-align: center; box-shadow: 0 24px 70px rgba(0,0,0,.1); }
    @media (max-width: 820px) { .hero, .split, .strip, .deliver { grid-template-columns: 1fr; } .argument-card, .step-card, .content-card { grid-template-columns: 1fr; } }
  </style>
</head>
<body>
  <header><div class="wrap hero"><div><p class="eyebrow">${escapeHtml(format.label)}</p><h1>${escapeHtml(product.salesPage.headline)}</h1><p>${escapeHtml(product.salesPage.subheadline)}</p><a class="button" href="#checkout">${escapeHtml(product.salesPage.cta)}</a></div><aside class="note"><strong>${escapeHtml(product.title)}</strong><p>${escapeHtml(product.promise)}</p></aside></div></header>
  <div class="strip">${trustItems}</div>
  <section><div class="wrap split"><div><p class="eyebrow">Contexto</p><h2>O problema nao e falta de informacao. E falta de ordem.</h2></div><div class="timeline">${salesSections}</div></div></section>
  <section class="dark"><div class="wrap split"><div><p class="eyebrow">Metodo de aplicacao</p><h2>Um caminho com decisoes claras e proximas acoes.</h2><p>${escapeHtml(product.subtitle)}</p></div><div class="timeline">${modules}</div></div></section>
  <section id="conteudo"><div class="wrap"><p class="eyebrow">O que recebe</p><h2>Material organizado para consultar e aplicar.</h2><ul class="deliver">${deliverables}</ul></div></section>
  <section><div class="wrap split"><div><p class="eyebrow">Perguntas comuns</p><h2>Antes de decidir</h2></div><div class="timeline">${faqItems}</div></div></section>
  <section id="checkout"><div class="wrap"><div class="offer"><p class="eyebrow">Acesso imediato</p><h2>${escapeHtml(product.copyBlocks.headline)}</h2><p>${escapeHtml(product.copyBlocks.hook)}</p><a class="button" href="#checkout">${escapeHtml(product.copyBlocks.cta)}</a></div></div></section>
</body>
</html>`;
  }

  return `${configComment}
<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(product.salesPage.headline)}</title>
  <style>
    :root { --bg: ${theme.coverA}; --panel: ${theme.ink}; --ink: #fffdf7; --muted: rgba(255,253,247,.78); --accent: ${theme.accent}; --accent-ink: ${theme.accentInk}; --cover-a: ${theme.coverA}; --cover-b: ${theme.coverB}; --soft: ${theme.soft}; --surface: ${theme.surface}; --paper: ${theme.bg}; --dark-text: ${theme.ink}; --line: rgba(255,255,255,.14); }
    * { box-sizing: border-box; }
    html { scroll-behavior: smooth; }
    body { margin: 0; background: var(--bg); color: var(--ink); font-family: Arial, sans-serif; line-height: 1.55; }
    .wrap { width: min(1120px, calc(100% - 32px)); margin: 0 auto; }
    .narrow { width: min(880px, calc(100% - 32px)); margin: 0 auto; }
    .eyebrow { margin: 0 0 12px; color: var(--accent); font-size: 12px; font-weight: 900; letter-spacing: .06em; text-transform: uppercase; }
    h1, h2, h3, p { margin-top: 0; }
    h1 { max-width: 760px; margin-bottom: 18px; font-size: clamp(34px, 4.8vw, 58px); line-height: 1.02; }
    h2 { max-width: 820px; margin-bottom: 16px; font-size: clamp(28px, 3.6vw, 44px); line-height: 1.08; }
    h3 { margin-bottom: 10px; font-size: 20px; line-height: 1.18; }
    p { margin-bottom: 18px; color: var(--muted); font-size: 18px; }
    a { color: inherit; }
    .button { display: inline-flex; min-height: 54px; align-items: center; justify-content: center; border-radius: 8px; padding: 0 24px; background: var(--accent); color: var(--accent-ink); font-weight: 900; text-decoration: none; }
    .button.secondary { border: 1px solid rgba(255,255,255,.26); background: rgba(255,255,255,.08); color: var(--ink); }
    header { min-height: 82vh; display: grid; align-items: center; padding: 46px 0 58px; background: radial-gradient(circle at 12% 10%, rgba(255,255,255,.16), transparent 25rem), linear-gradient(135deg, var(--cover-a), var(--cover-b)); }
    .hero { display: grid; grid-template-columns: minmax(0, 1.05fr) minmax(300px, .78fr); gap: 42px; align-items: center; }
    .hero-copy > p:not(.eyebrow) { max-width: 700px; }
    .hero-actions { display: flex; flex-wrap: wrap; gap: 12px; margin: 26px 0; }
    .hero-list { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; max-width: 760px; margin: 24px 0 0; padding: 0; list-style: none; }
    .hero-list li { border: 1px solid rgba(255,255,255,.16); border-radius: 8px; padding: 13px 14px; background: rgba(255,255,255,.08); color: var(--ink); font-size: 15px; font-weight: 800; }
    .trust-strip { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 1px; background: rgba(255,255,255,.12); border-top: 1px solid rgba(255,255,255,.12); border-bottom: 1px solid rgba(255,255,255,.12); }
    .trust-strip span { min-height: 66px; display: grid; place-items: center; padding: 12px; background: rgba(0,0,0,.16); color: var(--ink); font-size: 14px; font-weight: 900; text-align: center; }
    .product-card { min-height: 430px; display: grid; align-content: end; gap: 14px; border: 1px solid rgba(255,255,255,.22); border-radius: 18px; padding: 28px; background: linear-gradient(135deg, rgba(255,255,255,.13), rgba(255,255,255,.05)); box-shadow: 0 28px 70px rgba(0,0,0,.34); }
    .product-card::before { content: ""; width: 86px; height: 8px; border-radius: 999px; background: var(--accent); }
    .product-card span { width: fit-content; border-radius: 999px; padding: 7px 12px; background: var(--accent); color: var(--accent-ink); font-size: 12px; font-weight: 900; text-transform: uppercase; }
    .product-card strong { font-size: clamp(26px, 3.4vw, 42px); line-height: 1.02; }
    .product-card p { font-size: 16px; }
    section { padding: 82px 0; border-top: 1px solid rgba(248,245,237,.1); }
    .paper { background: var(--paper); color: var(--dark-text); }
    .paper p { color: rgba(0,0,0,.68); }
    .section-head { max-width: 760px; margin-bottom: 34px; }
    .split { display: grid; grid-template-columns: minmax(0, .86fr) minmax(0, 1.14fr); gap: 44px; align-items: start; }
    .argument-grid, .step-grid, .faq-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
    .deliver-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; }
    .argument-card, .step-card, .content-card, details, .offer-box, .highlight-box { border: 1px solid rgba(0,0,0,.1); border-radius: 10px; padding: 22px; background: rgba(255,255,255,.74); }
    .argument-card span, .step-card span, .content-card > span { display: inline-grid; min-width: 40px; height: 30px; place-items: center; margin-bottom: 16px; border-radius: 999px; background: var(--accent); color: var(--accent-ink); font-size: 13px; font-weight: 900; }
    .argument-card p, .step-card p, .content-card p { font-size: 16px; }
    .deliver-grid { padding: 0; list-style: none; }
    .deliver-grid li { border: 1px solid rgba(0,0,0,.12); border-radius: 12px; padding: 18px; background: #fff; color: var(--dark-text); font-weight: 800; }
    .content-stack { display: grid; gap: 14px; }
    .content-card { display: grid; grid-template-columns: 62px minmax(0, 1fr); gap: 20px; }
    .content-card strong { display: block; margin-top: 12px; color: var(--dark-text); }
    .dark-band { background: #080d0a; }
    .dark-band .argument-card, .dark-band .step-card, .dark-band details { border-color: rgba(255,255,255,.14); background: rgba(255,255,255,.06); }
    .dark-band p { color: var(--muted); }
    .check-list { display: grid; gap: 12px; margin: 0; padding: 0; list-style: none; }
    .check-list li { position: relative; padding-left: 32px; color: var(--dark-text); font-weight: 800; }
    .check-list li::before { content: ""; position: absolute; left: 0; top: 8px; width: 14px; height: 14px; border-radius: 3px; background: var(--accent); }
    details { color: var(--ink); }
    summary { cursor: pointer; font-size: 18px; font-weight: 900; }
    details p { margin: 14px 0 0; font-size: 17px; }
    .offer { background: linear-gradient(135deg, var(--cover-a), var(--cover-b)); }
    .offer-box { border-color: rgba(255,255,255,.22); background: rgba(255,255,255,.1); color: var(--ink); text-align: center; }
    .offer-box p { color: var(--muted); }
    .price-note { display: inline-block; margin: 8px 0 24px; border-radius: 999px; padding: 8px 14px; background: rgba(255,255,255,.12); color: var(--ink); font-weight: 900; }
    .footer-note { padding: 28px 0; color: rgba(255,255,255,.58); font-size: 13px; text-align: center; }
    @media (max-width: 860px) {
      header { min-height: auto; padding: 34px 0 56px; }
      .hero, .split, .argument-grid, .step-grid, .faq-grid, .deliver-grid, .trust-strip, .hero-list { grid-template-columns: 1fr; }
      .content-card { grid-template-columns: 1fr; }
      .product-card { min-height: 340px; }
    }
  </style>
</head>
<body>
  <header>
    <div class="wrap hero">
      <div class="hero-copy">
        <p class="eyebrow">${escapeHtml(theme.label)}</p>
        <h1>${escapeHtml(product.salesPage.headline)}</h1>
        <p>${escapeHtml(product.salesPage.subheadline)}</p>
        <div class="hero-actions">
          <a class="button" href="#checkout">${escapeHtml(product.salesPage.cta)}</a>
          <a class="button secondary" href="#conteudo">Ver o que recebe</a>
        </div>
        <ul class="hero-list">${bullets}</ul>
      </div>
      <aside class="product-card">
        <span>${escapeHtml(theme.label)}</span>
        <strong>${escapeHtml(product.title)}</strong>
        <p>${escapeHtml(product.promise)}</p>
      </aside>
    </div>
  </header>

  <div class="trust-strip">
    ${trustItems}
  </div>

  <section class="paper">
    <div class="wrap split">
      <div class="section-head">
        <p class="eyebrow">O problema</p>
        <h2>O caminho fica pesado quando falta ordem para executar.</h2>
      </div>
      <div class="argument-grid">
        ${salesSections}
      </div>
    </div>
  </section>

  <section class="dark-band">
    <div class="wrap split">
      <div class="section-head">
        <p class="eyebrow">A solucao</p>
        <h2>Uma entrega simples, direta e organizada para aplicar passo a passo.</h2>
        <p>${escapeHtml(product.promise)}</p>
        <a class="button" href="#checkout">${escapeHtml(product.copyBlocks.cta)}</a>
      </div>
      <div class="step-grid">
        ${modules}
      </div>
    </div>
  </section>

  <section class="paper" id="conteudo">
    <div class="wrap">
      <div class="section-head">
        <p class="eyebrow">O que recebe</p>
        <h2>Conteudo pronto para sair da teoria e entrar na execucao.</h2>
        <p>${escapeHtml(product.subtitle)}</p>
      </div>
      <ul class="deliver-grid">${deliverables}</ul>
    </div>
  </section>

  <section class="paper">
    <div class="wrap">
      <div class="section-head">
        <p class="eyebrow">Por dentro da entrega</p>
        <h2>Veja como o material conduz a aplicacao.</h2>
      </div>
      <div class="content-stack">
        ${contentBlocks}
      </div>
    </div>
  </section>

  <section class="dark-band">
    <div class="wrap split">
      <div class="section-head">
        <p class="eyebrow">Por que funciona</p>
        <h2>Menos excesso, mais clareza de acao.</h2>
        <p>A entrega foi estruturada para reduzir confusao, mostrar a sequencia correta e transformar a decisao em proximos passos simples.</p>
      </div>
      <div class="highlight-box">
        <ul class="check-list">
          <li>Promessa clara para saber o objetivo da aplicacao.</li>
          <li>Etapas organizadas para evitar tentativa aleatoria.</li>
          <li>Acoes praticas para marcar progresso.</li>
          <li>Checklist para revisar e continuar evoluindo.</li>
        </ul>
      </div>
    </div>
  </section>

  <section class="paper">
    <div class="wrap">
      <div class="section-head">
        <p class="eyebrow">Duvidas comuns</p>
        <h2>Antes de comecar</h2>
      </div>
      <div class="faq-grid">
        ${faqItems}
      </div>
    </div>
  </section>

  <section class="offer" id="checkout">
    <div class="wrap narrow">
      <div class="offer-box">
      <p class="eyebrow">Acesso imediato</p>
      <h2>${escapeHtml(product.copyBlocks.headline)}</h2>
      <p>${escapeHtml(product.copyBlocks.hook)}</p>
      <span class="price-note">Produto pronto para aplicar hoje</span>
      <!-- Troque #checkout pelo link real do checkout antes de publicar. -->
      <a class="button" href="#checkout">${escapeHtml(product.copyBlocks.cta)}</a>
      </div>
    </div>
  </section>

  <div class="footer-note">Esta pagina e uma estrutura editavel. Antes de publicar, configure o link de checkout e revise informacoes especificas da oferta.</div>
</body>
</html>`;
}

function buildProductPdf(product: ProductResult) {
  const theme = resolveProjectTheme(product);
  const format = resolveProductFormat(product);
  const pages: { body: string[]; dark: boolean }[] = [];
  const width = 595;
  const height = 842;
  const margin = 46;
  const bottomLimit = 74;
  const dark = hexToPdfRgb(theme.coverA);
  const mid = hexToPdfRgb(theme.coverB);
  const accent = hexToPdfRgb(theme.accent);
  const accentInk = hexToPdfRgb(theme.accentInk);
  const soft = hexToPdfRgb(theme.soft);
  const ink = hexToPdfRgb(theme.ink);
  const surface = hexToPdfRgb(theme.surface);
  const cream = "0.972 0.961 0.920";
  const muted = "0.420 0.455 0.390";

  const rect = (x: number, y: number, w: number, h: number, color: string) => `${color} rg ${x} ${y} ${w} ${h} re f`;
  const strokeRect = (x: number, y: number, w: number, h: number, color: string) =>
    `${color} RG ${x} ${y} ${w} ${h} re S`;
  const text = (value: string, x: number, y: number, size = 12, color = ink, font = "F1") =>
    `BT ${color} rg /${font} ${size} Tf ${x} ${y} Td (${pdfEscape(value)}) Tj ET`;
  const wrappedText = (value: string, x: number, y: number, size = 12, lineWidth = 70, gap = 17, color = ink, font = "F1") =>
    wrapPdfText(value, lineWidth)
      .map((line, index) => text(line, x, y - index * gap, size, color, font))
      .join("\n");
  const footer = (page: number, darkPage = false) =>
    `${text(product.title.toUpperCase(), margin, 28, 7, darkPage ? "0.820 0.860 0.800" : muted, "F1")}\n${text(
      String(page).padStart(2, "0"),
      536,
      28,
      7,
      darkPage ? "0.820 0.860 0.800" : muted,
      "F1",
    )}`;
  const commercialPattern = /(copy|pagina de vendas|landing|checkout|anuncio|prompt|trafego pago|publicar)/i;
  const deliveryItems = product.productBlueprint.filter((item) => !commercialPattern.test(item));
  const overviewItems = (deliveryItems.length >= 3 ? deliveryItems : product.modules).slice(0, 6);
  const contentItems = product.productContent.length ? product.productContent : [
    {
      title: "Primeiro passo",
      body: product.promise,
      task: "Execute a primeira acao e registre o resultado.",
    },
  ];
  const trackedDays = /21/.test(
    `${product.title} ${product.subtitle} ${product.promise} ${product.modules.join(" ")} ${product.productBlueprint.join(" ")} ${product.productContent
      .map((block) => `${block.title} ${block.body} ${block.task}`)
      .join(" ")}`,
  )
    ? 21
    : 7;

  const pushStaticPage = (body: string[], darkPage = false) => {
    pages.push({ body, dark: darkPage });
  };

  const drawTitle = (body: string[], titleValue: string, x: number, y: number, size = 30, color = ink, maxChars = 22) => {
    const lines = wrapPdfText(titleValue.toUpperCase(), maxChars).slice(0, 5);
    lines.forEach((line, index) => body.push(text(line, x, y - index * (size + 6), size, color, "F2")));
    return y - lines.length * (size + 6);
  };

  if (format.name === "checklist") {
    pushStaticPage(
      [
        rect(0, 0, width, height, "0.120 0.105 0.190"),
        rect(0, 0, width, 120, "0.040 0.035 0.055"),
        rect(344, 0, 251, height, "0.430 0.310 0.080"),
        rect(52, 500, 176, 230, accent),
        strokeRect(52, 500, 176, 230, "1 1 1"),
        rect(72, 674, 136, 24, "0.040 0.035 0.055"),
        text("CATALOGO PREMIUM", 82, 682, 8, "1 1 1", "F2"),
        ...wrapPdfText(product.title.toUpperCase(), 13)
          .slice(0, 5)
          .map((line, index) => text(line, 72, 636 - index * 24, 20, accentInk, "F2")),
        rect(306, 626, 214, 40, accent),
        text("CAMPEAO", 326, 641, 18, accentInk, "F2"),
        ...wrapPdfText(product.title.toUpperCase(), 15)
          .slice(0, 5)
          .map((line, index) => text(line, 258, 548 - index * 32, 27, "1 1 1", "F2")),
        rect(82, 248, 332, 34, accent),
        text("NAO PERCA TEMPO PESQUISANDO", 102, 260, 13, accentInk, "F2"),
        wrappedText(product.promise, margin, 202, 13, 56, 18, "1 1 1", "F1"),
        rect(margin, 132, 16, 16, accent),
        text("Categorias, criterios e controle de aplicacao", margin + 28, 135, 11, "1 1 1", "F2"),
      ],
      true,
    );
  } else if (format.name === "playbook") {
    pushStaticPage(
      [
        rect(0, 0, width, height, "0.945 0.890 0.815"),
        rect(0, 0, width, 320, "0.882 0.775 0.650"),
        rect(70, 204, 456, 360, soft),
        rect(98, 232, 400, 304, "0.980 0.950 0.900"),
        rect(176, 274, 244, 210, mid),
        text("Guia", 170, 682, 58, "0.330 0.230 0.210", "F3"),
        ...wrapPdfText(product.title, 20)
          .slice(0, 4)
          .map((line, index) => text(line, 86, 632 - index * 34, 29, "0.330 0.270 0.220", "F2")),
        wrappedText(product.promise, 88, 152, 15, 54, 21, "0.330 0.270 0.220", "F1"),
        text("DIRECAO EDITORIAL", 88, 104, 10, "0.330 0.270 0.220", "F2"),
      ],
      false,
    );
  } else {
    pushStaticPage(
      [
        rect(0, 0, width, height, dark),
        rect(392, 0, 203, height, mid),
        rect(margin, 618, 158, 32, accent),
        text(format.label.toUpperCase(), margin + 14, 629, 10, accentInk, "F2"),
        ...wrapPdfText(product.title.toUpperCase(), 18)
          .slice(0, 6)
          .map((line, index) => text(line, margin, 554 - index * 35, 29, "1 1 1", "F2")),
        wrappedText(product.promise, margin, 304, 13, 34, 19, "1 1 1", "F1"),
        rect(margin, 204, 16, 16, accent),
        text("Produto final pronto para aplicar", margin + 28, 207, 11, "1 1 1", "F2"),
        rect(margin, 170, 16, 16, accent),
        text("Plano pratico com acompanhamento", margin + 28, 173, 11, "1 1 1", "F2"),
        rect(margin, 136, 16, 16, accent),
        text("Checklist de progresso", margin + 28, 139, 11, "1 1 1", "F2"),
      ],
      true,
    );
  }

  pushStaticPage(
    [
      rect(0, 0, width, height, cream),
      text(format.pdfMapTitle, margin, 724, 28, ink, "F2"),
      wrappedText(product.subtitle, margin, 678, 13, 70, 18, ink, "F1"),
      ...product.modules.slice(0, 6).map((item, index) => {
        const y = 586 - index * 66;
        return [
          rect(margin, y, 38, 38, accent),
          text(String(index + 1).padStart(2, "0"), margin + 10, y + 13, 12, accentInk, "F2"),
          wrappedText(item, margin + 58, y + 21, 12, 58, 16, ink, "F2"),
          strokeRect(margin + 58, y - 8, 392, 1, "0.820 0.805 0.730"),
        ].join("\n");
      }),
      rect(margin, 82, width - margin * 2, 78, soft),
      text("Como usar", margin + 20, 126, 14, dark, "F2"),
      wrappedText(format.name === "checklist" ? "Use a entrega como uma sequencia de marcacao: validar, executar, revisar e ajustar antes de avancar." : "Siga as etapas na ordem, marque o progresso e revise a execucao no fim do periodo recomendado.", margin + 20, 104, 11, 66, 15, ink, "F1"),
    ],
    false,
  );

  pushStaticPage(
    [
      rect(0, 0, width, height, dark),
      text(format.pdfPromiseTitle, margin, 724, 16, "1 1 1", "F2"),
      ...wrapPdfText(product.title.toUpperCase(), 23)
        .slice(0, 5)
        .map((line, index) => text(line, margin, 684 - index * 34, 28, "1 1 1", "F2")),
      wrappedText(product.promise, margin, 486, 13, 68, 19, "1 1 1", "F1"),
      rect(margin, 218, width - margin * 2, 172, cream),
      text(format.name === "playbook" ? "O que orienta a decisao" : "O que voce vai encontrar", margin + 24, 352, 15, dark, "F2"),
      ...overviewItems.slice(0, 5).map((item, index) =>
        [
          rect(margin + 24, 314 - index * 35, 14, 14, accent),
          wrappedText(item, margin + 50, 316 - index * 35, 11, 58, 14, ink, "F1"),
        ].join("\n"),
      ),
    ],
    true,
  );

  let currentBody: string[] = [];
  let currentY = 0;
  let currentHeading = "";

  const startFlowPage = (heading: string, kicker = "") => {
    currentHeading = heading;
    currentBody = [rect(0, 0, width, height, cream)];
    pages.push({ body: currentBody, dark: false });
    currentY = height - 74;

    if (kicker) {
      currentBody.push(text(kicker.toUpperCase(), margin, currentY, 10, accent, "F2"));
      currentY -= 24;
    }

    currentY = drawTitle(currentBody, heading, margin, currentY, 27, ink, 22) - 8;
  };

  const ensureSpace = (needed: number) => {
    if (currentY - needed < bottomLimit) startFlowPage(currentHeading, "continuacao");
  };

  const addParagraph = (value: string, size = 12, maxChars = 72, gap = 16, color = ink, font = "F1") => {
    const lines = wrapPdfText(value, maxChars);
    ensureSpace(lines.length * gap + 16);
    lines.forEach((line, index) => currentBody.push(text(line, margin, currentY - index * gap, size, color, font)));
    currentY -= lines.length * gap + 14;
  };

  const addBulletList = (items: string[]) => {
    items.forEach((item) => {
      const lines = wrapPdfText(item, 64);
      ensureSpace(Math.max(32, lines.length * 15 + 12));
      currentBody.push(rect(margin + 6, currentY - 10, 13, 13, accent));
      lines.forEach((line, index) => currentBody.push(text(line, margin + 34, currentY - index * 15, 11, ink, "F1")));
      currentY -= Math.max(32, lines.length * 15 + 10);
    });
    currentY -= 6;
  };

  const addSectionCard = (label: string, titleValue: string, bodyValue: string, taskValue: string) => {
    const titleLines = wrapPdfText(titleValue.toUpperCase(), 48);
    const bodyLines = wrapPdfText(bodyValue, 70);
    const taskLines = wrapPdfText(taskValue, 62);
    const boxHeight = Math.min(610, 46 + titleLines.length * 17 + bodyLines.length * 14 + taskLines.length * 14 + 72);

    ensureSpace(boxHeight + 20);
    currentBody.push(rect(margin, currentY - boxHeight + 18, width - margin * 2, boxHeight, surface));
    currentBody.push(strokeRect(margin, currentY - boxHeight + 18, width - margin * 2, boxHeight, "0.860 0.850 0.780"));
    currentBody.push(rect(margin + 18, currentY - 20, 72, 28, accent));
    currentBody.push(text(label.toUpperCase(), margin + 30, currentY - 10, 9, accentInk, "F2"));

    let innerY = currentY - 10;
    titleLines.forEach((line, index) => currentBody.push(text(line, margin + 112, innerY - index * 17, 13, dark, "F2")));
    innerY -= titleLines.length * 17 + 10;
    bodyLines.forEach((line, index) => currentBody.push(text(line, margin + 112, innerY - index * 14, 10, ink, "F1")));
    innerY -= bodyLines.length * 14 + 18;
    currentBody.push(rect(margin + 112, innerY - taskLines.length * 14 - 12, 344, taskLines.length * 14 + 24, soft));
    currentBody.push(text("ACAO", margin + 128, innerY - 2, 9, dark, "F2"));
    taskLines.forEach((line, index) => currentBody.push(text(line, margin + 128, innerY - 18 - index * 14, 10, ink, "F2")));
    currentY -= boxHeight + 18;
  };

  const addDirectoryGrid = (items: string[]) => {
    const cols = 3;
    const gap = 16;
    const cardW = (width - margin * 2 - gap * (cols - 1)) / cols;
    const cardH = 86;

    items.slice(0, 12).forEach((item, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      const x = margin + col * (cardW + gap);
      const y = currentY - row * (cardH + 22);
      const lines = wrapPdfText(item, 20).slice(0, 3);

      currentBody.push(rect(x, y - cardH, cardW, cardH, surface));
      currentBody.push(strokeRect(x, y - cardH, cardW, cardH, "0.740 0.620 0.300"));
      currentBody.push(rect(x, y - 24, cardW, 24, accent));
      currentBody.push(text(`ITEM ${String(index + 1).padStart(2, "0")}`, x + 10, y - 16, 8, accentInk, "F2"));
      lines.forEach((line, lineIndex) => currentBody.push(text(line, x + 10, y - 44 - lineIndex * 13, 9, ink, "F2")));
      currentBody.push(text("Validar contato, margem e primeiro pedido", x + 10, y - 74, 6.8, muted, "F1"));
    });

    currentY -= Math.ceil(Math.min(items.length, 12) / cols) * (cardH + 22) + 12;
  };

  const addEditorialTable = (rows: { left: string; right: string }[]) => {
    const tableW = width - margin * 2;
    const leftW = 160;
    const rowH = 82;
    currentBody.push(rect(margin, currentY - 32, tableW, 32, dark));
    currentBody.push(text("DECISAO", margin + 14, currentY - 20, 9, "1 1 1", "F2"));
    currentBody.push(text("PROXIMA ACAO", margin + leftW + 24, currentY - 20, 9, "1 1 1", "F2"));
    currentY -= 32;

    rows.forEach((row, index) => {
      ensureSpace(rowH + 14);
      currentBody.push(rect(margin, currentY - rowH, tableW, rowH, index % 2 ? "0.925 0.920 0.860" : surface));
      currentBody.push(strokeRect(margin, currentY - rowH, tableW, rowH, "0.850 0.835 0.770"));
      currentBody.push(strokeRect(margin + leftW, currentY - rowH, 1, rowH, "0.850 0.835 0.770"));
      currentBody.push(wrappedText(row.left, margin + 14, currentY - 28, 11, 20, 15, dark, "F2"));
      currentBody.push(wrappedText(row.right, margin + leftW + 24, currentY - 28, 10, 44, 14, ink, "F1"));
      currentY -= rowH;
    });

    currentY -= 18;
  };

  startFlowPage(format.pdfIntroTitle, format.pdfIntroKicker);
  addParagraph(
    format.name === "checklist"
      ? "Leia os criterios, marque o que ja esta pronto e use os itens pendentes como ordem de execucao."
      : "Prepare o ambiente, leia a promessa principal e execute a primeira versao sem tentar aperfeicoar tudo antes de aplicar.",
    12,
    70,
  );
  addBulletList(overviewItems);
  addParagraph(
    format.name === "playbook"
      ? "Regra simples: uma boa decisao precisa deixar claro o que fazer agora, o que ignorar e quando revisar."
      : "Regra simples: se uma etapa nao gerar uma acao clara, transforme-a em um passo menor antes de continuar.",
    12,
    70,
    16,
    dark,
    "F2",
  );

  if (format.name === "checklist") {
    startFlowPage("Catalogo por categorias", "diretorio");
    addParagraph("Este modelo funciona como um diretorio consultivo: organize as melhores oportunidades por categoria, criterio de compra, margem e primeiro teste recomendado.", 12, 70);
    addDirectoryGrid([...overviewItems, ...contentItems.map((block) => block.title), ...contentItems.map((block) => block.task)]);
  }

  if (format.name === "playbook") {
    startFlowPage("Capitulo de contexto", "guia editorial");
    currentBody.push(rect(margin, currentY - 130, width - margin * 2, 130, mid));
    currentBody.push(rect(margin + 22, currentY - 104, 160, 58, cream));
    currentBody.push(text("CENARIO", margin + 44, currentY - 70, 16, dark, "F2"));
    currentY -= 162;
    addParagraph("Antes de aplicar qualquer plano, e preciso entender o cenario. Este formato combina explicacao, exemplos, tabelas e decisoes praticas para conduzir a aplicacao com mais profundidade.", 12, 70);
    addEditorialTable(
      contentItems.slice(0, 5).map((block) => ({
        left: block.title,
        right: block.task,
      })),
    );
  }

  startFlowPage(format.pdfExecutionTitle, format.pdfExecutionKicker);
  contentItems.forEach((block, index) => {
    const label = format.name === "checklist" ? `item ${index + 1}` : format.name === "playbook" ? `acao ${index + 1}` : `passo ${index + 1}`;
    addSectionCard(label, block.title, block.body, block.task);
  });

  startFlowPage(format.pdfPracticeTitle, format.pdfPracticeKicker);
  if (format.name === "checklist") {
    [...overviewItems, ...contentItems.map((block) => block.task)].slice(0, 10).forEach((item, index) => {
      const lines = wrapPdfText(item, 62);
      const boxHeight = Math.max(54, lines.length * 15 + 28);
      ensureSpace(boxHeight + 12);
      currentBody.push(rect(margin, currentY - boxHeight + 12, width - margin * 2, boxHeight, index % 2 ? "0.925 0.920 0.860" : surface));
      currentBody.push(strokeRect(margin + 20, currentY - 24, 18, 18, dark));
      lines.forEach((line, lineIndex) => currentBody.push(text(line, margin + 58, currentY - 14 - lineIndex * 15, 11, ink, "F2")));
      currentY -= boxHeight + 10;
    });
  } else if (format.name === "playbook") {
    contentItems.slice(0, 6).forEach((block, index) => {
      ensureSpace(92);
      const y = currentY;
      currentBody.push(rect(margin, y - 72, 226, 82, index % 2 ? "0.925 0.920 0.860" : surface));
      currentBody.push(rect(margin + 246, y - 72, 226, 82, soft));
      currentBody.push(text(`DECISAO ${index + 1}`, margin + 18, y - 14, 9, accent, "F2"));
      currentBody.push(wrappedText(block.title, margin + 18, y - 34, 10, 28, 13, ink, "F2"));
      currentBody.push(text("PROXIMA ACAO", margin + 264, y - 14, 9, dark, "F2"));
      currentBody.push(wrappedText(block.task, margin + 264, y - 34, 10, 28, 13, ink, "F1"));
      currentY -= 100;
    });
  } else {
    contentItems.forEach((block, index) => {
      const titleLines = wrapPdfText(block.title.toUpperCase(), 50);
      const bodyLines = wrapPdfText(block.body, 62);
      const taskLines = wrapPdfText(block.task, 58);
      const boxHeight = 92 + titleLines.length * 16 + bodyLines.length * 13 + taskLines.length * 14;
      ensureSpace(boxHeight + 18);
      currentBody.push(rect(margin, currentY - boxHeight + 16, width - margin * 2, boxHeight, index % 2 ? "0.925 0.920 0.860" : surface));
      currentBody.push(rect(margin, currentY - 22, 54, 32, dark));
      currentBody.push(text(String(index + 1).padStart(2, "0"), margin + 17, currentY - 10, 12, "1 1 1", "F2"));
      titleLines.forEach((line, lineIndex) => currentBody.push(text(line, margin + 74, currentY - 4 - lineIndex * 16, 13, dark, "F2")));
      let innerY = currentY - 16 - titleLines.length * 16;
      currentBody.push(text("Objetivo", margin + 74, innerY, 9, accent, "F2"));
      innerY -= 16;
      bodyLines.forEach((line, lineIndex) => currentBody.push(text(line, margin + 74, innerY - lineIndex * 13, 10, ink, "F1")));
      innerY -= bodyLines.length * 13 + 16;
      currentBody.push(text("Acao pratica", margin + 74, innerY, 9, accent, "F2"));
      innerY -= 16;
      taskLines.forEach((line, lineIndex) => currentBody.push(text(line, margin + 74, innerY - lineIndex * 14, 10, ink, "F2")));
      currentY -= boxHeight + 16;
    });
  }

  startFlowPage(format.name === "protocol" ? `Plano de ${trackedDays} dias` : format.pdfTrackerTitle, format.pdfTrackerKicker);
  addParagraph(format.pdfTrackerIntro, 12, 70);
  const tableTop = currentY - 8;
  const rowHeight = trackedDays > 14 ? 22 : 30;
  currentBody.push(rect(margin, tableTop - 30, width - margin * 2, 30, dark));
  currentBody.push(text("DIA", margin + 16, tableTop - 19, 10, "1 1 1", "F2"));
  currentBody.push(text("FEITO", margin + 90, tableTop - 19, 10, "1 1 1", "F2"));
  currentBody.push(text("OBSERVACAO RAPIDA", margin + 170, tableTop - 19, 10, "1 1 1", "F2"));
  for (let day = 1; day <= trackedDays; day += 1) {
    const y = tableTop - 30 - day * rowHeight;
    currentBody.push(rect(margin, y, width - margin * 2, rowHeight, day % 2 ? surface : "0.925 0.920 0.860"));
    currentBody.push(text(String(day).padStart(2, "0"), margin + 18, y + 7, 10, ink, "F2"));
    currentBody.push(strokeRect(margin + 98, y + 5, 12, 12, dark));
    currentBody.push(strokeRect(margin + 170, y + 7, 312, 1, "0.780 0.770 0.700"));
  }

  startFlowPage("Checklist final", "revisao");
  [
    "Entendi a promessa principal da entrega.",
    "Conclui o diagnostico ou preparacao inicial.",
    "Executei cada etapa em ordem.",
    "Marquei meu progresso no plano de acompanhamento.",
    "Revisei o resultado e defini o proximo ciclo de aplicacao.",
  ].forEach((item, index) => {
    const y = currentY - index * 54;
    currentBody.push(rect(margin, y - 36, width - margin * 2, 44, index % 2 ? "0.925 0.920 0.860" : surface));
    currentBody.push(text(item, margin + 20, y - 12, 12, ink, "F1"));
    currentBody.push(strokeRect(width - margin - 30, y - 20, 18, 18, dark));
  });
  currentY -= 320;
  currentBody.push(rect(margin, currentY - 92, 318, 92, soft));
  currentBody.push(wrappedText("A evolucao vem da execucao simples, repetida e revisada. Comece pela primeira etapa e mantenha o registro do progresso.", margin + 20, currentY - 32, 12, 42, 16, dark, "F2"));

  const minimumPagePlans = [
    {
      title: "Plano de aplicacao",
      kicker: "complemento",
      intro: "Use esta pagina para transformar a entrega em uma rotina simples de aplicacao e revisao.",
      items: ["Defina o primeiro passo.", "Execute antes de aperfeicoar.", "Registre o resultado.", "Revise o que precisa melhorar."],
    },
    {
      title: "Erros para evitar",
      kicker: "seguranca",
      intro: "Evite complicar a entrega. O material precisa conduzir uma acao clara, simples e verificavel.",
      items: ["Pular a preparacao.", "Tentar fazer tudo no mesmo dia.", "Ignorar os criterios de qualidade.", "Nao registrar progresso."],
    },
    {
      title: "Proximo ciclo",
      kicker: "continuidade",
      intro: "Depois da primeira aplicacao, use este quadro para repetir o processo com mais clareza.",
      items: ["O que funcionou.", "O que ficou confuso.", "O que sera simplificado.", "Qual sera a proxima meta."],
    },
    {
      title: "Notas finais",
      kicker: "registro",
      intro: "Anote percepcoes, ajustes e pequenas melhorias para manter a evolucao organizada.",
      items: ["Principal aprendizado.", "Melhor ajuste.", "Proxima revisao.", "Resultado esperado."],
    },
  ];

  let minimumPageIndex = 0;
  while (pages.length < 10) {
    const plan = minimumPagePlans[minimumPageIndex % minimumPagePlans.length];
    startFlowPage(plan.title, plan.kicker);
    addParagraph(plan.intro, 12, 70);
    addBulletList(plan.items);
    currentBody.push(rect(margin, Math.max(currentY - 120, 112), width - margin * 2, 96, soft));
    currentBody.push(wrappedText("Espaco para anotacoes: registre aqui os pontos que precisam de ajuste antes de repetir o processo.", margin + 20, Math.max(currentY - 54, 176), 11, 62, 15, dark, "F2"));
    minimumPageIndex += 1;
  }

  const objects: string[] = ["", ""];
  const addObject = (body: string) => {
    objects.push(body);
    return objects.length;
  };
  const pageRefs: number[] = [];
  const catalogRef = 1;
  const pagesRef = 2;
  const fontRef = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  const fontBoldRef = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");
  const fontItalicRef = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Times-Italic >>");

  pages.forEach((page, index) => {
    const stream = `${page.body.join("\n")}\n${footer(index + 1, page.dark)}`;
    const contentRef = addObject(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
    const pageRef = addObject(`<< /Type /Page /Parent ${pagesRef} 0 R /MediaBox [0 0 ${width} ${height}] /Resources << /Font << /F1 ${fontRef} 0 R /F2 ${fontBoldRef} 0 R /F3 ${fontItalicRef} 0 R >> >> /Contents ${contentRef} 0 R >>`);
    pageRefs.push(pageRef);
  });

  objects[catalogRef - 1] = `<< /Type /Catalog /Pages ${pagesRef} 0 R >>`;
  objects[pagesRef - 1] = `<< /Type /Pages /Kids [${pageRefs.map((ref) => `${ref} 0 R`).join(" ")}] /Count ${pageRefs.length} >>`;

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((body, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogRef} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return new TextEncoder().encode(pdf);
}

const crcTable = new Uint32Array(256).map((_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }
  return value >>> 0;
});

function crc32(data: Uint8Array) {
  let crc = 0xffffffff;
  data.forEach((byte) => {
    crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  });
  return (crc ^ 0xffffffff) >>> 0;
}

function concatBytes(parts: Uint8Array[]) {
  const size = parts.reduce((total, part) => total + part.length, 0);
  const output = new Uint8Array(size);
  let offset = 0;

  parts.forEach((part) => {
    output.set(part, offset);
    offset += part.length;
  });

  return output;
}

function zipHeader(size: number) {
  return new Uint8Array(size);
}

function buildZip(files: { name: string; data: string | Uint8Array }[]) {
  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const centralChunks: Uint8Array[] = [];
  let offset = 0;

  files.forEach((file) => {
    const nameBytes = encoder.encode(file.name);
    const dataBytes = typeof file.data === "string" ? encoder.encode(file.data) : file.data;
    const crc = crc32(dataBytes);
    const local = zipHeader(30 + nameBytes.length);
    const localView = new DataView(local.buffer);
    localView.setUint32(0, 0x04034b50, true);
    localView.setUint16(4, 20, true);
    localView.setUint16(6, 0x0800, true);
    localView.setUint16(8, 0, true);
    localView.setUint32(14, crc, true);
    localView.setUint32(18, dataBytes.length, true);
    localView.setUint32(22, dataBytes.length, true);
    localView.setUint16(26, nameBytes.length, true);
    local.set(nameBytes, 30);
    chunks.push(local, dataBytes);

    const central = zipHeader(46 + nameBytes.length);
    const centralView = new DataView(central.buffer);
    centralView.setUint32(0, 0x02014b50, true);
    centralView.setUint16(4, 20, true);
    centralView.setUint16(6, 20, true);
    centralView.setUint16(8, 0x0800, true);
    centralView.setUint16(10, 0, true);
    centralView.setUint32(16, crc, true);
    centralView.setUint32(20, dataBytes.length, true);
    centralView.setUint32(24, dataBytes.length, true);
    centralView.setUint16(28, nameBytes.length, true);
    centralView.setUint32(42, offset, true);
    central.set(nameBytes, 46);
    centralChunks.push(central);
    offset += local.length + dataBytes.length;
  });

  const centralOffset = offset;
  const centralBytes = concatBytes(centralChunks);
  const end = zipHeader(22);
  const endView = new DataView(end.buffer);
  endView.setUint32(0, 0x06054b50, true);
  endView.setUint16(8, files.length, true);
  endView.setUint16(10, files.length, true);
  endView.setUint32(12, centralBytes.length, true);
  endView.setUint32(16, centralOffset, true);

  const blobParts = [...chunks, centralBytes, end].map((part) => {
    const copy = new Uint8Array(part.byteLength);
    copy.set(part);
    return copy.buffer;
  });
  return new Blob(blobParts, { type: "application/zip" });
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function buildProjectBundle(product: ProductResult) {
  const baseName = slugify(product.title);
  return {
    filename: `${baseName}-pacote.zip`,
    blob: buildZip([
      { name: "01-produto-pronto.pdf", data: buildProductPdf(product) },
      { name: "02-produto-editavel.html", data: buildProductHtml(product) },
      { name: "03-pagina-de-vendas.html", data: buildSalesPageHtml(product) },
      { name: "04-copy-da-pagina.txt", data: buildCopyText(product) },
      { name: "05-prompts.txt", data: buildPromptsText(product) },
      { name: "06-revisao-da-entrega.txt", data: buildReviewText(product) },
      { name: "07-direcao-visual.txt", data: buildVisualDirectionText(product) },
      { name: "08-dados-do-projeto.json", data: JSON.stringify(product, null, 2) },
    ]),
  };
}

function normalizeAiProduct(data: Partial<ProductResult>, fallback: ProductResult): ProductResult {
  const normalized = {
    title: data.title || fallback.title,
    subtitle: data.subtitle || fallback.subtitle,
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
          }))
        : fallback.productContent,
    copyBlocks: {
      hook: data.copyBlocks?.hook || fallback.copyBlocks.hook,
      headline: data.copyBlocks?.headline || fallback.copyBlocks.headline,
      bullets:
        Array.isArray(data.copyBlocks?.bullets) && data.copyBlocks.bullets.length
          ? data.copyBlocks.bullets.slice(0, 6)
          : fallback.copyBlocks.bullets,
      cta: data.copyBlocks?.cta || fallback.copyBlocks.cta,
    },
    salesPage: {
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
  };

  return sanitizeProductLanguage(normalized);
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
      title: professionalizeText(block.title),
      body: professionalizeText(block.body),
      task: professionalizeText(block.task),
    })),
    copyBlocks: {
      hook: professionalizeText(product.copyBlocks.hook),
      headline: professionalizeText(product.copyBlocks.headline),
      bullets: product.copyBlocks.bullets.map(professionalizeText),
      cta: professionalizeText(product.copyBlocks.cta),
    },
    salesPage: {
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

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [mode, setMode] = useState<"login" | "forgot" | "set-password">("login");
  const [linkToken, setLinkToken] = useState("");
  const [loginNotice, setLoginNotice] = useState("");
  const [name, setName] = useState("Usuario");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [loginError, setLoginError] = useState("");
  const [sessionToken, setSessionToken] = useState(() =>
    typeof window === "undefined" ? "" : window.localStorage.getItem(sessionKey) || "",
  );
  const [accessStatus, setAccessStatus] = useState<AccessStatus>("pending");
  const [niche, setNiche] = useState("marmita fit");
  const [audience, setAudience] = useState("pessoas que querem vender comida saudavel");
  const [productType, setProductType] = useState(productTypes[0]);
  const [tone, setTone] = useState(toneOptions[0]);
  const [trendSearch, setTrendSearch] = useState("");
  const [trendCategory, setTrendCategory] = useState("Todos");
  const [trendOpportunities, setTrendOpportunities] = useState<TrendProduct[]>(trendProducts);
  const [selectedTrendProduct, setSelectedTrendProduct] = useState<TrendProduct | null>(null);
  const [productBrief, setProductBrief] = useState("");
  const [studentProductInfo, setStudentProductInfo] = useState("");
  const [activeView, setActiveView] = useState<ActiveView>("radar");
  const [copyMode, setCopyMode] = useState<"video" | "ad">("video");
  const [copyBrief, setCopyBrief] = useState("");
  const [result, setResult] = useState<ProductResult | null>(() =>
    buildProduct("marmita fit", productTypes[0], "pessoas que querem vender comida saudavel", toneOptions[0]),
  );
  const [currentProjectId, setCurrentProjectId] = useState("");
  const [savedProjects, setSavedProjects] = useState<SavedProject[]>([]);
  const [recentCutoff] = useState(() => Date.now() - 30 * 24 * 60 * 60 * 1000);
  const [usage, setUsage] = useState<UsageState>({
    productsUsed: 0,
    productsLimit: 5,
    copyEditsPerProductLimit: 5,
    copyUsage: {},
  });
  const [copiedLabel, setCopiedLabel] = useState("");
  const [activeGeneration, setActiveGeneration] = useState<"product" | "copy" | null>(null);
  const [generationSource, setGenerationSource] = useState("Rascunho rapido");
  const [lastPackageName, setLastPackageName] = useState("");

  const canAccess = accessStatus === "active";

  const trendCategories = useMemo(() => {
    return ["Todos", ...Array.from(new Set(trendOpportunities.map((product) => product.category)))];
  }, [trendOpportunities]);

  const filteredTrendProducts = useMemo(() => {
    const query = trendSearch.trim().toLowerCase();

    return trendOpportunities.filter((product) => {
      const matchesCategory = trendCategory === "Todos" || product.category === trendCategory;
      const matchesSearch =
        !query ||
        product.title.toLowerCase().includes(query) ||
        product.niche.toLowerCase().includes(query) ||
        product.category.toLowerCase().includes(query) ||
        product.audience.toLowerCase().includes(query) ||
        product.angle.toLowerCase().includes(query) ||
        (product.promise || "").toLowerCase().includes(query);

      return matchesCategory && matchesSearch;
    });
  }, [trendCategory, trendOpportunities, trendSearch]);

  const lockedTrendCards = useMemo(() => Array.from({ length: 6 }, (_, index) => index), []);

  const recentSavedProjects = useMemo(() => {
    return savedProjects.filter((project) => {
      if (!project.created_at) return true;
      const createdAt = new Date(project.created_at).getTime();
      return Number.isNaN(createdAt) || createdAt >= recentCutoff;
    });
  }, [recentCutoff, savedProjects]);

  const statusCopy = useMemo(() => {
    if (accessStatus === "active") {
      return {
        label: "Acesso aprovado",
        text: `Produtos neste mes: ${usage.productsUsed}/${usage.productsLimit}. Alteracoes por produto: ${usage.copyEditsPerProductLimit}.`,
      };
    }

    if (accessStatus === "pending") {
      return {
        label: "Pagamento pendente",
        text: "Seu acesso sera liberado quando a compra for confirmada.",
      };
    }

    if (accessStatus === "expired") {
      return {
        label: "Acesso expirado",
        text: "O periodo de acesso terminou.",
      };
    }

    return {
      label: "Acesso bloqueado",
      text: "O acesso foi bloqueado por cancelamento, reembolso ou revisao.",
    };
  }, [accessStatus, usage.copyEditsPerProductLimit, usage.productsLimit, usage.productsUsed]);

  async function authenticatedJson(path: string, init: RequestInit = {}) {
    const response = await fetch(path, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${sessionToken}`,
        ...(init.headers || {}),
      },
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Acao indisponivel.");
    }

    return data;
  }

  async function loadAccount(token: string) {
    const response = await fetch("/api/auth/me", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Sessao invalida.");
    }

    setName(data.user.name || data.profile.name || "Usuario");
    setEmail(data.user.email);
    setAccessStatus(data.profile.access_status);
    setUsage(data.usage);
    setSavedProjects(data.projects);
    if (Array.isArray(data.trends) && data.trends.length) {
      setTrendOpportunities(data.trends);
    }
    setIsLoggedIn(true);

    if (data.projects?.[0]) {
      const fallback = buildProduct(niche, productType, audience, tone);
      setCurrentProjectId(data.projects[0].id);
      setResult(normalizeAiProduct(data.projects[0].payload, fallback));
    }
  }

  function updateSavedProject(project: SavedProject) {
    setSavedProjects((projects) => [project, ...projects.filter((item) => item.id !== project.id)].slice(0, 12));
  }

  useEffect(() => {
    if (!sessionToken) return;

    const timer = window.setTimeout(() => {
      loadAccount(sessionToken).catch(() => {
        window.localStorage.removeItem(sessionKey);
        setSessionToken("");
        setIsLoggedIn(false);
      });
    }, 0);

    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Links do Supabase (convite apos a compra ou recuperacao) chegam com o token no hash.
    const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const linkError = params.get("error_description");
    const token = params.get("access_token");
    const type = params.get("type");

    if (!linkError && !token) return;

    window.history.replaceState(null, "", window.location.pathname);

    const timer = window.setTimeout(() => {
      if (linkError) {
        setMode("forgot");
        setLoginError("Este link expirou ou ja foi usado. Informe seu email para receber um novo.");
        return;
      }

      if (token && (type === "invite" || type === "recovery")) {
        setLinkToken(token);
        setMode("set-password");
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!copiedLabel || activeGeneration) return;

    const timer = window.setTimeout(() => {
      setCopiedLabel("");
    }, 3800);

    return () => window.clearTimeout(timer);
  }, [activeGeneration, copiedLabel]);

  async function submitAccess(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanEmail = email.trim().toLowerCase();

    setLoginError("");
    setLoginNotice("");

    try {
      if (mode === "forgot") {
        if (!cleanEmail) throw new Error("Informe seu email.");

        const response = await fetch("/api/auth/recover", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: cleanEmail }),
        });
        const data = await response.json();

        if (!response.ok) throw new Error(data.error || "Nao foi possivel enviar o link.");

        setLoginNotice(data.message);
        return;
      }

      if (mode === "set-password") {
        if (password.length < 8) throw new Error("A senha precisa ter pelo menos 8 caracteres.");
        if (password !== passwordConfirm) throw new Error("As senhas nao conferem.");

        const response = await fetch("/api/auth/password", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${linkToken}` },
          body: JSON.stringify({ password }),
        });
        const data = await response.json();

        if (!response.ok) throw new Error(data.error || "Nao foi possivel salvar a senha.");

        window.localStorage.setItem(sessionKey, linkToken);
        setSessionToken(linkToken);
        setLinkToken("");
        setPassword("");
        setPasswordConfirm("");
        setMode("login");
        await loadAccount(linkToken);
        return;
      }

      if (!cleanEmail || !password.trim()) {
        throw new Error("Preencha email e senha para acessar.");
      }

      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail, password }),
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data.error || "Nao foi possivel acessar.");

      const token = data.session.accessToken as string;
      window.localStorage.setItem(sessionKey, token);
      setSessionToken(token);
      setName(data.user.name || "Usuario");
      setEmail(cleanEmail);
      await loadAccount(token);
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : "Erro ao acessar.");
    }
  }

  function generateProduct() {
    const nextResult = buildProduct(niche, productType, audience, tone);
    setResult(nextResult);
    setGenerationSource("Rascunho rapido");
    setActiveView("produto");
  }

  async function generateProductWithAi() {
    if (!sessionToken) {
      setCopiedLabel("Faca login para criar produtos");
      return;
    }

    setActiveGeneration("product");
    setCopiedLabel("Criando produto completo...");
    const fullProductBrief = [
      productBrief,
      studentProductInfo.trim() ? `Informacoes extras do projeto:\n${studentProductInfo.trim()}` : "",
    ]
      .filter(Boolean)
      .join("\n\n");

    try {
      const data = await authenticatedJson("/api/generate/product", {
        method: "POST",
        body: JSON.stringify({ niche, audience, productType, tone, productBrief: fullProductBrief }),
      });
      const product = normalizeAiProduct(data.product, buildProduct(niche, productType, audience, tone));
      setResult(product);
      setCurrentProjectId(data.project.id);
      setUsage(data.usage);
      setSavedProjects((projects) => [data.project, ...projects.filter((project) => project.id !== data.project.id)].slice(0, 12));
      setGenerationSource(data.source === "internal" ? "Criacao concluida" : "Criacao automatica concluida");
      const bundle = buildProjectBundle(product);
      downloadBlob(bundle.blob, bundle.filename);
      setLastPackageName(bundle.filename);
      setCopiedLabel("Produto completo criado e pacote baixado");
      setActiveView("produto");
    } catch (error) {
      setGenerationSource("Rascunho rapido");
      setCopiedLabel(error instanceof Error ? error.message.slice(0, 120) : "Erro ao gerar com IA");
    } finally {
      setActiveGeneration(null);
    }
  }

  async function generateCopyWithAi() {
    if (!currentProjectId) {
      setCopiedLabel("Crie ou abra um produto antes de alterar a copy");
      return;
    }

    setActiveGeneration("copy");
    setCopiedLabel("Criando copy completa...");

    try {
      const data = await authenticatedJson("/api/generate/copy", {
        method: "POST",
        body: JSON.stringify({ projectId: currentProjectId, audience, tone, copyBrief }),
      });
      data.project.payload = sanitizeProductLanguage(data.project.payload);
      setResult(data.project.payload);
      setUsage(data.usage);
      updateSavedProject(data.project);
      setGenerationSource("Copy criada com automacao");
      setCopiedLabel("Copy completa criada");
      setActiveView("copy");
    } catch (error) {
      setCopiedLabel(error instanceof Error ? error.message.slice(0, 120) : "Erro ao gerar copy");
    } finally {
      setActiveGeneration(null);
    }
  }

  function applyTrendProduct(product: TrendProduct) {
    if (!canAccess) {
      setCopiedLabel("Acesso aguardando confirmacao");
      return;
    }

    setNiche(product.niche);
    setAudience(product.audience);
    setProductType(product.productType);
    setTone("Direto e popular");
    setProductBrief(getOpportunityBrief(product));
    setResult(buildProduct(product.niche, product.productType, product.audience, "Direto e popular"));
    setGenerationSource("Oportunidade aplicada do radar");
    setSelectedTrendProduct(null);
    setCopiedLabel("Oportunidade aplicada no gerador");
    setActiveView("gerador");
  }

  function saveProject() {
    setCopiedLabel(currentProjectId ? "Projeto salvo no painel" : "Crie o produto completo para salvar no banco");
  }

  function selectSavedProject(projectId: string, view: ActiveView = "copy") {
    const project = savedProjects.find((item) => item.id === projectId);
    if (!project) return;

    setCurrentProjectId(project.id);
    setResult(sanitizeProductLanguage(project.payload));
    setActiveView(view);
  }

  async function copyText(label: string, value: string) {
    await window.navigator.clipboard.writeText(value);
    setCopiedLabel(label);
  }

  function downloadProject() {
    if (!result) return;

    const bundle = buildProjectBundle(result);
    downloadBlob(bundle.blob, bundle.filename);
    setLastPackageName(bundle.filename);
    setCopiedLabel("Pacote do projeto baixado");
  }

  if (!isLoggedIn) {
    return (
      <main className="login-shell">
        <form className="login-card" onSubmit={submitAccess}>
          <div>
            <p className="eyebrow">Area de acesso</p>
            <h2>
              {mode === "login" && "Entrar no Painel Inteligente"}
              {mode === "forgot" && "Recuperar acesso"}
              {mode === "set-password" && "Defina sua senha"}
            </h2>
          </div>

          {mode !== "set-password" && (
            <label>
              Email
              <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="email" />
            </label>
          )}
          {mode !== "forgot" && (
            <label>
              {mode === "set-password" ? "Nova senha" : "Senha"}
              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                type="password"
                autoComplete={mode === "set-password" ? "new-password" : "current-password"}
              />
            </label>
          )}
          {mode === "set-password" && (
            <label>
              Confirme a senha
              <input
                value={passwordConfirm}
                onChange={(event) => setPasswordConfirm(event.target.value)}
                type="password"
                autoComplete="new-password"
              />
            </label>
          )}
          {loginError && <p className="form-error">{loginError}</p>}
          {loginNotice && <p className="form-notice">{loginNotice}</p>}

          <button className="primary" type="submit">
            {mode === "login" && "Acessar painel"}
            {mode === "forgot" && "Enviar link"}
            {mode === "set-password" && "Salvar senha e entrar"}
          </button>

          {mode === "login" && (
            <button type="button" className="link-button" onClick={() => { setMode("forgot"); setLoginError(""); setLoginNotice(""); }}>
              Esqueci minha senha
            </button>
          )}
          {mode === "forgot" && (
            <button type="button" className="link-button" onClick={() => { setMode("login"); setLoginError(""); setLoginNotice(""); }}>
              Voltar para o login
            </button>
          )}
        </form>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand-row">
          <div className="mini-mark">PI</div>
          <div>
            <strong>Painel Inteligente</strong>
            <span>Painel de criacao</span>
          </div>
        </div>

        <nav aria-label="Navegacao principal">
          {menuItems.map((item) => (
            <button
              className={activeView === item.id ? "active" : ""}
              key={item.id}
              onClick={() => setActiveView(item.id)}
              type="button"
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className={`access-box ${accessStatus}`}>
          <span>{statusCopy.label}</span>
          <p>{statusCopy.text}</p>
        </div>

        <button
          className="ghost"
          onClick={() => {
            window.localStorage.removeItem(sessionKey);
            setSessionToken("");
            setIsLoggedIn(false);
          }}
        >
          Sair
        </button>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">Bem-vindo, {name}</p>
            <h1>Painel Inteligente para criar produto completo em minutos</h1>
          </div>
          <div className={`active-badge ${canAccess ? "" : "inactive"}`} aria-label={statusCopy.label}>
            <span />
            {statusCopy.label}
          </div>
        </header>

        {!canAccess && (
          <section className="blocked-state" aria-live="polite">
            <h2>{statusCopy.label}</h2>
            <p>{statusCopy.text}</p>
            <p>Se voce acredita que seu acesso deveria estar ativo, aguarde a confirmacao da compra ou fale com o suporte.</p>
          </section>
        )}

        <div className={canAccess ? "content-grid single-view" : "content-grid single-view locked"}>
          <section className={`panel trend-panel view-panel ${activeView === "radar" ? "" : "is-hidden"} ${canAccess ? "" : "is-locked"}`} id="tendencias">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Radar de oportunidades</p>
                <h2>Nichos em alta para produtos ate R$97</h2>
                <p className="panel-note">O radar usa sinais salvos da base de oportunidades para sugerir nichos, formatos e angulos de venda.</p>
              </div>
              <span className="source-pill">Base de oportunidades</span>
            </div>

            <div className="trend-toolbar" aria-disabled={!canAccess}>
              <label>
                Pesquisar oportunidade
                <input
                  value={trendSearch}
                  onChange={(event) => setTrendSearch(event.target.value)}
                  placeholder="Ex: beleza, alimentacao, renda extra"
                  disabled={!canAccess}
                />
              </label>
              <label>
                Categoria
                <select value={trendCategory} onChange={(event) => setTrendCategory(event.target.value)} disabled={!canAccess}>
                  {trendCategories.map((category) => (
                    <option key={category}>{category}</option>
                  ))}
                </select>
              </label>
            </div>

            {canAccess ? (
              <>
                <div className="trend-grid">
                  {filteredTrendProducts.map((product) => (
                    <article className="trend-card" key={product.title}>
                      <div className="trend-card-top">
                        <span>{product.productType}</span>
                        <strong>{product.score}</strong>
                      </div>
                      <div className="trend-tags">
                        <span>{getTrendStatus(product)}</span>
                        <span>{product.category}</span>
                      </div>
                      <h3>{product.title}</h3>
                      <p>{product.promise || product.angle}</p>
                      <div className="signal-row">
                        <small>Ticket sugerido</small>
                        <b>{product.price}</b>
                      </div>
                      <div className="signal-row">
                        <small>Canal</small>
                        <b>{product.channel || "Organico + trafego pago"}</b>
                      </div>
                      <div className="trend-meter" aria-label={`Pontuacao ${product.score} de 100`}>
                        <span style={{ width: `${product.score}%` }} />
                      </div>
                      <ul className="signal-list">
                        <li>{product.salesAngle || product.angle}</li>
                        <li>{product.pageType || "Landing curta com promessa clara"}</li>
                        <li>{product.strategicInsight || product.trendSignal}</li>
                      </ul>
                      <div className="button-pair compact">
                        <button className="secondary" onClick={() => setSelectedTrendProduct(product)}>
                          Ver plano
                        </button>
                        <button className="primary" onClick={() => applyTrendProduct(product)}>
                          Usar no gerador
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
                {selectedTrendProduct && (
	              <div className="opportunity-drawer" role="dialog" aria-modal="true" aria-label="Plano da oportunidade">
	                <div className="drawer-panel">
	                  <div className="drawer-heading">
	                    <div>
	                      <p className="eyebrow">{getTrendStatus(selectedTrendProduct)} · {selectedTrendProduct.price}</p>
	                      <h2>{selectedTrendProduct.title}</h2>
	                    </div>
	                    <button className="ghost icon-button" onClick={() => setSelectedTrendProduct(null)} aria-label="Fechar">
	                      ×
	                    </button>
	                  </div>
	                  <div className="brief-grid">
	                    <div>
	                      <span>Promessa</span>
	                      <p>{selectedTrendProduct.promise || selectedTrendProduct.angle}</p>
	                    </div>
	                    <div>
	                      <span>Publico-alvo</span>
	                      <p>{selectedTrendProduct.audience}</p>
	                    </div>
	                    <div>
	                      <span>Angulo de venda</span>
	                      <p>{selectedTrendProduct.salesAngle || selectedTrendProduct.angle}</p>
	                    </div>
	                    <div>
	                      <span>Canal recomendado</span>
	                      <p>{selectedTrendProduct.channel || "Organico + trafego pago"}</p>
	                    </div>
	                    <div>
	                      <span>Formatos de criativo</span>
	                      <p>{(selectedTrendProduct.creativeFormats || [selectedTrendProduct.adSignal]).join(", ")}</p>
	                    </div>
	                    <div>
	                      <span>Pagina sugerida</span>
	                      <p>{selectedTrendProduct.pageType || "Landing curta com prova e checkout"}</p>
	                    </div>
	                  </div>
	                  <div className="insight-box">
	                    <span>Insight estrategico</span>
	                    <p>{selectedTrendProduct.strategicInsight || selectedTrendProduct.trendSignal}</p>
	                  </div>
	                  <div className="tag-row">
	                    {(selectedTrendProduct.tags || ["oportunidade", selectedTrendProduct.category]).map((tag) => (
	                      <span key={tag}>{tag}</span>
	                    ))}
	                  </div>
	                  <div className="button-pair">
	                    <button className="primary" onClick={() => applyTrendProduct(selectedTrendProduct)}>
	                      Aplicar no gerador
	                    </button>
	                    <button className="secondary" onClick={() => setSelectedTrendProduct(null)}>
	                      Fechar
	                    </button>
	                  </div>
	                </div>
	              </div>
	            )}
              </>
            ) : (
              <div className="trend-locked-state" aria-live="polite">
                <div className="trend-lock-copy">
                  <p className="eyebrow">Acesso em analise</p>
                  <h3>Radar liberado apos confirmacao</h3>
                  <p>Os nichos em alta e planos de oportunidade ficam disponiveis assim que o pagamento for aprovado.</p>
                </div>
                <div className="trend-lock-grid" aria-hidden="true">
                  {lockedTrendCards.map((item) => (
                    <article className="trend-card trend-card-placeholder" key={item}>
                      <div className="placeholder-row">
                        <span className="placeholder-pill" />
                        <span className="placeholder-score" />
                      </div>
                      <span className="placeholder-line short" />
                      <span className="placeholder-line title" />
                      <span className="placeholder-line" />
                      <span className="placeholder-line medium" />
                      <div className="trend-meter placeholder-meter">
                        <span />
                      </div>
                      <span className="placeholder-button" />
                    </article>
                  ))}
                </div>
              </div>
            )}
	          </section>

          <section className={`panel generator-panel view-panel ${activeView === "gerador" ? "" : "is-hidden"}`} id="gerador">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Passo 1</p>
                <h2>Escolha o nicho e gere a entrega</h2>
              </div>
              <div className="button-pair">
                <button className="primary" onClick={generateProductWithAi} disabled={activeGeneration !== null}>
                  {activeGeneration === "product" ? "Criando..." : "Criar produto completo"}
                </button>
                <button className="secondary" onClick={generateProduct} disabled={activeGeneration !== null}>
                  Criar rascunho
                </button>
              </div>
            </div>

            <div className="form-grid">
              <label>
                Nicho
                <input
                  value={niche}
                  onChange={(event) => {
                    setNiche(event.target.value);
                    setProductBrief("");
                  }}
                  placeholder="Ex: bolo de pote"
                />
              </label>
              <label>
                Publico
                <input
                  value={audience}
                  onChange={(event) => {
                    setAudience(event.target.value);
                    setProductBrief("");
                  }}
                  placeholder="Ex: maes que querem renda extra"
                />
              </label>
              <label>
                Tipo de produto
                <select value={productType} onChange={(event) => setProductType(event.target.value)}>
                  {productTypes.map((type) => (
                    <option key={type}>{type}</option>
                  ))}
                </select>
              </label>
              <label>
                Tom da copy
                <select value={tone} onChange={(event) => setTone(event.target.value)}>
                  {toneOptions.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              </label>
            </div>
            <label className="wide-field">
              Informacoes para melhorar o produto
              <textarea
                value={studentProductInfo}
                onChange={(event) => setStudentProductInfo(event.target.value)}
                placeholder="Ex: quero uma entrega simples para iniciantes, incluir exemplos praticos, evitar linguagem tecnica, criar bonus de cardapio semanal..."
                rows={4}
              />
            </label>
            <p className="generation-note">{generationSource}</p>
            {productBrief && (
              <div className="brief-applied">
                <strong>Briefing do radar aplicado</strong>
                <span>O pacote sera criado usando promessa, publico, angulo, canal e formato de pagina desta oportunidade.</span>
              </div>
            )}
            {currentProjectId && lastPackageName && (
              <div className="package-ready">
                <div>
                  <strong>Pacote pronto</strong>
                  <span>{lastPackageName}</span>
                </div>
                <button className="secondary" onClick={downloadProject}>
                  Baixar novamente
                </button>
              </div>
            )}
          </section>

          {result && (
            <>
              <section className={`panel output-panel view-panel ${activeView === "produto" ? "" : "is-hidden"}`} id="produto">
                <div className="panel-heading">
                  <div>
                    <p className="eyebrow">Passo 2</p>
                    <h2>{result.title}</h2>
                  </div>
                  <button className="secondary" onClick={saveProject}>
                    Salvar
                  </button>
                </div>
                <p className="lead small">{result.subtitle}</p>
                <div className="cover-preview">
                  <span>Produto digital</span>
                  <strong>{result.title}</strong>
                  <p>{result.promise}</p>
                </div>
                <div className="two-column">
                  <div>
                    <h3>Modulos sugeridos</h3>
                    <ol>
                      {result.modules.map((module) => (
                        <li key={module}>{module}</li>
                      ))}
                    </ol>
                  </div>
                  <div>
                    <h3>Estrutura da entrega</h3>
                    <ul>
                      {result.productBlueprint.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                </div>
                <div className="content-blocks">
                  <h3>Conteudo completo da entrega</h3>
                  {result.productContent.map((block, index) => (
                    <article className="content-block" key={`${block.title}-${index}`}>
                      <span>{String(index + 1).padStart(2, "0")}</span>
                      <div>
                        <h4>{block.title}</h4>
                        <p>{block.body}</p>
                        <strong>{block.task}</strong>
                      </div>
                    </article>
                  ))}
                </div>
              </section>

              <section className={`panel output-panel view-panel ${activeView === "copy" ? "" : "is-hidden"}`} id="copy">
                <div className="panel-heading">
                  <div>
                    <p className="eyebrow">Passo 3</p>
                    <h2>Agente de Copy</h2>
                  </div>
                  <div className="button-pair">
                    <button className="primary" onClick={generateCopyWithAi} disabled={activeGeneration !== null}>
                      {activeGeneration === "copy" ? "Criando..." : "Gerar variações"}
                    </button>
                    <button
                      className="secondary"
                      onClick={() =>
                        copyText(
                      "Copy copiada",
                      copyMode === "video"
                            ? formatVideoCreatives(buildVideoCreatives(result, copyBrief))
                            : formatAdCopies(buildAdCopies(result, copyBrief)),
                        )
                      }
                    >
                      Copiar
                    </button>
                  </div>
                </div>
                <div className="copy-tabs" role="group" aria-label="Tipo de copy">
                  <button className={copyMode === "video" ? "active" : ""} onClick={() => setCopyMode("video")} type="button">
                    Criativos em video
                  </button>
                  <button className={copyMode === "ad" ? "active" : ""} onClick={() => setCopyMode("ad")} type="button">
                    Anuncios
                  </button>
                </div>
                <div className="copy-source-grid">
                  <label>
                    Produto para gerar copy
                    <select
                      value={currentProjectId}
                      onChange={(event) => selectSavedProject(event.target.value, "copy")}
                    >
                      <option value="">Selecione um produto salvo</option>
                      {recentSavedProjects.map((project) => (
                        <option key={project.id} value={project.id}>
                          {project.title}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Pedido especifico
                    <textarea
                      value={copyBrief}
                      onChange={(event) => setCopyBrief(event.target.value)}
                      placeholder="Ex: quero copy mais direta, foco em dor financeira, tom popular, CTA para WhatsApp..."
                      rows={3}
                    />
                  </label>
                </div>

                {copyMode === "video" ? (
                  <div className="copy-list">
                    {buildVideoCreatives(result, copyBrief).map((creative, index) => (
                      <article className="copy-card rich-copy-card" key={`${creative.angle}-${index}`}>
                        <div className="copy-card-heading">
                          <span>Criativo {String(index + 1).padStart(2, "0")}</span>
                          <strong>{creative.angle}</strong>
                        </div>
                        <span>Gancho</span>
                        <p>{creative.hook}</p>
                        <span>Contexto</span>
                        <p>{creative.context}</p>
                        <span>Desenvolvimento</span>
                        <p>{creative.development}</p>
                        <span>CTA</span>
                        <p>{creative.cta}</p>
                        <span>Texto na tela</span>
                        <p>{creative.screenText}</p>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="copy-list">
                    {buildAdCopies(result, copyBrief).map((ad, index) => (
                      <article className="copy-card rich-copy-card" key={`${ad.angle}-${index}`}>
                        <div className="copy-card-heading">
                          <span>Anuncio {String(index + 1).padStart(2, "0")}</span>
                          <strong>{ad.angle}</strong>
                        </div>
                        <span>Texto principal</span>
                        <p className="multiline-copy">{ad.primaryText}</p>
                        <span>Titulo</span>
                        <h3>{ad.headline}</h3>
                        <span>Descricao</span>
                        <p>{ad.description}</p>
                      </article>
                    ))}
                  </div>
                )}
              </section>

              <section className={`panel output-panel view-panel ${activeView === "arquivos" ? "" : "is-hidden"}`} id="arquivos">
                <div className="panel-heading">
                  <div>
                    <p className="eyebrow">Downloads e histórico</p>
                    <h2>Meus arquivos</h2>
                  </div>
                </div>
                <div className="usage-grid">
                  <div className="integration-card">
                    <strong>{usage.productsUsed}/{usage.productsLimit}</strong>
                    <p>Produtos criados neste mes.</p>
                  </div>
                  <div className="integration-card">
                    <strong>{currentProjectId ? usage.copyUsage[currentProjectId] || 0 : 0}/{usage.copyEditsPerProductLimit}</strong>
                    <p>Alteracoes usadas neste produto.</p>
                  </div>
                  <div className="integration-card">
                    <strong>30 dias</strong>
                    <p>Pacotes ZIP ficam disponíveis para download por 30 dias após a criação.</p>
                  </div>
                </div>
                <div className="archive-box">
                  <div>
                    <span>Pacote mais recente</span>
                    <strong>{lastPackageName || "Nenhum pacote baixado nesta sessão"}</strong>
                    <p>Em produção, este arquivo ficará arquivado por 30 dias e será removido automaticamente após o prazo.</p>
                  </div>
                  <button className="secondary" onClick={downloadProject} disabled={!result}>
                    Baixar pacote atual
                  </button>
                </div>
              </section>
            </>
          )}
        </div>

        <section className={`bottom-row view-panel ${activeView === "arquivos" ? "" : "is-hidden"}`}>
          <div className="panel saved-panel">
            <h2>Projetos recentes</h2>
            {savedProjects.length === 0 ? (
              <p>Nenhum projeto salvo ainda.</p>
            ) : (
              savedProjects.map((project) => (
                <button
                  key={project.id}
                  onClick={() => selectSavedProject(project.id, "produto")}
                >
                  {project.title}
                </button>
              ))
            )}
          </div>
          <div className="panel prompt-panel">
            <h2>Prompts de alta conversao</h2>
            <div>
              {result?.prompts.map((prompt) => (
                <button key={prompt} onClick={() => copyText("Prompt copiado", prompt)}>
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        </section>

        <div className={`toast ${copiedLabel ? "show" : ""} ${activeGeneration ? "working" : ""}`} aria-live="polite">
          <span>{copiedLabel}</span>
          {activeGeneration && (
            <div className="toast-progress" aria-hidden="true">
              <span />
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
