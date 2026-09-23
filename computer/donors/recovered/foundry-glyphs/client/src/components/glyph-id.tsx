import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface GlyphIdProps {
  id: string;
  truncate?: boolean;
  className?: string;
}

export function GlyphId({ id, truncate = true, className }: GlyphIdProps) {
  const [copied, setCopied] = useState(false);

  const displayId = truncate && id.length > 20 
    ? `${id.slice(0, 12)}...${id.slice(-6)}`
    : id;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={cn("inline-flex items-center gap-1 group", className)}>
      <Tooltip>
        <TooltipTrigger asChild>
          <code 
            className="font-mono text-code bg-muted/50 px-2 py-0.5 rounded text-foreground/80 cursor-default"
            data-testid="text-glyph-id"
          >
            {displayId}
          </code>
        </TooltipTrigger>
        <TooltipContent side="top" className="font-mono text-xs max-w-[400px] break-all">
          {id}
        </TooltipContent>
      </Tooltip>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={handleCopy}
        data-testid="button-copy-glyph-id"
      >
        {copied ? (
          <Check className="h-3 w-3 text-chart-2" />
        ) : (
          <Copy className="h-3 w-3 text-muted-foreground" />
        )}
      </Button>
    </div>
  );
}
