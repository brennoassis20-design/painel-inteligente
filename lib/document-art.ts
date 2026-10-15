// Ilustrações em traço fino desenhadas no próprio template (SVG), uma família por paleta de nicho.
// Custo zero por produto: nada é gerado por IA nem baixado de fora.

type Motif = () => string;

const VIEW = 120;

function leaf(x: number, y: number, angle: number, size: number) {
  const tip = size;
  const bulge = size * 0.32;
  return `<path transform="translate(${x} ${y}) rotate(${angle})" d="M0 0 C${bulge} ${-tip * 0.3} ${bulge} ${-tip * 0.75} 0 ${-tip} C${-bulge} ${-tip * 0.75} ${-bulge} ${-tip * 0.3} 0 0 Z M0 ${-tip * 0.12} L0 ${-tip * 0.82}"/>`;
}

// Ramo botânico: haste curva com folhas alternadas.
function sprig(x = 60, base = 114, height = 100, lean = 8) {
  const top = base - height;
  const leaves: string[] = [];
  const count = 6;
  for (let i = 0; i < count; i++) {
    const t = (i + 1) / (count + 1);
    const y = base - height * t;
    const cx = x + lean * t * t;
    const size = 22 - i * 2.2;
    leaves.push(leaf(cx, y, i % 2 ? 48 : -48, size));
  }
  return `<path d="M${x} ${base} C${x - 2} ${base - height * 0.4} ${x + lean * 0.5} ${top + height * 0.3} ${x + lean} ${top}"/>${leaves.join("")}${leaf(x + lean, top + 2, 4, 14)}`;
}

function sparkle(x: number, y: number, r: number) {
  return `<path d="M${x} ${y - r} L${x} ${y + r} M${x - r} ${y} L${x + r} ${y} M${x - r * 0.5} ${y - r * 0.5} L${x + r * 0.5} ${y + r * 0.5} M${x + r * 0.5} ${y - r * 0.5} L${x - r * 0.5} ${y + r * 0.5}" stroke-width="0.8"/>`;
}

// Rosa vista de cima: contorno de pétalas e espiral central.
function rose(x: number, y: number, r: number) {
  const petals = [0, 72, 144, 216, 288]
    .map((a) => {
      const rad = (a * Math.PI) / 180;
      const px = x + Math.cos(rad) * r * 0.62;
      const py = y + Math.sin(rad) * r * 0.62;
      return `<circle cx="${px.toFixed(2)}" cy="${py.toFixed(2)}" r="${(r * 0.46).toFixed(2)}" stroke-width="0.7"/>`;
    })
    .join("");
  const k = r / 10;
  return `<circle cx="${x}" cy="${y}" r="${r}"/>${petals}<path d="M${x} ${y} m${-2 * k} 0 a${2 * k} ${2 * k} 0 1 1 ${4 * k} 0 a${3.5 * k} ${3.5 * k} 0 1 1 ${-7 * k} 0 a${5.5 * k} ${5.5 * k} 0 1 1 ${11 * k} 0" stroke-width="0.9"/>`;
}

function steam(x: number, y: number) {
  return [0, 8, 16]
    .map((dx) => `<path d="M${x + dx} ${y} c-4 -5 4 -9 0 -14 c-4 -5 4 -9 0 -14" stroke-width="0.9"/>`)
    .join("");
}

const motifs: Record<string, Motif[]> = {
  rose: [
    // alianças
    () => `<circle cx="48" cy="72" r="24"/><circle cx="48" cy="72" r="20.5" stroke-width="0.7"/><circle cx="74" cy="72" r="24"/><circle cx="74" cy="72" r="20.5" stroke-width="0.7"/><path d="M41 41 L48 33 L55 41 L48 48 Z M41 41 L55 41 M45 41 L48 48 L51 41"/>${sparkle(30, 34, 5)}${sparkle(92, 42, 4)}`,
    // taças do brinde
    () => `<g transform="rotate(-12 50 98)"><path d="M41 22 L59 22 L57 54 Q50 64 43 54 Z"/><path d="M42.5 36 L57.5 36" stroke-width="0.7"/><path d="M50 60 L50 96 M41 98 L59 98"/></g><g transform="rotate(12 72 98)"><path d="M63 22 L81 22 L79 54 Q72 64 65 54 Z"/><path d="M64.5 36 L79.5 36" stroke-width="0.7"/><path d="M72 60 L72 96 M63 98 L81 98"/></g><circle cx="61" cy="12" r="1.6"/><circle cx="55" cy="6" r="1.1"/><circle cx="67" cy="5" r="1.1"/>`,
    // buquê de rosas com laço
    () => `<path d="M60 88 L50 64 M60 88 L60 49 M60 88 L70 64 M60 88 L56 116 M60 88 L64 116 M60 88 L60 116"/><path d="M60 88 C52 82 44 86 48 92 C52 96 58 90 60 88 C62 90 68 96 72 92 C76 86 68 82 60 88 Z M58 90 L52 104 M62 90 L68 104" stroke-width="0.9"/>${rose(46, 52, 12)}${rose(74, 52, 12)}${rose(60, 36, 13)}${leaf(40, 66, -70, 18)}${leaf(80, 66, 70, 18)}${leaf(52, 30, -40, 12)}${leaf(70, 28, 40, 12)}`,
    () => sprig(56, 114, 100, 10),
  ],
  sage: [
    // broto
    () => `<path d="M60 112 L60 58"/><path d="M60 78 C60 62 46 52 30 54 C30 70 44 80 60 78 Z M60 78 L38 60" stroke-width="1"/><path d="M60 64 C60 46 76 34 94 36 C94 54 78 66 60 64 Z M60 64 L86 42" stroke-width="1"/><path d="M36 112 L84 112 M42 118 L78 118" stroke-width="0.8"/>`,
    // sol nascendo
    () => `<path d="M30 84 A30 30 0 0 1 90 84"/><path d="M14 84 L106 84 M26 94 L94 94 M40 104 L80 104" stroke-width="0.8"/>${[-75, -50, -25, 0, 25, 50, 75]
      .map((a) => `<path transform="rotate(${a} 60 84)" d="M60 46 L60 34"/>`)
      .join("")}`,
    // gota d'água
    () => `<path d="M60 16 C60 16 30 54 30 76 C30 94 44 106 60 106 C76 106 90 94 90 76 C90 54 60 16 60 16 Z"/><path d="M44 78 C44 88 50 94 58 96" stroke-width="0.8"/>${sparkle(96, 30, 5)}`,
    () => sprig(60, 114, 100, -8),
  ],
  navy: [
    // moedas empilhadas
    () => `${[0, 1, 2, 3, 4]
      .map((i) => `<ellipse cx="46" cy="${100 - i * 11}" rx="22" ry="6"/><path d="M24 ${100 - i * 11} L24 ${106 - i * 11} M68 ${100 - i * 11} L68 ${106 - i * 11}"/>`)
      .join("")}<circle cx="86" cy="42" r="16"/><circle cx="86" cy="42" r="12" stroke-width="0.7"/><path d="M86 34 L86 50 M82 37 Q86 34 90 37 M82 47 Q86 50 90 47" stroke-width="0.9"/>`,
    // barras e seta
    () => `<path d="M18 104 L104 104"/><rect x="24" y="76" width="12" height="28"/><rect x="44" y="64" width="12" height="40"/><rect x="64" y="50" width="12" height="54"/><rect x="84" y="34" width="12" height="70"/><path d="M20 66 L44 46 L60 54 L92 20 M80 20 L92 20 L92 32" stroke-width="1.1"/>`,
    // chave
    () => `<circle cx="38" cy="60" r="20"/><circle cx="38" cy="60" r="8"/><path d="M58 60 L104 60 M90 60 L90 72 M100 60 L100 70 M78 60 L78 68"/>`,
    // bússola
    () => `<circle cx="60" cy="62" r="40"/><circle cx="60" cy="62" r="34" stroke-width="0.7"/><path d="M60 34 L67 62 L60 90 L53 62 Z M53 62 L67 62"/><path d="M60 16 L60 22 M60 102 L60 108 M14 62 L20 62 M100 62 L106 62" stroke-width="0.9"/>`,
  ],
  terracotta: [
    // panela com vapor
    () => `<path d="M24 66 L96 66 L90 104 Q60 112 30 104 Z"/><path d="M16 70 L24 70 M96 70 L104 70 M20 60 L100 60"/><path d="M54 60 Q60 52 66 60"/>${steam(48, 46)}`,
    // xícara
    () => `<path d="M26 54 L82 54 L78 96 Q54 104 30 96 Z"/><path d="M82 62 C98 62 98 84 80 84"/><path d="M14 104 Q54 114 94 104"/>${steam(42, 42)}`,
    // trigo
    () => `<path d="M60 116 L60 22"/>${[0, 1, 2, 3, 4, 5]
      .map((i) => leaf(60, 82 - i * 11, i % 2 ? 34 : -34, 16) + leaf(60, 82 - i * 11, i % 2 ? -34 : 34, 16))
      .join("")}`,
    // batedor
    () => `<path d="M60 116 L60 76"/><rect x="55" y="88" width="10" height="28" rx="5"/><path d="M60 76 C40 60 40 24 60 14 C80 24 80 60 60 76 Z M60 76 C50 56 50 30 60 14 C70 30 70 56 60 76 Z"/>`,
  ],
  plum: [
    // frasco com conta-gotas
    () => `<rect x="38" y="52" width="44" height="56" rx="8"/><path d="M50 52 L50 40 L70 40 L70 52 M54 40 L54 18 Q60 10 66 18 L66 40"/><path d="M46 70 L74 70 M46 90 L74 90" stroke-width="0.7"/>${sparkle(94, 30, 5)}`,
    // espelho de mão
    () => `<ellipse cx="60" cy="46" rx="28" ry="34"/><ellipse cx="60" cy="46" rx="22" ry="28" stroke-width="0.7"/><path d="M54 80 L54 112 Q60 118 66 112 L66 80"/><path d="M48 32 Q52 24 60 22" stroke-width="0.8"/>`,
    // flor
    () => `${[0, 60, 120, 180, 240, 300].map((a) => leaf(60, 50, a, 30)).join("")}<circle cx="60" cy="50" r="6"/><path d="M60 80 L60 116"/>${leaf(60, 104, -50, 16)}`,
    () => sprig(60, 114, 100, 8),
  ],
  forest: [
    // vaso com planta
    () => `<path d="M40 82 L80 82 L74 114 L46 114 Z M36 76 L84 76 L84 82 L36 82 Z"/><path d="M60 76 L60 40"/>${leaf(60, 62, -50, 30)}${leaf(60, 54, 52, 30)}${leaf(60, 42, -6, 26)}`,
    // casa
    () => `<path d="M20 60 L60 24 L100 60 M30 52 L30 104 L90 104 L90 52"/><rect x="52" y="74" width="16" height="30"/><rect x="36" y="62" width="12" height="12"/><rect x="72" y="62" width="12" height="12"/><path d="M78 36 L78 22 L86 22 L86 44"/>`,
    // pegada
    () => `<ellipse cx="60" cy="80" rx="20" ry="17"/><ellipse cx="34" cy="54" rx="7" ry="10"/><ellipse cx="50" cy="40" rx="7" ry="10"/><ellipse cx="70" cy="40" rx="7" ry="10"/><ellipse cx="86" cy="54" rx="7" ry="10"/>`,
    () => sprig(60, 114, 100, -10),
  ],
  graphite: [
    // lâmpada
    () => `<path d="M60 16 C40 16 30 32 30 46 C30 60 42 68 46 80 L74 80 C78 68 90 60 90 46 C90 32 80 16 60 16 Z"/><path d="M48 88 L72 88 M50 96 L70 96 M54 104 L66 104"/><path d="M54 80 L54 56 L60 62 L66 56 L66 80" stroke-width="0.8"/>`,
    // livro aberto
    () => `<path d="M60 36 C46 28 30 28 16 32 L16 96 C30 92 46 92 60 100 C74 92 90 92 104 96 L104 32 C90 28 74 28 60 36 Z M60 36 L60 100"/><path d="M26 48 L50 46 M26 58 L50 56 M26 68 L50 66 M70 46 L94 48 M70 56 L94 58 M70 66 L94 68" stroke-width="0.7"/>`,
    () => `<circle cx="60" cy="62" r="40"/><circle cx="60" cy="62" r="34" stroke-width="0.7"/><path d="M60 34 L67 62 L60 90 L53 62 Z M53 62 L67 62"/>`,
    () => `${sparkle(60, 60, 34)}${sparkle(28, 28, 8)}${sparkle(94, 92, 10)}`,
  ],
};

function svg(content: string, className: string) {
  return `<svg class="${className}" viewBox="0 0 ${VIEW} ${VIEW}" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${content}</svg>`;
}

export function motifCount(paletteId: string) {
  return (motifs[paletteId] || motifs.graphite).length;
}

// Ilustração de número `index` (cicla pela família da paleta).
export function documentArt(paletteId: string, index: number, className = "art") {
  const family = motifs[paletteId] || motifs.graphite;
  return svg(family[((index % family.length) + family.length) % family.length](), className);
}
