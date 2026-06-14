import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Download,
  Pencil,
  Plus,
  Trash2,
  BarChart3,
  List,
  Receipt,
  Check,
  X,
  FileText,
  Phone,
  MapPin,
  Calendar,
  AlertTriangle,
  Clock,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronDown,
  Share2,
  CheckCircle2,
  Circle,
  Copy,
  Printer,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Upload } from "lucide-react";
import type { Category, Expense, Project, ProjectStatus } from "@/types";
import { CATEGORIES, CATEGORY_COLORS, PROJECT_STATUSES } from "@/lib/categories";
import { formatBRL, formatDate, parseAmount, isoToDateInput, dateInputToISO, formatRelativeDate } from "@/lib/format";
import { downloadCSV, amountToCSV } from "@/lib/csv";
import { chartTooltipStyle, CHART_PRIMARY } from "@/lib/chart";
import {
  addExpense,
  updateExpense,
  deleteExpense,
  toggleExpensePaid,
  updateProject,
  deleteProject,
  restoreExpense,
  restoreProject,
  bulkUpdateExpensesPaid,
  bulkDeleteExpenses,
  duplicateExpense,
  moveExpense,
  projectTotal,
  deadlineDaysLeft,
} from "@/store/projects";
import { useProjectsStore } from "@/store/projects";
import { BudgetProgress } from "@/components/BudgetProgress";
import { StatusBadge } from "@/components/StatusBadge";
import { CategoryBadge } from "@/components/CategoryBadge";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { StatsCard } from "@/components/StatsCard";
import { EmptyState } from "@/components/EmptyState";
import { ExpenseFormDialog } from "@/components/ExpenseFormDialog";
import { DollarSign, TrendingUp, Hash, TriangleAlert } from "lucide-react";
import { useSettings } from "@/store/settings";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type SortKey = "date" | "amount" | "category" | "description";
type SortDir = "asc" | "desc";

interface Props {
  project: Project;
  onBack: () => void;
}

const MONTH_LABELS_PT = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

export default function ProjectDetails({ project, onBack }: Props) {
  const settings = useSettings();
  const allProjects = useProjectsStore();
  const [expenseDialog, setExpenseDialog] = useState<{
    open: boolean;
    mode: "add" | "edit";
    data?: Expense;
  }>({ open: false, mode: "add" });
  const [editProjectOpen, setEditProjectOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "n" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const tag = (e.target as HTMLElement).tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
        e.preventDefault();
        setExpenseDialog({ open: true, mode: "add" });
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [expenseSearch, setExpenseSearch] = useState("");
  const [expenseCategoryFilter, setExpenseCategoryFilter] = useState<Category | "all">("all");
  const [expensePaidFilter, setExpensePaidFilter] = useState<"all" | "paid" | "pending">("all");
  const [selectedExpenses, setSelectedExpenses] = useState<Set<string>>(new Set());
  const [editingAmountId, setEditingAmountId] = useState<string | null>(null);
  const [amountDraft, setAmountDraft] = useState("");
  const [editingDescId, setEditingDescId] = useState<string | null>(null);
  const [descDraft, setDescDraft] = useState("");
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingDateId, setEditingDateId] = useState<string | null>(null);
  const [editingNFId, setEditingNFId] = useState<string | null>(null);
  const [nfDraft, setNfDraft] = useState("");
  const [expenseDateFrom, setExpenseDateFrom] = useState("");
  const [expenseDateTo, setExpenseDateTo] = useState("");
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [importPreview, setImportPreview] = useState<Array<{ ok: true; desc: string; amount: number; category: Category; date: string } | { ok: false; line: string; reason: string }> | null>(null);

  const total = useMemo(() => projectTotal(project), [project]);
  const daysLeft = useMemo(() => deadlineDaysLeft(project), [project]);

  const categoryChart = useMemo(() => {
    const acc: Record<string, number> = {};
    for (const e of project.expenses) {
      acc[e.category] = (acc[e.category] ?? 0) + e.amount;
    }
    return Object.entries(acc)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [project.expenses]);

  const paidVsPendingByCategory = useMemo(() => {
    const acc: Record<string, { name: string; pago: number; pendente: number }> = {};
    for (const e of project.expenses) {
      if (!acc[e.category]) acc[e.category] = { name: e.category, pago: 0, pendente: 0 };
      if (e.paid) acc[e.category].pago += e.amount;
      else acc[e.category].pendente += e.amount;
    }
    return Object.values(acc).sort((a, b) => (b.pago + b.pendente) - (a.pago + a.pendente));
  }, [project.expenses]);

  const employeeStats = useMemo(() => {
    const acc: Record<string, { name: string; total: number; count: number }> = {};
    for (const e of project.expenses) {
      if (!e.employeeName) continue;
      if (!acc[e.employeeName]) acc[e.employeeName] = { name: e.employeeName, total: 0, count: 0 };
      acc[e.employeeName].total += e.amount;
      acc[e.employeeName].count += 1;
    }
    return Object.values(acc).sort((a, b) => b.total - a.total);
  }, [project.expenses]);

  const timelineData = useMemo(() => {
    const sorted = [...project.expenses].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );
    let cumulative = 0;
    return sorted.map((e) => {
      cumulative += e.amount;
      return { date: formatDate(e.date), cumulative, amount: e.amount };
    });
  }, [project.expenses]);

  const monthlyData = useMemo(() => {
    const acc = new Map<string, { month: string; pago: number; pendente: number; key: string }>();
    for (const e of project.expenses) {
      const d = new Date(e.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = `${MONTH_LABELS_PT[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`;
      if (!acc.has(key)) acc.set(key, { month: label, pago: 0, pendente: 0, key });
      const row = acc.get(key)!;
      if (e.paid) row.pago += e.amount;
      else row.pendente += e.amount;
    }
    return [...acc.values()].sort((a, b) => a.key.localeCompare(b.key)).map(({ month, pago, pendente }) => ({ month, pago, pendente }));
  }, [project.expenses]);

  const budgetForecast = useMemo(() => {
    if (!project.budget || project.expenses.length < 2 || !project.startDate) return null;
    const start = new Date(project.startDate + "T00:00:00").getTime();
    const now = Date.now();
    const daysElapsed = Math.max(1, (now - start) / 86400000);
    const dailyRate = total / daysElapsed;
    if (dailyRate <= 0) return null;
    const remaining = project.budget - total;
    if (remaining <= 0) return null;
    const daysToExhaust = remaining / dailyRate;
    const exhaustDate = new Date(now + daysToExhaust * 86400000);
    const withinDeadline = project.deadline
      ? exhaustDate <= new Date(project.deadline + "T23:59:59")
      : null;
    return { daysToExhaust: Math.round(daysToExhaust), exhaustDate, withinDeadline, dailyRate };
  }, [project, total]);

  const sortedExpenses = useMemo(() => {
    const q = expenseSearch.toLowerCase();
    let list = [...project.expenses];
    if (expenseCategoryFilter !== "all") {
      list = list.filter((e) => e.category === expenseCategoryFilter);
    }
    if (expensePaidFilter === "paid") list = list.filter((e) => e.paid);
    else if (expensePaidFilter === "pending") list = list.filter((e) => !e.paid);
    if (expenseDateFrom) list = list.filter((e) => e.date >= expenseDateFrom + "T00:00:00");
    if (expenseDateTo) list = list.filter((e) => e.date <= expenseDateTo + "T23:59:59");
    if (q) {
      list = list.filter(
        (e) =>
          e.description.toLowerCase().includes(q) ||
          e.category.toLowerCase().includes(q) ||
          (e.employeeName?.toLowerCase().includes(q) ?? false) ||
          (e.invoiceNumber?.toLowerCase().includes(q) ?? false) ||
          (e.notes?.toLowerCase().includes(q) ?? false),
      );
    }
    list.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "date") cmp = new Date(a.date).getTime() - new Date(b.date).getTime();
      else if (sortKey === "amount") cmp = a.amount - b.amount;
      else if (sortKey === "category") cmp = a.category.localeCompare(b.category);
      else if (sortKey === "description") cmp = a.description.localeCompare(b.description);
      return sortDir === "asc" ? cmp : -cmp;
    });
    return list;
  }, [project.expenses, sortKey, sortDir, expenseSearch, expenseCategoryFilter, expensePaidFilter, expenseDateFrom, expenseDateTo]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("desc"); }
  };

  const SortIcon = ({ k }: { k: SortKey }) => {
    if (sortKey !== k) return <ArrowUpDown className="h-3 w-3 opacity-40" />;
    return sortDir === "asc"
      ? <ArrowUp className="h-3 w-3 text-primary" />
      : <ArrowDown className="h-3 w-3 text-primary" />;
  };

  const toggleSelect = (id: string) => {
    setSelectedExpenses((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allSelected =
    sortedExpenses.length > 0 && selectedExpenses.size === sortedExpenses.length;
  const someSelected = selectedExpenses.size > 0 && !allSelected;

  const toggleSelectAll = () => {
    if (allSelected) setSelectedExpenses(new Set());
    else setSelectedExpenses(new Set(sortedExpenses.map((e) => e.id)));
  };

  const parseImportLine = (line: string): { ok: true; desc: string; amount: number; category: Category; date: string } | { ok: false; line: string; reason: string } => {
    const sep = line.includes(";") ? ";" : "\t";
    const parts = line.split(sep).map((p) => p.trim().replace(/^"|"$/g, "").trim());
    const [desc, rawAmount, rawCat, , , , , rawDate] = parts;
    if (!desc) return { ok: false, line, reason: "Descrição vazia" };
    const amount = parseAmount(rawAmount ?? "");
    if (amount === null) return { ok: false, line, reason: `Valor inválido: "${rawAmount}"` };
    const category = (CATEGORIES.includes(rawCat as Category) ? rawCat : "Outros") as Category;
    const dateInput = rawDate?.slice(0, 10);
    const date = dateInput && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)
      ? new Date(dateInput + "T12:00:00").toISOString()
      : new Date().toISOString();
    return { ok: true, desc, amount, category, date };
  };

  const handleImportParse = () => {
    const lines = importText.split("\n").filter((l) => l.trim());
    setImportPreview(lines.map(parseImportLine));
  };

  const handleImportConfirm = () => {
    if (!importPreview) return;
    const valid = importPreview.filter((r): r is { ok: true; desc: string; amount: number; category: Category; date: string } => r.ok);
    valid.forEach((r) => {
      addExpense(project.id, { description: r.desc, amount: r.amount, category: r.category, date: r.date, paid: false });
    });
    toast.success(`${valid.length} gasto${valid.length !== 1 ? "s" : ""} importado${valid.length !== 1 ? "s" : ""}!`);
    setImportOpen(false);
    setImportText("");
    setImportPreview(null);
  };

  const handleShare = () => {
    const lines: string[] = [];
    lines.push(`📋 *${project.name}*`);
    lines.push(`👤 Cliente: ${project.clientName}`);
    if (project.address) lines.push(`📍 ${project.address}`);
    lines.push(``);
    lines.push(`💰 *Total gasto:* ${formatBRL(total)}`);
    if (project.budget) {
      const pct = Math.round((total / project.budget) * 100);
      lines.push(`🎯 Orçamento: ${formatBRL(project.budget)} (${pct}% utilizado)`);
    }
    lines.push(`📑 Lançamentos: ${project.expenses.length} · Pago: ${formatBRL(paidTotal)} · Pendente: ${formatBRL(pendingTotal)}`);
    if (project.deadline) {
      const dl = deadlineDaysLeft(project);
      const dlText = dl === null ? "" : dl < 0 ? ` (${Math.abs(dl)}d atrasado)` : dl === 0 ? " (hoje!)" : ` (${dl}d restantes)`;
      lines.push(`⏰ Prazo: ${formatDate(project.deadline + "T12:00:00")}${dlText}`);
    }
    lines.push(``);
    lines.push(`📊 *Por categoria:*`);
    const byCat: Record<string, number> = {};
    for (const e of project.expenses) byCat[e.category] = (byCat[e.category] ?? 0) + e.amount;
    Object.entries(byCat).sort((a, b) => b[1] - a[1]).forEach(([cat, val]) => {
      lines.push(`  • ${cat}: ${formatBRL(val)}`);
    });
    lines.push(``);
    lines.push(`_Gerado em ${new Date().toLocaleDateString("pt-BR")}_`);
    navigator.clipboard.writeText(lines.join("\n")).then(() => {
      toast.success("Resumo copiado! Cole no WhatsApp.");
    }).catch(() => {
      toast.error("Não foi possível copiar.");
    });
  };

  const handleExportCSV = () => {
    if (project.expenses.length === 0) {
      toast.error("Nenhum gasto para exportar.");
      return;
    }
    downloadCSV(
      `${project.name.replace(/\s+/g, "_")}_gastos.csv`,
      ["Data", "Descrição", "Categoria", "Funcionário", "NF", "Observações", "Status", "Valor (R$)"],
      project.expenses.map((e) => [
        formatDate(e.date),
        e.description,
        e.category,
        e.employeeName ?? "",
        e.invoiceNumber ?? "",
        e.notes ?? "",
        e.paid ? "Pago" : "Pendente",
        amountToCSV(e.amount),
      ]),
    );
    toast.success("CSV exportado!");
  };

  const biggestExpense = project.expenses.reduce(
    (max, e) => (e.amount > max ? e.amount : max),
    0,
  );

  const paidTotal = useMemo(
    () => project.expenses.filter((e) => e.paid).reduce((s, e) => s + e.amount, 0),
    [project.expenses],
  );
  const pendingTotal = total - paidTotal;

  const deadlineBadge = useMemo(() => {
    if (daysLeft === null) return null;
    if (daysLeft < 0) return { label: `${Math.abs(daysLeft)}d atrasado`, cls: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400" };
    if (daysLeft === 0) return { label: "Entrega hoje!", cls: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400" };
    if (daysLeft <= 7) return { label: `${daysLeft}d restantes`, cls: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400" };
    return { label: `${daysLeft}d restantes`, cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400" };
  }, [daysLeft]);

  return (
    <div className="min-h-screen p-4 pb-24 md:p-8 md:pb-10 space-y-6">
      {/* Print-only header */}
      <div className="hidden print-only mb-6 border-b-2 border-gray-300 pb-4">
        {settings.companyName && (
          <p className="text-lg font-black text-gray-900">{settings.companyName}</p>
        )}
        <p className="text-2xl font-black text-gray-900">{project.name}</p>
        <p className="text-sm text-gray-600">
          Cliente: {project.clientName}
          {project.address && ` · ${project.address}`}
        </p>
        <p className="text-xs text-gray-400 mt-1">
          Impresso em {new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
        </p>
      </div>

      {/* Top bar */}
      <div className="flex items-center justify-between gap-3 no-print">
        <Button
          variant="ghost"
          onClick={onBack}
          className="gap-2 rounded-xl font-bold text-muted-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Button>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleShare}
            className="gap-2 rounded-xl font-bold"
            title="Copiar resumo para WhatsApp"
          >
            <Share2 className="h-4 w-4" />
            <span className="hidden sm:inline">Compartilhar</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => window.print()}
            className="gap-2 rounded-xl font-bold"
            title="Imprimir relatório"
          >
            <Printer className="h-4 w-4" />
            <span className="hidden sm:inline">Imprimir</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => { setImportOpen(true); setImportText(""); setImportPreview(null); }}
            className="gap-2 rounded-xl font-bold"
            title="Importar gastos do CSV"
          >
            <Upload className="h-4 w-4" />
            <span className="hidden sm:inline">Importar</span>
          </Button>
          <Button
            variant="outline"
            onClick={handleExportCSV}
            className="gap-2 rounded-xl font-bold"
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">CSV</span>
          </Button>
          <EditProjectDialog
            project={project}
            open={editProjectOpen}
            onOpenChange={setEditProjectOpen}
          />
        </div>
      </div>

      {/* Project header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-1 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                  <StatusBadge status={project.status} />
                  <ChevronDown className="h-3 w-3 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="rounded-xl">
                {PROJECT_STATUSES.map((s) => (
                  <DropdownMenuItem
                    key={s}
                    className="font-medium"
                    onSelect={() => { updateProject(project.id, { status: s }); toast.success(`Status: ${s}`); }}
                  >
                    {s === project.status ? `✓ ${s}` : s}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            {deadlineBadge && (
              <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold", deadlineBadge.cls)}>
                <Clock className="h-2.5 w-2.5" />
                {deadlineBadge.label}
              </span>
            )}
          </div>
          <h1 className="text-3xl font-black tracking-tight text-foreground md:text-4xl">
            {project.name}
          </h1>
          <p className="text-base font-medium text-muted-foreground">
            Cliente:{" "}
            <span className="font-bold text-foreground">{project.clientName}</span>
          </p>
          {/* Meta info row */}
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs font-medium text-muted-foreground">
            {project.clientPhone && (
              <span className="flex items-center gap-1">
                <Phone className="h-3 w-3" /> {project.clientPhone}
              </span>
            )}
            {project.address && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" /> {project.address}
              </span>
            )}
            {project.startDate && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Início: {formatDate(project.startDate + "T12:00:00")}
              </span>
            )}
            {project.deadline && (
              <span className="flex items-center gap-1">
                <AlertTriangle className={cn("h-3 w-3", daysLeft !== null && daysLeft < 0 ? "text-red-500" : daysLeft !== null && daysLeft <= 7 ? "text-amber-500" : "")} />
                Prazo: {formatDate(project.deadline + "T12:00:00")}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-col items-start gap-1 rounded-2xl border bg-primary/5 px-6 py-4 sm:items-end">
          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            Total Gasto
          </span>
          <span className="text-3xl font-black tabular-nums text-primary">
            {formatBRL(total)}
          </span>
          {project.budget && (
            <span className="text-xs font-semibold text-muted-foreground">
              de {formatBRL(project.budget)} orçados
            </span>
          )}
          {project.budget && total > 0 && (
            <span className={cn(
              "text-xs font-bold",
              total > project.budget ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"
            )}>
              {total <= project.budget
                ? `${formatBRL(project.budget - total)} disponíveis`
                : `${formatBRL(total - project.budget)} acima do orçamento`}
            </span>
          )}
        </div>
      </div>

      {/* Budget progress */}
      {project.budget && <BudgetProgress spent={total} budget={project.budget} />}

      {/* Deadline timeline progress */}
      {project.startDate && project.deadline && (() => {
        const start = new Date(project.startDate + "T00:00:00").getTime();
        const end = new Date(project.deadline + "T00:00:00").getTime();
        const now = Date.now();
        const elapsed = Math.max(0, now - start);
        const total = end - start;
        const pct = total > 0 ? Math.min(Math.round((elapsed / total) * 100), 100) : 0;
        const done = now > end;
        return (
          <div className="rounded-xl border bg-card px-4 py-3 shadow-sm">
            <div className="mb-1.5 flex items-center justify-between text-xs font-bold text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Progresso do Prazo
              </span>
              <span className={cn(done && project.status !== "Concluído" ? "text-red-500" : "text-foreground")}>
                {pct}% decorrido
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  done && project.status !== "Concluído"
                    ? "bg-red-500"
                    : pct >= 80
                    ? "bg-amber-500"
                    : "bg-emerald-500",
                )}
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="mt-1 flex justify-between text-[10px] font-medium text-muted-foreground">
              <span>{formatDate(project.startDate + "T12:00:00")}</span>
              <span>{formatDate(project.deadline + "T12:00:00")}</span>
            </div>
          </div>
        );
      })()}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatsCard
          compact
          title="Total Gasto"
          value={formatBRL(total)}
          icon={DollarSign}
          iconClassName="bg-primary/10 text-primary"
        />
        <StatsCard
          compact
          title="Orçamento"
          value={project.budget ? formatBRL(project.budget) : "—"}
          icon={TrendingUp}
          iconClassName="bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400"
          hint={
            project.budget
              ? `${Math.round((total / project.budget) * 100)}% utilizado`
              : "Não definido"
          }
        />
        <StatsCard
          compact
          title="Lançamentos"
          value={String(project.expenses.length)}
          icon={Hash}
          iconClassName="bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-400"
          hint={
            project.expenses.length > 0
              ? `Ticket médio ${formatBRL(total / project.expenses.length)}`
              : undefined
          }
        />
        <StatsCard
          compact
          title="Maior Gasto"
          value={biggestExpense > 0 ? formatBRL(biggestExpense) : "—"}
          icon={TriangleAlert}
          iconClassName="bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400"
        />
      </div>

      {/* Completion percentage */}
      {project.completionPct !== undefined && project.completionPct > 0 && (
        <div className="rounded-xl border bg-card px-4 py-3 shadow-sm">
          <div className="mb-1.5 flex items-center justify-between text-xs font-bold text-muted-foreground">
            <span>Conclusão Física</span>
            <span className={cn(
              "font-black",
              project.completionPct >= 100 ? "text-emerald-600 dark:text-emerald-400"
              : project.completionPct >= 75 ? "text-primary"
              : "text-foreground"
            )}>
              {project.completionPct}%
            </span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-700",
                project.completionPct >= 100 ? "bg-emerald-500"
                : project.completionPct >= 75 ? "bg-primary"
                : "bg-primary/70"
              )}
              style={{ width: `${project.completionPct}%` }}
            />
          </div>
        </div>
      )}

      {/* Paid / Pending summary */}
      {project.expenses.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-3 rounded-xl border bg-emerald-500/5 px-4 py-3">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Pago</p>
              <p className="text-sm font-black tabular-nums text-foreground">{formatBRL(paidTotal)}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl border bg-amber-500/5 px-4 py-3">
            <Circle className="h-5 w-5 shrink-0 text-amber-500" />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">Pendente</p>
              <p className="text-sm font-black tabular-nums text-foreground">{formatBRL(pendingTotal)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="expenses">
        <TabsList className="rounded-xl border bg-muted/60 p-1 no-print">
          <TabsTrigger
            value="expenses"
            className="gap-2 rounded-lg font-bold data-[state=active]:bg-card data-[state=active]:shadow-sm"
          >
            <List className="h-4 w-4" />
            Gastos ({project.expenses.length})
          </TabsTrigger>
          <TabsTrigger
            value="analysis"
            className="gap-2 rounded-lg font-bold data-[state=active]:bg-card data-[state=active]:shadow-sm"
          >
            <BarChart3 className="h-4 w-4" />
            Análise
          </TabsTrigger>
          <TabsTrigger
            value="notes"
            className="gap-2 rounded-lg font-bold data-[state=active]:bg-card data-[state=active]:shadow-sm"
          >
            <FileText className="h-4 w-4" />
            Notas
          </TabsTrigger>
        </TabsList>

        {/* ── Expenses tab ──────────────────────────────────── */}
        <TabsContent value="expenses" className="mt-4 space-y-4">
          {(expenseSearch || expenseCategoryFilter !== "all" || expensePaidFilter !== "all" || expenseDateFrom || expenseDateTo) && (
            <div className="flex items-center gap-2 rounded-xl border border-dashed border-primary/30 bg-primary/5 px-3 py-2 no-print">
              <span className="text-xs font-bold text-primary">
                {sortedExpenses.length} resultado{sortedExpenses.length !== 1 ? "s" : ""} filtrado{sortedExpenses.length !== 1 ? "s" : ""}
              </span>
              <button
                onClick={() => { setExpenseSearch(""); setExpenseCategoryFilter("all"); setExpensePaidFilter("all"); setExpenseDateFrom(""); setExpenseDateTo(""); }}
                className="ml-auto flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-3 w-3" /> Limpar filtros
              </button>
            </div>
          )}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between no-print">
            <div className="flex flex-1 gap-2">
              <div className="relative flex-1 max-w-xs">
                <Receipt className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar gasto…"
                  value={expenseSearch}
                  onChange={(e) => setExpenseSearch(e.target.value)}
                  className="h-9 rounded-xl border-2 pl-9 text-sm font-medium"
                />
              </div>
              <Select
                value={expenseCategoryFilter}
                onValueChange={(v) => setExpenseCategoryFilter(v as Category | "all")}
              >
                <SelectTrigger className="h-9 w-36 rounded-xl border-2 text-xs font-semibold">
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="all" className="font-semibold text-xs">Todas</SelectItem>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c} className="font-medium text-xs">{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={() => setExpenseDialog({ open: true, mode: "add" })}
              className="gap-2 rounded-xl font-bold shadow-md shadow-primary/20"
            >
              <Plus className="h-4 w-4" /> Registrar Gasto
              <kbd className="ml-1 hidden rounded border border-primary-foreground/30 bg-primary-foreground/10 px-1.5 py-0.5 text-[10px] font-bold sm:inline">N</kbd>
            </Button>
          </div>

          {/* Paid filter pills + date range */}
          {project.expenses.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 no-print">
              {(["all", "pending", "paid"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setExpensePaidFilter(v)}
                  className={cn(
                    "rounded-lg px-3 py-1 text-xs font-bold transition-all",
                    expensePaidFilter === v
                      ? v === "paid"
                        ? "bg-emerald-500 text-white"
                        : v === "pending"
                        ? "bg-amber-500 text-white"
                        : "bg-primary text-primary-foreground"
                      : "border bg-card text-muted-foreground hover:bg-accent",
                  )}
                >
                  {v === "all" ? "Todos" : v === "paid" ? "Pagos" : "Pendentes"}
                </button>
              ))}
              <div className="ml-auto flex flex-wrap items-center gap-1.5">
                {[
                  { label: "Este mês", action: () => { const n = new Date(); setExpenseDateFrom(`${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,"0")}-01`); setExpenseDateTo(n.toISOString().slice(0,10)); } },
                  { label: "Mês ant.", action: () => { const n = new Date(); const p = new Date(n.getFullYear(), n.getMonth()-1, 1); const l = new Date(n.getFullYear(), n.getMonth(), 0); setExpenseDateFrom(p.toISOString().slice(0,10)); setExpenseDateTo(l.toISOString().slice(0,10)); } },
                ].map(({ label, action }) => (
                  <button key={label} onClick={action} className="rounded-lg border px-2 py-0.5 text-[10px] font-bold text-muted-foreground transition-all hover:border-primary/50 hover:bg-primary/5 hover:text-primary">
                    {label}
                  </button>
                ))}
                <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <Input
                  type="date"
                  value={expenseDateFrom}
                  onChange={(e) => setExpenseDateFrom(e.target.value)}
                  className="h-8 w-36 rounded-lg border-2 text-xs font-medium"
                  title="Data inicial"
                />
                <span className="text-xs text-muted-foreground">–</span>
                <Input
                  type="date"
                  value={expenseDateTo}
                  onChange={(e) => setExpenseDateTo(e.target.value)}
                  min={expenseDateFrom}
                  className="h-8 w-36 rounded-lg border-2 text-xs font-medium"
                  title="Data final"
                />
                {(expenseDateFrom || expenseDateTo) && (
                  <button
                    onClick={() => { setExpenseDateFrom(""); setExpenseDateTo(""); }}
                    className="rounded-lg px-2 py-1 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
                    title="Limpar datas"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          )}

          {project.expenses.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title="Nenhum gasto registrado"
              description='Clique em "Registrar Gasto" para adicionar o primeiro lançamento.'
            />
          ) : (
            <div className="overflow-x-auto rounded-2xl border bg-card shadow-sm">
              <Table>
                <TableHeader>
                  <TableRow className="border-b-2 bg-muted/40 hover:bg-muted/40">
                    <TableHead className="w-10 pl-4">
                      <button
                        onClick={toggleSelectAll}
                        className={cn(
                          "flex h-5 w-5 items-center justify-center rounded border-2 transition-all",
                          allSelected
                            ? "border-primary bg-primary text-primary-foreground"
                            : someSelected
                            ? "border-primary bg-primary/40"
                            : "border-muted-foreground/30 hover:border-primary/60",
                        )}
                      >
                        {(allSelected || someSelected) && <Check className="h-3 w-3" />}
                      </button>
                    </TableHead>
                    {(
                      [
                        { key: "date" as SortKey, label: "Data" },
                        { key: "description" as SortKey, label: "Descrição" },
                        { key: "category" as SortKey, label: "Categoria" },
                      ] as const
                    ).map(({ key, label }) => (
                      <TableHead
                        key={key}
                        onClick={() => handleSort(key)}
                        className="cursor-pointer select-none text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <span className="flex items-center gap-1">
                          {label} <SortIcon k={key} />
                        </span>
                      </TableHead>
                    ))}
                    <TableHead className="hidden text-[10px] font-black uppercase tracking-widest text-muted-foreground md:table-cell">
                      Func. / NF
                    </TableHead>
                    <TableHead
                      onClick={() => handleSort("amount")}
                      className="cursor-pointer select-none text-right text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <span className="flex items-center justify-end gap-1">
                        Valor <SortIcon k="amount" />
                      </span>
                    </TableHead>
                    <TableHead className="w-20" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedExpenses.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-8 text-center text-sm font-medium italic text-muted-foreground">
                        Nenhum gasto corresponde à busca.
                      </TableCell>
                    </TableRow>
                  ) : (
                    sortedExpenses.map((exp) => (
                      <TableRow
                        key={exp.id}
                        className={cn(
                          "group transition-colors hover:bg-accent/40",
                          selectedExpenses.has(exp.id) && "bg-primary/5",
                        )}
                      >
                        <TableCell className="w-10 pl-4">
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleSelect(exp.id); }}
                            className={cn(
                              "flex h-5 w-5 items-center justify-center rounded border-2 transition-all",
                              selectedExpenses.has(exp.id)
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-muted-foreground/30 hover:border-primary/60",
                            )}
                          >
                            {selectedExpenses.has(exp.id) && <Check className="h-3 w-3" />}
                          </button>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm font-medium text-muted-foreground">
                          {editingDateId === exp.id ? (
                            <input
                              type="date"
                              autoFocus
                              defaultValue={isoToDateInput(exp.date)}
                              onKeyDown={(e) => { if (e.key === "Escape") setEditingDateId(null); }}
                              onChange={(e) => {
                                if (e.target.value) {
                                  updateExpense(project.id, exp.id, { ...exp, date: dateInputToISO(e.target.value) });
                                  setEditingDateId(null);
                                }
                              }}
                              onBlur={() => setEditingDateId(null)}
                              className="rounded-lg border-2 border-primary bg-card px-2 py-1 text-xs font-bold text-foreground outline-none"
                            />
                          ) : (() => {
                            const { label, full } = formatRelativeDate(exp.date);
                            return (
                              <span
                                className="cursor-pointer hover:text-primary transition-colors"
                                title={`${full} — Clique para editar`}
                                onClick={() => setEditingDateId(exp.id)}
                              >
                                {label}
                              </span>
                            );
                          })()}
                        </TableCell>
                        <TableCell className="max-w-[200px]">
                          {editingDescId === exp.id ? (
                            <input
                              autoFocus
                              value={descDraft}
                              onChange={(e) => setDescDraft(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  if (!descDraft.trim()) { toast.error("Descrição não pode ser vazia"); return; }
                                  updateExpense(project.id, exp.id, { ...exp, description: descDraft.trim() });
                                  setEditingDescId(null);
                                } else if (e.key === "Escape") {
                                  setEditingDescId(null);
                                }
                              }}
                              onBlur={() => {
                                if (descDraft.trim() && descDraft.trim() !== exp.description) {
                                  updateExpense(project.id, exp.id, { ...exp, description: descDraft.trim() });
                                }
                                setEditingDescId(null);
                              }}
                              className="w-full rounded-lg border-2 border-primary bg-card px-2 py-1 text-sm font-bold text-foreground outline-none"
                            />
                          ) : (
                            <p
                              className="truncate font-bold text-foreground cursor-pointer hover:text-primary transition-colors"
                              title="Duplo clique para editar"
                              onDoubleClick={() => { setEditingDescId(exp.id); setDescDraft(exp.description); }}
                            >
                              {exp.description}
                            </p>
                          )}
                          {exp.notes && (
                            <p className="truncate text-[11px] text-muted-foreground italic">
                              {exp.notes}
                            </p>
                          )}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu
                            open={editingCategoryId === exp.id}
                            onOpenChange={(open) => setEditingCategoryId(open ? exp.id : null)}
                          >
                            <DropdownMenuTrigger asChild>
                              <button
                                title="Clique para mudar categoria"
                                className="rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                              >
                                <CategoryBadge category={exp.category} />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="rounded-xl max-h-64 overflow-y-auto">
                              {CATEGORIES.map((cat) => (
                                <DropdownMenuItem
                                  key={cat}
                                  className={cn("gap-2 text-xs font-medium", cat === exp.category && "font-black")}
                                  onSelect={() => {
                                    if (cat !== exp.category) {
                                      updateExpense(project.id, exp.id, { ...exp, category: cat });
                                    }
                                    setEditingCategoryId(null);
                                  }}
                                >
                                  {cat === exp.category ? `✓ ${cat}` : cat}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <div className="text-sm text-muted-foreground">
                            {exp.employeeName && <p className="font-medium">{exp.employeeName}</p>}
                            {editingNFId === exp.id ? (
                              <input
                                autoFocus
                                value={nfDraft}
                                placeholder="Ex: NF-1234"
                                onChange={(e) => setNfDraft(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    updateExpense(project.id, exp.id, { ...exp, invoiceNumber: nfDraft.trim() || undefined });
                                    setEditingNFId(null);
                                  } else if (e.key === "Escape") {
                                    setEditingNFId(null);
                                  }
                                }}
                                onBlur={() => {
                                  if (nfDraft.trim() !== (exp.invoiceNumber ?? "")) {
                                    updateExpense(project.id, exp.id, { ...exp, invoiceNumber: nfDraft.trim() || undefined });
                                  }
                                  setEditingNFId(null);
                                }}
                                className="w-24 rounded border-2 border-primary bg-card px-1.5 py-0.5 text-[11px] font-mono text-foreground outline-none"
                              />
                            ) : (
                              <p
                                className="cursor-pointer text-[11px] font-mono hover:text-primary transition-colors"
                                title="Clique para editar NF"
                                onClick={() => { setEditingNFId(exp.id); setNfDraft(exp.invoiceNumber ?? ""); }}
                              >
                                {exp.invoiceNumber ?? <span className="text-muted-foreground/40 text-[10px]">+ NF</span>}
                              </p>
                            )}
                            {!exp.employeeName && !exp.invoiceNumber && editingNFId !== exp.id && (
                              <p
                                className="cursor-pointer text-[10px] text-muted-foreground/40 hover:text-primary transition-colors"
                                onClick={() => { setEditingNFId(exp.id); setNfDraft(""); }}
                              >
                                + NF
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {editingAmountId === exp.id ? (
                            <input
                              autoFocus
                              value={amountDraft}
                              onChange={(e) => setAmountDraft(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  const amt = parseAmount(amountDraft);
                                  if (amt === null || amt <= 0) { toast.error("Valor inválido"); return; }
                                  updateExpense(project.id, exp.id, { ...exp, amount: amt });
                                  setEditingAmountId(null);
                                  toast.success("Valor atualizado!");
                                } else if (e.key === "Escape") {
                                  setEditingAmountId(null);
                                }
                              }}
                              onBlur={() => setEditingAmountId(null)}
                              className="w-28 rounded-lg border-2 border-primary bg-card px-2 py-1 text-right text-sm font-black tabular-nums text-foreground outline-none"
                            />
                          ) : (
                            <span
                              className="cursor-pointer font-black tabular-nums text-foreground hover:text-primary transition-colors"
                              title="Clique para editar o valor"
                              onClick={() => { setEditingAmountId(exp.id); setAmountDraft(String(exp.amount).replace(".", ",")); }}
                            >
                              {formatBRL(exp.amount)}
                            </span>
                          )}
                          <p className={cn("text-[10px] font-bold", exp.paid ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400 sm:opacity-0 sm:group-hover:opacity-100 sm:transition-opacity")}>
                            {exp.paid ? "pago" : total > 0 ? `${((exp.amount / total) * 100).toFixed(1)}%` : "pendente"}
                          </p>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100">
                            <Button
                              variant="ghost"
                              size="icon"
                              className={cn(
                                "h-8 w-8 rounded-full",
                                exp.paid
                                  ? "text-emerald-600 hover:bg-emerald-500/10"
                                  : "text-muted-foreground hover:bg-amber-500/10 hover:text-amber-600",
                              )}
                              onClick={() => toggleExpensePaid(project.id, exp.id)}
                              title={exp.paid ? "Marcar como pendente" : "Marcar como pago"}
                            >
                              {exp.paid
                                ? <CheckCircle2 className="h-3.5 w-3.5" />
                                : <Circle className="h-3.5 w-3.5" />
                              }
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 rounded-full"
                              onClick={() =>
                                setExpenseDialog({ open: true, mode: "edit", data: exp })
                              }
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 rounded-full text-muted-foreground hover:text-primary"
                              onClick={() => {
                                duplicateExpense(project.id, exp.id);
                                toast.success("Gasto duplicado!");
                              }}
                              title="Duplicar gasto"
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </Button>
                            {allProjects.filter((p) => p.id !== project.id).length > 0 && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 rounded-full text-muted-foreground hover:text-primary"
                                    title="Mover para outra obra"
                                  >
                                    <ArrowUp className="h-3.5 w-3.5 rotate-45" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="rounded-xl max-h-48 overflow-y-auto">
                                  <DropdownMenuItem disabled className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                                    Mover para…
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  {allProjects.filter((p) => p.id !== project.id).map((p) => (
                                    <DropdownMenuItem
                                      key={p.id}
                                      className="text-xs font-medium"
                                      onSelect={() => {
                                        moveExpense(project.id, p.id, exp.id);
                                        toast.success(`Gasto movido para "${p.name}"!`);
                                      }}
                                    >
                                      {p.name}
                                    </DropdownMenuItem>
                                  ))}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                            <ConfirmDialog
                              trigger={
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              }
                              title="Excluir este gasto?"
                              description={`"${exp.description}" — ${formatBRL(exp.amount)}`}
                              confirmLabel="Excluir"
                              onConfirm={() => {
                                const snapshot = exp;
                                deleteExpense(project.id, exp.id);
                                toast.success("Gasto excluído.", {
                                  action: { label: "Desfazer", onClick: () => restoreExpense(project.id, snapshot) },
                                  duration: 5000,
                                });
                              }}
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>

              <div className="flex items-center justify-between border-t bg-muted/30 px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    {expenseSearch
                      ? `${sortedExpenses.length} de ${project.expenses.length}`
                      : `${project.expenses.length} lançamento${project.expenses.length !== 1 ? "s" : ""}`}
                  </span>
                  {pendingTotal > 0 && expensePaidFilter !== "paid" && selectedExpenses.size === 0 && (
                    <button
                      onClick={() => {
                        const pendingIds = project.expenses.filter((e) => !e.paid).map((e) => e.id);
                        bulkUpdateExpensesPaid(project.id, pendingIds, true);
                        toast.success(`${pendingIds.length} gasto${pendingIds.length !== 1 ? "s" : ""} marcado${pendingIds.length !== 1 ? "s" : ""} como pago!`);
                      }}
                      className="flex items-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-2.5 py-1 text-[11px] font-bold text-emerald-600 transition-all hover:bg-emerald-500/15 dark:text-emerald-400"
                    >
                      <CheckCircle2 className="h-3 w-3" /> Marcar todos como pago
                    </button>
                  )}
                </div>
                <span className="text-base font-black tabular-nums text-foreground">
                  {formatBRL(
                    expenseSearch
                      ? sortedExpenses.reduce((s, e) => s + e.amount, 0)
                      : total,
                  )}
                </span>
              </div>
            </div>
          )}
        </TabsContent>

        {/* ── Analysis tab ──────────────────────────────────── */}
        <TabsContent value="analysis" className="mt-4">
          {categoryChart.length === 0 ? (
            <EmptyState
              icon={BarChart3}
              title="Sem dados para analisar"
              description="Registre gastos para ver a distribuição por categoria."
            />
          ) : (
            <div className="space-y-6">
              {/* Executive summary */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { label: "Ticket Médio", value: formatBRL(total / project.expenses.length) },
                  { label: "Maior Gasto", value: formatBRL(biggestExpense) },
                  { label: "Com NF", value: `${project.expenses.filter(e => e.invoiceNumber).length}/${project.expenses.length}` },
                  { label: "Categorias", value: String(new Set(project.expenses.map(e => e.category)).size) },
                ].map(({ label, value }) => (
                  <div key={label} className="rounded-xl border bg-card px-4 py-3 text-center shadow-sm">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
                    <p className="mt-0.5 text-base font-black tabular-nums text-foreground">{value}</p>
                  </div>
                ))}
              </div>

              {timelineData.length >= 2 && (
                <div className="rounded-2xl border bg-card p-6 shadow-sm">
                  <h3 className="mb-4 font-bold text-foreground">
                    Evolução do Gasto Acumulado
                  </h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={timelineData} margin={{ left: 8, right: 8 }}>
                      <defs>
                        <linearGradient id="cumulativeGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={CHART_PRIMARY} stopOpacity={0.25} />
                          <stop offset="95%" stopColor={CHART_PRIMARY} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke="var(--color-border)"
                      />
                      <XAxis
                        dataKey="date"
                        tick={{
                          fill: "var(--color-muted-foreground)",
                          fontSize: 11,
                          fontWeight: 600,
                        }}
                        tickLine={false}
                        axisLine={false}
                        interval="preserveStartEnd"
                      />
                      <YAxis
                        tickFormatter={(v) =>
                          new Intl.NumberFormat("pt-BR", { notation: "compact" }).format(v)
                        }
                        tick={{
                          fill: "var(--color-muted-foreground)",
                          fontSize: 11,
                          fontWeight: 600,
                        }}
                        tickLine={false}
                        axisLine={false}
                        width={64}
                      />
                      <Tooltip
                        contentStyle={chartTooltipStyle}
                        formatter={(v: number, name: string) => [
                          formatBRL(v),
                          name === "cumulative" ? "Acumulado" : "Lançamento",
                        ]}
                        cursor={{
                          stroke: CHART_PRIMARY,
                          strokeWidth: 1,
                          strokeDasharray: "4 4",
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="cumulative"
                        stroke={CHART_PRIMARY}
                        strokeWidth={2.5}
                        fill="url(#cumulativeGrad)"
                        dot={{ fill: CHART_PRIMARY, r: 3, strokeWidth: 0 }}
                        activeDot={{ fill: CHART_PRIMARY, r: 5, strokeWidth: 0 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}

              {monthlyData.length >= 2 && (
                <div className="rounded-2xl border bg-card p-6 shadow-sm">
                  <h3 className="mb-4 font-bold text-foreground">Gastos por Mês</h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={monthlyData} margin={{ left: 8, right: 8, top: 4, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                      <XAxis
                        dataKey="month"
                        tick={{ fill: "var(--color-muted-foreground)", fontSize: 11, fontWeight: 700 }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        tickFormatter={(v) => new Intl.NumberFormat("pt-BR", { notation: "compact" }).format(v)}
                        tick={{ fill: "var(--color-muted-foreground)", fontSize: 11, fontWeight: 600 }}
                        tickLine={false}
                        axisLine={false}
                        width={64}
                      />
                      <Tooltip
                        contentStyle={chartTooltipStyle}
                        formatter={(v: number) => [formatBRL(v), ""]}
                        cursor={{ fill: "var(--color-accent)" }}
                      />
                      <Legend
                        formatter={(value) => (
                          <span style={{ fontSize: 12, fontWeight: 600 }}>
                            {value === "pago" ? "Pago" : "Pendente"}
                          </span>
                        )}
                      />
                      <Bar dataKey="pago" name="pago" stackId="a" fill="#10b981" maxBarSize={36} />
                      <Bar dataKey="pendente" name="pendente" stackId="a" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={36} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {paidVsPendingByCategory.length > 0 && (
                <div className="rounded-2xl border bg-card p-6 shadow-sm">
                  <h3 className="mb-4 font-bold text-foreground">Pago vs Pendente por Categoria</h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={paidVsPendingByCategory} margin={{ left: 8, right: 8, top: 4, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                      <XAxis
                        dataKey="name"
                        tick={{ fill: "var(--color-muted-foreground)", fontSize: 11, fontWeight: 700 }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        tickFormatter={(v) =>
                          new Intl.NumberFormat("pt-BR", { notation: "compact" }).format(v)
                        }
                        tick={{ fill: "var(--color-muted-foreground)", fontSize: 11, fontWeight: 600 }}
                        tickLine={false}
                        axisLine={false}
                        width={64}
                      />
                      <Tooltip
                        contentStyle={chartTooltipStyle}
                        formatter={(v: number) => [formatBRL(v), ""]}
                        cursor={{ fill: "var(--color-accent)" }}
                      />
                      <Legend
                        formatter={(value) => (
                          <span style={{ fontSize: 12, fontWeight: 600 }}>
                            {value === "pago" ? "Pago" : "Pendente"}
                          </span>
                        )}
                      />
                      <Bar dataKey="pago" name="pago" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={32} />
                      <Bar dataKey="pendente" name="pendente" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={32} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {budgetForecast && (
                <div className={cn(
                  "rounded-2xl border p-6 shadow-sm",
                  budgetForecast.withinDeadline === false
                    ? "border-red-200 bg-red-500/5 dark:border-red-500/30"
                    : "bg-card"
                )}>
                  <h3 className="mb-4 font-bold text-foreground">Previsão Orçamentária</h3>
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Ritmo diário</p>
                      <p className="text-lg font-black tabular-nums text-foreground">{formatBRL(budgetForecast.dailyRate)}/dia</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Budget esgota em</p>
                      <p className={cn("text-lg font-black tabular-nums", budgetForecast.withinDeadline === false ? "text-red-600 dark:text-red-400" : "text-foreground")}>
                        {budgetForecast.daysToExhaust}d ({budgetForecast.exhaustDate.toLocaleDateString("pt-BR")})
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Situação</p>
                      <p className={cn("text-sm font-black", budgetForecast.withinDeadline === null ? "text-muted-foreground" : budgetForecast.withinDeadline ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400")}>
                        {budgetForecast.withinDeadline === null ? "Sem prazo definido" : budgetForecast.withinDeadline ? "✓ Dentro do prazo" : "⚠ Estoura antes do prazo"}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {employeeStats.length > 0 && (
                <div className="rounded-2xl border bg-card p-6 shadow-sm">
                  <h3 className="mb-4 font-bold text-foreground">Gastos por Funcionário</h3>
                  <div className="space-y-3">
                    {employeeStats.map((emp) => {
                      const pct = total > 0 ? (emp.total / total) * 100 : 0;
                      return (
                        <div key={emp.name} className="space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-bold text-foreground">{emp.name}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] text-muted-foreground">{emp.count} lançamento{emp.count !== 1 ? "s" : ""}</span>
                              <span className="text-sm font-black tabular-nums text-foreground">{formatBRL(emp.total)}</span>
                            </div>
                          </div>
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full rounded-full bg-primary transition-all duration-500"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* Donut */}
                <div className="rounded-2xl border bg-card p-6 shadow-sm">
                  <h3 className="mb-4 font-bold text-foreground">
                    Distribuição por Categoria
                  </h3>
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie
                        data={categoryChart}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={65}
                        outerRadius={105}
                        paddingAngle={3}
                        label={({ percent }) =>
                          percent > 0.05 ? `${(percent * 100).toFixed(0)}%` : ""
                        }
                        labelLine={false}
                      >
                        {categoryChart.map((entry) => (
                          <Cell
                            key={entry.name}
                            fill={
                              CATEGORY_COLORS[entry.name as keyof typeof CATEGORY_COLORS] ??
                              "#94a3b8"
                            }
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={chartTooltipStyle}
                        formatter={(v: number) => [formatBRL(v), ""]}
                      />
                      <Legend
                        formatter={(value) => (
                          <span style={{ fontSize: 12, fontWeight: 600 }}>{value}</span>
                        )}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Breakdown */}
                <div className="rounded-2xl border bg-card p-6 shadow-sm">
                  <h3 className="mb-4 font-bold text-foreground">Detalhamento</h3>
                  <div className="space-y-3">
                    {categoryChart.map((entry) => {
                      const pct = total > 0 ? (entry.value / total) * 100 : 0;
                      const color =
                        CATEGORY_COLORS[entry.name as keyof typeof CATEGORY_COLORS] ?? "#94a3b8";
                      const count = project.expenses.filter(
                        (e) => e.category === entry.name,
                      ).length;
                      return (
                        <div key={entry.name} className="space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <div
                                className="h-2.5 w-2.5 shrink-0 rounded-full"
                                style={{ backgroundColor: color }}
                              />
                              <span className="text-sm font-bold text-foreground">
                                {entry.name}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                ({count} {count === 1 ? "item" : "itens"})
                              </span>
                            </div>
                            <span className="text-sm font-black tabular-nums text-foreground">
                              {formatBRL(entry.value)}
                            </span>
                          </div>
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{ width: `${pct}%`, backgroundColor: color }}
                            />
                          </div>
                          <p className="text-right text-[10px] font-bold text-muted-foreground">
                            {pct.toFixed(1)}%
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}
        </TabsContent>

        {/* ── Notes tab ─────────────────────────────────────── */}
        <TabsContent value="notes" className="mt-4">
          <NotesTab project={project} />
        </TabsContent>
      </Tabs>

      {/* Delete project */}
      <div className="border-t pt-6 no-print">
        <ConfirmDialog
          trigger={
            <Button
              variant="ghost"
              className="gap-2 rounded-xl border border-destructive/30 font-bold text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" /> Excluir Obra
            </Button>
          }
          title={`Excluir "${project.name}"?`}
          description="Todos os gastos registrados serão perdidos permanentemente."
          confirmLabel="Excluir Obra"
          onConfirm={() => {
            const snapshot = project;
            deleteProject(project.id);
            toast.success("Obra excluída.", {
              action: { label: "Desfazer", onClick: () => restoreProject(snapshot) },
              duration: 5000,
            });
            window.history.back();
          }}
        />
      </div>

      {/* Bulk action bar */}
      {selectedExpenses.size > 0 && (
        <div className="fixed bottom-20 inset-x-4 z-50 md:bottom-6 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-max no-print">
          <div className="flex items-center gap-2 rounded-2xl border bg-card px-4 py-3 shadow-2xl shadow-black/20">
            <span className="text-sm font-black text-foreground shrink-0">
              {selectedExpenses.size} selecionado{selectedExpenses.size !== 1 ? "s" : ""}
            </span>
            <div className="h-4 w-px bg-border shrink-0" />
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 rounded-xl font-bold text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/10"
              onClick={() => {
                const ids = [...selectedExpenses];
                bulkUpdateExpensesPaid(project.id, ids, true);
                setSelectedExpenses(new Set());
                toast.success(`${ids.length} gasto${ids.length !== 1 ? "s" : ""} marcado${ids.length !== 1 ? "s" : ""} como pago.`);
              }}
            >
              <CheckCircle2 className="h-3.5 w-3.5" /> Pago
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 rounded-xl font-bold text-amber-600 border-amber-500/30 hover:bg-amber-500/10"
              onClick={() => {
                const ids = [...selectedExpenses];
                bulkUpdateExpensesPaid(project.id, ids, false);
                setSelectedExpenses(new Set());
                toast.success(`${ids.length} gasto${ids.length !== 1 ? "s" : ""} marcado${ids.length !== 1 ? "s" : ""} como pendente.`);
              }}
            >
              <Circle className="h-3.5 w-3.5" /> Pendente
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 rounded-xl font-bold text-destructive border-destructive/30 hover:bg-destructive/10"
              onClick={() => {
                const ids = [...selectedExpenses];
                const snapshots = project.expenses.filter((e) => ids.includes(e.id));
                bulkDeleteExpenses(project.id, ids);
                setSelectedExpenses(new Set());
                toast.success(`${ids.length} gasto${ids.length !== 1 ? "s" : ""} excluído${ids.length !== 1 ? "s" : ""}.`, {
                  action: {
                    label: "Desfazer",
                    onClick: () => snapshots.forEach((e) => restoreExpense(project.id, e)),
                  },
                  duration: 5000,
                });
              }}
            >
              <Trash2 className="h-3.5 w-3.5" /> Excluir
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 rounded-xl p-0 text-muted-foreground"
              onClick={() => setSelectedExpenses(new Set())}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* Import expenses dialog */}
      <Dialog open={importOpen} onOpenChange={(v) => { setImportOpen(v); if (!v) { setImportText(""); setImportPreview(null); } }}>
        <DialogContent className="rounded-2xl sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-black">Importar Gastos</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-xs font-medium text-muted-foreground">
              Cole dados de uma planilha (Excel/Numbers) ou CSV. Colunas esperadas:{" "}
              <span className="font-bold text-foreground">Descrição ; Valor ; Categoria ; Func. ; NF ; Obs. ; Status ; Data (YYYY-MM-DD)</span>
            </p>
            <Textarea
              autoFocus
              value={importText}
              onChange={(e) => { setImportText(e.target.value); setImportPreview(null); }}
              placeholder={"Cimento CP-II; 1500; Material\nPedreiro João; 4500; Mão de Obra; João Silva"}
              className="min-h-[120px] rounded-xl border-2 font-mono text-xs resize-none"
            />
            {!importPreview ? (
              <Button
                onClick={handleImportParse}
                disabled={!importText.trim()}
                className="w-full rounded-xl font-bold"
              >
                Validar ({importText.split("\n").filter((l) => l.trim()).length} linha{importText.split("\n").filter((l) => l.trim()).length !== 1 ? "s" : ""})
              </Button>
            ) : (
              <div className="space-y-3">
                <div className="max-h-48 overflow-y-auto space-y-1.5 rounded-xl border bg-muted/30 p-3">
                  {importPreview.map((r, i) => (
                    <div key={i} className={cn("flex items-start gap-2 rounded-lg px-2 py-1.5 text-xs", r.ok ? "bg-emerald-500/10" : "bg-red-500/10")}>
                      <span className={cn("shrink-0 font-black", r.ok ? "text-emerald-600" : "text-red-500")}>
                        {r.ok ? "✓" : "✗"}
                      </span>
                      {r.ok ? (
                        <span className="text-foreground font-medium">
                          {r.desc} — {formatBRL(r.amount)} ({r.category})
                        </span>
                      ) : (
                        <span className="text-red-600 dark:text-red-400 font-medium">
                          {r.line.slice(0, 50)}{r.line.length > 50 ? "…" : ""} — {r.reason}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-bold text-muted-foreground">
                    {importPreview.filter((r) => r.ok).length} válido{importPreview.filter((r) => r.ok).length !== 1 ? "s" : ""}
                    {importPreview.some((r) => !r.ok) && `, ${importPreview.filter((r) => !r.ok).length} com erro`}
                  </span>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setImportPreview(null)} className="rounded-xl font-bold">
                      Editar
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleImportConfirm}
                      disabled={!importPreview.some((r) => r.ok)}
                      className="rounded-xl font-bold"
                    >
                      Importar {importPreview.filter((r) => r.ok).length} gasto{importPreview.filter((r) => r.ok).length !== 1 ? "s" : ""}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Expense form dialog */}
      <ExpenseFormDialog
        open={expenseDialog.open}
        onOpenChange={(open) => setExpenseDialog((s) => ({ ...s, open }))}
        mode={expenseDialog.mode}
        initialData={expenseDialog.data}
        onSave={(data) => {
          if (expenseDialog.mode === "edit" && expenseDialog.data) {
            updateExpense(project.id, expenseDialog.data.id, data);
            toast.success("Gasto atualizado!");
            if (project.budget) {
              const oldAmt = expenseDialog.data.amount;
              const newTotal = total - oldAmt + data.amount;
              if (newTotal > project.budget && total <= project.budget) {
                toast.warning(`⚠️ Orçamento ultrapassado! Total: ${formatBRL(newTotal)} de ${formatBRL(project.budget)}`);
              }
            }
          } else {
            addExpense(project.id, data);
            toast.success("Gasto adicionado!");
            if (project.budget) {
              const newTotal = total + data.amount;
              if (newTotal > project.budget) {
                toast.warning(`⚠️ Orçamento ultrapassado! Total: ${formatBRL(newTotal)} de ${formatBRL(project.budget)}`);
              }
            }
          }
        }}
      />
    </div>
  );
}

/* ── Notes tab ──────────────────────────────────────────── */
function NotesTab({ project }: { project: Project }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(project.notes ?? "");
  const [saved, setSaved] = useState(false);

  const handleSave = (silent = false) => {
    updateProject(project.id, { notes: draft.trim() || undefined });
    setEditing(false);
    if (!silent) toast.success("Notas salvas!");
  };

  const handleAutoSave = () => {
    if (draft.trim() !== (project.notes ?? "")) {
      updateProject(project.id, { notes: draft.trim() || undefined });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
    setEditing(false);
  };

  const handleCancel = () => {
    setDraft(project.notes ?? "");
    setEditing(false);
  };

  return (
    <div className="rounded-2xl border bg-card p-6 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-bold text-foreground">Observações do Projeto</h3>
          {saved && (
            <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-500">
              <Check className="h-3 w-3" /> Salvo
            </span>
          )}
        </div>
        {!editing ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setDraft(project.notes ?? ""); setEditing(true); }}
            className="gap-2 rounded-xl font-bold text-muted-foreground hover:text-foreground"
          >
            <Pencil className="h-3.5 w-3.5" /> Editar
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => handleSave(false)}
              className="gap-1 rounded-xl font-bold"
            >
              <Check className="h-3.5 w-3.5" /> Salvar
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              className="gap-1 rounded-xl font-bold"
            >
              <X className="h-3.5 w-3.5" /> Cancelar
            </Button>
          </div>
        )}
      </div>

      {editing ? (
        <Textarea
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={handleAutoSave}
          placeholder="Adicione observações, instruções especiais, contatos, materiais específicos..."
          className="min-h-[200px] rounded-xl border-2 font-medium resize-none"
        />
      ) : project.notes ? (
        <div className="min-h-[120px] rounded-xl bg-muted/40 p-4 text-sm font-medium text-foreground whitespace-pre-wrap leading-relaxed">
          {project.notes}
        </div>
      ) : (
        <div
          onClick={() => { setDraft(""); setEditing(true); }}
          className="flex min-h-[120px] cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-border text-sm font-medium italic text-muted-foreground hover:border-primary/40 hover:bg-accent/30 hover:text-foreground transition-all"
        >
          Clique para adicionar observações
        </div>
      )}

      {/* Project info summary */}
      <div className="border-t pt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {[
          { label: "Criado em", value: formatDate(project.createdAt) },
          project.startDate && { label: "Início", value: formatDate(project.startDate + "T12:00:00") },
          project.deadline && { label: "Prazo", value: formatDate(project.deadline + "T12:00:00") },
          project.address && { label: "Endereço", value: project.address },
          project.clientPhone && { label: "Telefone", value: project.clientPhone },
        ]
          .filter(Boolean)
          .map((item) => item && (
            <div key={item.label} className="rounded-xl bg-muted/40 px-3 py-2.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                {item.label}
              </p>
              <p className="mt-0.5 text-sm font-semibold text-foreground">{item.value}</p>
            </div>
          ))}
      </div>
    </div>
  );
}

/* ── Edit project dialog ─────────────────────────────────── */
function EditProjectDialog({
  project,
  open,
  onOpenChange,
}: {
  project: Project;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [name, setName] = useState(project.name);
  const [client, setClient] = useState(project.clientName);
  const [clientPhone, setClientPhone] = useState(project.clientPhone ?? "");
  const [address, setAddress] = useState(project.address ?? "");
  const [budgetText, setBudgetText] = useState(project.budget ? String(project.budget) : "");
  const [status, setStatus] = useState<ProjectStatus>(project.status);
  const [startDate, setStartDate] = useState(project.startDate ?? "");
  const [deadline, setDeadline] = useState(project.deadline ?? "");
  const [notes, setNotes] = useState(project.notes ?? "");
  const [completionPct, setCompletionPct] = useState(project.completionPct ?? 0);

  const handleOpen = (v: boolean) => {
    if (v) {
      setName(project.name);
      setClient(project.clientName);
      setClientPhone(project.clientPhone ?? "");
      setAddress(project.address ?? "");
      setBudgetText(project.budget ? String(project.budget) : "");
      setStatus(project.status);
      setStartDate(project.startDate ?? "");
      setDeadline(project.deadline ?? "");
      setNotes(project.notes ?? "");
      setCompletionPct(project.completionPct ?? 0);
    }
    onOpenChange(v);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    let budget: number | undefined;
    if (budgetText.trim()) {
      budget = parseAmount(budgetText) ?? undefined;
      if (budget === undefined) {
        toast.error("Orçamento inválido.");
        return;
      }
    }
    if (deadline && startDate && deadline < startDate) {
      toast.error("O prazo não pode ser anterior ao início.");
      return;
    }
    updateProject(project.id, {
      name: name.trim(),
      clientName: client.trim(),
      clientPhone: clientPhone.trim() || undefined,
      address: address.trim() || undefined,
      budget,
      status,
      startDate: startDate || undefined,
      deadline: deadline || undefined,
      notes: notes.trim() || undefined,
      completionPct: completionPct > 0 ? completionPct : undefined,
    });
    toast.success("Projeto atualizado!");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2 rounded-xl font-bold">
          <Pencil className="h-4 w-4" />
          <span className="hidden sm:inline">Editar</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="rounded-2xl sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-black">Editar Obra</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSave} className="space-y-4 pt-2">
          <EPField label="Nome da Obra" htmlFor="ep-name">
            <Input
              id="ep-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-11 rounded-xl border-2 font-medium"
              required
            />
          </EPField>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <EPField label="Cliente" htmlFor="ep-client">
              <Input
                id="ep-client"
                value={client}
                onChange={(e) => setClient(e.target.value)}
                className="h-11 rounded-xl border-2 font-medium"
                required
              />
            </EPField>
            <EPField label="Telefone" htmlFor="ep-phone">
              <Input
                id="ep-phone"
                type="tel"
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
                placeholder="(11) 99999-9999"
                className="h-11 rounded-xl border-2 font-medium"
              />
            </EPField>
          </div>

          <EPField label="Endereço" htmlFor="ep-address">
            <Input
              id="ep-address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Rua, número, bairro"
              className="h-11 rounded-xl border-2 font-medium"
            />
          </EPField>

          <div className="grid grid-cols-2 gap-4">
            <EPField label="Orçamento (R$)" htmlFor="ep-budget">
              <Input
                id="ep-budget"
                value={budgetText}
                onChange={(e) => setBudgetText(e.target.value)}
                placeholder="Ex: 80.000,00"
                className="h-11 rounded-xl border-2 font-medium"
              />
            </EPField>
            <EPField label="Status" htmlFor="ep-status">
              <Select value={status} onValueChange={(v: ProjectStatus) => setStatus(v)}>
                <SelectTrigger className="h-11 rounded-xl border-2 font-medium">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {PROJECT_STATUSES.map((s) => (
                    <SelectItem key={s} value={s} className="font-medium">
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </EPField>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <EPField label="Início" htmlFor="ep-start">
              <Input
                id="ep-start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-11 rounded-xl border-2 font-medium"
              />
            </EPField>
            <EPField label="Prazo" htmlFor="ep-deadline">
              <Input
                id="ep-deadline"
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="h-11 rounded-xl border-2 font-medium"
              />
            </EPField>
          </div>

          <EPField label="Observações" htmlFor="ep-notes">
            <Textarea
              id="ep-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Anotações, materiais especiais, instruções..."
              className="min-h-[80px] rounded-xl border-2 font-medium resize-none"
            />
          </EPField>

          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Conclusão Física — {completionPct}%
            </Label>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={completionPct}
              onChange={(e) => setCompletionPct(Number(e.target.value))}
              className="w-full accent-primary"
            />
            <div className="flex justify-between text-[10px] font-bold text-muted-foreground">
              <span>0%</span>
              <span>50%</span>
              <span>100%</span>
            </div>
          </div>

          <Button type="submit" className="h-12 w-full rounded-xl font-bold text-base">
            Salvar Alterações
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EPField({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label
        htmlFor={htmlFor}
        className="text-xs font-bold uppercase tracking-wider text-muted-foreground"
      >
        {label}
      </Label>
      {children}
    </div>
  );
}
