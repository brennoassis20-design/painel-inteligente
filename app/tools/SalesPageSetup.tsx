"use client";

import { useState } from "react";
import { cleanPixelId, defaultOferta, type OfertaConfig } from "@/lib/sales-page";
import { Icon } from "../icons";

// Preço, checkout e pixel de cada projeto: ficam no navegador e entram no HTML da página
// (download avulso e ZIP), para publicar sem mexer em código. Quem usa passa key={projectId}
// para recarregar os valores ao trocar de projeto.
const storagePrefix = "painel-inteligente-oferta:";

export function readOferta(projectId: string): OfertaConfig {
  if (typeof window === "undefined" || !projectId) return defaultOferta;
  try {
    return { ...defaultOferta, ...JSON.parse(window.localStorage.getItem(storagePrefix + projectId) || "{}") };
  } catch {
    return defaultOferta;
  }
}

export function SalesPageSetup({
  projectId,
  onDownload,
}: {
  projectId: string;
  onDownload: (oferta: OfertaConfig) => void;
}) {
  const [oferta, setOferta] = useState<OfertaConfig>(() => readOferta(projectId));
  const [bonusText, setBonusText] = useState(() => readOferta(projectId).bonus.join("\n"));

  function update(next: OfertaConfig) {
    setOferta(next);
    try {
      window.localStorage.setItem(storagePrefix + projectId, JSON.stringify(next));
    } catch {
      // Sem armazenamento local: os valores valem até fechar a página.
    }
  }

  const checkoutOk = /^https?:\/\//i.test(oferta.checkout.trim());
  const pixelOk = Boolean(cleanPixelId(oferta.pixel));

  function field(key: "preco" | "precoDe" | "checkout" | "pixel", label: string, placeholder: string, prefix = "", hint = "") {
    return (
      <label className="pi-label pi-calc-field">
        {label}
        <span className="pi-calc-input">
          {prefix && <i>{prefix}</i>}
          <input
            value={oferta[key]}
            inputMode={key === "preco" || key === "precoDe" || key === "pixel" ? "numeric" : "url"}
            placeholder={placeholder}
            onChange={(event) => update({ ...oferta, [key]: event.target.value })}
          />
        </span>
        {hint && <small>{hint}</small>}
      </label>
    );
  }

  return (
    <div className="pi-card pi-page-setup">
      <div className="pi-page-setup-head">
        <div>
          <h3 className="pi-card-title">Página de vendas pronta para publicar</h3>
          <p>Preencha uma vez. A página já sai com o preço, os botões ligados ao checkout e o pixel instalado.</p>
        </div>
        <div className="pi-page-setup-status">
          <span className={checkoutOk ? "ok" : ""}><span className="pi-dot" />Checkout</span>
          <span className={pixelOk ? "ok" : ""}><span className="pi-dot" />Pixel</span>
        </div>
      </div>

      <div className="pi-form-grid">
        {field("preco", "Preço", "19,90", "R$")}
        {field("precoDe", "Preço “de” (opcional)", "", "R$", "Só se for um preço real; vazio esconde")}
      </div>
      {field("checkout", "Link do checkout", "https://pay.cakto.com.br/...", "", "Copie o link de pagamento do produto na sua plataforma")}
      {field(
        "pixel",
        "ID do pixel da Meta",
        "Ex.: 1234567890123456",
        "",
        oferta.pixel && !pixelOk
          ? "Cole só os números do ID do pixel"
          : "Gerenciador de Eventos → seu pixel → ID. Coloque o mesmo pixel na plataforma de pagamento para contar as compras",
      )}
      <label className="pi-label pi-calc-field">
        Bônus (opcional, um por linha)
        <textarea
          className="pi-textarea"
          rows={2}
          value={bonusText}
          placeholder="Só se você realmente entregar. Ex.: Lista de compras da semana"
          onChange={(event) => {
            setBonusText(event.target.value);
            update({ ...oferta, bonus: event.target.value.split("\n").map((b) => b.trim()).filter(Boolean) });
          }}
        />
      </label>

      <div className="pi-actions">
        <button type="button" className="pi-btn-grad" onClick={() => onDownload(oferta)}>
          <Icon name="download" />
          Baixar página pronta
        </button>
      </div>
      <small className="pi-page-setup-note">
        Depois é só arrastar o arquivo no Netlify Drop (app.netlify.com/drop) para ter o link da página. O ZIP do projeto também sai com estes valores.
      </small>
    </div>
  );
}
