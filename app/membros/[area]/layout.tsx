import type { Metadata, Viewport } from "next";
import { getArea } from "@/lib/membros";
import { appIcons } from "@/lib/membros-icones";
import { areaDoChama, CHAMA_COR, CHAMA_ICONES, CHAMA_NOME } from "@/lib/chama-acesa/acesso-regra";

// Chama Acesa: título, manifest, favicon e ícone do iPhone (apple-touch-icon 180) próprios, sem depender do cadastro da área.
function chamaMetadata(slug: string): Metadata {
  return {
    title: CHAMA_NOME,
    manifest: `/api/membros/manifest?area=${encodeURIComponent(slug)}`,
    icons: { icon: CHAMA_ICONES.i192, shortcut: CHAMA_ICONES.i192, apple: [{ url: CHAMA_ICONES.i180, sizes: "180x180", type: "image/png" }] },
    appleWebApp: { capable: true, title: CHAMA_NOME, statusBarStyle: "black-translucent" },
    other: { "apple-mobile-web-app-capable": "yes", "mobile-web-app-capable": "yes" },
  };
}

// Cabeçalho por área (no servidor): o iPhone instala com o apple-touch-icon e o nome que vêm daqui.
type Props = { params: Promise<{ area: string }>; children: React.ReactNode };

export async function generateMetadata({ params }: Pick<Props, "params">): Promise<Metadata> {
  const slug = String((await params).area || "").toLowerCase().replace(/[^a-z0-9-]/g, "");
  if (slug === areaDoChama()) return chamaMetadata(slug);
  const area = await getArea(slug).catch(() => null);
  if (!area) return {};
  const icons = appIcons(area.slug);
  // Na área do Chama Acesa o título da aba e do app instalado é sempre "Chama Acesa" (não "Gênio Play").
  const nome = area.slug === areaDoChama() ? "Chama Acesa" : area.brand_name;
  return {
    title: nome,
    manifest: `/api/membros/manifest?area=${encodeURIComponent(area.slug)}`,
    icons: { icon: icons.i192, apple: icons.apple },
    appleWebApp: { capable: true, title: nome, statusBarStyle: "black-translucent" },
  };
}

export async function generateViewport({ params }: Pick<Props, "params">): Promise<Viewport> {
  const slug = String((await params).area || "").toLowerCase().replace(/[^a-z0-9-]/g, "");
  if (slug === areaDoChama()) return { themeColor: CHAMA_COR, viewportFit: "cover" };
  const area = await getArea(slug).catch(() => null);
  return { themeColor: area?.bg_color || "#0A0C12", viewportFit: "cover" };
}

export default function AreaLayout({ children }: Props) {
  return children;
}
