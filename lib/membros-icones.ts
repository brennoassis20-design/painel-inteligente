// Áreas com ícone de app próprio (public/membros/app/<slug>/). As demais usam o do Gênio Play.
const APP_ICONS = new Set(["reforma"]);

export function appIcons(slug?: string | null) {
  const dir = slug && APP_ICONS.has(slug) ? `/membros/app/${slug}` : "/membros/app";
  return {
    i192: `${dir}/icone-192.png`,
    i512: `${dir}/icone-512.png`,
    maskable: `${dir}/icone-maskable-512.png`,
    apple: `${dir}/apple-touch-icon.png`,
  };
}
