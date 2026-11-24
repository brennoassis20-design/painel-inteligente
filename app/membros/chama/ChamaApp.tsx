"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Archivo_Black, Inter } from "next/font/google";
import type { Armazem, RespostaAcao } from "@/lib/chama-acesa/armazem";
import type { Dia } from "@/lib/chama-acesa/dias";
import type { Painel } from "@/lib/chama-acesa/painel";
import { diaAtual, diasConcluidos, MAX_BRASAS, NOMES_MEDALHA, podeAbrir, statusDoDia, TOTAL_DIAS, type Check, type Medalha, type StatusDia } from "@/lib/chama-acesa/regras";
import { compartilharCartao, gerarCartao } from "@/lib/chama-acesa/cartao";
import { tagLink } from "@/lib/membros-utm";
import { Chama } from "./Chama";
import "./chama.css";

const titulo = Archivo_Black({ subsets: ["latin"], weight: "400", variable: "--ch-f-titulo", display: "swap" });
const texto = Inter({ subsets: ["latin"], weight: ["400", "600", "800"], variable: "--ch-f-texto", display: "swap" });
const FONTES = `${titulo.variable} ${texto.variable}`;

const SEGUNDOS_ORACAO = 20;

type Aba = "hoje" | "jornada" | "conquistas";
type Vista =
  | { v: "abas" }
  | { v: "passo"; dia: number; passo: Check }
  | { v: "dia"; dia: number }
  | { v: "pagamento" }
  | { v: "acendeu"; r: Pick<RespostaAcao, "completouDia" | "novasMedalhas" | "ganhouBrasa"> }
  | { v: "lembrete" }
  | { v: "celebracao" };

export interface ChamaAppProps {
  armazem: Armazem;
  marca?: string;
  onAreaMembros?: () => void;
  /** Pede a permissão de notificação e inscreve o aparelho. Sem isso (bancada), só guarda o horário. */
  onAtivarPush?: () => Promise<void>;
  /** Origem (UTM) salva do aluno, repassada ao checkout. */
  lerUtm?: () => Record<string, string>;
  email?: string;
}

const paragrafos = (t: string) => t.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
const diasTxt = (n: number) => `${n} ${n === 1 ? "dia" : "dias"}`;

export function ChamaApp({ armazem, marca = "Chama Acesa", onAreaMembros, onAtivarPush, lerUtm, email }: ChamaAppProps) {
  const [painel, setPainel] = useState<Painel | null>(null);
  const [erro, setErro] = useState("");
  const [aba, setAba] = useState<Aba>("hoje");
  const [vista, setVista] = useState<Vista>({ v: "abas" });
  const [aviso, setAviso] = useState("");
  const ocupado = useRef(false);

  const carregar = useCallback(() => {
    void armazem
      .carregar()
      .then((p) => {
        setPainel(p);
        setErro("");
      })
      .catch((e) => setErro(e instanceof Error ? e.message : "Não deu para carregar a sua chama."));
  }, [armazem]);
  useEffect(() => carregar(), [carregar]);

  const toast = (t: string) => {
    setAviso(t);
    window.setTimeout(() => setAviso((a) => (a === t ? "" : a)), 3500);
  };

  const irPara = (v: Vista) => {
    setVista(v);
    window.scrollTo({ top: 0 });
  };

  if (erro && !painel) {
    return (
      <div className={`ch ch-centro ${FONTES}`}>
        <p role="alert">{erro}</p>
        <button type="button" className="ch-btn" onClick={carregar}>Tentar de novo</button>
      </div>
    );
  }
  if (!painel) return <div className={`ch ch-centro ${FONTES}`}>Acendendo o fogo…</div>;

  const { estado, hoje, pago } = painel;
  const conteudo = (n: number): Dia | undefined => painel.dias.find((d) => d.dia === n);
  const atual = diaAtual(estado);
  const acabou = atual > TOTAL_DIAS;

  const agir: (a: Parameters<Armazem["agir"]>[0]) => Promise<RespostaAcao | null> = async (a) => {
    if (ocupado.current) return null;
    ocupado.current = true;
    try {
      const r = await armazem.agir(a);
      setPainel(r);
      return r;
    } catch (e) {
      toast(e instanceof Error ? e.message : "Não deu certo. Tente de novo.");
      return null;
    } finally {
      ocupado.current = false;
    }
  };

  const marcar = async (dia: number, check: Check) => {
    const r = await agir({ tipo: "check", dia, check });
    if (!r) return;
    if (r.completouDia) irPara({ v: "acendeu", r: { completouDia: r.completouDia, novasMedalhas: r.novasMedalhas, ganhouBrasa: r.ganhouBrasa } });
    else irPara({ v: "abas" });
  };

  const abrirDia = (dia: number) => {
    const a = podeAbrir(estado, dia, hoje, pago);
    if (a.ok) return irPara(estado.concluidos[dia] ? { v: "dia", dia } : { v: "abas" });
    if (a.motivo === "pagamento") return irPara({ v: "pagamento" });
    toast(a.motivo === "amanha" ? "Este dia abre amanhã. A chama se alimenta um dia de cada vez." : "Complete os dias anteriores primeiro.");
  };

  const compartilhar = async () => {
    const d = conteudo(Math.max(1, Math.min(atual, TOTAL_DIAS))) ?? painel.dias[0];
    try {
      const blob = await gerarCartao({ chama: estado.chama, versiculo: d?.versiculo ?? "O fogo arderá continuamente sobre o altar; não se apagará.", referencia: d?.referencia ?? "Levítico 6:13", app: marca });
      const como = await compartilharCartao(blob, `🔥 ${diasTxt(estado.chama)} de chama acesa`);
      if (como === "baixado") toast("Imagem salva. Agora é só postar no seu story.");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Não deu para gerar a imagem.");
    }
  };

  const linkCompra = () => {
    if (!painel.checkoutUrl) return null;
    try {
      return tagLink(painel.checkoutUrl, { medium: "cadeado", campaign: "chama-acesa", content: "dia-4", origin: lerUtm?.() ?? null, provider: "cakto", email }).url;
    } catch {
      return painel.checkoutUrl;
    }
  };

  // ------------------------------------------------------------ vistas de tela cheia
  let corpo: React.ReactNode = null;
  if (vista.v === "passo") {
    const d = conteudo(vista.dia);
    corpo = d ? (
      <Passo
        key={`${vista.dia}-${vista.passo}`}
        dia={d}
        passo={vista.passo}
        feito={Boolean(estado.checks[vista.dia]?.[vista.passo])}
        onVoltar={() => irPara({ v: "abas" })}
        onConcluir={() => void marcar(vista.dia, vista.passo)}
      />
    ) : (
      <Vazio onVoltar={() => irPara({ v: "abas" })} />
    );
  } else if (vista.v === "dia") {
    const d = conteudo(vista.dia);
    corpo = d ? <Revisao dia={d} onVoltar={() => irPara({ v: "abas" })} /> : <Vazio onVoltar={() => irPara({ v: "abas" })} />;
  } else if (vista.v === "pagamento") {
    const link = linkCompra();
    corpo = (
      <div className="ch-cheia ch-pag">
        <Chama dias={estado.chama} tamanho={110} />
        <h1>Sua chama tem {diasTxt(estado.chama)}.</h1>
        <p className="ch-grande">Não deixe ela apagar.</p>
        <p className="ch-suave">Os 3 primeiros dias foram o começo. Os outros 18 dias da jornada estão esperando por você, com a mesma rotina de 5 minutos.</p>
        {link ? (
          <a className="ch-btn ch-btn-grande" href={link} target="_blank" rel="noreferrer">Continuar a minha jornada</a>
        ) : (
          <p className="ch-nota">O link de compra ainda não foi configurado (CHAMA_CHECKOUT_URL).</p>
        )}
        <button type="button" className="ch-link" onClick={() => irPara({ v: "abas" })}>Voltar</button>
      </div>
    );
  } else if (vista.v === "acendeu") {
    corpo = (
      <Acendeu
        chama={estado.chama}
        r={vista.r}
        onCompartilhar={() => void compartilhar()}
        onContinuar={() => {
          if (vista.r.completouDia === 1 && !estado.lembrete) irPara({ v: "lembrete" });
          else if (vista.r.completouDia === TOTAL_DIAS) irPara({ v: "celebracao" });
          else irPara({ v: "abas" });
        }}
      />
    );
  } else if (vista.v === "lembrete") {
    corpo = (
      <Lembrete
        chama={estado.chama}
        onSalvar={async (horario) => {
          if (onAtivarPush) {
            try {
              await onAtivarPush();
            } catch (e) {
              toast(e instanceof Error ? e.message : "Não deu para ligar os avisos.");
            }
          }
          await agir({ tipo: "lembrete", horario });
          irPara({ v: "abas" });
        }}
        semPush={!onAtivarPush}
        onDepois={() => irPara({ v: "abas" })}
      />
    );
  } else if (vista.v === "celebracao") {
    corpo = (
      <div className="ch-cheia ch-celebra">
        <div className="ch-confete" aria-hidden="true">{Array.from({ length: 14 }, (_, i) => <i key={i} style={{ left: `${(i * 7 + 3) % 100}%`, animationDelay: `${(i % 7) * 0.25}s` }} />)}</div>
        <Chama dias={estado.chama} acendendo />
        <h1>Jornada completa!</h1>
        <p className="ch-grande">Você manteve o fogo aceso por {TOTAL_DIAS} dias.</p>
        <p className="ch-suave">“O fogo arderá continuamente sobre o altar; não se apagará.” Levítico 6:13. Agora o desafio é fazer disso um estilo de vida.</p>
        {painel.oferta365Url && (
          <div className="ch-card ch-oferta">
            <span className="ch-etiqueta">Continue acesa</span>
            <h2>Chama Acesa 365</h2>
            <p>O ano inteiro com a mesma rotina de 5 minutos por dia.</p>
            <a className="ch-btn ch-btn-grande" href={painel.oferta365Url} target="_blank" rel="noreferrer">Quero o ano inteiro</a>
          </div>
        )}
        <button type="button" className="ch-btn ch-btn-claro" onClick={() => void compartilhar()}>Compartilhar minha chama</button>
        <button type="button" className="ch-link" onClick={() => irPara({ v: "abas" })}>Ver minhas conquistas</button>
      </div>
    );
  }

  if (corpo) {
    return (
      <div className={`ch ${FONTES}`}>
        {corpo}
        {aviso && <p className="ch-toast" role="status">{aviso}</p>}
      </div>
    );
  }

  // ------------------------------------------------------------ abas
  const concl = diasConcluidos(estado);
  return (
    <div className={`ch ${FONTES}`}>
      {estado.avisos.includes("brasa_salvou") && (
        <Faixa tom="brasa" onFechar={() => void agir({ tipo: "limparAvisos" })}>
          <b>Sua brasa guardada salvou a chama!</b> Você ficou um dia sem entrar e a brasa cobriu. Cuide dela hoje.
        </Faixa>
      )}
      {estado.avisos.includes("chama_apagou") && (
        <Faixa tom="apagou" onFechar={() => void agir({ tipo: "limparAvisos" })}>
          <b>A chama apagou.</b> Sem problema: a jornada continua do dia {Math.min(atual, TOTAL_DIAS)}. Acenda de novo hoje.
        </Faixa>
      )}

      {aba === "hoje" && (
        <section className="ch-tela">
          <div className="ch-topo">
            <Chama dias={estado.chama} />
            <div className="ch-num">{estado.chama}</div>
            <div className="ch-num-sub">{estado.chama === 1 ? "dia de chama acesa" : "dias de chama acesa"}</div>
            {estado.brasas > 0 && <div className="ch-brasas" title="Brasa guardada">{Array.from({ length: estado.brasas }, (_, i) => <i key={i} />)}<span>{estado.brasas === 1 ? "1 brasa guardada" : `${estado.brasas} brasas guardadas`}</span></div>}
          </div>
          <Hoje
            atual={atual}
            acabou={acabou}
            dia={conteudo(atual)}
            status={acabou ? "feito" : statusDoDia(estado, atual, hoje, pago)}
            checks={estado.checks[atual]}
            jejum={Boolean(estado.jejum[atual])}
            chama={estado.chama}
            onPasso={(passo) => irPara({ v: "passo", dia: atual, passo })}
            onJejum={(valor) => void agir({ tipo: "jejum", dia: atual, valor })}
            onPagamento={() => irPara({ v: "pagamento" })}
            onCelebracao={() => irPara({ v: "celebracao" })}
          />
          <button type="button" className="ch-btn ch-btn-claro" onClick={() => void compartilhar()} disabled={estado.chama === 0 && concl === 0}>
            Compartilhar minha chama
          </button>
          {onAreaMembros && <button type="button" className="ch-link" onClick={onAreaMembros}>Voltar para a área de membros</button>}
        </section>
      )}

      {aba === "jornada" && (
        <section className="ch-tela">
          <h1>Sua jornada</h1>
          <p className="ch-suave">{concl} de {TOTAL_DIAS} dias concluídos. Um dia por dia, sem pressa.</p>
          <ol className="ch-trilha">
            {Array.from({ length: TOTAL_DIAS }, (_, i) => i + 1).map((n) => {
              const st = statusDoDia(estado, n, hoje, pago);
              const desloc = [0, 1, 2, 1, 0, -1, -2, -1][(n - 1) % 8] * 34;
              return (
                <li key={n} style={{ transform: `translateX(${desloc}px)` }}>
                  <button type="button" className={`ch-no ${st}${n === atual ? " atual" : ""}`} onClick={() => (st === "hoje" ? setAba("hoje") : abrirDia(n))} aria-label={`Dia ${n}: ${ROTULO[st]}`}>
                    <span className="n">{st === "feito" ? "✓" : st === "pago" ? "🔒" : n}</span>
                  </button>
                  <small>{ROTULO_CURTO[st]}{[7, 14, 21].includes(n) ? " · 🏅" : ""}</small>
                </li>
              );
            })}
          </ol>
        </section>
      )}

      {aba === "conquistas" && (
        <section className="ch-tela">
          <h1>Conquistas</h1>
          <div className="ch-card">
            <h2>Brasas guardadas</h2>
            <p className="ch-suave">Você ganha 1 brasa a cada 7 dias de chama (no máximo {MAX_BRASAS}). Se pular um dia, a brasa é usada sozinha e a chama não apaga.</p>
            <div className="ch-brasas grande">{Array.from({ length: MAX_BRASAS }, (_, i) => <i key={i} className={i < estado.brasas ? "" : "vazia"} />)}</div>
          </div>
          <ul className="ch-medalhas">
            {(Object.keys(NOMES_MEDALHA) as Medalha[]).map((m) => {
              const tem = estado.medalhas.includes(m);
              return (
                <li key={m} className={tem ? "tem" : ""}>
                  <span className="ch-medalha" aria-hidden="true">{tem ? (m === "jornada" ? "🏆" : "🏅") : "🔒"}</span>
                  <div>
                    <b>{NOMES_MEDALHA[m].nome}</b>
                    <small>{NOMES_MEDALHA[m].texto}</small>
                  </div>
                </li>
              );
            })}
          </ul>
          <p className="ch-suave">Maior sequência: {diasTxt(estado.maior)}.</p>
        </section>
      )}

      <nav className="ch-nav" aria-label="Seções do app">
        {([["hoje", "🔥", "Hoje"], ["jornada", "🗺️", "Jornada"], ["conquistas", "🏅", "Conquistas"]] as const).map(([id, ic, nome]) => (
          <button key={id} type="button" className={aba === id ? "on" : ""} aria-current={aba === id ? "page" : undefined} onClick={() => { setAba(id); window.scrollTo({ top: 0 }); }}>
            <span aria-hidden="true">{ic}</span>{nome}
          </button>
        ))}
      </nav>
      {aviso && <p className="ch-toast" role="status">{aviso}</p>}
    </div>
  );
}

const ROTULO: Record<StatusDia, string> = { feito: "concluído", hoje: "aberto para hoje", amanha: "abre amanhã", bloqueado: "bloqueado", pago: "bloqueado até a compra" };
const ROTULO_CURTO: Record<StatusDia, string> = { feito: "feito", hoje: "hoje", amanha: "amanhã", bloqueado: "", pago: "" };

function Faixa({ tom, children, onFechar }: { tom: "brasa" | "apagou"; children: React.ReactNode; onFechar: () => void }) {
  return (
    <div className={`ch-faixa ${tom}`} role="status">
      <p>{children}</p>
      <button type="button" onClick={onFechar} aria-label="Fechar aviso">✕</button>
    </div>
  );
}

function Hoje(p: {
  atual: number; acabou: boolean; dia?: Dia; status: StatusDia; checks?: Partial<Record<Check, boolean>>; jejum: boolean; chama: number;
  onPasso: (c: Check) => void; onJejum: (v: boolean) => void; onPagamento: () => void; onCelebracao: () => void;
}) {
  if (p.acabou) {
    return (
      <div className="ch-card">
        <h2>Jornada completa</h2>
        <p className="ch-suave">Você concluiu os {TOTAL_DIAS} dias. Que a chama continue acesa.</p>
        <button type="button" className="ch-btn" onClick={p.onCelebracao}>Ver a celebração</button>
      </div>
    );
  }
  if (p.status === "pago") {
    return (
      <div className="ch-card ch-trava">
        <span className="ch-etiqueta">Dia {p.atual}</span>
        <h2>Sua chama tem {diasTxt(p.chama)}</h2>
        <p className="ch-suave">Para seguir do dia 4 em diante, libere a jornada completa.</p>
        <button type="button" className="ch-btn ch-btn-grande" onClick={p.onPagamento}>Continuar a jornada</button>
      </div>
    );
  }
  if (p.status === "amanha") {
    return (
      <div className="ch-card ch-trava">
        <span className="ch-etiqueta">Dia {p.atual - 1} concluído</span>
        <h2>Volte amanhã</h2>
        <p className="ch-suave">O dia {p.atual} abre amanhã. O fogo se alimenta um pouco por dia, e você já fez a sua parte hoje.</p>
      </div>
    );
  }
  const c = p.checks ?? {};
  const itens: { id: Check; nome: string; dica: string }[] = [
    { id: "leu", nome: "Li a Palavra", dica: "versículo e reflexão" },
    { id: "orou", nome: "Orei", dica: "a oração do dia" },
    { id: "missao", nome: "Cumpri a missão", dica: "uma tarefa pequena" },
  ];
  return (
    <div className="ch-card">
      <span className="ch-etiqueta">Dia {p.atual} de {TOTAL_DIAS}</span>
      <h2>{p.dia?.titulo ?? "Hoje"}</h2>
      {p.dia?.referencia && <p className="ch-ref">{p.dia.referencia}</p>}
      <ul className="ch-checks">
        {itens.map((it) => (
          <li key={it.id}>
            <button type="button" className={c[it.id] ? "feito" : ""} onClick={() => p.onPasso(it.id)}>
              <span className="ch-marca" aria-hidden="true">{c[it.id] ? "✓" : ""}</span>
              <span><b>{it.nome}</b><small>{it.dica}</small></span>
            </button>
          </li>
        ))}
      </ul>
      {p.dia?.jejum && (
        <label className="ch-jejum" aria-label="Jejum opcional">
          <input type="checkbox" checked={p.jejum} onChange={(e) => p.onJejum(e.target.checked)} />
          <span><b>Jejum (opcional)</b><small>{p.dia.jejum}</small></span>
        </label>
      )}
    </div>
  );
}

function Passo({ dia, passo, feito, onVoltar, onConcluir }: { dia: Dia; passo: Check; feito: boolean; onVoltar: () => void; onConcluir: () => void }) {
  const [resta, setResta] = useState(passo === "orou" && !feito ? SEGUNDOS_ORACAO : 0);
  useEffect(() => {
    if (resta <= 0) return;
    const t = window.setTimeout(() => setResta((r) => r - 1), 1000);
    return () => window.clearTimeout(t);
  }, [resta]);
  const pct = passo === "orou" && !feito ? ((SEGUNDOS_ORACAO - resta) / SEGUNDOS_ORACAO) * 100 : 100;
  return (
    <div className="ch-cheia ch-passo">
      <button type="button" className="ch-link voltar" onClick={onVoltar}>‹ Voltar</button>
      <span className="ch-etiqueta">Dia {dia.dia} · {passo === "leu" ? "Palavra" : passo === "orou" ? "Oração" : "Missão"}</span>
      {passo === "leu" && (
        <>
          <h1>{dia.titulo}</h1>
          <blockquote className="ch-versiculo">“{dia.versiculo}”<cite>{dia.referencia}</cite></blockquote>
          {paragrafos(dia.reflexao).map((t, i) => <p key={i} className="ch-texto">{t}</p>)}
        </>
      )}
      {passo === "orou" && (
        <>
          <h1>Hora de orar</h1>
          <p className="ch-oracao">{dia.oracao}</p>
          <p className="ch-suave">Fale com Deus com as suas palavras também. Sem pressa.</p>
        </>
      )}
      {passo === "missao" && (
        <>
          <h1>Sua missão de hoje</h1>
          <p className="ch-missao">{dia.missao}</p>
          <p className="ch-suave">Pequena e prática. Faça e depois marque.</p>
        </>
      )}
      <div className="ch-rodape">
        {feito ? (
          <button type="button" className="ch-btn ch-btn-grande" onClick={onVoltar}>Já concluído · voltar</button>
        ) : (
          <button type="button" className="ch-btn ch-btn-grande ch-progresso" style={{ ["--p" as string]: `${pct}%` }} disabled={resta > 0} onClick={onConcluir}>
            {resta > 0 ? `Continue orando… ${resta}s` : passo === "leu" ? "Li a Palavra" : passo === "orou" ? "Amém, orei" : "Cumpri a missão"}
          </button>
        )}
      </div>
    </div>
  );
}

function Revisao({ dia, onVoltar }: { dia: Dia; onVoltar: () => void }) {
  return (
    <div className="ch-cheia ch-passo">
      <button type="button" className="ch-link voltar" onClick={onVoltar}>‹ Voltar</button>
      <span className="ch-etiqueta">Dia {dia.dia} · concluído</span>
      <h1>{dia.titulo}</h1>
      <blockquote className="ch-versiculo">“{dia.versiculo}”<cite>{dia.referencia}</cite></blockquote>
      {paragrafos(dia.reflexao).map((t, i) => <p key={i} className="ch-texto">{t}</p>)}
      <h2>Oração</h2>
      <p className="ch-oracao">{dia.oracao}</p>
      <h2>Missão</h2>
      <p className="ch-missao">{dia.missao}</p>
    </div>
  );
}

function Vazio({ onVoltar }: { onVoltar: () => void }) {
  return (
    <div className="ch-cheia ch-centro">
      <p>O conteúdo deste dia ainda não está disponível.</p>
      <button type="button" className="ch-btn" onClick={onVoltar}>Voltar</button>
    </div>
  );
}

function Acendeu({ chama, r, onContinuar, onCompartilhar }: { chama: number; r: Pick<RespostaAcao, "completouDia" | "novasMedalhas" | "ganhouBrasa">; onContinuar: () => void; onCompartilhar: () => void }) {
  return (
    <div className="ch-cheia ch-acendeu">
      <Chama dias={chama} acendendo tamanho={130} />
      <h1>Chama acesa!</h1>
      <p className="ch-grande">{diasTxt(chama)} de chama</p>
      <p className="ch-suave">Dia {r.completouDia} concluído. Volte amanhã para alimentar o fogo.</p>
      {r.ganhouBrasa && <div className="ch-ganho"><i className="ch-brasa-i" /> Você ganhou uma <b>brasa guardada</b>. Ela salva a chama se você pular um dia.</div>}
      {r.novasMedalhas.map((m) => (
        <div key={m} className="ch-ganho medalha">🏅 Nova medalha: <b>{NOMES_MEDALHA[m].nome}</b><small>{NOMES_MEDALHA[m].texto}</small></div>
      ))}
      <button type="button" className="ch-btn ch-btn-grande" onClick={onContinuar}>Continuar</button>
      <button type="button" className="ch-btn ch-btn-claro" onClick={onCompartilhar}>Compartilhar minha chama</button>
    </div>
  );
}

function Lembrete({ chama, onSalvar, onDepois, semPush }: { chama: number; onSalvar: (h: string) => Promise<void>; onDepois: () => void; semPush: boolean }) {
  const [hora, setHora] = useState("07:00");
  const [enviando, setEnviando] = useState(false);
  const exemplo = useMemo(() => `🔥 Sua chama de ${chama} ${chama === 1 ? "dia" : "dias"} está te esperando`, [chama]);
  return (
    <div className="ch-cheia ch-lembrete">
      <span className="ch-sino" aria-hidden="true">🔔</span>
      <h1>Quer um lembrete?</h1>
      <p className="ch-suave">Escolha a hora em que você quer lembrar de Deus todo dia. A gente avisa no seu celular.</p>
      <div className="ch-aviso-exemplo">{exemplo}</div>
      <label className="ch-hora">
        <span>Horário</span>
        <input type="time" value={hora} onChange={(e) => setHora(e.target.value || "07:00")} />
      </label>
      {semPush && <p className="ch-nota">Na bancada de testes o horário só é guardado; a notificação de verdade vem na versão instalada.</p>}
      <button type="button" className="ch-btn ch-btn-grande" disabled={enviando} onClick={() => { setEnviando(true); void onSalvar(hora).finally(() => setEnviando(false)); }}>
        Ativar o lembrete
      </button>
      <button type="button" className="ch-link" onClick={onDepois}>Agora não</button>
    </div>
  );
}
