import { useCallback, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { QualityBadge } from "@/components/quality-badge";
import { GlyphTypeIcon } from "@/components/glyph-type-icon";
import { ZoomIn, ZoomOut, Maximize2 } from "lucide-react";
import type { LineageGraph, LineageNode as LineageNodeType } from "@shared/schema";
import { cn } from "@/lib/utils";

interface LineageGraphProps {
  graph: LineageGraph;
  selectedNodeId?: string;
  onNodeSelect?: (nodeId: string) => void;
  className?: string;
}

export function LineageGraphView({ graph, selectedNodeId, onNodeSelect, className }: LineageGraphProps) {
  const { nodes, edges } = graph;

  const levels = useMemo(() => {
    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    const inDegree = new Map<string, number>();
    const children = new Map<string, string[]>();

    nodes.forEach(n => {
      inDegree.set(n.id, 0);
      children.set(n.id, []);
    });

    edges.forEach(e => {
      inDegree.set(e.target, (inDegree.get(e.target) || 0) + 1);
      children.get(e.source)?.push(e.target);
    });

    const levels: LineageNodeType[][] = [];
    const visited = new Set<string>();
    let current = nodes.filter(n => inDegree.get(n.id) === 0);

    while (current.length > 0) {
      levels.push(current);
      current.forEach(n => visited.add(n.id));
      
      const next: LineageNodeType[] = [];
      current.forEach(n => {
        children.get(n.id)?.forEach(childId => {
          if (!visited.has(childId) && nodeMap.has(childId)) {
            const allParentsVisited = edges
              .filter(e => e.target === childId)
              .every(e => visited.has(e.source));
            if (allParentsVisited) {
              next.push(nodeMap.get(childId)!);
            }
          }
        });
      });
      current = [...new Set(next)];
    }

    const remaining = nodes.filter(n => !visited.has(n.id));
    if (remaining.length > 0) {
      levels.push(remaining);
    }

    return levels;
  }, [nodes, edges]);

  const nodePositions = useMemo(() => {
    const positions = new Map<string, { x: number; y: number; level: number }>();
    const levelHeight = 120;
    const nodeWidth = 200;
    const nodeGap = 40;

    levels.forEach((levelNodes, levelIndex) => {
      const totalWidth = levelNodes.length * nodeWidth + (levelNodes.length - 1) * nodeGap;
      const startX = -totalWidth / 2;

      levelNodes.forEach((node, nodeIndex) => {
        positions.set(node.id, {
          x: startX + nodeIndex * (nodeWidth + nodeGap) + nodeWidth / 2,
          y: levelIndex * levelHeight,
          level: levelIndex,
        });
      });
    });

    return positions;
  }, [levels]);

  const svgWidth = 800;
  const svgHeight = Math.max(400, levels.length * 120 + 80);
  const centerX = svgWidth / 2;
  const paddingTop = 60;

  return (
    <div className={cn("relative", className)}>
      <div className="absolute top-2 right-2 z-10 flex items-center gap-1">
        <Button variant="outline" size="icon" className="h-8 w-8" data-testid="button-zoom-in">
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" className="h-8 w-8" data-testid="button-zoom-out">
          <ZoomOut className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" className="h-8 w-8" data-testid="button-fit-view">
          <Maximize2 className="h-4 w-4" />
        </Button>
      </div>

      <svg 
        width="100%" 
        height={svgHeight} 
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        className="bg-muted/20 rounded-lg"
      >
        <defs>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <polygon 
              points="0 0, 10 3.5, 0 7" 
              className="fill-muted-foreground/50" 
            />
          </marker>
        </defs>

        <g transform={`translate(${centerX}, ${paddingTop})`}>
          {edges.map((edge, i) => {
            const from = nodePositions.get(edge.source);
            const to = nodePositions.get(edge.target);
            if (!from || !to) return null;

            const y1 = from.y + 28;
            const y2 = to.y - 4;
            const midY = (y1 + y2) / 2;

            return (
              <path
                key={i}
                d={`M ${from.x} ${y1} C ${from.x} ${midY}, ${to.x} ${midY}, ${to.x} ${y2}`}
                fill="none"
                className="stroke-muted-foreground/30"
                strokeWidth="2"
                markerEnd="url(#arrowhead)"
              />
            );
          })}

          {nodes.map((node) => {
            const pos = nodePositions.get(node.id);
            if (!pos) return null;

            return (
              <g 
                key={node.id}
                transform={`translate(${pos.x - 80}, ${pos.y - 20})`}
                className="cursor-pointer"
                onClick={() => onNodeSelect?.(node.id)}
              >
                <rect
                  width="160"
                  height="56"
                  rx="8"
                  className={cn(
                    "transition-colors",
                    selectedNodeId === node.id 
                      ? "fill-primary/20 stroke-primary stroke-2"
                      : "fill-card stroke-border hover:stroke-primary/50"
                  )}
                />
                <foreignObject x="8" y="8" width="144" height="40">
                  <div className="flex flex-col items-center justify-center h-full">
                    <div className="flex items-center gap-1.5 mb-1">
                      <GlyphTypeIcon type={node.type} className="h-3 w-3" />
                      <span className="text-xs font-medium truncate max-w-[100px]">
                        {node.name}
                      </span>
                    </div>
                    <QualityBadge quality={node.quality} className="scale-90" />
                  </div>
                </foreignObject>
              </g>
            );
          })}
        </g>
      </svg>

      {nodes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-muted-foreground text-sm">No lineage data available</p>
        </div>
      )}
    </div>
  );
}
