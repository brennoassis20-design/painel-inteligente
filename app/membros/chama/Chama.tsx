"use client";

import { nivelChama } from "@/lib/chama-acesa/regras";
import { CHAMA_ALTURA, CHAMA_EXTERNA, CHAMA_INTERNA, CHAMA_LARGURA } from "@/lib/chama-acesa/chama-svg";

// Chama em SVG (sem biblioteca). O tamanho, o brilho e as chamas laterais crescem com a sequência; 0 = brasa apagada.
export function Chama({ dias, acendendo, tamanho }: { dias: number; acendendo?: boolean; tamanho?: number }) {
  const nivel = nivelChama(dias);
  const px = tamanho ?? 84 + nivel * 26;
  const id = `ch-${nivel}-${tamanho ?? 0}`;
  return (
    <span className={`ch-chama n${nivel}${acendendo ? " acendendo" : ""}`} style={{ width: px * (nivel >= 3 ? 1.9 : 1), height: px * 1.3 }} aria-hidden="true">
      {nivel >= 3 && <Uma classe="lado esq" id={`${id}a`} apagada={false} />}
      {nivel >= 3 && <Uma classe="lado dir" id={`${id}b`} apagada={false} />}
      <Uma classe="centro" id={id} apagada={nivel === 0} />
    </span>
  );
}

function Uma({ classe, id, apagada }: { classe: string; id: string; apagada: boolean }) {
  return (
    <svg className={`ch-uma ${classe}`} viewBox={`0 0 ${CHAMA_LARGURA} ${CHAMA_ALTURA}`} focusable="false">
      <defs>
        <linearGradient id={`${id}-o`} x1="0" y1="0" x2="0" y2="1">
          {apagada ? (
            <>
              <stop offset="0" stopColor="#5b4a45" />
              <stop offset="1" stopColor="#2c2322" />
            </>
          ) : (
            <>
              <stop offset="0" stopColor="#FFD36B" />
              <stop offset="0.5" stopColor="#FF8A1F" />
              <stop offset="1" stopColor="#E5421A" />
            </>
          )}
        </linearGradient>
        <linearGradient id={`${id}-i`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={apagada ? "#7a6760" : "#FFF3C4"} />
          <stop offset="1" stopColor={apagada ? "#4a3b37" : "#FFC247"} />
        </linearGradient>
      </defs>
      <path d={CHAMA_EXTERNA} fill={`url(#${id}-o)`} />
      <path className="ch-miolo" d={CHAMA_INTERNA} fill={`url(#${id}-i)`} />
    </svg>
  );
}
