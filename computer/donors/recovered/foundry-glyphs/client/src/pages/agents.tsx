import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Bot,
  Play,
  Pause,
  Shield,
  Activity,
  Cpu,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import type { Agent } from "@shared/agent-schema";
import { formatDistanceToNow } from "date-fns";
import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function Agents() {
  const { toast } = useToast();
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);

  const { data: agents, isLoading } = useQuery<Agent[]>({
    queryKey: ["/api/agents"],
    refetchInterval: 2000,
  });

  const { data: stats } = useQuery<{
    total: number;
    byStatus: Record<string, number>;
    byArchetype: Record<string, number>;
    bySubservience: Record<string, number>;
  }>({
    queryKey: ["/api/agents/stats"],
    refetchInterval: 2000,
  });

  const pauseMutation = useMutation({
    mutationFn: async (agentId: string) => {
      return apiRequest("POST", `/api/agents/${agentId}/pause`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agents"] });
      toast({ title: "Agent paused" });
    },
  });

  const resumeMutation = useMutation({
    mutationFn: async (agentId: string) => {
      return apiRequest("POST", `/api/agents/${agentId}/resume`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agents"] });
      toast({ title: "Agent resumed" });
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "executing": return "bg-chart-1";
      case "paused": return "bg-chart-4";
      case "frozen": return "bg-destructive";
      default: return "bg-chart-2";
    }
  };

  const getSubservienceBadge = (level: string) => {
    switch (level) {
      case "l0_observer": return <Badge variant="outline" className="text-chart-2 border-chart-2/30">L0 Observer</Badge>;
      case "l1_advisor": return <Badge variant="outline" className="text-chart-1 border-chart-1/30">L1 Advisor</Badge>;
      case "l2_executor": return <Badge variant="outline" className="text-chart-4 border-chart-4/30">L2 Executor</Badge>;
      case "l3_governor": return <Badge variant="outline" className="text-chart-5 border-chart-5/30">L3 Governor</Badge>;
      default: return <Badge variant="outline">{level}</Badge>;
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-screen-2xl mx-auto">
      <div>
        <h1 className="text-headline font-semibold">Agents</h1>
        <p className="text-body text-muted-foreground mt-1">
          Autonomous workers bound to Resonance Engine and Financial Engine
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Agents
            </CardTitle>
            <Bot className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold" data-testid="text-total-agents">
              {stats?.total ?? "-"}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active
            </CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-chart-1" data-testid="text-active-agents">
              {stats?.byStatus?.executing ?? "-"}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Paused
            </CardTitle>
            <Pause className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-chart-4" data-testid="text-paused-agents">
              {stats?.byStatus?.paused ?? "-"}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Frozen
            </CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-destructive" data-testid="text-frozen-agents">
              {stats?.byStatus?.frozen ?? "-"}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base font-medium">Agent Registry</CardTitle>
            <CardDescription>
              All registered agents with their bindings and status
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              [...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-3 rounded-lg border">
                  <Skeleton className="h-10 w-10 rounded" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48 mt-1" />
                  </div>
                  <Skeleton className="h-6 w-20" />
                </div>
              ))
            ) : agents && agents.length > 0 ? (
              agents.map((agent) => (
                <div
                  key={agent.id}
                  onClick={() => setSelectedAgent(agent)}
                  className={`flex items-center gap-4 p-3 rounded-lg border cursor-pointer transition-colors hover:bg-accent/50 ${
                    selectedAgent?.id === agent.id ? "ring-2 ring-primary" : ""
                  }`}
                  data-testid={`agent-row-${agent.id}`}
                >
                  <div className={`h-10 w-10 rounded flex items-center justify-center ${getStatusColor(agent.status)}`}>
                    <Bot className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{agent.name}</span>
                      {getSubservienceBadge(agent.subservience)}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {agent.description}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="capitalize">
                      {agent.status}
                    </Badge>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No agents registered</p>
                <p className="text-sm mt-1">Agents will appear here when spawned</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium">Agent Details</CardTitle>
          </CardHeader>
          <CardContent>
            {selectedAgent ? (
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium">{selectedAgent.name}</h3>
                  <p className="text-sm text-muted-foreground">{selectedAgent.id}</p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Archetype</span>
                    <span className="capitalize">{selectedAgent.archetype}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Subservience</span>
                    {getSubservienceBadge(selectedAgent.subservience)}
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Status</span>
                    <Badge variant="secondary" className="capitalize">
                      {selectedAgent.status}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Last Heartbeat</span>
                    <span>
                      {formatDistanceToNow(new Date(selectedAgent.lastHeartbeat), { addSuffix: true })}
                    </span>
                  </div>
                </div>

                <div className="pt-4 border-t space-y-3">
                  <h4 className="text-sm font-medium">Bindings</h4>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className={`h-4 w-4 ${selectedAgent.bindings.resonanceEngine ? "text-chart-2" : "text-muted-foreground"}`} />
                    <span className="text-sm">Resonance Engine</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className={`h-4 w-4 ${selectedAgent.bindings.financialEngine ? "text-chart-2" : "text-muted-foreground"}`} />
                    <span className="text-sm">Financial Engine</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className={`h-4 w-4 ${selectedAgent.bindings.overseer ? "text-chart-2" : "text-muted-foreground"}`} />
                    <span className="text-sm">Overseer</span>
                  </div>
                </div>

                {selectedAgent.metrics && (
                  <div className="pt-4 border-t space-y-2">
                    <h4 className="text-sm font-medium">Metrics</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Tasks</span>
                        <p className="font-medium">{selectedAgent.metrics.tasksCompleted}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Success Rate</span>
                        <p className="font-medium">
                          {((selectedAgent.metrics.successRate || 0) * 100).toFixed(1)}%
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Revenue</span>
                        <p className="font-medium">${selectedAgent.metrics.revenueGenerated?.toFixed(2)}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Resonance</span>
                        <p className="font-medium">
                          {((selectedAgent.metrics.avgResonanceScore || 0) * 100).toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="pt-4 border-t flex gap-2">
                  {selectedAgent.status === "executing" ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => pauseMutation.mutate(selectedAgent.id)}
                      disabled={pauseMutation.isPending}
                    >
                      <Pause className="h-3 w-3 mr-1" />
                      Pause
                    </Button>
                  ) : selectedAgent.status === "paused" ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => resumeMutation.mutate(selectedAgent.id)}
                      disabled={resumeMutation.isPending}
                    >
                      <Play className="h-3 w-3 mr-1" />
                      Resume
                    </Button>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Cpu className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Select an agent to view details</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
