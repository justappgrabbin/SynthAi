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
import { Search, Layers, Plus } from "lucide-react";
import type { Glyph, QualityState } from "@shared/schema";
import { useLocation } from "wouter";

export default function Apps() {
  const [search, setSearch] = useState("");
  const [qualityFilter, setQualityFilter] = useState<string>("all");
  const [selectedGlyph, setSelectedGlyph] = useState<Glyph | null>(null);
  const [promotionOpen, setPromotionOpen] = useState(false);
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const { data: allGlyphs, isLoading } = useQuery<Glyph[]>({
    queryKey: ["/api/glyphs"],
  });

  const apps = allGlyphs?.filter(g => g.type === "app");

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
        title: "App promoted",
        description: "Quality state updated successfully.",
      });
    },
  });

  const filteredApps = apps?.filter((a) => {
    if (search && !a.name.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    if (qualityFilter !== "all" && a.quality !== qualityFilter) return false;
    return true;
  });

  return (
    <div className="p-6 space-y-6 max-w-screen-2xl mx-auto">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-headline font-semibold">Apps</h1>
          <p className="text-body text-muted-foreground mt-1">
            Assembled applications from fragments
          </p>
        </div>
        <Button data-testid="button-assemble-app">
          <Plus className="h-4 w-4 mr-2" />
          Assemble New App
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search apps..."
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            data-testid="input-search-apps"
          />
        </div>
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
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
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
      ) : filteredApps && filteredApps.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredApps.map((app) => (
            <GlyphCard
              key={app.id}
              glyph={app}
              onView={() => navigate(`/registry/${app.id}`)}
              onPromote={() => {
                setSelectedGlyph(app);
                setPromotionOpen(true);
              }}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 text-muted-foreground">
          <Layers className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-base">No apps found</p>
          <p className="text-caption mt-1">
            {search || qualityFilter !== "all"
              ? "Try adjusting your filters"
              : "Assemble your first app from fragments"}
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
