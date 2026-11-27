"use client";
// Maná do dia (prêmio diário depois de fazer o dia) e "Palavra no coração" (versículos lidos). 27/11.
import { useState } from "react";
import { DIAS_SABADO, diasParaSabado, textoPremio, type EstadoMana, type PremioMana } from "@/lib/chama-acesa/mana";
import { comparacaoVersos } from "@/lib/chama-acesa/versos-lidos";
import { Talento } from "./Tesouro";

const dataCurta = (d: string | null) => (d ? d.split("-").reverse().slice(0, 2).join("/") : "");
const versosTxt = (n: number) => (n === 1 ? "1 versículo" : `${n.toLocaleString("pt-BR")} versículos`);

/** Card na tela Hoje: aparece só com o dia feito e o maná ainda não recolhido. */
export function ManaPronto({ onAbrir }: { onAbrir: () => void }) {
  return (
    <button type="button" className="ch-mana-pronto" onClick={onAbrir}>
      <span className="graos" aria-hidden="true"><i /><i /><i /><i /><i /></span>
      <span className="tx">
        <b>Seu maná de hoje está pronto</b>
        <small>Recolha o seu prêmio do dia</small>
      </span>
    </button>
  );
}

/** Tela cheia: recolher o maná e ver o prêmio. */
export function ManaTela({ mana, hoje, ontem, onRecolher, onVoltar }: {
  mana: EstadoMana | undefined;
  hoje: string;
  ontem: string;
  onRecolher: () => Promise<PremioMana[] | null>;
  onVoltar: () => void;
}) {
  const [premios, setPremios] = useState<PremioMana[] | null>(null);
  const [abrindo, setAbrindo] = useState(false);
  const jaRecolheu = mana?.dia === hoje;
  const faltam = diasParaSabado(mana, hoje, ontem);
  const sabado = premios && mana?.dia === hoje && mana.seq % DIAS_SABADO === 0;

  return (
    <div className={`ch-cheia ch-mana${premios ? " aberto" : ""}`}>
      <div className="ch-mana-cena" aria-hidden="true">
        {Array.from({ length: 14 }, (_, k) => <i key={k} style={{ left: `${(k * 37) % 100}%`, animationDelay: `${(k % 7) * 0.09}s` }} />)}
        <span className="cesto" />
      </div>

      {!premios ? (
        <>
          <h1>Maná do dia</h1>
          <p className="ch-mana-versiculo">“Cada dia o povo sairá e colherá a porção para cada dia.” Êxodo 16:4</p>
          {jaRecolheu ? (
            <p className="ch-suave">Você já recolheu o maná de hoje. Amanhã, depois de fazer o dia, tem mais.</p>
          ) : (
            <>
              <p className="ch-suave">{faltam === 0 ? "Hoje é maná de sábado: as chances de prêmio maior sobem." : `Recolha todo dia. Em ${faltam === 1 ? "1 dia" : `${faltam} dias`} vem o maná de sábado, com prêmio maior.`}</p>
              <button
                type="button"
                className="ch-btn ch-btn-grande"
                disabled={abrindo}
                onClick={async () => {
                  setAbrindo(true);
                  const p = await onRecolher();
                  setAbrindo(false);
                  if (p) setPremios(p);
                }}
              >
                {abrindo ? "Recolhendo…" : "Recolher o maná"}
              </button>
            </>
          )}
          <button type="button" className="ch-link" onClick={onVoltar}>Voltar</button>
        </>
      ) : (
        <>
          <h1>{sabado ? "Maná de sábado!" : premios.length > 1 ? "Maná dobrado!" : "Você recolheu"}</h1>
          <ul className="ch-mana-premios" aria-live="polite">
            {premios.map((p, k) => (
              <li key={k} style={{ animationDelay: `${0.35 + k * 0.2}s` }}>
                <span className={`ico ${p.tipo}`} aria-hidden="true">{p.tipo === "talentos" ? <Talento tam={26} /> : p.tipo === "brasa" ? <i className="ch-brasa-i" /> : p.tipo === "vigilia" ? "2×" : "XP"}</span>
                <b>{textoPremio(p)}</b>
              </li>
            ))}
          </ul>
          {premios.some((p) => p.tipo === "vigilia") && <p className="ch-suave">Aproveite agora: faça o Desafio da Palavra com o XP em dobro.</p>}
          <p className="ch-suave">{faltam === 0 ? "Amanhã a contagem para o próximo sábado recomeça." : `Faltam ${faltam === 1 ? "1 dia" : `${faltam} dias`} para o maná de sábado.`}</p>
          <button type="button" className="ch-btn ch-btn-grande" onClick={onVoltar}>Continuar</button>
        </>
      )}
    </div>
  );
}

/** "Palavra no coração": card com os versículos lidos (Jornada e Minha conta). */
export function PalavraNoCoracao({ total, desde, carregando }: { total: number; desde: string | null; carregando?: boolean }) {
  const comp = comparacaoVersos(total);
  return (
    <section className="ch-card ch-palavra" aria-label="Versículos lidos">
      <h2>Palavra no coração</h2>
      <p className="ch-palavra-n">
        <b>{carregando ? "…" : total.toLocaleString("pt-BR")}</b>
        <span>{total === 1 ? "versículo lido" : "versículos lidos"}{desde ? ` desde ${dataCurta(desde)}` : ""}</span>
      </p>
      <p className="ch-suave">{comp ?? "Cada dia feito, cada desafio e cada capítulo lido na Bíblia entram aqui."}</p>
    </section>
  );
}

/** Resumo no topo de Minha conta: talentos, brasas, versículos e o maná. */
export function ResumoConta({ talentos, brasas, maxBrasas, versos, desde, manaPendente, feitoHoje, onTesouro, onMana }: {
  talentos: number; brasas: number; maxBrasas: number; versos: number | null; desde: string | null;
  manaPendente: boolean; feitoHoje: boolean; onTesouro: () => void; onMana: () => void;
}) {
  return (
    <div className="ch-resumo-conta">
      <button type="button" className="ch-resumo-item" onClick={onTesouro}>
        <Talento tam={22} />
        <b>{talentos}</b>
        <small>talentos</small>
      </button>
      <button type="button" className="ch-resumo-item" onClick={onTesouro}>
        <span className="ch-brasas-mini" aria-hidden="true">{Array.from({ length: maxBrasas }, (_, i) => <i key={i} className={i < brasas ? "" : "vazia"} />)}</span>
        <b>{brasas} de {maxBrasas}</b>
        <small>brasas</small>
      </button>
      <div className="ch-resumo-item">
        <b>{versos === null ? "…" : versos.toLocaleString("pt-BR")}</b>
        <small>versículos lidos{desde ? ` desde ${dataCurta(desde)}` : ""}</small>
      </div>
      <button type="button" className={`ch-resumo-mana${manaPendente ? " pronto" : ""}`} onClick={onMana} disabled={!manaPendente && !feitoHoje}>
        <b>Maná do dia</b>
        <small>{manaPendente ? "Pronto para recolher" : feitoHoje ? "Já recolhido hoje" : "Abre depois que você faz o dia"}</small>
      </button>
    </div>
  );
}

export { versosTxt };
