import type { Metadata } from "next";
import { Pagina, SITE } from "../Pagina";

// genio.brennolimaoficial.com/vsl (11/11/2026): headline + VSL tocando no mudo; o toque liga o som e recomeça.
// A carta de vendas (a mesma da página principal) abre sozinha alguns segundos antes da oferta.
// Checkout sai com sck=vsl-<botão>; pixel com content_category=pagina-vsl.
export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: "Método Gênio | Assista: seu produto sai pronto",
  description: "Você faz o pedido. O gênio entrega o produto, a página de vendas e os anúncios prontos.",
  alternates: { canonical: "/" },
  robots: { index: false, follow: true },
  openGraph: {
    type: "website",
    url: `${SITE}/vsl`,
    locale: "pt_BR",
    siteName: "Método Gênio",
    title: "Método Gênio | Assista: seu produto sai pronto",
    description: "Você faz o pedido. O gênio entrega o produto, a página de vendas e os anúncios prontos.",
    images: [{ url: "/mg/capa.jpg", width: 1400, height: 1400, alt: "Método Gênio" }],
  },
};

export default function MetodoGenioVslPage() {
  return <Pagina vsl />;
}
