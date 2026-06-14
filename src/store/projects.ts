import { useSyncExternalStore } from "react";
import type { Category, Expense, Project, ProjectStatus } from "@/types";
import { CATEGORIES, PROJECT_STATUSES } from "@/lib/categories";
import {
  hasApi,
  apiFetchProjects,
  apiPutProject,
  apiDeleteProject,
  apiImportProjects,
  apiClearProjects,
} from "@/lib/api";

const STORAGE_KEY = "obras_projects_v2";

type Listener = () => void;
const listeners = new Set<Listener>();

function sanitizeExpense(raw: unknown): Expense | null {
  if (!raw || typeof raw !== "object") return null;
  const e = raw as Record<string, unknown>;
  const amount = typeof e.amount === "number" ? e.amount : Number(e.amount);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  if (typeof e.description !== "string" || !e.description.trim()) return null;

  return {
    id: typeof e.id === "string" ? e.id : crypto.randomUUID(),
    description: e.description,
    amount: Math.round(amount * 100) / 100,
    category: CATEGORIES.includes(e.category as Category) ? (e.category as Category) : "Outros",
    date: typeof e.date === "string" ? e.date : new Date().toISOString(),
    employeeName:
      typeof e.employeeName === "string" && e.employeeName ? e.employeeName : undefined,
    notes: typeof e.notes === "string" && e.notes ? e.notes : undefined,
    invoiceNumber:
      typeof e.invoiceNumber === "string" && e.invoiceNumber ? e.invoiceNumber : undefined,
    paid: typeof e.paid === "boolean" ? e.paid : false,
  };
}

export function sanitizeProjects(data: unknown): Project[] | null {
  if (!Array.isArray(data)) return null;
  const result: Project[] = [];

  for (const raw of data) {
    if (!raw || typeof raw !== "object") continue;
    const p = raw as Record<string, unknown>;
    if (typeof p.name !== "string" || !p.name.trim()) continue;

    const budget = typeof p.budget === "number" ? p.budget : Number(p.budget);
    const expenses = Array.isArray(p.expenses)
      ? p.expenses.map(sanitizeExpense).filter((e): e is Expense => e !== null)
      : [];

    result.push({
      id: typeof p.id === "string" ? p.id : crypto.randomUUID(),
      name: p.name,
      clientName: typeof p.clientName === "string" ? p.clientName : "",
      clientPhone: typeof p.clientPhone === "string" && p.clientPhone ? p.clientPhone : undefined,
      address: typeof p.address === "string" && p.address ? p.address : undefined,
      expenses,
      createdAt: typeof p.createdAt === "string" ? p.createdAt : new Date().toISOString(),
      startDate: typeof p.startDate === "string" && p.startDate ? p.startDate : undefined,
      deadline: typeof p.deadline === "string" && p.deadline ? p.deadline : undefined,
      status: PROJECT_STATUSES.includes(p.status as ProjectStatus)
        ? (p.status as ProjectStatus)
        : "Em andamento",
      budget: Number.isFinite(budget) && budget > 0 ? budget : undefined,
      notes: typeof p.notes === "string" && p.notes ? p.notes : undefined,
      completionPct: typeof p.completionPct === "number" && p.completionPct >= 0 && p.completionPct <= 100 ? Math.round(p.completionPct) : undefined,
    });
  }

  return result;
}

function load(): Project[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return sanitizeProjects(JSON.parse(raw)) ?? [];
  } catch {
    return [];
  }
}

let projects: Project[] = load();

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  } catch {
    // quota exceeded — keep in memory
  }
}

function emit() {
  for (const listener of listeners) listener();
}

// Sync a single project to the cloud (fire-and-forget)
function syncPut(project: Project) {
  if (!hasApi()) return;
  apiPutProject(project).catch(() => {
    // silent — localStorage remains the source of truth
  });
}

function syncDelete(id: string) {
  if (!hasApi()) return;
  apiDeleteProject(id).catch(() => {});
}

function update(updater: (prev: Project[]) => Project[], syncedIds?: string | string[] | "all" | "delete") {
  const before = projects;
  projects = updater(projects);
  persist();
  emit();

  if (!hasApi() || syncedIds === undefined) return;

  if (syncedIds === "all") {
    // sync every changed project
    projects.forEach((p) => {
      const old = before.find((b) => b.id === p.id);
      if (old !== p) syncPut(p);
    });
  } else if (syncedIds === "delete") {
    // nothing to push — deletions handled by callers
  } else if (Array.isArray(syncedIds)) {
    syncedIds.forEach((id) => {
      const p = projects.find((x) => x.id === id);
      if (p) syncPut(p);
    });
  } else {
    const p = projects.find((x) => x.id === syncedIds);
    if (p) syncPut(p);
  }
}

// On startup: fetch from API and hydrate if it has more data than local
if (typeof window !== "undefined" && hasApi()) {
  apiFetchProjects()
    .then((remote) => {
      if (!Array.isArray(remote) || remote.length === 0) return;
      const sanitized = sanitizeProjects(remote);
      if (!sanitized || sanitized.length === 0) return;
      // Only replace if remote has data — preserves local if API is empty
      projects = sanitized;
      persist();
      emit();
    })
    .catch(() => {
      // Network error — keep local data
    });
}

if (typeof window !== "undefined") {
  window.addEventListener("storage", (event) => {
    if (event.key === STORAGE_KEY) {
      projects = load();
      emit();
    }
  });
}

function subscribe(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return projects;
}

export function useProjectsStore(): Project[] {
  return useSyncExternalStore(subscribe, getSnapshot);
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

export interface ProjectInput {
  name: string;
  clientName: string;
  clientPhone?: string;
  address?: string;
  budget?: number;
  startDate?: string;
  deadline?: string;
  notes?: string;
}

export function addProject(input: ProjectInput): Project {
  const project: Project = {
    id: crypto.randomUUID(),
    name: input.name.trim(),
    clientName: input.clientName.trim(),
    clientPhone: input.clientPhone?.trim() || undefined,
    address: input.address?.trim() || undefined,
    expenses: [],
    createdAt: new Date().toISOString(),
    status: "Em andamento",
    budget: input.budget,
    startDate: input.startDate || undefined,
    deadline: input.deadline || undefined,
    notes: input.notes?.trim() || undefined,
  };
  update((prev) => [project, ...prev], project.id);
  return project;
}

export function updateProject(
  id: string,
  patch: Partial<
    Pick<
      Project,
      | "name"
      | "clientName"
      | "clientPhone"
      | "address"
      | "budget"
      | "status"
      | "startDate"
      | "deadline"
      | "notes"
      | "completionPct"
    >
  >,
) {
  update((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)), id);
}

export function deleteProject(id: string) {
  update((prev) => prev.filter((p) => p.id !== id), "delete");
  syncDelete(id);
}

export function addExpense(projectId: string, input: Omit<Expense, "id">) {
  const expense: Expense = { ...input, id: crypto.randomUUID() };
  update(
    (prev) => prev.map((p) => (p.id === projectId ? { ...p, expenses: [...p.expenses, expense] } : p)),
    projectId,
  );
}

export function updateExpense(projectId: string, expenseId: string, patch: Omit<Expense, "id">) {
  update(
    (prev) =>
      prev.map((p) =>
        p.id === projectId
          ? { ...p, expenses: p.expenses.map((e) => (e.id === expenseId ? { ...e, ...patch } : e)) }
          : p,
      ),
    projectId,
  );
}

export function toggleExpensePaid(projectId: string, expenseId: string) {
  update(
    (prev) =>
      prev.map((p) =>
        p.id === projectId
          ? { ...p, expenses: p.expenses.map((e) => (e.id === expenseId ? { ...e, paid: !e.paid } : e)) }
          : p,
      ),
    projectId,
  );
}

export function deleteExpense(projectId: string, expenseId: string) {
  update(
    (prev) =>
      prev.map((p) =>
        p.id === projectId ? { ...p, expenses: p.expenses.filter((e) => e.id !== expenseId) } : p,
      ),
    projectId,
  );
}

export function restoreExpense(projectId: string, expense: Expense) {
  update(
    (prev) => prev.map((p) => (p.id === projectId ? { ...p, expenses: [expense, ...p.expenses] } : p)),
    projectId,
  );
}

export function restoreProject(project: Project) {
  update((prev) => [project, ...prev], project.id);
}

export function duplicateExpense(projectId: string, expenseId: string) {
  update(
    (prev) =>
      prev.map((p) => {
        if (p.id !== projectId) return p;
        const original = p.expenses.find((e) => e.id === expenseId);
        if (!original) return p;
        return { ...p, expenses: [...p.expenses, { ...original, id: crypto.randomUUID(), paid: false }] };
      }),
    projectId,
  );
}

export function bulkUpdateExpensesPaid(projectId: string, expenseIds: string[], paid: boolean) {
  update(
    (prev) =>
      prev.map((p) =>
        p.id === projectId
          ? { ...p, expenses: p.expenses.map((e) => (expenseIds.includes(e.id) ? { ...e, paid } : e)) }
          : p,
      ),
    projectId,
  );
}

export function bulkDeleteExpenses(projectId: string, expenseIds: string[]) {
  update(
    (prev) =>
      prev.map((p) =>
        p.id === projectId
          ? { ...p, expenses: p.expenses.filter((e) => !expenseIds.includes(e.id)) }
          : p,
      ),
    projectId,
  );
}

export function importProjects(data: unknown): number | null {
  const sanitized = sanitizeProjects(data);
  if (sanitized === null) return null;
  update(() => sanitized, "delete");
  if (hasApi()) apiImportProjects(sanitized).catch(() => {});
  return sanitized.length;
}

export function clearAllProjects() {
  update(() => [], "delete");
  if (hasApi()) apiClearProjects().catch(() => {});
}

export function moveExpense(fromProjectId: string, toProjectId: string, expenseId: string) {
  update(
    (prev) => {
      const fromProject = prev.find((p) => p.id === fromProjectId);
      const expense = fromProject?.expenses.find((e) => e.id === expenseId);
      if (!expense || !fromProject) return prev;
      return prev.map((p) => {
        if (p.id === fromProjectId) return { ...p, expenses: p.expenses.filter((e) => e.id !== expenseId) };
        if (p.id === toProjectId) return { ...p, expenses: [expense, ...p.expenses] };
        return p;
      });
    },
    [fromProjectId, toProjectId],
  );
}

export function duplicateProject(id: string): Project | null {
  let copy: Project | null = null;
  update((prev) => {
    const original = prev.find((p) => p.id === id);
    if (!original) return prev;
    copy = {
      ...original,
      id: crypto.randomUUID(),
      name: `${original.name} (cópia)`,
      createdAt: new Date().toISOString(),
      status: "Em andamento",
      expenses: original.expenses.map((e) => ({ ...e, id: crypto.randomUUID() })),
    };
    return [copy, ...prev];
  }); // sync handled manually below after copy is assigned
  if (copy) syncPut(copy);
  return copy;
}

export function seedDemoData() {
  const today = new Date();
  const dateStr = (offsetDays: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() + offsetDays);
    return d.toISOString().slice(0, 10);
  };

  const demo: Project[] = [
    {
      id: crypto.randomUUID(),
      name: "Reforma Residencial Jardins",
      clientName: "Dr. Fernando Costa",
      clientPhone: "(11) 99887-6655",
      address: "Rua Augusta, 1200, Jardins",
      createdAt: new Date(today.getFullYear(), today.getMonth() - 1, 15).toISOString(),
      startDate: dateStr(-30),
      deadline: dateStr(60),
      status: "Em andamento",
      budget: 120000,
      notes: "Reforma completa de 3 quartos, 2 banheiros e cozinha. Materiais premium.",
      expenses: [
        { id: crypto.randomUUID(), description: "Cimento CP-II, 100 sacos", amount: 4200, category: "Material", date: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 25).toISOString(), paid: true },
        { id: crypto.randomUUID(), description: "Pedreiros (equipe 4)", amount: 18000, category: "Mão de Obra", date: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 20).toISOString(), employeeName: "Carlos Pereira", paid: true },
        { id: crypto.randomUUID(), description: "Porcelanato 60x60 – 80m²", amount: 14400, category: "Material", date: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 15).toISOString(), invoiceNumber: "NF-1042", paid: true },
        { id: crypto.randomUUID(), description: "Tintas e solventes", amount: 3100, category: "Insumos", date: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 10).toISOString(), paid: false },
        { id: crypto.randomUUID(), description: "Betoneira alugada – 30 dias", amount: 1800, category: "Equipamentos", date: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 8).toISOString(), paid: false },
        { id: crypto.randomUUID(), description: "Combustível – viagens obra", amount: 480, category: "Gasolina", date: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 5).toISOString(), paid: false },
        { id: crypto.randomUUID(), description: "Areia e brita – 5 m³", amount: 2200, category: "Material", date: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 3).toISOString(), paid: false },
      ],
    },
    {
      id: crypto.randomUUID(),
      name: "Construção Galpão Industrial",
      clientName: "Metalúrgica Silva Ltda.",
      clientPhone: "(11) 3344-5566",
      address: "Av. Industrial, 500, Guarulhos",
      createdAt: new Date(today.getFullYear(), today.getMonth() - 3, 1).toISOString(),
      startDate: dateStr(-90),
      deadline: dateStr(30),
      status: "Em andamento",
      budget: 350000,
      notes: "Galpão 800m² com mezanino. Estrutura metálica pré-fabricada.",
      expenses: [
        { id: crypto.randomUUID(), description: "Estrutura metálica pré-fab", amount: 95000, category: "Material", date: new Date(today.getFullYear(), today.getMonth() - 2, 5).toISOString(), invoiceNumber: "NF-3301", paid: true },
        { id: crypto.randomUUID(), description: "Concreto usinado – 40 m³", amount: 32000, category: "Material", date: new Date(today.getFullYear(), today.getMonth() - 2, 12).toISOString(), paid: true },
        { id: crypto.randomUUID(), description: "Equipe especializada", amount: 45000, category: "Mão de Obra", date: new Date(today.getFullYear(), today.getMonth() - 1, 10).toISOString(), employeeName: "Eng. Roberto Lima", paid: true },
        { id: crypto.randomUUID(), description: "Telhas termoacústicas", amount: 28500, category: "Material", date: new Date(today.getFullYear(), today.getMonth() - 1, 20).toISOString(), invoiceNumber: "NF-4412", paid: false },
        { id: crypto.randomUUID(), description: "Guincho + andaimes – 45 dias", amount: 8700, category: "Equipamentos", date: new Date(today.getFullYear(), today.getMonth(), 5).toISOString(), paid: false },
        { id: crypto.randomUUID(), description: "Elétrica e iluminação", amount: 22000, category: "Outros", date: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7).toISOString(), paid: false },
      ],
    },
    {
      id: crypto.randomUUID(),
      name: "Apartamento Novo – Vila Madalena",
      clientName: "Beatriz Andrade",
      clientPhone: "(11) 97654-3210",
      address: "Rua Harmonia, 85, Vila Madalena",
      createdAt: new Date(today.getFullYear(), today.getMonth() - 5, 10).toISOString(),
      startDate: dateStr(-150),
      deadline: dateStr(-10),
      status: "Concluído",
      budget: 80000,
      notes: "Acabamento alto padrão. Cliente aprovado em todas as etapas.",
      expenses: [
        { id: crypto.randomUUID(), description: "Piso laminado – 120m²", amount: 9600, category: "Material", date: new Date(today.getFullYear(), today.getMonth() - 4, 8).toISOString(), paid: true },
        { id: crypto.randomUUID(), description: "Mestre de obras", amount: 24000, category: "Mão de Obra", date: new Date(today.getFullYear(), today.getMonth() - 3, 15).toISOString(), employeeName: "Aluísio Santos", paid: true },
        { id: crypto.randomUUID(), description: "Cozinha planejada", amount: 18500, category: "Outros", date: new Date(today.getFullYear(), today.getMonth() - 2, 20).toISOString(), invoiceNumber: "NF-7788", paid: true },
        { id: crypto.randomUUID(), description: "Hidráulica completa", amount: 12000, category: "Outros", date: new Date(today.getFullYear(), today.getMonth() - 2, 5).toISOString(), paid: true },
        { id: crypto.randomUUID(), description: "Tinta premium – 3 demãos", amount: 4800, category: "Insumos", date: new Date(today.getFullYear(), today.getMonth() - 1, 10).toISOString(), paid: true },
      ],
    },
  ];

  update(() => demo);
}

// ---------------------------------------------------------------------------
// Derived helpers
// ---------------------------------------------------------------------------

export function projectTotal(project: Project): number {
  return project.expenses.reduce((sum, e) => sum + e.amount, 0);
}

export function deadlineDaysLeft(project: Project): number | null {
  if (!project.deadline) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const dl = new Date(project.deadline + "T00:00:00");
  return Math.round((dl.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}
