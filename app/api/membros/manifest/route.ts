import { getArea } from "@/lib/membros";
import { appIcons } from "@/lib/membros-icones";

// Manifesto do app (instalar na tela inicial). Em membros.bagencymidia.site o app abre na raiz;
// no endereço do painel, em /membros.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const own = url.host.startsWith("membros.");
  const slug = (url.searchParams.get("area") || "").toLowerCase().replace(/[^a-z0-9-]/g, "");
  const settings = await getArea(slug).catch(() => null);
  // Área de produtor: o app abre direto no endereço dela.
  const root = own ? "" : "/membros";
  const areaPath = settings && settings.id !== 1 ? `/${settings.slug}` : "";
  const base = `${root}${areaPath}` || "/";
  const name = settings?.brand_name || "Gênio Play";
  const icons = appIcons(settings?.slug);
  const bg = /^#[0-9a-f]{6}$/i.test(settings?.bg_color || "") ? settings!.bg_color : "#0A0C12";
  return Response.json(
    {
      id: base,
      name,
      short_name: name,
      description: "Suas aulas, materiais e novidades num lugar só.",
      lang: "pt-BR",
      start_url: `${root}${areaPath}/?app=1`.replace(/^\/\//, "/"),
      scope: own ? "/" : "/membros",
      display: "standalone",
      orientation: "portrait",
      background_color: bg,
      theme_color: bg,
      icons: [
        { src: icons.i192, sizes: "192x192", type: "image/png", purpose: "any" },
        { src: icons.i512, sizes: "512x512", type: "image/png", purpose: "any" },
        { src: icons.maskable, sizes: "512x512", type: "image/png", purpose: "maskable" },
      ],
    },
    { headers: { "Content-Type": "application/manifest+json", "Cache-Control": "public, max-age=3600" } },
  );
}
