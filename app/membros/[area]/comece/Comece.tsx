"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Archivo_Black, Inter } from "next/font/google";
import { Chama } from "../../chama/Chama";
import "../../chama/chama.css";
import "./comece.css";
import { captureUtm, loadPixel, readUtm, track } from "../../pixel";

const titulo = Archivo_Black({ subsets: ["latin"], weight: "400", variable: "--ch-f-titulo", display: "swap" });
const texto = Inter({ subsets: ["latin"], weight: ["400", "600", "800"], variable: "--ch-f-texto", display: "swap" });

const PARAMS_REPASSE = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "fbclid", "src", "sck", "ref"];

// Endereço do cadastro grátis, na mesma base da página (/chama-acesa/comece -> /chama-acesa/gratis; em /membros/... também) e com a origem do visitante.
export function linkCadastro(pathname: string, search: string, salvas: Record<string, string>) {
  const base = pathname.replace(/\/comece\/?$/, "/gratis");
  const atual = new URLSearchParams(search);
  const saida = new URLSearchParams();
  for (const chave of PARAMS_REPASSE) {
    const valor = atual.get(chave) || salvas[chave];
    if (valor) saida.set(chave, valor);
  }
  const resto = saida.toString();
  return resto ? `${base}?${resto}` : base;
}

const PRINTS = [
  { arq: "inicio-dia5", alt: "Tela inicial do app: chama acesa com 5 dias seguidos e os três passos do dia", legenda: "Todo dia: ler, orar e cumprir uma missão" },
  { arq: "checks-feitos", alt: "Tela de dia concluído com a chama crescendo", legenda: "Chama de dias seguidos que cresce a cada dia" },
  { arq: "pratica", alt: "Prática de versículos: completar a palavra que falta", legenda: "Prática para fixar os versículos" },
  { arq: "jornada", alt: "Mapa da jornada de 21 dias", legenda: "A jornada de 21 dias, dia a dia" },
  { arq: "medalhas", alt: "Tela de conquistas com medalhas", legenda: "Medalhas pelas marcas de 3, 7, 14 e 21 dias" },
];

const RECURSOS: [string, string][] = [
  ["Versículo do dia", "Um versículo e uma reflexão curta, escritos para cada um dos 21 dias."],
  ["Oração guiada", "Com música de fundo, que você pode ligar ou desligar."],
  ["Missão prática", "Uma tarefa pequena por dia, para tirar a Palavra do papel."],
  ["Chama de dias seguidos", "Ela cresce a cada dia completo. Brasas guardadas protegem a chama se você faltar."],
  ["Ligas e XP", "Você ganha pontos a cada passo e sobe de liga, igual app de idioma."],
  ["Lembrete no seu horário", "Você escolhe a hora e o aviso chega no celular, com o app instalado."],
  ["Bíblia completa, grátis", "Dentro do app, para sempre. Com planos de leitura e anotações."],
];

const PERGUNTAS: [string, string][] = [
  ["Funciona no iPhone e no Android?", "Sim. Você instala pela tela inicial do celular, direto do navegador, sem loja de aplicativos. O app mostra o passo a passo na hora."],
  ["Preciso de cartão para começar?", "Não. O cadastro é grátis, só com e-mail, e os 3 primeiros dias não pedem cartão nem pagamento."],
  ["E se eu perder um dia?", "Cada dia do app abre uma vez por dia de calendário. Se você pular um dia, o app usa uma brasa guardada para manter a chama acesa. Você ganha uma brasa a cada 7 dias seguidos (guarda até 2) e mais uma quando um amigo convidado completa o dia 1. Sem brasa, a chama volta a zero, mas os dias que você já fez continuam feitos e você retoma de onde parou."],
  ["Quanto tempo por dia?", "Cerca de 5 minutos: ler o versículo, fazer a oração e cumprir a missão do dia."],
  ["A Bíblia é paga?", "Não. A Bíblia dentro do app é grátis para sempre, mesmo sem comprar os 21 dias."],
];

export function Comece({ area }: { area: string }) {
  const [href, setHref] = useState("/chama-acesa/gratis");
  const disparou = useRef(false);

  useEffect(() => {
    captureUtm();
    const destino = linkCadastro(window.location.pathname, window.location.search, readUtm());
    void Promise.resolve().then(() => setHref(destino));
    // Pixel da área (se ainda não tiver, a página funciona igual, só sem medir).
    void fetch("/api/membros/area", { headers: { "X-Area": area } })
      .then(async (resposta) => {
        if (!resposta.ok) return;
        const info = (await resposta.json()) as { meta_pixel_id?: string | null };
        loadPixel(info.meta_pixel_id);
        if (!disparou.current) {
          disparou.current = true;
          track("ViewContent", { content_name: "Chama Acesa", content_category: "pagina-de-vendas" });
        }
      })
      .catch(() => undefined);
  }, [area]);

  function aoClicar() {
    try {
      (window as unknown as { fbq?: (...args: unknown[]) => void }).fbq?.("trackCustom", "CliqueComeceGratis");
    } catch {
      /* sem pixel, segue */
    }
  }

  const botao = (rotulo = "Comece grátis", extra = "") => (
    <a className={`ch-btn ch-btn-grande cm-cta ${extra}`} href={href} onClick={aoClicar}>
      {rotulo}
    </a>
  );

  return (
    <div className={`cm ${titulo.variable} ${texto.variable}`}>
      <main>
        <section className="cm-hero">
          <div className="cm-chama">
            <Chama dias={5} tamanho={92} />
          </div>
          <p className="cm-etiqueta">Chama Acesa · app de 21 dias</p>
          <h1>5 minutos por dia com Deus. 21 dias. A chama que não apaga.</h1>
          <p className="cm-sub">Um app para criar o hábito de buscar a Deus todo dia: um versículo, uma oração e uma pequena missão. Simples de começar e fácil de manter.</p>
          {botao()}
          <p className="cm-mini">Grátis para começar. Só e-mail, sem cartão.</p>
        </section>

        <section className="cm-sec" aria-labelledby="cm-app">
          <h2 id="cm-app">O que tem dentro do app</h2>
          <ul className="cm-prints">
            {PRINTS.map((p, i) => (
              <li key={p.arq}>
                <Image src={`/chama-acesa/pagina/${p.arq}.webp`} alt={p.alt} width={560} height={1212} sizes="(max-width: 640px) 70vw, 240px" priority={i === 0} unoptimized />
                <span>{p.legenda}</span>
              </li>
            ))}
          </ul>
          <ul className="cm-recursos">
            {RECURSOS.map(([nome, desc]) => (
              <li key={nome}>
                <b>{nome}</b>
                <span>{desc}</span>
              </li>
            ))}
          </ul>
          {botao()}
        </section>

        <section className="cm-sec" aria-labelledby="cm-passos">
          <h2 id="cm-passos">Como funciona</h2>
          <ol className="cm-passos">
            <li>
              <b>Cadastro grátis</b>
              <span>Só com e-mail. Sem cartão.</span>
            </li>
            <li>
              <b>Os 3 primeiros dias são grátis</b>
              <span>Você usa o app de verdade e vê se faz sentido para a sua rotina.</span>
            </li>
            <li>
              <b>Depois, R$ 37 uma vez</b>
              <span>Libera os 21 dias completos. Um pagamento só, sem mensalidade.</span>
            </li>
          </ol>
        </section>

        <section className="cm-sec" aria-labelledby="cm-duvidas">
          <h2 id="cm-duvidas">Perguntas</h2>
          <div className="cm-faq">
            {PERGUNTAS.map(([pergunta, resposta]) => (
              <details key={pergunta}>
                <summary>{pergunta}</summary>
                <p>{resposta}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="cm-final">
          <h2>Acenda a chama de hoje</h2>
          <p>Cinco minutos. Um versículo, uma oração, uma missão. Amanhã você coloca a lenha de amanhã.</p>
          {botao()}
          <p className="cm-mini">Cadastro grátis, só com e-mail.</p>
        </section>
      </main>

      <footer className="cm-rodape">
        <p>Bíblia: Bíblia Livre (BLIVRE), licença CC BY 4.0.</p>
        <p>Chama Acesa</p>
      </footer>

      <div className="cm-barra">{botao("Comece grátis", "cm-cta-barra")}</div>
    </div>
  );
}
