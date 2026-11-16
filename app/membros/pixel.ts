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

// Guarda as UTMs com que o aluno chegou (link de WhatsApp, e-mail, anúncio) para repassar ao checkout.
export function captureUtm() {
  try {
    const params = new URLSearchParams(window.location.search);
    const found: Record<string, string> = {};
    for (const key of UTM_KEYS) {
      const value = params.get(key);
      if (value) found[key] = value.slice(0, 100);
    }
    if (Object.keys(found).length) localStorage.setItem(STORE, JSON.stringify(found));
  } catch {
    /* armazenamento bloqueado */
  }
}

export function readUtm(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(STORE) || "{}");
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
