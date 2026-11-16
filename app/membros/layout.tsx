import type { Metadata, Viewport } from "next";
import "./membros.css";

export const metadata: Metadata = {
  title: "Gênio Play",
  description: "Sua área de membros: aulas, produtos e novidades num lugar só.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#0A0C12",
};

export default function MembrosLayout({ children }: { children: React.ReactNode }) {
  return children;
}
