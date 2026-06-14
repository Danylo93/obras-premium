import type { Category, ProjectStatus } from "@/types";

export const CATEGORIES: Category[] = [
  "Material",
  "Mão de Obra",
  "Gasolina",
  "Insumos",
  "Equipamentos",
  "Outros",
];

/** Cor fixa por categoria para que gráficos e badges sejam sempre consistentes. */
export const CATEGORY_COLORS: Record<Category, string> = {
  Material: "#3b82f6",
  "Mão de Obra": "#f59e0b",
  Gasolina: "#ef4444",
  Insumos: "#10b981",
  Equipamentos: "#8b5cf6",
  Outros: "#64748b",
};

export const CATEGORY_BADGE_CLASSES: Record<Category, string> = {
  Material: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400",
  "Mão de Obra": "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  Gasolina: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400",
  Insumos: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  Equipamentos: "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400",
  Outros: "bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-400",
};

export const PROJECT_STATUSES: ProjectStatus[] = ["Em andamento", "Concluído", "Pausado"];

export const STATUS_BADGE_CLASSES: Record<ProjectStatus, string> = {
  "Em andamento": "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400",
  Concluído: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  Pausado: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
};
