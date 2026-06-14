import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  iconClassName?: string;
  hint?: string;
  hintClassName?: string;
  /** Use em grades densas (4 colunas) onde o texto precisa ser menor */
  compact?: boolean;
}

export function StatsCard({
  title,
  value,
  icon: Icon,
  iconClassName,
  hint,
  hintClassName,
  compact,
}: StatsCardProps) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border bg-card p-4 shadow-sm md:gap-4 md:p-5">
      <div
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl md:h-12 md:w-12",
          iconClassName ?? "bg-primary/10 text-primary",
        )}
      >
        <Icon className="h-5 w-5 md:h-6 md:w-6" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          {title}
        </p>
        <p
          className={cn(
            "mt-0.5 font-black tabular-nums text-foreground leading-tight",
            compact ? "text-base md:text-lg" : "text-lg md:text-xl lg:text-2xl",
          )}
          title={value}
        >
          {value}
        </p>
        {hint && (
          <p className={cn("mt-0.5 text-[11px] font-semibold text-muted-foreground", hintClassName)}>
            {hint}
          </p>
        )}
      </div>
    </div>
  );
}
