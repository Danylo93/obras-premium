import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useProjects } from "@/hooks/useProjects";
import { deleteExpense, updateExpense, toggleExpensePaid, restoreExpense, bulkUpdateExpensesPaid, projectTotal } from "@/store/projects";
import { formatBRL, formatDate, formatRelativeDate } from "@/lib/format";
import { CATEGORIES } from "@/lib/categories";
import { downloadCSV, amountToCSV } from "@/lib/csv";
import { CategoryBadge } from "@/components/CategoryBadge";
import { EmptyState } from "@/components/EmptyState";
import { StatsCard } from "@/components/StatsCard";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ExpenseFormDialog } from "@/components/ExpenseFormDialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Search,
  ArrowRight,
  Download,
  Printer,
  Receipt,
  Pencil,
  Trash2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  DollarSign,
  Hash,
  CalendarDays,
  TrendingUp,
  CheckCircle2,
  Circle,
  X,
} from "lucide-react";
import type { Category, Expense } from "@/types";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/lancamentos")({
  component: Lancamentos,
});

type SortKey = "date" | "amount" | "category" | "description" | "project";
type SortDir = "asc" | "desc";

type FlatExpense = Expense & { projectName: string; projectId: string };

function Lancamentos() {
  const { projects } = useProjects();
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<Category | "all">("all");
  const [filterProject, setFilterProject] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [filterPaid, setFilterPaid] = useState<"all" | "paid" | "pending">("all");
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  // Inline edit dialog state
  const [editDialog, setEditDialog] = useState<{
    open: boolean;
    expense: FlatExpense | null;
  }>({ open: false, expense: null });

  const allExpenses = useMemo<FlatExpense[]>(
    () =>
      projects.flatMap((p) =>
        p.expenses.map((e) => ({ ...e, projectName: p.name, projectId: p.id })),
      ),
    [projects],
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return allExpenses.filter((e) => {
      if (filterCategory !== "all" && e.category !== filterCategory) return false;
      if (filterProject !== "all" && e.projectId !== filterProject) return false;
      if (dateFrom && e.date < dateFrom + "T00:00:00") return false;
      if (dateTo && e.date > dateTo + "T23:59:59") return false;
      if (filterPaid === "paid" && !e.paid) return false;
      if (filterPaid === "pending" && e.paid) return false;
      if (
        q &&
        !e.description.toLowerCase().includes(q) &&
        !e.projectName.toLowerCase().includes(q) &&
        !e.category.toLowerCase().includes(q) &&
        !(e.employeeName?.toLowerCase().includes(q) ?? false) &&
        !(e.invoiceNumber?.toLowerCase().includes(q) ?? false)
      )
        return false;
      return true;
    });
  }, [allExpenses, search, filterCategory, filterProject, dateFrom, dateTo, filterPaid]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "date") cmp = a.date.localeCompare(b.date);
      else if (sortKey === "amount") cmp = a.amount - b.amount;
      else if (sortKey === "category") cmp = a.category.localeCompare(b.category);
      else if (sortKey === "description") cmp = a.description.localeCompare(b.description);
      else if (sortKey === "project") cmp = a.projectName.localeCompare(b.projectName);
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir]);

  const filteredTotal = useMemo(() => sorted.reduce((s, e) => s + e.amount, 0), [sorted]);

  const summaryStats = useMemo(() => {
    const byCategory: Record<string, number> = {};
    let biggest: FlatExpense | null = null;
    let paid = 0;
    let pending = 0;
    for (const e of sorted) {
      byCategory[e.category] = (byCategory[e.category] ?? 0) + e.amount;
      if (!biggest || e.amount > biggest.amount) biggest = e;
      if (e.paid) paid += e.amount;
      else pending += e.amount;
    }
    const topCategory = Object.entries(byCategory).sort((a, b) => b[1] - a[1])[0];
    return { topCategory, biggest, paid, pending };
  }, [sorted]);

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

  const hasFilters =
    search || filterCategory !== "all" || filterProject !== "all" || dateFrom || dateTo || filterPaid !== "all";

  const clearFilters = () => {
    setSearch("");
    setFilterCategory("all");
    setFilterProject("all");
    setDateFrom("");
    setDateTo("");
    setFilterPaid("all");
  };

  const handleExport = () => {
    if (sorted.length === 0) {
      toast.error("Nenhum lançamento para exportar.");
      return;
    }
    downloadCSV(
      "lancamentos_obras.csv",
      ["Data", "Descrição", "Obra", "Categoria", "Funcionário", "NF", "Observações", "Status", "Valor (R$)"],
      sorted.map((e) => [
        formatDate(e.date),
        e.description,
        e.projectName,
        e.category,
        e.employeeName ?? "",
        e.invoiceNumber ?? "",
        e.notes ?? "",
        e.paid ? "Pago" : "Pendente",
        amountToCSV(e.amount),
      ]),
    );
    toast.success(`${sorted.length} lançamentos exportados.`);
  };

  return (
    <div className="min-h-screen space-y-6 p-4 pb-24 md:p-8 md:pb-10">
      {/* Header */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-foreground">Lançamentos</h1>
          <p className="mt-1 text-sm font-medium italic text-muted-foreground">
            Histórico completo · {allExpenses.length} registros no total
          </p>
        </div>
        <div className="flex items-center gap-2 no-print">
          <Button
            variant="outline"
            onClick={() => window.print()}
            className="shrink-0 gap-2 rounded-xl font-bold"
            title="Imprimir lançamentos"
          >
            <Printer className="h-4 w-4" />
            <span className="hidden sm:inline">Imprimir</span>
          </Button>
          <Button
            variant="outline"
            onClick={handleExport}
            className="shrink-0 gap-2 rounded-xl font-bold"
          >
            <Download className="h-4 w-4" /> Exportar CSV
          </Button>
        </div>
      </header>

      {/* Summary stat cards */}
      {allExpenses.length > 0 && (
        <div className="space-y-3 no-print">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatsCard
              compact
              title="Total Filtrado"
              value={formatBRL(filteredTotal)}
              icon={DollarSign}
              iconClassName="bg-primary/10 text-primary"
            />
            <StatsCard
              compact
              title="Lançamentos"
              value={String(sorted.length)}
              icon={Hash}
              iconClassName="bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-400"
              hint={sorted.length !== allExpenses.length ? `de ${allExpenses.length}` : undefined}
            />
            <StatsCard
              compact
              title="Categoria Top"
              value={summaryStats.topCategory?.[0] ?? "—"}
              icon={TrendingUp}
              iconClassName="bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400"
              hint={summaryStats.topCategory ? formatBRL(summaryStats.topCategory[1]) : undefined}
            />
            <StatsCard
              compact
              title="Maior Gasto"
              value={summaryStats.biggest ? formatBRL(summaryStats.biggest.amount) : "—"}
              icon={CalendarDays}
              iconClassName="bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400"
              hint={summaryStats.biggest?.description}
            />
          </div>
          {sorted.length > 0 && (
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-3 rounded-xl border bg-emerald-500/5 px-4 py-2.5">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Pago</p>
                  <p className="truncate text-sm font-black tabular-nums text-foreground">{formatBRL(summaryStats.paid)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-xl border bg-amber-500/5 px-4 py-2.5">
                <Circle className="h-5 w-5 shrink-0 text-amber-500" />
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">Pendente</p>
                  <p className="truncate text-sm font-black tabular-nums text-foreground">{formatBRL(summaryStats.pending)}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="space-y-3 no-print">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por descrição, obra, NF…"
              className="h-11 rounded-xl border-2 pl-10 font-medium"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <Select
            value={filterCategory}
            onValueChange={(v) => setFilterCategory(v as Category | "all")}
          >
            <SelectTrigger className="h-11 w-full rounded-xl border-2 font-semibold sm:w-44">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="all" className="font-semibold">
                Todas Categorias
              </SelectItem>
              {CATEGORIES.map((c) => (
                <SelectItem key={c} value={c} className="font-medium">
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterProject} onValueChange={setFilterProject}>
            <SelectTrigger className="h-11 w-full rounded-xl border-2 font-semibold sm:w-52">
              <SelectValue placeholder="Obra" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="all" className="font-semibold">
                Todas as Obras
              </SelectItem>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id} className="font-medium">
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Quick date filter pills */}
        <div className="flex flex-wrap gap-2">
          {[
            { label: "Hoje", action: () => { const t = new Date().toISOString().slice(0,10); setDateFrom(t); setDateTo(t); } },
            { label: "Esta semana", action: () => { const now = new Date(); const day = now.getDay() || 7; const mon = new Date(now); mon.setDate(now.getDate() - day + 1); setDateFrom(mon.toISOString().slice(0,10)); setDateTo(now.toISOString().slice(0,10)); } },
            { label: "Este mês", action: () => { const now = new Date(); setDateFrom(`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`); setDateTo(now.toISOString().slice(0,10)); } },
            { label: "Último mês", action: () => { const now = new Date(); const prev = new Date(now.getFullYear(), now.getMonth()-1, 1); const last = new Date(now.getFullYear(), now.getMonth(), 0); setDateFrom(prev.toISOString().slice(0,10)); setDateTo(last.toISOString().slice(0,10)); } },
          ].map(({ label, action }) => (
            <button
              key={label}
              onClick={action}
              className="rounded-lg border px-3 py-1 text-xs font-bold text-muted-foreground transition-all hover:border-primary/50 hover:bg-primary/5 hover:text-primary"
            >
              {label}
            </button>
          ))}
        </div>

        {/* Paid filter pills */}
        <div className="flex gap-2">
          {(["all", "pending", "paid"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setFilterPaid(v)}
              className={cn(
                "rounded-lg px-3 py-1 text-xs font-bold transition-all",
                filterPaid === v
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
        </div>

        {/* Date range row */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-xs font-bold text-muted-foreground">Período:</span>
          </div>
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="h-9 w-40 rounded-xl border-2 text-sm font-medium"
            title="De"
          />
          <span className="text-xs text-muted-foreground">até</span>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            min={dateFrom}
            className="h-9 w-40 rounded-xl border-2 text-sm font-medium"
            title="Até"
          />
          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="h-9 gap-1.5 rounded-xl text-xs font-bold text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" /> Limpar filtros
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border bg-card shadow-sm">
        {sorted.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title={hasFilters ? "Nenhum resultado" : "Nenhum lançamento"}
            description={
              hasFilters
                ? "Nenhum gasto corresponde aos filtros. Tente ajustá-los."
                : "Registre gastos em uma obra para vê-los aqui."
            }
            className="border-none"
          />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow className="border-b-2 bg-muted/40 hover:bg-muted/40">
                  {(
                    [
                      { key: "date" as SortKey, label: "Data", hidden: undefined as string | undefined },
                      { key: "description" as SortKey, label: "Descrição", hidden: undefined as string | undefined },
                      { key: "project" as SortKey, label: "Obra", hidden: "sm" as string | undefined },
                      { key: "category" as SortKey, label: "Categoria", hidden: undefined as string | undefined },
                    ]
                  ).map(({ key, label, hidden }) => (
                    <TableHead
                      key={key}
                      onClick={() => handleSort(key)}
                      className={cn(
                        "cursor-pointer select-none text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors",
                        hidden && `hidden ${hidden}:table-cell`,
                      )}
                    >
                      <span className="flex items-center gap-1">
                        {label} <SortIcon k={key} />
                      </span>
                    </TableHead>
                  ))}
                  <TableHead
                    onClick={() => handleSort("amount")}
                    className="cursor-pointer select-none text-right text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <span className="flex items-center justify-end gap-1">
                      Valor <SortIcon k="amount" />
                    </span>
                  </TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((exp) => (
                  <TableRow
                    key={`${exp.projectId}-${exp.id}`}
                    className="group transition-colors hover:bg-accent/40"
                  >
                    <TableCell className="whitespace-nowrap text-sm font-medium text-muted-foreground">
                      {(() => { const { label, full } = formatRelativeDate(exp.date); return <span title={full}>{label}</span>; })()}
                    </TableCell>
                    <TableCell className="max-w-[180px]">
                      <p className="truncate font-bold text-foreground">{exp.description}</p>
                      {exp.employeeName && (
                        <p className="text-xs font-medium text-muted-foreground">
                          {exp.employeeName}
                        </p>
                      )}
                      {exp.invoiceNumber && (
                        <p className="text-[10px] font-mono text-muted-foreground/70">
                          {exp.invoiceNumber}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <Link
                        to="/projects/$projectId"
                        params={{ projectId: exp.projectId }}
                        onClick={(e) => e.stopPropagation()}
                        className="font-semibold text-primary hover:underline"
                      >
                        {exp.projectName}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <CategoryBadge category={exp.category as Category} />
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="font-black tabular-nums text-foreground">{formatBRL(exp.amount)}</span>
                      <p className={cn("text-[10px] font-bold", exp.paid ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400")}>
                        {exp.paid ? "pago" : "pendente"}
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
                          onClick={() => toggleExpensePaid(exp.projectId, exp.id)}
                          title={exp.paid ? "Marcar como pendente" : "Marcar como pago"}
                        >
                          {exp.paid ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Circle className="h-3.5 w-3.5" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-full"
                          onClick={() => setEditDialog({ open: true, expense: exp })}
                          title="Editar gasto"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <ConfirmDialog
                          trigger={
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                              title="Excluir gasto"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          }
                          title="Excluir este gasto?"
                          description={`"${exp.description}" — ${formatBRL(exp.amount)}`}
                          confirmLabel="Excluir"
                          onConfirm={() => {
                            const snapshot = exp;
                            deleteExpense(exp.projectId, exp.id);
                            toast.success("Gasto excluído.", {
                              action: { label: "Desfazer", onClick: () => restoreExpense(exp.projectId, snapshot) },
                              duration: 5000,
                            });
                          }}
                        />
                        <Link
                          to="/projects/$projectId"
                          params={{ projectId: exp.projectId }}
                        >
                          <ArrowRight className="h-4 w-4 text-muted-foreground/40 transition-colors group-hover:text-primary" />
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Footer */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-t bg-muted/30 px-4 py-3">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {sorted.length} lançamento{sorted.length !== 1 ? "s" : ""}
                {hasFilters && sorted.length !== allExpenses.length && (
                  <span className="ml-1 text-muted-foreground/60">
                    (de {allExpenses.length})
                  </span>
                )}
              </span>
              <div className="flex items-center gap-3">
                {filterPaid === "pending" && sorted.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 rounded-xl font-bold text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/10"
                    onClick={() => {
                      const byProject: Record<string, string[]> = {};
                      sorted.forEach((e) => {
                        if (!byProject[e.projectId]) byProject[e.projectId] = [];
                        byProject[e.projectId].push(e.id);
                      });
                      Object.entries(byProject).forEach(([pid, ids]) => bulkUpdateExpensesPaid(pid, ids, true));
                      toast.success(`${sorted.length} lançamento${sorted.length !== 1 ? "s" : ""} marcado${sorted.length !== 1 ? "s" : ""} como pago${sorted.length !== 1 ? "s" : ""}!`);
                    }}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" /> Marcar todos como pagos
                  </Button>
                )}
                <span className="text-base font-black tabular-nums text-foreground">
                  {formatBRL(filteredTotal)}
                </span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Inline edit dialog */}
      <ExpenseFormDialog
        open={editDialog.open}
        onOpenChange={(open) => setEditDialog((s) => ({ ...s, open }))}
        mode="edit"
        initialData={editDialog.expense ?? undefined}
        onSave={(data) => {
          if (!editDialog.expense) return;
          updateExpense(editDialog.expense.projectId, editDialog.expense.id, data);
          toast.success("Gasto atualizado!");
        }}
      />
    </div>
  );
}
