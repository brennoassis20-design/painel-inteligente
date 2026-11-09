/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import Script from "next/script";
import { Icon } from "../icons";
import { OFERTA, checkoutLink, rastreado } from "./oferta";
import { Rastreio } from "./Rastreio";
import { Demo } from "./Demo";
import { BarraCelular } from "./BarraCelular";
import "./mg.css";

// Página v2 (08/11/2026): carta longa no molde da página do Pacote 27, sem botão na primeira dobra.
// Copy: cofre, Projetos/Página de vendas Método Gênio v2 (copy).md

export const metadata: Metadata = {
  title: "Método Gênio | Faça o pedido. Seu produto sai pronto.",
  description:
    "Escolha um nicho que já vende e o Painel Inteligente entrega o produto digital, a página de vendas e os anúncios prontos para vender com o seu nome.",
  openGraph: {
    title: "Método Gênio",
    description: "Você faz o pedido. O gênio entrega o produto, a página de vendas e os anúncios prontos.",
    images: ["/mg/capa.jpg"],
  },
};

const pixelId = OFERTA.pixelId;

// Vendas pagas reais na Cakto de produtos de R$ 9,90 a R$ 27 (05 a 08/11/2026), sem dados de comprador.
const vendas = [
  { v: "27,99", q: "08/11 · 18:29" },
  { v: "27,99", q: "08/11 · 16:48" },
  { v: "20,89", q: "08/11 · 07:07" },
  { v: "27,99", q: "08/11 · 06:43" },
  { v: "20,40", q: "07/11 · 13:40" },
  { v: "20,89", q: "07/11 · 09:49" },
];

const naoE = [
  "Afiliado ganhando migalha de comissão",
  "Dropshipping com produto que demora 40 dias pra chegar",
  "Shopee",
  "Curso de teoria que te deixa sozinho na hora de fazer",
];

const fases = [
  {
    n: "1",
    t: "O produto sai pronto",
    itens: [
      "1 ano de acesso ao Painel Inteligente",
      "Nichos em alta, atualizados toda semana com anúncios de verdade",
      "Até 5 produtos completos por mês",
    ],
  },
  {
    n: "2",
    t: "Prepare para vender",
    itens: [
      "Calculadora de lucro: o preço e quanto você pode pagar por venda sem perder dinheiro",
      "Mockup 3D, para o produto ter cara de produto caro",
      "Passo a passo para cadastrar o produto e publicar a página, sem mexer em código",
    ],
  },
  {
    n: "3",
    t: "Criativos e copy",
    itens: [
      "Criativos prontos em vários ângulos, nos formatos de feed e story",
      "Textos dos anúncios e roteiros para quem quiser gravar",
      "Lâmpada de Ouro: a edição premium do seu produto (opcional, cerca de R$ 3 por produto, pagos direto na ferramenta de IA)",
    ],
  },
  {
    n: "4",
    t: "Seu plano de lançamento",
    itens: ["Checklist do produto ao primeiro anúncio", "Mentor 24 horas: travou, pergunta e recebe a resposta na hora"],
  },
  {
    n: "5",
    t: "Tráfego pago do zero",
    itens: [
      "Da conta de anúncio à primeira campanha",
      "Como ler as métricas, pausar o que não vende e colocar verba no que vende",
      "É o que eu faço todo dia na minha agência",
    ],
  },
];

const galeria = [
  { src: "/mg/inicio.jpg", t: "Faça o pedido em um campo só" },
  { src: "/mg/criativos-ouro.jpg", t: "Criativos de ouro prontos" },
  { src: "/mg/produto-ouro-cafe.jpg", t: "Lâmpada de Ouro: a edição premium do produto" },
  { src: "/mg/calculadora.jpg", t: "Calculadora de lucro" },
  { src: "/mg/mentor.jpg", t: "Mentor 24 horas" },
  { src: "/mg/checklist.jpg", t: "Checklist de lançamento" },
];

const pilha = [
  ["Produto (texto + design)", "R$ 100"],
  ["Página de vendas", "R$ 350"],
  ["Textos de anúncio e copy", "R$ 470"],
];

const oferta = [
  "1 ano de acesso ao Painel Inteligente",
  "Até 5 produtos completos por mês, cada um com página de vendas, copy e criativos",
  "Nichos em alta, Mockup 3D, Calculadora e Checklist",
  "Mentor 24 horas",
  "Aulas passo a passo, incluindo tráfego pago do zero",
];

const faq = [
  { q: "Preciso ser especialista em algum assunto?", a: "Não. Você escolhe o nicho e o painel cria o conteúdo. Você revisa, ajusta se quiser e vende." },
  { q: "Preciso aparecer?", a: "Não. Os criativos saem prontos, com imagem." },
  { q: "Nunca vendi nada na internet. É pra mim?", a: "Foi feito para você. As aulas mostram cada clique." },
  {
    q: "Tem custo além dos R$ 297?",
    a: "Para vender, você anuncia, e o anúncio é dinheiro seu: dá para começar com R$ 20 por dia. A Lâmpada de Ouro é opcional (cerca de R$ 3 por produto). O resto está incluso.",
  },
  { q: "Funciona no celular?", a: "Sim. O painel abre no celular e no computador." },
  { q: "Quantos produtos posso criar?", a: "Até 5 produtos completos por mês, durante 1 ano." },
  { q: "Como recebo o acesso?", a: "Logo depois da compra chega um e-mail para criar a sua senha. No Pix, é na hora." },
  { q: "É golpe?", a: "O pagamento é pela Cakto, plataforma segura, e você tem 90 dias de garantia." },
  {
    q: "Quanto vou ganhar?",
    a: "Depende de você aplicar e anunciar. O painel tira a parte mais difícil, que é criar o produto. Os resultados variam de pessoa para pessoa.",
  },
];

function Lamp() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden="true" className="mg-lamp">
      <defs>
        <linearGradient id="mg-lamp-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#9fe9ff" />
          <stop offset=".55" stopColor="#b79bff" />
          <stop offset="1" stopColor="#ff7ad9" />
        </linearGradient>
      </defs>
      <g fill="none" stroke="url(#mg-lamp-grad)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M24 38c0-6 14-10 34-10s30 3 36 8l18-2-14 10c-4 8-14 14-36 14S24 52 24 38z" />
        <path d="M24 40c-12-2-16 4-14 9 2 5 8 6 14 4" />
        <path d="M48 28c0-6 5-11 10-11s10 5 10 11" />
        <circle cx="58" cy="13" r="3" />
        <path d="M48 58l-4 12h30l-4-12" />
      </g>
    </svg>
  );
}

function Cta({ botao, label = "Quero o Método Gênio" }: { botao: string; label?: string }) {
  return (
    <a className="mg-cta" href={checkoutLink(botao)} data-checkout={botao}>
      {label}
      <Icon name="arrow" />
    </a>
  );
}

function Preco() {
  return (
    <div className="mg-price">
      <span className="mg-price-de">de R$ {OFERTA.precoDe}</span>
      <span className="mg-price-por">
        por <strong>R$ {OFERTA.preco}</strong>
      </span>
      <span className="mg-price-parc">ou em até 12x no cartão</span>
    </div>
  );
}

function Selos() {
  return (
    <ul className="mg-seals">
      <li><Icon name="shield" /> 90 dias de garantia</li>
      <li><Icon name="calendar" /> 1 ano de acesso</li>
      <li><Icon name="lock" /> Pagamento seguro</li>
    </ul>
  );
}

export default function MetodoGenioPage() {
  return (
    <main className="mg mg2">
      {pixelId && (
        <Script id="mg-pixel" strategy="afterInteractive">
          {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init','${pixelId}');fbq('track','PageView');fbq('track','ViewContent',{content_name:'Método Gênio',value:${OFERTA.preco},currency:'BRL',content_category:'pagina-v2'});`}
        </Script>
      )}
      <Rastreio valor={OFERTA.preco} />
      <div className="mg-bg" aria-hidden="true" />

      <div className="mg-bar">⚡ Faça o pedido. Seu produto digital sai pronto.</div>

      <header className="mg-top">
        <div className="mg-wrap mg-top-in">
          <span className="mg-brand">
            <Lamp />
            Método Gênio
          </span>
          <a className="mg-login" href={rastreado(OFERTA.painel, "pagina-vendas", "topo", "metodo-genio", "ja-sou-aluno")}>Já sou aluno</a>
        </div>
      </header>

      {/* 1 · primeira dobra, sem botão */}
      <section className="mg-hero mg2-hero">
        <div className="mg-wrap mg-narrow mg-center">
          <p className="mg-eyebrow">Para quem quer vender produto digital e ainda não vendeu nada</p>
          <h1>
            Você faz o pedido. <span className="mg-gt">O gênio entrega o produto, a página de vendas e os anúncios prontos.</span>
          </h1>
          <p className="mg-lead">
            Escolha um nicho que já vende. Em poucos minutos você tem um produto digital completo para vender com o seu
            nome, sem saber escrever, sem saber design e sem aparecer.
          </p>
          <Demo />
          <p className="mg2-read">↓ Leia até o fim: eu te mostro por dentro tudo que você recebe</p>
        </div>
      </section>

      {/* 2 · caro leitor */}
      <section className="mg-sec">
        <div className="mg-wrap mg-narrow mg2-letter">
          <p className="mg2-hi">Caro leitor (a),</p>
          <p>Se você está aqui, eu aposto que já tentou ganhar dinheiro na internet.</p>
          <p>Já viu um monte de vídeo. Já comprou curso. Já tentou afiliado, Shopee, loja, alguma coisa.</p>
          <p><strong>E o dinheiro não veio.</strong></p>
          <p>Eu sei como é, porque eu já estive exatamente aí.</p>
          <p>Olha o que acontece com quase todo mundo que tenta ter o próprio produto:</p>
          <p className="mg2-quote">
            Passa três semanas montando. Escolhe o assunto, escreve o conteúdo, faz a capa, monta a página, escreve o
            anúncio. Coloca no ar… e ninguém compra.
          </p>
          <p>E aí desiste achando que internet não é pra si.</p>
          <p>Agora presta atenção: <strong className="mg-gt">a culpa não foi sua.</strong></p>
          <p>
            Para lançar um produto, você precisa de quem escolhe o nicho, de quem escreve, de quem diagrama, de quem faz a
            página, de quem escreve o anúncio e de quem cria o criativo. É trabalho de uma equipe inteira.
          </p>
          <p>O guru que te vendeu curso tem essa equipe. Por isso para ele &ldquo;é só fazer&rdquo;.</p>
          <p><strong>Você estava tentando fazer sozinho, na mão, o trabalho de dez pessoas.</strong></p>
        </div>
      </section>

      {/* 3 · as 2 coisas */}
      <section className="mg-sec mg-turn">
        <div className="mg-wrap mg-narrow">
          <h2>
            Então como tem gente colocando produtinho de R$ 19,90 no ar <span className="mg-gt">e vendendo todo dia?</span>
          </h2>
          <p className="mg-lead">Simples. Quem vende tem 2 coisas que você não tinha:</p>
          <div className="mg2-two">
            <div><span>01</span><p>Um nicho que <strong>já vende</strong>, e não um assunto escolhido no chute.</p></div>
            <div><span>02</span><p><strong>Tudo pronto</strong> para anunciar: o produto, a página de vendas e os anúncios.</p></div>
          </div>
          <p className="mg-lead">Foi exatamente isso que eu coloquei dentro de um painel.</p>
        </div>
      </section>

      {/* 4 · como funciona */}
      <section className="mg-sec">
        <div className="mg-wrap mg-narrow">
          <p className="mg-eyebrow">Como funciona</p>
          <h2>Funciona como o gênio da lâmpada: <span className="mg-gt">você faz o pedido e ele entrega.</span></h2>
          <ol className="mg2-steps">
            <li>
              <span className="mg-step-n">1</span>
              <div>
                <strong>Escolha o nicho.</strong>
                <p>
                  Você não precisa adivinhar. O painel mostra os nichos que estão vendendo agora, tirados de anúncios de
                  verdade que estão no ar há mais de 30 dias. Ninguém paga anúncio por um mês inteiro se ele não está dando
                  dinheiro.
                </p>
                <figure>
                  <img src="/mg/nichos.jpg" alt="Tela Nichos em alta: anunciantes ativos e há quantos dias o anúncio mais antigo está no ar" loading="lazy" />
                  <figcaption>Tela real dos Nichos em alta</figcaption>
                </figure>
              </div>
            </li>
            <li>
              <span className="mg-step-n">2</span>
              <div>
                <strong>Faça o pedido.</strong>
                <p>Diga para quem é e que tipo de produto você quer. Um campo só, como mandar uma mensagem no WhatsApp.</p>
                <figure>
                  <img src="/mg/inicio.jpg" alt="Tela inicial do Painel: O que vamos criar hoje?" loading="lazy" />
                </figure>
              </div>
            </li>
            <li>
              <span className="mg-step-n">3</span>
              <div>
                <strong>Receba tudo pronto.</strong>
                <p>Em poucos minutos o gênio entrega:</p>
                <ul className="mg2-checks">
                  <li><Icon name="check" /> o produto que o seu cliente vai receber, com capa e diagramação;</li>
                  <li><Icon name="check" /> a página de vendas, pronta para publicar (você só cola o link do seu checkout);</li>
                  <li><Icon name="check" /> os textos de venda e de anúncio;</li>
                  <li><Icon name="check" /> os criativos, em vários ângulos, nos formatos de feed e story.</li>
                </ul>
                <div className="mg-ads">
                  <figure><img src="/mg/criativo-ouro1.jpg" alt="Criativo de ouro gerado pelo painel" loading="lazy" /></figure>
                  <figure><img src="/mg/criativo-ouro2.jpg" alt="Criativo de ouro com oferta gerado pelo painel" loading="lazy" /></figure>
                  <p>Criativos de ouro gerados pelo painel, com fotos, sem designer e sem aparecer.</p>
                </div>
              </div>
            </li>
          </ol>
          <p className="mg-lead mg-center"><strong>É tão simples que parece piada.</strong></p>
        </div>
      </section>

      {/* 5 · isso não é */}
      <section className="mg-sec">
        <div className="mg-wrap mg-narrow">
          <ul className="mg2-not">
            {naoE.map((t) => (
              <li key={t}><Icon name="close" /> {t}</li>
            ))}
          </ul>
          <p className="mg-lead">
            <strong>É produto seu, com o seu nome.</strong> E você não precisa saber escrever, saber design, programar,
            aparecer na câmera nem ter equipe.
          </p>
          <div className="mg2-box">
            <p><strong>O que você precisa, eu falo antes de você comprar:</strong></p>
            <ul>
              <li>uma plataforma de pagamento para cadastrar o produto (tem plataforma sem mensalidade, e eu mostro qual nas aulas);</li>
              <li>
                verba para anunciar, que é dinheiro seu e você decide quanto. Dá para começar com R$ 20 por dia, e a
                Calculadora de lucro te mostra até onde vale a pena.
              </li>
            </ul>
            <p>O resto já vem pronto.</p>
          </div>
        </div>
      </section>

      {/* 6 · a conta (a barra de compra do celular aparece a partir daqui) */}
      <section className="mg-sec mg-turn" id="a-conta">
        <div className="mg-wrap mg-narrow">
          <h2>Faça a conta comigo</h2>
          <div className="mg2-calc">
            <p>Um produto de <strong>R$ 19,90</strong></p>
            <p>10 vendas por dia = <strong>R$ 199 por dia</strong></p>
            <p className="mg2-calc-big">Em 30 dias: <span className="mg-gt">R$ 5.970</span></p>
            <small>Com um produto que você não precisou escrever.</small>
          </div>
          <p className="mg-lead">Calma. Não estou dizendo que você faz isso na primeira semana. Ninguém faz.</p>
          <p className="mg-lead">
            O que eu estou dizendo é: quem faz produto na mão demora três semanas para lançar <strong>um</strong>. Com o
            painel você lança um no mesmo dia, até <strong>5 por mês</strong>. Testa vários nichos com pouca verba, vê qual
            vende mais barato e coloca a verba nele.
          </p>
          <p className="mg-lead"><strong>Quem testa cinco acha o que vende. Quem aposta num só fica torcendo.</strong></p>
        </div>
      </section>

      {/* 7 · prova */}
      <section className="mg-sec">
        <div className="mg-wrap mg-narrow">
          <h2>Isso aqui não é teoria</h2>
          <p className="mg-lead">Vendas reais dos produtos de R$ 9,90 a R$ 27 que eu vendo hoje:</p>
          <div className="mg2-notifs">
            {vendas.map((v, i) => (
              <div key={i} className="mg2-notif">
                <span className="mg2-notif-ic">C</span>
                <div>
                  <b>Venda aprovada</b>
                  <small>Cakto · R$ {v.v}</small>
                </div>
                <em>{v.q}</em>
              </div>
            ))}
          </div>
          <p className="mg2-note">Pedidos pagos de 07 e 08/11/2026. São 27 vendas pagas desses produtos entre 05 e 08/11.</p>
          <p className="mg-lead">Esses produtos eu não escrevi uma linha. Quem fez foi o painel que eu estou te mostrando.</p>
          <p className="mg-lead">
            E antes do Método Gênio eu ensinava esse modelo num método chamado TAE. <strong>O Gênio é a evolução do TAE</strong>:
            o que lá a pessoa fazia na mão, hoje o painel faz em minutos.
          </p>
          <p className="mg-lead">Olha o que os alunos do TAE mandaram, fazendo tudo na mão:</p>
          <div className="mg2-alunos">
            <img src="/mg/aluna-andreia.jpg" alt="Mensagem da aluna Andreia com print de venda" loading="lazy" />
            <img src="/mg/aluna-carla.jpg" alt="Mensagem da aluna Carla com print de venda" loading="lazy" />
            <img src="/mg/aluno-david.jpg" alt="Mensagem do aluno David" loading="lazy" />
          </div>
          <p className="mg-lead"><strong>Agora imagina com o painel fazendo a parte pesada.</strong></p>
        </div>
      </section>

      {/* 8 · o que você recebe */}
      <section className="mg-sec">
        <div className="mg-wrap mg-narrow">
          <p className="mg-eyebrow">Tudo que você recebe</p>
          <h2>Não é curso de teoria</h2>
          <p className="mg-lead">São aulas curtas, de 3 a 7 minutos, com o clique na tela. Você assiste e já faz junto.</p>
          <div className="mg2-fases">
            {fases.map((f) => (
              <article key={f.n}>
                <span className="mg-step-n">{f.n}</span>
                <div>
                  <h3>Fase {f.n} · {f.t}</h3>
                  <ul>
                    {f.itens.map((i) => (
                      <li key={i}><Icon name="check" /> {i}</li>
                    ))}
                  </ul>
                </div>
              </article>
            ))}
          </div>
        </div>
        <div className="mg-wrap">
          <div className="mg-gallery">
            {galeria.map((g) => (
              <figure key={g.src}>
                <img src={g.src} alt={g.t} loading="lazy" />
                <figcaption>{g.t}</figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* 9 · pilha de valor */}
      <section className="mg-sec">
        <div className="mg-wrap mg-narrow">
          <h2>Se você fosse pagar alguém para fazer isso</h2>
          <table className="mg2-pilha">
            <tbody>
              {pilha.map(([a, b]) => (
                <tr key={a}><td>{a}</td><td>{b}</td></tr>
              ))}
              <tr className="is-sum"><td>Por produto</td><td>R$ 920</td></tr>
              <tr><td>5 produtos por mês, durante 1 ano</td><td>60 produtos</td></tr>
              <tr><td>Curso de tráfego pago</td><td>R$ 1.000</td></tr>
            </tbody>
          </table>
          <p className="mg-lead">Se o painel só te mostrasse os nichos que estão vendendo agora, já não valeria?</p>
          <p className="mg-lead">E se ele ainda criasse o produto inteiro, com página e anúncio?</p>
          <p className="mg-lead">E se você ainda aprendesse a anunciar com quem faz isso todo dia para empresas?</p>
        </div>
      </section>

      {/* 10 · mas espere + oferta */}
      <section className="mg-sec" id="oferta">
        <div className="mg-wrap mg-narrow">
          <h2 className="mg-center mg2-wait">⚠️ Mas espere! ⚠️</h2>
          <p className="mg-lead mg-center">O Método Gênio custa R$ {OFERTA.precoDe}. Mas você não vai pagar R$ {OFERTA.precoDe}.</p>
          <p className="mg-lead mg-center">
            São 60 produtos no ano por R$ {OFERTA.preco}: <strong>menos de R$ 5 por produto.</strong> Uma venda de R$ 9,90 já paga dois.
          </p>
          <div className="mg-offer">
            <img className="mg-offer-cover" src="/mg/capa.jpg" alt="Método Gênio" />
            <h2>Método Gênio + Painel Inteligente</h2>
            <ul>
              {oferta.map((o) => (
                <li key={o}><Icon name="check" /> {o}</li>
              ))}
              <li className="mg2-bonus"><Icon name="star" /> Bônus: os 7 produtos prontos com direito de revenda</li>
            </ul>
            <Preco />
            <Cta botao="oferta" label="Sim! Quero o Método Gênio" />
            <Selos />
          </div>
        </div>
      </section>

      {/* 11 · bônus */}
      <section className="mg-sec">
        <div className="mg-wrap mg-narrow mg2-bonus-sec">
          <img src="/mg/pacote7.jpg" alt="Os 7 produtos prontos com direito de revenda" loading="lazy" />
          <div>
            <p className="mg-eyebrow">🎁 E tem um presente</p>
            <h2>Os 7 produtos prontos, com direito de revenda</h2>
            <p>
              Quem entra no Método Gênio leva também os mesmos 7 produtos que eu vendo hoje: café da manhã sem pão,
              marmitas, caligrafia, inglês, devocional, contratos e stickers.
            </p>
            <p>Você não precisa nem esperar o seu primeiro pedido. Já pode começar a anunciar com um produto que já vende.</p>
          </div>
        </div>
      </section>

      {/* 12 · garantia */}
      <section className="mg-sec">
        <div className="mg-wrap mg-narrow mg-guarantee">
          <span className="mg-guarantee-ic"><Icon name="shield" /></span>
          <div>
            <h2>Garantia de 90 dias</h2>
            <p>A lei manda dar 7 dias de garantia. Eu te dou 90.</p>
            <p>
              Entra, faz os seus pedidos, segue as aulas. Se em até 90 dias você achar que não é pra você, pede o reembolso
              e recebe 100% do valor de volta.
            </p>
            <p><strong>O risco é todo meu.</strong></p>
          </div>
        </div>
      </section>

      {/* 13 · perguntas */}
      <section className="mg-sec">
        <div className="mg-wrap mg-narrow">
          <h2 className="mg-center">Perguntas frequentes</h2>
          <div className="mg-faq">
            {faq.map((f) => (
              <details key={f.q}>
                <summary>{f.q}</summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* 14 · muito prazer */}
      <section className="mg-sec mg-about">
        <div className="mg-wrap mg-narrow mg2-letter">
          <h2>Opa! Muito prazer!</h2>
          <div className="mg2-fotos">
            <figure><img src="/mg/brenno.jpg" alt="Brenno Lima" loading="lazy" /></figure>
            <figure><img src="/mg/brenno-familia.jpg" alt="Brenno com a esposa Aline e a filha" loading="lazy" /><figcaption>Com a Aline e a nossa filha</figcaption></figure>
          </div>
          <p>Eu sou o Brenno Lima. Nasci em Juiz de Fora, num bairro simples. Com 11 anos eu já vendia doce no ponto de ônibus.</p>
          <p>
            Com 14 virei técnico de celular, ganhando um salário mínimo. Entrei no exército ganhando R$ 642 e, na folga,
            vendia perfume na rua. Tentei Hinode, me mostraram a BMW, e o dinheiro nunca veio.
          </p>
          <p>Em 2018, numa operação da intervenção no Rio, eu prometi pra mim mesmo que ia construir algo meu.</p>
          <p>
            Fui pra internet. Tentei afiliado, loja, dropshipping. Até entender que o dinheiro não está em criar o produto:
            está em vender o que já vende.
          </p>
          <p>
            Hoje são mais de <strong>R$ 5 milhões em vendas de produto digital</strong>, tráfego pago desde 2016 e uma agência
            com mais de 300 empresas atendidas. Sou marido da Aline e pai da Ayla e da Aurora.
          </p>
          <p><strong>O Método Gênio é o atalho que eu queria ter tido quando comecei.</strong></p>
        </div>
      </section>

      {/* 15 · dois caminhos */}
      <section className="mg-sec mg-final">
        <div className="mg-wrap mg-narrow">
          <h2 className="mg-center">Agora você tem dois caminhos</h2>
          <div className="mg2-ways">
            <div>
              <h3>Caminho 1</h3>
              <p>Você fecha esta página, volta pro Instagram, continua vendo os outros conseguirem e daqui a seis meses está no mesmo lugar.</p>
            </div>
            <div className="is-good">
              <h3>Caminho 2</h3>
              <p>Você toca no botão, entra no Método Gênio e faz o seu primeiro pedido ainda hoje.</p>
            </div>
          </div>
          <p className="mg-lead mg-center">Se eu, que vendia doce no ponto de ônibus, consegui, você também consegue.</p>
          <div className="mg-center">
            <Lamp />
            <Preco />
            <Cta botao="final" label={`OK! Me convenceu! Quero por R$ ${OFERTA.preco}`} />
            <Selos />
          </div>
          <p className="mg2-ps">
            <strong>P.S.</strong> Lembra: são 90 dias de garantia. Faz o seu primeiro pedido, vê o produto saindo pronto, e se
            não for pra você, recebe tudo de volta.
          </p>
        </div>
      </section>

      <footer className="mg-foot">
        <div className="mg-wrap">
          <p>
            Os resultados dependem da aplicação de cada pessoa. Não há promessa de ganhos: a conta desta página é um
            exemplo, e os números citados são resultados pessoais do autor.
          </p>
          <p>Este site não faz parte do Facebook nem da Meta Platforms, Inc., e não é endossado por eles.</p>
          <p>© {new Date().getFullYear()} Método Gênio · Brenno Lima</p>
        </div>
      </footer>

      <BarraCelular href={checkoutLink("barra-celular")} precoDe={OFERTA.precoDe} preco={OFERTA.preco} />
    </main>
  );
}
