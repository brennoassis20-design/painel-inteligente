"use client";

import { useEffect, useState } from "react";

const CHAVES = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "utm_id", "fbclid", "gclid", "src", "sck", "coupon"];
const GUARDA = "mg-origem";

type Origem = Record<string, string>;

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

function lerOrigem(): Origem {
  const atual = new URLSearchParams(window.location.search);
  const daUrl: Origem = {};
  CHAVES.forEach((chave) => {
    const valor = atual.get(chave);
    if (valor) daUrl[chave] = valor;
  });
  try {
    if (daUrl.utm_source) {
      window.sessionStorage.setItem(GUARDA, JSON.stringify(daUrl));
      return daUrl;
    }
    const salva = window.sessionStorage.getItem(GUARDA);
    if (salva) return JSON.parse(salva) as Origem;
  } catch {
    // navegador sem sessionStorage: segue só com a URL
  }
  return daUrl;
}

// Repassa a origem da visita (UTMs do anúncio, da bio, do login...) para todos os
// botões de checkout, e marca em sck qual botão foi clicado.
// Cupons de campanha que mostram uma faixa no topo enquanto valem.
const PRESENTES: Record<string, { texto: string; ate: string }> = {
  PRESENTE: { texto: "🎁 Seu presente está ativo: R$ 100 de desconto já aplicado no pagamento. Só hoje, até 23h59.", ate: "2026-11-09T23:59:59-03:00" },
};

export function Rastreio({ valor }: { valor: string }) {
  const [faixa, setFaixa] = useState("");
  useEffect(() => {
    const origem = lerOrigem();
    const presente = PRESENTES[(origem.coupon || "").toUpperCase()];
    if (presente && Date.now() < new Date(presente.ate).getTime()) setFaixa(presente.texto);
    const fonte = origem.utm_source || (document.referrer ? new URL(document.referrer).hostname : "direto");

    document.querySelectorAll<HTMLAnchorElement>("a[data-checkout]").forEach((link) => {
      const botao = link.dataset.checkout || "botao";
      const url = new URL(link.href);
      url.searchParams.set("utm_source", fonte);
      url.searchParams.set("utm_medium", origem.utm_medium || "pagina-vendas");
      url.searchParams.set("utm_campaign", origem.utm_campaign || "metodo-genio");
      url.searchParams.set("utm_content", origem.utm_content || botao);
      ["utm_term", "utm_id", "fbclid", "gclid", "coupon"].forEach((chave) => {
        if (origem[chave]) url.searchParams.set(chave, origem[chave]);
      });
      url.searchParams.set("src", origem.src || fonte);
      url.searchParams.set("sck", origem.sck || `pagina-vendas-${botao}`);
      link.href = url.toString();
    });

    function clique(event: MouseEvent) {
      const alvo = (event.target as HTMLElement).closest?.("a[data-checkout]");
      if (alvo && window.fbq) window.fbq("track", "InitiateCheckout", { value: Number(valor), currency: "BRL" });
    }
    document.addEventListener("click", clique);
    return () => document.removeEventListener("click", clique);
  }, [valor]);

  if (!faixa) return null;
  return (
    <div
      role="status"
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        padding: "10px 16px",
        textAlign: "center",
        fontWeight: 600,
        fontSize: 14,
        lineHeight: 1.4,
        color: "#fff",
        background: "linear-gradient(90deg, #16a34a, #15803d)",
      }}
    >
      {faixa}
    </div>
  );
}
