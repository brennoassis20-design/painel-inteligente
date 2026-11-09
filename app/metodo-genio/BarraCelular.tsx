"use client";

import { useEffect, useState } from "react";
import { Icon } from "../icons";

// Barra de compra do celular. Só aparece depois que a pessoa chegou na conta (#a-conta):
// a primeira dobra e o começo da carta ficam sem botão.
export function BarraCelular({ href, precoDe, preco }: { href: string; precoDe: string; preco: string }) {
  const [ver, setVer] = useState(false);

  useEffect(() => {
    const alvo = document.getElementById("a-conta");
    if (!alvo) return;
    function checa() {
      if (alvo && alvo.getBoundingClientRect().top < window.innerHeight * 0.6) setVer(true);
    }
    checa();
    window.addEventListener("scroll", checa, { passive: true });
    return () => window.removeEventListener("scroll", checa);
  }, []);

  return (
    <div className={`mg-sticky${ver ? " is-on" : ""}`} aria-hidden={!ver}>
      <div>
        <small>de R$ {precoDe}</small>
        <strong>R$ {preco}</strong>
      </div>
      <a className="mg-cta" href={href} data-checkout="barra-celular" tabIndex={ver ? 0 : -1}>
        Quero o meu
        <Icon name="arrow" />
      </a>
    </div>
  );
}
