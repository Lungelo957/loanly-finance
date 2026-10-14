import { useSyncExternalStore } from "react";

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type State = { deferred: BeforeInstallPromptEvent | null; installed: boolean };
let state: State = { deferred: null, installed: false };
const listeners = new Set<() => void>();
const set = (next: Partial<State>) => {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
};

export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    window.matchMedia?.("(display-mode: window-controls-overlay)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return /iphone|ipad|ipod/i.test(ua) || (ua.includes("Macintosh") && navigator.maxTouchPoints > 1);
}

let started = false;
export function startInstallListener() {
  if (started || typeof window === "undefined") return;
  started = true;
  set({ installed: isStandalone() });
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    set({ deferred: e as BeforeInstallPromptEvent });
  });
  window.addEventListener("appinstalled", () => set({ deferred: null, installed: true }));
}

if (typeof window !== "undefined") startInstallListener();

export async function triggerInstall(): Promise<"accepted" | "dismissed" | "unavailable" | "error"> {
  const d = state.deferred;
  if (!d) return "unavailable";
  try {
    await d.prompt();
    const { outcome } = await d.userChoice;
    set({ deferred: null, installed: outcome === "accepted" || state.installed });
    return outcome;
  } catch {
    set({ deferred: null });
    return "error";
  }
}

const SERVER: State = { deferred: null, installed: false };
export function useInstallState(): State {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
    () => SERVER,
  );
}

// Harmless UI preference only: when "Not now" was last tapped.
const DISMISS_KEY = "cashflow.install.dismissedAt";
const SNOOZE_MS = 14 * 24 * 60 * 60 * 1000;
export function isSnoozed(): boolean {
  const v = Number(localStorage.getItem(DISMISS_KEY) || 0);
  return v > 0 && Date.now() - v < SNOOZE_MS;
}
export function snooze() {
  localStorage.setItem(DISMISS_KEY, String(Date.now()));
  localStorage.removeItem("cashflow.install.dismissed");
}
