"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { enablePush, isInstalled, platform, refreshPush, registerWorker } from "./app";
import { Bell, InstallGuide, LiveBar, PushInvite, type NoticeItem } from "./Extras";
import { captureRef, captureUtm, loadPixel, readUtm, track } from "./pixel";
import { compactOrigin, tagPlainLink, type UtmMedium } from "@/lib/membros-utm";
import { finalPrice, onAccent, PriceTag, PromoCard, type PromoInfo } from "./Promo";
import Login from "./Login";
import { ReformaApp, type AcessoReforma } from "./reforma/ReformaApp";
import { ChamaApp } from "./chama/ChamaApp";
import { InstalarApp } from "./chama/Instalar";
import { criarArmazemRemoto } from "@/lib/chama-acesa/armazem";
import type { ChamaAcesso } from "@/lib/chama-acesa/acesso-regra";
import { api, areaBase, areaHeaders, areaSlug, AuthError, brl, readSession, writeSession } from "./session";

type Item = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  cover_url: string | null;
  banner_url: string | null;
  trailer_youtube: string | null;
  color: string;
  price_cents: number | null;
  promo_price_cents?: number | null;
  promo_off?: number | null;
  badge: string | null;
  featured: boolean;
  special: string | null;
  sales_page_url: string | null;
  has_checkout: boolean;
  is_free?: boolean;
  via?: UtmMedium;
  via_content?: string;
  owned: boolean;
  lessons_total: number;
  lessons_done: number;
};

type Home = {
  email?: string;
  settings: {
    brand_name: string;
    logo_url: string | null;
    accent: string;
    hero_title: string | null;
    hero_text: string | null;
    support_url: string | null;
    meta_pixel_id?: string | null;
    bg_color?: string | null;
    hero_image_url?: string | null;
    hero_image_mobile_url?: string | null;
    offer_popup?: boolean;
  };
  promo?: PromoInfo | null;
  hero: Item | null;
  products: Item[];
  continueWatching: { product: Item; lesson_id: string; lesson_title: string }[];
  notices?: { items: NoticeItem[]; unread: number };
  live?: NoticeItem | null;
  isAdmin: boolean;
  redirect?: string | null;
  // App da Reforma: só vem preenchido na área dele.
  reforma?: AcessoReforma | null;
  // Chama Acesa: só vem preenchido na área dele.
  chama?: ChamaAcesso | null;
};

type LessonView = {
  id: string;
  title: string;
  description: string | null;
  duration_min: number | null;
  youtube_id: string | null;
  video_url: string | null;
  materials: { titulo: string; url: string }[];
  free_preview: boolean;
  locked: boolean;
  completed: boolean;
};

type ProductView = {
  product: Item & { owned: boolean };
  modules: { id: string; title: string; cover_url?: string | null; open: boolean; release_at: string | null; lessons: LessonView[] }[];
  upsell: (Item & { text: string | null }) | null;
};

const PAINEL_URL = "https://painelinteligente.bagencymidia.site";

// Capa: a imagem como está (sem véu escuro em cima); sem imagem, a cor do produto com o nome escrito.
function art(item: { color: string; cover_url?: string | null }) {
  return item.cover_url ? { backgroundImage: `url("${item.cover_url}")` } : { backgroundColor: item.color || "#2a2a30" };
}

const aulas = (n: number) => `${n} ${n === 1 ? "aula" : "aulas"}`;
const pct = (done: number, total: number) => (total ? Math.round((done / total) * 100) : 0);

// Ícones desenhados (um traço só, 24px). Nada de emoji ou caractere no lugar de ícone.
const ICONS: Record<string, React.ReactNode> = {
  play: <path fill="currentColor" stroke="none" d="M7 4.5v15a1 1 0 0 0 1.5.86l12.5-7.5a1 1 0 0 0 0-1.72L8.5 3.64A1 1 0 0 0 7 4.5z" />,
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 8h.01" />
    </>
  ),
  back: <path d="M15 5l-7 7 7 7" />,
  left: <path d="M15 5l-7 7 7 7" />,
  right: <path d="M9 5l7 7-7 7" />,
  x: <path d="M6 6l12 12M18 6L6 18" />,
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  down: <path d="M12 4v11m0 0l-4.5-4.5M12 15l4.5-4.5M5 20h14" />,
  home: <path d="M4 10.5L12 4l8 6.5V20h-5.5v-6h-5v6H4z" />,
  mine: (
    <>
      <rect x="4" y="4" width="7" height="9" rx="1" />
      <rect x="13" y="4" width="7" height="9" rx="1" />
      <path d="M4 17h16M4 20h10" />
    </>
  ),
  list: <path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01" />,
  bag: <path d="M5 8h14l-1 12H6zM9 8a3 3 0 0 1 6 0" />,
  help: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .8-1 1.5v.7M12 17h.01" />
    </>
  ),
  phone: (
    <>
      <rect x="7" y="3" width="10" height="18" rx="2" />
      <path d="M11 18h2" />
    </>
  ),
  gear: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M5.6 18.4l1.8-1.8M16.6 7.4l1.8-1.8" />
    </>
  ),
  out: <path d="M14 4h5v16h-5M10 8l-4 4 4 4M6 12h10" />,
  bulb: <path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z" />,
};
function Icon({ name, size = 20 }: { name: keyof typeof ICONS; size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {ICONS[name]}
    </svg>
  );
}

function Lock() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" width="14" height="14">
      <path fill="currentColor" d="M17 9V7a5 5 0 0 0-10 0v2H5v13h14V9h-2zM9 7a3 3 0 0 1 6 0v2H9V7z" />
    </svg>
  );
}

// Capa no trilho: a imagem sozinha; o que importa (progresso, preço) fica embaixo, fora da arte.
function Tile({
  item,
  meta,
  progress,
  wide,
  image,
  caption,
  onOpen,
}: {
  item: Item;
  meta: React.ReactNode;
  progress?: number;
  wide?: boolean;
  image?: string | null;
  caption?: string;
  onOpen: () => void;
}) {
  const img = image !== undefined ? image : item.cover_url;
  return (
    <button type="button" className={`gp-tile${item.owned ? "" : " is-locked"}`} onClick={onOpen} aria-label={item.owned ? `Abrir ${item.title}` : `${item.title}, bloqueado. Ver como liberar`}>
      <span className={`gp-tile-img${img ? "" : " gp-noart"}`} style={img ? { backgroundImage: `url("${img}")` } : art(item)}>
        {img ? null : item.title}
        {!item.owned && item.promo_off ? (
          <span className="gp-badge gp-badge-promo">-{item.promo_off}%</span>
        ) : (
          !item.owned && item.badge && <span className="gp-badge">{item.badge}</span>
        )}
        {!item.owned && (
          <span className="gp-lock">
            <Lock />
          </span>
        )}
        {wide && (
          <span className="gp-tile-play">
            <span>
              <Icon name="play" size={18} />
            </span>
          </span>
        )}
        {progress !== undefined && (
          <span className="gp-tile-bar">
            <i style={{ width: `${Math.max(progress, 3)}%` }} />
          </span>
        )}
      </span>
      <span className="gp-tile-meta">
        {caption && <b>{caption}</b>}
        <span>{meta}</span>
      </span>
    </button>
  );
}

function Row({ id, title, wide, children }: { id?: string; title: string; wide?: boolean; children: React.ReactNode }) {
  const rail = useRef<HTMLDivElement>(null);
  const [canSlide, setCanSlide] = useState(false);
  useEffect(() => {
    const el = rail.current;
    if (!el) return;
    const check = () => setCanSlide(el.scrollWidth > el.clientWidth + 4);
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const slide = (dir: 1 | -1) => rail.current?.scrollBy({ left: dir * rail.current.clientWidth * 0.85, behavior: "smooth" });
  return (
    <section className={`gp-row${canSlide ? " can-slide" : ""}`} id={id} aria-label={title}>
      <div className="gp-row-head">
        <h2>{title}</h2>
        <div className="gp-row-arrows">
          <button type="button" onClick={() => slide(-1)} aria-label={`${title}: voltar`}>
            <Icon name="left" size={18} />
          </button>
          <button type="button" onClick={() => slide(1)} aria-label={`${title}: mais`}>
            <Icon name="right" size={18} />
          </button>
        </div>
      </div>
      <div className={`gp-rail${wide ? " is-wide" : ""}`} ref={rail}>
        {children}
      </div>
    </section>
  );
}

// Menu da conta (avatar): e-mail, instalar app, suporte, configurar e sair.
function AccountMenu({ email, children }: { email?: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent ? event.key === "Escape" : !box.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);
  return (
    // Qualquer toque dentro (item ou avatar) fecha o menu aberto; o avatar abre de novo quando estava fechado.
    <div className="gp-menu-wrap" ref={box} onClickCapture={() => open && setOpen(false)}>
      <button type="button" className="gp-icon-btn" aria-expanded={open} aria-label="Sua conta" onClick={() => !open && setOpen(true)}>
        <span className="gp-avatar">{(email || "?").slice(0, 1)}</span>
      </button>
      {open && (
        <div className="gp-menu">
          {email && <p>{email}</p>}
          {children}
        </div>
      )}
    </div>
  );
}

type PublicArea = { slug: string; main: boolean; brand_name: string; logo_url: string | null; accent: string; bg_color: string | null; meta_pixel_id: string | null; has_free?: boolean };

export default function MembrosPage() {
  const [ready, setReady] = useState(false);
  // Nome, logo, cores e pixel da área do endereço (antes mesmo do login).
  const [area, setArea] = useState<PublicArea | null>(null);
  const [areaMissing, setAreaMissing] = useState(false);
  const [logged, setLogged] = useState(false);
  const [link, setLink] = useState<{ token: string; refresh?: string } | null>(null);
  const [home, setHome] = useState<Home | null>(null);
  const [error, setError] = useState("");
  const [slug, setSlug] = useState<string | null>(null);
  const [lessonId, setLessonId] = useState<string | null>(null);
  const [reformaAberto, setReformaAberto] = useState(false);
  const [chamaAberto, setChamaAberto] = useState(false);
  const [locked, setLocked] = useState<Item | null>(null);
  const [promoOpen, setPromoOpen] = useState(false);
  const [offerOpen, setOfferOpen] = useState(false);
  const [trailer, setTrailer] = useState<string | null>(null);
  const [signupStart, setSignupStart] = useState(false);
  const [installOpen, setInstallOpen] = useState(false);
  const [showInstallLink, setShowInstallLink] = useState(false);
  // Topo transparente sobre o destaque; fica sólido quando a página rola.
  const [solid, setSolid] = useState(false);
  const [tab, setTab] = useState<"inicio" | "meus" | "loja">("inicio");
  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Volta do checkout com ?transactionkey= (ver efeito abaixo).
  const [buy, setBuy] = useState<{ key: string; status: "waiting" | "email"; email?: string } | null>(null);

  const loadHome = useCallback(async () => {
    try {
      const data = await api<Home>("/api/membros/inicio");
      // Comprador só de uma área própria (ex.: Reforma) entrou pelo endereço principal: vai para a área dele.
      if (data.redirect) {
        window.location.replace(data.redirect);
        return null;
      }
      setHome(data);
      setError("");
      return data;
    } catch (err) {
      if (err instanceof AuthError) setLogged(false);
      else setError(err instanceof Error ? err.message : "Erro ao carregar.");
      return null;
    }
  }, []);

  // Lê a rota (?p=produto&aula=id) e o token de convite/recuperação que o Supabase coloca no #.
  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.slice(1));
    let token = hash.get("access_token");
    const kind = hash.get("type") || "";
    if (token && kind === "magiclink") {
      // Link do e-mail de acesso (cadastro grátis): entra direto, a senha já existe.
      writeSession({ accessToken: token, refreshToken: hash.get("refresh_token") || undefined });
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
      token = null;
    } else if (token && ["invite", "recovery", "signup"].includes(kind)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- lê o link de convite que o Supabase coloca no #
      setLink({ token, refresh: hash.get("refresh_token") || undefined });
    }
    const query = new URLSearchParams(window.location.search);
    const buyKey = query.get("transactionkey") || "";
    if (/^[a-f0-9]{32}$/i.test(buyKey)) setBuy({ key: buyKey, status: "waiting" });
    setSignupStart(/\/gratis\/?$/.test(window.location.pathname) || query.has("cadastro"));
    setShowInstallLink(platform() !== "desktop" && !isInstalled());
    void registerWorker();
    captureUtm();
    captureRef();
    const slug = areaSlug();
    // App instalado de cada área abre na área certa.
    if (slug) document.querySelector('link[rel="manifest"]')?.setAttribute("href", `/api/membros/manifest?area=${encodeURIComponent(slug)}`);
    void fetch("/api/membros/area", { headers: areaHeaders() })
      .then(async (response) => {
        if (response.status === 404) {
          setAreaMissing(true);
          return;
        }
        if (!response.ok) return;
        const info = (await response.json()) as PublicArea;
        setArea(info);
        loadPixel(info.meta_pixel_id);
        if (!info.main) document.title = info.brand_name;
      })
      .catch(() => undefined);
    const readRoute = () => {
      const params = new URLSearchParams(window.location.search);
      setSlug(params.get("p"));
      setLessonId(params.get("aula"));
      setReformaAberto(params.get("reforma") === "1");
      setChamaAberto(params.get("chama") === "1");
    };
    readRoute();
    window.addEventListener("popstate", readRoute);
    setLogged(Boolean(readSession()) && !token);
    setReady(true);
    return () => window.removeEventListener("popstate", readRoute);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- busca os dados do servidor
    if (logged) void loadHome();
  }, [logged, loadHome]);

  // Volta do checkout da Eduzz (?transactionkey=): espera o webhook e entra sozinho, sem pedir e-mail e senha.
  useEffect(() => {
    if (!buy || buy.status !== "waiting") return;
    const clearKey = () => {
      const url = new URL(window.location.href);
      url.searchParams.delete("transactionkey");
      window.history.replaceState(null, "", url.pathname + url.search + url.hash);
    };
    let stop = false;
    let tries = 0;
    let timer = 0;
    const tick = async () => {
      if (stop) return;
      tries += 1;
      try {
        const response = await fetch("/api/membros/entrar-compra", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...areaHeaders() },
          body: JSON.stringify({ key: buy.key }),
        });
        const data = (await response.json().catch(() => ({}))) as { status?: string; email?: string; accessToken?: string; refreshToken?: string };
        if (stop) return;
        if (data.status === "ok" && data.accessToken) {
          writeSession({ accessToken: data.accessToken, refreshToken: data.refreshToken });
          clearKey();
          setBuy(null);
          setLogged(true);
          void loadHome();
          return;
        }
        if (data.status === "email") {
          clearKey();
          setBuy({ key: buy.key, status: "email", email: data.email });
          return;
        }
        if (data.status === "expired" || response.status === 400 || response.status === 404) {
          clearKey();
          setBuy(null);
          return;
        }
      } catch {
        /* sem internet: tenta de novo */
      }
      if (tries >= 75) {
        clearKey();
        setBuy(null);
        return;
      }
      timer = window.setTimeout(tick, 2000);
    };
    timer = window.setTimeout(tick, 0);
    return () => {
      stop = true;
      window.clearTimeout(timer);
    };
  }, [buy, loadHome]);

  // Recém-comprado: a plataforma redireciona antes de o webhook chegar (Eduzz leva ~30 s).
  // Sem nenhum produto liberado, procura de novo a cada 5 s por 2 min antes de dizer que não achou.
  const [searchDone, setSearchDone] = useState(false);
  const nothingYet = Boolean(home) && !home?.products.some((item) => item.owned);
  useEffect(() => {
    if (!logged || !nothingYet) return;
    let tries = 0;
    const timer = window.setInterval(() => {
      tries += 1;
      if (tries > 24) {
        window.clearInterval(timer);
        setSearchDone(true);
        return;
      }
      void loadHome();
    }, 5000);
    return () => window.clearInterval(timer);
  }, [logged, nothingYet, loadHome]);

  // App da Reforma instalado (start_url com ?app=1): abre direto no app para quem tem acesso.
  const temReforma = Boolean(home?.reforma?.app);
  useEffect(() => {
    if (!temReforma) return;
    const query = new URLSearchParams(window.location.search);
    if (query.get("app") === "1" && !query.get("p") && !query.get("reforma")) {
      window.history.replaceState(null, "", `${window.location.pathname}?reforma=1`);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- lê o endereço de abertura do app instalado
      setReformaAberto(true);
    }
  }, [temReforma]);

  // Chama Acesa instalado (start_url com ?app=1) ou entrada normal na área dele: abre direto no app.
  const temChama = Boolean(home?.chama?.app);
  useEffect(() => {
    chamaRef.current = temChama;
  }, [temChama]);
  useEffect(() => {
    if (!temChama) return;
    // Na área do Chama não há aulas: os produtos (grátis e pago) são só o acesso ao app. Qualquer ?p= (cadastro grátis,
    // atalho salvo no iPhone com a URL do produto) abre o app, nunca a tela vazia "Nenhuma aula disponível".
    const query = new URLSearchParams(window.location.search);
    if (query.get("chama") !== "0" && !query.get("aula")) {
      window.history.replaceState(null, "", `${window.location.pathname}?chama=1`);
      /* eslint-disable react-hooks/set-state-in-effect -- lê o endereço de abertura do app instalado */
      setSlug(null);
      setChamaAberto(true);
      /* eslint-enable react-hooks/set-state-in-effect */
    }
  }, [temChama]);
  const armazemChama = useMemo(() => criarArmazemRemoto((path, init) => api(path, init)), []);

  // Celular que já ligou os avisos: mantém a inscrição em dia.
  useEffect(() => {
    if (!logged) return;
    void fetch("/api/membros/avisos", { headers: { Authorization: `Bearer ${readSession()?.accessToken || ""}`, ...areaHeaders() } })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => data?.vapid && refreshPush(data.vapid))
      .catch(() => undefined);
  }, [logged]);

  // Na área do Chama Acesa não há aulas: "Início" e o card do produto voltam para o app, nunca para a tela vazia.
  const chamaRef = useRef(false);
  const go = useCallback((nextSlug: string | null, nextLesson?: string | null) => {
    if (chamaRef.current && !nextLesson) {
      window.history.pushState(null, "", `${window.location.pathname}?chama=1`);
      setReformaAberto(false);
      setSlug(null);
      setLessonId(null);
      setChamaAberto(true);
      window.scrollTo({ top: 0 });
      return;
    }
    const params = new URLSearchParams();
    if (nextSlug) params.set("p", nextSlug);
    if (nextLesson) params.set("aula", nextLesson);
    const query = params.toString();
    window.history.pushState(null, "", query ? `?${query}` : window.location.pathname);
    setReformaAberto(false);
    setChamaAberto(false);
    setSlug(nextSlug);
    setLessonId(nextLesson || null);
    setTab("inicio");
    window.scrollTo({ top: 0 });
  }, []);

  const open = useCallback(
    (item: Item) => {
      if (item.owned) go(item.slug);
      else {
        setLocked(item);
        track("ViewContent", {
          content_name: item.title,
          content_ids: [item.slug],
          content_type: "product",
          currency: "BRL",
          value: finalPrice(item) ? (finalPrice(item) || 0) / 100 : 0,
        });
        void api("/api/membros/evento", { body: { produto: item.id, tipo: "cadeado_aberto" } }).catch(() => undefined);
      }
    },
    [go],
  );

  // App instalado no celular volta do fundo com a versão antiga: se saiu versão nova, recarrega (fora de aula aberta).
  useEffect(() => {
    const check = async () => {
      if (document.visibilityState !== "visible" || lessonId) return;
      try {
        const html = await (await fetch(window.location.href, { cache: "no-store" })).text();
        const fresh = [...html.matchAll(/\/_next\/static\/css\/[\w-]+\.css/g)].map((match) => match[0]);
        const current = [...document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]')].map((link) => new URL(link.href).pathname);
        if (fresh.length && fresh.some((href) => !current.includes(href))) window.location.reload();
      } catch {
        /* sem internet: segue na versão aberta */
      }
    };
    document.addEventListener("visibilitychange", check);
    return () => document.removeEventListener("visibilitychange", check);
  }, [lessonId]);

  // Promoção no ar: o pop-up da oferta abre sozinho ao entrar na área (uma vez por visita).
  const hasPromoItems = Boolean(home?.promo && home.products.some((product) => product.promo_price_cents && !product.owned));
  useEffect(() => {
    if (!hasPromoItems || slug) return;
    try {
      if (sessionStorage.getItem("gp_promo_popup") === "1") return;
    } catch {
      /* sem armazenamento: abre mesmo assim */
    }
    const timer = window.setTimeout(() => {
      try {
        sessionStorage.setItem("gp_promo_popup", "1");
      } catch {
        /* sem armazenamento */
      }
      setPromoOpen(true);
    }, 900);
    return () => window.clearTimeout(timer);
  }, [hasPromoItems, slug]);

  // Pop-up de ofertas (preço normal): quem ainda não comprou vê os produtos pagos da área, 1 vez por visita.
  // A promoção com desconto tem prioridade (nunca abrem dois pop-ups).
  const offerCount = home?.products.filter(isOffer).length || 0;
  const offerPopup = Boolean(home?.settings.offer_popup) && offerCount > 0 && !hasPromoItems;
  useEffect(() => {
    if (!offerPopup || slug) return;
    const key = `gp_offer_popup_${areaSlug() || "main"}`;
    try {
      if (sessionStorage.getItem(key) === "1") return;
    } catch {
      /* sem armazenamento: abre mesmo assim */
    }
    const timer = window.setTimeout(() => {
      try {
        sessionStorage.setItem(key, "1");
      } catch {
        /* sem armazenamento */
      }
      setOfferOpen(true);
    }, 900);
    return () => window.clearTimeout(timer);
  }, [offerPopup, slug]);

  if (!ready) return <div className="gp" />;

  if (areaMissing) {
    return (
      <div className="gp">
        <div className="gp-wrap gp-center">
          <p className="gp-muted">Esta área não existe. Confira o endereço que você recebeu.</p>
        </div>
      </div>
    );
  }

  const loginTheme = area
    ? ({
        "--gp-accent": area.accent || "#f2b441",
        "--gp-on-accent": onAccent(area.accent || "#f2b441"),
        ...(area.bg_color ? { "--gp-bg": area.bg_color } : {}),
      } as React.CSSProperties)
    : undefined;

  if (buy) {
    return (
      <div className="gp" style={loginTheme}>
        <div className="gp-wrap gp-center">
          {buy.status === "waiting" ? (
            <>
              <h2>Pagamento aprovado!</h2>
              <p className="gp-muted">Liberando o seu acesso… leva poucos segundos. Não feche esta página.</p>
            </>
          ) : (
            <>
              <h2>Seu acesso está no seu e-mail</h2>
              <p className="gp-muted">
                Enviamos para <strong>{buy.email}</strong>. Abra o e-mail e toque em &quot;Entrar na área&quot;. Se não achar, olhe no spam ou em Promoções.
              </p>
              <button
                type="button"
                className="gp-btn gp-btn-gold"
                onClick={() => {
                  writeSession(null);
                  setBuy(null);
                  setLogged(false);
                }}
              >
                Entrar com e-mail e senha
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  if (!logged || link) {
    return (
      <div className="gp" style={loginTheme}>
        <Login
          key={area ? "area" : "carregando"}
          canSignup={Boolean(area?.has_free)}
          brand={home?.settings.brand_name || area?.brand_name || (areaSlug() ? "" : "Gênio Play")}
          logo={area?.logo_url || null}
          linkToken={link?.token}
          linkRefresh={link?.refresh}
          startSignup={signupStart}
          onDone={async (info) => {
            setLink(null);
            setLogged(true);
            // Cadastro grátis: vai direto para a primeira aula gratuita.
            if (info?.signup) {
              const data = await loadHome();
              // Chama Acesa: o cadastro grátis abre o app (o efeito do temChama cuida disso), não o produto vazio.
              if (data?.chama?.app) return;
              const free = data?.products.find((product) => product.is_free);
              if (free) go(free.slug);
            }
          }}
        />
        {/* Chama Acesa: a instrução de instalar fica dentro do app (Instalar.tsx), não a da "área de membros". */}
        {areaSlug() !== "chama-acesa" && <InstallGuide />}
      </div>
    );
  }

  if (!home) {
    return (
      <div className="gp">
        <div className="gp-wrap gp-center">{error ? <p className="gp-error">{error}</p> : <p className="gp-muted">Carregando sua área…</p>}</div>
      </div>
    );
  }

  const freeItems = home.products.filter((item) => item.is_free);
  const owned = home.products.filter((item) => item.owned && !item.is_free);
  const store = home.products.filter((item) => !item.owned);
  const notices = home.notices || { items: [], unread: 0 };

  const promo = home.promo || null;
  const openNotice = (notice: NoticeItem) => {
    const item = home.products.find((product) => product.id === notice.product_id);
    if (notice.url) {
      // Aviso com link: UTM da área (membros / aviso / produto ou tipo / id do aviso) sem apagar o que o link já tiver.
      window.open(
        tagPlainLink(notice.url, { medium: "aviso", campaign: item?.slug || notice.kind || "geral", content: notice.id, term: compactOrigin(readUtm()) || undefined }),
        "_blank",
        "noopener",
      );
      return;
    }
    if (item) {
      if (item.owned) go(item.slug);
      else open({ ...item, via: "cadeado", via_content: "aviso-sino" });
      return;
    }
    // Aviso geral da promoção: abre o pop-up da oferta com o botão de compra.
    if (notice.kind?.startsWith("promo") && promo && home.products.some((product) => product.promo_price_cents && !product.owned)) {
      setPromoOpen(true);
      return;
    }
    // Aviso de ofertas: abre o pop-up com os produtos que o aluno ainda não tem.
    if (notice.kind === "ofertas" && home.products.some(isOffer)) {
      setOfferOpen(true);
      return;
    }
    go(null);
    window.setTimeout(() => document.getElementById("gp-loja")?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
  };
  const hero = home.hero;
  // Próxima aula do produto em destaque (vem do "continuar assistindo").
  const heroNext = hero ? home.continueWatching.find((entry) => entry.product.id === hero.id) || null : null;
  const signOut = () => {
    writeSession(null);
    setHome(null);
    setLogged(false);
  };
  // Abas do celular / menu do topo: volta ao início se preciso e rola até o trilho.
  const toSection = (id: string) => {
    setTab(id === "gp-loja" ? "loja" : "meus");
    if (slug || reformaAberto || chamaAberto) go(null);
    window.setTimeout(() => {
      const el = document.getElementById(id);
      if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 72, behavior: "smooth" });
    }, slug ? 120 : 0);
  };
  // Capa da tela inicial: a configurada em Aparência (computador 16:9, celular 4:5) ou o banner do produto em destaque.
  const heroDesk = home.settings.hero_image_url || hero?.banner_url || null;
  // Celular: capa vertical (a de Aparência 4:5 ou a capa 2:3 do produto, que já traz o nome escrito).
  const heroPoster = home.settings.hero_image_mobile_url || hero?.cover_url || heroDesk;
  const theme = {
    "--gp-accent": home.settings.accent || "#f2b441",
    "--gp-on-accent": onAccent(home.settings.accent || "#f2b441"),
    ...(home.settings.bg_color ? { "--gp-bg": home.settings.bg_color } : {}),
    ...(promo?.color ? { "--gp-promo": promo.color } : {}),
  } as React.CSSProperties;

  return (
    <div className="gp" style={theme}>
      <div className={`gp-top-bar${solid || slug || reformaAberto || chamaAberto ? " is-solid" : ""}`}>
        <header className="gp-top gp-wrap">
          <button type="button" className="gp-logo" onClick={() => go(null)} aria-label={`${home.settings.brand_name}: início`}>
            {/* eslint-disable-next-line @next/next/no-img-element -- logo externo configurável */}
            {home.settings.logo_url ? <img src={home.settings.logo_url} alt="" /> : null}
            {home.settings.brand_name}
          </button>
          <nav className="gp-nav" aria-label="Seções">
            <button type="button" className={!slug && !reformaAberto && !chamaAberto ? "is-on" : undefined} onClick={() => go(null)}>
              Início
            </button>
            {(owned.length > 0 || freeItems.length > 0) && (
              <button type="button" onClick={() => toSection("gp-meus")}>
                Meus produtos
              </button>
            )}
            {store.length > 0 && (
              <button type="button" onClick={() => toSection("gp-loja")}>
                Loja
              </button>
            )}
            {owned.some((item) => item.special === "painel") && (
              <a href={tagPlainLink(PAINEL_URL, { medium: "link", content: "painel-inteligente" })} target="_blank" rel="noreferrer">
                Painel Inteligente
              </a>
            )}
          </nav>
          <div className="gp-tools">
            <Bell
              items={notices.items}
              unread={notices.unread}
              onOpenItem={openNotice}
              onSeen={() => setHome({ ...home, notices: { ...notices, unread: 0 } })}
              onInstall={() => setInstallOpen(true)}
            />
            <AccountMenu email={home.email}>
              {owned.some((item) => item.special === "painel") && (
                <a href={tagPlainLink(PAINEL_URL, { medium: "link", content: "painel-inteligente" })} target="_blank" rel="noreferrer">
                  <Icon name="bulb" /> Painel Inteligente
                </a>
              )}
              {showInstallLink && (
                <button type="button" onClick={() => setInstallOpen(true)}>
                  <Icon name="phone" /> Instalar o app no celular
                </button>
              )}
              {home.settings.support_url && (
                <a href={tagPlainLink(home.settings.support_url, { medium: "link", content: "suporte" })} target="_blank" rel="noreferrer">
                  <Icon name="help" /> Suporte
                </a>
              )}
              {home.isAdmin && (
                <a href={`${areaBase()}/admin`}>
                  <Icon name="gear" /> Configurar a área
                </a>
              )}
              <button type="button" onClick={signOut}>
                <Icon name="out" /> Sair
              </button>
            </AccountMenu>
          </div>
        </header>
      </div>

      {home.live && (
        <div className="gp-wrap">
          <LiveBar live={home.live} />
        </div>
      )}

      {chamaAberto && home.chama?.app && !slug ? (
        <main className="gp-wrap">
          <ChamaApp
            armazem={armazemChama}
            marca={home.settings.brand_name}
            email={home.email}
            lerUtm={readUtm}
            onAreaMembros={() => go(null)}
            onSair={signOut}
            onAtivarPush={async () => {
              const { vapid } = await api<{ vapid: string }>("/api/membros/avisos");
              await enablePush(vapid);
            }}
          />
        </main>
      ) : reformaAberto && home.reforma?.app && !slug ? (
        <main className="gp-wrap">
          <ReformaApp
            acesso={home.reforma}
            chaveLocal={home.email || "local"}
            chamar={(path, init) => api(path, init)}
            marca={home.settings.brand_name}
            onAbrirProduto={(produto) => go(produto)}
            onAreaMembros={() => go(null)}
          />
        </main>
      ) : slug ? (
        <ProductScreen
          slug={slug}
          lessonId={lessonId}
          onLesson={(id) => go(slug, id)}
          onBack={() => go(null)}
          onLocked={(item) => open(item)}
          onProgress={() => void loadHome()}
        />
      ) : (
        <main>
          {hero && (
            <section className={`gp-bb${heroPoster && !home.settings.hero_image_mobile_url ? " has-poster-art" : ""}`} aria-label="Destaque">
              <span className="gp-bb-art" style={heroDesk ? { backgroundImage: `url("${heroDesk}")` } : art(hero)} aria-hidden="true" />
              <span
                className={`gp-bb-poster${home.settings.hero_image_mobile_url ? " is-wide" : ""}`}
                style={heroPoster ? { backgroundImage: `url("${heroPoster}")` } : art(hero)}
                aria-hidden="true"
              />
              <div className="gp-bb-in gp-wrap">
                <h1>{home.settings.hero_title || hero.title}</h1>
                {(home.settings.hero_text || hero.subtitle || hero.description) && <p className="gp-bb-text">{home.settings.hero_text || hero.subtitle || hero.description}</p>}
                {hero.owned && hero.lessons_total > 0 && (
                  <div className="gp-bb-next">
                    <span>
                      {heroNext ? (
                        <>
                          <b>Continuar:</b> {heroNext.lesson_title}
                        </>
                      ) : hero.lessons_done ? (
                        `${hero.lessons_done} de ${aulas(hero.lessons_total)} concluídas`
                      ) : (
                        <>
                          <b>Comece pela aula 1</b> · {aulas(hero.lessons_total)}
                        </>
                      )}
                    </span>
                    {hero.lessons_done > 0 && (
                      <span className="gp-meter" role="img" aria-label={`${pct(hero.lessons_done, hero.lessons_total)}% concluído`}>
                        <i style={{ width: `${pct(hero.lessons_done, hero.lessons_total)}%` }} />
                      </span>
                    )}
                  </div>
                )}
                {!hero.owned && hero.promo_price_cents ? (
                  <div className="gp-promo-line">
                    {promo && <span className="gp-promo-pill">{promo.title}</span>}
                    <PriceTag item={hero} size="lg" />
                  </div>
                ) : null}
                <div className="gp-btns">
                  {hero.owned ? (
                    <button type="button" className="gp-btn gp-btn-light" onClick={() => go(hero.slug, heroNext?.lesson_id)}>
                      <Icon name="play" size={22} /> {hero.lessons_done ? "Continuar" : "Assistir"}
                    </button>
                  ) : (
                    <button type="button" className="gp-btn gp-btn-gold" onClick={() => open(hero)}>
                      Desbloquear {hero.price_cents ? `por ${brl(finalPrice(hero))}` : ""}
                    </button>
                  )}
                  {hero.trailer_youtube ? (
                    <button type="button" className="gp-btn gp-btn-ghost" onClick={() => setTrailer(hero.trailer_youtube)}>
                      <Icon name="play" size={18} /> Trailer
                    </button>
                  ) : hero.owned ? (
                    <button type="button" className="gp-btn gp-btn-ghost" onClick={() => go(hero.slug)}>
                      <Icon name="list" /> Aulas
                    </button>
                  ) : null}
                </div>
              </div>
            </section>
          )}

          <div className="gp-wrap gp-rows">
            {home.reforma?.app && (
              <button
                type="button"
                className="gp-invite"
                style={{ width: "100%", textAlign: "left", cursor: "pointer" }}
                onClick={() => {
                  window.history.pushState(null, "", "?reforma=1");
                  setReformaAberto(true);
                  window.scrollTo({ top: 0 });
                }}
              >
                <div>
                  <b>App da Reforma</b>
                  <span className="gp-muted">Simule o imposto dos seus clientes e gere o PDF com a sua logo.</span>
                </div>
                <span className="gp-btn gp-btn-gold">Abrir o app</span>
              </button>
            )}
            <PushInvite onInstall={() => setInstallOpen(true)} />
            {home.continueWatching.length > 0 && (
              <Row title="Continuar assistindo" wide>
                {home.continueWatching.map((entry) => (
                  <Tile
                    key={entry.product.id}
                    item={entry.product}
                    wide
                    image={entry.product.banner_url || entry.product.cover_url}
                    caption={entry.lesson_title}
                    meta={entry.product.title}
                    progress={pct(entry.product.lessons_done, entry.product.lessons_total)}
                    onOpen={() => go(entry.product.slug, entry.lesson_id)}
                  />
                ))}
              </Row>
            )}

            {freeItems.length > 0 && (
              <Row id={owned.length ? undefined : "gp-meus"} title="Grátis para você">
                {freeItems.map((item) => (
                  <Tile
                    key={item.id}
                    item={item}
                    meta={<span className="gp-own">{item.lessons_done ? `${item.lessons_done} de ${aulas(item.lessons_total)}` : "Grátis"}</span>}
                    progress={item.lessons_total && item.lessons_done ? pct(item.lessons_done, item.lessons_total) : undefined}
                    onOpen={() => open(item)}
                  />
                ))}
              </Row>
            )}

            {owned.length > 0 && (
              <Row id="gp-meus" title="Meus produtos">
                {owned.map((item) => (
                  <Tile
                    key={item.id}
                    item={item}
                    meta={!item.lessons_total ? "Liberado" : item.lessons_done >= item.lessons_total ? "Concluído" : item.lessons_done ? `${item.lessons_done} de ${aulas(item.lessons_total)}` : aulas(item.lessons_total)}
                    progress={item.lessons_total && item.lessons_done ? pct(item.lessons_done, item.lessons_total) : undefined}
                    onOpen={() => open(item)}
                  />
                ))}
              </Row>
            )}

            {store.length > 0 && (
              <Row id="gp-loja" title={owned.length ? "Para liberar" : "Produtos"}>
                {store.map((item) => (
                  <Tile key={item.id} item={item} meta={item.price_cents ? <PriceTag item={item} size="sm" /> : "Ver detalhes"} onOpen={() => open(item)} />
                ))}
              </Row>
            )}

            {owned.length === 0 && freeItems.length === 0 && (
              <p className="gp-muted gp-empty">
                {searchDone
                  ? "Ainda não encontramos compras neste e-mail. Se você comprou com outro e-mail, saia e entre com ele, ou fale com o suporte."
                  : "Procurando a sua compra… Se você acabou de pagar, ela aparece aqui em até 1 minuto. Não precisa fazer nada, esta página atualiza sozinha."}
                {home.email && (
                  <>
                    {" "}
                    Você entrou como <strong>{home.email}</strong>.
                  </>
                )}
              </p>
            )}
          </div>
        </main>
      )}

      {!(chamaAberto && home.chama?.app) && !(reformaAberto && home.reforma?.app) && (
        <nav className="gp-tabbar" aria-label="Navegação">
          <button type="button" className={!slug && tab === "inicio" ? "is-on" : undefined} onClick={() => go(null)}>
            <Icon name="home" size={22} /> Início
          </button>
          {(owned.length > 0 || freeItems.length > 0) && (
            <button type="button" className={!slug && tab === "meus" ? "is-on" : undefined} onClick={() => toSection("gp-meus")}>
              <Icon name="mine" size={22} /> Meus
            </button>
          )}
          {store.length > 0 && (
            <button type="button" className={!slug && tab === "loja" ? "is-on" : undefined} onClick={() => toSection("gp-loja")}>
              <Icon name="bag" size={22} /> Loja
            </button>
          )}
          {home.settings.support_url && (
            <a href={tagPlainLink(home.settings.support_url, { medium: "link", content: "suporte" })} target="_blank" rel="noreferrer">
              <Icon name="help" size={22} /> Ajuda
            </a>
          )}
        </nav>
      )}

      {locked && (
        <LockedSheet
          item={locked}
          onClose={() => setLocked(null)}
          onRefresh={loadHome}
          onWatch={(item) => {
            setLocked(null);
            go(item.slug);
          }}
        />
      )}

      {promo && promoOpen && (
        <PromoSheet
          promo={promo}
          items={home.products.filter((product) => product.promo_price_cents && !product.owned)}
          onClose={() => setPromoOpen(false)}
          onRefresh={loadHome}
          onWatch={(item) => {
            setPromoOpen(false);
            go(item.slug);
          }}
        />
      )}

      {promo && !slug && !locked && !promoOpen && <PromoCard promo={promo} items={home.products} onOpen={(item) => open({ ...item, via: "promo", via_content: "card-promo" })} />}

      {offerOpen && (
        <OfferSheet
          items={home.products.filter(isOffer)}
          onClose={() => setOfferOpen(false)}
          onRefresh={loadHome}
          onWatch={(item) => {
            setOfferOpen(false);
            go(item.slug);
          }}
        />
      )}

      {home.chama?.app && installOpen && (
        // Chama Acesa: o botão "Instalar app" do topo abre o passo a passo do próprio Chama (o genérico fala em Gênio Play).
        <div className="gp-modal" role="dialog" aria-modal="true" aria-label="Instalar o Chama Acesa">
          <button type="button" className="gp-backdrop" aria-label="Fechar" onClick={() => setInstallOpen(false)} />
          <div className="ch ch-modal-instalar">
            <InstalarApp forcar="auto" onFechar={() => setInstallOpen(false)} />
          </div>
        </div>
      )}
      {!promoOpen && !offerOpen && !home.chama?.app && <InstallGuide key={installOpen ? "aberto" : "auto"} forceOpen={installOpen} onClose={() => setInstallOpen(false)} />}

      {trailer && (
        <div className="gp-modal" role="dialog" aria-modal="true" aria-label="Trailer">
          <button type="button" className="gp-backdrop" aria-label="Fechar trailer" onClick={() => setTrailer(null)} />
          <div className="gp-video gp-video-modal">
            <iframe src={`https://www.youtube-nocookie.com/embed/${trailer}?autoplay=1&rel=0`} title="Trailer" allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen />
          </div>
        </div>
      )}
    </div>
  );
}

// Compra: abre o pagamento em outra aba e espera a liberação aqui mesmo.
function useCheckout(item: Item, onRefresh: () => Promise<Home | null>, via?: UtmMedium, content?: string) {
  const [state, setState] = useState<"idle" | "opening" | "waiting" | "released">("idle");
  const [error, setError] = useState("");
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearInterval(timer.current);
    },
    [],
  );

  async function buy() {
    setError("");
    setState("opening");
    // Abre a aba já no clique (o navegador bloqueia abas abertas depois de esperar a resposta).
    const tab = window.open("about:blank", "_blank");
    try {
      track("InitiateCheckout", {
        content_name: item.title,
        content_ids: [item.slug],
        content_type: "product",
        currency: "BRL",
        value: finalPrice(item) ? (finalPrice(item) || 0) / 100 : 0,
      });
      const data = await api<{ url: string }>("/api/membros/checkout", { body: { produto: item.id, via: via || item.via || "cadeado", content: content || item.via_content, utm: readUtm() } });
      if (tab) tab.location.href = data.url;
      else window.location.href = data.url;
      setState("waiting");
      let tries = 0;
      timer.current = setInterval(async () => {
        tries += 1;
        const home = await onRefresh();
        if (home?.products.find((product) => product.id === item.id)?.owned) {
          if (timer.current) clearInterval(timer.current);
          setState("released");
        }
        if (tries > 150 && timer.current) clearInterval(timer.current);
      }, 6000);
    } catch (err) {
      tab?.close();
      setState("idle");
      setError(err instanceof Error ? err.message : "Não foi possível abrir o pagamento.");
    }
  }

  return { state, error, buy };
}

// Pop-up da promoção (abre pelo aviso do sino): produtos em oferta com o botão de compra.
function PromoSheet({
  promo,
  items,
  onClose,
  onRefresh,
  onWatch,
}: {
  promo: PromoInfo;
  items: Item[];
  onClose: () => void;
  onRefresh: () => Promise<Home | null>;
  onWatch: (item: Item) => void;
}) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="gp-modal" role="dialog" aria-modal="true" aria-labelledby="gp-promo-title">
      <button type="button" className="gp-backdrop" aria-label="Fechar" onClick={onClose} />
      <div className="gp-sheet gp-promo-sheet">
        <div className="gp-promo-sheet-head">
          <button type="button" className="gp-x" onClick={onClose} aria-label="Fechar">
            <Icon name="x" />
          </button>
          <h2 id="gp-promo-title">{promo.title}</h2>
          {promo.text && <p className="gp-muted">{promo.text}</p>}
          <PromoCountdown ends={promo.ends_at} />
        </div>
        <ul className="gp-promo-list">
          {items.map((item) => (
            <PromoRow key={item.id} item={item} onRefresh={onRefresh} onWatch={onWatch} />
          ))}
        </ul>
        <p className="gp-fine gp-promo-fine">Seu nome e e-mail já vão preenchidos no pagamento.</p>
      </div>
    </div>
  );
}

// Produto à venda que o aluno ainda não tem (pop-up de ofertas, preço normal).
function isOffer(item: Item) {
  return !item.owned && !item.is_free && item.has_checkout && Boolean(item.price_cents);
}

// Pop-up de ofertas sem desconto: mesmo fluxo de compra do cadeado.
function OfferSheet({ items, onClose, onRefresh, onWatch }: { items: Item[]; onClose: () => void; onRefresh: () => Promise<Home | null>; onWatch: (item: Item) => void }) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="gp-modal" role="dialog" aria-modal="true" aria-labelledby="gp-offer-title">
      <button type="button" className="gp-backdrop" aria-label="Fechar" onClick={onClose} />
      <div className="gp-sheet gp-promo-sheet">
        <div className="gp-promo-sheet-head">
          <button type="button" className="gp-x" onClick={onClose} aria-label="Fechar">
            <Icon name="x" />
          </button>
          <h2 id="gp-offer-title">Para você</h2>
          <p className="gp-muted">Conteúdos desta área que você ainda não tem.</p>
        </div>
        <ul className="gp-promo-list">
          {items.map((item) => (
            <OfferRow key={item.id} item={item} onRefresh={onRefresh} onWatch={onWatch} />
          ))}
        </ul>
        <p className="gp-fine gp-promo-fine">Seu nome e e-mail já vão preenchidos no pagamento.</p>
      </div>
    </div>
  );
}

function OfferRow({ item, onRefresh, onWatch }: { item: Item; onRefresh: () => Promise<Home | null>; onWatch: (item: Item) => void }) {
  const { state, error, buy } = useCheckout(item, onRefresh, "ofertas", "quero-este");
  const text = item.subtitle || item.description;
  return (
    <li className="gp-promo-row">
      <span className="gp-promo-art" style={item.cover_url ? { backgroundImage: `url("${item.cover_url}")` } : art(item)} />
      <span className="gp-promo-row-info">
        <b>{item.title}</b>
        {text && <span className="gp-muted gp-small gp-offer-text">{text}</span>}
        <span className="gp-price gp-price-md">{brl(item.price_cents || 0)}</span>
        {state === "released" ? (
          <button type="button" className="gp-btn gp-btn-gold" onClick={() => onWatch({ ...item, owned: true })}>
            <Icon name="play" size={18} /> Liberado: assistir agora
          </button>
        ) : state === "waiting" ? (
          <span className="gp-muted gp-small">Pagamento aberto em outra aba. Libera aqui sozinho quando confirmar.</span>
        ) : (
          <button type="button" className="gp-btn gp-btn-gold" onClick={() => void buy()} disabled={state === "opening"}>
            {state === "opening" ? "Abrindo…" : "Quero este"}
          </button>
        )}
        {error && <span className="gp-error gp-small">{error}</span>}
      </span>
    </li>
  );
}

function PromoCountdown({ ends }: { ends: string | null }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!ends) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [ends]);
  if (!ends) return null;
  const ms = new Date(ends).getTime() - now;
  if (ms <= 0) return null;
  const sec = Math.floor(ms / 1000);
  const two = (n: number) => String(n).padStart(2, "0");
  const days = Math.floor(sec / 86400);
  return (
    <p className="gp-promo-timer">
      Termina em {days ? `${days}d ` : ""}
      {two(Math.floor((sec % 86400) / 3600))}h {two(Math.floor((sec % 3600) / 60))}m {two(sec % 60)}s
    </p>
  );
}

function PromoRow({ item, onRefresh, onWatch }: { item: Item; onRefresh: () => Promise<Home | null>; onWatch: (item: Item) => void }) {
  const { state, error, buy } = useCheckout(item, onRefresh, "promo", "comprar-por");
  return (
    <li className="gp-promo-row">
      <span className="gp-promo-art" style={item.cover_url ? { backgroundImage: `url("${item.cover_url}")` } : art(item)} />
      <span className="gp-promo-row-info">
        <b>{item.title}</b>
        <PriceTag item={item} size="md" />
        {state === "released" ? (
          <button type="button" className="gp-btn gp-btn-gold" onClick={() => onWatch({ ...item, owned: true })}>
            <Icon name="play" size={18} /> Liberado: assistir agora
          </button>
        ) : state === "waiting" ? (
          <span className="gp-muted gp-small">Pagamento aberto em outra aba. Libera aqui sozinho quando confirmar.</span>
        ) : item.has_checkout ? (
          <button type="button" className="gp-btn gp-btn-gold" onClick={() => void buy()} disabled={state === "opening"}>
            {state === "opening" ? "Abrindo…" : `Comprar por ${brl(finalPrice(item))}`}
          </button>
        ) : (
          <span className="gp-muted gp-small">Em breve à venda por aqui.</span>
        )}
        {error && <span className="gp-error gp-small">{error}</span>}
      </span>
    </li>
  );
}

function LockedSheet({
  item,
  onClose,
  onRefresh,
  onWatch,
}: {
  item: Item;
  onClose: () => void;
  onRefresh: () => Promise<Home | null>;
  onWatch: (item: Item) => void;
}) {
  const { state, error, buy } = useCheckout(item, onRefresh);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="gp-modal" role="dialog" aria-modal="true" aria-labelledby="gp-lock-title">
      <button type="button" className="gp-backdrop" aria-label="Fechar" onClick={onClose} />
      <div className="gp-sheet">
        <div className="gp-sheet-cover" style={item.banner_url ? { backgroundImage: `url("${item.banner_url}")` } : art(item)}>
          <button type="button" className="gp-x" onClick={onClose} aria-label="Fechar">
            <Icon name="x" />
          </button>
        </div>
        <div className="gp-sheet-in">
          <h2 id="gp-lock-title">{item.title}</h2>
          {item.subtitle && <p className="gp-sub">{item.subtitle}</p>}
          {item.description && <p className="gp-muted gp-desc">{item.description}</p>}

          {state === "released" ? (
            <>
              <p className="gp-ok">Pagamento confirmado. Já está na sua área.</p>
              <button type="button" className="gp-btn gp-btn-light" onClick={() => onWatch({ ...item, owned: true })}>
                <Icon name="play" /> Assistir agora
              </button>
            </>
          ) : state === "waiting" ? (
            <>
              <div className="gp-wait">
                <span className="gp-spin" aria-hidden="true" />
                <p>
                  Pagamento aberto em outra aba. Assim que ele for confirmado, o produto libera <b>aqui mesmo</b>, sozinho.
                </p>
              </div>
              <button type="button" className="gp-btn gp-btn-ghost" onClick={() => void buy()}>
                Abrir o pagamento de novo
              </button>
            </>
          ) : (
            <>
              {item.promo_price_cents ? <PriceTag item={item} size="lg" /> : null}
              {item.has_checkout ? (
                <button type="button" className="gp-btn gp-btn-gold" onClick={() => void buy()} disabled={state === "opening"}>
                  {state === "opening" ? "Abrindo…" : `Desbloquear ${item.price_cents ? `por ${brl(finalPrice(item))}` : "agora"}`}
                </button>
              ) : (
                <p className="gp-muted">Em breve à venda por aqui.</p>
              )}
              <p className="gp-fine">Seu nome e e-mail já vão preenchidos no pagamento.</p>
            </>
          )}
          {item.sales_page_url && state !== "released" && (
            <a className="gp-link" href={tagPlainLink(item.sales_page_url, { medium: "pagina-produto", campaign: item.slug, content: "ver-tudo", term: compactOrigin(readUtm()) || undefined })} target="_blank" rel="noreferrer">
              Ver tudo o que vem no produto
            </a>
          )}
          {error && <p className="gp-error">{error}</p>}
        </div>
      </div>
    </div>
  );
}

function ProductScreen({
  slug,
  lessonId,
  onLesson,
  onBack,
  onLocked,
  onProgress,
}: {
  slug: string;
  lessonId: string | null;
  onLesson: (id: string) => void;
  onBack: () => void;
  onLocked: (item: Item) => void;
  onProgress: () => void;
}) {
  const [data, setData] = useState<ProductView | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setData(await api<ProductView>(`/api/membros/produto?slug=${encodeURIComponent(slug)}`));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao abrir o produto.");
    }
  }, [slug]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- busca os dados do servidor
    void load();
  }, [load]);

  // Estatísticas: registra a aula aberta (uma vez por aula em cada visita).
  const openLessonId = (() => {
    if (!data) return null;
    const list = data.modules.flatMap((module) => module.lessons);
    const pick = list.find((lesson) => lesson.id === lessonId) || list.find((lesson) => !lesson.locked && !lesson.completed) || list.find((lesson) => !lesson.locked);
    return pick && !pick.locked ? pick.id : null;
  })();
  const productId = data?.product.id;
  useEffect(() => {
    if (!openLessonId || !productId) return;
    const key = `gp_aula_${openLessonId}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      /* sem armazenamento: registra assim mesmo */
    }
    void api("/api/membros/evento", { body: { produto: productId, tipo: "aula_aberta", aula: openLessonId } }).catch(() => undefined);
  }, [openLessonId, productId]);

  if (error) return <div className="gp-wrap gp-center"><p className="gp-error">{error}</p></div>;
  if (!data) return <div className="gp-wrap gp-center"><p className="gp-muted">Abrindo…</p></div>;

  const all = data.modules.flatMap((module) => module.lessons);
  const current = all.find((lesson) => lesson.id === lessonId) || all.find((lesson) => !lesson.locked && !lesson.completed) || all.find((lesson) => !lesson.locked) || null;
  const index = current ? all.indexOf(current) : -1;
  const next = index >= 0 ? all.slice(index + 1).find((lesson) => !lesson.locked) : undefined;
  const done = all.filter((lesson) => lesson.completed).length;

  async function mark(lesson: LessonView, completed: boolean) {
    await api("/api/membros/progresso", { body: { aula: lesson.id, concluida: completed } }).catch(() => undefined);
    await load();
    onProgress();
    if (completed && next) onLesson(next.id);
  }

  return (
    <main className="gp-wrap gp-product">
      <button type="button" className="gp-back" onClick={onBack}>
        <Icon name="back" /> Início
      </button>
      <div className="gp-product-head">
        <div>
          <h1>{data.product.title}</h1>
          {data.product.subtitle && <p className="gp-sub">{data.product.subtitle}</p>}
        </div>
        {all.length > 0 && (
          <div className="gp-progress" aria-label={`${done} de ${all.length} aulas concluídas`}>
            <span>
              {done} de {aulas(all.length)} concluídas
            </span>
            <div>
              <i style={{ width: `${Math.round((done / all.length) * 100)}%` }} />
            </div>
          </div>
        )}
      </div>

      {!data.product.owned && (
        <div className="gp-banner-lock">
          <Lock /> Você ainda não tem este produto.{" "}
          <button type="button" className="gp-btn gp-btn-gold" onClick={() => onLocked({ ...data.product, via: "cadeado-aula", via_content: "banner-desbloquear" })}>
            Desbloquear {data.product.price_cents ? <>por <PriceTag item={data.product} size="md" /></> : ""}
          </button>
        </div>
      )}

      <div className="gp-player-grid">
        <section className="gp-player">
          {current ? (
            <>
              {current.youtube_id || current.video_url ? (
                <div className="gp-video">
                  {current.youtube_id ? (
                    <iframe
                      key={current.id}
                      src={`https://www.youtube-nocookie.com/embed/${current.youtube_id}?rel=0&modestbranding=1`}
                      title={current.title}
                      allow="encrypted-media; picture-in-picture; fullscreen"
                      allowFullScreen
                    />
                  ) : (
                    <a className="gp-video-link" href={current.video_url!} target="_blank" rel="noreferrer">
                      Abrir o vídeo desta aula
                    </a>
                  )}
                </div>
              ) : (
                <p className="gp-novideo">{current.materials.length > 0 ? "Esta aula não tem vídeo: o material está logo abaixo." : "O vídeo desta aula chega em breve. Enquanto isso, siga o passo a passo abaixo."}</p>
              )}
              <div className="gp-lesson-info">
                <div>
                  <span className="gp-lesson-pos">Aula {index + 1} de {all.length}</span>
                  <h2>{current.title}</h2>
                </div>
                {current.description && <p className="gp-muted gp-desc">{current.description}</p>}
                {current.materials.length > 0 && (
                  <div className="gp-materials">
                    <b>Materiais</b>
                    {current.materials.map((material) => (
                      <a key={material.url} href={material.url} target="_blank" rel="noreferrer">
                        <Icon name="down" /> {material.titulo}
                      </a>
                    ))}
                  </div>
                )}
                {data.product.owned && (
                  <div className="gp-btns">
                    <button type="button" className={`gp-btn ${current.completed ? "gp-btn-ghost" : "gp-btn-light"}`} onClick={() => void mark(current, !current.completed)}>
                      {current.completed ? (
                        <>
                          <Icon name="check" /> Concluída (desmarcar)
                        </>
                      ) : next ? (
                        <>
                          Concluir e ir para a próxima <Icon name="right" />
                        </>
                      ) : (
                        "Marcar como concluída"
                      )}
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="gp-video gp-video-link">Nenhuma aula disponível ainda.</div>
          )}

          {data.upsell && (
            <button type="button" className="gp-upsell" onClick={() => onLocked({ ...data.upsell!, owned: false, via: "upsell-aula", via_content: "proximo-passo" })}>
              <span className="gp-upsell-art" style={art(data.upsell)} />
              <span>
                <b>{data.upsell.title}</b>
                <small>{data.upsell.text || data.upsell.subtitle || "Próximo passo recomendado"}</small>
              </span>
              <span className="gp-btn gp-btn-gold">{data.upsell.price_cents ? <PriceTag item={data.upsell} size="sm" /> : "Ver"}</span>
            </button>
          )}
        </section>

        <aside className="gp-modules">
          {data.modules.map((module) => (
            <details key={module.id} open={module.lessons.some((lesson) => lesson.id === current?.id) || data.modules.length < 4}>
              <summary className={module.cover_url ? "has-cover" : undefined}>
                {module.cover_url && <span className="gp-module-cover" style={{ backgroundImage: `url("${module.cover_url}")` }} aria-hidden="true" />}
                {module.title}
                {!module.open && data.product.owned && module.release_at && <small>libera em {new Date(module.release_at).toLocaleDateString("pt-BR")}</small>}
              </summary>
              <ol>
                {module.lessons.map((lesson) => (
                  <li key={lesson.id}>
                    <button
                      type="button"
                      className={`${lesson.id === current?.id ? "is-current" : ""} ${lesson.locked ? "is-locked" : ""}`}
                      onClick={() => (lesson.locked ? (data.product.owned ? undefined : onLocked({ ...data.product, via: "cadeado-aula", via_content: "aula-bloqueada" })) : onLesson(lesson.id))}
                      disabled={lesson.locked && data.product.owned}
                    >
                      <span className={`gp-num${lesson.completed ? " is-done" : ""}`} aria-label={lesson.completed ? "Concluída" : lesson.locked ? "Bloqueada" : undefined}>
                        {lesson.completed ? <Icon name="check" size={22} /> : lesson.locked ? <Lock /> : all.indexOf(lesson) + 1}
                      </span>
                      <span>
                        {lesson.title}
                        {lesson.free_preview && !data.product.owned && <em> grátis</em>}
                      </span>
                      {lesson.duration_min ? <small>{lesson.duration_min} min</small> : null}
                    </button>
                  </li>
                ))}
              </ol>
            </details>
          ))}
        </aside>
      </div>
    </main>
  );
}
