import { getSettings } from "@/lib/membros";

// Manifesto do app (instalar na tela inicial). Em membros.bagencymidia.site o app abre na raiz;
// no endereço do painel, em /membros.
export async function GET(request: Request) {
  const host = new URL(request.url).host;
  const own = host.startsWith("membros.");
  const base = own ? "/" : "/membros";
  const settings = await getSettings().catch(() => null);
  const name = settings?.brand_name || "Gênio Play";
  return Response.json(
    {
      id: base,
      name,
      short_name: name,
      description: "Suas aulas, materiais e novidades num lugar só.",
      lang: "pt-BR",
      start_url: own ? "/?app=1" : "/membros?app=1",
      scope: own ? "/" : "/membros",
      display: "standalone",
      orientation: "portrait",
      background_color: "#0A0C12",
      theme_color: "#0A0C12",
      icons: [
        { src: "/membros/app/icone-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
        { src: "/membros/app/icone-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
        { src: "/membros/app/icone-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      ],
    },
    { headers: { "Content-Type": "application/manifest+json", "Cache-Control": "public, max-age=3600" } },
  );
}
