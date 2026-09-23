import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/stat-card";
import { AuditTimeline } from "@/components/audit-timeline";
import { QualityBadge } from "@/components/quality-badge";
import { GlyphId } from "@/components/glyph-id";
import { GlyphTypeIcon } from "@/components/glyph-type-icon";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { 
  Hexagon, 
  Box, 
  Layers, 
  Shield, 
  Package, 
  ArrowRight,
  Upload,
  Plus
} from "lucide-react";
import type { DashboardStats, Glyph, AuditLog } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/stats"],
  });

  const { data: recentGlyphs, isLoading: glyphsLoading } = useQuery<Glyph[]>({
    queryKey: ["/api/glyphs"],
  });

  const { data: recentAudit, isLoading: auditLoading } = useQuery<AuditLog[]>({
    queryKey: ["/api/audit"],
  });

  return (
    <div className="p-6 space-y-6 max-w-screen-2xl mx-auto">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-headline font-semibold">Dashboard</h1>
          <p className="text-body text-muted-foreground mt-1">
            Overview of your glyph registry and recent activity
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild data-testid="button-ingest">
            <Link href="/registry">
              <Upload className="h-4 w-4 mr-2" />
              Ingest Fragment
            </Link>
          </Button>
          <Button asChild data-testid="button-new-app">
            <Link href="/apps">
              <Plus className="h-4 w-4 mr-2" />
              New App
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {statsLoading ? (
          <>
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <Skeleton className="h-4 w-24" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-16" />
                  <Skeleton className="h-3 w-32 mt-2" />
                </CardContent>
              </Card>
            ))}
          </>
        ) : (
          <>
            <StatCard
              title="Total Glyphs"
              value={stats?.totalGlyphs ?? 0}
              description={`${stats?.fragmentCount ?? 0} fragments, ${stats?.appCount ?? 0} apps`}
              icon={Hexagon}
            />
            <StatCard
              title="Production"
              value={stats?.productionCount ?? 0}
              description="Stable, signed artifacts"
              icon={Shield}
              trend={{ value: 12, label: "from last week" }}
            />
            <StatCard
              title="Recent Builds"
              value={stats?.recentBuilds ?? 0}
              description="Assemblies in last 7 days"
              icon={Package}
            />
            <StatCard
              title="Promotions"
              value={stats?.recentPromotions ?? 0}
              description="Quality upgrades this week"
              icon={Shield}
            />
          </>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle className="text-base font-medium">Recent Glyphs</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/registry">
                View all <ArrowRight className="h-3 w-3 ml-1" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {glyphsLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-8 w-8 rounded" />
                    <div className="flex-1">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-48 mt-1" />
                    </div>
                    <Skeleton className="h-5 w-16" />
                  </div>
                ))}
              </div>
            ) : recentGlyphs && recentGlyphs.length > 0 ? (
              <div className="space-y-3">
                {recentGlyphs.map((glyph) => (
                  <Link 
                    key={glyph.id} 
                    href={`/registry/${glyph.id}`}
                    className="flex items-center gap-3 p-2 -mx-2 rounded-md hover-elevate group"
                    data-testid={`recent-glyph-${glyph.id}`}
                  >
                    <div className="w-8 h-8 rounded bg-muted flex items-center justify-center shrink-0">
                      <GlyphTypeIcon type={glyph.type} kind={glyph.kind} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{glyph.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <GlyphId id={glyph.id} truncate />
                        <span className="text-caption text-muted-foreground">
                          {formatDistanceToNow(new Date(glyph.producedAt), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                    <QualityBadge quality={glyph.quality} />
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Box className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No glyphs yet</p>
                <p className="text-caption mt-1">Ingest your first fragment to get started</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle className="text-base font-medium">Activity</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/audit">
                View all <ArrowRight className="h-3 w-3 ml-1" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {auditLoading ? (
              <div className="space-y-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <Skeleton className="h-5 w-5 rounded-full" />
                    <div className="flex-1">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-3 w-40 mt-1" />
                    </div>
                  </div>
                ))}
              </div>
            ) : recentAudit && recentAudit.length > 0 ? (
              <AuditTimeline logs={recentAudit} />
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Shield className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No activity yet</p>
                <p className="text-caption mt-1">Actions will appear here</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Quality Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-muted-foreground/30" />
                  <span className="text-sm">Draft</span>
                </div>
                <span className="font-mono text-sm">{stats?.draftCount ?? 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-chart-2" />
                  <span className="text-sm">Tested</span>
                </div>
                <span className="font-mono text-sm">{stats?.testedCount ?? 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-chart-1" />
                  <span className="text-sm">Production</span>
                </div>
                <span className="font-mono text-sm">{stats?.productionCount ?? 0}</span>
              </div>
            </div>
            {stats && stats.totalGlyphs > 0 && (
              <div className="mt-4 h-2 rounded-full bg-muted overflow-hidden flex">
                <div 
                  className="h-full bg-muted-foreground/30" 
                  style={{ width: `${(stats.draftCount / stats.totalGlyphs) * 100}%` }}
                />
                <div 
                  className="h-full bg-chart-2" 
                  style={{ width: `${(stats.testedCount / stats.totalGlyphs) * 100}%` }}
                />
                <div 
                  className="h-full bg-chart-1" 
                  style={{ width: `${(stats.productionCount / stats.totalGlyphs) * 100}%` }}
                />
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link href="/registry">
                <Upload className="h-4 w-4 mr-2" />
                Ingest Fragment
              </Link>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link href="/apps">
                <Package className="h-4 w-4 mr-2" />
                Assemble App
              </Link>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link href="/lineage">
                <Layers className="h-4 w-4 mr-2" />
                View Lineage
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              System Info
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Version</dt>
                <dd className="font-mono">1.0.0</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Runtime</dt>
                <dd className="font-mono">Node 24</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Schema</dt>
                <dd className="font-mono">v1</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Hash Algorithm</dt>
                <dd className="font-mono">BLAKE3</dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
