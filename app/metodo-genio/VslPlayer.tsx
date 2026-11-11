"use client";

import { useEffect, useRef, useState } from "react";
import { CHAVE_REVELA, EVENTO_REVELA } from "./Revelar";

// Player da VSL do Método Gênio (config em oferta.ts → VSL_GENIO).

type HlsCtor = {
  new (cfg: object): {
    loadSource(u: string): void;
    attachMedia(v: HTMLVideoElement): void;
    on(ev: string, fn: (e: unknown, d: { fatal?: boolean }) => void): void;
    destroy(): void;
  };
  isSupported(): boolean;
  Events: { MANIFEST_PARSED: string; ERROR: string };
};

declare global {
  interface Window {
    Hls?: HlsCtor;
  }
}

function track(nome: string) {
  try {
    window.fbq?.("trackCustom", nome, { vsl: "genio" });
  } catch {
    // pixel bloqueado
  }
}

export function VslPlayer({ base, mostrarEm }: { base: string; mostrarEm: number }) {
  const ref = useRef<HTMLVideoElement>(null);
  const barra = useRef<HTMLElement>(null);
  const [comSom, setComSom] = useState(false);
  const [pausado, setPausado] = useState(false);
  const [bloqueado, setBloqueado] = useState(false);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const HLS = `${base}/hls/master.m3u8`;
    const MP4 = `${base}/vsl.mp4`;
    let hls: InstanceType<HlsCtor> | null = null;
    let revelou = false;
    try {
      revelou = !!window.localStorage.getItem(CHAVE_REVELA);
    } catch {
      // sem localStorage: mostra a carta só no tempo
    }

    function tenta() {
      if (!v) return;
      v.muted = true;
      v.play()?.catch(() => setBloqueado(true));
    }
    function usaMp4() {
      if (!v) return;
      hls?.destroy();
      hls = null;
      v.src = MP4;
      v.load();
      tenta();
    }
    function inicia() {
      if (!v) return;
      if (v.canPlayType("application/vnd.apple.mpegurl")) {
        v.src = HLS;
        v.addEventListener("error", usaMp4, { once: true });
        tenta();
      } else if (window.Hls?.isSupported()) {
        hls = new window.Hls({ startLevel: 0, capLevelToPlayerSize: true });
        hls.loadSource(HLS);
        hls.attachMedia(v);
        hls.on(window.Hls.Events.MANIFEST_PARSED, tenta);
        hls.on(window.Hls.Events.ERROR, (_e, d) => {
          if (d.fatal) usaMp4();
        });
      } else usaMp4();
    }
    if (v.canPlayType("application/vnd.apple.mpegurl") || window.Hls) inicia();
    else {
      const s = document.createElement("script");
      s.src = "/mg/hls.min.js";
      s.onload = inicia;
      s.onerror = usaMp4;
      document.head.appendChild(s);
    }

    function tempo() {
      if (!v || !v.duration) return;
      if (barra.current) barra.current.style.width = `${Math.pow(v.currentTime / v.duration, 0.55) * 100}%`;
      if (v.currentTime >= mostrarEm) revela();
    }
    function revela() {
      if (revelou) return;
      revelou = true;
      try {
        window.localStorage.setItem(CHAVE_REVELA, "1");
      } catch {
        // sem localStorage: só não lembra na próxima visita
      }
      track("VslOferta");
      window.dispatchEvent(new Event(EVENTO_REVELA));
    }
    const pausa = () => setPausado(!v.ended);
    const toca = () => setPausado(false);
    const rodando = () => setBloqueado(false);
    v.addEventListener("timeupdate", tempo);
    v.addEventListener("ended", revela);
    v.addEventListener("pause", pausa);
    v.addEventListener("play", toca);
    v.addEventListener("playing", rodando);
    return () => {
      hls?.destroy();
      v.removeEventListener("timeupdate", tempo);
      v.removeEventListener("ended", revela);
      v.removeEventListener("pause", pausa);
      v.removeEventListener("play", toca);
      v.removeEventListener("playing", rodando);
    };
  }, [base, mostrarEm]);

  function ligaSom() {
    const v = ref.current;
    if (!v) return;
    setComSom(true);
    v.muted = false;
    try {
      v.currentTime = 0;
    } catch {
      // vídeo ainda sem dados: começa de onde estiver
    }
    v.play()?.catch(() => {
      v.controls = true;
    });
    track("VslSom");
  }

  function alterna() {
    const v = ref.current;
    if (!v || !comSom) return;
    if (v.paused) v.play();
    else v.pause();
  }

  return (
    <div className="mg-vsl">
      <video ref={ref} playsInline muted autoPlay preload="auto" poster={`${base}/capa.jpg`} onClick={alterna} />
      {!comSom && (
        <button type="button" className="mg-vsl-som" onClick={ligaSom}>
          <span>
            <i aria-hidden="true">{bloqueado ? "▶" : "🔊"}</i>
            <b>{bloqueado ? "Toque para assistir" : "Seu vídeo já começou"}</b>
            <small>{bloqueado ? "com som" : "Toque para ouvir"}</small>
          </span>
        </button>
      )}
      {comSom && pausado && (
        <button type="button" className="mg-vsl-pausa" onClick={() => ref.current?.play()} aria-label="Continuar o vídeo">
          <span>▶</span>
        </button>
      )}
      <div className="mg-vsl-prog">
        <i ref={barra} />
      </div>
    </div>
  );
}
