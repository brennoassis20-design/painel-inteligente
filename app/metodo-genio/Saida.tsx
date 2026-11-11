"use client";

import { useEffect, useRef, useState } from "react";
import { DOWNSELL } from "./oferta";

// Downsell de saída (11/11/2026): só para quem já viu o preço (#oferta) ou foi ao checkout.
// 1º passo: Método Gênio R$ 197 por 6 meses de painel. "Não quero" → 2º passo: Pacote 7 produtos R$ 27.
// Abre quando o mouse sai pelo topo (computador) ou quando a pessoa volta do checkout sem comprar.
// Uma vez por sessão. Os links têm data-checkout: o Rastreio.tsx repassa a origem da visita (UTMs).
const VISTO = "mg-saida-vista";
const FOI = "mg-foi-checkout";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

export function Saida() {
  const [passo, setPasso] = useState<0 | 1 | 2>(0);
  const viuPreco = useRef(false);
  const foiAoCheckout = useRef(false);

  useEffect(() => {
    function jaViu() {
      try {
        return window.sessionStorage.getItem(VISTO) === "1";
      } catch {
        return false;
      }
    }

    function abrir(motivo: string) {
      if (!viuPreco.current && !foiAoCheckout.current) return;
      if (jaViu()) return;
      try {
        window.sessionStorage.setItem(VISTO, "1");
      } catch {
        // sem sessionStorage: abre mesmo assim, só uma vez nesta página
      }
      viuPreco.current = false;
      foiAoCheckout.current = false;
      setPasso(1);
      window.fbq?.("trackCustom", "SaidaOferta", { passo: "197", motivo });
    }

    const oferta = document.getElementById("oferta");
    const observador = new IntersectionObserver((itens) => {
      if (itens.some((item) => item.isIntersecting)) viuPreco.current = true;
    });
    if (oferta) observador.observe(oferta);

    function saiuPeloTopo(event: MouseEvent) {
      if (event.clientY <= 0 && !event.relatedTarget) abrir("topo");
    }

    function cliqueCheckout(event: MouseEvent) {
      const alvo = (event.target as HTMLElement).closest?.("a[data-checkout]");
      if (alvo && !alvo.closest(".mg-saida")) {
        foiAoCheckout.current = true;
        try {
          window.sessionStorage.setItem(FOI, "1");
        } catch {
          // segue só com a memória da página
        }
      }
    }

    // Voltou do checkout (aba ou botão voltar) sem comprar.
    function voltou() {
      if (document.visibilityState === "visible" && foiAoCheckout.current) abrir("voltou-checkout");
    }
    function voltouCache(event: PageTransitionEvent) {
      if (event.persisted && foiAoCheckout.current) abrir("voltou-checkout");
    }

    // Voltou do checkout e o navegador recarregou a página (sem cache de voltar).
    try {
      if (window.sessionStorage.getItem(FOI) === "1") {
        window.sessionStorage.removeItem(FOI);
        foiAoCheckout.current = true;
        abrir("voltou-checkout");
      }
    } catch {
      // sem sessionStorage
    }

    document.documentElement.addEventListener("mouseleave", saiuPeloTopo);
    document.addEventListener("click", cliqueCheckout, true);
    document.addEventListener("visibilitychange", voltou);
    window.addEventListener("pageshow", voltouCache);
    return () => {
      observador.disconnect();
      document.documentElement.removeEventListener("mouseleave", saiuPeloTopo);
      document.removeEventListener("click", cliqueCheckout, true);
      document.removeEventListener("visibilitychange", voltou);
      window.removeEventListener("pageshow", voltouCache);
    };
  }, []);

  useEffect(() => {
    if (!passo) return;
    function esc(event: KeyboardEvent) {
      if (event.key === "Escape") setPasso(0);
    }
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [passo]);

  function recusar197() {
    setPasso(2);
    window.fbq?.("trackCustom", "SaidaOferta", { passo: "pacote27" });
  }

  // Sempre no DOM (escondido) para o Rastreio.tsx pôr as UTMs nos links ao abrir a página.
  return (
    <div
      className="mg-saida"
      hidden={!passo}
      role="dialog"
      aria-modal="true"
      aria-labelledby="mg-saida-titulo"
      onClick={(event) => {
        if (event.target === event.currentTarget) setPasso(0);
      }}
    >
      <div className="mg-saida-caixa">
        <button type="button" className="mg-saida-fechar" aria-label="Fechar" onClick={() => setPasso(0)}>
          ×
        </button>

        <div hidden={passo !== 1}>
          <p className="mg-saida-tag">Espera, antes de sair</p>
          <h2 id="mg-saida-titulo">
            Comece com 6 meses por <span>R$ {DOWNSELL.preco}</span>
          </h2>
          <p>
            Se R$ {DOWNSELL.precoCheio} pesou agora, leve o Método Gênio com <strong>6 meses de Painel Inteligente</strong>{" "}
            (até 30 produtos completos) e <strong>todas as aulas</strong>, com a mesma garantia.
          </p>
          <ul>
            <li>Produto em PDF, página de vendas e anúncios prontos</li>
            <li>Até 5 produtos por mês durante 6 meses</li>
            <li>Preço só nesta janela: fechou, volta para R$ {DOWNSELL.precoCheio}</li>
          </ul>
          <a className="mg-cta mg-saida-cta" href={DOWNSELL.checkout} data-checkout="saida-197">
            Quero os 6 meses por R$ {DOWNSELL.preco}
          </a>
          <button type="button" className="mg-saida-nao" onClick={recusar197}>
            Não, obrigado
          </button>
        </div>

        <div hidden={passo !== 2}>
          <p className="mg-saida-tag">Última opção</p>
          <h2>
            Então comece pelo <span>Pacote 7 Produtos Prontos</span>
          </h2>
          <p>
            7 produtos digitais prontos para revender, cada um com página de vendas e textos de anúncio, por{" "}
            <strong>R$ {DOWNSELL.pacotePreco}</strong>.
          </p>
          <a className="mg-cta mg-saida-cta" href={DOWNSELL.pacote} data-checkout="saida-pacote27">
            Ver o Pacote por R$ {DOWNSELL.pacotePreco}
          </a>
          <button type="button" className="mg-saida-nao" onClick={() => setPasso(0)}>
            Não, obrigado
          </button>
        </div>
      </div>
    </div>
  );
}
