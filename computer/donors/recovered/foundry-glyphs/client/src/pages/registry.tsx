import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { QualityBadge } from "@/components/quality-badge";
import { GlyphId } from "@/components/glyph-id";
import { GlyphTypeIcon } from "@/components/glyph-type-icon";
import { PromotionModal } from "@/components/promotion-modal";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { 
  Search, 
  Filter, 
  Download, 
  Shield, 
  ArrowUpDown,
  MoreHorizontal,
  Eye
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Glyph, QualityState } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";
import { Link } from "wouter";

export default function Registry() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [qualityFilter, setQualityFilter] = useState<string>("all");
  const [selectedGlyph, setSelectedGlyph] = useState<Glyph | null>(null);
  const [promotionOpen, setPromotionOpen] = useState(false);
  const { toast } = useToast();

  const { data: glyphs, isLoading } = useQuery<Glyph[]>({
    queryKey: ["/api/glyphs"],
  });

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
      queryClient.invalidateQueries({ queryKey: ["/api/audit"] });
      setPromotionOpen(false);
      toast({
        title: "Glyph promoted",
        description: "The quality state has been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Promotion failed",
        description: "Unable to promote the glyph. Please try again.",
        variant: "destructive",
      });
    },
  });

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const filteredGlyphs = glyphs?.filter((g) => {
    if (search && !g.name.toLowerCase().includes(search.toLowerCase()) && 
        !g.id.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    if (typeFilter !== "all" && g.type !== typeFilter) return false;
    if (qualityFilter !== "all" && g.quality !== qualityFilter) return false;
    return true;
  });

  return (
    <div className="p-6 space-y-6 max-w-screen-2xl mx-auto">
      <div>
        <h1 className="text-headline font-semibold">Registry</h1>
        <p className="text-body text-muted-foreground mt-1">
          Browse and manage all glyphs in your foundry
        </p>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or glyph ID..."
                className="pl-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                data-testid="input-search-glyphs"
              />
            </div>
            <div className="flex gap-2">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[130px]" data-testid="select-type-filter">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="fragment">Fragment</SelectItem>
                  <SelectItem value="app">App</SelectItem>
                  <SelectItem value="asset">Asset</SelectItem>
                </SelectContent>
              </Select>
              <Select value={qualityFilter} onValueChange={setQualityFilter}>
                <SelectTrigger className="w-[140px]" data-testid="select-quality-filter">
                  <Shield className="h-4 w-4 mr-2" />
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
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="border-t">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[280px]">
                    <Button variant="ghost" size="sm" className="h-auto py-1 px-0 font-medium">
                      Name <ArrowUpDown className="ml-1 h-3 w-3" />
                    </Button>
                  </TableHead>
                  <TableHead>Glyph ID</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Quality</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-[60px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  [...Array(5)].map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredGlyphs && filteredGlyphs.length > 0 ? (
                  filteredGlyphs.map((glyph) => (
                    <TableRow key={glyph.id} data-testid={`row-glyph-${glyph.id}`}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <GlyphTypeIcon type={glyph.type} kind={glyph.kind} />
                          <span className="font-medium truncate max-w-[200px]">
                            {glyph.name}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <GlyphId id={glyph.id} truncate />
                      </TableCell>
                      <TableCell>
                        <span className="capitalize text-sm">{glyph.type}</span>
                      </TableCell>
                      <TableCell>
                        <QualityBadge quality={glyph.quality} />
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-sm text-muted-foreground">
                          {formatBytes(glyph.sizeBytes)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {formatDistanceToNow(new Date(glyph.producedAt), { addSuffix: true })}
                        </span>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              data-testid={`button-actions-${glyph.id}`}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link href={`/registry/${glyph.id}`}>
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Download className="h-4 w-4 mr-2" />
                              Export
                            </DropdownMenuItem>
                            {glyph.quality !== "production" && (
                              <DropdownMenuItem 
                                onClick={() => {
                                  setSelectedGlyph(glyph);
                                  setPromotionOpen(true);
                                }}
                              >
                                <Shield className="h-4 w-4 mr-2" />
                                Promote
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center">
                      <div className="text-muted-foreground">
                        <p className="text-sm">No glyphs found</p>
                        <p className="text-caption mt-1">
                          {search || typeFilter !== "all" || qualityFilter !== "all"
                            ? "Try adjusting your filters"
                            : "Ingest your first fragment to get started"}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

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
