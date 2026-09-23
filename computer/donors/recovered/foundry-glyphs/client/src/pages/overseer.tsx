import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Shield,
  ShieldCheck,
  ShieldX,
  Lock,
  Unlock,
  Settings,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
} from "lucide-react";

interface OverseerDecision {
  id: string;
  action: string;
  context: string;
  targetId: string;
  targetType: string;
  resonanceScore: number;
  coherenceScore: number;
  approved: boolean;
  reasoning: string[];
  conditions: string[];
  timestamp: string;
  frozen: boolean;
  appealable: boolean;
}

interface OverseerConfig {
  minResonanceScore: number;
  minCoherenceScore: number;
  strictMode: boolean;
  allowAppeals: boolean;
  freezeOnCriticalFail: boolean;
}

export default function Overseer() {
  const { toast } = useToast();
  const [unfreezeTarget, setUnfreezeTarget] = useState("");
  const [unfreezeReason, setUnfreezeReason] = useState("");
  const [checkFrozenId, setCheckFrozenId] = useState("");
  const [frozenStatus, setFrozenStatus] = useState<boolean | null>(null);

  const { data: decisions } = useQuery<OverseerDecision[]>({
    queryKey: ["/api/overseer/decisions"],
    refetchInterval: 5000,
  });

  const { data: config } = useQuery<OverseerConfig>({
    queryKey: ["/api/overseer/config"],
  });

  const updateConfigMutation = useMutation({
    mutationFn: async (updates: Partial<OverseerConfig>) => {
      return apiRequest("/api/overseer/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/overseer/config"] });
      toast({ title: "Config Updated", description: "Overseer configuration saved" });
    },
  });

  const unfreezeMutation = useMutation({
    mutationFn: async ({ targetId, reason }: { targetId: string; reason: string }) => {
      return apiRequest("/api/overseer/unfreeze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetId, reason }),
      });
    },
    onSuccess: (data: { success: boolean }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/overseer/decisions"] });
      if (data.success) {
        toast({ title: "Target Unfrozen", description: "Target has been released from freeze" });
        setUnfreezeTarget("");
        setUnfreezeReason("");
      } else {
        toast({ title: "Not Frozen", description: "Target was not in frozen state", variant: "destructive" });
      }
    },
  });

  const checkFrozenMutation = useMutation({
    mutationFn: async (targetId: string) => {
      const response = await fetch(`/api/overseer/frozen/${targetId}`);
      return response.json();
    },
    onSuccess: (data: { frozen: boolean }) => {
      setFrozenStatus(data.frozen);
    },
  });

  const getActionIcon = (action: string, approved: boolean, frozen: boolean) => {
    if (frozen) return <Lock className="h-4 w-4 text-yellow-500" />;
    if (action === "approve" && approved) return <ShieldCheck className="h-4 w-4 text-green-500" />;
    if (action === "deny") return <ShieldX className="h-4 w-4 text-red-500" />;
    if (action === "freeze") return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    return <Eye className="h-4 w-4 text-muted-foreground" />;
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case "approve":
        return <Badge className="bg-green-500/20 text-green-600 border-green-500/30">Approved</Badge>;
      case "deny":
        return <Badge variant="destructive">Denied</Badge>;
      case "freeze":
        return <Badge className="bg-yellow-500/20 text-yellow-600 border-yellow-500/30">Frozen</Badge>;
      case "review":
        return <Badge variant="secondary">Review</Badge>;
      default:
        return <Badge variant="outline">{action}</Badge>;
    }
  };

  const approvedCount = decisions?.filter((d) => d.approved).length || 0;
  const deniedCount = decisions?.filter((d) => !d.approved && !d.frozen).length || 0;
  const frozenCount = decisions?.filter((d) => d.frozen).length || 0;

  return (
    <div className="p-6 space-y-6" data-testid="page-overseer">
      <div className="flex items-center gap-3">
        <Shield className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-overseer-title">Overseer</h1>
          <p className="text-muted-foreground">Governance enforcement layer - the incorruptible guardian</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-2xl font-bold" data-testid="stat-approved">{approvedCount}</p>
                <p className="text-xs text-muted-foreground">Approved</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-2xl font-bold" data-testid="stat-denied">{deniedCount}</p>
                <p className="text-xs text-muted-foreground">Denied</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold" data-testid="stat-frozen">{frozenCount}</p>
                <p className="text-xs text-muted-foreground">Frozen</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold" data-testid="stat-total">{decisions?.length || 0}</p>
                <p className="text-xs text-muted-foreground">Total Decisions</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="decisions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="decisions" data-testid="tab-decisions">Decisions</TabsTrigger>
          <TabsTrigger value="config" data-testid="tab-config">Configuration</TabsTrigger>
          <TabsTrigger value="freeze" data-testid="tab-freeze">Freeze Control</TabsTrigger>
        </TabsList>

        <TabsContent value="decisions">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Decision Log
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                {decisions && decisions.length > 0 ? (
                  <div className="space-y-3">
                    {decisions.map((decision) => (
                      <div
                        key={decision.id}
                        className="p-4 border rounded-md space-y-3"
                        data-testid={`decision-${decision.id}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {getActionIcon(decision.action, decision.approved, decision.frozen)}
                            <span className="font-medium">{decision.context}</span>
                            <span className="text-muted-foreground">→</span>
                            <span className="font-mono text-sm">{decision.targetType}</span>
                          </div>
                          {getActionBadge(decision.action)}
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Resonance:</span>{" "}
                            <span className={decision.resonanceScore >= 0.5 ? "text-green-600" : "text-red-600"}>
                              {decision.resonanceScore.toFixed(3)}
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Coherence:</span>{" "}
                            <span className={decision.coherenceScore >= 70 ? "text-green-600" : "text-red-600"}>
                              {decision.coherenceScore.toFixed(1)}
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Appealable:</span>{" "}
                            {decision.appealable ? "Yes" : "No"}
                          </div>
                          <div>
                            <span className="text-muted-foreground">Time:</span>{" "}
                            {new Date(decision.timestamp).toLocaleTimeString()}
                          </div>
                        </div>

                        {decision.reasoning.length > 0 && (
                          <div className="p-2 bg-muted/50 rounded text-sm">
                            <p className="text-xs text-muted-foreground mb-1">Reasoning:</p>
                            <ul className="list-disc list-inside space-y-1">
                              {decision.reasoning.map((r, i) => (
                                <li key={i} className="text-muted-foreground">{r}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {decision.conditions.length > 0 && (
                          <div className="p-2 bg-primary/5 rounded text-sm">
                            <p className="text-xs text-muted-foreground mb-1">Conditions:</p>
                            <ul className="list-disc list-inside space-y-1">
                              {decision.conditions.map((c, i) => (
                                <li key={i}>{c}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">No decisions recorded yet</p>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="config">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Governance Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {config && (
                <>
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Minimum Resonance Score</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          step="0.1"
                          min="0"
                          max="10"
                          value={config.minResonanceScore}
                          onChange={(e) =>
                            updateConfigMutation.mutate({ minResonanceScore: parseFloat(e.target.value) })
                          }
                          data-testid="input-min-resonance"
                        />
                        <span className="text-sm text-muted-foreground">threshold</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Minimum Coherence Score</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          step="1"
                          min="0"
                          max="100"
                          value={config.minCoherenceScore}
                          onChange={(e) =>
                            updateConfigMutation.mutate({ minCoherenceScore: parseInt(e.target.value) })
                          }
                          data-testid="input-min-coherence"
                        />
                        <span className="text-sm text-muted-foreground">out of 100</span>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Strict Mode</Label>
                        <p className="text-sm text-muted-foreground">
                          Deny all marginal cases instead of flagging for review
                        </p>
                      </div>
                      <Switch
                        checked={config.strictMode}
                        onCheckedChange={(checked) => updateConfigMutation.mutate({ strictMode: checked })}
                        data-testid="switch-strict-mode"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Allow Appeals</Label>
                        <p className="text-sm text-muted-foreground">
                          Let denied decisions be appealed for manual review
                        </p>
                      </div>
                      <Switch
                        checked={config.allowAppeals}
                        onCheckedChange={(checked) => updateConfigMutation.mutate({ allowAppeals: checked })}
                        data-testid="switch-allow-appeals"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Freeze on Critical Fail</Label>
                        <p className="text-sm text-muted-foreground">
                          Automatically freeze targets that fail catastrophically
                        </p>
                      </div>
                      <Switch
                        checked={config.freezeOnCriticalFail}
                        onCheckedChange={(checked) => updateConfigMutation.mutate({ freezeOnCriticalFail: checked })}
                        data-testid="switch-freeze-critical"
                      />
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="freeze">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Unlock className="h-5 w-5" />
                  Unfreeze Target
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Target ID</Label>
                  <Input
                    value={unfreezeTarget}
                    onChange={(e) => setUnfreezeTarget(e.target.value)}
                    placeholder="Enter frozen target ID"
                    data-testid="input-unfreeze-target"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Override Reason</Label>
                  <Input
                    value={unfreezeReason}
                    onChange={(e) => setUnfreezeReason(e.target.value)}
                    placeholder="Justification for unfreezing"
                    data-testid="input-unfreeze-reason"
                  />
                </div>
                <Button
                  onClick={() => unfreezeMutation.mutate({ targetId: unfreezeTarget, reason: unfreezeReason })}
                  disabled={!unfreezeTarget || !unfreezeReason || unfreezeMutation.isPending}
                  className="w-full"
                  data-testid="button-unfreeze"
                >
                  <Unlock className="h-4 w-4 mr-2" />
                  Unfreeze
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="h-5 w-5" />
                  Check Frozen Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Target ID</Label>
                  <Input
                    value={checkFrozenId}
                    onChange={(e) => {
                      setCheckFrozenId(e.target.value);
                      setFrozenStatus(null);
                    }}
                    placeholder="Enter target ID to check"
                    data-testid="input-check-frozen"
                  />
                </div>
                <Button
                  onClick={() => checkFrozenMutation.mutate(checkFrozenId)}
                  disabled={!checkFrozenId || checkFrozenMutation.isPending}
                  variant="outline"
                  className="w-full"
                  data-testid="button-check-frozen"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Check Status
                </Button>

                {frozenStatus !== null && (
                  <div className={`p-3 rounded-md ${frozenStatus ? "bg-yellow-500/10" : "bg-green-500/10"}`}>
                    <div className="flex items-center gap-2">
                      {frozenStatus ? (
                        <>
                          <Lock className="h-4 w-4 text-yellow-500" />
                          <span className="text-yellow-600">Target is FROZEN</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span className="text-green-600">Target is NOT frozen</span>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
