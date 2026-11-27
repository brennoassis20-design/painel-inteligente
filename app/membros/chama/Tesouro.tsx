"use client";
// Itens 1 a 3 do plano 2026-11-27: brasas à vista, talentos (Tesouro) e restaurar a chama.
import { diffDias, type Estado, type Restauravel } from "@/lib/chama-acesa/regras";
import { LEITURA_VOLTA, PRECO, TALENTOS_GANHO } from "@/lib/chama-acesa/talentos";

const brasasTxt = (n: number) => (n === 1 ? "1 brasa" : `${n} brasas`);
const talentosTxt = (n: number) => (n === 1 ? "1 talento" : `${n} talentos`);

/** Moeda desenhada em CSS (sem emoji). */
export function Talento({ tam = 14 }: { tam?: number }) {
  return <i className="ch-talento-i" style={{ width: tam, height: tam }} aria-hidden="true" />;
}

/** Linha do topo: brasas guardadas (cheias/vazias até o máximo do plano) e talentos. Abre o Tesouro. */
export function BarraTesouro({ brasas, max, talentos, onAbrir }: { brasas: number; max: number; talentos: number; onAbrir: () => void }) {
  return (
    <button type="button" className="ch-tesouro-barra" onClick={onAbrir} aria-label={`${brasasTxt(brasas)} de ${max} guardadas e ${talentosTxt(talentos)}. Abrir o Tesouro`}>
      <span className="ch-brasas-mini" aria-hidden="true">
        {Array.from({ length: max }, (_, i) => <i key={i} className={i < brasas ? "" : "vazia"} />)}
      </span>
      <span className="tx">{brasas} de {max} brasas</span>
      <span className="sep" aria-hidden="true" />
      <Talento />
      <span className="tx"><b>{talentos}</b> talentos</span>
    </button>
  );
}

/** Aviso da noite (a partir das 18h, dia ainda não feito): brasa é para emergência. */
export function AvisoNoite({ brasas, hora, chama }: { brasas: number; hora: number; chama: number }) {
  if (hora < 18 || chama <= 0) return null;
  const faltam = Math.max(1, Math.ceil(24 - hora));
  const tempo = faltam === 1 ? "menos de 1 hora" : `${faltam} horas`;
  return (
    <div className="ch-aviso-noite" role="status">
      <i className="ch-brasa-i" aria-hidden="true" />
      <p>
        {brasas > 0
          ? <>Faltam {tempo} para a meia-noite. Você tem {brasasTxt(brasas)} guardada{brasas > 1 ? "s" : ""}, mas ela é para emergência: acenda hoje e guarde a brasa.</>
          : <>Faltam {tempo} para a meia-noite e você não tem brasa guardada. Se o dia passar, a chama de {chama === 1 ? "1 dia" : `${chama} dias`} apaga.</>}
      </p>
    </div>
  );
}

function prazo(r: Restauravel, hoje: string) {
  if (r.ate === hoje) return "até hoje, meia-noite";
  const [, m, d] = r.ate.split("-");
  return diffDias(hoje, r.ate) === 1 ? "até amanhã, meia-noite" : `até ${d}/${m}`;
}

/** Card de restaurar a chama: caminho por esforço (3 passos) ou talentos. */
export function RestaurarCard({ r, hoje, talentos, onLeitura, onPratica, onFazerDia, onTalentos }: {
  r: Restauravel; hoje: string; talentos: number;
  onLeitura: () => void; onPratica: () => void; onFazerDia: () => void; onTalentos: () => void;
}) {
  const passos = [
    { id: "leitura", nome: `Ler "${LEITURA_VOLTA.titulo}" (${LEITURA_VOLTA.referencia})`, feito: Boolean(r.passos.leitura), acao: onLeitura, botao: "Ler" },
    { id: "dia", nome: "Fazer o dia de hoje", feito: Boolean(r.passos.dia), acao: onFazerDia, botao: "Fazer" },
    { id: "pratica", nome: "Fazer o Desafio da Palavra", feito: Boolean(r.passos.pratica), acao: onPratica, botao: "Fazer" },
  ];
  const feitos = passos.filter((p) => p.feito).length;
  const podePagar = talentos >= PRECO.restaurar;
  return (
    <section className="ch-card ch-restaurar" aria-label="Restaurar a chama">
      <span className="ch-etiqueta">A volta</span>
      <h2>Sua chama de {r.chama === 1 ? "1 dia" : `${r.chama} dias`} pode voltar</h2>
      <p className="ch-suave">“Este meu filho estava morto, e reviveu.” Você pode trazer a chama de volta {prazo(r, hoje)}.</p>
      <ol className="ch-passos-volta">
        {passos.map((p) => (
          <li key={p.id} className={p.feito ? "feito" : ""}>
            <span className="marca" aria-hidden="true">{p.feito ? "✓" : ""}</span>
            <span className="nome">{p.nome}</span>
            {!p.feito && <button type="button" className="ch-btn ch-btn-claro ch-btn-mini" onClick={p.acao}>{p.botao}</button>}
          </li>
        ))}
      </ol>
      <p className="ch-nota">{feitos} de 3 passos. Com os três, a chama volta com os {r.chama} dias e mais o de hoje.</p>
      <div className="ch-ou"><span>ou</span></div>
      <button type="button" className="ch-btn" disabled={!podePagar} onClick={onTalentos}>
        Restaurar agora com {PRECO.restaurar} talentos
      </button>
      {!podePagar && <p className="ch-nota">Você tem {talentosTxt(talentos)}. Faltam {PRECO.restaurar - talentos}.</p>}
    </section>
  );
}

/** Leitura de Lucas 15 (passo do caminho da volta). */
export function LeituraVoltaTela({ feito, onConcluir, onVoltar }: { feito: boolean; onConcluir: () => void; onVoltar: () => void }) {
  return (
    <div className="ch-cheia ch-volta">
      <button type="button" className="ch-link ch-voltar-txt" onClick={onVoltar}>Voltar</button>
      <span className="ch-etiqueta">{LEITURA_VOLTA.referencia}</span>
      <h1>{LEITURA_VOLTA.titulo}</h1>
      <blockquote className="ch-versiculo-longo">{LEITURA_VOLTA.texto}</blockquote>
      <h2>Para pensar</h2>
      <p>{LEITURA_VOLTA.reflexao}</p>
      <h2>Ore assim</h2>
      <p className="ch-oracao-curta">{LEITURA_VOLTA.oracao}</p>
      {feito ? <p className="ch-ok">Leitura concluída.</p> : <button type="button" className="ch-btn ch-btn-grande" onClick={onConcluir}>Concluir leitura</button>}
    </div>
  );
}

/** Tesouro: saldo, como ganhar e onde gastar. */
export function TesouroTela({ estado, max, vitalicio, hoje, onComprarBrasa, onRestaurar, onVoltar, extras }: {
  estado: Estado; max: number; vitalicio: boolean; hoje: string;
  onComprarBrasa: () => void; onRestaurar: () => void; onVoltar: () => void;
  /** Espaço para os itens 4 a 7 (Dia do Senhor, vigília, voto, brasa de irmão). */
  extras?: React.ReactNode;
}) {
  const talentos = estado.talentos ?? 0;
  const cheio = estado.brasas >= max;
  const r = estado.restauravel;
  return (
    <div className="ch-cheia ch-tesouro">
      <button type="button" className="ch-link ch-voltar-txt" onClick={onVoltar}>Voltar</button>
      <span className="ch-etiqueta">Mateus 25:21</span>
      <h1>Seu tesouro</h1>
      <p className="ch-suave">“Foste fiel no pouco, sobre muito te colocarei.” Cada dia fiel rende talentos. Use para proteger a sua chama.</p>

      <div className="ch-saldo">
        <Talento tam={28} />
        <b>{talentos}</b>
        <span>talentos</span>
      </div>

      <section className="ch-card">
        <h2>Brasas guardadas</h2>
        <div className="ch-brasas grande" aria-label={`${estado.brasas} de ${max} brasas`}>
          {Array.from({ length: max }, (_, i) => <i key={i} className={i < estado.brasas ? "" : "vazia"} />)}
        </div>
        <p className="ch-suave">Se você pular um dia, uma brasa é usada sozinha e a chama não apaga. Você guarda até {max}{vitalicio ? " (vantagem do vitalício)" : ""}. Ganha 1 a cada 7 dias de chama.</p>
        <button type="button" className="ch-btn" disabled={cheio || talentos < PRECO.brasa} onClick={onComprarBrasa}>
          {cheio ? "Brasas no máximo" : `Comprar 1 brasa por ${PRECO.brasa} talentos`}
        </button>
        {!cheio && talentos < PRECO.brasa && <p className="ch-nota">Faltam {PRECO.brasa - talentos} talentos.</p>}
        {!vitalicio && <p className="ch-nota">Quem tem o acesso vitalício guarda até 3 brasas.</p>}
      </section>

      {r && hoje <= r.ate && (
        <section className="ch-card">
          <h2>Restaurar a chama</h2>
          <p className="ch-suave">Sua chama de {r.chama} dias apagou e ainda pode voltar.</p>
          <button type="button" className="ch-btn" disabled={talentos < PRECO.restaurar} onClick={onRestaurar}>Restaurar com {PRECO.restaurar} talentos</button>
        </section>
      )}

      {extras}

      <section className="ch-card">
        <h2>Como ganhar talentos</h2>
        <ul className="ch-lista-ganho">
          <li><span>Completar o dia</span><b>+{TALENTOS_GANHO.dia}</b></li>
          <li><span>Alcançar uma meta de chama</span><b>+{TALENTOS_GANHO.meta}</b></li>
          <li><span>Concluir o estudo da meta</span><b>+{TALENTOS_GANHO.estudo}</b></li>
          <li><span>Acertar as 5 do Desafio da Palavra</span><b>+{TALENTOS_GANHO.praticaPerfeita}</b></li>
          <li><span>Subir de liga</span><b>+{TALENTOS_GANHO.ligaSubiu}</b></li>
          <li><span>Ficar na liga</span><b>+{TALENTOS_GANHO.ligaFicou}</b></li>
          <li><span>Amigo convidado fazer o dia 1</span><b>+{TALENTOS_GANHO.convite}</b></li>
        </ul>
      </section>
    </div>
  );
}
