/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import Script from "next/script";
import { Icon, type IconName } from "../icons";
import { OFERTA, checkoutLink, rastreado } from "./oferta";
import { Rastreio } from "./Rastreio";
import "./mg.css";

export const metadata: Metadata = {
  title: "Método Gênio | Faça o pedido. Seu produto sai pronto.",
  description:
    "Escolha o nicho e o Painel Inteligente entrega o produto digital, a página de vendas, os anúncios e os criativos prontos para vender.",
  openGraph: {
    title: "Método Gênio",
    description: "Faça o pedido. Seu produto digital sai pronto para vender.",
    images: ["/mg/capa.jpg"],
  },
};

const pixelId = OFERTA.pixelId;

const dores = [
  "Você não sabe o que vender e trava antes de começar.",
  "Acha que precisa ser especialista ou ter diploma para ter um produto.",
  "Começa a criar o produto, gasta semanas e nunca termina.",
  "Não sabe montar página de vendas, escrever anúncio nem fazer criativo.",
  "Não quer aparecer em vídeo, e acha que sem isso não vende.",
  "Já comprou curso que só ensina teoria e te deixa sozinho na hora de fazer.",
];

const passos = [
  { n: "1", t: "Escolha o nicho", d: "Use os Nichos em alta ou diga o assunto que você quer vender." },
  { n: "2", t: "Faça o pedido", d: "Diga o público, o formato e o tom. O Painel Inteligente cria tudo em minutos." },
  { n: "3", t: "Baixe e publique", d: "Produto, página de vendas, anúncios e criativos saem prontos. Você coloca no ar e começa a vender." },
];

const entregas: { icon: IconName; t: string; d: string }[] = [
  { icon: "doc", t: "Produto digital completo", d: "Um PDF premium, com capa, diagramação e conteúdo prontos para você vender com o seu nome." },
  { icon: "page", t: "Página de vendas pronta", d: "Você põe preço, link do checkout e pixel. Baixa o arquivo e publica em minutos, sem mexer em código." },
  { icon: "image", t: "Criativos prontos", d: "Imagens para feed e story, carrossel e vídeo sem aparecer. Tudo com a copy do seu produto." },
  { icon: "chat", t: "Textos de anúncio", d: "Copy para seus anúncios e roteiros para quem quiser gravar." },
  { icon: "trend", t: "Nichos em alta", d: "Ideias de produtos low ticket para você não começar do zero." },
  { icon: "cube", t: "Mockup 3D", d: "A capa do seu produto em livro, tablet, celular ou kit, para usar nos anúncios." },
  { icon: "calc", t: "Calculadora de lucro", d: "Preço, custo por venda e meta. Você sabe se a conta fecha antes de anunciar." },
  { icon: "rocket", t: "Checklist de lançamento", d: "Do produto ao primeiro anúncio, um passo de cada vez." },
  { icon: "bot", t: "Mentor 24 horas", d: "Travou? Pergunte ao Mentor e receba a resposta na hora." },
  { icon: "play", t: "Aulas passo a passo", d: "Eu te mostro como usar o painel, publicar a página e anunciar." },
];

const paraQuem = [
  "Quer ter o próprio produto digital sem ser especialista",
  "Não quer aparecer em vídeo",
  "Tem pouco tempo e quer algo prático, que sai pronto",
  "Já tentou vender na internet e travou na criação",
  "Quer testar vários nichos até achar o que vende",
];

const naoE = [
  "Quer ganhar dinheiro sem fazer nada",
  "Não vai publicar a página nem anunciar",
  "Procura fórmula mágica de enriquecimento rápido",
];

const faq = [
  { q: "Preciso ser especialista em algum assunto?", a: "Não. Você escolhe o nicho e o Painel Inteligente cria o conteúdo do produto. Você revisa, ajusta o que quiser e vende." },
  { q: "Preciso aparecer em vídeo?", a: "Não. Os criativos em imagem, o carrossel e o vídeo sem aparecer foram feitos justamente para quem não quer se expor." },
  { q: "Preciso saber mexer com tecnologia?", a: "Não. Tudo sai pronto para baixar. Nas aulas eu mostro como publicar a página arrastando um arquivo, sem programar nada." },
  { q: "Como recebo o acesso?", a: "Logo depois da compra você recebe um e-mail para criar sua senha. Entra no painel com o mesmo e-mail que usou na compra." },
  { q: "Por quanto tempo tenho acesso?", a: "Um ano de acesso ao Painel Inteligente e às aulas." },
  { q: "Quantos produtos posso criar?", a: "Até 5 produtos completos por mês, cada um com página de vendas, copy e criativos." },
  { q: "Funciona no celular?", a: "Sim. O painel funciona no celular e no computador." },
  { q: "E se eu não gostar?", a: "Você tem 7 dias de garantia. Se não for para você, pede o reembolso e recebe 100% do valor de volta." },
];

const galeria = [
  { src: "/mg/inicio.jpg", t: "A tela inicial: faça o pedido em um campo só" },
  { src: "/mg/criativos.jpg", t: "Criativos prontos em todos os formatos" },
  { src: "/mg/mockup.jpg", t: "Mockup 3D da capa do seu produto" },
  { src: "/mg/calculadora.jpg", t: "Calculadora de lucro" },
  { src: "/mg/mentor.jpg", t: "Mentor que responde na hora" },
  { src: "/mg/checklist.jpg", t: "Checklist do produto ao primeiro anúncio" },
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
    </div>
  );
}

function Selos() {
  return (
    <ul className="mg-seals">
      <li><Icon name="shield" /> Garantia de 7 dias</li>
      <li><Icon name="calendar" /> 1 ano de acesso</li>
      <li><Icon name="lock" /> Pagamento seguro</li>
    </ul>
  );
}

function Foto({ src, className }: { src: string; className: string }) {
  if (!src) {
    return (
      <div className={`${className} mg-photo-empty`} aria-hidden="true">
        <span>BL</span>
      </div>
    );
  }
  return <img className={className} src={src} alt="Brenno Lima" />;
}

export default function MetodoGenioPage() {
  return (
    <main className="mg">
      {pixelId && (
        <Script id="mg-pixel" strategy="afterInteractive">
          {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init','${pixelId}');fbq('track','PageView');fbq('track','ViewContent',{content_name:'Método Gênio',value:${OFERTA.preco},currency:'BRL'});`}
        </Script>
      )}
      <Rastreio valor={OFERTA.preco} />
      <div className="mg-bg" aria-hidden="true" />

      <header className="mg-top">
        <div className="mg-wrap mg-top-in">
          <span className="mg-brand">
            <Lamp />
            Método Gênio
          </span>
          <a className="mg-login" href={rastreado(OFERTA.painel, "pagina-vendas", "topo", "metodo-genio", "ja-sou-aluno")}>Já sou aluno</a>
        </div>
      </header>

      <section className="mg-hero">
        <div className="mg-wrap mg-hero-grid">
          <div>
            <p className="mg-eyebrow">Para quem quer vender produto digital sem ser especialista</p>
            <h1>
              Faça o pedido. <span className="mg-gt">Seu produto digital sai pronto para vender.</span>
            </h1>
            <p className="mg-lead">
              Você escolhe o nicho. O Painel Inteligente entrega o produto, a página de vendas, os anúncios e os
              criativos. Você só publica e começa a vender, sem aparecer e sem começar do zero.
            </p>
            <Preco />
            <Cta botao="topo" />
            <Selos />
          </div>
          <figure className="mg-hero-shot">
            <img src="/mg/inicio.jpg" alt="Tela inicial do Painel Inteligente" />
            <img className="mg-hero-phone" src="/mg/celular.jpg" alt="Painel Inteligente no celular" />
          </figure>
        </div>
      </section>

      <section className="mg-sec">
        <div className="mg-wrap mg-narrow">
          <h2>Se você já tentou vender na internet, provavelmente travou em um destes pontos</h2>
          <ul className="mg-pains">
            {dores.map((d) => (
              <li key={d}><Icon name="close" /> {d}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mg-sec mg-turn">
        <div className="mg-wrap mg-narrow">
          <p className="mg-eyebrow">A virada</p>
          <h2>
            O problema nunca foi você. <span className="mg-gt">Era ter que fazer tudo sozinho, do zero.</span>
          </h2>
          <p className="mg-lead">
            Produto, página, copy, criativo, anúncio. É coisa demais para quem está começando, e é aí que a maioria
            desiste. No Método Gênio funciona como o gênio da lâmpada: você faz o pedido e recebe tudo pronto.
          </p>
          <ol className="mg-steps">
            {passos.map((p) => (
              <li key={p.n}>
                <span className="mg-step-n">{p.n}</span>
                <div>
                  <strong>{p.t}</strong>
                  <p>{p.d}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mg-sec">
        <div className="mg-wrap">
          <p className="mg-eyebrow mg-center">O que você recebe</p>
          <h2 className="mg-center">Tudo o que você precisa para tirar o produto do papel</h2>
          <div className="mg-cards">
            {entregas.map((e) => (
              <article key={e.t} className="mg-card">
                <span className="mg-card-ic"><Icon name={e.icon} /></span>
                <h3>{e.t}</h3>
                <p>{e.d}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mg-sec">
        <div className="mg-wrap">
          <p className="mg-eyebrow mg-center">Espie por dentro</p>
          <h2 className="mg-center">É isso que você vai usar todos os dias</h2>
          <div className="mg-gallery">
            {galeria.map((g) => (
              <figure key={g.src}>
                <img src={g.src} alt={g.t} loading="lazy" />
                <figcaption>{g.t}</figcaption>
              </figure>
            ))}
          </div>
          <div className="mg-ads">
            <figure>
              <img src="/mg/feed1.jpg" alt="Exemplo de criativo gerado pelo painel" loading="lazy" />
            </figure>
            <figure>
              <img src="/mg/feed2.jpg" alt="Exemplo de criativo com oferta gerado pelo painel" loading="lazy" />
            </figure>
            <p>Criativos de exemplo gerados pelo painel, sem designer e sem aparecer.</p>
          </div>
        </div>
      </section>

      <section className="mg-sec mg-about">
        <div className="mg-wrap mg-about-grid">
          <Foto src={OFERTA.foto} className="mg-photo" />
          <div>
            <p className="mg-eyebrow">Quem vai te ensinar</p>
            <h2>Prazer, eu sou o Brenno Lima</h2>
            <p>
              Nasci e cresci em Juiz de Fora, num bairro simples, numa família simples. Vendia doce na rua e cresci
              sempre tentando vender alguma coisa.
            </p>
            <p>
              Fui militar do Exército por alguns anos e, mesmo lá, nunca parei de vender, pela internet e pelas ruas.
              Comecei na internet como afiliado, trabalho com tráfego pago desde 2016 e, em 2018, comecei a prestar
              serviço pela internet. Entrei na faculdade de Educação Física e larguei quando os resultados na internet
              ficaram maiores do que qualquer coisa que a faculdade poderia me dar.
            </p>
            <p>
              Passei dos <strong>R$ 5 milhões em vendas de produtos digitais</strong> e parei de contar. Esse número
              não inclui nenhum centavo dos meus serviços de tráfego. Fui sócio de vários players do mercado e tive
              como mentor o Bruno Tassitani.
            </p>
            <p>
              Hoje sou marido da Aline e pai da Ayla e da Aurora. O Método Gênio é o atalho que eu queria ter tido
              quando comecei: em vez de passar semanas criando, você faz o pedido e começa a vender.
            </p>
            {OFERTA.foto2 && (
              <figure className="mg-family">
                <img src={OFERTA.foto2} alt="Brenno com a esposa Aline e a filha" loading="lazy" />
                <figcaption>Com a Aline e a nossa filha</figcaption>
              </figure>
            )}
            <ul className="mg-facts">
              <li><strong>+R$ 5 mi</strong><span>em produtos digitais</span></li>
              <li><strong>Desde 2016</strong><span>no tráfego pago</span></li>
              <li><strong>Sócio</strong><span>de vários players</span></li>
            </ul>
          </div>
        </div>
      </section>

      <section className="mg-sec">
        <div className="mg-wrap mg-who">
          <div className="mg-who-col mg-yes">
            <h3>É para você que</h3>
            <ul>
              {paraQuem.map((t) => (
                <li key={t}><Icon name="check" /> {t}</li>
              ))}
            </ul>
          </div>
          <div className="mg-who-col mg-no">
            <h3>Não é para você que</h3>
            <ul>
              {naoE.map((t) => (
                <li key={t}><Icon name="close" /> {t}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="mg-sec" id="oferta">
        <div className="mg-wrap mg-narrow">
          <div className="mg-offer">
            <img className="mg-offer-cover" src="/mg/capa.jpg" alt="Método Gênio" />
            <h2>Método Gênio + Painel Inteligente</h2>
            <ul>
              <li><Icon name="check" /> 1 ano de acesso ao Painel Inteligente</li>
              <li><Icon name="check" /> Até 5 produtos completos por mês</li>
              <li><Icon name="check" /> Página de vendas, copy e criativos de cada produto</li>
              <li><Icon name="check" /> Nichos em alta, Mockup 3D, Calculadora e Checklist</li>
              <li><Icon name="check" /> Mentor 24 horas</li>
              <li><Icon name="check" /> Aulas passo a passo</li>
            </ul>
            <Preco />
            <Cta botao="oferta" label="Garantir meu acesso agora" />
            <Selos />
          </div>
        </div>
      </section>

      <section className="mg-sec">
        <div className="mg-wrap mg-narrow mg-guarantee">
          <span className="mg-guarantee-ic"><Icon name="shield" /></span>
          <div>
            <h2>Garantia incondicional de 7 dias</h2>
            <p>
              Entre, faça seus pedidos e use o painel. Se em até 7 dias você achar que não é para você, é só pedir o
              reembolso e você recebe 100% do valor de volta. Sem perguntas.
            </p>
          </div>
        </div>
      </section>

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

      <section className="mg-sec mg-final">
        <div className="mg-wrap mg-narrow mg-center">
          <Lamp />
          <h2>
            Faça o seu primeiro pedido <span className="mg-gt">ainda hoje</span>
          </h2>
          <p className="mg-lead">Daqui a alguns minutos você pode estar com o seu produto pronto para vender.</p>
          <Preco />
          <Cta botao="final" />
        </div>
      </section>

      <footer className="mg-foot">
        <div className="mg-wrap">
          <p>
            Os resultados dependem da aplicação de cada pessoa. Não garantimos ganhos. Os números citados são
            resultados pessoais do autor e não representam uma promessa de faturamento.
          </p>
          <p>
            Este site não faz parte do Facebook nem da Meta Platforms, Inc., e não é endossado por eles.
          </p>
          <p>© {new Date().getFullYear()} Método Gênio · Brenno Lima</p>
        </div>
      </footer>

      <div className="mg-sticky">
        <div>
          <small>de R$ {OFERTA.precoDe}</small>
          <strong>R$ {OFERTA.preco}</strong>
        </div>
        <a className="mg-cta" href={checkoutLink("barra-celular")} data-checkout="barra-celular">
          Quero o meu
          <Icon name="arrow" />
        </a>
      </div>
    </main>
  );
}
