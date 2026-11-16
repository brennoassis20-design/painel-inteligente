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
