import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  Activity,
  Database,
  GitBranch,
  Shield,
  Zap,
  Server,
  Cpu,
  HardDrive,
  Network,
  CheckCircle2,
  AlertTriangle,
  XCircle,
} from "lucide-react";
import type { DashboardStats } from "@shared/schema";

export default function System() {
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/stats"],
    refetchInterval: 5000,
  });

  const subsystems = [
    {
      name: "Glyph Storage",
      description: "Drizzle ORM with PostgreSQL backend",
      status: "operational",
      icon: Database,
      metrics: [
        { label: "Total Glyphs", value: stats?.totalGlyphs ?? "-" },
        { label: "Production", value: stats?.productionCount ?? "-" },
      ],
    },
    {
      name: "Lineage Engine",
      description: "Dependency graph tracking",
      status: "operational",
      icon: GitBranch,
      metrics: [
        { label: "Fragments", value: stats?.fragmentCount ?? "-" },
        { label: "Apps", value: stats?.appCount ?? "-" },
      ],
    },
    {
      name: "Resonance Engine",
      description: "Human Design alignment scoring",
      status: "operational",
      icon: Zap,
      metrics: [
        { label: "Schumann Base", value: "7.83 Hz" },
        { label: "Layers", value: "3" },
      ],
    },
    {
      name: "Overseer",
      description: "Supreme decision arbiter",
      status: "operational",
      icon: Shield,
      metrics: [
        { label: "Strict Mode", value: "On" },
        { label: "Min Resonance", value: "0.5" },
      ],
    },
    {
      name: "Agent System",
      description: "Autonomous worker management",
      status: "operational",
      icon: Cpu,
      metrics: [
        { label: "Max Agents", value: "12" },
        { label: "Heartbeat", value: "2s" },
      ],
    },
    {
      name: "Financial Engine",
      description: "Revenue optimization",
      status: "operational",
      icon: Activity,
      metrics: [
        { label: "Daily Target", value: "$100" },
        { label: "Risk Limit", value: "70%" },
      ],
    },
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "operational": return <CheckCircle2 className="h-4 w-4 text-chart-2" />;
      case "degraded": return <AlertTriangle className="h-4 w-4 text-chart-4" />;
      case "error": return <XCircle className="h-4 w-4 text-destructive" />;
      default: return <AlertTriangle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "operational": return <Badge className="bg-chart-2/10 text-chart-2 border-chart-2/30">Operational</Badge>;
      case "degraded": return <Badge className="bg-chart-4/10 text-chart-4 border-chart-4/30">Degraded</Badge>;
      case "error": return <Badge className="bg-destructive/10 text-destructive border-destructive/30">Error</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-screen-2xl mx-auto">
      <div>
        <h1 className="text-headline font-semibold">System</h1>
        <p className="text-body text-muted-foreground mt-1">
          Foundry infrastructure health and configuration
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Uptime
            </CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">99.9%</div>
            <p className="text-xs text-muted-foreground">Last 30 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              API Latency
            </CardTitle>
            <Network className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">12ms</div>
            <p className="text-xs text-muted-foreground">P95 average</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Storage Used
            </CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">2.4 GB</div>
            <Progress value={24} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Build Queue
            </CardTitle>
            <Cpu className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">0</div>
            <p className="text-xs text-muted-foreground">Jobs pending</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium">Subsystems</CardTitle>
          <CardDescription>
            Status of all Foundry components
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {subsystems.map((sys) => (
              <div
                key={sys.name}
                className="p-4 rounded-lg border bg-card hover-elevate"
                data-testid={`subsystem-${sys.name.toLowerCase().replace(/\s/g, "-")}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-md bg-primary/10">
                      <sys.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium">{sys.name}</h3>
                      <p className="text-xs text-muted-foreground">{sys.description}</p>
                    </div>
                  </div>
                  {getStatusIcon(sys.status)}
                </div>
                <div className="flex items-center justify-between mt-4">
                  <div className="space-y-1">
                    {sys.metrics.map((m) => (
                      <div key={m.label} className="flex justify-between text-sm">
                        <span className="text-muted-foreground mr-4">{m.label}:</span>
                        <span className="font-mono">{m.value}</span>
                      </div>
                    ))}
                  </div>
                  {getStatusBadge(sys.status)}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium">Environment</CardTitle>
          <CardDescription>
            Runtime configuration
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Node Version</p>
              <p className="font-mono text-sm">v20.x</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Database</p>
              <p className="font-mono text-sm">PostgreSQL 16</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Framework</p>
              <p className="font-mono text-sm">Express + React</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Build Tool</p>
              <p className="font-mono text-sm">Vite 5</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
