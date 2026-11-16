"use client";

// Promoção (ex.: Black Friday): preço riscado + preço com desconto em verde, e o card pequeno no canto.
import { useEffect, useState } from "react";
import { brl } from "./session";

type Priced = { price_cents: number | null; promo_price_cents?: number | null };

// Preço a cobrar agora (com desconto, se houver).
export function finalPrice(item: Priced) {
  return item.promo_price_cents ?? item.price_cents;
}

// "R$ 97,00" ou "~~R$ 97,00~~ R$ 47,00" (o desconto em verde, destacado).
export function PriceTag({ item, size = "md" }: { item: Priced; size?: "sm" | "md" | "lg" }) {
  if (item.promo_price_cents && item.price_cents) {
    return (
      <span className={`gp-price gp-price-${size}`}>
        <s aria-label={`de ${brl(item.price_cents)}`}>{brl(item.price_cents)}</s>
        <b aria-label={`por ${brl(item.promo_price_cents)}`}>{brl(item.promo_price_cents)}</b>
      </span>
    );
  }
  if (!item.price_cents) return null;
  return <span className={`gp-price gp-price-${size}`}>{brl(item.price_cents)}</span>;
}

type PromoItem = Priced & { id: string; title: string; cover_url: string | null; color: string; owned: boolean };
export type PromoInfo = { title: string; text: string | null; ends_at: string | null; color: string; card: boolean };

const HIDE_KEY = "gp_promo_card_hidden";

function left(ends: string | null, now: number) {
  if (!ends) return null;
  const ms = new Date(ends).getTime() - now;
  if (ms <= 0) return "";
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const two = (n: number) => String(n).padStart(2, "0");
  return `${d ? `${d}d ` : ""}${two(h)}h ${two(m)}m ${two(sec)}s`;
}

export function PromoCard<T extends PromoItem>({ promo, items, onOpen }: { promo: PromoInfo; items: T[]; onOpen: (item: T) => void }) {
  const list = items.filter((item) => item.promo_price_cents && !item.owned);
  const [hidden, setHidden] = useState(true);
  const [index, setIndex] = useState(0);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let wasHidden = false;
    try {
      wasHidden = sessionStorage.getItem(HIDE_KEY) === "1";
    } catch {
      /* sem armazenamento */
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- lê se o aluno fechou o card nesta visita
    setHidden(wasHidden);
  }, []);

  useEffect(() => {
    if (!promo.ends_at) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [promo.ends_at]);

  useEffect(() => {
    if (list.length < 2) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timer = window.setInterval(() => setIndex((value) => value + 1), reduce ? 9000 : 5000);
    return () => window.clearInterval(timer);
  }, [list.length]);

  const countdown = left(promo.ends_at, now);
  if (hidden || !promo.card || !list.length || countdown === "") return null;
  const item = list[index % list.length];

  return (
    <aside className="gp-promo-card" aria-label={`Promoção: ${promo.title}`}>
      <button
        type="button"
        className="gp-promo-x"
        aria-label="Fechar promoção"
        onClick={() => {
          setHidden(true);
          try {
            sessionStorage.setItem(HIDE_KEY, "1");
          } catch {
            /* sem armazenamento */
          }
        }}
      >
        ×
      </button>
      <div className="gp-promo-head">
        <b>{promo.title}</b>
        {countdown ? <span className="gp-promo-timer" aria-label={`Termina em ${countdown}`}>{countdown}</span> : promo.text ? <span>{promo.text}</span> : null}
      </div>
      <button type="button" className="gp-promo-item" onClick={() => onOpen(item)} aria-label={`${item.title}, ver oferta`}>
        <span
          className="gp-promo-art"
          style={item.cover_url ? { backgroundImage: `url("${item.cover_url}")` } : { background: `linear-gradient(160deg, ${item.color}, #0a0c12)` }}
        />
        <span className="gp-promo-info">
          <span className="gp-promo-name">{item.title}</span>
          <PriceTag item={item} size="sm" />
        </span>
        {list.length > 1 && <span className="gp-promo-dots" aria-hidden="true">{`${(index % list.length) + 1}/${list.length}`}</span>}
      </button>
    </aside>
  );
}

// Texto do contraste do botão: claro em cor escura, escuro em cor clara.
export function onAccent(hex: string) {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex || "");
  if (!match) return "#1b1405";
  const n = parseInt(match[1], 16);
  const lin = (c: number) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  const lum = 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
  return lum > 0.179 ? "#14110a" : "#ffffff";
}
