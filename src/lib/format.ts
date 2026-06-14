import { format } from "date-fns";

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function formatBRL(value: number): string {
  return brl.format(value);
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR");
}

/**
 * Converte texto digitado em valor monetário, aceitando os formatos
 * "1.234,56", "1234,56", "1234.56" e "R$ 1.234,56".
 * Retorna null para entradas inválidas, zero ou negativas.
 */
export function parseAmount(raw: string): number | null {
  const cleaned = raw.replace(/[^\d.,]/g, "");
  if (!cleaned) return null;

  let normalized: string;
  const lastComma = cleaned.lastIndexOf(",");
  if (lastComma !== -1) {
    // Em pt-BR a vírgula é sempre separador decimal.
    normalized =
      cleaned.slice(0, lastComma).replace(/[.,]/g, "") + "." + cleaned.slice(lastComma + 1);
  } else if (/^\d{1,3}(\.\d{3})+$/.test(cleaned)) {
    // Pontos como separador de milhar: "1.000" -> 1000.
    normalized = cleaned.replace(/\./g, "");
  } else {
    normalized = cleaned;
  }

  const value = Number(normalized);
  if (!Number.isFinite(value) || value <= 0) return null;
  return Math.round(value * 100) / 100;
}

/** Data de hoje no formato aceito por <input type="date">. */
export function todayInputValue(): string {
  return format(new Date(), "yyyy-MM-dd");
}

/** Converte o valor de um <input type="date"> em ISO sem deslocar o dia por fuso horário. */
export function dateInputToISO(value: string): string {
  return new Date(`${value}T12:00:00`).toISOString();
}

export function isoToDateInput(iso: string): string {
  return format(new Date(iso), "yyyy-MM-dd");
}

/** Retorna label relativo legível: "hoje", "ontem", "há 3 dias", ou data completa. */
export function formatRelativeDate(iso: string): { label: string; full: string } {
  const full = formatDate(iso);
  const d = new Date(iso);
  const now = new Date();
  d.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);
  const diff = Math.round((now.getTime() - d.getTime()) / 86400000);
  if (diff === 0) return { label: "hoje", full };
  if (diff === 1) return { label: "ontem", full };
  if (diff <= 6) return { label: `há ${diff} dias`, full };
  return { label: full, full };
}
