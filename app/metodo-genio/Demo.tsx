"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useState } from "react";

// As etapas reais da tela "Seu produto está sendo criado" do Painel Inteligente.
const ETAPAS = [
  "Analisando o nicho e o público",
  "Estruturando os capítulos",
  "Escrevendo o conteúdo do produto",
  "Diagramando o produto",
  "Montando a página de vendas",
  "Criando a copy e os prompts",
  "Revisando e empacotando o ZIP",
];

const CARREGA = 5200; // ms de 0 a 100%
const PRONTO = 4200; // ms mostrando o produto pronto

// Demonstração em loop: a lâmpada carrega até 100% e depois aparece a tela real "Produto criado".
export function Demo() {
  const [t, setT] = useState(0);
  const [parado, setParado] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const id = window.setTimeout(() => setParado(true), 0);
      return () => window.clearTimeout(id);
    }
    const inicio = performance.now();
    const id = window.setInterval(() => setT((performance.now() - inicio) % (CARREGA + PRONTO)), 60);
    return () => window.clearInterval(id);
  }, []);

  const pronto = parado || t >= CARREGA;
  const pct = pronto ? 100 : Math.min(100, Math.round((t / CARREGA) * 100));
  const feitas = Math.floor((pct / 100) * ETAPAS.length);

  return (
    <div className="mg-demo" aria-label="Demonstração: o Painel criando um produto até 100% e o produto pronto">
      <div className={`mg-demo-load${pronto ? " is-off" : ""}`} aria-hidden={pronto}>
        <img className="mg-demo-lamp" src="/mg/lampada.png" width={158} height={158} alt="" />
        <p className="mg-demo-k">Pedido em andamento</p>
        <p className="mg-demo-t">Seu produto está sendo criado</p>
        <div className="mg-demo-bar">
          <span style={{ width: `${pct}%` }} />
        </div>
        <p className="mg-demo-pct">{pct}%</p>
        <ul>
          {ETAPAS.map((e, i) => (
            <li key={e} className={i < feitas ? "is-ok" : i === feitas ? "is-now" : ""}>
              <i />
              {e}
            </li>
          ))}
        </ul>
      </div>
      <div className={`mg-demo-done${pronto ? " is-on" : ""}`} aria-hidden={!pronto}>
        <p className="mg-demo-ok">Produto pronto ✅</p>
        <img src="/mg/produto-ouro-marmitas.webp" width={1100} height={640} alt="Produto pronto na edição Lâmpada de Ouro: capa com foto e páginas por dentro" />
        <p className="mg-demo-cap">14 Marmitas em 2 Horas · edição Lâmpada de Ouro</p>
      </div>
    </div>
  );
}
