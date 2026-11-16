"use client";

// App do Gênio Play: service worker, instalação na tela inicial e avisos no celular.
import { api } from "./session";

export type Platform = "ios" | "android" | "desktop";

export function platform(): Platform {
  const ua = navigator.userAgent;
  // iPad novo se apresenta como Mac, mas tem toque.
  if (/iPhone|iPad|iPod/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return "ios";
  if (/Android/i.test(ua)) return "android";
  return "desktop";
}

export function isInstalled() {
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true;
}

// Navegador dentro do Instagram/Facebook/WhatsApp não instala app: precisa abrir no Safari/Chrome.
export function inAppBrowser() {
  return /FBAN|FBAV|Instagram|Line\/|WhatsApp|TikTok|musical_ly/i.test(navigator.userAgent);
}

export function iosNotSafari() {
  return platform() === "ios" && /CriOS|FxiOS|EdgiOS|OPiOS/i.test(navigator.userAgent);
}

export async function registerWorker() {
  if (!("serviceWorker" in navigator)) return null;
  const scope = /^\/membros(\/|$)/.test(window.location.pathname) ? "/membros" : "/";
  try {
    return await navigator.serviceWorker.register("/gp-sw.js", { scope });
  } catch {
    return null;
  }
}

export function pushSupported() {
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

export function pushPermission(): NotificationPermission | "unsupported" {
  return pushSupported() ? Notification.permission : "unsupported";
}

function keyBytes(base64: string) {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(padded);
  return Uint8Array.from(raw, (char) => char.charCodeAt(0));
}

// Liga os avisos no celular. Precisa ser chamado num toque do usuário (exigência do iPhone).
export async function enablePush(vapid: string) {
  if (!pushSupported()) throw new Error(platform() === "ios" ? "No iPhone, os avisos funcionam depois de instalar o app na tela de início." : "Este navegador não recebe avisos.");
  const permission = await Notification.requestPermission();
  if (permission !== "granted") throw new Error("Os avisos foram bloqueados. Libere nas configurações do navegador.");
  const registration = (await registerWorker()) || (await navigator.serviceWorker.ready);
  let sub = await registration.pushManager.getSubscription();
  if (!sub) sub = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(vapid) });
  await api("/api/membros/avisos", { body: { acao: "inscrever", subscription: sub.toJSON() } });
  return true;
}

// Celular que já deu permissão: renova a inscrição em silêncio (troca de aparelho, chave nova).
export async function refreshPush(vapid: string) {
  if (pushPermission() !== "granted") return;
  try {
    await enablePush(vapid);
  } catch {
    /* segue sem aviso */
  }
}

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
let deferred: InstallEvent | null = null;
const listeners = new Set<() => void>();

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferred = event as InstallEvent;
    listeners.forEach((fn) => fn());
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    listeners.forEach((fn) => fn());
  });
}

export function canPromptInstall() {
  return Boolean(deferred);
}

export function onInstallChange(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export async function promptInstall() {
  if (!deferred) return false;
  await deferred.prompt();
  const choice = await deferred.userChoice;
  deferred = null;
  return choice.outcome === "accepted";
}
