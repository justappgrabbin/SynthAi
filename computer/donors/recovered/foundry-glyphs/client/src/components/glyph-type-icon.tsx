import { Box, Layers, FileCode, Image } from "lucide-react";
import type { GlyphType, FragmentKind } from "@shared/schema";
import { cn } from "@/lib/utils";

interface GlyphTypeIconProps {
  type: GlyphType;
  kind?: FragmentKind | null;
  className?: string;
}

export function GlyphTypeIcon({ type, kind, className }: GlyphTypeIconProps) {
  const iconClass = cn("h-4 w-4", className);

  if (type === "app") {
    return <Layers className={cn(iconClass, "text-chart-3")} />;
  }

  if (type === "asset") {
    return <Image className={cn(iconClass, "text-chart-4")} />;
  }

  // Fragment with different kinds
  if (kind === "component") {
    return <Box className={cn(iconClass, "text-chart-1")} />;
  }

  return <FileCode className={cn(iconClass, "text-chart-2")} />;
}
