"use client";

import { useEffect } from "react";

const CHAVES = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "utm_id", "fbclid", "gclid", "src", "sck"];
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
export function Rastreio({ valor }: { valor: string }) {
  useEffect(() => {
    const origem = lerOrigem();
    const fonte = origem.utm_source || (document.referrer ? new URL(document.referrer).hostname : "direto");

    document.querySelectorAll<HTMLAnchorElement>("a[data-checkout]").forEach((link) => {
      const botao = link.dataset.checkout || "botao";
      const url = new URL(link.href);
      url.searchParams.set("utm_source", fonte);
      url.searchParams.set("utm_medium", origem.utm_medium || "pagina-vendas");
      url.searchParams.set("utm_campaign", origem.utm_campaign || "metodo-genio");
      url.searchParams.set("utm_content", origem.utm_content || botao);
      ["utm_term", "utm_id", "fbclid", "gclid"].forEach((chave) => {
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

  return null;
}
