"use client";

import { CSSProperties, useEffect, useState } from "react";
import { Icon, IconName } from "../icons";

// Checklist de lançamento: progresso salvo no navegador do aluno, sem IA.
const storagePrefix = "painel-inteligente-lancamento";

export type LaunchTarget = "gerador" | "produto" | "criativos" | "copy" | "arquivos" | "calculadora" | "mockup";

type LaunchItem = {
  id: string;
  label: string;
  hint: string;
  action?: { label: string; target: LaunchTarget };
};

const phases: { title: string; icon: IconName; color: string; items: LaunchItem[] }[] = [
  {
    title: "Produto pronto",
    icon: "spark",
    color: "var(--pi-violet)",
    items: [
      { id: "pedido", label: "Criar o produto no painel", hint: "Escolha o nicho, o público e o formato e faça o pedido.", action: { label: "Fazer o pedido", target: "gerador" } },
      { id: "revisar", label: "Revisar o PDF do produto", hint: "Leia do começo ao fim. Se quiser mudar algo, use o arquivo editável que vem no ZIP.", action: { label: "Abrir produto", target: "produto" } },
      { id: "preco", label: "Definir o preço", hint: "Veja quanto sobra por venda depois das taxas e dos anúncios.", action: { label: "Abrir calculadora", target: "calculadora" } },
      { id: "capa", label: "Fazer o mockup da capa", hint: "Imagem 3D do produto para a página de vendas e para os anúncios.", action: { label: "Criar mockup", target: "mockup" } },
    ],
  },
  {
    title: "Página e pagamento",
    icon: "page",
    color: "var(--pi-cyan)",
    items: [
      { id: "plataforma", label: "Cadastrar o produto na plataforma de pagamento", hint: "Nome, preço, arquivo de entrega e e-mail de acesso do comprador." },
      { id: "checkout", label: "Ligar o botão da página ao checkout", hint: "Cole o link do checkout em Produto criado. Todos os botões de compra passam a abrir o pagamento.", action: { label: "Abrir produto", target: "produto" } },
      { id: "pagina", label: "Publicar a página de vendas", hint: "Baixe a página pronta em Produto criado e arraste o arquivo no Netlify Drop para ter o link.", action: { label: "Abrir produto", target: "produto" } },
      { id: "compra-teste", label: "Fazer uma compra de teste", hint: "Confirme que o pagamento passa e que o produto chega no e-mail." },
    ],
  },
  {
    title: "Rastreamento",
    icon: "target",
    color: "var(--pi-amber)",
    items: [
      { id: "pixel", label: "Criar o pixel da Meta", hint: "No Gerenciador de Eventos, um pixel por negócio." },
      { id: "pixel-pagina", label: "Instalar o pixel na página e no checkout", hint: "Cole o ID do pixel em Produto criado (a página já baixa com ele) e coloque o mesmo pixel na plataforma de pagamento.", action: { label: "Abrir produto", target: "produto" } },
      { id: "eventos", label: "Conferir os eventos de compra", hint: "Visualização da página, início de checkout e compra aparecendo no Gerenciador de Eventos." },
    ],
  },
  {
    title: "Anúncios no ar",
    icon: "rocket",
    color: "var(--pi-pink)",
    items: [
      { id: "criativos", label: "Baixar os Criativos prontos", hint: "Imagens e carrossel prontos, sem precisar gravar. Suba pelo menos 3 variações diferentes para testar.", action: { label: "Abrir criativos", target: "criativos" } },
      { id: "campanha", label: "Criar a campanha de vendas", hint: "Objetivo de vendas, otimizando para compra, com orçamento de teste." },
      { id: "publicar", label: "Publicar e não mexer por 3 dias", hint: "O algoritmo precisa de tempo para aprender antes de qualquer mudança." },
    ],
  },
  {
    title: "Primeira semana",
    icon: "trend",
    color: "var(--pi-green)",
    items: [
      { id: "custo", label: "Comparar o custo por venda com o máximo da calculadora", hint: "Abaixo do máximo, está dando lucro.", action: { label: "Abrir calculadora", target: "calculadora" } },
      { id: "pausar", label: "Pausar o criativo que gastou e não vendeu", hint: "Deixe a verba para os que estão vendendo." },
      { id: "escalar", label: "Aumentar a verba do que vende", hint: "Aos poucos, cerca de 20% a cada 2 ou 3 dias." },
    ],
  },
];

const totalItems = phases.reduce((sum, phase) => sum + phase.items.length, 0);

function readDone(key: string): Record<string, boolean> {
  try {
    return JSON.parse(window.localStorage.getItem(key) || "{}");
  } catch {
    return {};
  }
}

export function LaunchChecklist({ userKey, onNavigate }: { userKey: string; onNavigate: (target: LaunchTarget) => void }) {
  const key = `${storagePrefix}:${userKey || "anon"}`;
  const [done, setDone] = useState<Record<string, boolean>>(() => (typeof window === "undefined" ? {} : readDone(key)));

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(done));
    } catch {
      // Sem armazenamento local: o checklist funciona, só não guarda o progresso.
    }
  }, [done, key]);

  const doneCount = phases.reduce((sum, phase) => sum + phase.items.filter((item) => done[item.id]).length, 0);
  const percent = Math.round((doneCount / totalItems) * 100);
  const nextItem = phases.flatMap((phase) => phase.items).find((item) => !done[item.id]);

  return (
    <div className="pi-launch">
      <div className="pi-card pi-launch-progress">
        <div>
          <span>Seu lançamento</span>
          <b>{percent}%</b>
          <p>{doneCount} de {totalItems} etapas concluídas</p>
        </div>
        <div className="pi-bar big">
          <i style={{ width: `${percent}%` }} />
        </div>
        <p className="pi-launch-next">
          {nextItem ? (
            <>
              <em>Próxima etapa:</em> {nextItem.label}
            </>
          ) : (
            <em>Tudo pronto. Agora é acompanhar os números e escalar o que vende.</em>
          )}
        </p>
      </div>

      <div className="pi-launch-phases">
        {phases.map((phase, phaseIndex) => {
          const phaseDone = phase.items.filter((item) => done[item.id]).length;
          return (
            <section className="pi-card pi-launch-phase" key={phase.title} style={{ "--c": phase.color } as CSSProperties}>
              <header>
                <span className="pi-ico"><Icon name={phase.icon} /></span>
                <div>
                  <small>Fase {phaseIndex + 1}</small>
                  <strong>{phase.title}</strong>
                </div>
                <em>{phaseDone}/{phase.items.length}</em>
              </header>
              <ul>
                {phase.items.map((item) => (
                  <li key={item.id} className={done[item.id] ? "done" : ""}>
                    <button
                      type="button"
                      className="pi-launch-check"
                      role="checkbox"
                      aria-checked={Boolean(done[item.id])}
                      onClick={() => setDone({ ...done, [item.id]: !done[item.id] })}
                    >
                      <span>{done[item.id] && <Icon name="check" />}</span>
                      <div>
                        <strong>{item.label}</strong>
                        <small>{item.hint}</small>
                      </div>
                    </button>
                    {item.action && (
                      <button type="button" className="pi-launch-go" onClick={() => onNavigate(item.action!.target)}>
                        {item.action.label}
                        <Icon name="arrow" />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
