// Música de fundo da oração: pad ambiente sintetizado ao vivo com Web Audio (sem arquivo de áudio).
// Por que ao vivo e não um m4a: zero bytes extras, loop sem emenda (os acordes se sobrepõem e nunca "recomeçam"),
// e o volume e o fade são só um ganho. No iPhone (PWA) o áudio só começa depois de um toque: por isso
// `prepararAudio()` é chamado dentro do clique que abre a oração, e o toque no botão de som também liga.

export const CHAVE_SOM = "chama-som-oracao";
export const VOLUME_PADRAO = 0.17;
export const FADE_ENTRADA_S = 2;
export const FADE_SAIDA_S = 1.6;
export const SEGUNDOS_POR_ACORDE = 9;

const nota = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);

/** Progressão lenta em Dó maior (I - vi - IV - V add9), 4 vozes cada, todas em tom maior/suspenso suave. */
export const PROGRESSAO: number[][] = [
  [48, 55, 64, 67], // C (Dó) com sétima maior em cima
  [45, 55, 64, 72], // Am7
  [41, 53, 60, 69], // F6
  [43, 55, 62, 69], // G add9
].map((a) => a.map(nota));

export function lerSomLigado(): boolean {
  try {
    return window.localStorage.getItem(CHAVE_SOM) !== "0";
  } catch {
    return true;
  }
}
export function salvarSomLigado(v: boolean): void {
  try {
    window.localStorage.setItem(CHAVE_SOM, v ? "1" : "0");
  } catch {
    /* sem armazenamento: vale só nesta sessão */
  }
}

type Ctx = AudioContext;
let ctx: Ctx | null = null;
let reverb: ConvolverNode | null = null;

function criarContexto(): Ctx | null {
  if (typeof window === "undefined") return null;
  if (ctx && ctx.state !== "closed") return ctx;
  const C = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!C) return null;
  try {
    ctx = new C();
    reverb = null;
    return ctx;
  } catch {
    return null;
  }
}

/** Chamar DENTRO de um clique: cria e destrava o áudio (regra do iPhone). */
export function prepararAudio(): void {
  const c = criarContexto();
  if (c && c.state === "suspended") void c.resume().catch(() => undefined);
}

function respostaReverb(c: Ctx): ConvolverNode {
  const seg = 3.2;
  const n = Math.floor(c.sampleRate * seg);
  const buf = c.createBuffer(2, n, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2.6);
  }
  const r = c.createConvolver();
  r.buffer = buf;
  return r;
}

interface Sessao {
  mestre: GainNode;
  timer: number;
  nos: AudioScheduledSourceNode[];
  fim: number | null;
}
let atual: Sessao | null = null;

function tocarAcorde(c: Ctx, s: Sessao, destino: AudioNode, freqs: number[], inicio: number, dur: number) {
  const ataque = dur * 0.4;
  const solta = dur * 0.5;
  for (const f of freqs) {
    for (const cents of [-6, 6]) {
      const o = c.createOscillator();
      o.type = "triangle";
      o.frequency.value = f;
      o.detune.value = cents;
      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, inicio);
      g.gain.linearRampToValueAtTime(0.16, inicio + ataque);
      g.gain.setValueAtTime(0.16, inicio + dur - solta);
      g.gain.linearRampToValueAtTime(0.0001, inicio + dur + 2);
      o.connect(g).connect(destino);
      o.start(inicio);
      o.stop(inicio + dur + 2.1);
      s.nos.push(o);
      o.onended = () => {
        o.disconnect();
        g.disconnect();
        s.nos = s.nos.filter((x) => x !== o);
      };
    }
  }
}

/** Começa a música com fade-in. Se já estiver tocando, não faz nada. Chamar depois de `prepararAudio()` num clique. */
export function iniciarMusica(volume = VOLUME_PADRAO): void {
  if (atual && atual.fim === null) return;
  const c = criarContexto();
  if (!c) return;
  if (c.state === "suspended") void c.resume().catch(() => undefined);
  if (!reverb) reverb = respostaReverb(c);

  const mestre = c.createGain();
  mestre.gain.setValueAtTime(0.0001, c.currentTime);
  mestre.gain.linearRampToValueAtTime(volume, c.currentTime + FADE_ENTRADA_S);
  const filtro = c.createBiquadFilter();
  filtro.type = "lowpass";
  filtro.frequency.value = 1100;
  filtro.Q.value = 0.4;
  const seco = c.createGain();
  seco.gain.value = 0.7;
  const molhado = c.createGain();
  molhado.gain.value = 0.55;
  filtro.connect(seco).connect(mestre);
  filtro.connect(reverb).connect(molhado).connect(mestre);
  mestre.connect(c.destination);

  const s: Sessao = { mestre, timer: 0, nos: [], fim: null };
  atual = s;
  let i = 0;
  const proximo = () => {
    tocarAcorde(c, s, filtro, PROGRESSAO[i % PROGRESSAO.length], c.currentTime + 0.05, SEGUNDOS_POR_ACORDE + 3);
    i++;
  };
  proximo();
  s.timer = window.setInterval(proximo, SEGUNDOS_POR_ACORDE * 1000);
}

/** Fade-out e desliga tudo. Seguro de chamar várias vezes. */
export function pararMusica(fadeS = FADE_SAIDA_S): void {
  const s = atual;
  if (!s || s.fim !== null) return;
  window.clearInterval(s.timer);
  const c = ctx;
  if (!c) return;
  try {
    s.mestre.gain.cancelScheduledValues(c.currentTime);
    s.mestre.gain.setValueAtTime(Math.max(s.mestre.gain.value, 0.0001), c.currentTime);
    s.mestre.gain.linearRampToValueAtTime(0.0001, c.currentTime + fadeS);
  } catch {
    /* ignora */
  }
  s.fim = window.setTimeout(() => {
    for (const n of s.nos) {
      try {
        n.stop();
      } catch {
        /* já parou */
      }
    }
    s.nos = [];
    try {
      s.mestre.disconnect();
    } catch {
      /* ok */
    }
    if (atual === s) atual = null;
    if (!atual && c.state === "running") void c.suspend().catch(() => undefined);
  }, fadeS * 1000 + 80);
}

export function tocandoMusica(): boolean {
  return Boolean(atual && atual.fim === null);
}
