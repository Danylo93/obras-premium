import { STATUS_BADGE_CLASSES } from "@/lib/categories";
import { cn } from "@/lib/utils";
import type { ProjectStatus } from "@/types";

export function StatusBadge({
  status,
  className,
}: {
  status: ProjectStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wider",
        STATUS_BADGE_CLASSES[status],
        className,
      )}
    >
      {status}
    </span>
  );
}
