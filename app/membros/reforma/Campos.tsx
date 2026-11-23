"use client";

import { useId, type ReactNode } from "react";
import { formatarCampoDinheiro, limparDigitacao } from "@/lib/reforma-app/numeros";

type Base = { rotulo: string; dica?: ReactNode; erro?: string; opcional?: boolean };

export function Campo({ rotulo, dica, erro, opcional, id, children }: Base & { id: string; children: ReactNode }) {
  return (
    <div className={`rf-campo${erro ? " tem-erro" : ""}`}>
      <label htmlFor={id}>
        {rotulo}
        {opcional && <em> (opcional)</em>}
      </label>
      {children}
      {dica && !erro && <small className="rf-dica">{dica}</small>}
      {erro && (
        <small className="rf-erro" role="alert">
          {erro}
        </small>
      )}
    </div>
  );
}

export function CampoTexto({ valor, onChange, placeholder, tipo = "text", modo, autoComplete, maxLength, ...base }: Base & { valor: string; onChange: (v: string) => void; placeholder?: string; tipo?: string; modo?: "text" | "tel" | "numeric" | "decimal"; autoComplete?: string; maxLength?: number }) {
  const id = useId();
  return (
    <Campo id={id} {...base}>
      <input id={id} type={tipo} inputMode={modo} autoComplete={autoComplete ?? "off"} maxLength={maxLength} value={valor} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} aria-invalid={Boolean(base.erro)} />
    </Campo>
  );
}

export function CampoDinheiro({ valor, onChange, placeholder = "0,00", ...base }: Base & { valor: string; onChange: (v: string) => void; placeholder?: string }) {
  const id = useId();
  return (
    <Campo id={id} {...base}>
      <span className="rf-input-pre" data-pre="R$">
        <input id={id} type="text" inputMode="decimal" autoComplete="off" value={valor} placeholder={placeholder} onChange={(e) => onChange(limparDigitacao(e.target.value))} onBlur={() => onChange(formatarCampoDinheiro(valor))} aria-invalid={Boolean(base.erro)} />
      </span>
    </Campo>
  );
}

export function CampoPercentual({ valor, onChange, placeholder = "0", ...base }: Base & { valor: string; onChange: (v: string) => void; placeholder?: string }) {
  const id = useId();
  return (
    <Campo id={id} {...base}>
      <span className="rf-input-pos" data-pos="%">
        <input id={id} type="text" inputMode="decimal" autoComplete="off" value={valor} placeholder={placeholder} onChange={(e) => onChange(limparDigitacao(e.target.value))} aria-invalid={Boolean(base.erro)} />
      </span>
    </Campo>
  );
}

export function Selecao({ valor, onChange, opcoes, vazio = "Escolha…", ...base }: Base & { valor: string; onChange: (v: string) => void; opcoes: { valor: string; rotulo: string }[]; vazio?: string }) {
  const id = useId();
  return (
    <Campo id={id} {...base}>
      <select id={id} value={valor} onChange={(e) => onChange(e.target.value)} aria-invalid={Boolean(base.erro)}>
        <option value="">{vazio}</option>
        {opcoes.map((o) => (
          <option key={o.valor} value={o.valor}>
            {o.rotulo}
          </option>
        ))}
      </select>
    </Campo>
  );
}

/** Escolha de uma opção entre poucas, em cartões grandes (bom para o dedo). */
export function Escolha<T extends string>({ rotulo, valor, onChange, opcoes, erro, nome }: { rotulo: string; valor: T | ""; onChange: (v: T) => void; opcoes: { valor: T; rotulo: string; detalhe?: string }[]; erro?: string; nome: string }) {
  return (
    <fieldset className={`rf-escolha${erro ? " tem-erro" : ""}`}>
      <legend>{rotulo}</legend>
      <div className="rf-escolha-lista">
        {opcoes.map((o) => (
          <label key={o.valor} className={`rf-opcao${valor === o.valor ? " on" : ""}`}>
            <input type="radio" name={nome} value={o.valor} checked={valor === o.valor} onChange={() => onChange(o.valor)} />
            <span>
              <b>{o.rotulo}</b>
              {o.detalhe && <small>{o.detalhe}</small>}
            </span>
          </label>
        ))}
      </div>
      {erro && (
        <small className="rf-erro" role="alert">
          {erro}
        </small>
      )}
    </fieldset>
  );
}

export function Caixa({ marcado, onChange, children }: { marcado: boolean; onChange: (v: boolean) => void; children: ReactNode }) {
  return (
    <label className={`rf-caixa${marcado ? " on" : ""}`}>
      <input type="checkbox" checked={marcado} onChange={(e) => onChange(e.target.checked)} />
      <span>{children}</span>
    </label>
  );
}

/** Confirmação na própria tela (nunca a janela do navegador). */
export function Confirmar({ titulo, texto, confirmar, cancelar = "Cancelar", perigo, onConfirmar, onCancelar, extra }: { titulo: string; texto: ReactNode; confirmar: string; cancelar?: string; perigo?: boolean; onConfirmar: () => void; onCancelar: () => void; extra?: { rotulo: string; onClick: () => void } }) {
  return (
    <div className="gp-modal rf-modal" role="alertdialog" aria-modal="true" aria-label={titulo}>
      <button type="button" className="gp-backdrop" aria-label="Fechar" onClick={onCancelar} />
      <div className="gp-sheet rf-dialogo">
        <h2>{titulo}</h2>
        <p>{texto}</p>
        <div className="rf-acoes">
          <button type="button" className={`gp-btn ${perigo ? "gp-btn-danger rf-perigo" : "gp-btn-gold"} rf-grande`} onClick={onConfirmar}>
            {confirmar}
          </button>
          {extra && (
            <button type="button" className="gp-btn gp-btn-ghost rf-grande" onClick={extra.onClick}>
              {extra.rotulo}
            </button>
          )}
          <button type="button" className="gp-btn gp-btn-ghost rf-grande" onClick={onCancelar}>
            {cancelar}
          </button>
        </div>
      </div>
    </div>
  );
}
