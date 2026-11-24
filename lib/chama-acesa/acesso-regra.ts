// Regra pura (sem banco): quem usa o Chama Acesa e quem já pagou.
//   CHAMA_AREA_SLUG            área onde o app existe (padrão: chama-acesa)
//   CHAMA_PRODUCT_SLUGS        slugs dos produtos que liberam os 21 dias (compra aprovada no webhook Cakto)
//   CHAMA_CHECKOUT_URL         checkout Cakto mostrado ao tentar abrir o dia 4 sem compra
//   CHAMA_365_URL              oferta "Chama Acesa 365" mostrada ao fim do dia 21 (vazio = não mostra)
//   CHAMA_ARMAZENAMENTO        "supabase" (padrão) ou "local" (navegador, enquanto a migration não foi aplicada)
//   CHAMA_DEV_LIBERAR          só fora de produção: "pago" libera tudo para qualquer logado
// Quem está logado na área (cadastro grátis) tem os dias 1 a 3. O dono (admin da área) vê tudo.
export interface ChamaAcesso {
  app: boolean;
  pago: boolean;
  checkoutUrl: string | null;
  oferta365Url: string | null;
  armazenamento: "supabase" | "local";
}

function lista(valor: string | undefined): string[] {
  return String(valor || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function areaDoChama(env: Record<string, string | undefined> = process.env): string {
  return (env.CHAMA_AREA_SLUG || "chama-acesa").trim().toLowerCase();
}

function urlSegura(valor: string | undefined): string | null {
  const v = (valor || "").trim();
  return /^https:\/\//i.test(v) ? v : null;
}

export function calcularAcesso(args: {
  areaSlug: string;
  produtos: { slug: string; owned: boolean }[];
  admin: boolean;
  env?: Record<string, string | undefined>;
}): ChamaAcesso | null {
  const env = args.env ?? process.env;
  if (args.areaSlug.toLowerCase() !== areaDoChama(env)) return null;
  const slugs = lista(env.CHAMA_PRODUCT_SLUGS);
  let pago = args.admin || args.produtos.some((p) => p.owned && slugs.includes(p.slug.toLowerCase()));
  if (env.NODE_ENV !== "production" && (env.CHAMA_DEV_LIBERAR || "").toLowerCase() === "pago") pago = true;
  return {
    app: true,
    pago,
    checkoutUrl: urlSegura(env.CHAMA_CHECKOUT_URL),
    oferta365Url: urlSegura(env.CHAMA_365_URL),
    armazenamento: (env.CHAMA_ARMAZENAMENTO || "supabase").trim().toLowerCase() === "local" ? "local" : "supabase",
  };
}
