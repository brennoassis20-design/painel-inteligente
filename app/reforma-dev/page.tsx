"use client";

// Bancada de testes do App da Reforma (só em desenvolvimento): sem login, dados no navegador.
// Em produção a página fica vazia. Abrir: http://localhost:3000/reforma-dev  (?kit=1 mostra o Kit liberado)
import "../membros/membros.css";
import { ReformaApp } from "../membros/reforma/ReformaApp";

export default function ReformaDev() {
  if (process.env.NODE_ENV === "production") return null;
  const kit = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("kit") === "1";
  return (
    <div className="gp" style={{ ["--gp-accent" as string]: "#2dd4bf", ["--gp-on-accent" as string]: "#04201d", ["--gp-bg" as string]: "#0b1220" }}>
      <header className="gp-top gp-wrap">
        <span className="gp-logo">Reforma Desenhada</span>
      </header>
      <main className="gp-wrap">
        <ReformaApp
          acesso={{ app: true, kit, kitSlug: kit ? "kit-consultor" : null, kitOfertaUrl: "https://example.com/oferta", armazenamento: "local" }}
          chaveLocal="dev"
          chamar={async () => ({})}
          marca="Reforma Desenhada"
          onAbrirProduto={() => undefined}
          forcarLocal
        />
      </main>
    </div>
  );
}
