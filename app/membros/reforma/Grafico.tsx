"use client";

import type { GraficoDados } from "@/lib/reforma-app/resultado";

function curto(v: number) {
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1).replace(".", ",")} mi`;
  if (Math.abs(v) >= 1000) return `${(v / 1000).toFixed(1).replace(".", ",")} mil`;
  return v.toFixed(0);
}

export function Grafico({ dados, anoFoco, estimados = [] }: { dados: GraficoDados; anoFoco: number; estimados?: number[] }) {
  const W = 640;
  const H = 280;
  const ml = 12;
  const mt = 28;
  const mb = 34;
  const anos = dados.series[0].pontos.map((p) => p.ano);
  const max = Math.max(1, ...dados.series.flatMap((s) => s.pontos.map((p) => p.valor)));
  const min = dados.series.length > 1 ? 0 : 0;
  const alturaUtil = H - mt - mb;
  const largGrupo = (W - ml * 2) / anos.length;
  const n = dados.series.length;
  const largBarra = Math.min(34, (largGrupo - 10) / n);
  const resumo = dados.series.map((s) => `${s.nome}: ${s.pontos.map((p) => `${p.ano} ${p.texto}`).join(", ")}`).join(". ");
  return (
    <figure className="rf-grafico">
      <figcaption>
        <b>{dados.titulo}</b>
        <span className="rf-legenda">
          {estimados.length > 0 && (
            <span>
              <i className="cor-est" /> hachurado = ano com estimativa
            </span>
          )}
          {dados.series.map((s) => (
            <span key={s.nome}>
              <i className={`cor-${s.cor}`} /> {s.nome}
            </span>
          ))}
        </span>
      </figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${dados.titulo}. ${resumo}`}>
        <defs>
          <pattern id="rf-hachura" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="6" height="6" fill="#fff" />
            <rect width="2.5" height="6" fill="currentColor" />
          </pattern>
        </defs>
        <line x1={ml} x2={W - ml} y1={H - mb} y2={H - mb} className="eixo" />
        {anos.map((ano, i) => {
          const x0 = ml + i * largGrupo + (largGrupo - largBarra * n) / 2;
          return (
            <g key={ano} className={ano === anoFoco ? "foco" : undefined}>
              {ano === anoFoco && <rect x={ml + i * largGrupo + 2} y={mt - 14} width={largGrupo - 4} height={H - mt - mb + 14} className="fundo-foco" rx="6" />}
              {dados.series.map((s, j) => {
                const p = s.pontos[i];
                const h = Math.max(2, ((p.valor - min) / (max - min)) * alturaUtil);
                const x = x0 + j * largBarra;
                return (
                  <g key={s.nome}>
                    <rect x={x} y={H - mb - h} width={largBarra - 2} height={h} rx="3" className={`barra cor-${s.cor}${estimados.includes(ano) ? " est" : ""}`}>
                      <title>{`${s.nome} em ${ano}: ${p.texto}`}</title>
                    </rect>
                    {n === 1 || ano === anoFoco ? (
                      <text x={x + (largBarra - 2) / 2} y={H - mb - h - 5} textAnchor="middle" className="valor">
                        {curto(p.valor)}
                      </text>
                    ) : null}
                  </g>
                );
              })}
              <text x={ml + i * largGrupo + largGrupo / 2} y={H - 12} textAnchor="middle" className="ano">
                {ano}
              </text>
            </g>
          );
        })}
      </svg>
    </figure>
  );
}
