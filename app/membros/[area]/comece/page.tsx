import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { areaDoChama } from "@/lib/chama-acesa/acesso-regra";
import { PARCELA_PADRAO } from "@/lib/chama-acesa/precos";
import { Comece } from "./Comece";

// Página de vendas curta do Chama Acesa (membros.bagencymidia.site/chama-acesa/comece). Só existe para a área do app; as outras áreas dão 404.
const TITULO = "Chama Acesa: 5 minutos por dia com Deus, em 21 dias";
const DESCRICAO = "App para criar o hábito de buscar a Deus todo dia: versículo, oração guiada e uma missão prática. Comece grátis, sem cartão.";

export const metadata: Metadata = {
  title: TITULO,
  description: DESCRICAO,
  robots: { index: true, follow: true },
  openGraph: { title: TITULO, description: DESCRICAO, type: "website", locale: "pt_BR", images: [{ url: "/chama-acesa/capa-1080.png", width: 1080, height: 1080, alt: "Chama Acesa" }] },
  twitter: { card: "summary_large_image", title: TITULO, description: DESCRICAO, images: ["/chama-acesa/capa-1080.png"] },
};

export default async function ComecePage({ params }: { params: Promise<{ area: string }> }) {
  const slug = String((await params).area || "").toLowerCase();
  if (slug !== areaDoChama()) notFound();
  const parcela = process.env.CHAMA_PARCELA_VITALICIO === undefined ? PARCELA_PADRAO : process.env.CHAMA_PARCELA_VITALICIO.trim().slice(0, 40) || null;
  return <Comece area={slug} parcelaVitalicio={parcela} />;
}
