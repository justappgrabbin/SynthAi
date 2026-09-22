import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: LucideIcon;
  trend?: { value: number; label: string };
  className?: string;
}

export function StatCard({ title, value, description, icon: Icon, trend, className }: StatCardProps) {
  return (
    <Card className={cn("", className)} data-testid={`stat-card-${title.toLowerCase().replace(/\s+/g, "-")}`}>
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground/70" />
      </CardHeader>
      <CardContent>
        <div className="text-display font-bold tracking-tight" data-testid="text-stat-value">
          {typeof value === "number" ? value.toLocaleString() : value}
        </div>
        {description && (
          <p className="text-caption text-muted-foreground mt-1">{description}</p>
        )}
        {trend && (
          <p className={cn(
            "text-caption mt-1 flex items-center gap-1",
            trend.value >= 0 ? "text-chart-2" : "text-destructive"
          )}>
            <span>{trend.value >= 0 ? "+" : ""}{trend.value}%</span>
            <span className="text-muted-foreground">{trend.label}</span>
          </p>
        )}
      </CardContent>
    </Card>
  );
}
