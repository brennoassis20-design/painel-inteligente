"use client";

import { useState } from "react";
import { PRECO_MENSAL, PRECO_VITALICIO, TOTAL_MENSAL_12_MESES, textosVitalicio, type OfertasChama } from "@/lib/chama-acesa/precos";

type Plano = "vitalicio" | "mensal";

/** As duas formas de continuar: vitalício em destaque (padrão) e mensal. Sem links (página de vendas) mostra só os preços. */
export function OfertasBloco({ ofertas, hrefs, onClick }: { ofertas: OfertasChama; hrefs?: { vitalicio: string | null; mensal: string | null }; onClick?: (plano: Plano) => void }) {
  const t = textosVitalicio(ofertas.parcelaVitalicio);
  const [plano, setPlano] = useState<Plano>("vitalicio");
  const href = hrefs?.[plano];
  return (
    <div className={`ch-ofertas${hrefs ? "" : " ch-sem-links"}`}>
      <div role="radiogroup" aria-label="Escolha seu plano" style={{ display: "grid", gap: 10 }}>
        <label className="ch-plano vit" data-plano="vitalicio">
          <input type="radio" name="plano-chama" value="vitalicio" checked={plano === "vitalicio"} onChange={() => setPlano("vitalicio")} />
          <span className="selo">Melhor valor</span>
          <span className="nm">Vitalício</span>
          <span className="grande">{t.grande}</span>
          <span className="ap">{t.apoio === "pagamento único" ? "Pagamento único, use para sempre." : `${t.apoio}. Paga uma vez, usa para sempre.`}</span>
          <span className="ap2">No mensal, 12 meses dão {TOTAL_MENSAL_12_MESES}.</span>
        </label>
        <label className="ch-plano" data-plano="mensal">
          <input type="radio" name="plano-chama" value="mensal" checked={plano === "mensal"} onChange={() => setPlano("mensal")} />
          <span className="nm">Mensal</span>
          <span className="ap">{PRECO_MENSAL} por mês · cancele quando quiser</span>
        </label>
      </div>
      {hrefs && (href ? (
        <a className="ch-btn ch-btn-grande" href={href} target="_blank" rel="noreferrer" onClick={() => onClick?.(plano)}>
          {plano === "vitalicio" ? "Continuar com o vitalício" : "Continuar com o mensal"}
        </a>
      ) : (
        <p className="ch-nota">Este link ainda não foi configurado.</p>
      ))}
      <p className="ch-pag-rodape">A Bíblia, os planos de leitura e seu histórico continuam grátis.</p>
    </div>
  );
}

export const TEXTO_VITALICIO_CURTO = `${PRECO_VITALICIO} uma vez, para sempre`;
