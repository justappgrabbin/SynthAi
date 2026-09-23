import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { QualityBadge } from "@/components/quality-badge";
import { GlyphId } from "@/components/glyph-id";
import { GlyphTypeIcon } from "@/components/glyph-type-icon";
import { ArrowUpRight, Download, Shield } from "lucide-react";
import type { Glyph } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";

interface GlyphCardProps {
  glyph: Glyph;
  onView?: () => void;
  onExport?: () => void;
  onPromote?: () => void;
}

export function GlyphCard({ glyph, onView, onExport, onPromote }: GlyphCardProps) {
  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Card className="group" data-testid={`card-glyph-${glyph.id}`}>
      <CardHeader className="flex flex-row items-start justify-between gap-2 pb-3">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <GlyphTypeIcon type={glyph.type} kind={glyph.kind} className="shrink-0" />
          <div className="min-w-0">
            <h3 className="font-semibold text-sm truncate" data-testid="text-glyph-name">
              {glyph.name}
            </h3>
            <GlyphId id={glyph.id} className="mt-0.5" />
          </div>
        </div>
        <QualityBadge quality={glyph.quality} />
      </CardHeader>

      <CardContent className="pb-3">
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-caption">
          <div>
            <span className="text-muted-foreground">Type</span>
            <p className="font-medium capitalize">{glyph.type}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Size</span>
            <p className="font-medium">{formatBytes(glyph.sizeBytes)}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Language</span>
            <p className="font-medium uppercase">{glyph.language || "—"}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Created</span>
            <p className="font-medium">
              {formatDistanceToNow(new Date(glyph.producedAt), { addSuffix: true })}
            </p>
          </div>
        </div>

        {glyph.exports && glyph.exports.length > 0 && (
          <div className="mt-3 pt-3 border-t">
            <span className="text-caption text-muted-foreground">Exports</span>
            <div className="flex flex-wrap gap-1 mt-1">
              {glyph.exports.slice(0, 3).map((exp) => (
                <code key={exp} className="text-[10px] px-1.5 py-0.5 bg-muted rounded font-mono">
                  {exp}
                </code>
              ))}
              {glyph.exports.length > 3 && (
                <span className="text-[10px] text-muted-foreground">
                  +{glyph.exports.length - 3} more
                </span>
              )}
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter className="pt-0 gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onView}
          className="flex-1"
          data-testid="button-view-glyph"
        >
          <ArrowUpRight className="h-3 w-3 mr-1" />
          View
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onExport}
          data-testid="button-export-glyph"
        >
          <Download className="h-3 w-3" />
        </Button>
        {glyph.quality !== "production" && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onPromote}
            data-testid="button-promote-glyph"
          >
            <Shield className="h-3 w-3" />
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
