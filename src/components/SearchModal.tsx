import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useProjectsStore } from "@/store/projects";
import { formatBRL, formatDate } from "@/lib/format";
import { CategoryBadge } from "@/components/CategoryBadge";
import { Search, HardHat, Receipt, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Category } from "@/types";

interface SearchResult {
  type: "project" | "expense";
  id: string;
  projectId: string;
  title: string;
  subtitle: string;
  amount?: number;
  category?: Category;
}

export function SearchModal() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlighted, setHighlighted] = useState(0);
  const projects = useProjectsStore();
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const results = useMemo<SearchResult[]>(() => {
    const q = query.toLowerCase().trim();
    if (!q) return [];
    const out: SearchResult[] = [];

    for (const p of projects) {
      if (
        p.name.toLowerCase().includes(q) ||
        p.clientName.toLowerCase().includes(q) ||
        (p.address?.toLowerCase().includes(q) ?? false)
      ) {
        out.push({
          type: "project",
          id: p.id,
          projectId: p.id,
          title: p.name,
          subtitle: `Cliente: ${p.clientName}`,
        });
      }
      for (const e of p.expenses) {
        if (
          e.description.toLowerCase().includes(q) ||
          e.category.toLowerCase().includes(q) ||
          (e.employeeName?.toLowerCase().includes(q) ?? false) ||
          (e.invoiceNumber?.toLowerCase().includes(q) ?? false) ||
          (e.notes?.toLowerCase().includes(q) ?? false)
        ) {
          out.push({
            type: "expense",
            id: e.id,
            projectId: p.id,
            title: e.description,
            subtitle: `${p.name} · ${formatDate(e.date)}`,
            amount: e.amount,
            category: e.category,
          });
        }
      }
      if (out.length >= 24) break;
    }
    return out.slice(0, 24);
  }, [query, projects]);

  useEffect(() => {
    setHighlighted(0);
  }, [results]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setHighlighted(0);
    }
  }, [open]);

  const handleSelect = (result: SearchResult) => {
    navigate({ to: "/projects/$projectId", params: { projectId: result.projectId } });
    setOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlighted((v) => Math.min(v + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted((v) => Math.max(v - 1, 0));
    } else if (e.key === "Enter" && results[highlighted]) {
      handleSelect(results[highlighted]);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-2xl sm:max-w-[540px] p-0 overflow-hidden gap-0 top-[15%] translate-y-0 [&>button]:hidden">
          {/* Search input */}
          <div className="flex items-center gap-3 border-b px-4 py-3">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <Input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Buscar obras, gastos, clientes, NF…"
              className="h-10 border-0 bg-transparent p-0 text-base font-medium shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/60"
            />
            <kbd className="rounded-md border bg-muted px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground shrink-0">
              ESC
            </kbd>
          </div>

          {/* Results */}
          {query.trim() ? (
            results.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 text-sm font-medium text-muted-foreground">
                <Search className="mb-3 h-9 w-9 opacity-20" />
                <p>Nenhum resultado para</p>
                <p className="mt-0.5 font-bold text-foreground">"{query}"</p>
              </div>
            ) : (
              <div className="max-h-[420px] overflow-y-auto p-2">
                {results.map((r, i) => (
                  <button
                    key={`${r.type}-${r.id}`}
                    onClick={() => handleSelect(r)}
                    onMouseEnter={() => setHighlighted(i)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors",
                      highlighted === i ? "bg-accent" : "hover:bg-accent/60",
                    )}
                  >
                    <div
                      className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                        r.type === "project"
                          ? "bg-primary/10 text-primary"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      {r.type === "project" ? (
                        <HardHat className="h-4 w-4" />
                      ) : (
                        <Receipt className="h-4 w-4" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-foreground">{r.title}</p>
                      <p className="truncate text-[11px] font-medium text-muted-foreground">
                        {r.subtitle}
                      </p>
                    </div>
                    {r.category && <CategoryBadge category={r.category} />}
                    {r.amount !== undefined && (
                      <span className="shrink-0 text-sm font-black tabular-nums text-foreground">
                        {formatBRL(r.amount)}
                      </span>
                    )}
                    <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/40" />
                  </button>
                ))}
              </div>
            )
          ) : (
            <div className="px-4 py-8 text-center">
              <p className="text-sm font-medium text-muted-foreground">
                Pesquise obras, gastos, clientes, notas fiscais…
              </p>
              <div className="mt-3 flex items-center justify-center gap-2">
                <div className="flex items-center gap-1">
                  <kbd className="rounded-md border bg-muted px-2 py-1 text-[10px] font-bold text-muted-foreground">
                    ↑↓
                  </kbd>
                  <span className="text-[11px] text-muted-foreground">navegar</span>
                </div>
                <div className="flex items-center gap-1">
                  <kbd className="rounded-md border bg-muted px-2 py-1 text-[10px] font-bold text-muted-foreground">
                    ↵
                  </kbd>
                  <span className="text-[11px] text-muted-foreground">abrir</span>
                </div>
                <div className="flex items-center gap-1">
                  <kbd className="rounded-md border bg-muted px-2 py-1 text-[10px] font-bold text-muted-foreground">
                    ESC
                  </kbd>
                  <span className="text-[11px] text-muted-foreground">fechar</span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
