"use client";

import { useEffect, useState } from "react";

// Calculadora de lucro e metas: roda só no navegador, sem IA.
const storageKey = "painel-inteligente-calculadora";

type CalcInputs = {
  // Produto em dólar (América Latina): preço e taxas em US$, anúncios e meta em reais.
  currency: "BRL" | "USD";
  rate: string;
  price: string;
  feePercent: string;
  feeFixed: string;
  costPerSale: string;
  goal: string;
};

const defaults: CalcInputs = {
  currency: "BRL",
  rate: "5,50",
  price: "27",
  feePercent: "5",
  feeFixed: "2,50",
  costPerSale: "12",
  goal: "3000",
};

function readInputs(): CalcInputs {
  try {
    return { ...defaults, ...JSON.parse(window.localStorage.getItem(storageKey) || "{}") };
  } catch {
    return defaults;
  }
}

// Aceita "2,50", "9.90", "3.000" e "3000": o último separador com 1 ou 2 casas é o decimal.
function toNumber(value: string) {
  const clean = value.replace(/[^\d.,-]/g, "");
  const last = Math.max(clean.lastIndexOf(","), clean.lastIndexOf("."));
  const decimals = last < 0 ? 0 : clean.length - last - 1;
  const parsed =
    last >= 0 && decimals <= 2
      ? Number(`${clean.slice(0, last).replace(/[.,]/g, "")}.${clean.slice(last + 1)}`)
      : Number(clean.replace(/[.,]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const decimal = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 });

export function ProfitCalculator({ onOpenLaunch }: { onOpenLaunch: () => void }) {
  const [inputs, setInputs] = useState<CalcInputs>(() => (typeof window === "undefined" ? defaults : readInputs()));

  useEffect(() => {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(inputs));
    } catch {
      // Sem armazenamento local: a calculadora funciona do mesmo jeito.
    }
  }, [inputs]);

  const usd = inputs.currency === "USD";
  // Tudo é calculado em reais: no modo dólar, preço e taxa fixa são convertidos pela cotação.
  const rate = usd ? toNumber(inputs.rate) : 1;
  const price = toNumber(inputs.price) * rate;
  const feePercent = toNumber(inputs.feePercent);
  const feeFixed = toNumber(inputs.feeFixed) * rate;
  const costPerSale = toNumber(inputs.costPerSale);
  const goal = toNumber(inputs.goal);

  const net = price - (price * feePercent) / 100 - feeFixed;
  const profit = net - costPerSale;
  const margin = price > 0 ? (profit / price) * 100 : 0;
  const breakevenRoas = net > 0 ? price / net : 0;
  const currentRoas = costPerSale > 0 ? price / costPerSale : 0;
  const salesMonth = profit > 0 ? Math.ceil(goal / profit) : 0;
  const salesDay = salesMonth / 30;
  const adsDay = salesDay * costPerSale;
  const revenueMonth = salesMonth * price;

  const status = net <= 0 ? "bad" : profit <= 0 ? "bad" : margin < 15 ? "warn" : "good";
  const statusText =
    net <= 0
      ? "O preço não cobre as taxas. Aumente o preço do produto."
      : profit <= 0
        ? `Cada venda dá prejuízo. Para empatar, o custo por venda precisa ficar abaixo de ${money.format(net)}.`
        : margin < 15
          ? "Dá lucro, mas a margem está apertada. Um order bump ou um preço um pouco maior ajudam."
          : "Conta saudável: cada venda deixa lucro depois das taxas e dos anúncios.";

  const scenarios = [0.5, 0.75, 1, 1.25, 1.5]
    .map((factor) => Math.round(costPerSale * factor * 100) / 100)
    .filter((value, index, list) => value > 0 && list.indexOf(value) === index);

  function field(key: keyof CalcInputs, label: string, prefix: string, suffix = "", hint = "") {
    return (
      <label className="pi-label pi-calc-field">
        {label}
        <span className="pi-calc-input">
          {prefix && <i>{prefix}</i>}
          <input
            inputMode="decimal"
            value={inputs[key]}
            onChange={(event) => setInputs({ ...inputs, [key]: event.target.value })}
          />
          {suffix && <i>{suffix}</i>}
        </span>
        {hint && <small>{hint}</small>}
      </label>
    );
  }

  return (
    <div className="pi-calc">
      <div className="pi-card pi-calc-form">
        <div className="pi-filter" role="group" aria-label="Moeda do produto">
          <button type="button" className={usd ? "" : "on"} onClick={() => setInputs({ ...inputs, currency: "BRL" })}>
            Produto em reais
          </button>
          <button type="button" className={usd ? "on" : ""} onClick={() => setInputs({ ...inputs, currency: "USD" })}>
            Produto em dólar
          </button>
        </div>
        <p className="pi-step-title"><span>1</span>Seu produto</p>
        <div className="pi-form-grid">
          {field("price", "Preço de venda", usd ? "US$" : "R$")}
          {field("goal", "Meta de lucro por mês", "R$")}
        </div>
        {usd && field("rate", "Cotação do dólar", "R$", "", "Use a cotação do dia. A Cakto mostra o custo da conversão antes de passar o saldo para reais")}
        <p className="pi-step-title"><span>2</span>Taxas e anúncios</p>
        <div className="pi-form-grid">
          {field(
            "feePercent",
            "Taxa da plataforma",
            "",
            "%",
            usd ? "Cakto: Meu Perfil → Planos e Taxas → escolha o país do comprador" : "Confira na sua plataforma de pagamento",
          )}
          {field("feeFixed", "Taxa fixa por venda", usd ? "US$" : "R$")}
        </div>
        {field("costPerSale", "Custo por venda nos anúncios", "R$", "", "Use o valor real do Gerenciador de Anúncios ou uma estimativa")}
        <button type="button" className="pi-btn-text" onClick={() => setInputs(usd ? { ...defaults, currency: "USD", price: "9.90", feePercent: "8", feeFixed: "0.50" } : defaults)}>
          Voltar aos valores de exemplo
        </button>
      </div>

      <div className="pi-calc-out">
        <div className={`pi-calc-status ${status}`}>
          <span className="pi-dot" />
          <p>{statusText}</p>
        </div>

        <div className="pi-calc-kpis">
          <div className="pi-card">
            <span>Você recebe por venda</span>
            <b>{money.format(Math.max(net, 0))}</b>
            <p>depois das taxas</p>
          </div>
          <div className="pi-card">
            <span>Lucro por venda</span>
            <b className={profit > 0 ? "pos" : "neg"}>{money.format(profit)}</b>
            <p>margem de {decimal.format(margin)}%</p>
          </div>
          <div className="pi-card">
            <span>Custo por venda máximo</span>
            <b>{money.format(Math.max(net, 0))}</b>
            <p>acima disso, prejuízo</p>
          </div>
          <div className="pi-card">
            <span>ROAS mínimo</span>
            <b>{breakevenRoas ? decimal.format(breakevenRoas) : "-"}</b>
            <p>{currentRoas ? `o seu hoje: ${decimal.format(currentRoas)}` : "para empatar"}</p>
          </div>
        </div>

        <div className="pi-card pi-calc-goal">
          <p className="pi-card-title">Para lucrar {money.format(goal)} por mês</p>
          {profit > 0 ? (
            <div className="pi-calc-goal-grid">
              <div>
                <b>{salesMonth}</b>
                <span>vendas no mês</span>
              </div>
              <div>
                <b>{decimal.format(Math.ceil(salesDay * 10) / 10)}</b>
                <span>vendas por dia</span>
              </div>
              <div>
                <b>{money.format(adsDay)}</b>
                <span>em anúncios por dia</span>
              </div>
              <div>
                <b>{money.format(revenueMonth)}</b>
                <span>de faturamento no mês</span>
              </div>
            </div>
          ) : (
            <p className="pi-calc-empty">Com o custo por venda atual não há lucro. Baixe o custo por venda ou aumente o preço.</p>
          )}
        </div>

        {scenarios.length > 1 && price > 0 && (
          <div className="pi-card">
            <p className="pi-card-title">E se o custo por venda mudar?</p>
            <div className="pi-calc-table" role="table">
              <div role="row" className="head">
                <span role="columnheader">Custo por venda</span>
                <span role="columnheader">Lucro por venda</span>
                <span role="columnheader">Vendas/dia p/ meta</span>
              </div>
              {scenarios.map((cost) => {
                const rowProfit = net - cost;
                return (
                  <div role="row" key={cost} className={cost === costPerSale ? "on" : ""}>
                    <span role="cell">{money.format(cost)}</span>
                    <span role="cell" className={rowProfit > 0 ? "pos" : "neg"}>{money.format(rowProfit)}</span>
                    <span role="cell">{rowProfit > 0 ? decimal.format(Math.ceil((goal / rowProfit / 30) * 10) / 10) : "sem lucro"}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <button type="button" className="pi-btn-soft pi-calc-next" onClick={onOpenLaunch}>
          Próximo passo: checklist de lançamento
        </button>
      </div>
    </div>
  );
}
