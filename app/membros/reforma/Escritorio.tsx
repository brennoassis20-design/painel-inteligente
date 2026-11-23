"use client";

import { useRef, useState } from "react";
import type { Escritorio } from "@/lib/reforma-app/modelo";
import { reduzirLogo } from "@/lib/reforma-app/logo";
import { POLITICA_PRIVACIDADE, TERMO_DE_USO, TERMO_EMPRESA, TERMO_SUPORTE, TERMO_VERSAO } from "@/lib/reforma-app/termo";
import { Caixa, CampoTexto } from "./Campos";

const CORES = ["#1F4E79", "#0F766E", "#7C3AED", "#B45309", "#BE123C", "#111827"];

export function BotaoAulas({ onAreaMembros, texto = "Ver as aulas na área de membros" }: { onAreaMembros?: () => void; texto?: string }) {
  if (!onAreaMembros) return null;
  return (
    <button type="button" className="gp-btn rf-grande rf-largo" onClick={onAreaMembros}>
      {texto}
    </button>
  );
}

export function FormEscritorio({ inicial, rotulo, comTermos, onSalvar }: { inicial: Escritorio; rotulo: string; comTermos?: boolean; onSalvar: (e: Escritorio) => Promise<void> }) {
  const [e, setE] = useState<Escritorio>(inicial);
  const [erros, setErros] = useState<Record<string, string>>({});
  const [aceite, setAceite] = useState(!comTermos);
  const [salvando, setSalvando] = useState(false);
  const [falha, setFalha] = useState("");
  const [logoErro, setLogoErro] = useState("");
  const arquivo = useRef<HTMLInputElement>(null);

  const enviarLogo = async (f: File | undefined) => {
    if (!f) return;
    setLogoErro("");
    try {
      setE((x) => ({ ...x, logo: null }));
      const data = await reduzirLogo(f);
      setE((x) => ({ ...x, logo: data }));
    } catch (err) {
      setLogoErro(err instanceof Error ? err.message : "Não deu para usar essa imagem.");
    }
    if (arquivo.current) arquivo.current.value = "";
  };

  const salvar = async () => {
    const er: Record<string, string> = {};
    if (!e.nome.trim()) er.nome = "Informe o nome do escritório.";
    const dig = e.whatsapp.replace(/\D/g, "");
    if (!dig) er.whatsapp = "Informe o WhatsApp do escritório.";
    else if (dig.length < 10 || dig.length > 13) er.whatsapp = "Digite o WhatsApp com DDD, por exemplo (11) 98888-7777.";
    if (!/^#[0-9a-f]{6}$/i.test(e.cor)) er.cor = "Escolha uma cor.";
    if (!aceite) er.aceite = "Para continuar, aceite o termo de uso e a política de privacidade.";
    setErros(er);
    if (Object.keys(er).length) return;
    setSalvando(true);
    setFalha("");
    try {
      await onSalvar({ ...e, nome: e.nome.trim(), crc: e.crc.trim(), whatsapp: e.whatsapp.trim(), configurado: true, atualizadoEm: new Date().toISOString() });
    } catch (err) {
      setFalha(err instanceof Error ? err.message : "Não deu para salvar. Tente de novo.");
    } finally {
      setSalvando(false);
    }
  };

  return (
    <section className="rf-bloco" aria-label="Dados do escritório">
      <div className="rf-form">
        <CampoTexto rotulo="Nome do escritório" valor={e.nome} onChange={(v) => setE({ ...e, nome: v })} erro={erros.nome} placeholder="Ex.: Souza Contabilidade" maxLength={120} autoComplete="organization" />
        <CampoTexto rotulo="CRC" opcional valor={e.crc} onChange={(v) => setE({ ...e, crc: v })} placeholder="Ex.: CRC-SP 2SP123456/O" maxLength={40} dica="Aparece no rodapé do PDF." />
        <CampoTexto rotulo="WhatsApp do escritório" valor={e.whatsapp} onChange={(v) => setE({ ...e, whatsapp: v })} erro={erros.whatsapp} tipo="tel" modo="tel" placeholder="(11) 98888-7777" autoComplete="tel" maxLength={30} />
        <fieldset className="rf-cores">
          <legend>Cor do PDF</legend>
          <div className="rf-cores-lista">
            {CORES.map((c) => (
              <button key={c} type="button" className={`rf-cor${e.cor.toLowerCase() === c.toLowerCase() ? " on" : ""}`} style={{ background: c }} onClick={() => setE({ ...e, cor: c })} aria-label={`Usar a cor ${c}`} aria-pressed={e.cor.toLowerCase() === c.toLowerCase()} />
            ))}
            <label className="rf-cor-livre">
              <span>Outra</span>
              <input type="color" value={/^#[0-9a-f]{6}$/i.test(e.cor) ? e.cor : "#1F4E79"} onChange={(ev) => setE({ ...e, cor: ev.target.value.toUpperCase() })} aria-label="Escolher outra cor" />
            </label>
          </div>
          {erros.cor && <small className="rf-erro">{erros.cor}</small>}
        </fieldset>
        <div className="rf-logo">
          <div className="rf-logo-previa" style={{ borderColor: e.cor }}>
            {/* eslint-disable-next-line @next/next/no-img-element -- logo local (data URL) */}
            {e.logo ? <img src={e.logo} alt="Logo do escritório" /> : <span>Sem logo</span>}
          </div>
          <div className="rf-logo-acoes">
            <b>Logo do escritório</b>
            <small className="rf-dica">PNG ou JPG. Vai na capa do PDF.</small>
            <input ref={arquivo} id="rf-logo-arquivo" type="file" accept="image/*" className="rf-oculto" onChange={(ev) => void enviarLogo(ev.target.files?.[0])} />
            <div className="rf-acoes-linha">
              <label htmlFor="rf-logo-arquivo" className="gp-btn gp-btn-ghost rf-grande">
                {e.logo ? "Trocar a logo" : "Enviar a logo"}
              </label>
              {e.logo && (
                <button type="button" className="gp-btn gp-btn-ghost rf-grande" onClick={() => setE({ ...e, logo: null })}>
                  Tirar a logo
                </button>
              )}
            </div>
            {logoErro && <small className="rf-erro">{logoErro}</small>}
          </div>
        </div>
        {comTermos && (
          <div className="rf-termos">
            <details>
              <summary>Ler o termo de uso e a política de privacidade</summary>
              <h3>Termo de uso</h3>
              {TERMO_DE_USO.map((s) => (
                <section key={s.titulo}>
                  <h4>{s.titulo}</h4>
                  {s.itens.map((t) => (
                    <p key={t}>{t}</p>
                  ))}
                </section>
              ))}
              <h3>Política de privacidade</h3>
              {POLITICA_PRIVACIDADE.map((s) => (
                <section key={s.titulo}>
                  <h4>{s.titulo}</h4>
                  {s.itens.map((t) => (
                    <p key={t}>{t}</p>
                  ))}
                </section>
              ))}
              <p className="gp-muted">
                Versão {TERMO_VERSAO} · {TERMO_EMPRESA} · {TERMO_SUPORTE}
              </p>
            </details>
            <Caixa marcado={aceite} onChange={setAceite}>
              Li e aceito o termo de uso e a política de privacidade.
            </Caixa>
            {erros.aceite && <small className="rf-erro">{erros.aceite}</small>}
          </div>
        )}
        {falha && (
          <p className="rf-erro" role="alert">
            {falha}
          </p>
        )}
        <button type="button" className="gp-btn gp-btn-gold rf-grande rf-largo" onClick={() => void salvar()} disabled={salvando}>
          {salvando ? "Salvando…" : rotulo}
        </button>
      </div>
    </section>
  );
}

export function PrimeiroAcesso({ marca, inicial, onSalvar, onAreaMembros }: { marca: string; inicial: Escritorio; onSalvar: (e: Escritorio) => Promise<void>; onAreaMembros?: () => void }) {
  return (
    <div className="rf-primeiro">
      <section className="rf-boas-vindas">
        <span className="gp-eyebrow">Bem-vindo</span>
        <h1>App da Reforma</h1>
        <p>
          Cadastre a empresa do seu cliente, veja quanto muda de imposto de 2026 a 2033 e entregue um PDF com a logo do seu escritório. Leva poucos minutos por cliente. ({marca})
        </p>
        <ol className="rf-passos-curtos">
                    <li>Configure o seu escritório.</li>
          <li>Cadastre o primeiro cliente.</li>
        </ol>
      </section>
      <section className="rf-bloco">
        <p className="gp-muted">As aulas de como instalar no celular e no computador e de como usar o app ficam na área de membros.</p>
        <BotaoAulas onAreaMembros={onAreaMembros} />
      </section>
      <section className="rf-bloco-titulo">
        <h2>Configure o seu escritório</h2>
        <p className="gp-muted">Essas informações saem na capa e no rodapé do PDF que o seu cliente recebe.</p>
      </section>
      <FormEscritorio inicial={inicial} rotulo="Salvar e começar" comTermos onSalvar={onSalvar} />
    </div>
  );
}
