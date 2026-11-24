import type { Metadata, Viewport } from "next";
import { getArea } from "@/lib/membros";
import { appIcons } from "@/lib/membros-icones";
import { areaDoChama } from "@/lib/chama-acesa/acesso-regra";

// Cabeçalho por área (no servidor): o iPhone instala com o apple-touch-icon e o nome que vêm daqui.
type Props = { params: Promise<{ area: string }>; children: React.ReactNode };

export async function generateMetadata({ params }: Pick<Props, "params">): Promise<Metadata> {
  const slug = String((await params).area || "").toLowerCase().replace(/[^a-z0-9-]/g, "");
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
  const area = await getArea(slug).catch(() => null);
  return { themeColor: area?.bg_color || "#0A0C12", viewportFit: "cover" };
}

export default function AreaLayout({ children }: Props) {
  return children;
}
