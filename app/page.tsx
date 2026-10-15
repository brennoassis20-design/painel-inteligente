"use client";

import { CSSProperties, FormEvent, useEffect, useId, useMemo, useState } from "react";
import { Icon, IconName } from "./icons";
import { ImageCreatives } from "./tools/ImageCreatives";
import type { CreativeCopy } from "./tools/creative-render";
import { LaunchChecklist } from "./tools/LaunchChecklist";
import { MentorChat } from "./tools/MentorChat";
import { ProductMockup } from "./tools/ProductMockup";
import { ProfitCalculator } from "./tools/ProfitCalculator";
import { googleFontCss, renderProductDocument, resolveDocumentStyle, type DocumentBlock } from "@/lib/product-document";

type AccessStatus = "active" | "pending" | "refunded" | "expired" | "blocked";
type ActiveView = "inicio" | "radar" | "gerador" | "produto" | "criativos" | "copy" | "arquivos" | "calculadora" | "lancamento" | "mockup" | "mentor";

// Os campos opcionais (pontos, dica, tabela, fichas...) alimentam o PDF premium.
type ProductContentBlock = DocumentBlock;

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
  format?: string;
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

const menuGroups: { title?: string; items: { id: ActiveView; label: string; icon: IconName }[] }[] = [
  { items: [{ id: "inicio", label: "Início", icon: "home" }] },
  {
    title: "Criar",
    items: [
      { id: "gerador", label: "Fazer o pedido", icon: "spark" },
      { id: "radar", label: "Nichos em alta", icon: "trend" },
      { id: "criativos", label: "Criativos prontos", icon: "image" },
      { id: "copy", label: "Copy de vendas", icon: "chat" },
    ],
  },
  {
    title: "Meus projetos",
    items: [
      { id: "produto", label: "Produto criado", icon: "doc" },
      { id: "arquivos", label: "Meus arquivos", icon: "folder" },
    ],
  },
  {
    title: "Vender",
    items: [
      { id: "mockup", label: "Mockup 3D", icon: "cube" },
      { id: "calculadora", label: "Calculadora de lucro", icon: "calc" },
      { id: "lancamento", label: "Checklist de lançamento", icon: "rocket" },
    ],
  },
];

const viewLabels: Record<ActiveView, string> = {
  inicio: "Início",
  gerador: "Fazer o pedido",
  radar: "Nichos em alta",
  criativos: "Criativos prontos",
  copy: "Copy de vendas",
  produto: "Produto criado",
  arquivos: "Meus arquivos",
  mockup: "Mockup 3D",
  calculadora: "Calculadora de lucro",
  lancamento: "Checklist de lançamento",
  mentor: "Mentor",
};

const homeTools: { id: ActiveView; label: string; text: string; icon: IconName; color: string }[] = [
  { id: "mockup", label: "Mockup 3D", text: "Capa em livro, tablet e celular", icon: "cube", color: "var(--pi-violet)" },
  { id: "calculadora", label: "Calculadora de lucro", text: "Preço, custo por venda e meta", icon: "calc", color: "var(--pi-green)" },
  { id: "lancamento", label: "Checklist de lançamento", text: "Do produto ao primeiro anúncio", icon: "rocket", color: "var(--pi-pink)" },
  { id: "mentor", label: "Mentor", text: "Tire dúvidas na hora", icon: "bot", color: "var(--pi-cyan)" },
];

// Link da area de membros (Cakto Members V3) aberto pelo botao "Ir para as aulas".
const lessonsUrl = process.env.NEXT_PUBLIC_LESSONS_URL || "https://aluno.cakto.com.br/app/courses";

const trailKey = "painel-inteligente-trilha";

// Acentuacao apenas na exibicao: os valores enviados para a API continuam iguais.
const displayWords: Record<string, string> = {
  pratico: "prático",
  Pratico: "Prático",
  acao: "ação",
  Acao: "Ação",
  Tendencia: "Tendência",
  tendencia: "tendência",
  Organico: "Orgânico",
  organico: "orgânico",
  trafego: "tráfego",
  Alimentacao: "Alimentação",
  alimentacao: "alimentação",
  Educacao: "Educação",
  Organizacao: "Organização",
  organizacao: "organização",
  Saude: "Saúde",
  saude: "saúde",
  Servicos: "Serviços",
  Decoracao: "Decoração",
  Familia: "Família",
  publico: "público",
};

function displayText(value: string) {
  return value.replace(/[A-Za-z]+/g, (word) => displayWords[word] || word);
}

const productTypeIcons: Record<string, IconName> = {
  "Guia pratico": "doc",
  "Protocolo passo a passo": "steps",
  "Plano de 7 dias": "calendar",
  "Mapa de acao": "map",
  "Checklist premium": "list",
};

const productTypeHints: Record<string, string> = {
  "Guia pratico": "Capítulos, exemplos e dicas",
  "Protocolo passo a passo": "Etapas em sequência",
  "Plano de 7 dias": "Um roteiro por dia",
  "Mapa de acao": "Visão geral e prioridades",
  "Checklist premium": "Listas para marcar",
};

const packageItems: { label: string; icon: IconName }[] = [
  { label: "Produto pronto em PDF (10+ páginas)", icon: "doc" },
  { label: "Versão editável do produto", icon: "code" },
  { label: "Página de vendas em HTML", icon: "page" },
  { label: "Copy da página e prompts", icon: "chat" },
  { label: "Revisão e direção visual", icon: "check" },
];

const generationSteps: Record<"product" | "copy", string[]> = {
  product: [
    "Analisando o nicho e o público",
    "Estruturando os capítulos",
    "Escrevendo o conteúdo do produto",
    "Diagramando o PDF",
    "Montando a página de vendas",
    "Criando a copy e os prompts",
    "Revisando e empacotando o ZIP",
  ],
  copy: [
    "Lendo o produto selecionado",
    "Definindo ângulos de venda",
    "Escrevendo ganchos e roteiros",
    "Ajustando os anúncios",
  ],
};

function GenerationOverlay({ kind }: { kind: "product" | "copy" }) {
  const [elapsed, setElapsed] = useState(0);
  const steps = generationSteps[kind];
  // Tempo de referencia para a barra; o fim real chega quando a API responde.
  const expected = kind === "product" ? 75 : 25;

  useEffect(() => {
    const startedAt = Date.now();
    const timer = window.setInterval(() => setElapsed((Date.now() - startedAt) / 1000), 250);
    return () => window.clearInterval(timer);
  }, []);

  const progress = Math.min(96, Math.round(100 * (1 - Math.exp(-elapsed / (expected / 2.2)))));
  const current = Math.min(steps.length - 1, Math.floor((progress / 100) * steps.length));

  return (
    <div className="pi-gen" role="status" aria-live="polite">
      <div className="pi-gen-card">
        <div className="pi-gen-lamp">
          <span className="pi-gen-ring" />
          <span className="pi-gen-ring r2" />
          <LampMark />
          <i className="pi-spark s1" />
          <i className="pi-spark s2" />
          <i className="pi-spark s3" />
        </div>
        <p className="pi-kicker">{kind === "product" ? "Pedido em andamento" : "Copy em andamento"}</p>
        <h2>{kind === "product" ? "Seu produto está sendo criado" : "Sua copy está sendo escrita"}</h2>
        <div className="pi-gen-bar">
          <i style={{ width: `${progress}%` }} />
        </div>
        <p className="pi-gen-pct">{progress}%</p>
        <ul className="pi-gen-steps">
          {steps.map((step, index) => (
            <li key={step} className={index < current ? "done" : index === current ? "now" : ""}>
              <span>{index < current ? <Icon name="check" /> : null}</span>
              {step}
            </li>
          ))}
        </ul>
        <p className="pi-gen-note">
          {kind === "product" ? "Mantenha esta aba aberta. O pacote ZIP baixa sozinho ao final." : "Mantenha esta aba aberta. A copy aparece aqui ao final."}
        </p>
      </div>
    </div>
  );
}

function LampMark() {
  const gradientId = useId();

  return (
    <svg viewBox="0 0 120 80" aria-hidden="true" className="pi-lamp">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#9fe9ff" />
          <stop offset=".55" stopColor="#b79bff" />
          <stop offset="1" stopColor="#ff7ad9" />
        </linearGradient>
      </defs>
      <g fill="none" stroke={`url(#${gradientId})`} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M24 38c0-6 14-10 34-10s30 3 36 8l18-2-14 10c-4 8-14 14-36 14S24 52 24 38z" />
        <path d="M24 40c-12-2-16 4-14 9 2 5 8 6 14 4" />
        <path d="M48 28c0-6 5-11 10-11s10 5 10 11" />
        <circle cx="58" cy="13" r="3" />
        <path d="M48 58l-4 12h30l-4-12" />
      </g>
    </svg>
  );
}

function readTrail(): Record<string, boolean> {
  try {
    return JSON.parse(window.localStorage.getItem(trailKey) || "{}");
  } catch {
    return {};
  }
}

function saveTrail(trail: Record<string, boolean>) {
  try {
    window.localStorage.setItem(trailKey, JSON.stringify(trail));
  } catch {
    // Sem armazenamento local: a trilha segue pelos dados da conta.
  }
}

function formatRelativeDate(value?: string) {
  if (!value) return "";
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return "";
  const days = Math.floor((Date.now() - time) / 86400000);
  if (days <= 0) return "hoje";
  if (days === 1) return "ontem";
  return `há ${days} dias`;
}

const sessionKey = "painel-inteligente-session";

const trendProducts: TrendProduct[] = [
  {
    title: "Marmita fit para vender na semana",
    niche: "marmita fit",
    audience: "pessoas que querem vender comida saudável",
    productType: "Plano de 7 dias",
    category: "Alimentação",
    price: "R$47 a R$97",
    score: 94,
    status: "Validado",
    promise: "Montar cardápio, precificar e vender as primeiras marmitas em uma semana.",
    salesAngle: "Comida saudável virou renda extra: comece com uma rotina simples e sem cozinha profissional.",
    channel: "Orgânico + tráfego pago",
    creativeFormats: ["Tutorial curto", "Rotina da semana", "Antes e depois da organização"],
    pageType: "Landing curta com prova de cardápio e calculadora de lucro",
    strategicInsight: "Produto visual, fácil de demonstrar e com dor recorrente de renda extra + saúde.",
    tags: ["fácil produção", "visual", "baixo ticket"],
    adSignal: "Muitos criativos com antes/depois, rotina e preparo rápido",
    searchSignal: "Buscas fortes por cardápio, congelamento e precificação",
    trendSignal: "Alta demanda por renda extra e comida saudável",
    angle: "Ensinar uma rotina simples para montar cardápio, calcular lucro e vender as primeiras marmitas.",
  },
  {
    title: "Lista de fornecedores para começar uma loja",
    niche: "lista de fornecedores",
    audience: "pessoas que querem revender produtos com baixo investimento",
    productType: "Checklist premium",
    category: "Renda extra",
    price: "R$27 a R$97",
    score: 91,
    status: "Validado",
    promise: "Encontrar fornecedores confiáveis e iniciar uma revenda com baixo investimento.",
    salesAngle: "Pare de comprar caro: use uma lista organizada para achar margem antes do primeiro pedido.",
    channel: "Tráfego pago + orgânico",
    creativeFormats: ["Dor → solução", "Prova de catálogo", "Lista por segmento"],
    pageType: "Landing direta com promessa, bônus e checkout",
    strategicInsight: "A promessa de curadoria economiza tempo e reduz medo de comprar de fornecedor errado.",
    tags: ["renda extra", "fácil produção", "alta demanda"],
    adSignal: "Anúncios com promessa direta, prova de catálogo e bônus",
    searchSignal: "Buscas constantes por fornecedores confiáveis e atacado",
    trendSignal: "Procura alta por renda extra com estoque pequeno",
    angle: "Entregar uma curadoria organizada por segmento, margem e primeiro pedido recomendado.",
  },
  {
    title: "Bolo de pote lucrativo",
    niche: "bolo de pote",
    audience: "mães e iniciantes que querem renda extra na cozinha",
    productType: "Guia pratico",
    category: "Alimentação",
    price: "R$37 a R$97",
    score: 88,
    status: "Validado",
    promise: "Criar receitas, ficha técnica e roteiro de venda para lucrar com bolo de pote.",
    salesAngle: "Transforme uma receita simples em produto de bairro com preço, embalagem e abordagem certa.",
    channel: "Orgânico + tráfego pago",
    creativeFormats: ["Receita rápida", "Lucro por unidade", "Bastidores da produção"],
    pageType: "Página visual com fotos, margem e passo a passo",
    strategicInsight: "Produto muito demonstrável em vídeo curto, bom para criativos simples e prova local.",
    tags: ["culinária", "visual", "renda extra"],
    adSignal: "Criativos com receita, lucro por unidade e venda no bairro",
    searchSignal: "Buscas por recheios, validade, embalagem e preço",
    trendSignal: "Produto visual, simples e fácil de demonstrar em vídeo curto",
    angle: "Mostrar receitas campeãs, ficha técnica, embalagem e roteiro para vender os primeiros potes.",
  },
  {
    title: "Alongamento em casa para destravar o corpo",
    niche: "alongamento em casa",
    audience: "pessoas com dores leves e rotina sedentária",
    productType: "Protocolo passo a passo",
    category: "Saúde",
    price: "R$47 a R$97",
    score: 84,
    status: "Promissor",
    promise: "Seguir uma rotina curta de alongamento para reduzir travas e melhorar mobilidade.",
    salesAngle: "Seu corpo não precisa de academia para destravar: precisa de 10 minutos bem guiados.",
    channel: "Orgânico + tráfego pago",
    creativeFormats: ["Demonstração curta", "Dor específica", "Rotina diária"],
    pageType: "Landing educativa com protocolo e checklist",
    strategicInsight: "Funciona melhor com avisos de segurança e foco em bem-estar, sem promessa médica.",
    tags: ["bem estar", "rotina", "demonstrável"],
    adSignal: "Anúncios com demonstração rápida, dor específica e rotina curta",
    searchSignal: "Buscas por lombar, postura, pescoço e flexibilidade",
    trendSignal: "Conteúdo recorrente em vídeos curtos de bem-estar",
    angle: "Criar um protocolo diário com sequências curtas e acompanhamento de evolução.",
  },
  {
    title: "Organização financeira em 30 minutos",
    niche: "organização financeira pessoal",
    audience: "pessoas endividadas que precisam de um plano simples",
    productType: "Mapa de acao",
    category: "Finanças",
    price: "R$29 a R$97",
    score: 82,
    status: "Validado",
    promise: "Entender para onde o dinheiro vai e montar um plano simples em 30 minutos.",
    salesAngle: "Você ganha dinheiro, mas o mês nunca fecha? Organize tudo em um mapa simples.",
    channel: "Orgânico + tráfego pago",
    creativeFormats: ["Tutorial curto", "Dor → solução", "Planilha na tela"],
    pageType: "Landing curta com prova social e exemplo visual",
    strategicInsight: "Dor permanente com picos em janeiro, início de mês e períodos de dívida alta.",
    tags: ["fácil produção", "dor forte", "planilha"],
    adSignal: "Criativos com planilha, dívidas e alívio financeiro",
    searchSignal: "Buscas por controle de gastos, dívidas e planejamento",
    trendSignal: "Dor permanente com boa aceitação para produto simples",
    angle: "Entregar um passo a passo para mapear gastos, cortar excessos e montar o primeiro plano.",
  },
  {
    title: "Skincare simples para pele oleosa",
    niche: "skincare pele oleosa",
    audience: "mulheres que querem rotina barata e fácil",
    productType: "Checklist premium",
    category: "Beleza",
    price: "R$27 a R$67",
    score: 79,
    status: "Promissor",
    promise: "Montar uma rotina simples para pele oleosa usando poucos produtos acessíveis.",
    salesAngle: "Pare de comprar 20 produtos: use uma rotina enxuta para controlar oleosidade.",
    channel: "Orgânico + tráfego pago",
    creativeFormats: ["Erros comuns", "Rotina manhã/noite", "Produtos acessíveis"],
    pageType: "Página visual com rotina, checklist e lista de compra",
    strategicInsight: "Precisa evitar promessa dermatológica pesada; vender como rotina educativa e prática.",
    tags: ["beleza", "review", "checklist"],
    adSignal: "Anúncios com rotina, erros comuns e produtos acessíveis",
    searchSignal: "Buscas por oleosidade, acne, manchas e protetor",
    trendSignal: "Assunto forte em criativos de beleza e reviews",
    angle: "Organizar uma rotina simples por manhã/noite, com erros para evitar e lista de compra.",
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
    `Tipo de página sugerida: ${product.pageType || "Landing curta com promessa clara, prova e checkout"}`,
    `Insight estratégico: ${product.strategicInsight || product.trendSignal}`,
  ].join("\n");
}

function buildProduct(niche: string, productType: string, audience: string, tone: string): ProductResult {
  const cleanNiche = niche.trim() || "marmita fit";
  const cleanAudience = audience.trim() || "pessoas que querem vender comida saudável";
  const cleanType = productType || productTypes[0];
  const cleanTone = tone || toneOptions[0];
  const title = `${displayText(cleanType)}: ${capitalize(cleanNiche)}`;

  return {
    title,
    subtitle: `Um produto digital completo para ajudar ${cleanAudience} a sair do zero em ${cleanNiche}.`,
    promise: `Criar uma transformação clara em ${cleanNiche}, com uma entrega simples de consumir, fácil de vender e pronta para virar oferta.`,
    modules: [
      `Diagnóstico rápido: onde ${cleanAudience} estão travados hoje`,
      `O plano principal aplicado em ${cleanNiche}`,
      "Plano de execução sem equipe, sem aparecer e sem conhecimento técnico",
      "Rotina de ativação: produto, página, anúncio e primeira venda",
      "Erros que fazem o iniciante desistir antes de vender",
    ],
    productBlueprint: [
      "Capa com promessa direta e nome da transformação",
      "Página de boas-vindas com história curta e promessa do produto",
      "Mapa visual dos passos: escolher nicho, montar produto, publicar oferta",
      "Conteúdo principal dividido em aulas curtas ou capítulos objetivos",
      "Checklist final para confirmar que a entrega está pronta para vender",
    ],
    productContent: [
      {
        title: "Boas-vindas e promessa",
        body: `Este produto mostra para ${cleanAudience} como aplicar ${cleanNiche} de forma simples, com passos curtos, sem excesso de teoria e com foco no primeiro resultado prático.`,
        task: "Defina o objetivo principal da entrega e marque o primeiro passo que será executado hoje.",
      },
      {
        title: "Diagnóstico rápido",
        body: "Antes de executar, identifique onde esta o principal bloqueio: falta de clareza, falta de rotina, oferta confusa ou dificuldade para transformar conhecimento em ação.",
        task: "Preencha o diagnóstico com 3 problemas atuais, 3 recursos disponíveis e 1 meta para os próximos 7 dias.",
      },
      {
        title: "Plano principal",
        body: `A entrega central deve conduzir uma sequência objetiva: preparar, organizar, executar, revisar e vender a transformação criada com ${cleanNiche}.`,
        task: "Siga o checklist do módulo e conclua uma versão simples do produto antes de tentar melhorar os detalhes.",
      },
      {
        title: "Ativação da oferta",
        body: "Com a entrega pronta, o próximo passo é montar uma promessa clara, uma página simples e uma chamada direta para levar o comprador até a decisão.",
        task: "Use a copy criada no painel para publicar a primeira versão da página de venda.",
      },
    ],
    copyBlocks: {
      hook: `Para tudo que você esta fazendo: nos próximos minutos eu vou te mostrar como transformar ${cleanNiche} em um produto digital vendável, mesmo que você esteja comecando agora.`,
      headline: `Crie seu primeiro produto sobre ${cleanNiche} sem escrever tudo do zero`,
      bullets: [
        `Ideal para ${cleanAudience} que querem uma entrega simples e rápida`,
        "Estrutura pronta para produto, texto de vendas e página",
        "Não precisa aparecer, falar ingles ou contratar equipe",
        "Pensado para vender no automático depois da configuração inicial",
      ],
      cta: "Quero criar meu produto agora",
    },
    salesPage: {
      headline: `Transforme ${cleanNiche} em uma oferta simples, clara e pronta para vender`,
      subheadline: `Um caminho guiado para ${cleanAudience} criarem uma entrega objetiva, uma mensagem persuasiva e uma página de venda sem complicar.`,
      sections: [
        {
          title: "Para quem e",
          body: `Criado para ${cleanAudience} que querem sair da ideia solta e montar uma entrega vendável em ${cleanNiche}.`,
        },
        {
          title: "O problema",
          body: "A maioria das pessoas demora porque tenta criar algo grande demais, sem promessa clara e sem uma sequência simples de execução.",
        },
        {
          title: "A solução",
          body: `O ${cleanType.toLowerCase()} organiza a transformação em passos curtos, com estrutura, exemplos e ações práticas para aplicar imediatamente.`,
        },
        {
          title: "O que recebe",
          body: "Estrutura da entrega, roteiro de aplicação, checklist final, copy de vendas e direção para montar a página.",
        },
      ],
      cta: "Quero acessar agora",
    },
    landingSections: [
      `Hero: ${title} + promessa de resultado sem complexidade`,
      "Prova: mostrar print, número ou exemplo de transformação possível",
      "Dor: explicar por que afiliado, dropshipping e tentativa aleatória travam o iniciante",
      "Mecanismo: apresentar a solução como a forma mais simples de chegar no resultado",
      "Oferta: produto, suporte, agente de copy e prompts de alta conversão",
      "Garantia: 90 dias com condição clara de aplicação",
      "CTA final: vagas limitadas e chamada para agir hoje",
    ],
    prompts: [
      `Crie a estrutura de um produto digital chamado "${title}" para ${cleanAudience}, com tom ${cleanTone} e sem usar nomes genéricos para a entrega.`,
      `Escreva uma página de vendas para "${title}" usando gancho, prova, história, mecanismo, oferta, garantia e CTA.`,
      `Transforme este produto em uma apresentação visual com capa, promessa, capítulos e checklist final.`,
      `Crie uma página de vendas para "${title}" com seção hero, prova, benefícios, garantia e botão de compra.`,
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
    `COPY DA PÁGINA DE VENDAS - ${product.title}`,
    "",
    "ROTEIROS PARA CRIATIVOS EM VÍDEO",
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
    "COPY PARA ANÚNCIOS",
    "",
    ...adCopies.flatMap((ad, index) => [
      `ANÚNCIO ${index + 1} - ${ad.angle.toUpperCase()}`,
      "TEXTO PRINCIPAL",
      ad.primaryText,
      "TÍTULO",
      ad.headline,
      "DESCRIÇÃO",
      ad.description,
      "",
    ]),
    "COPY DA PÁGINA",
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
    "ESTRUTURA DA PÁGINA",
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
    return "Quer vender, mas ainda não sabe onde comprar com preço bom e margem para lucrar?";
  }

  if (text.includes("financeir") || text.includes("dinheiro") || text.includes("orcamento")) {
    return "Você ganha dinheiro, mas sente que o mês nunca fecha e não sabe exatamente para onde ele vai?";
  }

  if (text.includes("alongamento") || text.includes("corpo") || text.includes("dor")) {
    return "Seu corpo vive travado e você sente que precisa de uma rotina simples para voltar a se movimentar melhor?";
  }

  if (text.includes("marmita") || text.includes("bolo") || text.includes("comida")) {
    return "Você quer vender comida, mas ainda fica em dúvida sobre cardápio, preço e primeiros pedidos?";
  }

  if (text.includes("noiva") || text.includes("casamento")) {
    return "Você quer organizar tudo com mais segurança, sem se perder em gastos, prazos e decisões de última hora?";
  }

  return "Você sabe que precisa resolver isso, mas ainda não encontrou um caminho simples, organizado e fácil de aplicar?";
}

function inferBuyerOutcome(product: ProductResult) {
  const title = getCleanProductTitle(product).toLowerCase();
  const firstModule = product.modules[0]?.toLowerCase();
  const secondModule = product.modules[1]?.toLowerCase();
  const path = [firstModule, secondModule].filter(Boolean).join(", ");

  if (path) {
    return `seguir um passo a passo com ${path} e transformar ${title} em um plano prático`;
  }

  return `aplicar ${title} com mais clareza e menos tentativa e erro`;
}

function withBrief(value: string, brief = "") {
  const cleanBrief = brief.trim();
  return cleanBrief ? `${value} Direção pedida: ${cleanBrief}` : value;
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
      context: `Muita gente tenta resolver no improviso, pula etapas importantes e acaba desistindo porque não tem um caminho claro para seguir.`,
      development: withBrief(
        `${title} mostra como ${outcome}. A ideia é sair da confusão e aplicar uma sequência objetiva, sem depender de teoria pesada ou informações espalhadas.`,
        brief,
      ),
      cta: `Clique em saiba mais e veja como começar com ${title.toLowerCase()} ainda hoje.`,
      screenText: `Comece com ${title}`,
    },
    {
      angle: "Resultado desejado",
      hook: `Imagine ter um plano simples para resolver ${title.toLowerCase()} sem ficar perdido no começo.`,
      context: `O que costuma travar não é falta de vontade. É não saber o que fazer primeiro, o que evitar e como transformar informação em ação prática.`,
      development: withBrief(
        `${firstBenefit}. Além disso, ${secondBenefit.toLowerCase()}. Tudo foi estruturado para facilitar a execução e ajudar a pessoa a avançar com segurança.`,
        brief,
      ),
      cta: `Clique em saiba mais para conhecer ${title} e aplicar o passo a passo.`,
      screenText: "Um plano simples para sair do improviso",
    },
    {
      angle: "Erro comum",
      hook: `O erro que faz muita gente continuar travada em ${title.toLowerCase()} e tentar resolver tudo sem método.`,
      context: `Quando a pessoa tenta juntar dicas soltas, ela perde tempo, fica insegura e quase sempre abandona antes de ver resultado.`,
      development: withBrief(
        `${title} organiza o processo em etapas claras, com orientação prática e foco no que precisa ser feito agora para sair da estagnação.`,
        brief,
      ),
      cta: `Clique em saiba mais e veja como aplicar ${title.toLowerCase()} com mais clareza.`,
      screenText: "Pare de depender de dicas soltas",
    },
  ];
}

function buildCreativeCopy(product: ProductResult, label: string): CreativeCopy {
  return {
    title: getCleanProductTitle(product),
    subtitle: product.subtitle,
    promise: product.promise,
    pain: inferBuyerPain(product),
    label,
    modules: product.modules,
    bullets: product.copyBlocks.bullets,
  };
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
        `${cleanTitle} foi criado para te guiar com uma sequência simples, direta e fácil de acompanhar.`,
        `Você vai entender como ${outcome}, sem depender de informações soltas ou tentativa e erro.`,
        `Clique em saiba mais e veja como começar hoje.${briefLine}`,
      ].join("\n"),
      headline: `${cleanTitle} passo a passo`,
      description: "Um caminho simples para começar com mais clareza.",
    },
    {
      angle: "Benefício prático",
      primaryText: [
        `Se você quer uma forma mais simples de aplicar ${cleanTitle.toLowerCase()}, este material foi feito para isso.`,
        `${firstBenefit}.`,
        `${secondBenefit}.`,
        `Acesse agora e veja como transformar uma situação confusa em um plano claro de execução.${briefLine}`,
      ].join("\n"),
      headline: "Saia do improviso",
      description: "Método prático para aplicar no seu ritmo.",
    },
    {
      angle: "Antes e depois",
      primaryText: [
        `Antes: dúvidas, excesso de informação e dificuldade para saber por onde começar.`,
        `Depois: um passo a passo claro para aplicar ${cleanTitle.toLowerCase()} com mais segurança.`,
        `${product.promise}`,
        `Clique em saiba mais e veja se este material faz sentido para o seu momento.${briefLine}`,
      ].join("\n"),
      headline: "Organize o próximo passo",
      description: "Conteúdo direto para aplicar sem complicar.",
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
        `Anúncio ${index + 1} - ${ad.angle}\n\nTexto principal:\n${ad.primaryText}\n\nTitulo:\n${ad.headline}\n\nDescricao:\n${ad.description}`,
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
    label: "Beleza prática",
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
    label: "Rotina saudável",
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
      pdfPromiseTitle: "PROMESSA E CRITÉRIOS",
      pdfIntroTitle: "Como validar a entrega",
      pdfIntroKicker: "validacao",
      pdfExecutionTitle: "Blocos de verificação",
      pdfExecutionKicker: "checklist",
      pdfPracticeTitle: "Checklist de aplicação",
      pdfPracticeKicker: "execucao",
      pdfTrackerTitle: "Controle rápido",
      pdfTrackerKicker: "progresso",
      pdfTrackerIntro: "Marque cada item concluido e registre o que ainda precisa ser ajustado antes da próxima aplicação.",
      landing: "direct",
    };
  }

  if (/mapa|guia|financeir|organizacao|orcamento|dinheiro|plano de acao|gestao/i.test(value)) {
    return {
      name: "playbook",
      label: "Playbook prático",
      pdfMapTitle: "MAPA DE DECISÃO",
      pdfPromiseTitle: "DIREÇÃO DA ENTREGA",
      pdfIntroTitle: "Ponto de partida",
      pdfIntroKicker: "diagnostico",
      pdfExecutionTitle: "Plano de ação",
      pdfExecutionKicker: "prioridades",
      pdfPracticeTitle: "Quadro de decisão",
      pdfPracticeKicker: "aplicacao",
      pdfTrackerTitle: "Plano de acompanhamento",
      pdfTrackerKicker: "revisao",
      pdfTrackerIntro: "Use o quadro para acompanhar decisões, ajustes e próximas ações. A cada ciclo, revise o que gerou mais clareza.",
      landing: "editorial",
    };
  }

  return {
    name: "protocol",
    label: "Protocolo guiado",
    pdfMapTitle: "MAPA DA ENTREGA",
    pdfPromiseTitle: "PROMESSA",
    pdfIntroTitle: "Antes de começar",
    pdfIntroKicker: "preparacao",
    pdfExecutionTitle: "Plano de execução",
    pdfExecutionKicker: "passo a passo",
    pdfPracticeTitle: "Fichas práticas",
    pdfPracticeKicker: "aplicacao",
    pdfTrackerTitle: "Plano de acompanhamento",
    pdfTrackerKicker: "acompanhamento",
    pdfTrackerIntro: "Use esta página para acompanhar consistência. Marque cada dia concluido e anote rapidamente o que mudou.",
    landing: "guided",
  };
}

function resolveVisualDirection(product: ProductResult, format = resolveProductFormat(product)): VisualDirection {
  const value = `${product.title} ${product.subtitle} ${product.promise}`.toLowerCase();

  if (format.name === "checklist") {
    return {
      label: "Catálogo premium de oportunidades",
      coverStyle: "Capa comercial forte, com sensação de anúncio, mockup do produto, chamada grande e contraste alto.",
      internalStyle: "Páginas em grade, divisórias por categoria, fichas curtas, campos de verificação e visual de diretório.",
      contentArchitecture: "Aviso inicial, recomendações de segurança, categorias, catálogo principal, critérios de escolha e controle de aplicação.",
      imagePrompt: `Capa premium para produto digital sobre ${product.title}, estilo catálogo comercial, pessoa feliz segurando caixa ou produto, fundo de deposito ou loja, contraste alto, textos grandes, cores fortes, visual de venda.`,
    };
  }

  if (format.name === "playbook" || /noiva|casamento|decoracao|beleza|organiza/i.test(value)) {
    return {
      label: "Guia editorial ilustrado",
      coverStyle: "Capa elegante com imagem central do nicho, tipografia editorial grande, respiro e atmosfera aspiracional.",
      internalStyle: "Capítulos longos, páginas com imagem de abertura, tabelas, comparativos, cronogramas e blocos de dica.",
      contentArchitecture: "Introdução narrativa, capítulos, exemplos práticos, tabelas de decisão, cronogramas e checklist final.",
      imagePrompt: `Capa editorial elegante para guia chamado ${product.title}, imagem realista ligada ao nicho, luz natural, composição premium, tipografia sofisticada, fundo limpo, visual de revista.`,
    };
  }

  return {
    label: "Manual prático guiado",
    coverStyle: "Capa objetiva de manual, promessa clara, blocos visuais fortes e sensação de acompanhamento passo a passo.",
    internalStyle: "Sequência de etapas, fichas práticas, plano de dias, páginas de registro e checklist de progresso.",
    contentArchitecture: "Preparação, passo a passo, fichas de aplicação, acompanhamento e revisão final.",
    imagePrompt: `Capa de manual prático para ${product.title}, visual limpo e moderno, pessoa aplicando a rotina, elementos de checklist e progresso, cores do nicho, composição profissional.`,
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
    `REVISÃO DA ENTREGA - ${product.title}`,
    "",
    "Status: pacote gerado com produto, copy, página de vendas, prompts e dados do projeto.",
    "",
    "Direção visual aplicada",
    `- Tema: ${theme.label}`,
    `- Formato do pacote: ${format.label}`,
    `- Direção criativa: ${visual.label}`,
    `- Cor principal: ${theme.accent}`,
    `- Fundo do produto: ${theme.bg}`,
    `- Capa: ${visual.coverStyle}`,
    `- Interno: ${visual.internalStyle}`,
    "",
    "Checklist de coerência",
    `- Promessa principal: ${product.promise}`,
    `- Headline da página: ${product.salesPage.headline}`,
    `- CTA principal: ${product.copyBlocks.cta}`,
    "- Conferir se o exemplo, a promessa e a página falam com o mesmo público.",
    "- Antes de publicar, inserir link de checkout real nos botões da página HTML.",
  ].join("\n");
}

function buildVisualDirectionText(product: ProductResult) {
  const theme = resolveProjectTheme(product);
  const format = resolveProductFormat(product);
  const visual = resolveVisualDirection(product, format);

  return [
    `DIREÇÃO VISUAL - ${product.title}`,
    "",
    `Formato: ${format.label}`,
    `Direção criativa: ${visual.label}`,
    `Tema de cor: ${theme.label}`,
    `Cor principal: ${theme.accent}`,
    "",
    "Capa",
    visual.coverStyle,
    "",
    "Páginas internas",
    visual.internalStyle,
    "",
    "Arquitetura do conteúdo",
    visual.contentArchitecture,
    "",
    "Prompt sugerido para imagem de capa",
    visual.imagePrompt,
  ].join("\n");
}

// 02-produto-editavel.html: mesmo template do PDF premium, editável no navegador.
function buildProductHtml(product: ProductResult) {
  return renderProductDocument(product, { fontCss: googleFontCss(resolveDocumentStyle(product)), target: "html" });
}

// 01-produto-pronto.pdf vem do servidor (template premium). Se a rota falhar, o ZIP usa o PDF simples.
async function fetchPremiumPdf(product: ProductResult, token: string) {
  try {
    const response = await fetch("/api/generate/pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ product }),
    });
    if (!response.ok || response.headers.get("content-type") !== "application/pdf") return null;
    const pdf = new Uint8Array(await response.arrayBuffer());
    // Só usa o PDF se ele chegou inteiro (começa com %PDF e termina com %%EOF).
    const head = new TextDecoder().decode(pdf.subarray(0, 5));
    const tail = new TextDecoder().decode(pdf.subarray(Math.max(0, pdf.length - 1024)));
    return head === "%PDF-" && tail.includes("%%EOF") ? pdf : null;
  } catch {
    return null;
  }
}

function buildSalesPageHtml(product: ProductResult) {
  const theme = resolveProjectTheme(product);
  const format = resolveProductFormat(product);
  const configComment =
    '<!-- CONFIGURAÇÃO: antes de publicar, troque todos os links href="#checkout" pelo link real do seu checkout. -->';
  const sections = product.salesPage.sections.slice(0, 6);
  const bullets = product.copyBlocks.bullets.map((bullet) => `<li>${escapeHtml(bullet)}</li>`).join("");
  const trustItems = [
    "Acesso imediato",
    "Produto digital",
    "Aplicação passo a passo",
    "Material editável",
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
      answer: "Depois da compra, você recebe o material principal e pode iniciar pela primeira etapa indicada na entrega.",
    },
    {
      question: "Preciso ter experiência?",
      answer: "Não. A estrutura foi criada para começar pelo básico, seguir uma ordem clara e aplicar uma etapa por vez.",
    },
    {
      question: "Em quanto tempo consigo aplicar?",
      answer: "A proposta e usar uma rotina simples e objetiva. O tempo exato depende do tema, mas a entrega foi pensada para execução rápida.",
    },
    {
      question: "E se eu não souber por onde começar?",
      answer: "Comece pelo diagnóstico ou preparação inicial, siga o passo a passo e marque o progresso no checklist.",
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
  <section class="light"><div class="wrap split"><div><p class="eyebrow">Diagnóstico</p><h2>Veja exatamente o que precisa sair do papel.</h2></div><div class="cards">${salesSections}</div></div></section>
  <section class="band"><div class="wrap split"><div><p class="eyebrow">Aplicação</p><h2>Uma sequência de verificação para executar com clareza.</h2><p>${escapeHtml(product.subtitle)}</p></div><div class="modules">${modules}</div></div></section>
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
  <section><div class="wrap split"><div><p class="eyebrow">Contexto</p><h2>O problema não é falta de informação. É falta de ordem.</h2></div><div class="timeline">${salesSections}</div></div></section>
  <section class="dark"><div class="wrap split"><div><p class="eyebrow">Método de aplicação</p><h2>Um caminho com decisões claras e próximas ações.</h2><p>${escapeHtml(product.subtitle)}</p></div><div class="timeline">${modules}</div></div></section>
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
        <p class="eyebrow">A solução</p>
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
        <h2>Conteúdo pronto para sair da teoria e entrar na execução.</h2>
        <p>${escapeHtml(product.subtitle)}</p>
      </div>
      <ul class="deliver-grid">${deliverables}</ul>
    </div>
  </section>

  <section class="paper">
    <div class="wrap">
      <div class="section-head">
        <p class="eyebrow">Por dentro da entrega</p>
        <h2>Veja como o material conduz a aplicação.</h2>
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
        <h2>Menos excesso, mais clareza de ação.</h2>
        <p>A entrega foi estruturada para reduzir confusão, mostrar a sequência correta e transformar a decisão em próximos passos simples.</p>
      </div>
      <div class="highlight-box">
        <ul class="check-list">
          <li>Promessa clara para saber o objetivo da aplicação.</li>
          <li>Etapas organizadas para evitar tentativa aleatória.</li>
          <li>Ações práticas para marcar progresso.</li>
          <li>Checklist para revisar e continuar evoluindo.</li>
        </ul>
      </div>
    </div>
  </section>

  <section class="paper">
    <div class="wrap">
      <div class="section-head">
        <p class="eyebrow">Dúvidas comuns</p>
        <h2>Antes de começar</h2>
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

  <div class="footer-note">Esta página e uma estrutura editável. Antes de publicar, configure o link de checkout e revise informações específicas da oferta.</div>
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
      task: "Execute a primeira ação e registre o resultado.",
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
        text("CATÁLOGO PREMIUM", 82, 682, 8, "1 1 1", "F2"),
        ...wrapPdfText(product.title.toUpperCase(), 13)
          .slice(0, 5)
          .map((line, index) => text(line, 72, 636 - index * 24, 20, accentInk, "F2")),
        rect(306, 626, 214, 40, accent),
        text("CAMPEÃO", 326, 641, 18, accentInk, "F2"),
        ...wrapPdfText(product.title.toUpperCase(), 15)
          .slice(0, 5)
          .map((line, index) => text(line, 258, 548 - index * 32, 27, "1 1 1", "F2")),
        rect(82, 248, 332, 34, accent),
        text("NÃO PERCA TEMPO PESQUISANDO", 102, 260, 13, accentInk, "F2"),
        wrappedText(product.promise, margin, 202, 13, 56, 18, "1 1 1", "F1"),
        rect(margin, 132, 16, 16, accent),
        text("Categorias, critérios e controle de aplicação", margin + 28, 135, 11, "1 1 1", "F2"),
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
        text("DIREÇÃO EDITORIAL", 88, 104, 10, "0.330 0.270 0.220", "F2"),
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
        text("Plano prático com acompanhamento", margin + 28, 173, 11, "1 1 1", "F2"),
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
      wrappedText(format.name === "checklist" ? "Use a entrega como uma sequência de marcação: validar, executar, revisar e ajustar antes de avançar." : "Siga as etapas na ordem, marque o progresso e revise a execução no fim do período recomendado.", margin + 20, 104, 11, 66, 15, ink, "F1"),
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
      text(format.name === "playbook" ? "O que orienta a decisão" : "O que você vai encontrar", margin + 24, 352, 15, dark, "F2"),
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
    currentBody.push(text("AÇÃO", margin + 128, innerY - 2, 9, dark, "F2"));
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
    currentBody.push(text("DECISÃO", margin + 14, currentY - 20, 9, "1 1 1", "F2"));
    currentBody.push(text("PRÓXIMA AÇÃO", margin + leftW + 24, currentY - 20, 9, "1 1 1", "F2"));
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
      ? "Leia os critérios, marque o que já está pronto e use os itens pendentes como ordem de execução."
      : "Prepare o ambiente, leia a promessa principal e execute a primeira versão sem tentar aperfeiçoar tudo antes de aplicar.",
    12,
    70,
  );
  addBulletList(overviewItems);
  addParagraph(
    format.name === "playbook"
      ? "Regra simples: uma boa decisão precisa deixar claro o que fazer agora, o que ignorar e quando revisar."
      : "Regra simples: se uma etapa não gerar uma ação clara, transforme-a em um passo menor antes de continuar.",
    12,
    70,
    16,
    dark,
    "F2",
  );

  if (format.name === "checklist") {
    startFlowPage("Catálogo por categorias", "diretorio");
    addParagraph("Este modelo funciona como um diretório consultivo: organize as melhores oportunidades por categoria, critério de compra, margem e primeiro teste recomendado.", 12, 70);
    addDirectoryGrid([...overviewItems, ...contentItems.map((block) => block.title), ...contentItems.map((block) => block.task)]);
  }

  if (format.name === "playbook") {
    startFlowPage("Capítulo de contexto", "guia editorial");
    currentBody.push(rect(margin, currentY - 130, width - margin * 2, 130, mid));
    currentBody.push(rect(margin + 22, currentY - 104, 160, 58, cream));
    currentBody.push(text("CENÁRIO", margin + 44, currentY - 70, 16, dark, "F2"));
    currentY -= 162;
    addParagraph("Antes de aplicar qualquer plano, e preciso entender o cenário. Este formato combina explicação, exemplos, tabelas e decisões práticas para conduzir a aplicação com mais profundidade.", 12, 70);
    addEditorialTable(
      contentItems.slice(0, 5).map((block) => ({
        left: block.title,
        right: block.task,
      })),
    );
  }

  startFlowPage(format.pdfExecutionTitle, format.pdfExecutionKicker);
  contentItems.forEach((block, index) => {
    const label = format.name === "checklist" ? `item ${index + 1}` : format.name === "playbook" ? `ação ${index + 1}` : `passo ${index + 1}`;
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
      currentBody.push(text(`DECISÃO ${index + 1}`, margin + 18, y - 14, 9, accent, "F2"));
      currentBody.push(wrappedText(block.title, margin + 18, y - 34, 10, 28, 13, ink, "F2"));
      currentBody.push(text("PRÓXIMA AÇÃO", margin + 264, y - 14, 9, dark, "F2"));
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
      currentBody.push(text("Ação prática", margin + 74, innerY, 9, accent, "F2"));
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
  currentBody.push(text("OBSERVAÇÃO RÁPIDA", margin + 170, tableTop - 19, 10, "1 1 1", "F2"));
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
    "Conclui o diagnóstico ou preparação inicial.",
    "Executei cada etapa em ordem.",
    "Marquei meu progresso no plano de acompanhamento.",
    "Revisei o resultado e defini o próximo ciclo de aplicação.",
  ].forEach((item, index) => {
    const y = currentY - index * 54;
    currentBody.push(rect(margin, y - 36, width - margin * 2, 44, index % 2 ? "0.925 0.920 0.860" : surface));
    currentBody.push(text(item, margin + 20, y - 12, 12, ink, "F1"));
    currentBody.push(strokeRect(width - margin - 30, y - 20, 18, 18, dark));
  });
  currentY -= 320;
  currentBody.push(rect(margin, currentY - 92, 318, 92, soft));
  currentBody.push(wrappedText("A evolução vem da execução simples, repetida e revisada. Comece pela primeira etapa e mantenha o registro do progresso.", margin + 20, currentY - 32, 12, 42, 16, dark, "F2"));

  const minimumPagePlans = [
    {
      title: "Plano de aplicação",
      kicker: "complemento",
      intro: "Use esta página para transformar a entrega em uma rotina simples de aplicação e revisão.",
      items: ["Defina o primeiro passo.", "Execute antes de aperfeiçoar.", "Registre o resultado.", "Revise o que precisa melhorar."],
    },
    {
      title: "Erros para evitar",
      kicker: "seguranca",
      intro: "Evite complicar a entrega. O material precisa conduzir uma ação clara, simples e verificável.",
      items: ["Pular a preparação.", "Tentar fazer tudo no mesmo dia.", "Ignorar os critérios de qualidade.", "Não registrar progresso."],
    },
    {
      title: "Próximo ciclo",
      kicker: "continuidade",
      intro: "Depois da primeira aplicação, use este quadro para repetir o processo com mais clareza.",
      items: ["O que funcionou.", "O que ficou confuso.", "O que será simplificado.", "Qual será a próxima meta."],
    },
    {
      title: "Notas finais",
      kicker: "registro",
      intro: "Anote percepções, ajustes e pequenas melhorias para manter a evolução organizada.",
      items: ["Principal aprendizado.", "Melhor ajuste.", "Próxima revisão.", "Resultado esperado."],
    },
  ];

  let minimumPageIndex = 0;
  while (pages.length < 10) {
    const plan = minimumPagePlans[minimumPageIndex % minimumPagePlans.length];
    startFlowPage(plan.title, plan.kicker);
    addParagraph(plan.intro, 12, 70);
    addBulletList(plan.items);
    currentBody.push(rect(margin, Math.max(currentY - 120, 112), width - margin * 2, 96, soft));
    currentBody.push(wrappedText("Espaco para anotações: registre aqui os pontos que precisam de ajuste antes de repetir o processo.", margin + 20, Math.max(currentY - 54, 176), 11, 62, 15, dark, "F2"));
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

async function buildProjectBundle(product: ProductResult, token: string) {
  const baseName = slugify(product.title);
  const pdf = (await fetchPremiumPdf(product, token)) || buildProductPdf(product);
  return {
    filename: `${baseName}-pacote.zip`,
    blob: buildZip([
      { name: "01-produto-pronto.pdf", data: pdf },
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
            ...block,
            title: block?.title || fallback.productContent[index]?.title || `Parte ${index + 1}`,
            body: block?.body || fallback.productContent[index]?.body || fallback.promise,
            task: block?.task || fallback.productContent[index]?.task || "Aplicar este passo antes de avançar.",
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
              title: section?.title || fallback.salesPage.sections[index]?.title || `Seção ${index + 1}`,
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
    ...(data.format ? { format: data.format } : {}),
    ...(data.intro ? { intro: data.intro } : {}),
    ...(data.closing ? { closing: data.closing } : {}),
  };

  return sanitizeProductLanguage(normalized);
}

function professionalizeText(value: string) {
  return value
    .replace(/\bChecklist final para o aluno saber exatamente quando esta pronto para vender\b/gi, "Checklist final para confirmar que a entrega está pronta para vender")
    .replace(/\bEscreva o objetivo principal do aluno\b/gi, "Defina o objetivo principal da entrega")
    .replace(/\bo aluno precisa entender\b/gi, "e preciso entender")
    .replace(/\bA entrega central deve guiar o aluno\b/gi, "A entrega central deve conduzir a execução")
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
  const [name, setName] = useState("Usuário");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [loginError, setLoginError] = useState("");
  const [sessionToken, setSessionToken] = useState(() =>
    typeof window === "undefined" ? "" : window.localStorage.getItem(sessionKey) || "",
  );
  const [accessStatus, setAccessStatus] = useState<AccessStatus>("pending");
  const [niche, setNiche] = useState("marmita fit");
  const [audience, setAudience] = useState("pessoas que querem vender comida saudável");
  const [productType, setProductType] = useState(productTypes[0]);
  const [tone, setTone] = useState(toneOptions[0]);
  const [trendSearch, setTrendSearch] = useState("");
  const [trendCategory, setTrendCategory] = useState("Todos");
  const [trendOpportunities, setTrendOpportunities] = useState<TrendProduct[]>(trendProducts);
  const [selectedTrendProduct, setSelectedTrendProduct] = useState<TrendProduct | null>(null);
  const [productBrief, setProductBrief] = useState("");
  const [studentProductInfo, setStudentProductInfo] = useState("");
  const [activeView, setActiveView] = useState<ActiveView>("inicio");
  const [menuOpen, setMenuOpen] = useState(false);
  const [quickNiche, setQuickNiche] = useState("");
  const [accessExpiresAt, setAccessExpiresAt] = useState("");
  const [trailFlags, setTrailFlags] = useState<Record<string, boolean>>(() =>
    typeof window === "undefined" ? {} : readTrail(),
  );
  const [copyMode, setCopyMode] = useState<"video" | "ad">("ad");
  const [copyBrief, setCopyBrief] = useState("");
  const [result, setResult] = useState<ProductResult | null>(() =>
    buildProduct("marmita fit", productTypes[0], "pessoas que querem vender comida saudável", toneOptions[0]),
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
  const [, setGenerationSource] = useState("Rascunho rápido");
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
        label: "Acesso ativo",
        text: `Produtos neste mês: ${usage.productsUsed}/${usage.productsLimit}. Alterações por produto: ${usage.copyEditsPerProductLimit}.`,
      };
    }

    if (accessStatus === "pending") {
      return {
        label: "Pagamento pendente",
        text: "Seu acesso será liberado assim que a compra for confirmada.",
      };
    }

    if (accessStatus === "expired") {
      return {
        label: "Acesso expirado",
        text: "O período de acesso terminou.",
      };
    }

    return {
      label: "Acesso bloqueado",
      text: "O acesso foi bloqueado por cancelamento, reembolso ou revisão.",
    };
  }, [accessStatus, usage.copyEditsPerProductLimit, usage.productsLimit, usage.productsUsed]);

  const trailSteps = useMemo(() => {
    const hasProject = savedProjects.length > 0 || usage.productsUsed > 0;
    const hasCopy = Object.values(usage.copyUsage || {}).some((count) => count > 0);

    return [
      { id: "radar", label: "Escolha um nicho em alta", hint: "Nichos em alta", view: "radar" as ActiveView, done: Boolean(trailFlags.radar) || hasProject },
      { id: "pedido", label: "Faça o pedido do produto", hint: "Fazer o pedido", view: "gerador" as ActiveView, done: hasProject },
      { id: "pacote", label: "Baixe e revise o pacote", hint: "Meus arquivos", view: "arquivos" as ActiveView, done: Boolean(trailFlags.pacote) || Boolean(lastPackageName) },
      { id: "copy", label: "Gere a copy e anuncie", hint: "Copy de vendas", view: "copy" as ActiveView, done: hasCopy },
    ];
  }, [lastPackageName, savedProjects.length, trailFlags, usage.copyUsage, usage.productsUsed]);

  const trailDone = trailSteps.filter((step) => step.done).length;
  const trailCurrent = trailSteps.findIndex((step) => !step.done);
  const firstName = name.trim().split(/\s+/)[0] || "";
  const productsLeft = Math.max(usage.productsLimit - usage.productsUsed, 0);
  const expiresLabel = accessExpiresAt ? new Date(accessExpiresAt).toLocaleDateString("pt-BR") : "";

  useEffect(() => {
    if (lastPackageName) saveTrail({ ...readTrail(), pacote: true });
  }, [lastPackageName]);

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
      throw new Error(data.error || "Ação indisponível.");
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
      throw new Error(data.error || "Sessão invalida.");
    }

    setName(data.user.name || data.profile.name || "Usuário");
    setEmail(data.user.email);
    setAccessStatus(data.profile.access_status);
    setAccessExpiresAt(data.profile.access_expires_at || "");
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
    // Link de convite/recuperacao tem prioridade sobre a sessao salva.
    if (!sessionToken || window.location.hash.includes("access_token")) return;

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
        setLoginError("Este link expirou ou já foi usado. Informe seu email para receber um novo.");
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

        if (!response.ok) throw new Error(data.error || "Não foi possível enviar o link.");

        setLoginNotice(data.message);
        return;
      }

      if (mode === "set-password") {
        if (password.length < 8) throw new Error("A senha precisa ter pelo menos 8 caracteres.");
        if (password !== passwordConfirm) throw new Error("As senhas não conferem.");

        const response = await fetch("/api/auth/password", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${linkToken}` },
          body: JSON.stringify({ password }),
        });
        const data = await response.json();

        if (!response.ok) throw new Error(data.error || "Não foi possível salvar a senha.");

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

      if (!response.ok) throw new Error(data.error || "Não foi possível acessar.");

      const token = data.session.accessToken as string;
      window.localStorage.setItem(sessionKey, token);
      setSessionToken(token);
      setName(data.user.name || "Usuário");
      setEmail(cleanEmail);
      await loadAccount(token);
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : "Erro ao acessar.");
    }
  }

  function generateProduct() {
    const nextResult = buildProduct(niche, productType, audience, tone);
    setResult(nextResult);
    setGenerationSource("Rascunho rápido");
    setActiveView("produto");
  }

  async function generateProductWithAi() {
    if (!sessionToken) {
      setCopiedLabel("Faça login para criar produtos");
      return;
    }

    setActiveGeneration("product");
    setCopiedLabel("Criando produto completo...");
    const fullProductBrief = [
      productBrief,
      studentProductInfo.trim() ? `Informações extras do projeto:\n${studentProductInfo.trim()}` : "",
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
      setGenerationSource(data.source === "internal" ? "Criação concluída" : "Criação automática concluída");
      const bundle = await buildProjectBundle(product, sessionToken);
      downloadBlob(bundle.blob, bundle.filename);
      setLastPackageName(bundle.filename);
      setCopiedLabel("Produto completo criado e pacote baixado");
      setActiveView("produto");
    } catch (error) {
      setGenerationSource("Rascunho rápido");
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
      setGenerationSource("Copy criada com automação");
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
      setCopiedLabel("Acesso aguardando confirmação");
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
    setCopiedLabel("Oportunidade aplicada no pedido");
    setActiveView("gerador");
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

  async function downloadProject() {
    if (!result) return;

    setCopiedLabel("Preparando o pacote...");
    const bundle = await buildProjectBundle(result, sessionToken);
    downloadBlob(bundle.blob, bundle.filename);
    setLastPackageName(bundle.filename);
    setCopiedLabel("Pacote do projeto baixado");
  }

  function goTo(view: ActiveView) {
    setActiveView(view);
    setMenuOpen(false);
    if (view === "radar" && !trailFlags.radar) {
      const nextTrail = { ...trailFlags, radar: true };
      setTrailFlags(nextTrail);
      saveTrail(nextTrail);
    }
    window.scrollTo({ top: 0 });
  }

  function startOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = quickNiche.trim();
    if (value) setNiche(value);
    goTo("gerador");
  }

  async function downloadSavedProject(project: SavedProject) {
    setCopiedLabel("Preparando o pacote...");
    const bundle = await buildProjectBundle(sanitizeProductLanguage(project.payload), sessionToken);
    downloadBlob(bundle.blob, bundle.filename);
    setLastPackageName(bundle.filename);
    setCopiedLabel("Pacote do projeto baixado");
  }

  function logout() {
    window.localStorage.removeItem(sessionKey);
    setSessionToken("");
    setIsLoggedIn(false);
  }

  if (!isLoggedIn || mode === "set-password") {
    return (
      <main className="pi-login">
        <div className="pi-bg" aria-hidden="true" />
        <form className="pi-login-card" onSubmit={submitAccess}>
          <div className="pi-lamp-glow">
            <LampMark />
          </div>
          <p className="pi-eyebrow">Painel Inteligente</p>
          <h1>
            {mode === "login" && "Bem-vindo de volta"}
            {mode === "forgot" && "Recuperar acesso"}
            {mode === "set-password" && "Defina sua senha"}
          </h1>
          <p className="pi-sub">
            {mode === "login" && "Entre para fazer seu próximo pedido."}
            {mode === "forgot" && "Informe seu e-mail e enviaremos um link para criar uma nova senha."}
            {mode === "set-password" && "Crie uma senha para acessar o painel."}
          </p>

          {mode !== "set-password" && (
            <label className="pi-field">
              <span>E-mail</span>
              <div className="pi-input">
                <Icon name="mail" />
                <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="email" placeholder="seu@email.com" />
              </div>
            </label>
          )}
          {mode !== "forgot" && (
            <label className="pi-field">
              <span>{mode === "set-password" ? "Nova senha" : "Senha"}</span>
              <div className="pi-input">
                <Icon name="lock" />
                <input
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  type="password"
                  autoComplete={mode === "set-password" ? "new-password" : "current-password"}
                  placeholder="••••••••"
                />
              </div>
            </label>
          )}
          {mode === "set-password" && (
            <label className="pi-field">
              <span>Confirme a senha</span>
              <div className="pi-input">
                <Icon name="lock" />
                <input
                  value={passwordConfirm}
                  onChange={(event) => setPasswordConfirm(event.target.value)}
                  type="password"
                  autoComplete="new-password"
                  placeholder="••••••••"
                />
              </div>
            </label>
          )}
          {loginError && <p className="form-error">{loginError}</p>}
          {loginNotice && <p className="form-notice">{loginNotice}</p>}

          <button className="pi-btn-main" type="submit">
            {mode === "login" && "Entrar no painel"}
            {mode === "forgot" && "Enviar link"}
            {mode === "set-password" && "Salvar senha e entrar"}
            <Icon name="arrow" />
          </button>

          <div className="pi-login-links">
            {mode === "login" && (
              <button type="button" className="pi-link" onClick={() => { setMode("forgot"); setLoginError(""); setLoginNotice(""); }}>
                Esqueci minha senha
              </button>
            )}
            {mode === "forgot" && (
              <button type="button" className="pi-link" onClick={() => { setMode("login"); setLoginError(""); setLoginNotice(""); }}>
                Voltar para o login
              </button>
            )}
          </div>

          <p className="pi-secure">
            <Icon name="shield" />
            Acesso exclusivo para quem tem o Método Gênio
          </p>
        </form>
      </main>
    );
  }

  return (
    <main className="pi-shell">
      <div className="pi-bg" aria-hidden="true" />

      <aside className={`pi-side ${menuOpen ? "open" : ""}`}>
        <div className="pi-brand">
          <span className="pi-mark">
            <LampMark />
          </span>
          <div>
            <strong>Painel Inteligente</strong>
            <small>Faça o pedido</small>
          </div>
        </div>

        <nav className="pi-nav" aria-label="Navegação principal">
          {menuGroups.map((group) => (
            <div key={group.title || "principal"}>
              {group.title && <p className="pi-sec">{group.title}</p>}
              {group.items.map((item) => (
                <button
                  className={activeView === item.id ? "on" : ""}
                  key={item.id}
                  onClick={() => goTo(item.id)}
                  type="button"
                >
                  <Icon name={item.icon} />
                  {item.label}
                </button>
              ))}
            </div>
          ))}
          <div>
            <p className="pi-sec">Aprender</p>
            <button className={activeView === "mentor" ? "on" : ""} onClick={() => goTo("mentor")} type="button">
              <Icon name="bot" />
              Mentor
            </button>
            <a href={lessonsUrl} target="_blank" rel="noreferrer">
              <Icon name="play" />
              Ir para as aulas
              <span className="pi-ext">
                <Icon name="external" />
              </span>
            </a>
          </div>
        </nav>

        <div className="pi-side-spacer" />

        <div className={`pi-status ${accessStatus}`}>
          <p className="pi-status-row">
            <span className="pi-dot" />
            {statusCopy.label}
          </p>
          {canAccess ? (
            <>
              {expiresLabel && <small>Válido até {expiresLabel}</small>}
              <div className="pi-meter">
                <span>Produtos este mês</span>
                <b>{usage.productsUsed}/{usage.productsLimit}</b>
              </div>
              <div className="pi-bar">
                <i style={{ width: `${Math.min((usage.productsUsed / Math.max(usage.productsLimit, 1)) * 100, 100)}%` }} />
              </div>
            </>
          ) : (
            <small>{statusCopy.text}</small>
          )}
        </div>

        <div className="pi-user">
          <span className="pi-avatar">{(firstName || email || "?").charAt(0).toUpperCase()}</span>
          <div>
            <strong>{firstName || "Minha conta"}</strong>
            <small>{email}</small>
          </div>
          <button type="button" onClick={logout} aria-label="Sair" title="Sair">
            <Icon name="logout" />
          </button>
        </div>
      </aside>

      {menuOpen && <button type="button" className="pi-scrim" aria-label="Fechar menu" onClick={() => setMenuOpen(false)} />}

      <section className="pi-main">
        <header className="pi-top">
          <button type="button" className="pi-burger" aria-label="Abrir menu" onClick={() => setMenuOpen(true)}>
            <Icon name="menu" />
          </button>
          <div className="pi-mbrand">
            <span className="pi-mark">
              <LampMark />
            </span>
            Painel Inteligente
          </div>
          <p className="pi-crumb">
            Painel / <b>{viewLabels[activeView]}</b>
          </p>
          <div className="pi-grow" />
          <span className={`pi-pill pi-live ${canAccess ? "" : "inactive"}`}>
            <span className="pi-dot" />
            {canAccess ? "Ativo" : statusCopy.label}
          </span>
          <a className="pi-pill pi-hide-sm" href={lessonsUrl} target="_blank" rel="noreferrer">
            <Icon name="play" />
            Aulas
          </a>
          <button type="button" className="pi-pill pi-cta pi-hide-sm" onClick={() => goTo("gerador")}>
            <Icon name="plus" />
            Novo produto
          </button>
        </header>

        <div className="pi-content">
        {!canAccess && (
          <section className="blocked-state" aria-live="polite">
            <h2>{statusCopy.label}</h2>
            <p>{statusCopy.text}</p>
            <p>Se você acredita que seu acesso deveria estar ativo, aguarde a confirmação da compra ou fale com o suporte.</p>
          </section>
        )}

        {activeView === "inicio" && (
          <div className="pi-home">
            <section className="pi-hero">
              <p className="pi-hello">
                <Icon name="star" />
                {firstName ? `Olá, ${firstName}` : "Olá"}
              </p>
              <h1>
                O que vamos <span className="pi-gt">criar hoje?</span>
              </h1>
              <p>Faça o pedido e receba o pacote completo: produto em PDF, página de vendas e copy prontos para publicar.</p>
              <form className="pi-wish" onSubmit={startOrder}>
                <Icon name="star" />
                <input
                  value={quickNiche}
                  onChange={(event) => setQuickNiche(event.target.value)}
                  placeholder="Qual é o nicho? Ex.: marmitas fit para quem trabalha fora"
                  aria-label="Nicho do produto"
                />
                <button type="submit">
                  Fazer o pedido
                  <Icon name="arrow" />
                </button>
              </form>
              {canAccess && trendOpportunities.length > 0 && (
                <div className="pi-chips">
                  <span>Em alta:</span>
                  {trendOpportunities.slice(0, 3).map((product) => (
                    <button type="button" key={product.title} onClick={() => applyTrendProduct(product)}>
                      <i />
                      {product.niche.charAt(0).toUpperCase() + product.niche.slice(1)}
                    </button>
                  ))}
                </div>
              )}
            </section>

            <div className="pi-home-grid">
              <section>
                <h2 className="pi-h2">Módulos</h2>
                <div className="pi-mods">
                  <button type="button" className="pi-mod feat" style={{ "--c": "var(--pi-violet)" } as CSSProperties} onClick={() => goTo("gerador")}>
                    <span className="pi-badge">{canAccess ? `${productsLeft} disponíveis` : "1 clique"}</span>
                    <span className="pi-ico"><Icon name="spark" /></span>
                    <strong>Fazer o pedido</strong>
                    <span className="pi-mod-text">Nicho, público e formato. A IA cria o produto e o pacote completo.</span>
                    <span className="pi-go">Criar produto <Icon name="arrow" /></span>
                  </button>
                  <button type="button" className="pi-mod" style={{ "--c": "var(--pi-cyan)" } as CSSProperties} onClick={() => goTo("radar")}>
                    <span className="pi-ico"><Icon name="trend" /></span>
                    <strong>Nichos em alta</strong>
                    <span className="pi-mod-text">Oportunidades low ticket para aplicar direto no pedido.</span>
                    <span className="pi-go">Ver oportunidades <Icon name="arrow" /></span>
                  </button>
                  <button type="button" className="pi-mod" style={{ "--c": "var(--pi-pink)" } as CSSProperties} onClick={() => goTo("criativos")}>
                    <span className="pi-ico"><Icon name="image" /></span>
                    <strong>Criativos prontos</strong>
                    <span className="pi-mod-text">Imagens, carrossel e vídeo para anunciar, sem gravar nada.</span>
                    <span className="pi-go">Criar criativos <Icon name="arrow" /></span>
                  </button>
                  <button type="button" className="pi-mod" style={{ "--c": "var(--pi-amber)" } as CSSProperties} onClick={() => goTo("arquivos")}>
                    {savedProjects.length > 0 && <span className="pi-badge">{savedProjects.length} {savedProjects.length === 1 ? "projeto" : "projetos"}</span>}
                    <span className="pi-ico"><Icon name="folder" /></span>
                    <strong>Meus arquivos</strong>
                    <span className="pi-mod-text">Baixe de novo os pacotes ZIP dos seus projetos.</span>
                    <span className="pi-go">Abrir arquivos <Icon name="arrow" /></span>
                  </button>
                </div>

                <h2 className="pi-h2 pi-h2-gap">Ferramentas para vender</h2>
                <div className="pi-tools">
                  {homeTools.map((tool) => (
                    <button type="button" key={tool.id} style={{ "--c": tool.color } as CSSProperties} onClick={() => goTo(tool.id)}>
                      <span className="pi-ico"><Icon name={tool.icon} /></span>
                      <span>
                        <strong>{tool.label}</strong>
                        <small>{tool.text}</small>
                      </span>
                      <Icon name="arrow" />
                    </button>
                  ))}
                </div>
              </section>

              <section>
                <h2 className="pi-h2">Sua trilha</h2>
                <div className="pi-track">
                  <span className="pi-track-label">Seu primeiro produto</span>
                  <p className="pi-track-title">
                    {trailDone === trailSteps.length ? "Trilha concluída" : `Etapa ${trailCurrent + 1} de ${trailSteps.length}`}
                    <em>{Math.round((trailDone / trailSteps.length) * 100)}%</em>
                  </p>
                  <div className="pi-bar big">
                    <i style={{ width: `${(trailDone / trailSteps.length) * 100}%` }} />
                  </div>
                  {trailSteps.map((step, index) => (
                    <button
                      type="button"
                      key={step.id}
                      className={`pi-step ${step.done ? "done" : ""} ${index === trailCurrent ? "now" : ""}`}
                      onClick={() => goTo(step.view)}
                    >
                      <span className="pi-step-n">{step.done ? <Icon name="check" /> : index + 1}</span>
                      <span className="pi-step-text">
                        {step.label}
                        {index === trailCurrent && <small>{step.hint}</small>}
                      </span>
                    </button>
                  ))}
                  <a className="pi-btn-ghost" href={lessonsUrl} target="_blank" rel="noreferrer">
                    <Icon name="play" />
                    Ir para as aulas
                  </a>
                </div>

                {savedProjects.length > 0 && (
                  <div className="pi-recent">
                    <div className="pi-h2-row">
                      <h2 className="pi-h2">Recentes</h2>
                      <button type="button" onClick={() => goTo("arquivos")}>Ver todos</button>
                    </div>
                    {savedProjects.slice(0, 3).map((project, index) => (
                      <div className="pi-ritem" key={project.id}>
                        <button type="button" className="pi-ritem-main" onClick={() => selectSavedProject(project.id, "produto")}>
                          <span className={`pi-thumb t${index % 3}`} />
                          <span>
                            <strong>{project.title}</strong>
                            <small>
                              Pacote completo
                              {project.created_at ? ` · ${formatRelativeDate(project.created_at)}` : ""}
                            </small>
                          </span>
                        </button>
                        <button type="button" className="pi-dl" aria-label="Baixar pacote" onClick={() => downloadSavedProject(project)}>
                          <Icon name="download" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          </div>
        )}

        {canAccess && activeView === "criativos" && (
          <section className="pi-view">
            <header className="pi-view-head" style={{ "--c": "var(--pi-pink)" } as CSSProperties}>
              <span className="pi-ico"><Icon name="image" /></span>
              <div>
                <p className="pi-kicker">Criar</p>
                <h2>Criativos prontos</h2>
                <p>Imagens, carrossel e vídeo para anunciar o produto, sem gravar e sem aparecer. Escolha o produto, ajuste a cor e baixe.</p>
              </div>
            </header>
            <div className="pi-card pi-cr-pick">
              <label className="pi-label">
                Produto
                <select value={currentProjectId} onChange={(event) => selectSavedProject(event.target.value, "criativos")}>
                  <option value="">{savedProjects.length ? "Selecione um produto criado" : "Exemplo (crie um produto para usar o seu)"}</option>
                  {recentSavedProjects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.title}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {result && (
              <ImageCreatives
                copy={buildCreativeCopy(result, displayText(productType))}
                captions={buildAdCopies(result).map((ad) => ad.primaryText)}
                projectKey={currentProjectId}
                makeZip={buildZip}
                onCopy={copyText}
              />
            )}
          </section>
        )}

        {canAccess && activeView === "mockup" && (
          <section className="pi-view">
            <header className="pi-view-head" style={{ "--c": "var(--pi-violet)" } as CSSProperties}>
              <span className="pi-ico"><Icon name="cube" /></span>
              <div>
                <p className="pi-kicker">Vender</p>
                <h2>Mockup 3D do produto</h2>
                <p>A capa do seu produto em livro, tablet e celular, pronta para a página de vendas e para os anúncios. Ajuste o texto e baixe a imagem.</p>
              </div>
            </header>
            <ProductMockup title={result?.title || ""} subtitle={result?.subtitle || ""} label={displayText(productType)} />
          </section>
        )}

        {canAccess && activeView === "calculadora" && (
          <section className="pi-view">
            <header className="pi-view-head" style={{ "--c": "var(--pi-green)" } as CSSProperties}>
              <span className="pi-ico"><Icon name="calc" /></span>
              <div>
                <p className="pi-kicker">Vender</p>
                <h2>Calculadora de lucro</h2>
                <p>Descubra quanto sobra por venda, o custo por venda máximo nos anúncios e quantas vendas por dia você precisa para bater a meta.</p>
              </div>
            </header>
            <ProfitCalculator onOpenLaunch={() => goTo("lancamento")} />
          </section>
        )}

        {canAccess && activeView === "lancamento" && (
          <section className="pi-view">
            <header className="pi-view-head" style={{ "--c": "var(--pi-pink)" } as CSSProperties}>
              <span className="pi-ico"><Icon name="rocket" /></span>
              <div>
                <p className="pi-kicker">Vender</p>
                <h2>Checklist de lançamento</h2>
                <p>Do produto pronto ao primeiro anúncio no ar, na ordem certa. Marque cada etapa: o progresso fica salvo neste aparelho.</p>
              </div>
            </header>
            <LaunchChecklist userKey={email} onNavigate={goTo} />
          </section>
        )}

        {canAccess && (
          <section className={`pi-view view-panel ${activeView === "mentor" ? "" : "is-hidden"}`}>
            <header className="pi-view-head" style={{ "--c": "var(--pi-cyan)" } as CSSProperties}>
              <span className="pi-ico"><Icon name="bot" /></span>
              <div>
                <p className="pi-kicker">Aprender</p>
                <h2>Mentor</h2>
                <p>Tire dúvidas sobre o seu produto, preço, página, anúncios e vendas. Respostas curtas e práticas, na hora.</p>
              </div>
            </header>
            <MentorChat
              userKey={email}
              request={authenticatedJson}
              active={activeView === "mentor"}
              context={currentProjectId && result ? { title: result.title, promise: result.promise, niche, audience } : {}}
            />
          </section>
        )}

        <div className={canAccess ? "content-grid single-view" : "content-grid single-view locked"}>
          <section className={`pi-view view-panel ${activeView === "radar" ? "" : "is-hidden"} ${canAccess ? "" : "is-locked"}`} id="tendencias">
            <header className="pi-view-head" style={{ "--c": "var(--pi-cyan)" } as CSSProperties}>
              <span className="pi-ico"><Icon name="trend" /></span>
              <div>
                <p className="pi-kicker">Radar de oportunidades</p>
                <h2>Nichos em alta</h2>
                <p>Oportunidades de produtos até R$ 97 com promessa, público, ângulo e canal definidos. Escolha uma e aplique no pedido.</p>
              </div>
            </header>

            <div className="pi-toolbar" aria-disabled={!canAccess}>
              <div className="pi-search">
                <Icon name="search" />
                <input
                  value={trendSearch}
                  onChange={(event) => setTrendSearch(event.target.value)}
                  placeholder="Pesquisar: beleza, alimentação, renda extra..."
                  aria-label="Pesquisar oportunidade"
                  disabled={!canAccess}
                />
              </div>
              <div className="pi-filter" role="group" aria-label="Categoria">
                {trendCategories.map((category) => (
                  <button
                    type="button"
                    key={category}
                    className={trendCategory === category ? "on" : ""}
                    onClick={() => setTrendCategory(category)}
                    disabled={!canAccess}
                  >
                    {displayText(category)}
                  </button>
                ))}
              </div>
            </div>

            {canAccess ? (
              <>
                {filteredTrendProducts.length === 0 && (
                  <p className="pi-empty">Nenhuma oportunidade encontrada para essa busca.</p>
                )}
                <div className="pi-trend-grid">
                  {filteredTrendProducts.map((product) => (
                    <article className="pi-trend" key={product.title}>
                      <div className="pi-trend-top">
                        <div className="pi-tags">
                          <span className={`pi-tag status-${getTrendStatus(product).toLowerCase()}`}>{displayText(getTrendStatus(product))}</span>
                          <span className="pi-tag">{displayText(product.category)}</span>
                        </div>
                        <span className="pi-score" style={{ "--p": product.score } as CSSProperties} aria-label={`Pontuação ${product.score} de 100`}>
                          <b>{product.score}</b>
                        </span>
                      </div>
                      <h3>{product.title}</h3>
                      <p className="pi-trend-promise">{product.promise || product.angle}</p>
                      <dl className="pi-trend-meta">
                        <div>
                          <dt>Formato</dt>
                          <dd>{displayText(product.productType)}</dd>
                        </div>
                        <div>
                          <dt>Ticket</dt>
                          <dd>{product.price}</dd>
                        </div>
                        <div className="wide">
                          <dt>Canal</dt>
                          <dd>{displayText(product.channel || "Orgânico + trafego pago")}</dd>
                        </div>
                      </dl>
                      <p className="pi-trend-angle">
                        <Icon name="target" />
                        {product.salesAngle || product.angle}
                      </p>
                      <div className="pi-trend-actions">
                        <button type="button" className="pi-btn-soft" onClick={() => setSelectedTrendProduct(product)}>
                          Ver plano
                        </button>
                        <button type="button" className="pi-btn-grad" onClick={() => applyTrendProduct(product)}>
                          Usar no pedido
                          <Icon name="arrow" />
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
                {selectedTrendProduct && (
                  <div className="pi-modal" role="dialog" aria-modal="true" aria-label="Plano da oportunidade">
                    <button type="button" className="pi-modal-scrim" aria-label="Fechar" onClick={() => setSelectedTrendProduct(null)} />
                    <div className="pi-modal-card">
                      <div className="pi-modal-head">
                        <div>
                          <p className="pi-kicker">{displayText(getTrendStatus(selectedTrendProduct))} · {selectedTrendProduct.price}</p>
                          <h2>{selectedTrendProduct.title}</h2>
                        </div>
                        <button type="button" className="pi-icon-btn" onClick={() => setSelectedTrendProduct(null)} aria-label="Fechar">
                          <Icon name="close" />
                        </button>
                      </div>
                      <div className="pi-brief-grid">
                        <div>
                          <span>Promessa</span>
                          <p>{selectedTrendProduct.promise || selectedTrendProduct.angle}</p>
                        </div>
                        <div>
                          <span>Público-alvo</span>
                          <p>{selectedTrendProduct.audience}</p>
                        </div>
                        <div>
                          <span>Ângulo de venda</span>
                          <p>{selectedTrendProduct.salesAngle || selectedTrendProduct.angle}</p>
                        </div>
                        <div>
                          <span>Canal recomendado</span>
                          <p>{displayText(selectedTrendProduct.channel || "Orgânico + trafego pago")}</p>
                        </div>
                        <div>
                          <span>Formatos de criativo</span>
                          <p>{(selectedTrendProduct.creativeFormats || [selectedTrendProduct.adSignal]).join(", ")}</p>
                        </div>
                        <div>
                          <span>Página sugerida</span>
                          <p>{selectedTrendProduct.pageType || "Landing curta com prova e checkout"}</p>
                        </div>
                      </div>
                      <div className="pi-insight">
                        <span><Icon name="star" />Insight estratégico</span>
                        <p>{selectedTrendProduct.strategicInsight || selectedTrendProduct.trendSignal}</p>
                      </div>
                      <div className="pi-tags">
                        {(selectedTrendProduct.tags || ["oportunidade", selectedTrendProduct.category]).map((tag) => (
                          <span className="pi-tag" key={tag}>{displayText(tag)}</span>
                        ))}
                      </div>
                      <div className="pi-modal-actions">
                        <button type="button" className="pi-btn-soft" onClick={() => setSelectedTrendProduct(null)}>
                          Fechar
                        </button>
                        <button type="button" className="pi-btn-grad" onClick={() => applyTrendProduct(selectedTrendProduct)}>
                          Aplicar no pedido
                          <Icon name="arrow" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="pi-locked" aria-live="polite">
                <div className="pi-locked-copy">
                  <span className="pi-ico" style={{ "--c": "var(--pi-amber)" } as CSSProperties}><Icon name="lock" /></span>
                  <h3>Radar liberado após a confirmação</h3>
                  <p>Os nichos em alta e os planos de oportunidade ficam disponíveis assim que o pagamento for aprovado.</p>
                </div>
                <div className="pi-trend-grid" aria-hidden="true">
                  {lockedTrendCards.map((item) => (
                    <article className="pi-trend pi-trend-ghost" key={item}>
                      <span className="pi-ph short" />
                      <span className="pi-ph title" />
                      <span className="pi-ph" />
                      <span className="pi-ph medium" />
                      <span className="pi-ph button" />
                    </article>
                  ))}
                </div>
              </div>
            )}
          </section>

          <section className={`pi-view view-panel ${activeView === "gerador" ? "" : "is-hidden"}`} id="gerador">
            <header className="pi-view-head" style={{ "--c": "var(--pi-violet)" } as CSSProperties}>
              <span className="pi-ico"><Icon name="spark" /></span>
              <div>
                <p className="pi-kicker">Gerador</p>
                <h2>Faça o seu pedido</h2>
                <p>Descreva o produto. A IA cria o conteúdo, a página de vendas e a copy, e o pacote ZIP baixa sozinho.</p>
              </div>
              {canAccess && (
                <span className="pi-quota">
                  <b>{productsLeft}</b> de {usage.productsLimit} pedidos disponíveis este mês
                </span>
              )}
            </header>

            {productBrief && (
              <div className="pi-applied">
                <Icon name="check" />
                <div>
                  <strong>Oportunidade aplicada</strong>
                  <span>O pacote será criado com a promessa, o público, o ângulo, o canal e o formato de página desta oportunidade.</span>
                </div>
              </div>
            )}

            <div className="pi-order">
              <div className="pi-order-form">
                <div className="pi-card">
                  <p className="pi-step-title"><span>1</span>Sobre o que é o produto?</p>
                  <div className="pi-form-grid">
                    <label className="pi-label">
                      Nicho
                      <input
                        value={niche}
                        onChange={(event) => {
                          setNiche(event.target.value);
                          setProductBrief("");
                        }}
                        placeholder="Ex.: bolo de pote"
                      />
                    </label>
                    <label className="pi-label">
                      Público
                      <input
                        value={audience}
                        onChange={(event) => {
                          setAudience(event.target.value);
                          setProductBrief("");
                        }}
                        placeholder="Ex.: mães que querem renda extra"
                      />
                    </label>
                  </div>
                </div>

                <div className="pi-card">
                  <p className="pi-step-title"><span>2</span>Escolha o formato</p>
                  <div className="pi-formats" role="radiogroup" aria-label="Formato do produto">
                    {productTypes.map((type) => (
                      <button
                        type="button"
                        role="radio"
                        aria-checked={productType === type}
                        key={type}
                        className={productType === type ? "on" : ""}
                        onClick={() => setProductType(type)}
                      >
                        <Icon name={productTypeIcons[type] || "doc"} />
                        <strong>{displayText(type)}</strong>
                        <small>{productTypeHints[type]}</small>
                      </button>
                    ))}
                  </div>
                  <p className="pi-sub-label">Tom da comunicação</p>
                  <div className="pi-filter" role="radiogroup" aria-label="Tom da comunicação">
                    {toneOptions.map((option) => (
                      <button
                        type="button"
                        role="radio"
                        aria-checked={tone === option}
                        key={option}
                        className={tone === option ? "on" : ""}
                        onClick={() => setTone(option)}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pi-card">
                  <p className="pi-step-title"><span>3</span>Detalhes do pedido <em>opcional</em></p>
                  <textarea
                    className="pi-textarea"
                    value={studentProductInfo}
                    onChange={(event) => setStudentProductInfo(event.target.value)}
                    placeholder="Ex.: entrega simples para iniciantes, com exemplos práticos, sem linguagem técnica e um bônus de cardápio semanal."
                    rows={4}
                    aria-label="Detalhes do pedido"
                  />
                </div>
              </div>

              <aside className="pi-order-side">
                <div className="pi-card pi-summary">
                  <p className="pi-kicker">Seu pacote</p>
                  <h3>{niche.trim() ? `${displayText(productType)}: ${niche.trim()}` : "Preencha o nicho"}</h3>
                  <ul className="pi-files">
                    {packageItems.map((item) => (
                      <li key={item.label}>
                        <Icon name={item.icon} />
                        {item.label}
                      </li>
                    ))}
                  </ul>
                  <button type="button" className="pi-btn-main" onClick={generateProductWithAi} disabled={activeGeneration !== null}>
                    <Icon name="star" />
                    {activeGeneration === "product" ? "Criando..." : "Fazer o pedido"}
                  </button>
                  <button type="button" className="pi-btn-text" onClick={generateProduct} disabled={activeGeneration !== null}>
                    Ver um rascunho rápido antes
                  </button>
                  {currentProjectId && lastPackageName && (
                    <div className="pi-ready">
                      <div>
                        <strong>Pacote pronto</strong>
                        <span>{lastPackageName}</span>
                      </div>
                      <button type="button" className="pi-dl" onClick={downloadProject} aria-label="Baixar novamente">
                        <Icon name="download" />
                      </button>
                    </div>
                  )}
                </div>
              </aside>
            </div>
          </section>

          {result && (
            <>
              <section className={`pi-view view-panel ${activeView === "produto" ? "" : "is-hidden"}`} id="produto">
                <header className="pi-view-head" style={{ "--c": "var(--pi-pink)" } as CSSProperties}>
                  <span className="pi-ico"><Icon name="doc" /></span>
                  <div>
                    <p className="pi-kicker">Produto criado</p>
                    <h2>{result.title}</h2>
                    <p>{result.subtitle}</p>
                  </div>
                </header>

                {!currentProjectId && (
                  <div className="pi-draft">
                    <Icon name="star" />
                    <p>Esta é uma prévia em rascunho. Faça o pedido para gerar o pacote completo com PDF, página de vendas e copy.</p>
                    <button type="button" className="pi-btn-grad" onClick={() => goTo("gerador")}>
                      Fazer o pedido
                    </button>
                  </div>
                )}

                <div className="pi-product-hero">
                  <div className="pi-cover" aria-hidden="true">
                    <div className="pi-cover-book">
                      <span>{displayText(productType)}</span>
                      <strong>{result.title}</strong>
                      <p>{result.promise}</p>
                      <i />
                    </div>
                  </div>
                  <div className="pi-card pi-product-info">
                    <p className="pi-kicker">Promessa</p>
                    <p className="pi-promise">{result.promise}</p>
                    <div className="pi-stats">
                      <div>
                        <b>{result.modules.length}</b>
                        <span>módulos</span>
                      </div>
                      <div>
                        <b>{result.productContent.length}</b>
                        <span>seções de conteúdo</span>
                      </div>
                      <div>
                        <b>10+</b>
                        <span>páginas no PDF</span>
                      </div>
                    </div>
                    <div className="pi-actions">
                      <button type="button" className="pi-btn-grad" onClick={downloadProject}>
                        <Icon name="download" />
                        Baixar pacote ZIP
                      </button>
                      <button type="button" className="pi-btn-soft" onClick={() => goTo("copy")}>
                        <Icon name="chat" />
                        Gerar copy
                      </button>
                    </div>
                  </div>
                </div>

                <div className="pi-two">
                  <div className="pi-card">
                    <h3 className="pi-card-title">Módulos</h3>
                    <ol className="pi-olist">
                      {result.modules.map((module, index) => (
                        <li key={module}>
                          <span>{String(index + 1).padStart(2, "0")}</span>
                          {module}
                        </li>
                      ))}
                    </ol>
                  </div>
                  <div className="pi-card">
                    <h3 className="pi-card-title">Estrutura da entrega</h3>
                    <ul className="pi-checklist">
                      {result.productBlueprint.map((item) => (
                        <li key={item}>
                          <Icon name="check" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <h3 className="pi-section-title">Conteúdo completo</h3>
                <div className="pi-blocks">
                  {result.productContent.map((block, index) => (
                    <article className="pi-block" key={`${block.title}-${index}`}>
                      <span className="pi-block-n">{String(index + 1).padStart(2, "0")}</span>
                      <div>
                        <h4>{block.title}</h4>
                        <p>{block.body}</p>
                        <p className="pi-block-task">
                          <Icon name="target" />
                          {block.task}
                        </p>
                      </div>
                    </article>
                  ))}
                </div>
              </section>

              <section className={`pi-view view-panel ${activeView === "copy" ? "" : "is-hidden"}`} id="copy">
                <header className="pi-view-head" style={{ "--c": "var(--pi-pink)" } as CSSProperties}>
                  <span className="pi-ico"><Icon name="chat" /></span>
                  <div>
                    <p className="pi-kicker">Copy de vendas</p>
                    <h2>Copy para vender o produto</h2>
                    <p>Textos de anúncio e, para quem quiser aparecer, roteiros para gravar. As imagens prontas ficam em Criativos prontos.</p>
                  </div>
                  {currentProjectId && (
                    <span className="pi-quota">
                      <b>{usage.copyUsage[currentProjectId] || 0}</b> de {usage.copyEditsPerProductLimit} alterações usadas neste produto
                    </span>
                  )}
                </header>

                <div className="pi-card pi-copy-config">
                  <div className="pi-form-grid">
                    <label className="pi-label">
                      Produto
                      <select value={currentProjectId} onChange={(event) => selectSavedProject(event.target.value, "copy")}>
                        <option value="">Selecione um produto criado</option>
                        {recentSavedProjects.map((project) => (
                          <option key={project.id} value={project.id}>
                            {project.title}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className="pi-label">
                      Tipo de copy
                      <div className="pi-segment" role="group" aria-label="Tipo de copy">
                        <button className={copyMode === "ad" ? "on" : ""} onClick={() => setCopyMode("ad")} type="button">
                          <Icon name="page" />
                          Textos de anúncio
                        </button>
                        <button className={copyMode === "video" ? "on" : ""} onClick={() => setCopyMode("video")} type="button">
                          <Icon name="play" />
                          Roteiros para gravar
                        </button>
                      </div>
                    </div>
                  </div>
                  <label className="pi-label pi-copy-brief">
                    <span>Pedido específico <em>opcional</em></span>
                    <textarea
                      className="pi-textarea"
                      value={copyBrief}
                      onChange={(event) => setCopyBrief(event.target.value)}
                      placeholder="Ex.: copy mais direta, foco na dor financeira, tom popular e CTA para o WhatsApp."
                      rows={3}
                    />
                  </label>
                  <div className="pi-actions">
                    <button type="button" className="pi-btn-grad" onClick={generateCopyWithAi} disabled={activeGeneration !== null}>
                      <Icon name="star" />
                      {activeGeneration === "copy" ? "Criando..." : "Gerar variações"}
                    </button>
                    <button
                      type="button"
                      className="pi-btn-soft"
                      onClick={() =>
                        copyText(
                          "Copy copiada",
                          copyMode === "video"
                            ? formatVideoCreatives(buildVideoCreatives(result, copyBrief))
                            : formatAdCopies(buildAdCopies(result, copyBrief)),
                        )
                      }
                    >
                      Copiar tudo
                    </button>
                  </div>
                </div>

                {copyMode === "video" ? (
                  <div className="pi-copy-grid">
                    {buildVideoCreatives(result, copyBrief).map((creative, index) => (
                      <article className="pi-copy" key={`${creative.angle}-${index}`}>
                        <div className="pi-copy-head">
                          <div>
                            <span>Criativo {String(index + 1).padStart(2, "0")}</span>
                            <strong>{creative.angle}</strong>
                          </div>
                          <button type="button" className="pi-icon-btn" aria-label="Copiar criativo" onClick={() => copyText("Criativo copiado", formatVideoCreatives([creative]))}>
                            <Icon name="copy" />
                          </button>
                        </div>
                        <dl className="pi-copy-parts">
                          <dt className="c1">Gancho</dt>
                          <dd>{creative.hook}</dd>
                          <dt className="c2">Contexto</dt>
                          <dd>{creative.context}</dd>
                          <dt className="c3">Desenvolvimento</dt>
                          <dd>{creative.development}</dd>
                          <dt className="c4">CTA</dt>
                          <dd>{creative.cta}</dd>
                          <dt className="c5">Texto na tela</dt>
                          <dd>{creative.screenText}</dd>
                        </dl>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="pi-copy-grid">
                    {buildAdCopies(result, copyBrief).map((ad, index) => (
                      <article className="pi-copy" key={`${ad.angle}-${index}`}>
                        <div className="pi-copy-head">
                          <div>
                            <span>Anúncio {String(index + 1).padStart(2, "0")}</span>
                            <strong>{ad.angle}</strong>
                          </div>
                          <button type="button" className="pi-icon-btn" aria-label="Copiar anúncio" onClick={() => copyText("Anúncio copiado", formatAdCopies([ad]))}>
                            <Icon name="copy" />
                          </button>
                        </div>
                        <dl className="pi-copy-parts">
                          <dt className="c1">Texto principal</dt>
                          <dd className="pi-multiline">{ad.primaryText}</dd>
                          <dt className="c2">Título</dt>
                          <dd className="pi-headline">{ad.headline}</dd>
                          <dt className="c3">Descrição</dt>
                          <dd>{ad.description}</dd>
                        </dl>
                      </article>
                    ))}
                  </div>
                )}
              </section>

              <section className={`pi-view view-panel ${activeView === "arquivos" ? "" : "is-hidden"}`} id="arquivos">
                <header className="pi-view-head" style={{ "--c": "var(--pi-amber)" } as CSSProperties}>
                  <span className="pi-ico"><Icon name="folder" /></span>
                  <div>
                    <p className="pi-kicker">Downloads e histórico</p>
                    <h2>Meus arquivos</h2>
                    <p>Baixe de novo o pacote completo de cada projeto. Os pacotes ficam disponíveis por 30 dias após a criação.</p>
                  </div>
                </header>

                <div className="pi-usage">
                  <div className="pi-card">
                    <span>Produtos este mês</span>
                    <b>{usage.productsUsed}<small>/{usage.productsLimit}</small></b>
                    <div className="pi-bar">
                      <i style={{ width: `${Math.min((usage.productsUsed / Math.max(usage.productsLimit, 1)) * 100, 100)}%` }} />
                    </div>
                  </div>
                  <div className="pi-card">
                    <span>Alterações de copy neste produto</span>
                    <b>{currentProjectId ? usage.copyUsage[currentProjectId] || 0 : 0}<small>/{usage.copyEditsPerProductLimit}</small></b>
                    <div className="pi-bar">
                      <i style={{ width: `${currentProjectId ? Math.min(((usage.copyUsage[currentProjectId] || 0) / Math.max(usage.copyEditsPerProductLimit, 1)) * 100, 100) : 0}%` }} />
                    </div>
                  </div>
                  <div className="pi-card">
                    <span>Disponibilidade</span>
                    <b>30<small> dias</small></b>
                    <p>para baixar cada pacote</p>
                  </div>
                </div>

                <h3 className="pi-section-title">Projetos</h3>
                {savedProjects.length === 0 ? (
                  <div className="pi-card pi-empty-state">
                    <span className="pi-ico" style={{ "--c": "var(--pi-violet)" } as CSSProperties}><Icon name="folder" /></span>
                    <h4>Nenhum projeto ainda</h4>
                    <p>Faça o primeiro pedido e o pacote aparece aqui para baixar quando quiser.</p>
                    <button type="button" className="pi-btn-grad" onClick={() => goTo("gerador")}>
                      Fazer o pedido
                      <Icon name="arrow" />
                    </button>
                  </div>
                ) : (
                  <div className="pi-files-list">
                    {savedProjects.map((project, index) => (
                      <div className={`pi-file ${project.id === currentProjectId ? "on" : ""}`} key={project.id}>
                        <span className={`pi-thumb t${index % 3}`} />
                        <div className="pi-file-info">
                          <strong>{project.title}</strong>
                          <small>
                            Pacote ZIP
                            {project.created_at ? ` · criado ${formatRelativeDate(project.created_at)}` : ""}
                          </small>
                        </div>
                        <div className="pi-file-actions">
                          <button type="button" className="pi-btn-soft" onClick={() => selectSavedProject(project.id, "produto")}>
                            Abrir
                          </button>
                          <button type="button" className="pi-btn-soft pi-hide-xs" onClick={() => selectSavedProject(project.id, "copy")}>
                            Copy
                          </button>
                          <button type="button" className="pi-btn-grad" onClick={() => downloadSavedProject(project)}>
                            <Icon name="download" />
                            <span className="pi-hide-xs">Baixar</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {currentProjectId && result.prompts.length > 0 && (
                  <>
                    <h3 className="pi-section-title">Prompts do projeto aberto</h3>
                    <div className="pi-prompts">
                      {result.prompts.map((prompt) => (
                        <button type="button" key={prompt} onClick={() => copyText("Prompt copiado", prompt)}>
                          <span>{prompt}</span>
                          <Icon name="copy" />
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </section>
            </>
          )}
        </div>

        </div>

        {activeGeneration && <GenerationOverlay kind={activeGeneration} />}

        <div className={`toast ${copiedLabel ? "show" : ""} ${activeGeneration ? "working" : ""}`} aria-live="polite">
          <span>{copiedLabel}</span>
          {activeGeneration && (
            <div className="toast-progress" aria-hidden="true">
              <span />
            </div>
          )}
        </div>
      </section>

      <nav className="pi-mnav" aria-label="Navegação rápida">
        <button type="button" className={activeView === "inicio" ? "on" : ""} onClick={() => goTo("inicio")}>
          <Icon name="home" />
          Início
        </button>
        <button type="button" className={activeView === "radar" ? "on" : ""} onClick={() => goTo("radar")}>
          <Icon name="trend" />
          Nichos
        </button>
        <button type="button" className="pi-fab-wrap" aria-label="Fazer o pedido" onClick={() => goTo("gerador")}>
          <span className="pi-fab">
            <Icon name="star" />
          </span>
        </button>
        <button type="button" className={activeView === "copy" ? "on" : ""} onClick={() => goTo("copy")}>
          <Icon name="chat" />
          Copy
        </button>
        <button type="button" className={activeView === "arquivos" ? "on" : ""} onClick={() => goTo("arquivos")}>
          <Icon name="folder" />
          Arquivos
        </button>
      </nav>
    </main>
  );
}
