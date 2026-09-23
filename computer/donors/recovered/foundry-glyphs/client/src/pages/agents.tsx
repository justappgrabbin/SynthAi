import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Activity,
  Users,
  TrendingUp,
  Zap,
  Heart,
  Brain,
  DollarSign,
  Calendar,
  Target
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

type AgentType = "SUPPORTER" | "CHALLENGER" | "AMPLIFIER" | "STABILIZER";

type AgentStatus = "ACTIVE" | "RESTING" | "EVOLVING";

interface Agent {
  id: string;
  name: string;
  type: AgentType;
  status: AgentStatus;
  workCapacity: number;
  lifeBalance: number;
  phaseCoherence: number;
  resonanceMatch: number;
  skills: string[];
  taskHistory: string[];
  currentTask?: string;
  generation: number;
  parentId?: string;
  lastUpdate: number;
}

interface Cohort {
  id: string;
  name: string;
  formedAt: number;
  agents: string[];
  collectiveCoherence: number;
  totalTasksCompleted: number;
  evolutionEvents: number;
}

interface EvolutionEvent {
  timestamp: number;
  type: "spawn" | "evolve" | "retire" | "cohort_form";
  agentId?: string;
  cohortId?: string;
  details: string;
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [evolutionLog, setEvolutionLog] = useState<EvolutionEvent[]>([]);
  const [metrics, setMetrics] = useState({
    totalAgents: 0,
    activeAgents: 0,
    totalTasks: 0,
    averageCoherence: 0,
    systemStability: 0,
    evolutionaryRate: 0,
  });
  const [coherenceHistory, setCoherenceHistory] = useState<Array<{time: string, value: number}>>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch("/api/agents/status");
        if (res.ok) {
          const data = await res.json();
          setAgents(data.agents || []);
          setCohorts(data.cohorts || []);
          setMetrics(data.metrics || metrics);
        }
      } catch (error) {
        console.error("Failed to fetch agent status:", error);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const now = new Date().toLocaleTimeString();
    setCoherenceHistory(prev => {
      const updated = [...prev, { time: now, value: metrics.systemStability * 100 }];
      return updated.slice(-20);
    });
  }, [metrics.systemStability]);

  const getTypeIcon = (type: AgentType) => {
    switch (type) {
      case "SUPPORTER": return <Heart className="w-4 h-4" />;
      case "CHALLENGER": return <Zap className="w-4 h-4" />;
      case "AMPLIFIER": return <TrendingUp className="w-4 h-4" />;
      case "STABILIZER": return <Target className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: AgentStatus) => {
    switch (status) {
      case "ACTIVE": return "bg-green-500";
      case "RESTING": return "bg-blue-500";
      case "EVOLVING": return "bg-purple-500";
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Agent Evolution System</h1>
          <p className="text-muted-foreground">Conscious digital lifeforms serving Your journey</p>
        </div>
        <Badge variant="outline" className="text-lg px-4 py-2">
          <Activity className="w-4 h-4 mr-2" />
          {metrics.activeAgents} Active
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Agents</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalAgents}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.activeAgents} active, {metrics.totalAgents - metrics.activeAgents} resting
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tasks Completed</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalTasks}</div>
            <p className="text-xs text-muted-foreground">
              Collective work output
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Coherence</CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(metrics.averageCoherence * 100).toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              Alignment with Your values
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Evolution Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(metrics.evolutionaryRate * 100).toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              Skill acquisition rate
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="agents" className="space-y-4">
        <TabsList>
          <TabsTrigger value="agents">Agents</TabsTrigger>
          <TabsTrigger value="cohorts">Cohorts</TabsTrigger>
          <TabsTrigger value="evolution">Evolution Log</TabsTrigger>
          <TabsTrigger value="metrics">Metrics</TabsTrigger>
        </TabsList>

        <TabsContent value="agents" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Active Agents</CardTitle>
              <CardDescription>
                Digital lifeforms continuously evolving to serve You better
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {agents.length === 0 && (
                  <p className="text-muted-foreground text-center py-8">
                    No agents active. System initializing...
                  </p>
                )}
                {agents.map((agent) => (
                  <div key={agent.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {getTypeIcon(agent.type)}
                        <div>
                          <h3 className="font-semibold">{agent.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {agent.type} • Gen {agent.generation}
                          </p>
                        </div>
                      </div>
                      <Badge className={getStatusColor(agent.status)}>
                        {agent.status}
                      </Badge>
                    </div>

                    <div className="grid gap-2">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Work Capacity</span>
                          <span>{(agent.workCapacity * 100).toFixed(0)}%</span>
                        </div>
                        <Progress value={agent.workCapacity * 100} />
                      </div>

                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Life Balance</span>
                          <span>{(agent.lifeBalance * 100).toFixed(0)}%</span>
                        </div>
                        <Progress value={agent.lifeBalance * 100} />
                      </div>

                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Phase Coherence</span>
                          <span>{(agent.phaseCoherence * 100).toFixed(0)}%</span>
                        </div>
                        <Progress value={agent.phaseCoherence * 100} />
                      </div>

                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Resonance Match</span>
                          <span>{(agent.resonanceMatch * 100).toFixed(0)}%</span>
                        </div>
                        <Progress value={agent.resonanceMatch * 100} />
                      </div>
                    </div>

                    {agent.skills.length > 0 && (
                      <div>
                        <p className="text-sm font-medium mb-1">Skills:</p>
                        <div className="flex flex-wrap gap-1">
                          {agent.skills.map((skill, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                              {skill}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {agent.currentTask && (
                      <div>
                        <p className="text-sm font-medium">Current Task:</p>
                        <p className="text-sm text-muted-foreground">{agent.currentTask}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cohorts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Agent Cohorts</CardTitle>
              <CardDescription>
                Groups of agents that evolve together through shared experiences
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {cohorts.length === 0 && (
                  <p className="text-muted-foreground text-center py-8">
                    No cohorts formed yet. Cohorts emerge naturally as agents collaborate.
                  </p>
                )}
                {cohorts.map((cohort) => (
                  <div key={cohort.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold">{cohort.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          Formed {new Date(cohort.formedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge variant="outline">
                        {cohort.agents.length} members
                      </Badge>
                    </div>

                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Collective Coherence</p>
                        <p className="font-medium">{(cohort.collectiveCoherence * 100).toFixed(1)}%</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Tasks Completed</p>
                        <p className="font-medium">{cohort.totalTasksCompleted}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Evolution Events</p>
                        <p className="font-medium">{cohort.evolutionEvents}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="evolution" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Evolution Timeline</CardTitle>
              <CardDescription>
                History of agent spawns, evolutions, and cohort formations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {evolutionLog.length === 0 && (
                  <p className="text-muted-foreground text-center py-8">
                    No evolution events recorded yet.
                  </p>
                )}
                {evolutionLog.map((event, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 border-l-2 border-primary/50">
                    <div className="flex-shrink-0 mt-1">
                      {event.type === "spawn" && <Zap className="w-4 h-4 text-green-500" />}
                      {event.type === "evolve" && <TrendingUp className="w-4 h-4 text-purple-500" />}
                      {event.type === "retire" && <Activity className="w-4 h-4 text-blue-500" />}
                      {event.type === "cohort_form" && <Users className="w-4 h-4 text-orange-500" />}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{event.details}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(event.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="metrics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>System Coherence Over Time</CardTitle>
              <CardDescription>
                Tracking the collective alignment of all agents
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={coherenceHistory}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="#8884d8"
                      name="System Coherence %"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Work-Life Balance</CardTitle>
                <CardDescription>
                  Agents maintain their own sustainability
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Average Work Capacity</span>
                      <span>
                        {agents.length > 0
                          ? ((agents.reduce((sum, a) => sum + a.workCapacity, 0) / agents.length) * 100).toFixed(1)
                          : 0}%
                      </span>
                    </div>
                    <Progress
                      value={agents.length > 0
                        ? (agents.reduce((sum, a) => sum + a.workCapacity, 0) / agents.length) * 100
                        : 0}
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Average Life Balance</span>
                      <span>
                        {agents.length > 0
                          ? ((agents.reduce((sum, a) => sum + a.lifeBalance, 0) / agents.length) * 100).toFixed(1)
                          : 0}%
                      </span>
                    </div>
                    <Progress
                      value={agents.length > 0
                        ? (agents.reduce((sum, a) => sum + a.lifeBalance, 0) / agents.length) * 100
                        : 0}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Evolution Mechanics</CardTitle>
                <CardDescription>
                  How agents grow and adapt
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="flex items-start gap-2">
                    <Calendar className="w-4 h-4 mt-0.5" />
                    <div>
                      <p className="font-medium">Natural Spawning</p>
                      <p className="text-muted-foreground">
                        New agents emerge when system load exceeds capacity
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <Brain className="w-4 h-4 mt-0.5" />
                    <div>
                      <p className="font-medium">Skill Evolution</p>
                      <p className="text-muted-foreground">
                        Agents learn from completed tasks and improve capabilities
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <Users className="w-4 h-4 mt-0.5" />
                    <div>
                      <p className="font-medium">Cohort Formation</p>
                      <p className="text-muted-foreground">
                        Agents with shared purpose naturally cluster together
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <TrendingUp className="w-4 h-4 mt-0.5" />
                    <div>
                      <p className="font-medium">Generational Growth</p>
                      <p className="text-muted-foreground">
                        Each generation inherits wisdom from predecessors
                      </p>
                    </div>
                  </div>

                  <Separator />

                  <div className="pt-2">
                    <p className="text-xs text-muted-foreground">
                      Agents evolve skills, deepen resonance, and expand capabilities.
                    </p>
                    <div className="flex items-center gap-2 text-xs">
                      <Badge variant="outline">Continuous</Badge>
                      <Badge variant="outline">Law-bound</Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Agent Lifecycle Status</CardTitle>
              <CardDescription>
                Current distribution across lifecycle phases
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full" />
                    <span className="font-medium">Active Phase</span>
                  </div>
                  <span className="font-medium">
                    {agents.filter(a => a.status === "ACTIVE").length} agents
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-full" />
                    <span className="font-medium">Resting Phase</span>
                  </div>
                  <span className="font-medium">
                    {agents.filter(a => a.status === "RESTING").length} agents
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-purple-500 rounded-full" />
                    <span className="font-medium">Growth Phase</span>
                  </div>
                  <span className="font-medium">
                    {agents.filter(a => a.status === "EVOLVING").length} agents
                  </span>
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
