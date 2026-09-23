import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  ArrowLeft,
  Zap,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Sparkles,
  TrendingUp,
  Clock,
  Shield,
  Play,
  RotateCcw,
  ChevronRight,
  Activity,
  Target,
} from "lucide-react";
import type { 
  EvolutionProposal, 
  ProposedImprovement, 
  EvolutionAnalysisResponse,
  EvolutionHistoryEntry 
} from "@shared/schema";

interface EvolutionStatus {
  hasActiveProposal: boolean;
  currentProposal: EvolutionProposal | null;
  historyCount: number;
  appVersion: string;
}

const priorityColors: Record<string, string> = {
  critical: "bg-red-500/10 text-red-600 dark:text-red-400",
  high: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  medium: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
  low: "bg-green-500/10 text-green-600 dark:text-green-400",
};

const typeIcons: Record<string, typeof Zap> = {
  feature: Sparkles,
  ui: Target,
  performance: TrendingUp,
  component: Activity,
  page: Activity,
  integration: Zap,
};

export default function Evolution() {
  const { toast } = useToast();
  const [selectedImprovement, setSelectedImprovement] = useState<ProposedImprovement | null>(null);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  const { data: status, isLoading: statusLoading } = useQuery<EvolutionStatus>({
    queryKey: ["/api/evolution/status"],
    refetchInterval: 2000,
  });

  const { data: history } = useQuery<EvolutionHistoryEntry[]>({
    queryKey: ["/api/evolution/history"],
  });

  const startMutation = useMutation({
    mutationFn: () => apiRequest("/api/evolution/start", "POST"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/evolution/status"] });
      toast({ title: "Analysis Started", description: "Click Continue to complete the analysis" });
    },
    onError: () => {
      toast({ title: "Failed to Start", variant: "destructive" });
    },
  });

  const analyzeMutation = useMutation({
    mutationFn: () => apiRequest("/api/evolution/analyze", "POST"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/evolution/status"] });
      toast({ title: "Analysis Complete", description: "System analyzed - review suggested improvements" });
    },
    onError: () => {
      toast({ title: "Analysis Failed", variant: "destructive" });
    },
  });

  const selectMutation = useMutation({
    mutationFn: (improvementId: string) => 
      apiRequest("/api/evolution/select", "POST", { improvementId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/evolution/status"] });
      setShowApprovalDialog(true);
    },
    onError: () => {
      toast({ title: "Selection Failed", variant: "destructive" });
    },
  });

  const approveMutation = useMutation({
    mutationFn: (params: { proposalId: string; approved: boolean; reason?: string }) =>
      apiRequest("/api/evolution/approve", "POST", params),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/evolution/status"] });
      setShowApprovalDialog(false);
      setRejectionReason("");
      toast({
        title: variables.approved ? "Evolution Approved" : "Evolution Rejected",
        description: variables.approved 
          ? "Click Apply to implement the changes" 
          : "The proposal has been rejected",
      });
    },
    onError: () => {
      toast({ title: "Approval Failed", variant: "destructive" });
    },
  });

  const applyMutation = useMutation({
    mutationFn: (proposalId: string) =>
      apiRequest("/api/evolution/apply", "POST", { proposalId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/evolution/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/evolution/history"] });
      toast({ title: "Evolution Applied", description: "The system has been updated" });
    },
    onError: () => {
      toast({ title: "Application Failed", variant: "destructive" });
    },
  });

  const backMutation = useMutation({
    mutationFn: () => apiRequest("/api/evolution/back", "POST"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/evolution/status"] });
      setSelectedImprovement(null);
      toast({ title: "Went Back", description: "Returned to previous step" });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: () => apiRequest("/api/evolution/cancel", "POST"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/evolution/status"] });
      setSelectedImprovement(null);
      toast({ title: "Cancelled", description: "Evolution process cancelled" });
    },
  });

  const proposal = status?.currentProposal;
  const stage = proposal?.stage;

  const getStageProgress = () => {
    const stages = ["analyzing", "proposing", "awaiting_approval", "applying", "completed"];
    const idx = stages.indexOf(stage || "");
    return ((idx + 1) / stages.length) * 100;
  };

  const canGoBack = stage === "analyzing" || stage === "proposing" || stage === "awaiting_approval";

  if (statusLoading) {
    return (
      <div className="p-6 space-y-6 max-w-screen-xl mx-auto">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-screen-xl mx-auto">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          {canGoBack && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => backMutation.mutate()}
              disabled={backMutation.isPending}
              data-testid="button-back"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <div>
            <h1 className="text-headline font-semibold flex items-center gap-2">
              <Zap className="h-6 w-6 text-primary" />
              Self-Evolution Engine
            </h1>
            <p className="text-body text-muted-foreground mt-1">
              Analyze, propose, and apply system improvements with your approval
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="font-mono">
            v{status?.appVersion}
          </Badge>
          {proposal && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => cancelMutation.mutate()}
              disabled={cancelMutation.isPending}
              data-testid="button-cancel"
            >
              <XCircle className="h-4 w-4 mr-1" />
              Cancel
            </Button>
          )}
        </div>
      </div>

      {proposal && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-sm font-medium">Evolution Progress</CardTitle>
              <Badge variant="secondary">{stage}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <Progress value={getStageProgress()} className="h-2" />
            <div className="flex justify-between mt-2 text-caption text-muted-foreground">
              <span>Analyze</span>
              <span>Propose</span>
              <span>Approve</span>
              <span>Apply</span>
              <span>Complete</span>
            </div>
          </CardContent>
        </Card>
      )}

      {!proposal && (
        <Card>
          <CardHeader>
            <CardTitle>Start Evolution Cycle</CardTitle>
            <CardDescription>
              The engine will analyze your system and suggest improvements. 
              You decide which changes to approve.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
                <Activity className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="font-medium text-sm">Analyze</p>
                  <p className="text-caption text-muted-foreground">
                    Scans current components and identifies opportunities
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
                <Sparkles className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="font-medium text-sm">Propose</p>
                  <p className="text-caption text-muted-foreground">
                    Generates improvement suggestions for your review
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
                <Shield className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="font-medium text-sm">You Decide</p>
                  <p className="text-caption text-muted-foreground">
                    Major changes require your explicit approval
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button
              onClick={() => startMutation.mutate()}
              disabled={startMutation.isPending}
              data-testid="button-start-evolution"
            >
              {startMutation.isPending ? (
                <>
                  <Clock className="h-4 w-4 mr-2 animate-spin" />
                  Starting...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Start Evolution Cycle
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      )}

      {stage === "analyzing" && proposal && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary animate-pulse" />
              Analyzing System...
            </CardTitle>
            <CardDescription>
              Scanning components, features, and opportunities for improvement
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Progress value={50} className="flex-1 h-2" />
              <Button
                variant="outline"
                size="sm"
                onClick={() => analyzeMutation.mutate()}
                disabled={analyzeMutation.isPending}
                data-testid="button-continue-analysis"
              >
                {analyzeMutation.isPending ? "Processing..." : "Continue"}
              </Button>
            </div>
          </CardContent>
          <CardFooter>
            <Button
              variant="ghost"
              onClick={() => backMutation.mutate()}
              disabled={backMutation.isPending}
              data-testid="button-cancel-analysis"
            >
              <XCircle className="h-4 w-4 mr-2" />
              Cancel Analysis
            </Button>
          </CardFooter>
        </Card>
      )}

      {stage === "proposing" && proposal && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-medium">Suggested Improvements</h2>
            <p className="text-sm text-muted-foreground">
              Select one to proceed
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {proposal.improvements.map((improvement) => {
              const Icon = typeIcons[improvement.type] || Sparkles;
              return (
                <Card
                  key={improvement.id}
                  className="hover-elevate cursor-pointer"
                  onClick={() => {
                    setSelectedImprovement(improvement);
                    selectMutation.mutate(improvement.id);
                  }}
                  data-testid={`card-improvement-${improvement.id}`}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-md bg-primary/10">
                          <Icon className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-base">{improvement.title}</CardTitle>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {improvement.type}
                            </Badge>
                            <Badge className={priorityColors[improvement.priority]}>
                              {improvement.priority}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      {improvement.description}
                    </p>
                    <div className="flex items-center justify-between text-caption">
                      <span className="text-muted-foreground">
                        Complexity: {improvement.estimatedComplexity}/10
                      </span>
                      <span className="text-primary">
                        +{(improvement.resonanceImpact * 100).toFixed(0)}% resonance
                      </span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {stage === "awaiting_approval" && proposal?.selectedImprovement && (
        <Card className="border-primary">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              <CardTitle>Your Approval Required</CardTitle>
            </div>
            <CardDescription>
              Review this improvement before it can be applied
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-lg bg-muted/50 space-y-3">
              <h3 className="font-semibold">{proposal.selectedImprovement.title}</h3>
              <p className="text-sm">{proposal.selectedImprovement.description}</p>
              <div className="pt-2 border-t space-y-2">
                <p className="text-sm">
                  <span className="text-muted-foreground">Benefit:</span>{" "}
                  {proposal.selectedImprovement.benefit}
                </p>
                <p className="text-sm">
                  <span className="text-muted-foreground">Implementation:</span>{" "}
                  {proposal.selectedImprovement.implementation}
                </p>
              </div>
            </div>

            {proposal.overseerDecision && (
              <div className={`p-4 rounded-lg ${
                proposal.overseerDecision.approved 
                  ? "bg-green-500/10 border border-green-500/20" 
                  : "bg-red-500/10 border border-red-500/20"
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="h-4 w-4" />
                  <span className="font-medium">Overseer Evaluation</span>
                  <Badge variant={proposal.overseerDecision.approved ? "default" : "destructive"}>
                    {proposal.overseerDecision.approved ? "Approved" : "Flagged"}
                  </Badge>
                </div>
                <div className="grid gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Resonance Score</span>
                    <span className="font-mono">{proposal.overseerDecision.resonanceScore.toFixed(3)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Coherence Score</span>
                    <span className="font-mono">{proposal.overseerDecision.coherenceScore.toFixed(1)}</span>
                  </div>
                  {proposal.overseerDecision.reasoning.length > 0 && (
                    <div className="pt-2 border-t">
                      <p className="text-muted-foreground mb-1">Notes:</p>
                      <ul className="list-disc list-inside text-xs space-y-1">
                        {proposal.overseerDecision.reasoning.map((r, i) => (
                          <li key={i}>{r}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => backMutation.mutate()}
              disabled={backMutation.isPending}
              data-testid="button-go-back"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </Button>
            <Button
              variant="destructive"
              onClick={() => setShowApprovalDialog(true)}
              data-testid="button-reject"
            >
              <XCircle className="h-4 w-4 mr-2" />
              Reject
            </Button>
            <Button
              onClick={() => {
                if (proposal) {
                  approveMutation.mutate({ proposalId: proposal.id, approved: true });
                }
              }}
              disabled={approveMutation.isPending}
              data-testid="button-approve"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Approve
            </Button>
          </CardFooter>
        </Card>
      )}

      {stage === "applying" && proposal?.userApproval?.approved && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Ready to Apply
            </CardTitle>
            <CardDescription>
              Your approval received. Click below to implement the changes.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button
              onClick={() => applyMutation.mutate(proposal.id)}
              disabled={applyMutation.isPending}
              data-testid="button-apply"
            >
              {applyMutation.isPending ? (
                <>
                  <Clock className="h-4 w-4 mr-2 animate-spin" />
                  Applying...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Apply Evolution
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      )}

      {stage === "completed" && proposal?.applicationResult?.success && (
        <Card className="border-green-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-600 dark:text-green-400">
              <CheckCircle className="h-5 w-5" />
              Evolution Complete
            </CardTitle>
            <CardDescription>
              {proposal.selectedImprovement?.title} has been applied successfully
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Artifact ID: <code className="font-mono text-xs">{proposal.applicationResult.artifactId}</code>
            </p>
          </CardContent>
          <CardFooter>
            <Button
              variant="outline"
              onClick={() => cancelMutation.mutate()}
              data-testid="button-new-cycle"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Start New Cycle
            </Button>
          </CardFooter>
        </Card>
      )}

      {stage === "rejected" && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <XCircle className="h-5 w-5" />
              Evolution Rejected
            </CardTitle>
            <CardDescription>
              The proposal was not approved
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button
              variant="outline"
              onClick={() => cancelMutation.mutate()}
              data-testid="button-start-over"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Start Over
            </Button>
          </CardFooter>
        </Card>
      )}

      {history && history.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Evolution History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {history.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  data-testid={`history-entry-${entry.id}`}
                >
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <div>
                      <p className="font-medium text-sm">{entry.improvement.title}</p>
                      <p className="text-caption text-muted-foreground">
                        v{entry.version} - {new Date(entry.appliedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline">{entry.improvement.type}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject This Evolution?</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this improvement (optional)
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Reason for rejection..."
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            data-testid="input-rejection-reason"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApprovalDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (proposal) {
                  approveMutation.mutate({
                    proposalId: proposal.id,
                    approved: false,
                    reason: rejectionReason,
                  });
                }
              }}
              disabled={approveMutation.isPending}
              data-testid="button-confirm-reject"
            >
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
