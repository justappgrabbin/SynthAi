import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Shield,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Snowflake,
  Eye,
  ChevronRight,
} from "lucide-react";
import type { OverseerDecision } from "@shared/agent-schema";
import { formatDistanceToNow } from "date-fns";

export default function Overseer() {
  const [selectedDecision, setSelectedDecision] = useState<OverseerDecision | null>(null);

  const { data: decisions, isLoading } = useQuery<OverseerDecision[]>({
    queryKey: ["/api/overseer/decisions"],
    refetchInterval: 3000,
  });

  const getActionIcon = (action: string) => {
    switch (action) {
      case "approve": return <CheckCircle2 className="h-4 w-4 text-chart-2" />;
      case "deny": return <XCircle className="h-4 w-4 text-destructive" />;
      case "freeze": return <Snowflake className="h-4 w-4 text-chart-4" />;
      case "review": return <Eye className="h-4 w-4 text-chart-5" />;
      default: return <AlertTriangle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case "approve": return <Badge className="bg-chart-2/10 text-chart-2 border-chart-2/30">Approved</Badge>;
      case "deny": return <Badge className="bg-destructive/10 text-destructive border-destructive/30">Denied</Badge>;
      case "freeze": return <Badge className="bg-chart-4/10 text-chart-4 border-chart-4/30">Frozen</Badge>;
      case "review": return <Badge className="bg-chart-5/10 text-chart-5 border-chart-5/30">Review</Badge>;
      default: return <Badge variant="outline">{action}</Badge>;
    }
  };

  const stats = {
    total: decisions?.length || 0,
    approved: decisions?.filter(d => d.approved).length || 0,
    denied: decisions?.filter(d => d.action === "deny").length || 0,
    frozen: decisions?.filter(d => d.frozen).length || 0,
  };

  return (
    <div className="p-6 space-y-6 max-w-screen-2xl mx-auto">
      <div>
        <h1 className="text-headline font-semibold">Overseer</h1>
        <p className="text-body text-muted-foreground mt-1">
          Supreme arbiter for all system decisions — evaluates every action for approval, denial, or freeze
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Decisions
            </CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold" data-testid="text-total-decisions">
              {stats.total}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Approved
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-chart-2" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-chart-2" data-testid="text-approved-decisions">
              {stats.approved}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Denied
            </CardTitle>
            <XCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-destructive" data-testid="text-denied-decisions">
              {stats.denied}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Frozen
            </CardTitle>
            <Snowflake className="h-4 w-4 text-chart-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-chart-4" data-testid="text-frozen-decisions">
              {stats.frozen}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base font-medium">Decision Log</CardTitle>
            <CardDescription>
              All Overseer decisions with resonance and coherence scores
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {isLoading ? (
              [...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-lg border">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32 mt-1" />
                  </div>
                  <Skeleton className="h-6 w-20" />
                </div>
              ))
            ) : decisions && decisions.length > 0 ? (
              decisions.slice().reverse().map((decision) => (
                <div
                  key={decision.id}
                  onClick={() => setSelectedDecision(decision)}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors hover:bg-accent/50 ${
                    selectedDecision?.id === decision.id ? "ring-2 ring-primary" : ""
                  }`}
                  data-testid={`decision-row-${decision.id}`}
                >
                  {getActionIcon(decision.action)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium capitalize">{decision.context}</span>
                      <span className="text-muted-foreground">→</span>
                      <span className="truncate">{decision.targetId.slice(0, 16)}...</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(decision.timestamp), { addSuffix: true })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right text-sm">
                      <p className="text-muted-foreground">R: {decision.resonanceScore.toFixed(2)}</p>
                      <p className="text-muted-foreground">C: {decision.coherenceScore.toFixed(0)}</p>
                    </div>
                    {getActionBadge(decision.action)}
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No decisions yet</p>
                <p className="text-sm mt-1">Overseer decisions will appear here</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium">Decision Details</CardTitle>
          </CardHeader>
          <CardContent>
            {selectedDecision ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Action</span>
                  {getActionBadge(selectedDecision.action)}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Context</span>
                    <span className="capitalize">{selectedDecision.context}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Target Type</span>
                    <span>{selectedDecision.targetType}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Resonance Score</span>
                    <span className={selectedDecision.resonanceScore >= 0.5 ? "text-chart-2" : "text-destructive"}>
                      {selectedDecision.resonanceScore.toFixed(3)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Coherence Score</span>
                    <span className={selectedDecision.coherenceScore >= 70 ? "text-chart-2" : "text-destructive"}>
                      {selectedDecision.coherenceScore.toFixed(1)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Frozen</span>
                    <span>{selectedDecision.frozen ? "Yes" : "No"}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Appealable</span>
                    <span>{selectedDecision.appealable ? "Yes" : "No"}</span>
                  </div>
                </div>

                {selectedDecision.reasoning.length > 0 && (
                  <div className="pt-4 border-t">
                    <h4 className="text-sm font-medium mb-2">Reasoning</h4>
                    <ul className="space-y-1">
                      {selectedDecision.reasoning.map((r, i) => (
                        <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                          <span className="text-primary">•</span>
                          {r}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {selectedDecision.conditions.length > 0 && (
                  <div className="pt-4 border-t">
                    <h4 className="text-sm font-medium mb-2">Conditions</h4>
                    <ul className="space-y-1">
                      {selectedDecision.conditions.map((c, i) => (
                        <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                          <span className="text-chart-4">•</span>
                          {c}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Select a decision to view details</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
