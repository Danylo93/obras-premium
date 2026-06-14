import { useSyncExternalStore } from "react";

export type Theme = "light" | "dark" | "system";

export interface Settings {
  name: string;
  companyName: string;
  theme: Theme;
}

const STORAGE_KEY = "obras_settings";
const DEFAULTS: Settings = { name: "", companyName: "", theme: "system" };

type Listener = () => void;
const listeners = new Set<Listener>();

function load(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<Settings>;
    return {
      name: typeof parsed.name === "string" ? parsed.name : DEFAULTS.name,
      companyName: typeof parsed.companyName === "string" ? parsed.companyName : DEFAULTS.companyName,
      theme: parsed.theme === "light" || parsed.theme === "dark" ? parsed.theme : "system",
    };
  } catch {
    return DEFAULTS;
  }
}

let settings: Settings = load();

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Storage indisponível: mantém em memória.
  }
}

function emit() {
  for (const listener of listeners) listener();
}

export function resolveTheme(theme: Theme): "light" | "dark" {
  if (theme === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return theme;
}

export function applyTheme() {
  document.documentElement.classList.toggle("dark", resolveTheme(settings.theme) === "dark");
}

function subscribe(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return settings;
}

export function useSettings(): Settings {
  return useSyncExternalStore(subscribe, getSnapshot);
}

export function setTheme(theme: Theme) {
  settings = { ...settings, theme };
  persist();
  applyTheme();
  emit();
}

export function setUserName(name: string) {
  settings = { ...settings, name: name.trim() };
  persist();
  emit();
}

export function setCompanyName(companyName: string) {
  settings = { ...settings, companyName: companyName.trim() };
  persist();
  emit();
}

if (typeof window !== "undefined") {
  applyTheme();

  // Acompanha o tema do sistema enquanto a preferência for "system".
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    if (settings.theme === "system") {
      settings = { ...settings };
      applyTheme();
      emit();
    }
  });

  window.addEventListener("storage", (event) => {
    if (event.key === STORAGE_KEY) {
      settings = load();
      applyTheme();
      emit();
    }
  });
}
