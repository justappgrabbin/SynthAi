import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { LineageGraphView } from "@/components/lineage-graph";
import { QualityBadge } from "@/components/quality-badge";
import { GlyphId } from "@/components/glyph-id";
import { GlyphTypeIcon } from "@/components/glyph-type-icon";
import { Search, GitBranch, ChevronRight } from "lucide-react";
import type { LineageGraph, Glyph } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";
import { Link } from "wouter";

export default function Lineage() {
  const [search, setSearch] = useState("");
  const [selectedNodeId, setSelectedNodeId] = useState<string>();
  const [rootFilter, setRootFilter] = useState<string>("all");

  const { data: lineage, isLoading: lineageLoading } = useQuery<LineageGraph>({
    queryKey: ["/api/lineage"],
  });

  const { data: glyphs } = useQuery<Glyph[]>({
    queryKey: ["/api/glyphs"],
  });

  const selectedGlyph = glyphs?.find(g => g.id === selectedNodeId);

  const glyphOptions = glyphs?.filter(g => 
    g.type === "app" || (g.origin && g.origin.parents && g.origin.parents.length === 0)
  );

  return (
    <div className="p-6 space-y-6 max-w-screen-2xl mx-auto">
      <div>
        <h1 className="text-headline font-semibold">Lineage</h1>
        <p className="text-body text-muted-foreground mt-1">
          Visualize dependencies and ancestry between glyphs
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search glyphs..."
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            data-testid="input-search-lineage"
          />
        </div>
        <Select value={rootFilter} onValueChange={setRootFilter}>
          <SelectTrigger className="w-[200px]" data-testid="select-root-filter">
            <GitBranch className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Select root" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Glyphs</SelectItem>
            {glyphOptions?.map(g => (
              <SelectItem key={g.id} value={g.id}>
                {g.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        <Card className="lg:col-span-3">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">Dependency Graph</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {lineageLoading ? (
              <div className="h-[500px] flex items-center justify-center bg-muted/20 rounded-b-lg">
                <div className="text-center">
                  <Skeleton className="h-8 w-8 rounded mx-auto mb-2" />
                  <Skeleton className="h-4 w-32" />
                </div>
              </div>
            ) : lineage ? (
              <LineageGraphView
                graph={lineage}
                selectedNodeId={selectedNodeId}
                onNodeSelect={setSelectedNodeId}
                className="h-[500px]"
              />
            ) : (
              <div className="h-[500px] flex items-center justify-center bg-muted/20 rounded-b-lg">
                <div className="text-center text-muted-foreground">
                  <GitBranch className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No lineage data available</p>
                  <p className="text-caption mt-1">Ingest fragments to see relationships</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium">Selected Node</CardTitle>
            </CardHeader>
            <CardContent>
              {selectedGlyph ? (
                <div className="space-y-4">
                  <div className="flex items-start gap-2">
                    <GlyphTypeIcon type={selectedGlyph.type} kind={selectedGlyph.kind} className="mt-0.5" />
                    <div className="min-w-0">
                      <p className="font-medium truncate">{selectedGlyph.name}</p>
                      <GlyphId id={selectedGlyph.id} truncate className="mt-0.5" />
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <QualityBadge quality={selectedGlyph.quality} />
                    <span className="text-caption text-muted-foreground">
                      {formatDistanceToNow(new Date(selectedGlyph.producedAt), { addSuffix: true })}
                    </span>
                  </div>

                  {selectedGlyph.origin?.parents && selectedGlyph.origin.parents.length > 0 && (
                    <div>
                      <p className="text-caption text-muted-foreground mb-2">Parents</p>
                      <div className="space-y-1">
                        {selectedGlyph.origin.parents.map(parentId => {
                          const parent = glyphs?.find(g => g.id === parentId);
                          return (
                            <button
                              key={parentId}
                              onClick={() => setSelectedNodeId(parentId)}
                              className="w-full text-left text-sm p-2 rounded bg-muted/50 hover-elevate flex items-center gap-2"
                            >
                              {parent && <GlyphTypeIcon type={parent.type} kind={parent.kind} className="h-3 w-3" />}
                              <span className="truncate flex-1">
                                {parent?.name || parentId.slice(0, 12)}
                              </span>
                              <ChevronRight className="h-3 w-3 text-muted-foreground" />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <Button variant="outline" size="sm" className="w-full" asChild>
                    <Link href={`/registry/${selectedGlyph.id}`}>
                      View Details
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  <p className="text-sm">Click a node to see details</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium">Legend</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <div className="w-4 h-4 rounded border-dashed border-2 border-muted-foreground/40" />
                <span>Draft</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className="w-4 h-4 rounded border-2 border-chart-2" />
                <span>Tested</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className="w-4 h-4 rounded border-double border-4 border-chart-1" />
                <span>Production</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
