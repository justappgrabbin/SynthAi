import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GlyphId } from "@/components/glyph-id";
import { ChevronDown, ChevronRight, Upload, Shield, Trash2, Package, FileCode } from "lucide-react";
import type { AuditLog } from "@shared/schema";
import { formatDistanceToNow, format } from "date-fns";
import { cn } from "@/lib/utils";

interface AuditTimelineProps {
  logs: AuditLog[];
  className?: string;
}

const actionIcons: Record<string, React.ElementType> = {
  ingest: Upload,
  promote: Shield,
  delete: Trash2,
  assemble: Package,
  create: FileCode,
};

const actionColors: Record<string, string> = {
  ingest: "text-chart-2 bg-chart-2/10",
  promote: "text-chart-1 bg-chart-1/10",
  delete: "text-destructive bg-destructive/10",
  assemble: "text-chart-3 bg-chart-3/10",
  create: "text-chart-4 bg-chart-4/10",
};

export function AuditTimeline({ logs, className }: AuditTimelineProps) {
  return (
    <div className={cn("relative", className)}>
      <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
      <div className="space-y-4">
        {logs.map((log) => (
          <AuditEntry key={log.id} log={log} />
        ))}
      </div>
    </div>
  );
}

function AuditEntry({ log }: { log: AuditLog }) {
  const [expanded, setExpanded] = useState(false);
  const Icon = actionIcons[log.action] || FileCode;
  const colorClass = actionColors[log.action] || "text-muted-foreground bg-muted";

  return (
    <div className="relative pl-10" data-testid={`audit-entry-${log.id}`}>
      <div className={cn(
        "absolute left-2 w-5 h-5 rounded-full flex items-center justify-center ring-4 ring-background",
        colorClass
      )}>
        <Icon className="h-2.5 w-2.5" />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold capitalize">{log.action}</span>
                {log.glyphId && <GlyphId id={log.glyphId} truncate />}
              </div>
              <div className="flex items-center gap-2 text-caption text-muted-foreground">
                <span>{log.actor}</span>
                <span>·</span>
                <time 
                  title={format(new Date(log.at), "PPpp")}
                  dateTime={new Date(log.at).toISOString()}
                >
                  {formatDistanceToNow(new Date(log.at), { addSuffix: true })}
                </time>
              </div>
            </div>
            {log.payload && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0"
                onClick={() => setExpanded(!expanded)}
                data-testid="button-expand-payload"
              >
                {expanded ? (
                  <ChevronDown className="h-3 w-3" />
                ) : (
                  <ChevronRight className="h-3 w-3" />
                )}
              </Button>
            )}
          </div>
        </CardHeader>

        {expanded && log.payload && (
          <CardContent className="pt-0">
            <pre className="text-[11px] font-mono p-3 bg-muted/50 rounded-md overflow-x-auto">
              {JSON.stringify(log.payload, null, 2)}
            </pre>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
