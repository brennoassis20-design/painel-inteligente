"use client";

// "Mais com seus talentos": Dia do Senhor, Hora da vigília, Voto de 7 dias e Brasa de irmão (extras.ts).
import { useEffect, useState } from "react";
import type { RespostaAcao } from "@/lib/chama-acesa/armazem";
import { DIAS_DO_VOTO, escudoAtivo, podeDarBrasa, segundosDeVigilia, type AmigoChama } from "@/lib/chama-acesa/extras";
import type { Acao, Estado } from "@/lib/chama-acesa/regras";
import { PRECO } from "@/lib/chama-acesa/talentos";

export interface PropsExtras {
  estado: Estado;
  hoje: string;
  agir: (a: Acao) => Promise<RespostaAcao | null>;
  toast: (t: string) => void;
  /** Amigos convidados (vem do servidor; vazio na bancada). */
  amigos?: AmigoChama[];
  /** Leva ao Desafio da Palavra (chamada da vigília). */
  onPraticar?: () => void;
}

const dataBr = (d: string) => d.split("-").reverse().slice(0, 2).join("/");

/** Faixa da Hora da vigília: contagem regressiva do XP em dobro. Some quando acaba. */
export function FaixaVigilia({ estado, onPraticar }: { estado: Estado; onPraticar?: () => void }) {
  const [agora, setAgora] = useState(() => Date.now());
  const ate = estado.extras?.vigiliaAte ?? null;
  useEffect(() => {
    if (!ate || Date.now() >= ate) return;
    const t = window.setInterval(() => setAgora(Date.now()), 30000);
    return () => window.clearInterval(t);
  }, [ate]);
  const s = segundosDeVigilia(estado.extras ?? {}, agora);
  if (s <= 0) return null;
  return (
    <div className="ch-card" style={{ borderColor: "var(--ch-btn-bg)" }}>
      <h2>Hora da vigília</h2>
      <p><b>XP em dobro no Desafio da Palavra</b> <span className="ch-suave">· mais {Math.ceil(s / 60)} min</span></p>
      <p className="ch-suave">&ldquo;Não pudestes vigiar comigo uma hora?&rdquo; (Mt 26:40).{estado.chama > 0 ? " Aproveite o fogo aceso." : ""}</p>
      {onPraticar && <button type="button" className="ch-btn ch-btn-claro" onClick={onPraticar}>Fazer o Desafio da Palavra</button>}
    </div>
  );
}

function Item({ titulo, ref_, texto, children }: { titulo: string; ref_: string; texto: string; children: React.ReactNode }) {
  return (
    <div style={{ borderTop: "1px solid var(--ch-linha)", paddingTop: 14, marginTop: 14, display: "grid", gap: 8 }}>
      <h3 style={{ margin: 0, fontSize: 17 }}>{titulo} <small className="ch-suave">({ref_})</small></h3>
      <p className="ch-suave" style={{ margin: 0 }}>{texto}</p>
      {children}
    </div>
  );
}

export function ExtrasCard({ estado, hoje, agir, toast, amigos = [], onPraticar }: PropsExtras) {
  const talentos = estado.talentos ?? 0;
  const ex = estado.extras ?? {};
  const voto = ex.voto ?? null;
  const [ocupado, setOcupado] = useState(false);
  const [confirmarVoto, setConfirmarVoto] = useState(false);
  const executar = async (a: Acao, ok: string) => {
    if (ocupado) return;
    setOcupado(true);
    try {
      if (await agir(a)) toast(ok);
    } finally {
      setOcupado(false);
    }
  };
  const escudo = escudoAtivo(estado, hoje);
  const motivoBrasa = podeDarBrasa(estado, hoje);
  const diasDoVoto = voto ? Math.min(DIAS_DO_VOTO, Math.max(0, estado.chama - voto.chamaInicio)) : 0;

  return (
    <>
      <FaixaVigilia estado={estado} onPraticar={onPraticar} />
      {(estado.avisos.includes("voto_cumprido") || estado.avisos.includes("voto_quebrado")) && (
        <div className="ch-card" role="status">
          {estado.avisos.includes("voto_cumprido") && <p><b>Voto cumprido!</b> Você guardou a palavra e recebeu {PRECO.voto * 2} talentos.</p>}
          {estado.avisos.includes("voto_quebrado") && <p><b>O voto se quebrou.</b> A chama apagou e os {PRECO.voto} talentos separados se perderam. Comece outro quando quiser.</p>}
          <button type="button" className="ch-btn ch-btn-claro" onClick={() => void agir({ tipo: "limparAvisos" })}>Entendi</button>
        </div>
      )}
      <div className="ch-card">
        <h2>Mais com seus talentos</h2>
        <p className="ch-suave">Você tem <b>{talentos}</b> talentos.</p>

        <Item titulo="Dia do Senhor" ref_="Êx 20:8" texto="Vai ao culto e não abre o app? O domingo fica guardado.">
          {escudo ? (
            <p><b>Escudo guardado para o domingo {dataBr(ex.escudoDomingo as string)}.</b> Ele cobre o dia sem gastar brasa.</p>
          ) : (
            <button type="button" className="ch-btn ch-btn-claro" disabled={ocupado || talentos < PRECO.escudoDomingo} onClick={() => void executar({ tipo: "comprarEscudo" }, "Escudo guardado para o domingo.")}>
              Guardar o domingo por {PRECO.escudoDomingo} talentos
            </button>
          )}
        </Item>

        <Item titulo="Voto de 7 dias" ref_="Sl 116:14" texto={`Separe ${PRECO.voto} talentos e prometa 7 dias seguidos. Cumpriu, recebe ${PRECO.voto * 2}. Se a chama apagar, os talentos separados se perdem (brasa guardada não quebra o voto).`}>
          {voto ? (
            <p><b>Voto em andamento: {diasDoVoto} de {DIAS_DO_VOTO} dias.</b> Desde {dataBr(voto.inicio)}.</p>
          ) : confirmarVoto ? (
            <div style={{ display: "grid", gap: 8 }}>
              <p style={{ margin: 0 }}><b>Separar {PRECO.voto} dos seus {talentos} talentos?</b> Você recebe {PRECO.voto * 2} quando completar os 7 dias.</p>
              <button type="button" className="ch-btn" disabled={ocupado} onClick={() => { setConfirmarVoto(false); void executar({ tipo: "fazerVoto" }, "Voto feito. Agora é guardar a palavra."); }}>
                Sim, fazer o voto
              </button>
              <button type="button" className="ch-link" onClick={() => setConfirmarVoto(false)}>Agora não</button>
            </div>
          ) : (
            <button type="button" className="ch-btn ch-btn-claro" disabled={ocupado || talentos < PRECO.voto} onClick={() => setConfirmarVoto(true)}>
              Fazer o voto por {PRECO.voto} talentos
            </button>
          )}
        </Item>

        <Item titulo="Brasa de irmão" ref_="Gl 6:2" texto="Leve as cargas uns dos outros: dê uma das suas brasas guardadas a um amigo que você convidou. Uma por semana.">
          {amigos.length === 0 ? (
            <p className="ch-suave">Você ainda não tem amigos por aqui. Convide alguém na aba Metas e, quando ele entrar, poderá presenteá-lo.</p>
          ) : (
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 8 }}>
              {amigos.map((a) => (
                <li key={a.codigo} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                  <span><b>{a.nome}</b> <small className="ch-suave">chama de {a.chama} {a.chama === 1 ? "dia" : "dias"}</small></span>
                  <button
                    type="button"
                    className="ch-btn ch-btn-claro"
                    style={{ width: "auto", minHeight: 44, fontSize: 15 }}
                    disabled={ocupado || Boolean(motivoBrasa) || a.brasas >= 2}
                    title={motivoBrasa ?? (a.brasas >= 2 ? "As brasas dele estão cheias." : undefined)}
                    onClick={() => void executar({ tipo: "darBrasa", para: a.codigo }, `Brasa enviada para ${a.nome}.`)}
                  >
                    Dar uma brasa
                  </button>
                </li>
              ))}
            </ul>
          )}
          {motivoBrasa && amigos.length > 0 && <p className="ch-suave" style={{ margin: 0 }}>{motivoBrasa}</p>}
        </Item>
      </div>
    </>
  );
}
