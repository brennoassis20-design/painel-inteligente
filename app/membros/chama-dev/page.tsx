"use client";

// Bancada de testes do Chama Acesa (só em desenvolvimento): sem login e sem banco, tudo no navegador (localStorage).
// Abrir: http://localhost:3000/membros/chama-dev  ·  no iPhone (mesma Wi-Fi): http://<IP-do-Mac>:3000/membros/chama-dev
// Os botões roxos de cima mexem no relógio, na compra, no XP e nos lembretes de mentira; as regras são as mesmas do servidor.
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import "../membros.css";
import { criarArmazemLocal, type Conteudo } from "@/lib/chama-acesa/armazem";
import type { Mensagem } from "@/lib/chama-acesa/lembretes";
import { ChamaApp } from "../chama/ChamaApp";
import type { ForcarInstalacao } from "../chama/Instalar";

export default function ChamaDev() {
  const router = useRouter();
  const [versao, setVersao] = useState(0);
  const [montado, setMontado] = useState(false);
  const [forcar, setForcar] = useState<ForcarInstalacao>("auto");
  const [semAbrir, setSemAbrir] = useState(0);
  const [previa, setPrevia] = useState<{ rotulo: string; m: Mensagem | null } | null>(null);
  const [aberto, setAberto] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- só renderiza no navegador (localStorage)
  useEffect(() => setMontado(true), []);

  const armazem = useMemo(
    () =>
      criarArmazemLocal("dev", {
        buscarConteudo: async () => (await (await fetch("/api/chama-dev")).json()) as Conteudo,
        checkoutUrl: "https://example.com/checkout-teste",
        ofertas: { vitalicioUrl: "https://chk.eduzz.com/mznmfsl3", mensalUrl: "https://example.com/chama-mensal", parcelaVitalicio: "12x de R$ 15,20" },
        oferta365Url: "https://example.com/chama-365",
      }),
    [],
  );

  if (process.env.NODE_ENV === "production") return null;
  if (!montado) return null;
  const info = armazem.dev.ler();
  const mexer = (fn: () => void) => {
    fn();
    setPrevia(null);
    setVersao((v) => v + 1);
  };
  const ver = async (rotulo: string, tipo: "manha" | "noite" | "dia4") => setPrevia({ rotulo, m: await armazem.dev.previa(tipo, semAbrir) });
  const verBiblia = async () => {
    const m = await armazem.biblia.dev.previa();
    setPrevia({ rotulo: "Lembrete da leitura da Bíblia", m: m ? { tipo: "manha", categoria: "biblia", chave: "biblia", titulo: m.titulo, corpo: m.corpo } : null });
  };
  return (
    <div className="gp" style={{ ["--gp-bg" as string]: "#0a0f1f", ["--gp-accent" as string]: "#ff8a1f", minHeight: "100dvh" }}>
      <div className="ch-dev">
        <div className="ch-dev-linha">
          <button type="button" onClick={() => setAberto(!aberto)}>{aberto ? "Esconder controles" : "Controles de teste"}</button>
        </div>
        {aberto && (
          <>
            <div className="ch-dev-linha" style={{ marginTop: 6 }}>
              <button type="button" onClick={() => mexer(() => armazem.dev.avancar(1))}>Avançar 1 dia (amanhã chegou)</button>
              <button type="button" onClick={() => mexer(() => armazem.dev.avancar(2))}>Pular 1 dia (esquecer um dia)</button>
              <button type="button" onClick={() => mexer(() => armazem.dev.alternarCompra())}>{info.pago ? "Desfazer compra" : "Simular compra"}</button>
              <button type="button" onClick={() => mexer(() => armazem.dev.ganharXp(50))}>Ganhar +50 XP</button>
              {[69, 99, 999].map((n) => <button key={n} type="button" onClick={() => mexer(() => { armazem.dev.definirChama(n); })}>Chama em {n}</button>)}
              {[3, 99].map((n) => <button key={n} type="button" onClick={() => mexer(() => armazem.dev.simularHistorico(n))}>Histórico de {n} dias (coerente)</button>)}
              <button type="button" onClick={() => mexer(() => armazem.dev.virarSemana())}>Virar a semana</button>
              <button type="button" onClick={() => mexer(() => armazem.dev.simularAmigo())}>Amigo aceitou</button>
              <button type="button" onClick={() => mexer(() => armazem.dev.simularMembros(0))}>Ranking fictício</button>
              <button type="button" onClick={() => mexer(() => armazem.dev.simularMembros(8))}>Simular 8 membros reais (9 com você, fica fictício)</button>
              <button type="button" onClick={() => mexer(() => armazem.dev.simularMembros(14))}>Simular 14 membros reais (15 com você)</button>
              <button type="button" className="perigo" onClick={() => mexer(() => armazem.dev.zerar())}>Zerar</button>
            </div>
            <div className="ch-dev-linha" style={{ marginTop: 6 }}>
              <select aria-label="Visual de instalação" value={forcar} onChange={(e) => setForcar(e.target.value as ForcarInstalacao)}>
                <option value="auto">Instalar: automático</option>
                <option value="ios">Instalar: iPhone Safari</option>
                <option value="ios-chrome">Instalar: iPhone Chrome/Instagram</option>
                <option value="android">Instalar: Android Chrome</option>
                <option value="instalado">Instalar: já instalado</option>
              </select>
              <select aria-label="Dias sem abrir" value={semAbrir} onChange={(e) => setSemAbrir(Number(e.target.value))}>
                {[0, 2, 5, 14, 15].map((n) => <option key={n} value={n}>{n === 0 ? "Abriu hoje" : `Sumiu ${n} dias`}</option>)}
              </select>
              <button type="button" onClick={() => void ver("Lembrete da manhã", "manha")}>Prévia manhã</button>
              <button type="button" onClick={() => void ver("Lembrete das 21h", "noite")}>Prévia noite</button>
              <button type="button" onClick={() => void ver("Cobrança do dia 4", "dia4")}>Prévia dia 4</button>
              <button type="button" onClick={() => void verBiblia()}>Prévia leitura Bíblia</button>
            </div>
            {previa && (
              <div className="ch-dev-previa">
                <b>{previa.rotulo}</b>
                {previa.m ? <div>[{previa.m.categoria}] <b>{previa.m.titulo}</b><br />{previa.m.corpo}</div> : <div>Nenhuma notificação seria enviada nesta situação.</div>}
              </div>
            )}
            <small>Hoje (simulado): {info.hoje.split("-").reverse().join("/")} · {info.pago ? "COMPRADO" : "só grátis (dias 1 a 3)"}</small>
          </>
        )}
      </div>
      <ChamaApp key={versao} armazem={armazem} marca="Chama Acesa" instalarForcar={forcar} onAreaMembros={() => router.push("/membros")} />
    </div>
  );
}
