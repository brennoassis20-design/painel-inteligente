"use client";

import { useState } from "react";
import { resumoCliente, type Cliente, type Escritorio } from "@/lib/reforma-app/modelo";
import { Confirmar } from "./Campos";

function dataCurta(iso: string) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("pt-BR");
}

function semAcento(t: string) {
  return t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export function Clientes({ clientes, escritorio, onNovo, onAbrir, onEditar, onDuplicar, onApagar, onEscritorio }: {
  clientes: Cliente[];
  escritorio: Escritorio;
  onNovo: () => void;
  onAbrir: (c: Cliente) => void;
  onEditar: (c: Cliente) => void;
  onDuplicar: (c: Cliente) => void;
  onApagar: (c: Cliente) => Promise<void>;
  onEscritorio: () => void;
}) {
  const [busca, setBusca] = useState("");
  const [apagando, setApagando] = useState<Cliente | null>(null);
  const [erro, setErro] = useState("");
  const q = semAcento(busca.trim());
  const lista = q ? clientes.filter((c) => semAcento(`${c.form.nome} ${c.form.municipio} ${resumoCliente(c.form)}`).includes(q)) : clientes;

  const apagar = async () => {
    if (!apagando) return;
    try {
      await onApagar(apagando);
      setApagando(null);
      setErro("");
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não deu para apagar. Tente de novo.");
    }
  };

  return (
    <div className="rf-tela">
      <header className="rf-cabeca">
        <div>
          <h1>Clientes</h1>
          <p className="gp-muted">{escritorio.nome || "Seu escritório"}</p>
        </div>
        <button type="button" className="gp-btn gp-btn-gold rf-grande rf-desktop-so" onClick={onNovo}>
          + Novo cliente
        </button>
      </header>

      {clientes.length > 0 && (
        <div className="rf-busca">
          <label htmlFor="rf-busca" className="rf-oculto">
            Buscar cliente
          </label>
          <input id="rf-busca" type="search" placeholder="Buscar por nome ou cidade" value={busca} onChange={(e) => setBusca(e.target.value)} autoComplete="off" />
        </div>
      )}

      {erro && (
        <p className="rf-erro" role="alert">
          {erro}
        </p>
      )}

      {clientes.length === 0 ? (
        <div className="rf-vazio">
          <h2>Nenhum cliente ainda</h2>
          <p className="gp-muted">Cadastre o primeiro cliente e veja o resultado em poucos minutos.</p>
          <button type="button" className="gp-btn gp-btn-gold rf-grande rf-largo" onClick={onNovo}>
            + Novo cliente
          </button>
        </div>
      ) : lista.length === 0 ? (
        <p className="gp-muted rf-vazio">Nenhum cliente com &quot;{busca}&quot;.</p>
      ) : (
        <ul className="rf-lista">
          {lista.map((c) => (
            <li key={c.id} className="rf-cartao-cliente">
              <button type="button" className="rf-cliente-corpo" onClick={() => (c.rascunho ? onEditar(c) : onAbrir(c))}>
                <span className="rf-cliente-nome">
                  {c.form.nome || "Sem nome"}
                  {c.rascunho && <span className="gp-pill warn">Rascunho · passo {c.passo} de 5</span>}
                </span>
                <small>{resumoCliente(c.form) || "Cadastro em andamento"}</small>
                <small className="rf-data">Atualizado em {dataCurta(c.atualizadoEm)}</small>
              </button>
              <div className="rf-cliente-acoes">
                {c.rascunho ? (
                  <button type="button" className="gp-btn gp-btn-gold rf-medio" onClick={() => onEditar(c)}>
                    Continuar
                  </button>
                ) : (
                  <button type="button" className="gp-btn gp-btn-gold rf-medio" onClick={() => onAbrir(c)}>
                    Ver resultado
                  </button>
                )}
                {!c.rascunho && (
                  <button type="button" className="gp-btn gp-btn-ghost rf-medio" onClick={() => onEditar(c)}>
                    Editar
                  </button>
                )}
                <button type="button" className="gp-btn gp-btn-ghost rf-medio" onClick={() => onDuplicar(c)}>
                  Duplicar
                </button>
                <button type="button" className="gp-btn gp-btn-danger rf-medio" onClick={() => setApagando(c)}>
                  Apagar
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="rf-rodape-lista">
        <button type="button" className="gp-link" onClick={onEscritorio}>
          Dados do escritório, logo e cor do PDF
        </button>
      </div>

      {clientes.length > 0 && (
        <div className="rf-fab-area">
          <button type="button" className="gp-btn gp-btn-gold rf-grande rf-largo rf-fab" onClick={onNovo}>
            + Novo cliente
          </button>
        </div>
      )}

      {apagando && (
        <Confirmar
          perigo
          titulo="Apagar este cliente?"
          texto={
            <>
              Você vai apagar <strong>{apagando.form.nome || "este cliente"}</strong> e o resultado dele. Isso não tem volta.
            </>
          }
          confirmar="Sim, apagar"
          cancelar="Não, manter"
          onConfirmar={() => void apagar()}
          onCancelar={() => setApagando(null)}
        />
      )}
    </div>
  );
}
