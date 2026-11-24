import type { Metadata, Viewport } from "next";
import { CHAMA_ICONES, CHAMA_NOME } from "@/lib/chama-acesa/acesso-regra";
import { COR_DO_TEMA, SCRIPT_TEMA, TEMA_PADRAO } from "@/lib/chama-acesa/tema";

// Bancada: mesmo cabeçalho do app de verdade (título, manifest, favicon e apple-touch-icon do Chama Acesa).
export const metadata: Metadata = {
  title: CHAMA_NOME,
  manifest: "/api/membros/manifest?area=chama-dev",
  icons: { icon: CHAMA_ICONES.i192, shortcut: CHAMA_ICONES.i192, apple: [{ url: CHAMA_ICONES.i180, sizes: "180x180", type: "image/png" }] },
  appleWebApp: { capable: true, title: CHAMA_NOME, statusBarStyle: "black-translucent" },
  other: { "apple-mobile-web-app-capable": "yes", "mobile-web-app-capable": "yes" },
};
export const viewport: Viewport = { themeColor: COR_DO_TEMA[TEMA_PADRAO], viewportFit: "cover" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: SCRIPT_TEMA }} />
      {children}
    </>
  );
}
