import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Hammer, Package, GitBranch, CheckCircle, XCircle, Clock, Loader2, AlertTriangle, Play } from "lucide-react";

interface BuildResult {
  id: string;
  status: string;
  manifest: {
    name: string;
    type: string;
    components: string[];
    targetQuality: string;
  };
  artifact: { id: string; name: string } | null;
  overseerDecision: {
    action: string;
    approved: boolean;
    reasoning: string[];
    resonanceScore: number;
    coherenceScore: number;
  };
  financialImpact: {
    estimatedCost: number;
    estimatedRevenue: number;
    riskScore: number;
    approved: boolean;
  };
  errors: string[];
  warnings: string[];
  duration: number;
}

interface SelectionCandidate {
  id: string;
  name: string;
  type: string;
  quality: string;
  weight: number;
  resonanceAffinity: number;
}

export default function Studio() {
  const { toast } = useToast();
  const [buildName, setBuildName] = useState("");
  const [buildType, setBuildType] = useState<string>("app");
  const [targetQuality, setTargetQuality] = useState<string>("draft");
  const [components, setComponents] = useState<string[]>([]);
  const [newComponent, setNewComponent] = useState("");

  const { data: candidates } = useQuery<SelectionCandidate[]>({
    queryKey: ["/api/selector/candidates"],
  });

  const { data: buildHistory } = useQuery<BuildResult[]>({
    queryKey: ["/api/builder/history"],
  });

  const buildMutation = useMutation({
    mutationFn: async (manifest: { name: string; type: string; components: string[]; targetQuality: string }) => {
      return apiRequest("/api/builder/build", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(manifest),
      });
    },
    onSuccess: (data: BuildResult) => {
      queryClient.invalidateQueries({ queryKey: ["/api/builder/history"] });
      queryClient.invalidateQueries({ queryKey: ["/api/glyphs"] });
      if (data.status === "success") {
        toast({ title: "Build Successful", description: `Created ${data.artifact?.name}` });
      } else {
        toast({ title: "Build Failed", description: data.errors.join(", "), variant: "destructive" });
      }
    },
    onError: () => {
      toast({ title: "Build Error", description: "Failed to start build", variant: "destructive" });
    },
  });

  const handleBuild = () => {
    if (!buildName) {
      toast({ title: "Error", description: "Build name required", variant: "destructive" });
      return;
    }
    buildMutation.mutate({
      name: buildName,
      type: buildType,
      components,
      targetQuality,
    });
  };

  const addComponent = () => {
    if (newComponent && !components.includes(newComponent)) {
      setComponents([...components, newComponent]);
      setNewComponent("");
    }
  };

  const removeComponent = (comp: string) => {
    setComponents(components.filter((c) => c !== comp));
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "frozen":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="p-6 space-y-6" data-testid="page-studio">
      <div className="flex items-center gap-3">
        <Hammer className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-studio-title">Studio</h1>
          <p className="text-muted-foreground">Build apps, fragments, and agents with Overseer governance</p>
        </div>
      </div>

      <Tabs defaultValue="build" className="space-y-4">
        <TabsList>
          <TabsTrigger value="build" data-testid="tab-build">Build</TabsTrigger>
          <TabsTrigger value="components" data-testid="tab-components">Components</TabsTrigger>
          <TabsTrigger value="history" data-testid="tab-history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="build" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Build Manifest
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="build-name">Name</Label>
                  <Input
                    id="build-name"
                    data-testid="input-build-name"
                    value={buildName}
                    onChange={(e) => setBuildName(e.target.value)}
                    placeholder="My New App"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={buildType} onValueChange={setBuildType}>
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

                <div className="space-y-2">
                  <Label>Components</Label>
                  <div className="flex gap-2">
                    <Input
                      data-testid="input-component"
                      value={newComponent}
                      onChange={(e) => setNewComponent(e.target.value)}
                      placeholder="Component name"
                      onKeyDown={(e) => e.key === "Enter" && addComponent()}
                    />
                    <Button onClick={addComponent} variant="outline" data-testid="button-add-component">
                      Add
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {components.map((comp) => (
                      <Badge
                        key={comp}
                        variant="secondary"
                        className="cursor-pointer"
                        onClick={() => removeComponent(comp)}
                      >
                        {comp} ×
                      </Badge>
                    ))}
                  </div>
                </div>

                <Separator />

                <Button
                  onClick={handleBuild}
                  disabled={buildMutation.isPending}
                  className="w-full"
                  data-testid="button-build"
                >
                  {buildMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Play className="h-4 w-4 mr-2" />
                  )}
                  Build
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GitBranch className="h-5 w-5" />
                  Build Preview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Name:</span>
                    <span className="font-mono">{buildName || "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Type:</span>
                    <Badge variant="outline">{buildType}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Quality:</span>
                    <Badge
                      variant={
                        targetQuality === "production"
                          ? "default"
                          : targetQuality === "tested"
                          ? "secondary"
                          : "outline"
                      }
                    >
                      {targetQuality}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Components:</span>
                    <span>{components.length}</span>
                  </div>

                  <Separator />

                  <div className="p-3 bg-muted/50 rounded-md space-y-2">
                    <p className="text-xs text-muted-foreground">Governance Checks:</p>
                    <div className="flex items-center gap-2 text-xs">
                      <CheckCircle className="h-3 w-3 text-green-500" />
                      Resonance Engine alignment
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <CheckCircle className="h-3 w-3 text-green-500" />
                      Overseer approval required
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <CheckCircle className="h-3 w-3 text-green-500" />
                      Financial stability check
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <CheckCircle className="h-3 w-3 text-green-500" />
                      Causal graph registration
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="components">
          <Card>
            <CardHeader>
              <CardTitle>Available Components</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                {candidates && candidates.length > 0 ? (
                  <div className="space-y-2">
                    {candidates.map((candidate) => (
                      <div
                        key={candidate.id}
                        className="flex items-center justify-between p-3 border rounded-md"
                        data-testid={`component-${candidate.id}`}
                      >
                        <div>
                          <p className="font-medium">{candidate.name}</p>
                          <p className="text-sm text-muted-foreground font-mono">{candidate.id.slice(0, 20)}...</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{candidate.type}</Badge>
                          <Badge
                            variant={
                              candidate.quality === "production"
                                ? "default"
                                : candidate.quality === "tested"
                                ? "secondary"
                                : "outline"
                            }
                          >
                            {candidate.quality}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            Res: {(candidate.resonanceAffinity * 100).toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">No components available</p>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Build History</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                {buildHistory && buildHistory.length > 0 ? (
                  <div className="space-y-3">
                    {buildHistory.map((build) => (
                      <div
                        key={build.id}
                        className="p-4 border rounded-md space-y-3"
                        data-testid={`build-${build.id}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(build.status)}
                            <span className="font-medium">{build.manifest.name}</span>
                          </div>
                          <Badge variant="outline">{build.status}</Badge>
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Type:</span>{" "}
                            <Badge variant="outline" className="ml-1">{build.manifest.type}</Badge>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Duration:</span>{" "}
                            {build.duration}ms
                          </div>
                          <div>
                            <span className="text-muted-foreground">Resonance:</span>{" "}
                            {build.overseerDecision.resonanceScore.toFixed(3)}
                          </div>
                          <div>
                            <span className="text-muted-foreground">Coherence:</span>{" "}
                            {build.overseerDecision.coherenceScore.toFixed(1)}
                          </div>
                        </div>

                        {build.errors.length > 0 && (
                          <div className="p-2 bg-destructive/10 rounded text-sm text-destructive">
                            {build.errors.join(", ")}
                          </div>
                        )}

                        {build.warnings.length > 0 && (
                          <div className="p-2 bg-yellow-500/10 rounded text-sm text-yellow-600">
                            {build.warnings.join(", ")}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">No builds yet</p>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
