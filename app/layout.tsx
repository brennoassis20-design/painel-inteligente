import type { Metadata, Viewport } from "next";
import { Sora } from "next/font/google";
import "./globals.css";
import "./genio.css";

const sora = Sora({
  subsets: ["latin"],
  variable: "--font-sora",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Painel Inteligente",
  description: "Faça o pedido e receba o produto digital completo, com página de vendas e copy.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#07061a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={sora.variable}>
      <body>{children}</body>
    </html>
  );
}
