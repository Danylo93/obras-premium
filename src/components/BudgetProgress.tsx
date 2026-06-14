import { TriangleAlert } from "lucide-react";
import { formatBRL } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Barra de progresso gasto x orçamento, com alerta visual quando estoura. */
export function BudgetProgress({
  spent,
  budget,
  className,
}: {
  spent: number;
  budget: number;
  className?: string;
}) {
  const pct = budget > 0 ? (spent / budget) * 100 : 0;
  const over = spent > budget;
  const barColor = over ? "bg-red-500" : pct >= 75 ? "bg-amber-500" : "bg-emerald-500";

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center justify-between gap-2 text-xs font-semibold">
        <span className="text-muted-foreground">{Math.round(pct)}% do orçamento</span>
        {over ? (
          <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
            <TriangleAlert className="h-3 w-3" />
            {formatBRL(spent - budget)} acima
          </span>
        ) : (
          <span className="text-muted-foreground">{formatBRL(budget - spent)} disponíveis</span>
        )}
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full transition-all duration-500", barColor)}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
    </div>
  );
}
