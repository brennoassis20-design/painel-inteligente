"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Bricolage_Grotesque, Inter, Newsreader, Plus_Jakarta_Sans } from "next/font/google";
import type { Armazem, RespostaAcao } from "@/lib/chama-acesa/armazem";
import type { Dia } from "@/lib/chama-acesa/dias";
import type { Painel } from "@/lib/chama-acesa/painel";
import { diaAtual, diasConcluidos, inicioSemana, MAX_BRASAS, NOME_JORNADA, podeAbrir, somarDias, statusDoDia, TOTAL_DIAS, XP, type Check, type StatusDia } from "@/lib/chama-acesa/regras";
import { progressoBiblia } from "@/lib/chama-acesa/biblia-estudo";
import { aplicarTemaNaPagina, lerTema, salvarTema, type Tema } from "@/lib/chama-acesa/tema";
import { diasDasMetas, idEstudo, metaDoDia, metasAlcancadas, proximaMeta, type Meta } from "@/lib/chama-acesa/marcos";
import { montarDiaContinuo, type DiaContinuo, type LeituraPlano } from "@/lib/chama-acesa/continuo";
import { situacaoDoPlano } from "@/lib/chama-acesa/biblia-estudo";
import { situacaoNaLiga } from "@/lib/chama-acesa/ligas";
import { montarSessao, type Pergunta } from "@/lib/chama-acesa/pratica";
import { InstalarApp, useVisaoInstalar, type ForcarInstalacao } from "./Instalar";
import { pushPermission } from "../app";
import { compartilharCartao, gerarCartao, gerarPapelDeParede } from "@/lib/chama-acesa/cartao";
import { atualizarSelo, completouHoje } from "@/lib/chama-acesa/selo";
import { tagLink } from "@/lib/membros-utm";
import { iniciarMusica, lerSomLigado, pararMusica, prepararAudio, salvarSomLigado } from "@/lib/chama-acesa/musica-oracao";
import { Biblia } from "./Biblia";
import { Avatar } from "./Avatar";
import { Chama } from "./Chama";
import { ContaTela } from "./Conta";
import { ExtrasCard } from "./Extras";
import { OfertasBloco } from "./Ofertas";
import { Anel, IconeAba, IconeCheck, IconeCoracao, IconeEnvio, IconeLivro, IconeVoltar, MiniChama, type IdAba } from "./Icones";
import "./chama.css";

// Fontes dos dois temas: claro = Plus Jakarta Sans; escuro = Bricolage Grotesque (títulos e números) + Inter; texto bíblico = Newsreader nos dois.
const bric = Bricolage_Grotesque({ subsets: ["latin"], weight: ["600", "800"], variable: "--ch-f-bric", display: "swap" });
const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--ch-f-inter", display: "swap" });
const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"], variable: "--ch-f-jak", display: "swap" });
const serifada = Newsreader({ subsets: ["latin"], weight: ["400", "500"], style: ["normal", "italic"], variable: "--ch-f-serif", display: "swap" });
const FONTES = `${bric.variable} ${inter.variable} ${jakarta.variable} ${serifada.variable}`;

/** Raiz do app: marca o tema (claro/escuro), as fontes e o fundo da tela inteira. */
function Raiz({ tema, className = "", children }: { tema: Tema; className?: string; children: React.ReactNode }) {
  return (
    <div className={`ch ${FONTES}${className ? ` ${className}` : ""}`} data-tema={tema}>
      <div className="ch-fundo" aria-hidden="true" />
      {children}
    </div>
  );
}

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
  | { v: "estudo"; dia: number }
  | { v: "conta" };

export interface ChamaAppProps {
  armazem: Armazem;
  marca?: string;
  onAreaMembros?: () => void;
  /** Pede a permissão de notificação e inscreve o aparelho. Sem isso (bancada), só guarda o horário. */
  onAtivarPush?: () => Promise<void>;
  /** Origem (UTM) salva do aluno, repassada ao checkout. */
  lerUtm?: () => Record<string, string>;
  email?: string;
  /** Sair da conta (a área de membros faz o logout). Sem isso, o botão não aparece. */
  onSair?: () => void;
  /** Bancada: força a visualização das instruções de instalação (iPhone, Android...). */
  instalarForcar?: ForcarInstalacao;
}

const paragrafos = (t: string) => t.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
const diasTxt = (n: number) => `${n} ${n === 1 ? "dia" : "dias"}`;

export function ChamaApp({ armazem, marca = "Chama Acesa", onAreaMembros, onAtivarPush, lerUtm, email, onSair, instalarForcar = "auto" }: ChamaAppProps) {
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
  // Popup dos avisos: aparece uma vez por dia (no aparelho) até a pessoa ativar as notificações.
  const [popupAvisos, setPopupAvisos] = useState(false);
  // Sininho: sem avisos ativos neste aparelho, fica sempre com 1 aviso pendente (ativar as notificações).
  const [avisosAtivos, setAvisosAtivos] = useState(true);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- lê a permissão do navegador depois de montar
    setAvisosAtivos(pushPermission() === "granted");
  }, [popupAvisos]);
  // Tema: claro é o padrão para todo mundo; a escolha fica salva no aparelho (localStorage).
  const [tema, setTema] = useState<Tema>(() => lerTema());
  useEffect(() => aplicarTemaNaPagina(tema), [tema]);
  const trocarTema = (t: Tema) => {
    setTema(t);
    salvarTema(t);
  };
  // Jornada: capítulos da Bíblia lidos (só se o armazém da Bíblia existir; senão a tela mostra o XP).
  const [capitulos, setCapitulos] = useState<number | null>(null);
  useEffect(() => {
    if (aba !== "jornada" || !armazem.biblia) return;
    let vivo = true;
    armazem.biblia
      .carregar()
      .then((b) => vivo && setCapitulos(progressoBiblia(b.estado.lidos).lidos))
      .catch(() => vivo && setCapitulos(null));
    return () => {
      vivo = false;
    };
  }, [aba, armazem]);
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
  useEffect(() => {
    if (!painel || !onAtivarPush || diasConcluidos(painel.estado) < 1) return;
    if (pushPermission() === "granted") return;
    const chave = "chama-popup-avisos";
    try {
      if (localStorage.getItem(chave) === painel.hoje) return;
      localStorage.setItem(chave, painel.hoje);
    } catch {
      /* sem armazenamento: mostra mesmo assim */
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- decide uma vez por dia, depois de carregar
    setPopupAvisos(true);
  }, [painel, onAtivarPush]);

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
      <Raiz tema={tema} className="ch-centro">
        <p role="alert">{erro}</p>
        <button type="button" className="ch-btn" onClick={carregar}>Tentar de novo</button>
      </Raiz>
    );
  }
  if (!painel) return <Raiz tema={tema} className="ch-centro">Acendendo o fogo…</Raiz>;

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
  const sit = situacaoNaLiga(estado, hoje, painel.hora, painel.semente, painel.ligas, painel.nome, painel.ranking, painel.outrosReais);
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
        <header className="ch-pag-cab">
          <span className="ch-pag-selo"><span><MiniChama tam={18} /></span>{diasTxt(estado.chama)} de chama</span>
          <h1>Sua chama está em {diasTxt(estado.chama)}.<br />Não deixe ela apagar.</h1>
          <p>Os 3 primeiros dias foram o começo. Continue de onde parou: dia {atual} da jornada, com a mesma rotina de 5 minutos. Seu progresso fica guardado.</p>
        </header>
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
        onDepois={() => {
          // Já perguntou hoje: o popup dos avisos só volta amanhã.
          try {
            localStorage.setItem("chama-popup-avisos", painel.hoje);
          } catch {
            /* segue */
          }
          irPara({ v: "abas" });
        }}
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

  if (vista.v === "conta" && armazem.conta) {
    corpo = (
      <ContaTela
        armazem={armazem.conta}
        onVoltar={() => irPara({ v: "abas" })}
        onMudou={carregar}
        onAssinar={() => irPara({ v: "pagamento" })}
        onSair={onSair}
        chama={estado.chama}
        ligaNome={sit.liga.nome}
        lembrete={estado.lembrete}
        tema={tema}
        onTema={trocarTema}
      />
    );
  } else if (vista.v === "meta") {
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
      <Raiz tema={tema}>
        {corpo}
        {xpPop && <div className="ch-xp-pop" key={xpPop.k} aria-live="polite">+{xpPop.n} XP</div>}
        {aviso && <p className="ch-toast" role="status">{aviso}</p>}
      </Raiz>
    );
  }

  // ------------------------------------------------------------ abas
  const concl = diasConcluidos(estado);
  const proxima = proximaMeta(estado.chama, diasMetas);
  const alcancadas = metasAlcancadas(estado, painel.marcos ?? []);
  const nomeMeta = (dia: number) => {
    const m = metaDe(dia);
    return m?.nome && !m.generica ? m.nome : `${diasTxt(dia)} de chama`;
  };
  const diasFeitos = new Set(Object.values(estado.concluidos));
  const ultimaLiga = estado.liga.indice >= painel.ligas.ligas.length - 1;
  const proximaLiga = ultimaLiga ? null : painel.ligas.ligas[estado.liga.indice + 1];
  const eu = sit.linhas.find((l) => l.voce);
  const primeiroNome = (painel.nome || "").trim().split(/\s+/)[0];
  const saudacao = painel.hora < 12 ? "Bom dia" : painel.hora < 18 ? "Boa tarde" : "Boa noite";
  const tempoLiga = `${sit.restante.dias}d ${sit.restante.horas}h`;
  const regraLiga = [proximaLiga ? `os ${sit.limites.sobem} primeiros sobem` : "", estado.liga.indice > 0 && sit.limites.descem > 0 ? `os ${sit.limites.descem} últimos descem` : ""].filter(Boolean).join("; ").replace(/^./, (c) => c.toUpperCase());
  const irAba = (id: Aba) => { setAba(id); window.scrollTo({ top: 0 }); };
  const ABAS: { id: Aba; icone: IdAba; nome: string }[] = [
    { id: "hoje", icone: "hoje", nome: "Hoje" },
    { id: "jornada", icone: "jornada", nome: "Jornada" },
    { id: "liga", icone: "liga", nome: "Liga" },
    { id: "biblia", icone: "biblia", nome: "Bíblia" },
    { id: "conquistas", icone: "conquistas", nome: "Metas" },
  ];
  return (
    <Raiz tema={tema}>
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
          <header className="ch-cab">
            <div>
              <span className="ch-data">{dataPorExtenso(hoje)}</span>
              <h1>{primeiroNome && primeiroNome !== "Você" ? `${saudacao}, ${primeiroNome}` : saudacao}</h1>
            </div>
            <div className="ch-cab-acoes">
              <button type="button" className="ch-sino" aria-label={avisosAtivos ? "Avisos" : "Avisos: 1 novo"} onClick={() => setPopupAvisos(true)}>
                <IconeSino />
                {!avisosAtivos && <span className="ch-sino-n" aria-hidden="true">1</span>}
              </button>
              {armazem.conta && (
                <button type="button" className="ch-perfil-btn" aria-label="Minha conta" onClick={() => irPara({ v: "conta" })}>
                  <Avatar nome={painel.nome} foto={painel.perfil.foto} tamanho={40} />
                </button>
              )}
            </div>
          </header>

          <section className="ch-hero" aria-label="Sua chama">
            <div className="ch-hero-topo">
              <div className="ch-hero-num">
                <span className="ch-hero-sel so-claro-bloco">Chama acesa</span>
                <span className={`ch-hero-n${String(estado.chama).length > 3 ? " longo" : ""}`}>{estado.chama}</span>
                <span className="ch-hero-sub">
                  <span className="so-claro">{estado.chama === 1 ? "dia seguido com Deus" : "dias seguidos com Deus"}</span>
                  <span className="so-escuro">{estado.chama === 1 ? "dia de chama acesa" : "dias de chama acesa"}</span>
                </span>
                <span className="ch-hero-liga">Liga {sit.liga.nome} · {sit.posicao}º lugar</span>
              </div>
              <div className="ch-hero-chama"><Chama dias={estado.chama} tamanho={58} /></div>
            </div>
            <div className="ch-semana" aria-label="Sua semana">
              {["S", "T", "Q", "Q", "S", "S", "D"].map((letra, i) => {
                const data = somarDias(inicioSemana(hoje), i);
                const feito = diasFeitos.has(data) || (data === hoje && feitoHoje);
                const eHoje = data === hoje;
                return (
                  <div key={data}>
                    <span aria-hidden="true">{letra}</span>
                    <div className={`ch-q${feito ? " feito" : ""}${eHoje && !feito ? " hoje" : ""}`} role="img" aria-label={`${feito ? "Dia feito" : eHoje ? "Hoje" : "Sem registro"}: ${data.split("-").reverse().slice(0, 2).join("/")}`}><MiniChama /></div>
                  </div>
                );
              })}
            </div>
            <div className="ch-xpl"><span><b>{estado.xp}</b> XP no total</span><span><b>{estado.xpSemana[inicioSemana(hoje)] ?? 0}</b> XP nesta semana</span></div>
            {estado.brasas > 0 && <div className="ch-brasas" title="Brasa guardada">{Array.from({ length: estado.brasas }, (_, i) => <i key={i} />)}<span>{estado.brasas === 1 ? "1 brasa guardada" : `${estado.brasas} brasas guardadas`}</span></div>}
          </section>

          <button type="button" className="ch-faixa-liga" onClick={() => irAba("liga")}>
            <span className="pos">{sit.posicao}º</span>
            <span className="nome">Liga {sit.liga.nome}{proximaLiga && sit.limites.sobem > 0 ? ` · até o ${sit.limites.sobem}º sobe` : ""}</span>
            <span className="tempo">{tempoLiga}</span>
          </button>

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

          <button type="button" className="ch-proxima" onClick={() => irAba("conquistas")} aria-label={`Próxima meta: ${nomeMeta(proxima)}. Abrir as metas`}>
            <Anel pct={(estado.chama / proxima) * 100} tam={48} espessura={4} texto={String(proxima)} tamTexto={proxima >= 1000 ? 11 : 13} rotulo={`${estado.chama} de ${proxima} dias`} />
            <span className="tx">
              <b>Próxima meta: {nomeMeta(proxima)}</b>
              <span className="ch-trilho" aria-hidden="true"><i style={{ width: `${Math.min(100, (estado.chama / proxima) * 100)}%` }} /></span>
              <small>{proxima - estado.chama === 1 ? "falta 1 dia" : `faltam ${proxima - estado.chama} dias`}</small>
            </span>
          </button>

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
          <header className="ch-tela-cab">
            <span className="ch-data">Sua caminhada</span>
            <h1>Jornada</h1>
          </header>
          <div className="ch-tres">
            <div><b>{estado.chama}</b><span>{estado.chama === 1 ? "dia seguido" : "dias seguidos"}</span></div>
            <div><b>{alcancadas.length}</b><span>{alcancadas.length === 1 ? "meta alcançada" : "metas alcançadas"}</span></div>
            {capitulos !== null ? <div><b>{capitulos}</b><span>{capitulos === 1 ? "capítulo lido" : "capítulos lidos"}</span></div> : <div><b>{estado.xp}</b><span>XP no total</span></div>}
          </div>

          <section className="ch-mapa" aria-label="Mapa da chama">
            <div className="ch-mapa-cab"><h2>Últimas 5 semanas</h2><span>cada quadrado = 1 dia</span></div>
            <div className="ch-mapa-grade">
              {["S", "T", "Q", "Q", "S", "S", "D"].map((l, i) => <span key={i} className="l" aria-hidden="true">{l}</span>)}
              {Array.from({ length: 35 }, (_, i) => {
                const data = somarDias(inicioSemana(somarDias(inicioSemana(hoje), -28)), i);
                const feito = diasFeitos.has(data) || (data === hoje && feitoHoje);
                const cls = feito ? "f" : data === hoje ? "h" : data > hoje ? "x" : "";
                return <i key={data} className={cls} role="img" aria-label={`${data.split("-").reverse().slice(0, 2).join("/")}: ${feito ? "dia completo" : data > hoje ? "ainda não chegou" : "sem registro"}`} />;
              })}
            </div>
            <div className="ch-legenda"><span>sem registro</span><i /><i className="f" /><span>dia completo</span></div>
          </section>

          <section className="ch-etapas" aria-label="Etapas">
            <h2>Etapas</h2>
            <div className="ch-etapa">
              <div className="eixo"><div className={`bola ${concl >= TOTAL_DIAS ? "feita" : "agora"}`}>{concl >= TOTAL_DIAS ? <IconeCheck tam={16} largura={2.6} /> : <i />}</div><div className={`fio${concl >= TOTAL_DIAS ? " feito" : ""}`} /></div>
              <div className="tx"><b>Jornada de {TOTAL_DIAS} dias</b><small>{concl >= TOTAL_DIAS ? (estado.concluidos[TOTAL_DIAS] ? `Concluída em ${dataCurta(estado.concluidos[TOTAL_DIAS])}` : "Concluída") : `${Math.min(concl, TOTAL_DIAS)} de ${TOTAL_DIAS} dias concluídos`}</small></div>
            </div>
            <div className="ch-etapa">
              <div className="eixo"><div className={`bola ${concl >= TOTAL_DIAS ? "agora" : "depois"}`}>{concl >= TOTAL_DIAS && <i />}</div><div className="fio" /></div>
              <div className="tx"><b>Dias contínuos</b><small>{concl >= TOTAL_DIAS ? `Palavra do plano + oração + missão · dia ${atual}` : `Começam depois do dia ${TOTAL_DIAS}`}</small></div>
            </div>
            <div className="ch-etapa">
              <div className="eixo"><div className="bola depois" /></div>
              <div className="tx"><b>Próxima meta · {diasTxt(proxima)}</b><small>{proxima - estado.chama === 1 ? "Falta 1 dia de chama" : `Faltam ${proxima - estado.chama} dias de chama`}</small></div>
            </div>
          </section>

          <section aria-label={`Os ${TOTAL_DIAS} dias da jornada`}>
            <h2>Os {TOTAL_DIAS} dias</h2>
            <ol className="ch-dias21">
              {Array.from({ length: TOTAL_DIAS }, (_, i) => i + 1).map((n) => {
                const st = statusDoDia(estado, n, hoje, pago);
                return (
                  <li key={n}>
                    <button type="button" className={`ch-dia21 ${st}${n === atual ? " atual" : ""}`} onClick={() => (st === "hoje" ? setAba("hoje") : abrirDia(n))} aria-label={`Dia ${n}: ${ROTULO[st]}`}>
                      {st === "feito" ? <IconeCheck tam={18} largura={2.6} /> : n}
                    </button>
                    <small>{ROTULO_CURTO[st]}</small>
                  </li>
                );
              })}
            </ol>
          </section>
        </section>
      )}

      {aba === "liga" && (
        <section className="ch-tela">
          <header className="ch-liga-cab">
            <div>
              <span className="ch-data">Liga da semana</span>
              <h1>{sit.liga.nome}</h1>
            </div>
            <span className="ch-tempo">termina em {tempoLiga}</span>
          </header>
          <div className="ch-ligas-barra" aria-hidden="true">{painel.ligas.ligas.map((lg, i) => <i key={lg.id} className={i <= estado.liga.indice ? "on" : ""} />)}</div>
          <p className="ch-ligas-nomes">
            {painel.ligas.ligas.map((lg, i) => <span key={lg.id}>{i > 0 ? " · " : ""}{i === estado.liga.indice ? <b>{lg.nome}</b> : lg.nome}</span>)}
          </p>
          <p className="ch-suave" style={{ margin: 0 }}>
            Você está em {sit.posicao}º lugar{eu ? ` com ${eu.xp} XP` : ""}. {sit.liga.descricao ? `${sit.liga.descricao} ` : ""}{regraLiga ? `${regraLiga}.` : ""}
          </p>
          {sit.modo === "real" && <p className="ch-liga-real">Ranking com membros de verdade da sua liga: aparecem só o primeiro nome e a foto.</p>}

          {sit.linhas.length >= 3 && (
            <section className="ch-podio" aria-label="Pódio">
              {[1, 0, 2].map((idx) => {
                const l = sit.linhas[idx];
                const tam = idx === 0 ? 68 : 56;
                return (
                  <div key={`${l.nome}-${l.posicao}`} className={`p${idx + 1}`}>
                    <span className="avatar"><Avatar nome={l.nome} foto={l.voce ? l.foto ?? painel.perfil.foto : l.foto} anonimo={l.anonimo} tamanho={tam} /></span>
                    <span className="nome">{l.voce ? "Você" : l.nome}</span>
                    <div className="degrau"><b>{idx + 1}</b><small>{l.xp} XP</small></div>
                  </div>
                );
              })}
            </section>
          )}

          <section className="ch-tabela" aria-label="Classificação">
            {sit.linhas.slice(sit.linhas.length >= 3 ? 3 : 0).map((l, i, resto) => {
              const antes = i > 0 ? resto[i - 1].posicao : l.posicao - 1;
              return (
                <Fragment key={`${l.nome}-${l.posicao}`}>
                  {proximaLiga && antes === sit.limites.sobem && <div className="ch-div sobe">até o {sit.limites.sobem}º sobe para {proximaLiga.nome}</div>}
                  {estado.liga.indice > 0 && sit.limites.descem > 0 && l.posicao === sit.limites.tamanho - sit.limites.descem + 1 && <div className="ch-div desce">zona de descida</div>}
                  <div className={`ch-linha${l.voce ? " voce" : ""}`}>
                    <span className="pos">{l.posicao}</span>
                    <Avatar nome={l.nome} foto={l.voce ? l.foto ?? painel.perfil.foto : l.foto} anonimo={l.anonimo} tamanho={36} />
                    <span className="nome">{l.voce ? "Você" : l.nome}</span>
                    <span className="xp">{l.xp} XP</span>
                  </div>
                </Fragment>
              );
            })}
          </section>
        </section>
      )}

      {aba === "biblia" && <Biblia biblia={armazem.biblia} onAtivarPush={onAtivarPush} />}

      {aba === "conquistas" && (
        <section className="ch-tela">
          <header className="ch-tela-cab">
            <span className="ch-data">{alcancadas.length} {alcancadas.length === 1 ? "alcançada" : "alcançadas"}</span>
            <h1>Metas da chama</h1>
          </header>

          <section className="ch-prox-meta" aria-label="Próxima meta">
            <Anel pct={(estado.chama / proxima) * 100} tam={84} espessura={8} texto={String(proxima)} tamTexto={proxima >= 1000 ? 17 : 22} rotulo={`${estado.chama} de ${proxima} dias`} />
            <div className="tx">
              <span className="et">Próxima meta · {proxima - estado.chama === 1 ? "falta 1 dia" : `faltam ${proxima - estado.chama} dias`}</span>
              <b>{nomeMeta(proxima)}</b>
              <small>O estudo desta meta abre no dia {proxima}</small>
            </div>
          </section>

          <ul className="ch-medalhas-grade" aria-label="Todas as metas">
            {[...new Set([...diasMetas, ...alcancadas.map((m) => m.dia), proxima])].sort((x, y) => x - y).map((n) => {
              const ok = alcancadas.some((m) => m.dia === n);
              const eProx = !ok && n === proxima;
              const tam = n >= 1000 ? " maior2" : n >= 100 ? " maior" : "";
              const m = alcancadas.find((x) => x.dia === n);
              return (
                <li key={n}>
                  <button type="button" disabled={!ok} aria-label={`Meta de ${diasTxt(n)}: ${ok ? "alcançada, abrir o estudo" : eProx ? "próxima" : "bloqueada"}`} onClick={() => ok && irPara({ v: "estudo", dia: n })}>
                    <span className={`ch-losango${tam}${ok ? " acesa" : eProx ? " proxima" : ""}`}><span>{n}</span></span>
                    <small>{ok ? (m?.estudo ? "estudo" : "alcançada") : eProx ? "próxima" : "bloqueada"}</small>
                  </button>
                </li>
              );
            })}
          </ul>

          {estado.medalhas.includes("jornada") && (
            <div className="ch-ganho medalha">🏆 <b>{NOME_JORNADA.nome}</b><small>{NOME_JORNADA.texto}</small></div>
          )}
          <div className="ch-card">
            <h2>Seu perfil</h2>
            <p className="ch-suave">{estado.xp} XP no total · {estado.xpSemana[inicioSemana(hoje)] ?? 0} XP nesta semana · liga {sit.liga.nome}. Maior sequência: {diasTxt(estado.maior)}.</p>
            {armazem.conta && <button type="button" className="ch-btn ch-btn-claro" onClick={() => irPara({ v: "conta" })}>Minha conta (nome, foto e ranking)</button>}
          </div>
          {visaoInstalar !== "nada" && <InstalarApp forcar={instalarForcar} />}
          <div className="ch-card">
            <h2>Amigos</h2>
            <p className="ch-suave">{estado.amigos === 0 ? "Nenhum amigo aceitou ainda." : estado.amigos === 1 ? "1 amigo aceitou o convite e começou a jornada." : `${estado.amigos} amigos aceitaram o convite e começaram a jornada.`} Quando um amigo completa o dia 1, você ganha {XP.convite} XP e 1 brasa guardada.</p>
            <button type="button" className="ch-btn" onClick={() => setConvidar(true)}>Convidar um amigo</button>
          </div>
          <ExtrasCard estado={estado} hoje={hoje} agir={agir} toast={toast} amigos={painel.amigosLista} onPraticar={() => irPara({ v: "pratica" })} />
          <div className="ch-card">
            <h2>Brasas guardadas</h2>
            <p className="ch-suave">Você ganha 1 brasa a cada 7 dias de chama (no máximo {MAX_BRASAS}). Se pular um dia, a brasa é usada sozinha e a chama não apaga.</p>
            <div className="ch-brasas grande">{Array.from({ length: MAX_BRASAS }, (_, i) => <i key={i} className={i < estado.brasas ? "" : "vazia"} />)}</div>
          </div>
          <button type="button" className="ch-btn ch-btn-claro" onClick={() => void papelDeParede()}>Papel de parede da chama</button>
        </section>
      )}

      <nav className="ch-nav" aria-label="Seções do app">
        <div className="ch-nav-barra">
          {ABAS.map((t) => (
            <button key={t.id} type="button" className={aba === t.id ? "on" : ""} aria-current={aba === t.id ? "page" : undefined} aria-label={t.nome} onClick={() => irAba(t.id)}>
              <IconeAba id={t.icone} />
              <span>{t.nome}</span>
            </button>
          ))}
        </div>
      </nav>
      {convidar && <ConviteSheet texto={textoConvite} link={linkConvite} onFechar={() => setConvidar(false)} chama={estado.chama} />}
      {popupAvisos && !convidar && (
        <PopupAvisos
          ativo={avisosAtivos}
          chama={estado.chama}
          horario={estado.lembrete}
          instalarForcar={instalarForcar}
          onFechar={() => setPopupAvisos(false)}
          onAtivar={async (horario) => {
            if (avisosAtivos) {
              if (horario !== estado.lembrete) await agir({ tipo: "lembrete", horario });
              setPopupAvisos(false);
              toast("Horário do lembrete salvo.");
              return;
            }
            if (!onAtivarPush) throw new Error("Na bancada de testes os avisos não ligam; na versão instalada sim.");
            try {
              await onAtivarPush();
            } catch (e) {
              if (horario !== estado.lembrete) await agir({ tipo: "lembrete", horario });
              throw e;
            }
            if (horario !== estado.lembrete) await agir({ tipo: "lembrete", horario });
            setPopupAvisos(false);
            toast("Avisos ligados. A chama vai te chamar.");
          }}
        />
      )}
      {xpPop && <div className="ch-xp-pop" key={xpPop.k} aria-live="polite">+{xpPop.n} XP</div>}
      {aviso && <p className="ch-toast" role="status">{aviso}</p>}
    </Raiz>
  );
}

/** "Terça, 24 de novembro" a partir de AAAA-MM-DD. */
function dataPorExtenso(data: string): string {
  try {
    const t = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(`${data}T12:00:00Z`)).replace("-feira", "");
    return t.charAt(0).toUpperCase() + t.slice(1);
  } catch {
    return data;
  }
}
/** "8 de agosto" a partir de AAAA-MM-DD. */
function dataCurta(data: string): string {
  try {
    return new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(`${data}T12:00:00Z`));
  } catch {
    return data;
  }
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
  const itens: { id: Check; nome: string; dica: string; icone: React.ReactNode }[] = [
    { id: "leu", nome: "Palavra", dica: [p.dia?.referencia, p.dia?.titulo].filter(Boolean).join(" · ") || "versículo e reflexão", icone: <IconeLivro /> },
    { id: "orou", nome: "Oração", dica: "ore pelo que leu", icone: <IconeCoracao /> },
    { id: "missao", nome: "Missão do dia", dica: p.dia?.missao || "uma tarefa pequena", icone: <IconeEnvio /> },
  ];
  const feitos = itens.filter((it) => c[it.id]).length;
  const proximaId = itens.find((it) => !c[it.id])?.id;
  return (
    <section className="ch-dia" aria-label="Seu dia com Deus">
      <div className="ch-dia-cab"><h2>Seu dia com Deus</h2><span>{feitos} de 3</span></div>
      <div className="ch-dia-barra" role="progressbar" aria-label="Tarefas do dia" aria-valuemin={0} aria-valuemax={3} aria-valuenow={feitos}><i style={{ width: `${(feitos / 3) * 100}%` }} /></div>
      <p className="ch-dia-cap">{p.atual > TOTAL_DIAS ? `Dia ${p.atual}` : `Dia ${p.atual} de ${TOTAL_DIAS}`}</p>
      {itens.map((it) => {
        const feito = Boolean(c[it.id]);
        const eProxima = it.id === proximaId;
        return (
          <button key={it.id} type="button" className={`ch-tarefa${feito ? " feito" : ""}${eProxima ? " proxima" : ""}`} onClick={() => p.onPasso(it.id)}>
            <span className="ico" aria-hidden="true">{feito ? <IconeCheck /> : it.icone}</span>
            <span className="tx"><b>{it.nome}{feito ? <span className="sr-so"> (feita)</span> : null}</b><small>{it.dica}</small></span>
            {eProxima && <span className="comecar">Começar</span>}
          </button>
        );
      })}
      {p.dia?.jejum && (
        <label className="ch-jejum" aria-label="Jejum opcional">
          <input type="checkbox" checked={p.jejum} onChange={(e) => p.onJejum(e.target.checked)} />
          <span><b>Jejum (opcional)</b><small>{p.dia.jejum}</small></span>
        </label>
      )}
    </section>
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
      <button type="button" className="ch-voltar" aria-label="Voltar" onClick={onVoltar}><IconeVoltar /></button>
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
  const [resposta, setResposta] = useState("");
  return (
    <div className="ch-cheia ch-passo">
      <button type="button" className="ch-voltar" aria-label="Voltar" onClick={onVoltar}><IconeVoltar /></button>
      <header className="ch-estudo-cab">
        <span className="ch-etiqueta">Meta alcançada · {diasTxt(meta.dia)}</span>
        <span className="num" aria-hidden="true">{meta.dia}</span>
        <h1>{meta.nome}</h1>
        {meta.referencia && <span className="ref">{meta.referencia}</span>}
      </header>
      {meta.versiculo && <blockquote className="ch-bloco-verso">{meta.versiculo}</blockquote>}
      {meta.estudo && (
        <section className="ch-estudo-corpo" aria-label="Estudo">
          <h2>Estudo</h2>
          {paragrafos(meta.estudo).map((t, i) => <p key={i}>{t}</p>)}
        </section>
      )}
      {meta.pergunta && (
        <section className="ch-pensar" aria-label="Para pensar">
          <span className="ch-rotulo">Para pensar</span>
          <p className="perg">{meta.pergunta}</p>
          <label htmlFor="ch-resposta-estudo">Sua resposta não é enviada a ninguém</label>
          <textarea id="ch-resposta-estudo" rows={3} placeholder="Escreva aqui…" value={resposta} onChange={(e) => setResposta(e.target.value)} />
        </section>
      )}
      {meta.oracao && (
        <section className="ch-oracao-cartao" aria-label="Oração">
          <span className="ch-rotulo">Oração</span>
          <p>{meta.oracao}</p>
        </section>
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
      <button type="button" className="ch-voltar" aria-label="Voltar" onClick={onVoltar}><IconeVoltar /></button>
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

function IconeSino() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  );
}

function PopupAvisos({ ativo, chama, horario, instalarForcar, onAtivar, onFechar }: { ativo: boolean; chama: number; horario: string | null; instalarForcar: ForcarInstalacao; onAtivar: (h: string) => Promise<void>; onFechar: () => void }) {
  const [hora, setHora] = useState(horario ?? "07:00");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const negado = pushPermission() === "denied";
  return (
    <div className="ch-sheet" role="dialog" aria-modal="true" aria-label="Ativar os avisos">
      <div>
        <div className="ch-mascote"><Chama dias={Math.max(chama, 1)} tamanho={64} /><small>A Brasinha</small></div>
        <h2>{ativo ? "Seus avisos estão ligados ✅" : "Deixa a chama te chamar"}</h2>
        <p className="ch-suave">
          {ativo
            ? "Você recebe o lembrete na sua hora, um versículo ao meio-dia, os recados da liga e, à noite, o que vem no dia seguinte."
            : "Com os avisos ligados você recebe um versículo ao meio-dia, o lembrete na hora que escolher, os recados da liga (quando alguém passar você) e, à noite, o que vem no dia seguinte."}
        </p>
        {ativo ? null : negado ? (
          <p className="ch-nota">
            Os avisos estão bloqueados neste celular. <b>iPhone:</b> Ajustes › Notificações › Chama Acesa › Permitir. <b>Android:</b> segure o ícone do app › Informações › Notificações › Permitir. Depois toque em Ativar.
          </p>
        ) : (
          <InstalarApp forcar={instalarForcar} motivo="No iPhone os avisos só chegam com o app na tela de início. Instale, abra por lá e ative." />
        )}
        <label className="ch-hora">
          <span>Lembrete diário</span>
          <input type="time" value={hora} onChange={(e) => setHora(e.target.value || "07:00")} />
        </label>
        <button
          type="button"
          className="ch-btn ch-btn-grande"
          disabled={enviando}
          onClick={() => {
            setEnviando(true);
            setErro("");
            void onAtivar(hora)
              .catch((e) => setErro(e instanceof Error ? e.message : "Não deu para ligar os avisos."))
              .finally(() => setEnviando(false));
          }}
        >
          {ativo ? "Salvar horário" : "Ativar os avisos"}
        </button>
        {erro && <p className="ch-nota" role="status">{erro}</p>}
        <button type="button" className="ch-link" onClick={onFechar}>{ativo ? "Fechar" : "Agora não"}</button>
      </div>
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
