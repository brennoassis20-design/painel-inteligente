// Padrão de UTM da área de membros (aprovado em 18/11/2026). Funções puras, sem dependências de servidor.
// utm_source=membros · utm_medium=<onde clicou> · utm_campaign=<slug do produto> · utm_content=<botão/local>
// utm_term=<origem original do aluno compacta: source.campaign.content>. A origem NUNCA sobrescreve os campos da área.

export const UTM_MEDIUMS = ["cadeado", "cadeado-aula", "upsell-aula", "promo", "ofertas", "aviso", "aviso-email", "aviso-push", "pagina-produto", "link"] as const;
export type UtmMedium = (typeof UTM_MEDIUMS)[number];

const ORIGIN_KEYS = ["utm_source", "utm_campaign", "utm_content"] as const;

// Texto seguro para UTM: sem espaços nem ponto dentro de cada parte.
export function utmSlug(value: unknown, max = 60) {
  return String(value ?? "")
    .trim()
    .replace(/[^A-Za-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, max);
}

// "meta.rd-teste.r7" a partir das UTMs guardadas do aluno. Vazio se não houver origem.
export function compactOrigin(origin?: Record<string, unknown> | null) {
  if (!origin) return "";
  const parts = ORIGIN_KEYS.map((key) => utmSlug(origin[key], 30));
  // Origem que já é da própria área não é origem de verdade.
  if (parts[0] === "membros") return "";
  while (parts.length && !parts[parts.length - 1]) parts.pop();
  if (parts.some(Boolean)) return parts.join(".").slice(0, 100);
  return utmSlug(origin.utm_term, 100);
}

export function normalizeMedium(via: unknown): UtmMedium {
  const raw = String(via ?? "").trim();
  if (raw === "upsell") return "upsell-aula";
  return (UTM_MEDIUMS as readonly string[]).includes(raw) ? (raw as UtmMedium) : "cadeado";
}

type TagInput = {
  medium: UtmMedium;
  campaign: string;
  content: string;
  origin?: Record<string, unknown> | null;
  provider?: string | null;
  email?: string;
  name?: string;
  fbclid?: string;
};

// Aplica as tags da área ao link. Se o link já trouxer utm_source próprio (ex.: black6meses), mantém tudo o que veio
// nele e só acrescenta o que faltar.
export function tagLink(rawUrl: string, input: TagInput) {
  const link = new URL(rawUrl);
  if (input.email) link.searchParams.set("email", input.email);
  if (input.name) link.searchParams.set("name", input.name);
  const own = Boolean(link.searchParams.get("utm_source"));
  const term = compactOrigin(input.origin);
  const tags: Record<string, string> = {
    utm_source: "membros",
    utm_medium: input.medium,
    utm_campaign: utmSlug(input.campaign),
    utm_content: utmSlug(input.content) || input.medium,
  };
  if (term) tags.utm_term = term;
  for (const [key, value] of Object.entries(tags)) {
    if (own && link.searchParams.get(key)) continue;
    link.searchParams.set(key, value);
  }
  const provider = input.provider || "";
  if (provider === "cakto" || provider === "hotmart") {
    const medium = own ? link.searchParams.get("utm_medium") || input.medium : input.medium;
    const content = own ? link.searchParams.get("utm_content") || tags.utm_content : tags.utm_content;
    const src = own ? link.searchParams.get("utm_term") || term : term;
    if (!(own && link.searchParams.get("sck"))) link.searchParams.set("sck", `membros_${medium}_${content}`);
    if (src && !(own && link.searchParams.get("src"))) link.searchParams.set("src", src);
  }
  if (input.fbclid && !link.searchParams.get("fbclid")) link.searchParams.set("fbclid", input.fbclid.slice(0, 200));
  return { url: link.toString(), tags: Object.fromEntries([...link.searchParams.entries()].filter(([key]) => key.startsWith("utm_"))) };
}

// Link simples (página de vendas, aviso, suporte): só as tags, sem e-mail.
export function tagPlainLink(rawUrl: string, tags: { medium: UtmMedium | string; campaign?: string; content?: string; term?: string }) {
  try {
    const link = new URL(rawUrl);
    const set = (key: string, value?: string) => {
      if (value && !link.searchParams.get(key)) link.searchParams.set(key, value);
    };
    set("utm_source", "membros");
    set("utm_medium", tags.medium);
    set("utm_campaign", utmSlug(tags.campaign));
    set("utm_content", utmSlug(tags.content));
    set("utm_term", tags.term);
    return link.toString();
  } catch {
    return rawUrl;
  }
}
