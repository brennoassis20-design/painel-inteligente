/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import { Icon } from "../icons";
import { OFERTA, rastreado } from "../metodo-genio/oferta";
import "../metodo-genio/mg.css";

export const metadata: Metadata = {
  title: "Brenno Lima | Links",
  description: "Método Gênio e serviços da GDM: tráfego pago, assessoria e consultoria comercial.",
  openGraph: { title: "Brenno Lima", images: ["/mg/brenno-avatar.jpg"] },
};

export default function BrennoLinksPage() {
  return (
    <main className="mg">
      <div className="mg-bg" aria-hidden="true" />
      <div className="bio-wrap">
        <img className="bio-photo" src={OFERTA.avatar} alt="Brenno Lima" />
        <h1>Brenno Lima</h1>
        <p className="bio-sub">
          +R$ 5 milhões em produtos digitais · tráfego pago desde 2016 · pai da Ayla e da Aurora
        </p>

        <section className="bio-block bio-genio">
          <p className="mg-eyebrow">Quer vender produto digital?</p>
          <div className="bio-genio-head">
            <img src="/mg/capa.jpg" alt="Método Gênio" />
            <div>
              <h2>Método Gênio</h2>
              <p style={{ margin: 0 }}>Faça o pedido. Seu produto sai pronto para vender.</p>
            </div>
          </div>
          <p>
            Você escolhe o nicho e o painel entrega o produto, a página de vendas, os anúncios e os criativos. Sem
            ser especialista e sem aparecer.
          </p>
          <a className="mg-cta" href={rastreado("/metodo-genio", "instagram", "bio", "metodo-genio", "botao-metodo-genio")}>
            Conhecer o Método Gênio
            <Icon name="arrow" />
          </a>
        </section>

        <section className="bio-block bio-gdm">
          <p className="mg-eyebrow">Para empresas</p>
          <h2>Quer contratar meus serviços para a sua empresa?</h2>
          <p>
            Se você é empresário, dentista, clínica ou dono de negócio e quer mais clientes, minha agência, a{" "}
            <strong>GDM (Group Digital Media)</strong>, cuida disso para você.
          </p>
          <ul className="bio-tags">
            <li>Tráfego pago</li>
            <li>Assessoria comercial</li>
            <li>Consultoria comercial</li>
          </ul>
          <a className="bio-btn-alt" href={rastreado(OFERTA.gdm, "instagram", "bio", "gdm", "botao-contratar-gdm")} target="_blank" rel="noopener noreferrer">
            Quero contratar a GDM
            <Icon name="external" />
          </a>
        </section>

        <a className="bio-link" href={rastreado(OFERTA.painel, "instagram", "bio", "metodo-genio", "ja-sou-aluno")}>
          <Icon name="lock" />
          Já sou aluno: entrar no Painel
        </a>

        <p className="bio-foot">© {new Date().getFullYear()} Brenno Lima</p>
      </div>
    </main>
  );
}
