import type { Metadata, Viewport } from "next";
import "./membros.css";

export const metadata: Metadata = {
  title: "Gênio Play",
  description: "Sua área de membros: aulas, produtos e novidades num lugar só.",
  robots: { index: false, follow: false },
  manifest: "/api/membros/manifest",
  icons: { icon: "/membros/app/icone-192.png", apple: "/membros/app/apple-touch-icon.png" },
  appleWebApp: { capable: true, title: "Gênio Play", statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false },
  // iPhones com iOS antigo só abrem em tela cheia com a tag antiga.
  other: { "apple-mobile-web-app-capable": "yes" },
};

export const viewport: Viewport = {
  themeColor: "#0A0C12",
  viewportFit: "cover",
};

export const dynamic = "force-dynamic";

// O pixel da Meta é ligado pela própria tela, com o id da área do endereço (cada produtor mede a dele).
export default function MembrosLayout({ children }: { children: React.ReactNode }) {
  return children;
}
