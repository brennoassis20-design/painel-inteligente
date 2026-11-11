"use client";

import { useEffect, useState, type ReactNode } from "react";

export const EVENTO_REVELA = "vsl-revela";
export const CHAVE_REVELA = "vsl_genio_ok";

// Esconde a carta na página /vsl até o vídeo chegar perto da oferta (o VslPlayer avisa pelo evento).
// Quem já chegou na oferta antes (mesmo navegador) vê tudo aberto ao voltar.
// O conteúdo fica no HTML desde o início (escondido), para o Rastreio já ajustar os links do checkout.
export function Revelar({ ativo = true, children }: { ativo?: boolean; children: ReactNode }) {
  const [aberto, setAberto] = useState(!ativo);

  useEffect(() => {
    if (!ativo) return;
    const abre = () => setAberto(true);
    try {
      if (window.localStorage.getItem(CHAVE_REVELA)) requestAnimationFrame(abre);
    } catch {
      // sem localStorage: espera o vídeo
    }
    window.addEventListener(EVENTO_REVELA, abre);
    return () => window.removeEventListener(EVENTO_REVELA, abre);
  }, [ativo]);

  if (!ativo) return <>{children}</>;
  return (
    <div hidden={!aberto} className={aberto ? "mg-revela" : undefined}>
      {children}
    </div>
  );
}
