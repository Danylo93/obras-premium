import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { useProjects } from "@/hooks/useProjects";
import { useSettings, setTheme, setUserName, setCompanyName, type Theme } from "@/store/settings";
import { importProjects, clearAllProjects, projectTotal, sanitizeProjects } from "@/store/projects";
import { downloadCSV, amountToCSV } from "@/lib/csv";
import { formatBRL } from "@/lib/format";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Crown,
  Sun,
  Moon,
  Monitor,
  FileDown,
  FileUp,
  Trash2,
  User,
  Pencil,
  Check,
  X,
  TableIcon,
  RotateCcw,
  Cloud,
  CloudOff,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { format } from "date-fns";
import { hasApi } from "@/lib/api";
import type { Project } from "@/types";

export const Route = createFileRoute("/perfil")({
  component: Profile,
});

const THEMES: { value: Theme; icon: typeof Sun; label: string }[] = [
  { value: "light", icon: Sun, label: "Claro" },
  { value: "dark", icon: Moon, label: "Escuro" },
  { value: "system", icon: Monitor, label: "Sistema" },
];

function Profile() {
  const { projects } = useProjects();
  const settings = useSettings();
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(settings.name);
  const [editingCompany, setEditingCompany] = useState(false);
  const [companyInput, setCompanyInput] = useState(settings.companyName);
  const importRef = useRef<HTMLInputElement>(null);
  const [recoveryData, setRecoveryData] = useState<{ key: string; count: number; projects: Project[] }[]>([]);
  const [recoveryScanned, setRecoveryScanned] = useState(false);
  const cloudEnabled = hasApi();

  const stats = useMemo(() => {
    const totalSpent = projects.reduce((s, p) => s + projectTotal(p), 0);
    const totalBudget = projects.reduce((s, p) => s + (p.budget ?? 0), 0);
    const biggest = projects.reduce<{ name: string; total: number } | null>((max, p) => {
      const t = projectTotal(p);
      return !max || t > max.total ? { name: p.name, total: t } : max;
    }, null);
    const totalExpenses = projects.reduce((s, p) => s + p.expenses.length, 0);
    return { totalSpent, totalBudget, totalExpenses, biggest };
  }, [projects]);

  const handleSaveName = () => {
    setUserName(nameInput);
    setEditingName(false);
    toast.success("Nome atualizado!");
  };

  const handleCancelName = () => {
    setNameInput(settings.name);
    setEditingName(false);
  };

  const handleSaveCompany = () => {
    setCompanyName(companyInput);
    setEditingCompany(false);
    toast.success("Empresa atualizada!");
  };

  const handleCancelCompany = () => {
    setCompanyInput(settings.companyName);
    setEditingCompany(false);
  };

  const handleScanRecovery = () => {
    const found: { key: string; count: number; projects: Project[] }[] = [];
    const currentKey = "obras_projects_v2";
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || key === currentKey) continue;
      try {
        const raw = localStorage.getItem(key);
        if (!raw || raw[0] !== "[") continue; // must be JSON array
        const parsed = JSON.parse(raw);
        const sanitized = sanitizeProjects(parsed);
        if (sanitized && sanitized.length > 0) {
          found.push({ key, count: sanitized.length, projects: sanitized });
        }
      } catch { /* skip */ }
    }
    setRecoveryData(found);
    setRecoveryScanned(true);
    if (found.length === 0) toast.info("Nenhum dado anterior encontrado no navegador.");
  };

  const handleRestoreRecovery = (item: { key: string; count: number; projects: Project[] }) => {
    const count = importProjects(item.projects);
    if (count !== null) {
      toast.success(`${count} obra${count !== 1 ? "s" : ""} restaurada${count !== 1 ? "s" : ""} com sucesso!`);
      setRecoveryData([]);
      setRecoveryScanned(false);
    }
  };

  const handleExportAllCSV = () => {
    if (projects.length === 0) { toast.error("Nenhuma obra para exportar."); return; }
    const rows: (string | number)[][] = [];
    for (const p of projects) {
      for (const e of p.expenses) {
        rows.push([
          p.name,
          p.clientName,
          p.address ?? "",
          p.status,
          e.date.slice(0, 10),
          e.description,
          e.category,
          e.employeeName ?? "",
          e.invoiceNumber ?? "",
          e.notes ?? "",
          e.paid ? "Pago" : "Pendente",
          amountToCSV(e.amount),
        ]);
      }
    }
    downloadCSV(
      `obras_todos_gastos_${format(new Date(), "yyyy-MM-dd")}.csv`,
      ["Obra", "Cliente", "Endereço", "Status", "Data", "Descrição", "Categoria", "Funcionário", "NF", "Observações", "Pagamento", "Valor (R$)"],
      rows,
    );
    toast.success(`${rows.length} lançamentos exportados!`);
  };

  const handleExportBackup = () => {
    const data = JSON.stringify(projects, null, 2);
    const blob = new Blob([data], { type: "application/json;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `obras_backup_${format(new Date(), "yyyy-MM-dd")}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("Backup exportado com sucesso!");
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        const count = importProjects(parsed);
        if (count === null) {
          toast.error("Arquivo inválido ou corrompido.");
          return;
        }
        toast.success(
          `${count} obra${count !== 1 ? "s" : ""} importada${count !== 1 ? "s" : ""} com sucesso!`,
        );
      } catch {
        toast.error("Erro ao ler o arquivo JSON.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  return (
    <div className="min-h-screen p-4 pb-24 md:p-8 md:pb-10 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black tracking-tight text-foreground">Perfil</h1>
        <p className="mt-1 text-sm font-medium italic text-muted-foreground">
          Configurações da sua conta premium.
        </p>
      </div>

      <div className="mx-auto max-w-2xl space-y-6">
        {/* Identity card */}
        <section className="rounded-2xl border bg-card p-6 shadow-sm">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 ring-4 ring-primary/20">
              <User className="h-10 w-10 text-primary" />
            </div>

            {editingName ? (
              <div className="flex w-full max-w-xs items-center gap-2">
                <Input
                  autoFocus
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveName();
                    if (e.key === "Escape") handleCancelName();
                  }}
                  className="h-10 rounded-xl border-2 text-center font-bold"
                  placeholder="Seu nome"
                />
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={handleSaveName}
                  className="h-10 w-10 rounded-xl text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10"
                >
                  <Check className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={handleCancelName}
                  className="h-10 w-10 rounded-xl text-muted-foreground"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xl font-black text-foreground">
                  {settings.name || "Seu Nome"}
                </span>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => {
                    setNameInput(settings.name);
                    setEditingName(true);
                  }}
                  className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}

            {editingCompany ? (
              <div className="flex w-full max-w-xs items-center gap-2">
                <Input
                  autoFocus
                  value={companyInput}
                  onChange={(e) => setCompanyInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveCompany();
                    if (e.key === "Escape") handleCancelCompany();
                  }}
                  className="h-9 rounded-xl border-2 text-center text-sm font-bold"
                  placeholder="Ex: Construtora Silva"
                />
                <Button size="icon" variant="ghost" onClick={handleSaveCompany}
                  className="h-9 w-9 rounded-xl text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10">
                  <Check className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" onClick={handleCancelCompany}
                  className="h-9 w-9 rounded-xl text-muted-foreground">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold text-muted-foreground">
                  {settings.companyName || "Empresa não definida"}
                </span>
                <Button size="icon" variant="ghost" onClick={() => { setCompanyInput(settings.companyName); setEditingCompany(true); }}
                  className="h-6 w-6 rounded-full text-muted-foreground hover:text-foreground">
                  <Pencil className="h-3 w-3" />
                </Button>
              </div>
            )}

            <div className="flex items-center gap-1.5">
              <Crown className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
              <span className="text-xs font-black uppercase tracking-widest text-amber-600 dark:text-amber-400">
                Assinante Premium
              </span>
            </div>
          </div>
        </section>

        {/* Stats summary */}
        <section className="rounded-2xl border bg-card p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-black uppercase tracking-widest text-muted-foreground">
            Resumo
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Stat label="Obras" value={String(projects.length)} />
            <Stat label="Lançamentos" value={String(stats.totalExpenses)} />
            <Stat label="Total Gasto" value={formatBRL(stats.totalSpent)} small />
            <Stat
              label="Total Orçado"
              value={stats.totalBudget > 0 ? formatBRL(stats.totalBudget) : "—"}
              small
            />
          </div>
          {stats.biggest && (
            <div className="mt-4 rounded-xl bg-muted/60 px-4 py-3">
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Obra mais cara
              </p>
              <p className="font-black text-foreground">{stats.biggest.name}</p>
              <p className="text-sm font-bold text-primary">{formatBRL(stats.biggest.total)}</p>
            </div>
          )}
        </section>

        {/* Theme */}
        <section className="rounded-2xl border bg-card p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-black uppercase tracking-widest text-muted-foreground">
            Aparência
          </h2>
          <div className="grid grid-cols-3 gap-3">
            {THEMES.map(({ value, icon: Icon, label }) => (
              <button
                key={value}
                onClick={() => setTheme(value)}
                className={cn(
                  "flex flex-col items-center gap-2 rounded-xl border-2 py-4 transition-all",
                  settings.theme === value
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border text-muted-foreground hover:border-primary/40 hover:bg-accent hover:text-foreground",
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="text-xs font-bold">{label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Cloud status */}
        <section className="rounded-2xl border bg-card p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-black uppercase tracking-widest text-muted-foreground">
            Nuvem (AWS DynamoDB)
          </h2>
          <div className={cn(
            "flex items-center gap-4 rounded-xl px-4 py-4",
            cloudEnabled ? "bg-emerald-500/10" : "bg-muted/40",
          )}>
            {cloudEnabled ? (
              <Cloud className="h-5 w-5 shrink-0 text-emerald-600" />
            ) : (
              <CloudOff className="h-5 w-5 shrink-0 text-muted-foreground" />
            )}
            <div className="min-w-0 flex-1">
              {cloudEnabled ? (
                <>
                  <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">Sincronização ativa</p>
                  <p className="text-xs text-muted-foreground">
                    Dados salvos no DynamoDB automaticamente. Fallback para localStorage quando offline.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm font-bold text-foreground">Modo offline (localStorage)</p>
                  <p className="text-xs text-muted-foreground">
                    Configure <code className="rounded bg-muted px-1 font-mono text-xs">VITE_API_URL</code> no{" "}
                    <code className="rounded bg-muted px-1 font-mono text-xs">.env.local</code> para ativar o DynamoDB.
                    Veja <strong>backend/README.md</strong> para instruções de deploy.
                  </p>
                </>
              )}
            </div>
          </div>
        </section>

        {/* Data recovery */}
        <section className="rounded-2xl border bg-card p-6 shadow-sm">
          <h2 className="mb-1 text-sm font-black uppercase tracking-widest text-muted-foreground">
            Recuperar Dados Anteriores
          </h2>
          <p className="mb-4 text-xs text-muted-foreground">
            Se você usou o app antes e os dados sumiram, clique em "Procurar" para tentar recuperá-los do navegador.
          </p>
          {!recoveryScanned ? (
            <Button
              variant="outline"
              onClick={handleScanRecovery}
              className="gap-2 rounded-xl font-bold"
            >
              <RotateCcw className="h-4 w-4" />
              Procurar dados anteriores
            </Button>
          ) : recoveryData.length === 0 ? (
            <p className="text-sm font-medium text-muted-foreground">
              Nenhum dado anterior encontrado neste navegador.
            </p>
          ) : (
            <div className="space-y-2">
              {recoveryData.map((item) => (
                <div
                  key={item.key}
                  className="flex items-center justify-between gap-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-800/40 dark:bg-amber-900/20"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-amber-800 dark:text-amber-400">
                      {item.count} obra{item.count !== 1 ? "s" : ""} encontrada{item.count !== 1 ? "s" : ""}
                    </p>
                    <p className="text-xs text-muted-foreground font-mono">{item.key}</p>
                  </div>
                  <ConfirmDialog
                    trigger={
                      <Button
                        size="sm"
                        className="shrink-0 rounded-xl font-bold bg-amber-600 hover:bg-amber-700 text-white"
                      >
                        Restaurar
                      </Button>
                    }
                    title={`Restaurar ${item.count} obra${item.count !== 1 ? "s" : ""}?`}
                    description="Os dados atuais serão substituídos pelos dados recuperados. Faça um backup antes se necessário."
                    confirmLabel="Sim, restaurar"
                    onConfirm={() => handleRestoreRecovery(item)}
                  />
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Data management */}
        <section className="rounded-2xl border bg-card p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-black uppercase tracking-widest text-muted-foreground">
            Dados
          </h2>
          <div className="space-y-3">
            <DataAction
              icon={TableIcon}
              label="Exportar todos os gastos (CSV)"
              description="Planilha com todos os lançamentos de todas as obras."
              action={
                <Button variant="outline" onClick={handleExportAllCSV} className="shrink-0 gap-2 rounded-xl font-bold">
                  <TableIcon className="h-4 w-4" /> CSV
                </Button>
              }
            />
            <DataAction
              icon={FileDown}
              label="Exportar Backup"
              description="Salva todos os dados em um arquivo JSON."
              action={
                <Button variant="outline" onClick={handleExportBackup} className="shrink-0 gap-2 rounded-xl font-bold">
                  <FileDown className="h-4 w-4" /> Exportar
                </Button>
              }
            />

            <DataAction
              icon={FileUp}
              label="Importar Backup"
              description="Restaura dados de um backup JSON (substitui os atuais)."
              action={
                <>
                  <input
                    ref={importRef}
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={handleImport}
                  />
                  <ConfirmDialog
                    trigger={
                      <Button variant="outline" className="shrink-0 gap-2 rounded-xl font-bold">
                        <FileUp className="h-4 w-4" /> Importar
                      </Button>
                    }
                    title="Importar backup?"
                    description="Os dados atuais serão substituídos pelos dados do arquivo. Esta ação não pode ser desfeita."
                    confirmLabel="Sim, importar"
                    onConfirm={() => importRef.current?.click()}
                  />
                </>
              }
            />

            <DataAction
              icon={Trash2}
              label="Apagar Todos os Dados"
              description="Remove permanentemente todas as obras e gastos."
              destructive
              action={
                <ConfirmDialog
                  trigger={
                    <Button
                      variant="outline"
                      className="shrink-0 gap-2 rounded-xl border-destructive/40 font-bold text-destructive hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" /> Apagar Tudo
                    </Button>
                  }
                  title="Apagar todos os dados?"
                  description="Esta ação é irreversível. Todas as obras e lançamentos serão perdidos para sempre."
                  confirmLabel="Apagar Tudo"
                  onConfirm={() => {
                    clearAllProjects();
                    toast.success("Todos os dados foram apagados.");
                  }}
                />
              }
            />
          </div>
        </section>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  small,
}: {
  label: string;
  value: string;
  small?: boolean;
}) {
  return (
    <div className="rounded-xl bg-muted/50 px-3 py-3 text-center">
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className={cn("mt-0.5 font-black tabular-nums text-foreground", small ? "text-sm" : "text-xl")}>
        {value}
      </p>
    </div>
  );
}

function DataAction({
  icon: Icon,
  label,
  description,
  action,
  destructive,
}: {
  icon: typeof FileDown;
  label: string;
  description: string;
  action: React.ReactNode;
  destructive?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl bg-muted/30 px-4 py-3">
      <div className="flex items-center gap-3 min-w-0">
        <Icon
          className={cn(
            "h-4 w-4 shrink-0",
            destructive ? "text-destructive" : "text-muted-foreground",
          )}
        />
        <div className="min-w-0">
          <p className={cn("text-sm font-bold", destructive && "text-destructive")}>{label}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      {action}
    </div>
  );
}
