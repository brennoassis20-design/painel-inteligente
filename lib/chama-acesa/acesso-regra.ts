// Regra pura (sem banco): quem usa o Chama Acesa e quem já pagou.
//   CHAMA_AREA_SLUG            área onde o app existe (padrão: chama-acesa)
//   CHAMA_PRODUCT_SLUGS        slugs dos produtos que liberam o app além do dia 3 (compra ou assinatura em dia, via webhook Eduzz)
//   CHAMA_CHECKOUT_MENSAL_URL  checkout Eduzz da assinatura R$ 19,90/mês
//   CHAMA_CHECKOUT_VITALICIO_URL checkout Eduzz do vitalício R$ 147 em até 12x
//   CHAMA_PARCELA_VITALICIO    texto pronto da parcela, ex.: "12x de R$ 14,96" (não definida = "12x de R$ 15,20"; definida vazia = "R$ 147 à vista ou parcelado")
//   CHAMA_PRODUCT_MENSAL_SLUG  slug do produto da assinatura mensal (padrão: chama-acesa-mensal); só serve para mostrar o plano na Conta
//   CHAMA_LIGA_REAL_MINIMO     membros ativos na mesma liga na semana para trocar o ranking fictício pelo real (padrão 10)
//   CHAMA_CHECKOUT_URL         checkout antigo (pagamento único): só vale se as duas URLs novas não existirem
//   CHAMA_365_URL              oferta "Chama Acesa 365" mostrada ao fim do dia 21 (vazio = não mostra)
//   CHAMA_ARMAZENAMENTO        "supabase" (padrão) ou "local" (navegador, enquanto a migration não foi aplicada)
//   CHAMA_DEV_LIBERAR          só fora de produção: "pago" libera tudo para qualquer logado
// Quem está logado na área (cadastro grátis) tem os dias 1 a 3. O dono (admin da área) vê tudo.
import type { PlanoChama } from "./conta.ts";
import { PARCELA_PADRAO, type OfertasChama } from "./precos.ts";

export interface ChamaAcesso {
  app: boolean;
  pago: boolean;
  /** Qual acesso a pessoa tem: grátis, assinatura mensal, vitalício (qualquer outro produto pago) ou administrador. */
  plano: PlanoChama;
  /** A Bíblia é grátis para sempre: vale para qualquer logado na área, comprou ou não. */
  biblia: boolean;
  /** Link antigo (pagamento único). Só usado quando `ofertas` não tem nenhum link. */
  checkoutUrl: string | null;
  ofertas: OfertasChama;
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

/** Bíblia dentro do app: sempre liberada para quem está logado na área, sem compra, sem dia 4 trancado, sem prazo. */
export function bibliaLiberada(): boolean {
  return true;
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
  const mensal = (env.CHAMA_PRODUCT_MENSAL_SLUG || "chama-acesa-mensal").trim().toLowerCase();
  let pago = args.admin || args.produtos.some((p) => p.owned && slugs.includes(p.slug.toLowerCase()));
  if (env.NODE_ENV !== "production" && (env.CHAMA_DEV_LIBERAR || "").toLowerCase() === "pago") pago = true;
  const donoMensal = args.produtos.some((p) => p.owned && p.slug.toLowerCase() === mensal);
  const plano: PlanoChama = args.admin ? "admin" : !pago ? "gratis" : donoMensal && !args.produtos.some((p) => p.owned && slugs.includes(p.slug.toLowerCase()) && p.slug.toLowerCase() !== mensal) ? "mensal" : "vitalicio";
  return {
    app: true,
    pago,
    plano,
    biblia: bibliaLiberada(),
    checkoutUrl: urlSegura(env.CHAMA_CHECKOUT_URL),
    ofertas: { vitalicioUrl: urlSegura(env.CHAMA_CHECKOUT_VITALICIO_URL), mensalUrl: urlSegura(env.CHAMA_CHECKOUT_MENSAL_URL), parcelaVitalicio: env.CHAMA_PARCELA_VITALICIO === undefined ? PARCELA_PADRAO : env.CHAMA_PARCELA_VITALICIO.trim().slice(0, 40) || null },
    oferta365Url: urlSegura(env.CHAMA_365_URL),
    armazenamento: (env.CHAMA_ARMAZENAMENTO || "supabase").trim().toLowerCase() === "local" ? "local" : "supabase",
  };
}

/** Ícones oficiais do app (public/chama-acesa/): valem mesmo que a área no banco não tenha ícone. */
export const CHAMA_ICONES = { i180: "/chama-acesa/icone-180.png", i192: "/chama-acesa/icone-192.png", i512: "/chama-acesa/icone-512.png" };
export const CHAMA_COR = "#0a0f1f";
export const CHAMA_NOME = "Chama Acesa";
