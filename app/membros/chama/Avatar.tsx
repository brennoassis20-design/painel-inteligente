"use client";

import { inicialDe } from "@/lib/chama-acesa/conta";

/** Foto redonda; sem foto, a inicial do nome sobre fundo de chama. Imagem de outro endereço (Storage) ou data URL. */
export function Avatar({ nome, foto, tamanho = 36, anonimo = false }: { nome: string; foto?: string | null; tamanho?: number; anonimo?: boolean }) {
  const estilo = { width: tamanho, height: tamanho, fontSize: Math.round(tamanho * 0.45) };
  if (foto && !anonimo) {
    // eslint-disable-next-line @next/next/no-img-element -- foto pequena (256x256) vinda do Storage público ou data URL
    return <img className="ch-avatar" src={foto} alt="" width={tamanho} height={tamanho} style={estilo} loading="lazy" />;
  }
  return <span className={`ch-avatar ch-avatar-ini${anonimo ? " anonimo" : ""}`} style={estilo} aria-hidden="true">{anonimo ? "?" : inicialDe(nome)}</span>;
}
