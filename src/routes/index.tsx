import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useProjects } from "@/hooks/useProjects";
import { projectTotal, addExpense, deleteProject, restoreProject, updateProject, deadlineDaysLeft, duplicateProject } from "@/store/projects";
import { formatBRL, formatDate, formatRelativeDate } from "@/lib/format";
import { CategoryBadge } from "@/components/CategoryBadge";
import { CATEGORY_COLORS, PROJECT_STATUSES } from "@/lib/categories";
import { chartTooltipStyle, CHART_PRIMARY } from "@/lib/chart";
import { useSettings } from "@/store/settings";
import { AddProjectDialog } from "@/components/AddProjectDialog";
import { ExpenseFormDialog } from "@/components/ExpenseFormDialog";
import { StatsCard } from "@/components/StatsCard";
import { StatusBadge } from "@/components/StatusBadge";
import { BudgetProgress } from "@/components/BudgetProgress";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  HardHat,
  CheckCircle2,
  Trash2,
  Plus,
  BarChart3,
  TriangleAlert,
  CalendarDays,
  Search,
  Clock,
  ChevronDown,
  Activity,
  ArrowRight,
  Copy,
  MoreVertical,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { ProjectStatus } from "@/types";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  component: Dashboard,
});

const STATUS_FILTERS: { label: string; value: ProjectStatus | "all" }[] = [
  { label: "Todas", value: "all" },
  { label: "Em andamento", value: "Em andamento" },
  { label: "Concluído", value: "Concluído" },
  { label: "Pausado", value: "Pausado" },
];

const STATUS_ACCENT: Record<ProjectStatus, string> = {
  "Em andamento": "#3b82f6",
  Concluído: "#10b981",
  Pausado: "#f59e0b",
};

const MONTH_LABELS = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

type SortOption = "recent" | "name" | "spent_desc" | "spent_asc" | "deadline" | "pending_desc" | "completion_desc";

function Dashboard() {
  const { projects } = useProjects();
  const navigate = useNavigate();
  const settings = useSettings();
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | "all">("all");
  const [projectSearch, setProjectSearch] = useState("");
  const [sortOption, setSortOption] = useState<SortOption>("recent");
  const [quickAddProjectId, setQuickAddProjectId] = useState<string | null>(null);

  const stats = useMemo(() => {
    let totalSpent = 0;
    let totalBudget = 0;
    let totalPaid = 0;
    let totalPending = 0;
    let overBudget = 0;
    let active = 0;
    let done = 0;

    for (const p of projects) {
      const spent = projectTotal(p);
      totalSpent += spent;
      if (p.budget) totalBudget += p.budget;
      if (p.budget && spent > p.budget) overBudget++;
      if (p.status === "Em andamento") active++;
      if (p.status === "Concluído") done++;
      for (const e of p.expenses) {
        if (e.paid) totalPaid += e.amount;
        else totalPending += e.amount;
      }
    }
    return { totalSpent, totalBudget, totalPaid, totalPending, overBudget, active, done };
  }, [projects]);

  const categoryData = useMemo(() => {
    const acc: Record<string, number> = {};
    for (const p of projects) {
      for (const e of p.expenses) {
        acc[e.category] = (acc[e.category] ?? 0) + e.amount;
      }
    }
    return Object.entries(acc).map(([name, value]) => ({ name, value }));
  }, [projects]);

  const topProjectsData = useMemo(
    () =>
      projects
        .map((p) => ({ name: p.name, total: projectTotal(p) }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 5),
    [projects],
  );

  const monthStats = useMemo(() => {
    const now = new Date();
    const thisM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const prevD = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevM = `${prevD.getFullYear()}-${String(prevD.getMonth() + 1).padStart(2, "0")}`;
    let thisMonth = 0, lastMonth = 0;
    for (const p of projects) {
      for (const e of p.expenses) {
        const key = e.date.slice(0, 7);
        if (key === thisM) thisMonth += e.amount;
        else if (key === prevM) lastMonth += e.amount;
      }
    }
    const pct = lastMonth > 0 ? Math.round(((thisMonth - lastMonth) / lastMonth) * 100) : null;
    return { thisMonth, lastMonth, pct };
  }, [projects]);

  const recentExpenses = useMemo(() => {
    return projects
      .flatMap((p) => p.expenses.map((e) => ({ ...e, projectName: p.name, projectId: p.id })))
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 5);
  }, [projects]);

  const monthlyData = useMemo(() => {
    const acc = new Map<string, { month: string; value: number; key: string }>();
    for (const p of projects) {
      for (const e of p.expenses) {
        const d = new Date(e.date);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        const label = `${MONTH_LABELS[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`;
        if (!acc.has(key)) acc.set(key, { month: label, value: 0, key });
        acc.get(key)!.value += e.amount;
      }
    }
    return [...acc.values()]
      .sort((a, b) => a.key.localeCompare(b.key))
      .slice(-8)
      .map(({ month, value }) => ({ month, value }));
  }, [projects]);

  const upcomingDeadlines = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return projects
      .filter((p) => p.deadline && p.status !== "Concluído")
      .map((p) => {
        const dl = new Date(p.deadline! + "T00:00:00");
        const days = Math.round((dl.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return { ...p, daysLeft: days };
      })
      .filter((p) => p.daysLeft <= 30)
      .sort((a, b) => a.daysLeft - b.daysLeft)
      .slice(0, 4);
  }, [projects]);

  const filteredProjects = useMemo(() => {
    const q = projectSearch.toLowerCase();
    let list = statusFilter === "all" ? projects : projects.filter((p) => p.status === statusFilter);
    if (q) {
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.clientName.toLowerCase().includes(q) ||
          (p.address?.toLowerCase().includes(q) ?? false),
      );
    }
    if (sortOption === "name") list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    else if (sortOption === "spent_desc")
      list = [...list].sort((a, b) => projectTotal(b) - projectTotal(a));
    else if (sortOption === "spent_asc")
      list = [...list].sort((a, b) => projectTotal(a) - projectTotal(b));
    else if (sortOption === "deadline")
      list = [...list].sort((a, b) => {
        if (!a.deadline && !b.deadline) return 0;
        if (!a.deadline) return 1;
        if (!b.deadline) return -1;
        return a.deadline.localeCompare(b.deadline);
      });
    else if (sortOption === "pending_desc")
      list = [...list].sort((a, b) => {
        const pendA = a.expenses.filter((e) => !e.paid).reduce((s, e) => s + e.amount, 0);
        const pendB = b.expenses.filter((e) => !e.paid).reduce((s, e) => s + e.amount, 0);
        return pendB - pendA;
      });
    else if (sortOption === "completion_desc")
      list = [...list].sort((a, b) => (b.completionPct ?? 0) - (a.completionPct ?? 0));
    return list;
  }, [projects, statusFilter, projectSearch, sortOption]);

  const greeting = settings.name ? `Olá, ${settings.name}!` : "Dashboard";

  const hasExpenses = categoryData.length > 0;

  return (
    <div className="min-h-screen space-y-8 p-4 pb-24 md:p-8 md:pb-10">
      {/* ── Header ─────────────────────────────────────────── */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-foreground md:text-4xl">
            {greeting}
          </h1>
          <p className="mt-1 text-sm font-medium italic text-muted-foreground">
            Visão geral financeira de todas as suas obras.
          </p>
        </div>
        <AddProjectDialog />
      </header>

      {/* ── Stats ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatsCard
          compact
          title="Total Investido"
          value={formatBRL(stats.totalSpent)}
          icon={DollarSign}
          iconClassName="bg-primary/10 text-primary"
        />
        <StatsCard
          compact
          title="Total Orçado"
          value={stats.totalBudget > 0 ? formatBRL(stats.totalBudget) : "–"}
          icon={TrendingUp}
          iconClassName="bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400"
          hint={
            stats.totalBudget > 0
              ? `${Math.round((stats.totalSpent / stats.totalBudget) * 100)}% utilizado`
              : undefined
          }
        />
        <StatsCard
          compact
          title="Obras Ativas"
          value={String(stats.active)}
          icon={HardHat}
          iconClassName="bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400"
          hint={stats.done > 0 ? `${stats.done} concluída${stats.done > 1 ? "s" : ""}` : undefined}
        />
        <StatsCard
          compact
          title="Acima do Orçamento"
          value={String(stats.overBudget)}
          icon={TriangleAlert}
          iconClassName={
            stats.overBudget > 0
              ? "bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-400"
              : "bg-muted text-muted-foreground"
          }
          hint={stats.overBudget > 0 ? "Requer atenção" : "Tudo dentro do previsto"}
          hintClassName={stats.overBudget > 0 ? "text-red-600 dark:text-red-400" : undefined}
        />
      </div>

      {/* ── Paid / Pending summary ────────────────────────── */}
      {stats.totalSpent > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-3 rounded-xl border bg-emerald-500/5 px-4 py-3 shadow-sm">
            <CheckCircle2 className="h-6 w-6 shrink-0 text-emerald-500" />
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Pago (todos projetos)</p>
              <p className="truncate text-base font-black tabular-nums text-foreground">{formatBRL(stats.totalPaid)}</p>
              {stats.totalSpent > 0 && (
                <p className="text-[10px] font-bold text-muted-foreground">{Math.round((stats.totalPaid / stats.totalSpent) * 100)}% do total</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl border bg-amber-500/5 px-4 py-3 shadow-sm">
            <TrendingDown className="h-6 w-6 shrink-0 text-amber-500" />
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">A pagar (todos projetos)</p>
              <p className="truncate text-base font-black tabular-nums text-foreground">{formatBRL(stats.totalPending)}</p>
              {stats.totalSpent > 0 && (
                <p className="text-[10px] font-bold text-muted-foreground">{Math.round((stats.totalPending / stats.totalSpent) * 100)}% do total</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Monthly trend ─────────────────────────────────── */}
      {monthlyData.length >= 2 && (
        <ChartCard
          title="Gastos Mensais"
          icon={CalendarDays}
          className="col-span-full"
        >
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={monthlyData} margin={{ left: 8, right: 8 }}>
              <defs>
                <linearGradient id="monthGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CHART_PRIMARY} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={CHART_PRIMARY} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
              <XAxis
                dataKey="month"
                tick={{ fill: "var(--color-muted-foreground)", fontSize: 11, fontWeight: 600 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tickFormatter={(v) =>
                  new Intl.NumberFormat("pt-BR", { notation: "compact", currency: "BRL" }).format(v)
                }
                tick={{ fill: "var(--color-muted-foreground)", fontSize: 11, fontWeight: 600 }}
                tickLine={false}
                axisLine={false}
                width={64}
              />
              <Tooltip
                contentStyle={chartTooltipStyle}
                formatter={(v: number) => [formatBRL(v), "Gasto"]}
                cursor={{ stroke: CHART_PRIMARY, strokeWidth: 1, strokeDasharray: "4 4" }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke={CHART_PRIMARY}
                strokeWidth={2.5}
                fill="url(#monthGrad)"
                dot={{ fill: CHART_PRIMARY, r: 3, strokeWidth: 0 }}
                activeDot={{ fill: CHART_PRIMARY, r: 5, strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {/* ── Category + Top 5 charts ───────────────────────── */}
      {hasExpenses && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <ChartCard title="Gastos por Categoria" icon={BarChart3}>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={categoryData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={3}
                  label={({ percent }) =>
                    percent > 0.05 ? `${(percent * 100).toFixed(0)}%` : ""
                  }
                  labelLine={false}
                >
                  {categoryData.map((entry) => (
                    <Cell
                      key={entry.name}
                      fill={
                        CATEGORY_COLORS[entry.name as keyof typeof CATEGORY_COLORS] ?? "#94a3b8"
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
          </ChartCard>

          <ChartCard title="Top 5 Obras por Gasto" icon={BarChart3}>
            {topProjectsData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart
                  data={topProjectsData}
                  margin={{ top: 4, right: 8, bottom: 48, left: 8 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="var(--color-border)"
                  />
                  <XAxis
                    dataKey="name"
                    tickFormatter={(v: string) =>
                      v.length > 12 ? v.slice(0, 12) + "…" : v
                    }
                    tick={{
                      fill: "var(--color-muted-foreground)",
                      fontSize: 11,
                      fontWeight: 700,
                    }}
                    tickLine={false}
                    axisLine={false}
                    interval={0}
                    angle={-25}
                    textAnchor="end"
                  />
                  <YAxis
                    tickFormatter={(v: number) =>
                      new Intl.NumberFormat("pt-BR", { notation: "compact" }).format(v)
                    }
                    tick={{
                      fill: "var(--color-muted-foreground)",
                      fontSize: 11,
                      fontWeight: 600,
                    }}
                    tickLine={false}
                    axisLine={false}
                    width={60}
                  />
                  <Tooltip
                    contentStyle={chartTooltipStyle}
                    formatter={(v: number) => [formatBRL(v), "Gasto"]}
                    cursor={{ fill: "var(--color-accent)" }}
                  />
                  <Bar
                    dataKey="total"
                    fill={CHART_PRIMARY}
                    radius={[6, 6, 0, 0]}
                    maxBarSize={48}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChartState />
            )}
          </ChartCard>
        </div>
      )}

      {/* ── This month + recent activity ──────────────────── */}
      {recentExpenses.length > 0 && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Este mês card */}
          <div className="rounded-2xl border bg-card p-6 shadow-sm">
            <div className="mb-3 flex items-center gap-2 text-sm font-black uppercase tracking-widest text-muted-foreground">
              <CalendarDays className="h-4 w-4" /> Este Mês
            </div>
            <p className="text-2xl font-black tabular-nums text-foreground">
              {formatBRL(monthStats.thisMonth)}
            </p>
            {monthStats.pct !== null && (
              <p className={cn(
                "mt-1 flex items-center gap-1 text-xs font-bold",
                monthStats.pct > 0 ? "text-red-500" : monthStats.pct < 0 ? "text-emerald-500" : "text-muted-foreground"
              )}>
                {monthStats.pct > 0
                  ? <TrendingUp className="h-3 w-3" />
                  : monthStats.pct < 0
                  ? <TrendingDown className="h-3 w-3" />
                  : null}
                {monthStats.pct > 0 ? "+" : ""}{monthStats.pct}% vs mês anterior
              </p>
            )}
            {monthStats.lastMonth > 0 && (
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Mês anterior: {formatBRL(monthStats.lastMonth)}
              </p>
            )}
          </div>

          {/* Atividade recente */}
          <div className="rounded-2xl border bg-card p-6 shadow-sm lg:col-span-2">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-muted-foreground">
                <Activity className="h-4 w-4" /> Atividade Recente
              </div>
            </div>
            <div className="space-y-2">
              {recentExpenses.map((e) => (
                <div
                  key={`${e.projectId}-${e.id}`}
                  className="flex items-center justify-between gap-3 rounded-xl px-3 py-2 transition-colors hover:bg-accent/40 cursor-pointer"
                  onClick={() => navigate({ to: "/projects/$projectId", params: { projectId: e.projectId } })}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-foreground">{e.description}</p>
                    <p className="truncate text-[11px] font-medium text-muted-foreground">
                      {e.projectName} · <span title={formatDate(e.date)}>{formatRelativeDate(e.date).label}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <CategoryBadge category={e.category} />
                    <div className="text-right">
                      <span className="block text-sm font-black tabular-nums text-foreground">
                        {formatBRL(e.amount)}
                      </span>
                      {e.paid ? (
                        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">pago</span>
                      ) : (
                        <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">pendente</span>
                      )}
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/40" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Upcoming deadlines ───────────────────────────── */}
      {upcomingDeadlines.length > 0 && (
        <div className="rounded-2xl border bg-card p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <Clock className="h-4 w-4 text-amber-500" />
            <h2 className="text-sm font-black uppercase tracking-widest text-muted-foreground">
              Prazos nos próximos 30 dias
            </h2>
          </div>
          <div className="space-y-2">
            {upcomingDeadlines.map((p) => (
              <div
                key={p.id}
                className="flex cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-2 transition-colors hover:bg-accent/40"
                onClick={() => navigate({ to: "/projects/$projectId", params: { projectId: p.id } })}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-foreground">{p.name}</p>
                  <p className="text-[11px] font-medium text-muted-foreground">{p.clientName}</p>
                </div>
                <span className={cn(
                  "shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-black",
                  p.daysLeft < 0
                    ? "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400"
                    : p.daysLeft === 0
                    ? "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400"
                    : p.daysLeft <= 7
                    ? "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400"
                    : "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400"
                )}>
                  {p.daysLeft < 0
                    ? `${Math.abs(p.daysLeft)}d atrasado`
                    : p.daysLeft === 0
                    ? "Entrega hoje!"
                    : `${p.daysLeft}d restantes`}
                </span>
                <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/40" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Projects grid ─────────────────────────────────── */}
      <section className="space-y-4">
        {/* Search + filters row */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <h2 className="text-xl font-black text-foreground">
            Suas Obras
            <span className="ml-2 text-sm font-bold text-muted-foreground">
              ({filteredProjects.length})
            </span>
          </h2>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar obra…"
                value={projectSearch}
                onChange={(e) => setProjectSearch(e.target.value)}
                className="h-9 w-full rounded-xl border-2 pl-9 text-sm font-medium sm:w-48"
              />
            </div>
            {/* Sort */}
            <Select value={sortOption} onValueChange={(v) => setSortOption(v as SortOption)}>
              <SelectTrigger className="h-9 w-full rounded-xl border-2 text-sm font-semibold sm:w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="recent" className="font-medium">Mais recentes</SelectItem>
                <SelectItem value="name" className="font-medium">Nome A-Z</SelectItem>
                <SelectItem value="spent_desc" className="font-medium">Maior gasto</SelectItem>
                <SelectItem value="spent_asc" className="font-medium">Menor gasto</SelectItem>
                <SelectItem value="deadline" className="font-medium">Prazo</SelectItem>
                <SelectItem value="pending_desc" className="font-medium">Maior pendência</SelectItem>
                <SelectItem value="completion_desc" className="font-medium">Mais concluídas</SelectItem>
              </SelectContent>
            </Select>
            {/* Status filters */}
            <div className="flex flex-wrap gap-1.5">
              {STATUS_FILTERS.map((f) => (
                <button
                  key={f.value}
                  onClick={() => setStatusFilter(f.value)}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-xs font-bold transition-all",
                    statusFilter === f.value
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "border bg-card text-muted-foreground hover:bg-accent hover:text-foreground",
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {filteredProjects.length === 0 && projects.length === 0 ? (
          <EmptyState
            icon={HardHat}
            title="Nenhuma obra cadastrada"
            description="Crie sua primeira obra para começar a controlar os gastos."
            action={<AddProjectDialog />}
          />
        ) : filteredProjects.length === 0 ? (
          <EmptyState
            icon={CheckCircle2}
            title="Nenhuma obra encontrada"
            description="Tente ajustar a busca ou os filtros de status."
          />
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {filteredProjects.map((project) => {
              const spent = projectTotal(project);
              const accent = STATUS_ACCENT[project.status];
              const pct = project.budget ? Math.min((spent / project.budget) * 100, 100) : null;
              const daysLeft = deadlineDaysLeft(project);

              return (
                <article
                  key={project.id}
                  onClick={() =>
                    navigate({ to: "/projects/$projectId", params: { projectId: project.id } })
                  }
                  className="group relative flex cursor-pointer flex-col overflow-hidden rounded-2xl border-2 border-transparent bg-card pl-5 pr-5 pt-5 pb-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg"
                >
                  {/* Status accent bar */}
                  <div
                    className="absolute left-0 top-4 bottom-4 w-[3px] rounded-r-full opacity-70 group-hover:opacity-100 transition-opacity"
                    style={{ backgroundColor: accent }}
                  />

                  {/* Top row */}
                  <div className="mb-3 flex items-start justify-between">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <button className="flex items-center gap-0.5 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                            <StatusBadge status={project.status} />
                            <ChevronDown className="h-3 w-3 text-muted-foreground" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="rounded-xl" onClick={(e) => e.stopPropagation()}>
                          {PROJECT_STATUSES.map((s) => (
                            <DropdownMenuItem
                              key={s}
                              className="font-medium"
                              onSelect={() => updateProject(project.id, { status: s })}
                            >
                              {s === project.status ? `✓ ${s}` : s}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                      {daysLeft !== null && daysLeft <= 7 && project.status !== "Concluído" && (
                        <span className={cn(
                          "inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-bold",
                          daysLeft < 0
                            ? "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400"
                            : "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400",
                        )}>
                          <Clock className="h-2.5 w-2.5" />
                          {daysLeft < 0 ? `${Math.abs(daysLeft)}d atraso` : daysLeft === 0 ? "Hoje!" : `${daysLeft}d`}
                        </span>
                      )}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => e.stopPropagation()}
                          className="h-8 w-8 shrink-0 rounded-full opacity-0 transition-opacity group-hover:opacity-100"
                        >
                          <MoreVertical className="h-3.5 w-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="rounded-xl" onClick={(e) => e.stopPropagation()}>
                        {PROJECT_STATUSES.map((s) => (
                          <DropdownMenuItem
                            key={s}
                            className="gap-2 text-xs font-medium"
                            onSelect={() => {
                              if (s !== project.status) {
                                updateProject(project.id, { status: s });
                                toast.success(`Status: ${s}`);
                              }
                            }}
                          >
                            {s === project.status ? `✓ ${s}` : s}
                          </DropdownMenuItem>
                        ))}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="gap-2 font-medium"
                          onSelect={() => {
                            const copy = duplicateProject(project.id);
                            if (copy) toast.success(`"${copy.name}" criada!`);
                          }}
                        >
                          <Copy className="h-3.5 w-3.5" /> Duplicar obra
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="gap-2 font-medium text-destructive focus:text-destructive"
                          onSelect={() => {
                            const snapshot = project;
                            deleteProject(project.id);
                            toast.success("Obra excluída.", {
                              action: { label: "Desfazer", onClick: () => restoreProject(snapshot) },
                              duration: 5000,
                            });
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Excluir obra
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Info */}
                  <h3 className="truncate text-lg font-black text-foreground transition-colors group-hover:text-primary">
                    {project.name}
                  </h3>
                  <p className="mt-0.5 truncate text-sm font-medium text-muted-foreground">
                    {project.clientName}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] font-medium text-muted-foreground/70">
                      {project.expenses.length} gasto{project.expenses.length !== 1 ? "s" : ""}
                    </span>
                    {project.expenses.filter((e) => !e.paid).length > 0 && (
                      <span className="rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                        {project.expenses.filter((e) => !e.paid).length} pendente{project.expenses.filter((e) => !e.paid).length !== 1 ? "s" : ""}
                      </span>
                    )}
                    {project.notes && (
                      <span className="text-[10px] text-muted-foreground/50" title={project.notes}>
                        📝
                      </span>
                    )}
                  </div>

                  {/* Budget bar */}
                  {project.budget ? (
                    <div className="mt-3">
                      <BudgetProgress spent={spent} budget={project.budget} />
                    </div>
                  ) : (
                    <div className="mt-3 h-4" />
                  )}

                  {/* Paid mini bar */}
                  {spent > 0 && (() => {
                    const paidAmt = project.expenses.filter((e) => e.paid).reduce((s, e) => s + e.amount, 0);
                    const paidPct = Math.round((paidAmt / spent) * 100);
                    return (
                      <div className="mt-2">
                        <div className="mb-0.5 flex justify-between">
                          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                            {paidPct}% pago
                          </span>
                          {paidAmt < spent && (
                            <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">
                              {formatBRL(spent - paidAmt)} pend.
                            </span>
                          )}
                        </div>
                        <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                            style={{ width: `${paidPct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })()}

                  {/* Completion bar */}
                  {project.completionPct !== undefined && project.completionPct > 0 && (
                    <div className="mt-2">
                      <div className="mb-0.5 flex justify-between">
                        <span className="text-[10px] font-bold text-primary">
                          {project.completionPct}% concluído
                        </span>
                      </div>
                      <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary/60 transition-all duration-500"
                          style={{ width: `${project.completionPct}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Footer */}
                  <div className="mt-3 flex items-end justify-between border-t pt-3">
                    <button
                      onClick={(e) => { e.stopPropagation(); setQuickAddProjectId(project.id); }}
                      className="flex items-center gap-1 rounded-lg border border-dashed border-border px-2 py-1 text-[11px] font-bold text-muted-foreground transition-all hover:border-primary/50 hover:bg-primary/5 hover:text-primary"
                    >
                      <Plus className="h-3 w-3" /> Gasto
                    </button>
                    <div className="text-right">
                      <span className="block text-xl font-black tabular-nums text-foreground">
                        {formatBRL(spent)}
                      </span>
                      {pct !== null && (
                        <span className="text-[10px] font-semibold text-muted-foreground">
                          {pct.toFixed(0)}% do orçamento
                        </span>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}

            {/* Quick-add card */}
            <AddProjectDialog>
              <button className="flex min-h-[180px] cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-border bg-transparent text-muted-foreground transition-all hover:border-primary/50 hover:bg-primary/5 hover:text-primary">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl border-2 border-current">
                  <Plus className="h-5 w-5" />
                </div>
                <span className="text-sm font-bold">Nova Obra</span>
              </button>
            </AddProjectDialog>
          </div>
        )}
      </section>

      {/* Quick-add expense from card */}
      <ExpenseFormDialog
        open={quickAddProjectId !== null}
        onOpenChange={(open) => { if (!open) setQuickAddProjectId(null); }}
        mode="add"
        onSave={(data) => {
          if (!quickAddProjectId) return;
          addExpense(quickAddProjectId, data);
          toast.success("Gasto adicionado!");
          setQuickAddProjectId(null);
        }}
      />
    </div>
  );
}

function ChartCard({
  title,
  icon: Icon,
  children,
  className,
}: {
  title: string;
  icon: typeof BarChart3;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-2xl border bg-card p-6 shadow-sm", className)}>
      <div className="mb-4 flex items-center gap-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <h3 className="font-bold text-foreground">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function EmptyChartState() {
  return (
    <div className="flex h-[280px] items-center justify-center text-sm font-medium italic text-muted-foreground">
      Sem dados suficientes.
    </div>
  );
}
