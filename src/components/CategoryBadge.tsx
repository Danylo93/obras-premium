import { CATEGORY_BADGE_CLASSES } from "@/lib/categories";
import { cn } from "@/lib/utils";
import type { Category } from "@/types";

export function CategoryBadge({
  category,
  className,
}: {
  category: Category;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wider",
        CATEGORY_BADGE_CLASSES[category],
        className,
      )}
    >
      {category}
    </span>
  );
}
