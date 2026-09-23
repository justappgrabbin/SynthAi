import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Hammer,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  ChevronRight,
  Package,
  Snowflake,
} from "lucide-react";
import type { Glyph } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";

interface BuildResult {
  id: string;
  status: "pending" | "building" | "success" | "failed" | "frozen";
  manifest: {
    name: string;
    type: string;
    components: string[];
    targetQuality: string;
  };
  artifact: Glyph | null;
  errors: string[];
  warnings: string[];
  overseerDecision: {
    action: string;
    approved: boolean;
    resonanceScore: number;
    coherenceScore: number;
    reasoning: string[];
  };
  timestamp: string;
  duration: number;
}

export default function Studio() {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [type, setType] = useState<string>("app");
  const [targetQuality, setTargetQuality] = useState<string>("draft");
  const [components, setComponents] = useState("");
  const [selectedBuild, setSelectedBuild] = useState<BuildResult | null>(null);

  const { data: builds, isLoading: buildsLoading } = useQuery<BuildResult[]>({
    queryKey: ["/api/builds"],
    refetchInterval: 2000,
  });

  const buildMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/build", {
        name,
        type,
        components: components.split("\n").filter(Boolean),
        targetQuality,
      });
      return response.json() as Promise<BuildResult>;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["/api/builds"] });
      queryClient.invalidateQueries({ queryKey: ["/api/glyphs"] });
      setSelectedBuild(result);
      if (result.status === "success") {
        toast({ title: "Build successful", description: `Created glyph: ${result.artifact?.name}` });
      } else if (result.status === "frozen") {
        toast({ title: "Build frozen", description: "Overseer froze this build", variant: "destructive" });
      } else {
        toast({ title: "Build failed", description: result.errors[0] || "Unknown error", variant: "destructive" });
      }
    },
    onError: (error: Error) => {
      toast({ title: "Build error", description: error.message, variant: "destructive" });
    },
  });

  const handleBuild = () => {
    if (!name.trim()) {
      toast({ title: "Name required", variant: "destructive" });
      return;
    }
    buildMutation.mutate();
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success": return <CheckCircle2 className="h-4 w-4 text-chart-2" />;
      case "failed": return <XCircle className="h-4 w-4 text-destructive" />;
      case "frozen": return <Snowflake className="h-4 w-4 text-chart-4" />;
      case "building": return <Loader2 className="h-4 w-4 text-chart-1 animate-spin" />;
      default: return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "success": return <Badge className="bg-chart-2/10 text-chart-2 border-chart-2/30">Success</Badge>;
      case "failed": return <Badge className="bg-destructive/10 text-destructive border-destructive/30">Failed</Badge>;
      case "frozen": return <Badge className="bg-chart-4/10 text-chart-4 border-chart-4/30">Frozen</Badge>;
      case "building": return <Badge className="bg-chart-1/10 text-chart-1 border-chart-1/30">Building</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-screen-2xl mx-auto">
      <div>
        <h1 className="text-headline font-semibold">Foundry Studio</h1>
        <p className="text-body text-muted-foreground mt-1">
          Build new artifacts with Overseer evaluation
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Hammer className="h-4 w-4" />
              New Build
            </CardTitle>
            <CardDescription>
              Create a new artifact from components
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="build-name">Artifact Name</Label>
              <Input
                id="build-name"
                placeholder="my-new-app"
                value={name}
                onChange={(e) => setName(e.target.value)}
                data-testid="input-build-name"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger data-testid="select-build-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="app">App</SelectItem>
                    <SelectItem value="fragment">Fragment</SelectItem>
                    <SelectItem value="agent">Agent</SelectItem>
                    <SelectItem value="media">Media</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Target Quality</Label>
                <Select value={targetQuality} onValueChange={setTargetQuality}>
                  <SelectTrigger data-testid="select-target-quality">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="tested">Tested</SelectItem>
                    <SelectItem value="production">Production</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="build-components">Components (one per line)</Label>
              <Textarea
                id="build-components"
                placeholder="component-a\ncomponent-b\ncomponent-c"
                value={components}
                onChange={(e) => setComponents(e.target.value)}
                rows={5}
                data-testid="input-build-components"
              />
            </div>

            <Button
              className="w-full"
              onClick={handleBuild}
              disabled={buildMutation.isPending}
              data-testid="button-start-build"
            >
              {buildMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Building...
                </>
              ) : (
                <>
                  <Hammer className="h-4 w-4 mr-2" />
                  Start Build
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-medium">Build History</CardTitle>
              <CardDescription>
                Recent build attempts and their outcomes
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 max-h-[400px] overflow-auto">
              {buildsLoading ? (
                [...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-lg border">
                    <Skeleton className="h-8 w-8 rounded" />
                    <div className="flex-1">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24 mt-1" />
                    </div>
                    <Skeleton className="h-6 w-16" />
                  </div>
                ))
              ) : builds && builds.length > 0 ? (
                builds.slice().reverse().map((build) => (
                  <div
                    key={build.id}
                    onClick={() => setSelectedBuild(build)}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors hover:bg-accent/50 ${
                      selectedBuild?.id === build.id ? "ring-2 ring-primary" : ""
                    }`}
                    data-testid={`build-row-${build.id}`}
                  >
                    {getStatusIcon(build.status)}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{build.manifest.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(build.timestamp), { addSuffix: true })}
                      </p>
                    </div>
                    {getStatusBadge(build.status)}
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No builds yet</p>
                  <p className="text-sm mt-1">Start a new build to see results</p>
                </div>
              )}
            </CardContent>
          </Card>

          {selectedBuild && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-medium">Build Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Status</span>
                  {getStatusBadge(selectedBuild.status)}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Duration</span>
                  <span className="text-sm">{selectedBuild.duration}ms</span>
                </div>

                <Separator />

                <div>
                  <h4 className="text-sm font-medium mb-2">Overseer Decision</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Action</span>
                      <span className="capitalize">{selectedBuild.overseerDecision.action}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Resonance</span>
                      <span>{selectedBuild.overseerDecision.resonanceScore.toFixed(3)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Coherence</span>
                      <span>{selectedBuild.overseerDecision.coherenceScore.toFixed(1)}</span>
                    </div>
                  </div>
                </div>

                {selectedBuild.errors.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3 text-destructive" />
                      Errors
                    </h4>
                    <ul className="space-y-1">
                      {selectedBuild.errors.map((err, i) => (
                        <li key={i} className="text-sm text-destructive">
                          {err}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {selectedBuild.artifact && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Created Artifact</h4>
                    <div className="p-3 rounded-lg bg-muted/50">
                      <p className="font-medium">{selectedBuild.artifact.name}</p>
                      <p className="text-xs text-muted-foreground font-mono mt-1">
                        {selectedBuild.artifact.id}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
