import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { GlyphCard } from "@/components/glyph-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { PromotionModal } from "@/components/promotion-modal";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Search, LayoutGrid, List, Box, Filter } from "lucide-react";
import type { Glyph, QualityState } from "@shared/schema";
import { useLocation } from "wouter";

export default function Fragments() {
  const [search, setSearch] = useState("");
  const [kindFilter, setKindFilter] = useState<string>("all");
  const [qualityFilter, setQualityFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedGlyph, setSelectedGlyph] = useState<Glyph | null>(null);
  const [promotionOpen, setPromotionOpen] = useState(false);
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const { data: allGlyphs, isLoading } = useQuery<Glyph[]>({
    queryKey: ["/api/glyphs"],
  });

  const fragments = allGlyphs?.filter(g => g.type === "fragment");

  const promoteMutation = useMutation({
    mutationFn: async ({ glyphId, toQuality, evidenceUri }: { 
      glyphId: string; 
      toQuality: QualityState; 
      evidenceUri: string;
    }) => {
      return apiRequest("POST", "/api/promote", { glyphId, toQuality, evidenceUri });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/glyphs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      setPromotionOpen(false);
      toast({
        title: "Fragment promoted",
        description: "Quality state updated successfully.",
      });
    },
  });

  const filteredFragments = fragments?.filter((f) => {
    if (search && !f.name.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    if (kindFilter !== "all" && f.kind !== kindFilter) return false;
    if (qualityFilter !== "all" && f.quality !== qualityFilter) return false;
    return true;
  });

  return (
    <div className="p-6 space-y-6 max-w-screen-2xl mx-auto">
      <div>
        <h1 className="text-headline font-semibold">Fragments</h1>
        <p className="text-body text-muted-foreground mt-1">
          Reusable code components with glyph identity
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search fragments..."
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            data-testid="input-search-fragments"
          />
        </div>
        <div className="flex gap-2">
          <Select value={kindFilter} onValueChange={setKindFilter}>
            <SelectTrigger className="w-[130px]" data-testid="select-kind-filter">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Kind" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Kinds</SelectItem>
              <SelectItem value="component">Component</SelectItem>
              <SelectItem value="logic">Logic</SelectItem>
              <SelectItem value="style">Style</SelectItem>
              <SelectItem value="asset">Asset</SelectItem>
            </SelectContent>
          </Select>
          <Select value={qualityFilter} onValueChange={setQualityFilter}>
            <SelectTrigger className="w-[140px]" data-testid="select-quality-filter">
              <SelectValue placeholder="Quality" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Quality</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="tested">Tested</SelectItem>
              <SelectItem value="production">Production</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex border rounded-md">
            <Button
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              size="icon"
              onClick={() => setViewMode("grid")}
              data-testid="button-view-grid"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="icon"
              onClick={() => setViewMode("list")}
              data-testid="button-view-list"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className={viewMode === "grid" 
          ? "grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          : "space-y-4"
        }>
          {[...Array(8)].map((_, i) => (
            <Card key={i} className="p-4">
              <div className="flex items-start gap-3">
                <Skeleton className="h-8 w-8 rounded" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48 mt-2" />
                </div>
                <Skeleton className="h-5 w-16" />
              </div>
            </Card>
          ))}
        </div>
      ) : filteredFragments && filteredFragments.length > 0 ? (
        <div className={viewMode === "grid"
          ? "grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          : "space-y-4"
        }>
          {filteredFragments.map((fragment) => (
            <GlyphCard
              key={fragment.id}
              glyph={fragment}
              onView={() => navigate(`/registry/${fragment.id}`)}
              onPromote={() => {
                setSelectedGlyph(fragment);
                setPromotionOpen(true);
              }}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 text-muted-foreground">
          <Box className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-base">No fragments found</p>
          <p className="text-caption mt-1">
            {search || kindFilter !== "all" || qualityFilter !== "all"
              ? "Try adjusting your filters"
              : "Ingest your first fragment to get started"}
          </p>
        </div>
      )}

      <PromotionModal
        glyph={selectedGlyph}
        open={promotionOpen}
        onOpenChange={setPromotionOpen}
        onPromote={(glyphId, toQuality, evidenceUri) =>
          promoteMutation.mutate({ glyphId, toQuality, evidenceUri })
        }
        isPending={promoteMutation.isPending}
      />
    </div>
  );
}
