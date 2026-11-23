// Regra pura (sem banco): quem tem o App da Reforma e o Kit Consultor. O produto ainda não existe na Eduzz: os slugs vêm de variáveis de ambiente.
//   REFORMA_APP_AREA_SLUG          área onde o app existe (padrão: reforma)
//   REFORMA_APP_PRODUCT_SLUGS      slugs dos produtos que liberam o app (upsell R$ 67 e downsell R$ 47), separados por vírgula
//   REFORMA_KIT_PRODUCT_SLUGS      slugs que liberam também a aba Kit Consultor (upsell R$ 67 e o Kit já vendido)
//   REFORMA_KIT_OFERTA_URL         link da oferta mostrada na aba Kit Consultor para quem não tem
//   REFORMA_APP_ARMAZENAMENTO      "supabase" (padrão) ou "local" (guarda no navegador, para a migration ainda não aplicada)
//   REFORMA_APP_DEV_LIBERAR        só fora de produção: "app" ou "app+kit" libera para qualquer logado na área
// O dono (admin da área) sempre vê o app e o kit, para testar.
export interface ReformaAcesso {
  app: boolean;
  kit: boolean;
  /** Slug do produto do Kit que a pessoa tem (abre as aulas com os arquivos). */
  kitSlug: string | null;
  kitOfertaUrl: string | null;
  armazenamento: "supabase" | "local";
}

function lista(valor: string | undefined): string[] {
  return String(valor || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function areaDoApp(): string {
  return (process.env.REFORMA_APP_AREA_SLUG || "reforma").trim().toLowerCase();
}

export function calcularAcesso(args: {
  areaSlug: string;
  produtos: { slug: string; owned: boolean }[];
  admin: boolean;
  env?: Record<string, string | undefined>;
}): ReformaAcesso | null {
  const env = args.env ?? process.env;
  if (args.areaSlug.toLowerCase() !== (env.REFORMA_APP_AREA_SLUG || "reforma").trim().toLowerCase()) return null;
  const slugsApp = lista(env.REFORMA_APP_PRODUCT_SLUGS);
  const slugsKit = lista(env.REFORMA_KIT_PRODUCT_SLUGS);
  const meus = args.produtos.filter((p) => p.owned).map((p) => p.slug.toLowerCase());
  const kitDele = meus.find((s) => slugsKit.includes(s)) ?? null;
  let app = meus.some((s) => slugsApp.includes(s)) || kitDele !== null || args.admin;
  let kit = kitDele !== null || args.admin;
  const dev = env.NODE_ENV !== "production" ? (env.REFORMA_APP_DEV_LIBERAR || "").toLowerCase() : "";
  if (dev === "app" || dev === "app+kit") app = true;
  if (dev === "app+kit") kit = true;
  return {
    app,
    kit,
    kitSlug: kitDele,
    kitOfertaUrl: env.REFORMA_KIT_OFERTA_URL?.trim() || null,
    armazenamento: (env.REFORMA_APP_ARMAZENAMENTO || "supabase").trim().toLowerCase() === "local" ? "local" : "supabase",
  };
}
