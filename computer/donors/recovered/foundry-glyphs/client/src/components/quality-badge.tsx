import { Badge } from "@/components/ui/badge";
import type { QualityState } from "@shared/schema";
import { cn } from "@/lib/utils";

interface QualityBadgeProps {
  quality: QualityState;
  className?: string;
}

export function QualityBadge({ quality, className }: QualityBadgeProps) {
  const variants = {
    draft: "border-dashed border-muted-foreground/40 bg-muted/50 text-muted-foreground",
    tested: "border-solid border-chart-2/60 bg-chart-2/10 text-chart-2 dark:text-chart-2",
    production: "border-double border-2 border-chart-1/60 bg-chart-1/10 text-chart-1 dark:text-chart-1",
  };

  return (
    <Badge
      variant="outline"
      className={cn(
        "font-mono text-[10px] uppercase tracking-wider px-2 py-0.5",
        variants[quality],
        className
      )}
      data-testid={`badge-quality-${quality}`}
    >
      {quality}
    </Badge>
  );
}
