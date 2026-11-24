"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Archivo_Black, Inter } from "next/font/google";
import type { Armazem, RespostaAcao } from "@/lib/chama-acesa/armazem";
import type { Dia } from "@/lib/chama-acesa/dias";
import type { Painel } from "@/lib/chama-acesa/painel";
import { diaAtual, diasConcluidos, inicioSemana, MAX_BRASAS, NOME_JORNADA, podeAbrir, statusDoDia, TOTAL_DIAS, XP, type Check, type StatusDia } from "@/lib/chama-acesa/regras";
import { diasDasMetas, idEstudo, metaDoDia, metasAlcancadas, proximaMeta, type Meta } from "@/lib/chama-acesa/marcos";
import { montarDiaContinuo, type DiaContinuo, type LeituraPlano } from "@/lib/chama-acesa/continuo";
import { situacaoDoPlano } from "@/lib/chama-acesa/biblia-estudo";
import { situacaoNaLiga } from "@/lib/chama-acesa/ligas";
import { montarSessao, type Pergunta } from "@/lib/chama-acesa/pratica";
import { InstalarApp, useVisaoInstalar, type ForcarInstalacao } from "./Instalar";
import { compartilharCartao, gerarCartao, gerarPapelDeParede } from "@/lib/chama-acesa/cartao";
import { atualizarSelo, completouHoje } from "@/lib/chama-acesa/selo";
import { tagLink } from "@/lib/membros-utm";
import { iniciarMusica, lerSomLigado, pararMusica, prepararAudio, salvarSomLigado } from "@/lib/chama-acesa/musica-oracao";
import { Biblia } from "./Biblia";
import { Chama } from "./Chama";
import { OfertasBloco } from "./Ofertas";
import "./chama.css";

const titulo = Archivo_Black({ subsets: ["latin"], weight: "400", variable: "--ch-f-titulo", display: "swap" });
const texto = Inter({ subsets: ["latin"], weight: ["400", "600", "800"], variable: "--ch-f-texto", display: "swap" });
const FONTES = `${titulo.variable} ${texto.variable}`;

const SEGUNDOS_ORACAO = 20;

type Aba = "hoje" | "jornada" | "liga" | "biblia" | "conquistas";
type Vista =
  | { v: "abas" }
  | { v: "passo"; dia: number; passo: Check }
  | { v: "pratica" }
  | { v: "dia"; dia: number }
  | { v: "pagamento" }
  | { v: "acendeu"; r: Pick<RespostaAcao, "completouDia" | "novasMedalhas" | "ganhouBrasa" | "xpGanho"> }
  | { v: "lembrete" }
  | { v: "celebracao" }
  | { v: "meta"; dia: number }
  | { v: "estudo"; dia: number };

export interface ChamaAppProps {
  armazem: Armazem;
  marca?: string;
  onAreaMembros?: () => void;
  /** Pede a permissão de notificação e inscreve o aparelho. Sem isso (bancada), só guarda o horário. */
  onAtivarPush?: () => Promise<void>;
  /** Origem (UTM) salva do aluno, repassada ao checkout. */
  lerUtm?: () => Record<string, string>;
  email?: string;
  /** Bancada: força a visualização das instruções de instalação (iPhone, Android...). */
  instalarForcar?: ForcarInstalacao;
}

const paragrafos = (t: string) => t.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
const diasTxt = (n: number) => `${n} ${n === 1 ? "dia" : "dias"}`;

export function ChamaApp({ armazem, marca = "Chama Acesa", onAreaMembros, onAtivarPush, lerUtm, email, instalarForcar = "auto" }: ChamaAppProps) {
  const [painel, setPainel] = useState<Painel | null>(null);
  const [erro, setErro] = useState("");
  const [aba, setAba] = useState<Aba>("hoje");
  const [vista, setVista] = useState<Vista>({ v: "abas" });
  const [aviso, setAviso] = useState("");
  const ocupado = useRef(false);
  const [xpPop, setXpPop] = useState<{ n: number; k: number } | null>(null);
  const [convidar, setConvidar] = useState(false);
  const [cartaoInstalarFechado, setCartaoInstalarFechado] = useState(false);
  const visaoInstalar = useVisaoInstalar(instalarForcar);
  // O título da aba é sempre o do app (a área pode ainda estar com o nome do Gênio Play).
  useEffect(() => {
    document.title = marca === "Gênio Play" ? "Chama Acesa" : marca;
  }, [marca]);

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

  // Depois do dia 21 a Palavra do dia é o capítulo do plano de leitura ativo (se houver): vem do armazém da Bíblia.
  const [leitura, setLeitura] = useState<LeituraPlano | null>(null);
  const precisaLeitura = painel ? diaAtual(painel.estado) > TOTAL_DIAS : false;
  useEffect(() => {
    if (!precisaLeitura || !armazem.biblia) return;
    let vivo = true;
    armazem.biblia
      .carregar()
      .then((b) => {
        const sit = b.estado.plano ? situacaoDoPlano(b.estado.plano, b.hoje) : null;
        if (vivo) setLeitura(sit?.hoje ? { nome: sit.hoje.nome, plano: sit.plano.nome } : null);
      })
      .catch(() => vivo && setLeitura(null));
    return () => {
      vivo = false;
    };
  }, [precisaLeitura, armazem, aba]);

  // Selo no ícone: aceso enquanto o dia de hoje não estiver completo; confere ao abrir e ao voltar ao foco.
  const feitoHoje = painel ? completouHoje(painel.estado.concluidos, painel.hoje) : true;
  const jornadaAcabou = false;
  const painelOk = Boolean(painel);
  useEffect(() => {
    if (!painelOk) return;
    const aplicar = () => void atualizarSelo(!feitoHoje && !jornadaAcabou && document.visibilityState === "visible");
    aplicar();
    document.addEventListener("visibilitychange", aplicar);
    window.addEventListener("focus", aplicar);
    return () => {
      document.removeEventListener("visibilitychange", aplicar);
      window.removeEventListener("focus", aplicar);
    };
  }, [painelOk, feitoHoje, jornadaAcabou]);

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
  const conteudo = (n: number): DiaContinuo | Dia | undefined =>
    n <= TOTAL_DIAS ? painel.dias.find((d) => d.dia === n) : montarDiaContinuo({ dia: n, missoes: painel.missoes ?? [], versiculos: painel.versiculos, leitura });
  const atual = diaAtual(estado);
  const diasMetas = diasDasMetas(painel.marcos);
  const metaDe = (dia: number): Meta | null => metaDoDia(dia, painel.marcos ?? [], diasMetas);

  const agir: (a: Parameters<Armazem["agir"]>[0]) => Promise<RespostaAcao | null> = async (a) => {
    if (ocupado.current) return null;
    ocupado.current = true;
    try {
      const r = await armazem.agir(a);
      setPainel(r);
      if (r.xpGanho > 0) {
        const k = Date.now();
        setXpPop({ n: r.xpGanho, k });
        window.setTimeout(() => setXpPop((x) => (x && x.k === k ? null : x)), 1700);
      }
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
    if (r.completouDia) irPara({ v: "acendeu", r: { completouDia: r.completouDia, novasMedalhas: r.novasMedalhas, ganhouBrasa: r.ganhouBrasa, xpGanho: r.xpGanho } });
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

  const papelDeParede = async () => {
    try {
      const blob = await gerarPapelDeParede({ chama: estado.chama, app: marca });
      const como = await compartilharCartao(blob, `🔥 ${diasTxt(estado.chama)} de chama acesa`, "papel-de-parede-chama.png");
      if (como === "baixado") toast("Imagem salva. Abra nas fotos e use como tela de bloqueio.");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Não deu para gerar a imagem.");
    }
  };

  const comUtm = (url: string | null, content: string) => {
    if (!url) return null;
    try {
      return tagLink(url, { medium: "cadeado", campaign: "chama-acesa", content, origin: lerUtm?.() ?? null, provider: "eduzz", email }).url;
    } catch {
      return url;
    }
  };
  // Duas opções (vitalício e mensal); sem nenhum link novo, cai no checkout antigo.
  const temOfertas = Boolean(painel.ofertas?.vitalicioUrl || painel.ofertas?.mensalUrl);
  const hrefsCompra = { vitalicio: comUtm(painel.ofertas?.vitalicioUrl ?? null, "dia-4-vitalicio"), mensal: comUtm(painel.ofertas?.mensalUrl ?? null, "dia-4-mensal") };
  const linkCompra = () => comUtm(painel.checkoutUrl, "dia-4");
  const blocoCompra = (): React.ReactNode =>
    temOfertas ? (
      <OfertasBloco ofertas={painel.ofertas} hrefs={hrefsCompra} />
    ) : linkCompra() ? (
      <a className="ch-btn ch-btn-grande" href={linkCompra()!} target="_blank" rel="noreferrer">Continuar a minha jornada</a>
    ) : (
      <p className="ch-nota">O link de compra ainda não foi configurado (CHAMA_CHECKOUT_VITALICIO_URL e CHAMA_CHECKOUT_MENSAL_URL).</p>
    );

  const linkConvite = `${painel.conviteBase}?ref=${painel.codigo}`;
  const textoConvite = `Tô fazendo um desafio de 21 dias com Deus, 5 minutos por dia, e tô com ${estado.chama} ${estado.chama === 1 ? "dia" : "dias"} de chama acesa 🔥 Começa comigo, os primeiros dias são grátis: ${linkConvite}`;
  const sit = situacaoNaLiga(estado, hoje, painel.hora, painel.semente, painel.ligas, painel.nome);
  const res = estado.liga.resultado;

  // ------------------------------------------------------------ vistas de tela cheia
  let corpo: React.ReactNode = null;
  if (vista.v === "abas" && res) {
    const de = painel.ligas.ligas[Math.min(res.liga, painel.ligas.ligas.length - 1)];
    const para = painel.ligas.ligas[Math.min(res.para, painel.ligas.ligas.length - 1)];
    corpo = (
      <div className="ch-cheia">
        <span className="ch-liga-icone" aria-hidden="true">{res.resultado === "subiu" ? "🚀" : res.resultado === "desceu" ? "📉" : "🛡️"}</span>
        <h1>{res.resultado === "subiu" ? "Você subiu de liga!" : res.resultado === "desceu" ? "Você desceu de liga" : "Você ficou na liga"}</h1>
        <p className="ch-grande">{res.resultado === "ficou" ? `${de.icone} ${de.nome}` : `${de.icone} ${de.nome} → ${para.icone} ${para.nome}`}</p>
        <p className="ch-suave">Você terminou a semana em {res.posicao}º lugar com {res.xp} XP. {res.resultado === "subiu" ? "A disputa agora é mais forte. Vamos!" : res.resultado === "desceu" ? "Semana nova, chance nova: volte a ganhar XP todo dia." : "Mais uma semana para tentar subir."}</p>
        <button type="button" className="ch-btn ch-btn-grande" onClick={() => void agir({ tipo: "limparResultadoLiga" })}>Começar a nova semana</button>
      </div>
    );
  } else if (vista.v === "pratica") {
    corpo = <Pratica banco={painel.versiculos} vistos={estado.praticas} onFim={(acertos, ids) => agir({ tipo: "pratica", acertos, ids })} onSair={() => irPara({ v: "abas" })} />;
  } else if (vista.v === "passo") {
    const d = conteudo(vista.dia);
    corpo = d ? (
      <Passo
        key={`${vista.dia}-${vista.passo}`}
        dia={d}
        passo={vista.passo}
        feito={Boolean(estado.checks[vista.dia]?.[vista.passo])}
        onVoltar={() => irPara({ v: "abas" })}
        onAbrirBiblia={() => { setAba("biblia"); irPara({ v: "abas" }); }}
        onConcluir={() => void marcar(vista.dia, vista.passo)}
      />
    ) : (
      <Vazio onVoltar={() => irPara({ v: "abas" })} />
    );
  } else if (vista.v === "dia") {
    const d = conteudo(vista.dia);
    corpo = d ? <Revisao dia={d} onVoltar={() => irPara({ v: "abas" })} /> : <Vazio onVoltar={() => irPara({ v: "abas" })} />;
  } else if (vista.v === "pagamento") {
    corpo = (
      <div className="ch-cheia ch-pag">
        <Chama dias={estado.chama} tamanho={110} />
        <h1>Sua chama tem {diasTxt(estado.chama)}.</h1>
        <p className="ch-grande">Não deixe ela apagar.</p>
        <p className="ch-suave">Os 3 primeiros dias foram o começo. A jornada de 21 dias e a chama que continua depois dela estão esperando por você, com a mesma rotina de 5 minutos. Seu progresso fica guardado e a Bíblia continua grátis.</p>
        {blocoCompra()}
        <button type="button" className="ch-link" onClick={() => irPara({ v: "abas" })}>Voltar</button>
      </div>
    );
  } else if (vista.v === "acendeu") {
    corpo = (
      <Acendeu
        chama={estado.chama}
        r={vista.r}
        cobrar={vista.r.completouDia === 3 && !pago ? blocoCompra() : null}
        nomeMeta={(id) => metaDe(Number(id.replace("meta", "")))?.nome ?? id}
        onCompartilhar={() => void compartilhar()}
        onContinuar={() => {
          if (vista.r.completouDia === 1 && !estado.lembrete) irPara({ v: "lembrete" });
          else if (vista.r.completouDia === TOTAL_DIAS) irPara({ v: "celebracao" });
          else {
            const nova = vista.r.novasMedalhas.filter((m) => /^meta\d+$/.test(m)).map((m) => Number(m.slice(4))).sort((x, y) => y - x)[0];
            irPara(nova ? { v: "meta", dia: nova } : { v: "abas" });
          }
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
        instalarForcar={instalarForcar}
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

  if (vista.v === "meta") {
    const m = metaDe(vista.dia);
    corpo = (
      <div className="ch-cheia ch-celebra">
        <div className="ch-confete" aria-hidden="true">{Array.from({ length: 14 }, (_, i) => <i key={i} style={{ left: `${(i * 7 + 3) % 100}%`, animationDelay: `${(i % 7) * 0.25}s` }} />)}</div>
        <Chama dias={vista.dia} acendendo />
        <span className="ch-etiqueta">Meta alcançada</span>
        <h1>{diasTxt(vista.dia)} de chama!</h1>
        <p className="ch-grande">{m?.nome ?? ""}</p>
        {m && m.estudo ? <p className="ch-suave">Tem um estudo bíblico esperando por você: ele é sobre este número.</p> : null}
        <button type="button" className="ch-btn ch-btn-grande" onClick={() => irPara({ v: "estudo", dia: vista.dia })}>Abrir o estudo de hoje</button>
        <button type="button" className="ch-btn ch-btn-claro" onClick={() => void compartilhar()}>Compartilhar minha chama</button>
        <button type="button" className="ch-link" onClick={() => irPara({ v: "abas" })}>Agora não</button>
      </div>
    );
  } else if (vista.v === "estudo") {
    const m = metaDe(vista.dia);
    corpo = m ? (
      <Estudo
        meta={m}
        feito={estado.medalhas.includes(idEstudo(vista.dia))}
        onVoltar={() => irPara({ v: "abas" })}
        onConcluir={async () => {
          const r = await agir({ tipo: "estudo", dia: vista.dia });
          if (r) irPara({ v: "abas" });
        }}
      />
    ) : (
      <Vazio onVoltar={() => irPara({ v: "abas" })} />
    );
  }

  if (corpo) {
    return (
      <div className={`ch ${FONTES}`}>
        {corpo}
        {xpPop && <div className="ch-xp-pop" key={xpPop.k} aria-live="polite">+{xpPop.n} XP</div>}
        {aviso && <p className="ch-toast" role="status">{aviso}</p>}
      </div>
    );
  }

  // ------------------------------------------------------------ abas
  const concl = diasConcluidos(estado);
  const proxima = proximaMeta(estado.chama, diasMetas);
  const alcancadas = metasAlcancadas(estado, painel.marcos ?? []);
  return (
    <div className={`ch ${FONTES}`}>
      {estado.avisos.includes("brasa_salvou") && (
        <Faixa tom="brasa" onFechar={() => void agir({ tipo: "limparAvisos" })}>
          <b>Sua brasa guardada salvou a chama!</b> Você ficou um dia sem entrar e a brasa cobriu. Cuide dela hoje.
        </Faixa>
      )}
      {estado.avisos.includes("chama_apagou") && (
        <Faixa tom="apagou" onFechar={() => void agir({ tipo: "limparAvisos" })}>
          <b>A chama apagou.</b> Sem problema: a jornada continua do dia {atual}. Acenda de novo hoje.
        </Faixa>
      )}

      {aba === "hoje" && (
        <section className="ch-tela">
          <div className="ch-topo">
            <Chama dias={estado.chama} />
            <div className="ch-num">{estado.chama}</div>
            <div className="ch-num-sub">{estado.chama === 1 ? "dia de chama acesa" : "dias de chama acesa"}</div>
            <div className="ch-pills"><span className="ch-pill">⚡ {estado.xp} XP</span><span className="ch-pill">Semana: {estado.xpSemana[inicioSemana(hoje)] ?? 0} XP</span></div>
            {estado.brasas > 0 && <div className="ch-brasas" title="Brasa guardada">{Array.from({ length: estado.brasas }, (_, i) => <i key={i} />)}<span>{estado.brasas === 1 ? "1 brasa guardada" : `${estado.brasas} brasas guardadas`}</span></div>}
          </div>
          <Hoje
            atual={atual}
            dia={conteudo(atual)}
            status={statusDoDia(estado, atual, hoje, pago)}
            checks={estado.checks[atual]}
            jejum={Boolean(estado.jejum[atual])}
            chama={estado.chama}
            onPasso={(passo) => {
              if (passo === "orou") prepararAudio(); // o toque que abre a oração destrava o áudio no iPhone
              irPara({ v: "passo", dia: atual, passo });
            }}
            onJejum={(valor) => void agir({ tipo: "jejum", dia: atual, valor })}
            onPagamento={() => irPara({ v: "pagamento" })}
          />
          {visaoInstalar !== "nada" && !cartaoInstalarFechado && concl === 0 && <InstalarApp forcar={instalarForcar} onFechar={() => setCartaoInstalarFechado(true)} />}
          <button type="button" className="ch-btn ch-btn-claro" onClick={() => setVista({ v: "pratica" })}>Ler mais versículos</button>
          {feitoHoje && <button type="button" className="ch-btn ch-btn-claro" onClick={() => setConvidar(true)}>Convidar um amigo</button>}
          <button type="button" className="ch-btn ch-btn-claro" onClick={() => void compartilhar()} disabled={estado.chama === 0 && concl === 0}>
            Compartilhar minha chama
          </button>
          {onAreaMembros && <button type="button" className="ch-link" onClick={onAreaMembros}>Voltar para a área de membros</button>}
        </section>
      )}

      {aba === "jornada" && (
        <section className="ch-tela">
          <h1>Sua jornada</h1>
          <p className="ch-suave">{Math.min(concl, TOTAL_DIAS)} de {TOTAL_DIAS} dias da jornada concluídos{concl > TOTAL_DIAS ? `. Depois dela, a chama segue: ${concl} dias feitos no total` : ""}. Um dia por dia, sem pressa.</p>
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

      {aba === "liga" && (
        <section className="ch-tela">
          <div className="ch-liga-topo">
            <span className="ch-liga-icone" style={{ filter: `drop-shadow(0 0 12px ${sit.liga.cor})` }} aria-hidden="true">{sit.liga.icone}</span>
            <h1>Liga {sit.liga.nome}</h1>
            {sit.liga.descricao && <p className="ch-suave">{sit.liga.descricao}</p>}
            <p className="ch-grande">Você está em {sit.posicao}º lugar</p>
            <p className="ch-suave">Faltam {sit.restante.dias}d {sit.restante.horas}h para a semana acabar. Os {painel.ligas.sobem} primeiros sobem{estado.liga.indice > 0 ? `; os ${painel.ligas.descem} últimos descem` : ""}.</p>
          </div>
          <div className="ch-liga-lista">
            {sit.linhas.map((l, i) => {
              const zona = l.posicao <= painel.ligas.sobem && estado.liga.indice < painel.ligas.ligas.length - 1 ? "sobe" : l.posicao > painel.ligas.tamanho - painel.ligas.descem && estado.liga.indice > 0 ? "desce" : "";
              const antes = i > 0 ? sit.linhas[i - 1].posicao : 0;
              return (
                <Fragment key={`${l.nome}-${l.posicao}`}>
                  {i === 0 && estado.liga.indice < painel.ligas.ligas.length - 1 && <div className="ch-zona sobe">▲ Zona de subida</div>}
                  {antes === painel.ligas.sobem && <div className="ch-zona">Zona segura</div>}
                  {l.posicao === painel.ligas.tamanho - painel.ligas.descem + 1 && estado.liga.indice > 0 && <div className="ch-zona desce">▼ Zona de descida</div>}
                  <div className={`${zona}${l.voce ? " voce" : ""}`} style={{ display: "flex", gap: 10, alignItems: "center", background: "var(--ch-card)", borderRadius: 14, padding: "10px 12px", border: l.voce ? "1px solid var(--ch-ouro)" : "1px solid transparent", ...(zona === "sobe" ? { background: "#12301f" } : zona === "desce" ? { background: "#3b1a1a" } : {}) }}>
                    <span className="pos">{l.posicao}</span>
                    <span className="nome">{l.voce ? "Você" : l.nome}</span>
                    <span className="xp">{l.xp} XP</span>
                  </div>
                </Fragment>
              );
            })}
          </div>
        </section>
      )}

      {aba === "biblia" && <Biblia biblia={armazem.biblia} onAtivarPush={onAtivarPush} />}

      {aba === "conquistas" && (
        <section className="ch-tela">
          <h1>Conquistas</h1>
          <div className="ch-card">
            <h2>Seu perfil</h2>
            <p className="ch-suave">⚡ {estado.xp} XP no total · {estado.xpSemana[inicioSemana(hoje)] ?? 0} XP nesta semana · liga {sit.liga.icone} {sit.liga.nome}</p>
          </div>
          {visaoInstalar !== "nada" && <InstalarApp forcar={instalarForcar} />}
          <div className="ch-card">
            <h2>Amigos</h2>
            <p className="ch-suave">{estado.amigos === 0 ? "Nenhum amigo aceitou ainda." : estado.amigos === 1 ? "1 amigo aceitou o convite e começou a jornada." : `${estado.amigos} amigos aceitaram o convite e começaram a jornada.`} Quando um amigo completa o dia 1, você ganha {XP.convite} XP e 1 brasa guardada.</p>
            <button type="button" className="ch-btn" onClick={() => setConvidar(true)}>Convidar um amigo</button>
          </div>
          <div className="ch-card">
            <h2>Brasas guardadas</h2>
            <p className="ch-suave">Você ganha 1 brasa a cada 7 dias de chama (no máximo {MAX_BRASAS}). Se pular um dia, a brasa é usada sozinha e a chama não apaga.</p>
            <div className="ch-brasas grande">{Array.from({ length: MAX_BRASAS }, (_, i) => <i key={i} className={i < estado.brasas ? "" : "vazia"} />)}</div>
          </div>
          <div className="ch-card ch-meta-prox">
            <span className="ch-etiqueta">Próxima meta</span>
            <h2>{proxima} dias{metaDe(proxima)?.nome && !metaDe(proxima)?.generica ? ` · ${metaDe(proxima)!.nome}` : ""}</h2>
            <div className="ch-meta-barra" role="progressbar" aria-valuemin={0} aria-valuemax={proxima} aria-valuenow={estado.chama}><i style={{ width: `${Math.min(100, (estado.chama / proxima) * 100)}%` }} /></div>
            <p className="ch-suave">{proxima - estado.chama === 1 ? "Falta 1 dia" : `Faltam ${proxima - estado.chama} dias`} de chama para esta meta.</p>
          </div>
          <h2>Metas alcançadas</h2>
          {alcancadas.length === 0 ? <p className="ch-suave">As metas aparecem aqui conforme a sua chama cresce. A primeira é de 3 dias.</p> : (
            <ul className="ch-meta-lista">
              {alcancadas.map((m) => (
                <li key={m.dia}>
                  <button type="button" onClick={() => irPara({ v: "estudo", dia: m.dia })}>
                    <span className="ch-medalha" aria-hidden="true">{estado.medalhas.includes(idEstudo(m.dia)) ? "📖" : "🏅"}</span>
                    <div><b>{diasTxt(m.dia)} · {m.nome}</b><small>{m.estudo ? "Toque para reler o estudo" : "Meta alcançada"}</small></div>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {estado.medalhas.includes("jornada") && (
            <div className="ch-ganho medalha">🏆 <b>{NOME_JORNADA.nome}</b><small>{NOME_JORNADA.texto}</small></div>
          )}
          <p className="ch-suave">Maior sequência: {diasTxt(estado.maior)}.</p>
          <button type="button" className="ch-btn ch-btn-claro" onClick={() => void papelDeParede()}>Papel de parede da chama</button>
        </section>
      )}

      <nav className="ch-nav cinco" aria-label="Seções do app">
        {([["hoje", "🔥", "Hoje"], ["jornada", "🗺️", "Jornada"], ["liga", sit.liga.icone, "Liga"], ["biblia", "📖", "Bíblia"], ["conquistas", "🏅", "Conquistas"]] as const).map(([id, ic, nome]) => (
          <button key={id} type="button" className={aba === id ? "on" : ""} aria-current={aba === id ? "page" : undefined} onClick={() => { setAba(id); window.scrollTo({ top: 0 }); }}>
            <span aria-hidden="true">{ic}</span>{nome}
          </button>
        ))}
      </nav>
      {convidar && <ConviteSheet texto={textoConvite} link={linkConvite} onFechar={() => setConvidar(false)} chama={estado.chama} />}
      {xpPop && <div className="ch-xp-pop" key={xpPop.k} aria-live="polite">+{xpPop.n} XP</div>}
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
  atual: number; dia?: Dia; status: StatusDia; checks?: Partial<Record<Check, boolean>>; jejum: boolean; chama: number;
  onPasso: (c: Check) => void; onJejum: (v: boolean) => void; onPagamento: () => void;
}) {
  if (p.status === "pago") {
    return (
      <div className="ch-card ch-trava">
        <span className="ch-etiqueta">Dia {p.atual}</span>
        <h2>Sua chama tem {diasTxt(p.chama)}</h2>
        <p className="ch-suave">Para seguir do dia 4 em diante, escolha como continuar: vitalício ou mensal. Seu progresso fica guardado.</p>
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
      <span className="ch-etiqueta">{p.atual > TOTAL_DIAS ? `Dia ${p.atual}` : `Dia ${p.atual} de ${TOTAL_DIAS}`}</span>
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

function Passo({ dia, passo, feito, onVoltar, onConcluir, onAbrirBiblia }: { dia: Dia | DiaContinuo; passo: Check; feito: boolean; onVoltar: () => void; onConcluir: () => void; onAbrirBiblia: () => void }) {
  const [resta, setResta] = useState(passo === "orou" && !feito ? SEGUNDOS_ORACAO : 0);
  useEffect(() => {
    if (resta <= 0) return;
    const t = window.setTimeout(() => setResta((r) => r - 1), 1000);
    return () => window.clearTimeout(t);
  }, [resta]);
  const [som, setSom] = useState(lerSomLigado);
  const orando = passo === "orou";
  // Música só enquanto a oração está aberta: sai com fade ao fechar, marcar, trocar de aba ou ir para o segundo plano.
  useEffect(() => {
    if (!orando || !som) return;
    iniciarMusica();
    const fundo = () => {
      if (document.visibilityState === "hidden") pararMusica(0.2);
    };
    document.addEventListener("visibilitychange", fundo);
    window.addEventListener("pagehide", fundo);
    return () => {
      document.removeEventListener("visibilitychange", fundo);
      window.removeEventListener("pagehide", fundo);
      pararMusica();
    };
  }, [orando, som]);
  const alternarSom = () => {
    const novo = !som;
    if (novo) prepararAudio(); // dentro do toque
    salvarSomLigado(novo);
    setSom(novo);
  };
  const pct = passo === "orou" && !feito ? ((SEGUNDOS_ORACAO - resta) / SEGUNDOS_ORACAO) * 100 : 100;
  return (
    <div className="ch-cheia ch-passo">
      <button type="button" className="ch-link voltar" onClick={onVoltar}>‹ Voltar</button>
      <span className="ch-etiqueta">Dia {dia.dia} · {passo === "leu" ? "Palavra" : passo === "orou" ? "Oração" : "Missão"}</span>
      {passo === "leu" && (
        <>
          <h1>{dia.titulo}</h1>
          {dia.versiculo ? <blockquote className="ch-versiculo">“{dia.versiculo}”<cite>{dia.referencia}</cite></blockquote> : <p className="ch-grande">{dia.referencia}</p>}
          {paragrafos(dia.reflexao).map((t, i) => <p key={i} className="ch-texto">{t}</p>)}
          {"doPlano" in dia && dia.doPlano && <button type="button" className="ch-btn ch-btn-claro" onClick={onAbrirBiblia}>Abrir a Bíblia para ler</button>}
        </>
      )}
      {passo === "orou" && (
        <>
          <button type="button" className="ch-som" aria-pressed={som} onClick={alternarSom}>
            <span aria-hidden="true">{som ? "🔊" : "🔇"}</span>Música de fundo: {som ? "ligada" : "desligada"}
          </button>
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
          <button type="button" className="ch-btn ch-btn-grande ch-progresso" style={{ ["--p" as string]: `${pct}%` }} disabled={resta > 0} onClick={() => { if (orando) pararMusica(); onConcluir(); }}>
            {resta > 0 ? `Continue orando… ${resta}s` : passo === "leu" ? "Li a Palavra" : passo === "orou" ? "Amém, orei" : "Cumpri a missão"}
          </button>
        )}
      </div>
    </div>
  );
}

function Estudo({ meta, feito, onVoltar, onConcluir }: { meta: Meta; feito: boolean; onVoltar: () => void; onConcluir: () => void | Promise<void> }) {
  const [enviando, setEnviando] = useState(false);
  return (
    <div className="ch-cheia ch-passo">
      <button type="button" className="ch-link voltar" onClick={onVoltar}>‹ Voltar</button>
      <span className="ch-etiqueta">Estudo · {diasTxt(meta.dia)} de chama</span>
      <h1>{meta.nome}</h1>
      {meta.versiculo && <blockquote className="ch-versiculo">“{meta.versiculo}”<cite>{meta.referencia}</cite></blockquote>}
      {paragrafos(meta.estudo).map((t, i) => <p key={i} className="ch-texto">{t}</p>)}
      {meta.pergunta && (
        <>
          <h2>Para pensar</h2>
          <p className="ch-pergunta">{meta.pergunta}</p>
        </>
      )}
      {meta.oracao && (
        <>
          <h2>Oração</h2>
          <p className="ch-oracao">{meta.oracao}</p>
        </>
      )}
      <div className="ch-rodape">
        {feito ? (
          <button type="button" className="ch-btn ch-btn-grande" onClick={onVoltar}>Estudo concluído · voltar</button>
        ) : (
          <button type="button" className="ch-btn ch-btn-grande" disabled={enviando} onClick={() => { setEnviando(true); void Promise.resolve(onConcluir()).finally(() => setEnviando(false)); }}>
            Concluir estudo (+{XP.estudo} XP)
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

function Acendeu({ chama, r, cobrar, nomeMeta, onContinuar, onCompartilhar }: { chama: number; r: Pick<RespostaAcao, "completouDia" | "novasMedalhas" | "ganhouBrasa" | "xpGanho">; cobrar: React.ReactNode | null; nomeMeta: (id: string) => string; onContinuar: () => void; onCompartilhar: () => void }) {
  return (
    <div className="ch-cheia ch-acendeu">
      <Chama dias={chama} acendendo tamanho={130} />
      <h1>Chama acesa!</h1>
      <p className="ch-grande">{diasTxt(chama)} de chama</p>
      <p className="ch-suave">Dia {r.completouDia} concluído. Volte amanhã para alimentar o fogo.</p>
      {r.xpGanho > 0 && <div className="ch-pill">⚡ +{r.xpGanho} XP neste dia</div>}
      {cobrar !== null && (
        <div className="ch-card ch-oferta">
          <span className="ch-etiqueta">Seu dia 3 está feito</span>
          <h2>Garanta a sua jornada</h2>
          <p>Você acendeu a chama por 3 dias. A partir do dia 4 o app pede uma das duas opções abaixo. Seu progresso fica guardado e a Bíblia continua grátis.</p>
          {cobrar}
        </div>
      )}
      {r.ganhouBrasa && <div className="ch-ganho"><i className="ch-brasa-i" /> Você ganhou uma <b>brasa guardada</b>. Ela salva a chama se você pular um dia.</div>}
      {r.novasMedalhas.map((m) => (m === "jornada"
        ? <div key={m} className="ch-ganho medalha">🏆 Nova medalha: <b>{NOME_JORNADA.nome}</b><small>{NOME_JORNADA.texto}</small></div>
        : <div key={m} className="ch-ganho medalha">🏅 Meta alcançada: <b>{nomeMeta(m)}</b><small>{diasTxt(Number(m.replace("meta", "")))} de chama</small></div>
      ))}
      <button type="button" className="ch-btn ch-btn-grande" onClick={onContinuar}>Continuar</button>
      <button type="button" className="ch-btn ch-btn-claro" onClick={onCompartilhar}>Compartilhar minha chama</button>
    </div>
  );
}

function Lembrete({ chama, onSalvar, onDepois, semPush, instalarForcar }: { chama: number; onSalvar: (h: string) => Promise<void>; onDepois: () => void; semPush: boolean; instalarForcar: ForcarInstalacao }) {
  const [hora, setHora] = useState("07:00");
  const [enviando, setEnviando] = useState(false);
  const exemplo = useMemo(() => `🔥 Sua chama de ${chama} ${chama === 1 ? "dia" : "dias"} está te esperando`, [chama]);
  return (
    <div className="ch-cheia ch-lembrete">
      <div className="ch-mascote"><Chama dias={Math.max(chama, 1)} tamanho={70} /><small>A Brasinha</small></div>
      <h1>Quer um lembrete?</h1>
      <p className="ch-suave">Escolha a hora em que você quer lembrar de Deus todo dia. A gente avisa no seu celular.</p>
      <div className="ch-aviso-exemplo">{exemplo}</div>
      <InstalarApp forcar={instalarForcar} motivo="O lembrete só funciona com o app instalado na tela de início. Instale primeiro e depois ative o lembrete." />
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

function ConviteSheet({ texto, link, onFechar, chama }: { texto: string; link: string; onFechar: () => void; chama: number }) {
  const [msg, setMsg] = useState("");
  const podeCompartilhar = typeof navigator !== "undefined" && "share" in navigator;
  return (
    <div className="ch-sheet" role="dialog" aria-modal="true" aria-label="Convidar um amigo">
      <div>
        <div className="ch-mascote"><Chama dias={Math.max(chama, 1)} tamanho={64} /><small>A Brasinha</small></div>
        <h2>Convide um amigo</h2>
        <p className="ch-suave">{texto}</p>
        {podeCompartilhar && (
          <button type="button" className="ch-btn" onClick={() => void navigator.share({ text: texto }).catch(() => undefined)}>Compartilhar</button>
        )}
        <a className="ch-btn ch-btn-claro" href={`https://wa.me/?text=${encodeURIComponent(texto)}`} target="_blank" rel="noreferrer">Abrir no WhatsApp</a>
        <button
          type="button"
          className="ch-btn ch-btn-claro"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(texto);
              setMsg("Texto copiado.");
            } catch {
              setMsg(`Copie o link: ${link}`);
            }
          }}
        >
          Copiar o texto
        </button>
        {msg && <p className="ch-suave" role="status">{msg}</p>}
        <button type="button" className="ch-link" onClick={onFechar}>Fechar</button>
      </div>
    </div>
  );
}

function Pratica({ banco, vistos, onFim, onSair }: { banco: Parameters<typeof montarSessao>[0]; vistos: Record<string, number>; onFim: (acertos: number, ids: string[]) => Promise<unknown>; onSair: () => void }) {
  const [perguntas] = useState<Pergunta[]>(() => montarSessao(banco, vistos));
  const [i, setI] = useState(0);
  const [escolha, setEscolha] = useState<number | null>(null);
  const [acertos, setAcertos] = useState(0);
  const [fim, setFim] = useState(false);
  const total = perguntas.length;
  if (total === 0) return <Vazio onVoltar={onSair} />;
  if (fim) {
    const perfeita = total === 5 && acertos === 5;
    const xp = acertos * XP.acertoPratica + (perfeita ? XP.praticaPerfeita : 0);
    return (
      <div className="ch-cheia">
        <Chama dias={acertos >= 3 ? 7 : 2} acendendo tamanho={100} />
        <h1>{perfeita ? "Sessão perfeita!" : "Sessão concluída"}</h1>
        <p className="ch-grande">⚡ +{xp} XP</p>
        <p className="ch-suave">Você acertou {acertos} de {total}. A prática não muda o seu dia nem a sua chama: é só para fixar a Palavra.</p>
        <button type="button" className="ch-btn ch-btn-grande" onClick={onSair}>Continuar</button>
      </div>
    );
  }
  const p = perguntas[i];
  const respondeu = escolha !== null;
  const acertou = escolha === p.correta;
  const proxima = async () => {
    const novoAcertos = acertos;
    if (i + 1 >= total) {
      await onFim(novoAcertos, perguntas.map((x) => x.id));
      setFim(true);
    } else {
      setI(i + 1);
      setEscolha(null);
    }
  };
  return (
    <div className="ch-cheia ch-passo">
      <div className="ch-pratica-topo">
        <button type="button" onClick={onSair} aria-label="Sair da prática">✕</button>
        <div className="ch-barra" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={i + (respondeu ? 1 : 0)}><i style={{ width: `${((i + (respondeu ? 1 : 0)) / total) * 100}%` }} /></div>
      </div>
      <span className="ch-etiqueta">{p.enunciado}</span>
      <p className="ch-trecho">{p.trecho}</p>
      <div className="ch-opcoes">
        {p.opcoes.map((o, k) => (
          <button key={o} type="button" disabled={respondeu} className={respondeu ? (k === p.correta ? "certa" : k === escolha ? "errada" : "") : ""} onClick={() => { setEscolha(k); if (k === p.correta) setAcertos((a) => a + 1); }}>
            {o}
          </button>
        ))}
      </div>
      {respondeu && (
        <>
          <div className={`ch-feedback ${acertou ? "certa" : "errada"}`} role="status">
            {acertou ? `Certo! +${XP.acertoPratica} XP` : `Não foi dessa vez. Resposta: ${p.opcoes[p.correta]}`}
            <small style={{ display: "block", fontWeight: 400 }}>{p.referencia}</small>
          </div>
          <div className="ch-rodape"><button type="button" className="ch-btn ch-btn-grande" onClick={() => void proxima()}>{i + 1 >= total ? "Ver resultado" : "Continuar"}</button></div>
        </>
      )}
    </div>
  );
}
