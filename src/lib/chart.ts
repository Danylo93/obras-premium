import type { CSSProperties } from "react";

export const chartTooltipStyle: CSSProperties = {
  backgroundColor: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: "0.75rem",
  color: "var(--popover-foreground)",
  fontSize: "0.8rem",
  fontWeight: 600,
  boxShadow: "0 8px 24px rgb(0 0 0 / 0.12)",
};

export const chartLabelStyle: CSSProperties = {
  color: "var(--muted-foreground)",
  fontWeight: 700,
};

export const axisTickStyle = {
  fill: "var(--muted-foreground)",
  fontSize: 11,
  fontWeight: 600,
};

/**
 * Lê a cor CSS primary do DOM e converte para hex/rgb usável pelo Recharts
 * (que não suporta oklch em atributos SVG presentation).
 * Fallback para azul padrão.
 */
export function readPrimaryColor(): string {
  if (typeof document === "undefined") return "#3b82f6";
  try {
    const el = document.createElement("div");
    el.style.setProperty("color", "var(--color-primary)");
    document.body.appendChild(el);
    const raw = getComputedStyle(el).color;
    document.body.removeChild(el);
    // raw pode ser "rgb(x y z)" ou "oklch(...)" — se não for rgb/hex, retorna fallback
    if (raw.startsWith("rgb")) return raw;
  } catch {}
  return "#3b82f6";
}

/** Cores fixas para Recharts — sempre hexadecimais, seguras em SVG */
export const CHART_PRIMARY = "#3b82f6";
export const CHART_COLORS_HEX = [
  "#3b82f6", "#f59e0b", "#ef4444", "#10b981", "#8b5cf6", "#64748b",
];
