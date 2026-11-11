import type { Metadata } from "next";
import { Pagina, SITE } from "./Pagina";

// Página v2 (08/11/2026): carta longa no molde da página do Pacote 27, sem botão na primeira dobra.
// O conteúdo fica em Pagina.tsx (a mesma carta abre na /vsl depois do vídeo).
// Copy: cofre, Projetos/Página de vendas Método Gênio v2 (copy).md

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: "Método Gênio | Faça o pedido. Seu produto sai pronto.",
  description:
    "Escolha um nicho que já vende e o Painel Inteligente entrega o produto digital, a página de vendas e os anúncios prontos para vender com o seu nome.",
  // Os links com ?utm= dos anúncios contam como esta mesma página.
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: SITE,
    locale: "pt_BR",
    siteName: "Método Gênio",
    title: "Método Gênio | Faça o pedido. Seu produto sai pronto.",
    description: "Você faz o pedido. O gênio entrega o produto, a página de vendas e os anúncios prontos.",
    images: [{ url: "/mg/capa.jpg", width: 1400, height: 1400, alt: "Método Gênio" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Método Gênio | Faça o pedido. Seu produto sai pronto.",
    description: "Você faz o pedido. O gênio entrega o produto, a página de vendas e os anúncios prontos.",
    images: ["/mg/capa.jpg"],
  },
};

export default function MetodoGenioPage() {
  return <Pagina />;
}
