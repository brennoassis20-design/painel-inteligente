"use client";

import { PRECO_MENSAL, PRECO_VITALICIO, textosVitalicio, type OfertasChama } from "@/lib/chama-acesa/precos";

/** As duas formas de continuar: vitalício em destaque e mensal. Sem links (página de vendas) mostra só o preço. */
export function OfertasBloco({ ofertas, hrefs, onClick }: { ofertas: OfertasChama; hrefs?: { vitalicio: string | null; mensal: string | null }; onClick?: (plano: "vitalicio" | "mensal") => void }) {
  const t = textosVitalicio(ofertas.parcelaVitalicio);
  const botao = (plano: "vitalicio" | "mensal", rotulo: string, claro: boolean) => {
    const href = hrefs?.[plano];
    if (!hrefs) return null;
    if (!href) return <p className="ch-nota">Este link ainda não foi configurado.</p>;
    return <a className={`ch-btn ch-btn-grande${claro ? " ch-btn-claro" : ""}`} href={href} target="_blank" rel="noreferrer" onClick={() => onClick?.(plano)}>{rotulo}</a>;
  };
  return (
    <div className="ch-ofertas">
      <div className="ch-card ch-oferta ch-oferta-vitalicio" data-plano="vitalicio">
        <span className="ch-etiqueta">Vitalício</span>
        <p className="ch-oferta-preco">{t.grande}</p>
        <p className="ch-suave">{t.apoio}</p>
        <p className="ch-oferta-selo">Sai mais barato que a mensalidade</p>
        {botao("vitalicio", "Quero o vitalício", false)}
      </div>
      <div className="ch-card ch-oferta-mensal" data-plano="mensal">
        <span className="ch-etiqueta">Mensal</span>
        <p className="ch-oferta-preco menor">{PRECO_MENSAL}/mês</p>
        <p className="ch-suave">Cancele quando quiser.</p>
        {botao("mensal", "Assinar por mês", true)}
      </div>
    </div>
  );
}

export const TEXTO_VITALICIO_CURTO = `${PRECO_VITALICIO} uma vez, para sempre`;
