import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { GlyphId } from "@/components/glyph-id";
import { QualityBadge } from "@/components/quality-badge";
import { GlyphTypeIcon } from "@/components/glyph-type-icon";
import { PromotionModal } from "@/components/promotion-modal";
import { AuditTimeline } from "@/components/audit-timeline";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  ArrowLeft,
  Copy,
  Download,
  ArrowUpRight,
  Calendar,
  User,
  FileCode,
  Link2,
  Box,
} from "lucide-react";
import type { Glyph, AuditLog, Edge, QualityState } from "@shared/schema";
import { format } from "date-fns";

export default function Registry() {
  const { id } = useParams<{ id: string }>();
  const [promotionOpen, setPromotionOpen] = useState(false);
  const { toast } = useToast();

  const { data: glyph, isLoading } = useQuery<Glyph>({
    queryKey: ["/api/glyphs", id],
    enabled: !!id,
  });

  const { data: allGlyphs } = useQuery<Glyph[]>({
    queryKey: ["/api/glyphs"],
  });

  const { data: auditLogs } = useQuery<AuditLog[]>({
    queryKey: ["/api/audit"],
  });

  const { data: edges } = useQuery<Edge[]>({
    queryKey: ["/api/edges"],
  });

  const glyphLogs = auditLogs?.filter(l => l.glyphId === id);
  const parents = edges?.filter(e => e.childId === id).map(e => e.parentId);
  const children = edges?.filter(e => e.parentId === id).map(e => e.childId);
  const parentGlyphs = allGlyphs?.filter(g => parents?.includes(g.id));
  const childGlyphs = allGlyphs?.filter(g => children?.includes(g.id));

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
        title: "Glyph promoted",
        description: "Quality state updated successfully.",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-6 max-w-screen-2xl mx-auto">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardContent className="p-6">
              <Skeleton className="h-6 w-32 mb-4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4 mt-2" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!glyph) {
    return (
      <div className="p-6 max-w-screen-2xl mx-auto">
        <div className="text-center py-16">
          <Box className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h2 className="text-lg font-medium">Glyph not found</h2>
          <p className="text-muted-foreground mt-1">The glyph with this ID does not exist.</p>
          <Button variant="outline" className="mt-4" asChild>
            <Link href="/registry">Back to Registry</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-screen-2xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/registry">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <GlyphTypeIcon type={glyph.type} kind={glyph.kind} className="h-6 w-6" />
            <h1 className="text-headline font-semibold">{glyph.name}</h1>
            <QualityBadge quality={glyph.quality} />
          </div>
          <GlyphId id={glyph.id} className="mt-1" />
        </div>
        <Button
          onClick={() => setPromotionOpen(true)}
          disabled={glyph.quality === "production"}
          data-testid="button-promote-glyph"
        >
          <ArrowUpRight className="h-4 w-4 mr-2" />
          Promote
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-medium">Metadata</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <p className="text-caption text-muted-foreground">Type</p>
                  <p className="text-sm font-medium capitalize">{glyph.type}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-caption text-muted-foreground">Kind</p>
                  <p className="text-sm font-medium capitalize">{glyph.kind || "—"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-caption text-muted-foreground">Language</p>
                  <p className="text-sm font-medium">{glyph.language}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-caption text-muted-foreground">Size</p>
                  <p className="text-sm font-medium">{(glyph.sizeBytes / 1024).toFixed(1)} KB</p>
                </div>
                <div className="space-y-1">
                  <p className="text-caption text-muted-foreground">Produced</p>
                  <p className="text-sm font-medium">
                    {format(new Date(glyph.producedAt), "PPp")}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-caption text-muted-foreground">Producer</p>
                  <p className="text-sm font-medium">
                    {glyph.producer?.tool} @ {glyph.producer?.host}
                  </p>
                </div>
              </div>

              <Separator className="my-4" />

              <div className="space-y-1">
                <p className="text-caption text-muted-foreground">CAS SHA-256</p>
                <div className="flex items-center gap-2">
                  <code className="text-xs font-mono bg-muted px-2 py-1 rounded flex-1 truncate">
                    {glyph.casSha256}
                  </code>
                  <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base font-medium">Lineage</CardTitle>
              <CardDescription>
                Parent fragments and dependent apps
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {parentGlyphs && parentGlyphs.length > 0 && (
                <div>
                  <p className="text-caption text-muted-foreground mb-2">Parents</p>
                  <div className="space-y-2">
                    {parentGlyphs.map(parent => (
                      <Link key={parent.id} href={`/registry/${parent.id}`}>
                        <div className="flex items-center gap-3 p-2 rounded-lg bg-muted/50 hover-elevate cursor-pointer">
                          <GlyphTypeIcon type={parent.type} kind={parent.kind} className="h-4 w-4" />
                          <span className="text-sm font-medium flex-1 truncate">{parent.name}</span>
                          <QualityBadge quality={parent.quality} className="scale-90" />
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {childGlyphs && childGlyphs.length > 0 && (
                <div>
                  <p className="text-caption text-muted-foreground mb-2">Children</p>
                  <div className="space-y-2">
                    {childGlyphs.map(child => (
                      <Link key={child.id} href={`/registry/${child.id}`}>
                        <div className="flex items-center gap-3 p-2 rounded-lg bg-muted/50 hover-elevate cursor-pointer">
                          <GlyphTypeIcon type={child.type} kind={child.kind} className="h-4 w-4" />
                          <span className="text-sm font-medium flex-1 truncate">{child.name}</span>
                          <QualityBadge quality={child.quality} className="scale-90" />
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {(!parentGlyphs || parentGlyphs.length === 0) && (!childGlyphs || childGlyphs.length === 0) && (
                <div className="text-center py-4 text-muted-foreground">
                  <Link2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No lineage relationships</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-medium">Audit History</CardTitle>
              <CardDescription>
                Events for this glyph
              </CardDescription>
            </CardHeader>
            <CardContent>
              {glyphLogs && glyphLogs.length > 0 ? (
                <AuditTimeline logs={glyphLogs} />
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No audit events recorded
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <PromotionModal
        glyph={glyph}
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
