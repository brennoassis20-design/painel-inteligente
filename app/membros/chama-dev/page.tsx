"use client";

// Bancada de testes do Chama Acesa (só em desenvolvimento): sem login e sem banco, tudo no navegador (localStorage).
// Abrir: http://localhost:3000/membros/chama-dev  ·  no iPhone (mesma Wi-Fi): http://<IP-do-Mac>:3000/membros/chama-dev
// Os botões roxos de cima mexem no relógio e na compra de mentira; as regras são as mesmas do servidor.
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import "../membros.css";
import { criarArmazemLocal } from "@/lib/chama-acesa/armazem";
import type { Dia } from "@/lib/chama-acesa/dias";
import { ChamaApp } from "../chama/ChamaApp";

export default function ChamaDev() {
  const router = useRouter();
  const [versao, setVersao] = useState(0);
  const [montado, setMontado] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- só renderiza no navegador (localStorage)
  useEffect(() => setMontado(true), []);

  const armazem = useMemo(
    () =>
      criarArmazemLocal("dev", {
        buscarDias: async () => ((await (await fetch("/api/chama-dev")).json()) as { dias: Dia[] }).dias,
        checkoutUrl: "https://example.com/checkout-teste",
        oferta365Url: "https://example.com/chama-365",
      }),
    [],
  );

  if (process.env.NODE_ENV === "production") return null;
  if (!montado) return null;
  const info = armazem.dev.ler();
  const mexer = (fn: () => void) => {
    fn();
    setVersao((v) => v + 1);
  };
  return (
    <div className="gp" style={{ ["--gp-bg" as string]: "#0a0f1f", ["--gp-accent" as string]: "#ff8a1f", minHeight: "100dvh" }}>
      <div className="ch-dev">
        <div className="ch-dev-linha">
          <button type="button" onClick={() => mexer(() => armazem.dev.avancar(1))}>Avançar 1 dia (amanhã chegou)</button>
          <button type="button" onClick={() => mexer(() => armazem.dev.avancar(2))}>Pular 1 dia (esquecer um dia)</button>
          <button type="button" onClick={() => mexer(() => armazem.dev.alternarCompra())}>{info.pago ? "Desfazer compra" : "Simular compra"}</button>
          <button type="button" className="perigo" onClick={() => mexer(() => armazem.dev.zerar())}>Zerar</button>
        </div>
        <small>Hoje (simulado): {info.hoje.split("-").reverse().join("/")} · {info.pago ? "COMPRADO" : "só grátis (dias 1 a 3)"}</small>
      </div>
      <ChamaApp key={versao} armazem={armazem} marca="Chama Acesa" onAreaMembros={() => router.push("/membros")} />
    </div>
  );
}
