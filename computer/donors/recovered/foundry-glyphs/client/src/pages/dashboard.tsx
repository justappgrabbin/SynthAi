import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatsCard } from "@/components/stats-card";
import { AuditTimeline } from "@/components/audit-timeline";
import { GlyphCard } from "@/components/glyph-card";
import {
  Layers,
  Box,
  ArrowUpRight,
  Activity,
  Plus,
  GitBranch,
  ScrollText,
} from "lucide-react";
import type { DashboardStats, AuditLog, Glyph } from "@shared/schema";
import { Link, useLocation } from "wouter";

export default function Dashboard() {
  const [, navigate] = useLocation();

  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/stats"],
  });

  const { data: logs, isLoading: logsLoading } = useQuery<AuditLog[]>({
    queryKey: ["/api/audit"],
  });

  const { data: glyphs, isLoading: glyphsLoading } = useQuery<Glyph[]>({
    queryKey: ["/api/glyphs"],
  });

  const recentGlyphs = glyphs?.slice(0, 4);
  const recentLogs = logs?.slice(0, 8);

  return (
    <div className="p-6 space-y-6 max-w-screen-2xl mx-auto">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-headline font-semibold">Dashboard</h1>
          <p className="text-body text-muted-foreground mt-1">
            Foundry overview and recent activity
          </p>
        </div>
        <Button asChild data-testid="button-new-fragment">
          <Link href="/fragments">
            <Plus className="h-4 w-4 mr-2" />
            Ingest Fragment
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statsLoading ? (
          [...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-3 w-32 mt-2" />
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            <StatsCard
              title="Total Glyphs"
              value={stats?.totalGlyphs ?? 0}
              description="Across all types"
              icon={Layers}
            />
            <StatsCard
              title="Fragments"
              value={stats?.fragmentCount ?? 0}
              description={`${stats?.productionCount ?? 0} in production`}
              icon={Box}
            />
            <StatsCard
              title="Recent Builds"
              value={stats?.recentBuilds ?? 0}
              description="Last 7 days"
              icon={Activity}
            />
            <StatsCard
              title="Promotions"
              value={stats?.recentPromotions ?? 0}
              description="To production"
              icon={ArrowUpRight}
            />
          </>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
            <div>
              <CardTitle className="text-base font-medium">Recent Glyphs</CardTitle>
              <CardDescription>Latest ingested fragments and apps</CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/registry">View All</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {glyphsLoading ? (
              [...Array(4)].map((_, i) => (
                <div key={i} className="flex items-start gap-3">
                  <Skeleton className="h-8 w-8 rounded" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48 mt-1" />
                  </div>
                  <Skeleton className="h-5 w-16" />
                </div>
              ))
            ) : recentGlyphs && recentGlyphs.length > 0 ? (
              recentGlyphs.map((glyph) => (
                <GlyphCard
                  key={glyph.id}
                  glyph={glyph}
                  compact
                  onView={() => navigate(`/registry/${glyph.id}`)}
                />
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Box className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No glyphs yet</p>
                <p className="text-caption mt-1">Ingest your first fragment to get started</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
            <div>
              <CardTitle className="text-base font-medium">Recent Activity</CardTitle>
              <CardDescription>Latest audit events</CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/audit">View All</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {logsLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <Skeleton className="h-5 w-5 rounded-full" />
                    <div className="flex-1">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-48 mt-1" />
                    </div>
                  </div>
                ))}
              </div>
            ) : recentLogs && recentLogs.length > 0 ? (
              <AuditTimeline logs={recentLogs} />
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <ScrollText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No activity yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium">Quick Actions</CardTitle>
          <CardDescription>Common tasks and workflows</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Button variant="outline" className="h-auto py-4 flex-col items-start gap-2" asChild>
              <Link href="/fragments">
                <Box className="h-5 w-5 text-primary" />
                <div className="text-left">
                  <p className="font-medium">Browse Fragments</p>
                  <p className="text-caption text-muted-foreground">View all components</p>
                </div>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex-col items-start gap-2" asChild>
              <Link href="/assembly">
                <Layers className="h-5 w-5 text-primary" />
                <div className="text-left">
                  <p className="font-medium">Assemble App</p>
                  <p className="text-caption text-muted-foreground">Build from fragments</p>
                </div>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex-col items-start gap-2" asChild>
              <Link href="/lineage">
                <GitBranch className="h-5 w-5 text-primary" />
                <div className="text-left">
                  <p className="font-medium">View Lineage</p>
                  <p className="text-caption text-muted-foreground">Dependency graph</p>
                </div>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex-col items-start gap-2" asChild>
              <Link href="/audit">
                <ScrollText className="h-5 w-5 text-primary" />
                <div className="text-left">
                  <p className="font-medium">Audit Log</p>
                  <p className="text-caption text-muted-foreground">All events</p>
                </div>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
