import { useSyncExternalStore } from "react";

export type ConnectionSettings = {
  mode: "demo" | "live";
  baseUrl: string;
  token: string;
  authHeader: string;
  timeoutMs: number;
};

const KEY = "wmm.settings.v1";

export const DEFAULT_SETTINGS: ConnectionSettings = {
  mode: "demo",
  baseUrl: (import.meta.env.VITE_WIREMOCK_BASE_URL as string | undefined) || "http://localhost:8080",
  token: "",
  authHeader: "Authorization",
  timeoutMs: 5000,
};

let current: ConnectionSettings | null = null;
const listeners = new Set<() => void>();

function load(): ConnectionSettings {
  if (current) return current;
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(KEY);
    current = raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
  } catch {
    current = DEFAULT_SETTINGS;
  }
  return current!;
}

export function getSettings() {
  return load();
}

export function saveSettings(next: ConnectionSettings) {
  current = next;
  window.localStorage.setItem(KEY, JSON.stringify(next));
  listeners.forEach((l) => l());
}

export function useSettings(): ConnectionSettings {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    load,
    () => DEFAULT_SETTINGS,
  );
}
