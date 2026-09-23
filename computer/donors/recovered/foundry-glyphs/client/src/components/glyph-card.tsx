import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { QualityBadge } from "./quality-badge";
import { GlyphId } from "./glyph-id";
import { GlyphTypeIcon } from "./glyph-type-icon";
import { formatDistanceToNow } from "date-fns";
import { Eye, ArrowUpRight } from "lucide-react";
import type { Glyph } from "@shared/schema";
import { cn } from "@/lib/utils";

interface GlyphCardProps {
  glyph: Glyph;
  onView?: () => void;
  onPromote?: () => void;
  compact?: boolean;
  className?: string;
}

export function GlyphCard({ glyph, onView, onPromote, compact, className }: GlyphCardProps) {
  if (compact) {
    return (
      <div 
        className={cn(
          "flex items-center gap-3 p-2 rounded-md hover-elevate cursor-pointer",
          className
        )}
        onClick={onView}
        data-testid={`glyph-card-${glyph.id}`}
      >
        <GlyphTypeIcon type={glyph.type} kind={glyph.kind} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{glyph.name}</p>
          <p className="text-caption text-muted-foreground">
            {formatDistanceToNow(new Date(glyph.producedAt), { addSuffix: true })}
          </p>
        </div>
        <QualityBadge quality={glyph.quality} />
      </div>
    );
  }

  return (
    <Card 
      className={cn("p-4 hover-elevate", className)}
      data-testid={`glyph-card-${glyph.id}`}
    >
      <div className="flex items-start gap-3">
        <GlyphTypeIcon type={glyph.type} kind={glyph.kind} className="mt-0.5" />
        
        <div className="flex-1 min-w-0 space-y-2">
          <div>
            <h3 className="font-medium text-base truncate" title={glyph.name}>
              {glyph.name}
            </h3>
            <GlyphId id={glyph.id} truncate className="mt-0.5" />
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-caption">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Type:</span>
              <span className="capitalize">{glyph.type}</span>
            </div>
            {glyph.kind && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Kind:</span>
                <span className="capitalize">{glyph.kind}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Size:</span>
              <span>{(glyph.sizeBytes / 1024).toFixed(1)} KB</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Language:</span>
              <span>{glyph.language}</span>
            </div>
          </div>

          <p className="text-caption text-muted-foreground">
            Produced {formatDistanceToNow(new Date(glyph.producedAt), { addSuffix: true })}
            {glyph.producer && ` by ${glyph.producer.tool}`}
          </p>
        </div>

        <QualityBadge quality={glyph.quality} />
      </div>

      <div className="flex items-center justify-end gap-2 mt-3 pt-3 border-t">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onView}
          data-testid={`button-view-${glyph.id}`}
        >
          <Eye className="h-3 w-3 mr-1" />
          View
        </Button>
        {glyph.quality !== "production" && onPromote && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onPromote}
            data-testid={`button-promote-${glyph.id}`}
          >
            <ArrowUpRight className="h-3 w-3 mr-1" />
            Promote
          </Button>
        )}
      </div>
    </Card>
  );
}
