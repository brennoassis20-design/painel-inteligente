// Dados da oferta do Método Gênio, usados na página de vendas, na página de links e no login.
export const OFERTA = {
  checkout: "https://pay.cakto.com.br/vfkrack_1203787",
  precoDe: "497",
  preco: "297",
  gdm: "https://groupdigitalmedia.com.br/",
  painel: "https://painelinteligente.bagencymidia.site/",
  kit: "https://kit.brennolimaoficial.com/",
  pacote: "https://produtos.kitsepromocoes.site/?pg=N",
  youtube: "https://www.youtube.com/@Brennolimaoficial2",
  pixelId: process.env.NEXT_PUBLIC_META_PIXEL_ID || "1134983832285410",
  // Originais em ~/Documents/Brenno Fotos.
  foto: "/mg/brenno.jpg" as string,
  avatar: "/mg/brenno-avatar.jpg",
  foto2: "/mg/brenno-familia.jpg" as string,
};

// VSL do Método Gênio (versão 1.2x). Os arquivos (HLS em 3 qualidades + MP4 leve + capa) ficam no site
// estático produtos.kitsepromocoes.site/v/genio (pasta do cofre "Páginas de VSL" explica como gerar).
// mostrarEm: "O Método Gênio custa R$ 497" começa em 563,3 s (conferido no arquivo final) → a carta abre ~5 s antes.
export const VSL_GENIO = {
  base: process.env.NEXT_PUBLIC_VSL_GENIO_BASE || "https://produtos.kitsepromocoes.site/v/genio",
  mostrarEm: 558,
};

// Todo link sai rastreado: utm_source = origem, utm_medium = tipo de lugar,
// utm_campaign = produto, utm_content = botão.
export function rastreado(
  url: string,
  source: string,
  medium: string,
  campaign: string,
  content: string,
  extra: Record<string, string> = {},
) {
  const params = new URLSearchParams({
    utm_source: source,
    utm_medium: medium,
    utm_campaign: campaign,
    utm_content: content,
    ...extra,
  });
  return `${url}${url.includes("?") ? "&" : "?"}${params.toString()}`;
}

// Link do checkout com origem padrão (quando a pessoa chegou sem UTM).
// O Rastreio.tsx troca pela origem real da visita assim que a página abre.
export function checkoutLink(botao: string) {
  return rastreado(OFERTA.checkout, "direto", "pagina-vendas", "metodo-genio", botao, {
    src: "direto",
    sck: `pagina-vendas-${botao}`,
  });
}
