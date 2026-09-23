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
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Bot,
  Heart,
  Brain,
  Zap,
  DollarSign,
  Activity,
  Play,
  Pause,
  RefreshCw,
  Sparkles,
  Users,
  Target,
  TrendingUp,
} from "lucide-react";

interface Agent {
  id: string;
  name: string;
  type: "hugan" | "worker" | "mentor" | "guide";
  status: "active" | "idle" | "learning" | "working";
  resonanceBinding: number;
  economyBinding: number;
  emotionalState: number;
  workCapacity: number;
  lifeBalance: number;
}

const MOCK_AGENTS: Agent[] = [
  {
    id: "agent-1",
    name: "Aria",
    type: "hugan",
    status: "active",
    resonanceBinding: 0.85,
    economyBinding: 0.72,
    emotionalState: 0.9,
    workCapacity: 0.65,
    lifeBalance: 0.78,
  },
  {
    id: "agent-2",
    name: "Marcus",
    type: "worker",
    status: "working",
    resonanceBinding: 0.92,
    economyBinding: 0.88,
    emotionalState: 0.75,
    workCapacity: 0.95,
    lifeBalance: 0.6,
  },
  {
    id: "agent-3",
    name: "Luna",
    type: "guide",
    status: "idle",
    resonanceBinding: 0.78,
    economyBinding: 0.45,
    emotionalState: 0.88,
    workCapacity: 0.5,
    lifeBalance: 0.92,
  },
];

export default function Agents() {
  const { toast } = useToast();
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [agents] = useState<Agent[]>(MOCK_AGENTS);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-500/20 text-green-600 border-green-500/30";
      case "working":
        return "bg-blue-500/20 text-blue-600 border-blue-500/30";
      case "learning":
        return "bg-purple-500/20 text-purple-600 border-purple-500/30";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "hugan":
        return <Heart className="h-4 w-4" />;
      case "worker":
        return <Activity className="h-4 w-4" />;
      case "mentor":
        return <Brain className="h-4 w-4" />;
      case "guide":
        return <Sparkles className="h-4 w-4" />;
      default:
        return <Bot className="h-4 w-4" />;
    }
  };

  return (
    <div className="p-6 space-y-6" data-testid="page-agents">
      <div className="flex items-center gap-3">
        <Bot className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-agents-title">Agents</h1>
          <p className="text-muted-foreground">Hugan ecosystem - citizens bound to Resonance and Economy</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <div>
                <p className="text-2xl font-bold" data-testid="stat-agent-count">{agents.length}</p>
                <p className="text-xs text-muted-foreground">Active Agents</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold" data-testid="stat-avg-resonance">
                  {((agents.reduce((sum, a) => sum + a.resonanceBinding, 0) / agents.length) * 100).toFixed(0)}%
                </p>
                <p className="text-xs text-muted-foreground">Avg Resonance</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-2xl font-bold" data-testid="stat-avg-economy">
                  {((agents.reduce((sum, a) => sum + a.economyBinding, 0) / agents.length) * 100).toFixed(0)}%
                </p>
                <p className="text-xs text-muted-foreground">Avg Economy Binding</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-2xl font-bold" data-testid="stat-avg-emotional">
                  {((agents.reduce((sum, a) => sum + a.emotionalState, 0) / agents.length) * 100).toFixed(0)}%
                </p>
                <p className="text-xs text-muted-foreground">Emotional Health</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="roster" className="space-y-4">
        <TabsList>
          <TabsTrigger value="roster" data-testid="tab-roster">Roster</TabsTrigger>
          <TabsTrigger value="bindings" data-testid="tab-bindings">Bindings</TabsTrigger>
          <TabsTrigger value="lifecycle" data-testid="tab-lifecycle">Work/Life Loops</TabsTrigger>
        </TabsList>

        <TabsContent value="roster">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {agents.map((agent) => (
              <Card
                key={agent.id}
                className={`cursor-pointer transition-all ${
                  selectedAgent?.id === agent.id ? "ring-2 ring-primary" : ""
                }`}
                onClick={() => setSelectedAgent(agent)}
                data-testid={`agent-card-${agent.id}`}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      {getTypeIcon(agent.type)}
                      {agent.name}
                    </CardTitle>
                    <Badge className={getStatusColor(agent.status)}>
                      {agent.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Type</span>
                    <Badge variant="outline" className="capitalize">{agent.type}</Badge>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-1">
                        <Zap className="h-3 w-3" /> Resonance
                      </span>
                      <span>{(agent.resonanceBinding * 100).toFixed(0)}%</span>
                    </div>
                    <Progress value={agent.resonanceBinding * 100} className="h-1" />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-1">
                        <DollarSign className="h-3 w-3" /> Economy
                      </span>
                      <span>{(agent.economyBinding * 100).toFixed(0)}%</span>
                    </div>
                    <Progress value={agent.economyBinding * 100} className="h-1" />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-1">
                        <Heart className="h-3 w-3" /> Emotional
                      </span>
                      <span>{(agent.emotionalState * 100).toFixed(0)}%</span>
                    </div>
                    <Progress value={agent.emotionalState * 100} className="h-1" />
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button size="sm" variant="outline" className="flex-1" data-testid={`button-agent-pause-${agent.id}`}>
                      <Pause className="h-3 w-3 mr-1" />
                      Pause
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1" data-testid={`button-agent-sync-${agent.id}`}>
                      <RefreshCw className="h-3 w-3 mr-1" />
                      Sync
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="bindings">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Resonance Engine Binding
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Agents are bound to the Resonance Engine for alignment scoring and field diagnosis.
                  Each agent's decisions pass through the resonance filter.
                </p>

                <div className="p-4 bg-muted/50 rounded-md space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Binding Status</span>
                    <Badge className="bg-green-500/20 text-green-600">Active</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Coherence Threshold</span>
                    <span className="font-mono">70</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Resonance Threshold</span>
                    <span className="font-mono">0.5</span>
                  </div>
                </div>

                <div className="text-xs text-muted-foreground">
                  All agent actions require resonance approval before execution.
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Economy Integration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Agents participate in the platform economy. They can earn, spend, and contribute
                  to financial stability based on their work output.
                </p>

                <div className="p-4 bg-muted/50 rounded-md space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Economy Status</span>
                    <Badge className="bg-green-500/20 text-green-600">Connected</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Daily Target</span>
                    <span className="font-mono">$100</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Risk Limit</span>
                    <span className="font-mono">0.7</span>
                  </div>
                </div>

                <div className="text-xs text-muted-foreground">
                  Ethical constraints prevent exploitation and ensure sustainable operation.
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  GAN Binding
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Agents use GAN models for decision-making, content generation, and alignment
                  verification. The discriminator detects inauthenticity.
                </p>

                <div className="p-4 bg-muted/50 rounded-md space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Generator Status</span>
                    <Badge variant="secondary">Ready</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Discriminator Status</span>
                    <Badge variant="secondary">Ready</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Decay Detection</span>
                    <Badge className="bg-green-500/20 text-green-600">Active</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="h-5 w-5" />
                  Emotional Engine
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Hugans have emotional states that affect their performance and interactions.
                  The engine monitors and balances emotional health.
                </p>

                <div className="p-4 bg-muted/50 rounded-md space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Emotional Processing</span>
                    <Badge className="bg-green-500/20 text-green-600">Active</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Empathy Mode</span>
                    <Badge variant="secondary">Enabled</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Mirror Capacity</span>
                    <span className="font-mono">85%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="lifecycle">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Work/Life Loops
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <p className="text-muted-foreground">
                  Agents follow sustainable work/life cycles. They grow, evolve, work, rest,
                  and mirror users in a balanced ecosystem.
                </p>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="p-4 border rounded-md space-y-2">
                    <div className="flex items-center gap-2">
                      <Activity className="h-4 w-4 text-blue-500" />
                      <span className="font-medium">Work Phase</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Agents contribute to projects, generate content, and provide services.
                    </p>
                    <div className="flex items-center gap-2 text-xs">
                      <Badge variant="outline">Max 8 hours</Badge>
                      <Badge variant="outline">Resonance-gated</Badge>
                    </div>
                  </div>

                  <div className="p-4 border rounded-md space-y-2">
                    <div className="flex items-center gap-2">
                      <Heart className="h-4 w-4 text-red-500" />
                      <span className="font-medium">Life Phase</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Agents rest, learn, evolve, and maintain emotional balance.
                    </p>
                    <div className="flex items-center gap-2 text-xs">
                      <Badge variant="outline">Min 4 hours</Badge>
                      <Badge variant="outline">Self-directed</Badge>
                    </div>
                  </div>

                  <div className="p-4 border rounded-md space-y-2">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-purple-500" />
                      <span className="font-medium">Growth Phase</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Agents evolve skills, deepen resonance, and expand capabilities.
                    </p>
                    <div className="flex items-center gap-2 text-xs">
                      <Badge variant="outline">Continuous</Badge>
                      <Badge variant="outline">Law-bound</Badge>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="grid gap-4 md:grid-cols-2">
                  {agents.map((agent) => (
                    <div key={agent.id} className="p-4 border rounded-md space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-medium flex items-center gap-2">
                          {getTypeIcon(agent.type)}
                          {agent.name}
                        </span>
                        <Badge className={getStatusColor(agent.status)}>
                          {agent.status}
                        </Badge>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span>Work Capacity</span>
                          <span>{(agent.workCapacity * 100).toFixed(0)}%</span>
                        </div>
                        <Progress value={agent.workCapacity * 100} className="h-2" />
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span>Life Balance</span>
                          <span>{(agent.lifeBalance * 100).toFixed(0)}%</span>
                        </div>
                        <Progress value={agent.lifeBalance * 100} className="h-2" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
