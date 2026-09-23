import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Cog,
  Shield,
  DollarSign,
  Users,
  Activity,
  CheckCircle,
  AlertTriangle,
  Server,
  Database,
  Cpu,
  Clock,
} from "lucide-react";

interface SystemHealth {
  status: string;
  mode: string;
  glyphCount: number;
  overseerStrict: boolean;
  financialStability: number;
  timestamp: string;
}

interface FinancialState {
  balance: number;
  dailyTarget: number;
  currentDaily: number;
  riskExposure: number;
  stabilityScore: number;
  lastUpdated: string;
}

interface FinancialDecision {
  id: string;
  action: string;
  target: string;
  amount: number;
  reasoning: string[];
  ethicalFlags: string[];
  approved: boolean;
  timestamp: string;
}

export default function System() {
  const { toast } = useToast();

  const { data: health } = useQuery<SystemHealth>({
    queryKey: ["/api/system/health"],
    refetchInterval: 10000,
  });

  const { data: systemMode } = useQuery<{ mode: string }>({
    queryKey: ["/api/system/mode"],
  });

  const { data: financialState } = useQuery<FinancialState>({
    queryKey: ["/api/financial/state"],
  });

  const { data: financialDecisions } = useQuery<FinancialDecision[]>({
    queryKey: ["/api/financial/decisions"],
  });

  const modeMutation = useMutation({
    mutationFn: async (mode: string) => {
      return apiRequest("/api/system/mode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode }),
      });
    },
    onSuccess: (data: { mode: string }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/system/mode"] });
      queryClient.invalidateQueries({ queryKey: ["/api/system/health"] });
      toast({ title: "Mode Changed", description: `System now in ${data.mode} mode` });
    },
  });

  const getModeColor = (mode: string) => {
    switch (mode) {
      case "admin":
        return "bg-red-500/20 text-red-600 border-red-500/30";
      case "dev":
        return "bg-yellow-500/20 text-yellow-600 border-yellow-500/30";
      default:
        return "bg-green-500/20 text-green-600 border-green-500/30";
    }
  };

  return (
    <div className="p-6 space-y-6" data-testid="page-system">
      <div className="flex items-center gap-3">
        <Cog className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-system-title">System Control</h1>
          <p className="text-muted-foreground">Admin/Dev modes, financial engine, and system health</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Activity className={health?.status === "healthy" ? "h-5 w-5 text-green-500" : "h-5 w-5 text-red-500"} />
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <p className="text-lg font-bold capitalize" data-testid="stat-status">{health?.status || "—"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Mode</p>
                <Badge className={getModeColor(systemMode?.mode || "user")} data-testid="stat-mode">
                  {systemMode?.mode || "user"}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Glyphs</p>
                <p className="text-lg font-bold" data-testid="stat-glyphs">{health?.glyphCount || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Stability</p>
                <p className="text-lg font-bold" data-testid="stat-stability">
                  {((financialState?.stabilityScore || 0) * 100).toFixed(0)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="modes" className="space-y-4">
        <TabsList>
          <TabsTrigger value="modes" data-testid="tab-modes">System Modes</TabsTrigger>
          <TabsTrigger value="financial" data-testid="tab-financial">Financial Engine</TabsTrigger>
          <TabsTrigger value="health" data-testid="tab-health">Health Details</TabsTrigger>
        </TabsList>

        <TabsContent value="modes">
          <div className="grid gap-6 md:grid-cols-3">
            <Card className={systemMode?.mode === "user" ? "ring-2 ring-primary" : ""}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  User Mode
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Standard user experience. Access to learning, building, co-creation, and sandbox features.
                  All actions are law-bound.
                </p>
                <ul className="text-sm space-y-1">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-3 w-3 text-green-500" /> Build apps and fragments
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-3 w-3 text-green-500" /> Access Resonance Engine
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-3 w-3 text-green-500" /> View lineage and audit
                  </li>
                </ul>
                <Button
                  onClick={() => modeMutation.mutate("user")}
                  disabled={systemMode?.mode === "user"}
                  className="w-full"
                  variant={systemMode?.mode === "user" ? "secondary" : "outline"}
                  data-testid="button-mode-user"
                >
                  {systemMode?.mode === "user" ? "Current Mode" : "Switch to User"}
                </Button>
              </CardContent>
            </Card>

            <Card className={systemMode?.mode === "dev" ? "ring-2 ring-yellow-500" : ""}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Cpu className="h-5 w-5" />
                  Developer Mode
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Extended capabilities for developers. Access to agent modification, debugging tools,
                  and advanced features. Still law-bound.
                </p>
                <ul className="text-sm space-y-1">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-3 w-3 text-green-500" /> All User features
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-3 w-3 text-yellow-500" /> Agent modification
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-3 w-3 text-yellow-500" /> Debug tooling
                  </li>
                </ul>
                <Button
                  onClick={() => modeMutation.mutate("dev")}
                  disabled={systemMode?.mode === "dev"}
                  className="w-full"
                  variant={systemMode?.mode === "dev" ? "secondary" : "outline"}
                  data-testid="button-mode-dev"
                >
                  {systemMode?.mode === "dev" ? "Current Mode" : "Switch to Dev"}
                </Button>
              </CardContent>
            </Card>

            <Card className={systemMode?.mode === "admin" ? "ring-2 ring-red-500" : ""}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Admin Mode
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Full governance access. Infrastructure control, freeze buttons, system-life decisions.
                  Use with extreme caution.
                </p>
                <ul className="text-sm space-y-1">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-3 w-3 text-green-500" /> All Dev features
                  </li>
                  <li className="flex items-center gap-2">
                    <AlertTriangle className="h-3 w-3 text-red-500" /> Freeze/unfreeze targets
                  </li>
                  <li className="flex items-center gap-2">
                    <AlertTriangle className="h-3 w-3 text-red-500" /> Override Overseer
                  </li>
                </ul>
                <Button
                  onClick={() => modeMutation.mutate("admin")}
                  disabled={systemMode?.mode === "admin"}
                  className="w-full"
                  variant={systemMode?.mode === "admin" ? "destructive" : "outline"}
                  data-testid="button-mode-admin"
                >
                  {systemMode?.mode === "admin" ? "Current Mode" : "Switch to Admin"}
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="financial">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Financial State
                </CardTitle>
              </CardHeader>
              <CardContent>
                {financialState && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 bg-muted/50 rounded-md">
                        <p className="text-sm text-muted-foreground">Balance</p>
                        <p className="text-2xl font-bold">${financialState.balance.toFixed(2)}</p>
                      </div>
                      <div className="p-3 bg-muted/50 rounded-md">
                        <p className="text-sm text-muted-foreground">Daily Target</p>
                        <p className="text-2xl font-bold">${financialState.dailyTarget.toFixed(2)}</p>
                      </div>
                      <div className="p-3 bg-muted/50 rounded-md">
                        <p className="text-sm text-muted-foreground">Current Daily</p>
                        <p className="text-2xl font-bold">${financialState.currentDaily.toFixed(2)}</p>
                      </div>
                      <div className="p-3 bg-muted/50 rounded-md">
                        <p className="text-sm text-muted-foreground">Risk Exposure</p>
                        <p className="text-2xl font-bold">{(financialState.riskExposure * 100).toFixed(0)}%</p>
                      </div>
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Stability Score</span>
                      <div className="flex items-center gap-2">
                        <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full ${
                              financialState.stabilityScore > 0.7
                                ? "bg-green-500"
                                : financialState.stabilityScore > 0.4
                                ? "bg-yellow-500"
                                : "bg-red-500"
                            }`}
                            style={{ width: `${financialState.stabilityScore * 100}%` }}
                          />
                        </div>
                        <span className="font-mono">{(financialState.stabilityScore * 100).toFixed(0)}%</span>
                      </div>
                    </div>

                    <p className="text-xs text-muted-foreground">
                      Last updated: {new Date(financialState.lastUpdated).toLocaleString()}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Financial Decisions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px]">
                  {financialDecisions && financialDecisions.length > 0 ? (
                    <div className="space-y-3">
                      {financialDecisions.map((decision) => (
                        <div
                          key={decision.id}
                          className="p-3 border rounded-md space-y-2"
                          data-testid={`financial-decision-${decision.id}`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{decision.target}</span>
                            <Badge variant={decision.approved ? "default" : "destructive"}>
                              {decision.action}
                            </Badge>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Amount:</span>
                            <span className="font-mono">${decision.amount.toFixed(2)}</span>
                          </div>
                          {decision.ethicalFlags.length > 0 && (
                            <div className="text-xs text-destructive">
                              {decision.ethicalFlags.join(", ")}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-8">No financial decisions yet</p>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="health">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="h-5 w-5" />
                System Health Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              {health && (
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <div className="p-4 border rounded-md">
                      <div className="flex items-center gap-2 mb-2">
                        <Activity className="h-4 w-4" />
                        <span className="font-medium">Overall Status</span>
                      </div>
                      <Badge className={health.status === "healthy" ? "bg-green-500" : "bg-red-500"}>
                        {health.status}
                      </Badge>
                    </div>

                    <div className="p-4 border rounded-md">
                      <div className="flex items-center gap-2 mb-2">
                        <Shield className="h-4 w-4" />
                        <span className="font-medium">Overseer Mode</span>
                      </div>
                      <Badge variant={health.overseerStrict ? "destructive" : "secondary"}>
                        {health.overseerStrict ? "Strict" : "Lenient"}
                      </Badge>
                    </div>

                    <div className="p-4 border rounded-md">
                      <div className="flex items-center gap-2 mb-2">
                        <Database className="h-4 w-4" />
                        <span className="font-medium">Glyph Count</span>
                      </div>
                      <p className="text-2xl font-bold">{health.glyphCount}</p>
                    </div>

                    <div className="p-4 border rounded-md">
                      <div className="flex items-center gap-2 mb-2">
                        <DollarSign className="h-4 w-4" />
                        <span className="font-medium">Financial Stability</span>
                      </div>
                      <p className="text-2xl font-bold">{(health.financialStability * 100).toFixed(0)}%</p>
                    </div>

                    <div className="p-4 border rounded-md">
                      <div className="flex items-center gap-2 mb-2">
                        <Users className="h-4 w-4" />
                        <span className="font-medium">System Mode</span>
                      </div>
                      <Badge className={getModeColor(health.mode)}>
                        {health.mode}
                      </Badge>
                    </div>

                    <div className="p-4 border rounded-md">
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="h-4 w-4" />
                        <span className="font-medium">Last Check</span>
                      </div>
                      <p className="text-sm">{new Date(health.timestamp).toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
