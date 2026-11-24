// Ícones de traço do Chama Acesa (SVG, herdam a cor do texto) e o anel de progresso.
export const CAMINHOS_ABAS = {
  hoje: "M12 3c.6 3 4 4.8 4 9.2a4 4 0 0 1-8 0c0-1.8.8-3 1.7-3.9.3 1.4 1 2.2 2.1 2.6-.4-2.6 0-5.4.2-7.9z",
  jornada: "M4 19h4l3-8 3 5 2-3 4 6M6 5h.01M10 5h.01M14 5h.01",
  liga: "M8 4h8v5a4 4 0 0 1-8 0V4zM8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M9 20h6",
  biblia: "M6 4h10a2 2 0 0 1 2 2v14H8a2 2 0 0 1-2-2V4zM6 18a2 2 0 0 1 2-2h10M12 7v5M10 9h4",
  conquistas: "M9 3l2 6M15 3l-2 6M12 21a6 6 0 1 0 0-12 6 6 0 0 0 0 12zM12 13v4",
} as const;

export type IdAba = keyof typeof CAMINHOS_ABAS;

type P = { tam?: number; largura?: number };
const base = (tam: number, largura: number) => ({ width: tam, height: tam, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: largura, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true as const, focusable: "false" as const });

export const IconeAba = ({ id, tam = 22 }: { id: IdAba; tam?: number }) => <svg {...base(tam, 1.8)}><path d={CAMINHOS_ABAS[id]} /></svg>;
export const IconeCheck = ({ tam = 22, largura = 2.4 }: P) => <svg {...base(tam, largura)}><path d="M5 12l5 5 9-10" /></svg>;
export const IconeCoracao = ({ tam = 22, largura = 2 }: P) => <svg {...base(tam, largura)}><path d="M12 21s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 5.5-7 10-7 10z" /></svg>;
export const IconeEnvio = ({ tam = 22, largura = 2 }: P) => <svg {...base(tam, largura)}><path d="M4 12l16-8-6 16-2-6-8-2z" /></svg>;
export const IconeLivro = ({ tam = 22, largura = 2 }: P) => <svg {...base(tam, largura)}><path d={CAMINHOS_ABAS.biblia} /></svg>;
export const IconeSeta = ({ tam = 20, largura = 2 }: P) => <svg {...base(tam, largura)}><path d="M9 5l7 7-7 7" /></svg>;
export const IconeVoltar = ({ tam = 20, largura = 2 }: P) => <svg {...base(tam, largura)}><path d="M15 5l-7 7 7 7" /></svg>;
export const IconeBusca = ({ tam = 20, largura = 2 }: P) => <svg {...base(tam, largura)}><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></svg>;
export const IconeCamera = ({ tam = 20, largura = 2 }: P) => <svg {...base(tam, largura)}><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></svg>;
export const IconeCadeado = ({ tam = 18, largura = 2 }: P) => <svg {...base(tam, largura)}><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>;

/** Chamazinha de uma linha só (quadradinho do dia na semana). */
export const MiniChama = ({ tam = 16 }: P) => (
  <svg width={tam} height={tam} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false"><path d="M12 3c.6 3 4 4.8 4 9.2a4 4 0 0 1-8 0c0-1.8.8-3 1.7-3.9.3 1.4 1 2.2 2.1 2.6-.4-2.6 0-5.4.2-7.9z" /></svg>
);

/** Anel de progresso: `pct` de 0 a 100; `texto` no centro (ex.: o número da meta). */
export function Anel({ pct, tam = 56, espessura = 6, texto, rotulo, tamTexto }: { pct: number; tam?: number; espessura?: number; texto?: string; rotulo: string; tamTexto?: number }) {
  const r = (tam - espessura) / 2;
  const c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(100, pct));
  return (
    <svg className="ch-anel" width={tam} height={tam} viewBox={`0 0 ${tam} ${tam}`} role="img" aria-label={rotulo} style={{ flex: "none" }}>
      <circle cx={tam / 2} cy={tam / 2} r={r} fill="none" stroke="var(--ch-trilho)" strokeWidth={espessura} />
      <circle cx={tam / 2} cy={tam / 2} r={r} fill="none" stroke="var(--ch-ouro)" strokeWidth={espessura} strokeLinecap="round" strokeDasharray={`${(c * p) / 100} ${c}`} transform={`rotate(-90 ${tam / 2} ${tam / 2})`} />
      {texto !== undefined && <text x={tam / 2} y={tam / 2} dy="0.35em" textAnchor="middle" fontSize={tamTexto ?? Math.round(tam * 0.26)} fontWeight={800} fill="var(--ch-fg)">{texto}</text>}
    </svg>
  );
}
