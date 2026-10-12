import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Painel Inteligente",
  description:
    "Painel para criar produto digital, copy e pagina de vendas.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
