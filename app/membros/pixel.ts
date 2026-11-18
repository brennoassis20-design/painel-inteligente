// Pixel da Meta e UTMs da área de membros.
type Fbq = (...args: unknown[]) => void;

const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];
const STORE = "gp_utm";

export function track(event: string, params?: Record<string, unknown>) {
  try {
    (window as unknown as { fbq?: Fbq }).fbq?.("track", event, params);
  } catch {
    /* sem pixel, segue */
  }
}

// Guarda as UTMs (e o fbclid) com que o aluno chegou (link de WhatsApp, e-mail, anúncio) para repassar ao checkout.
// Cada gravação leva a data (t); origem com mais de 30 dias é descartada.
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

export function captureUtm() {
  try {
    const params = new URLSearchParams(window.location.search);
    const found: Record<string, string> = {};
    for (const key of [...UTM_KEYS, "fbclid"]) {
      const value = params.get(key);
      if (value) found[key] = value.slice(0, key === "fbclid" ? 200 : 100);
    }
    // Link da própria área (utm_source=membros, ex.: aviso por e-mail) não é origem do aluno: não apaga a original.
    if (found.utm_source === "membros") {
      for (const key of UTM_KEYS) delete found[key];
    }
    if (Object.keys(found).length) localStorage.setItem(STORE, JSON.stringify({ t: Date.now(), utm: found }));
  } catch {
    /* armazenamento bloqueado */
  }
}

export function readUtm(): Record<string, string> {
  try {
    const saved = JSON.parse(localStorage.getItem(STORE) || "{}") as { t?: number; utm?: Record<string, string> } & Record<string, string>;
    // Formato antigo (sem data): carimba agora, valendo 30 dias a partir daqui.
    if (!saved.t || !saved.utm) {
      const legacy = Object.fromEntries(Object.entries(saved).filter(([, value]) => typeof value === "string"));
      if (Object.keys(legacy).length) localStorage.setItem(STORE, JSON.stringify({ t: Date.now(), utm: legacy }));
      return legacy as Record<string, string>;
    }
    if (Date.now() - saved.t > MAX_AGE_MS) {
      localStorage.removeItem(STORE);
      return {};
    }
    return saved.utm;
  } catch {
    return {};
  }
}

// Liga o pixel da Meta da área (cada produtor mede a área dele). Sem id, não faz nada.
export function loadPixel(id: string | null | undefined) {
  const pixel = String(id || "").replace(/\D/g, "");
  if (!pixel || typeof window === "undefined") return;
  const w = window as unknown as { fbq?: Fbq & { callMethod?: Fbq; queue?: unknown[]; push?: unknown; loaded?: boolean; version?: string }; _fbq?: unknown };
  if (w.fbq) return;
  const fbq = function (...args: unknown[]) {
    if (fbq.callMethod) fbq.callMethod(...args);
    else fbq.queue.push(args);
  } as Fbq & { callMethod?: Fbq; queue: unknown[]; push?: unknown; loaded?: boolean; version?: string };
  fbq.queue = [];
  fbq.push = fbq;
  fbq.loaded = true;
  fbq.version = "2.0";
  w.fbq = fbq;
  w._fbq = fbq;
  const script = document.createElement("script");
  script.async = true;
  script.src = "https://connect.facebook.net/en_US/fbevents.js";
  document.head.appendChild(script);
  fbq("init", pixel);
  fbq("track", "PageView");
}
