import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Sparkles,
  User,
  Calendar,
  Clock,
  MapPin,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Info,
} from "lucide-react";
import type { ResonanceScoreResponse, BirthData } from "@shared/schema";

export default function Resonance() {
  const { toast } = useToast();
  const [result, setResult] = useState<ResonanceScoreResponse | null>(null);

  const [formData, setFormData] = useState<BirthData>({
    date: "1990-01-15",
    time: "14:30",
    timezone: "America/Los_Angeles",
    latitude: 34.0522,
    longitude: -118.2437,
    location: "Los Angeles, CA",
  });

  const scoreMutation = useMutation({
    mutationFn: async (birthData: BirthData) => {
      const response = await apiRequest("POST", "/api/resonance/score", { birthData });
      return response.json() as Promise<ResonanceScoreResponse>;
    },
    onSuccess: (data) => {
      setResult(data);
      toast({
        title: "Resonance Score Calculated",
        description: `Score: ${data.diagnosis.resonanceScore.toFixed(3)}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Calculation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    scoreMutation.mutate(formData);
  };

  const getScoreColor = (score: number) => {
    if (score >= 0.8) return "text-chart-2";
    if (score >= 0.5) return "text-chart-4";
    return "text-destructive";
  };

  const getCoherenceColor = (score: number) => {
    if (score >= 80) return "text-chart-2";
    if (score >= 60) return "text-chart-4";
    return "text-destructive";
  };

  return (
    <div className="p-6 space-y-6 max-w-screen-2xl mx-auto">
      <div>
        <h1 className="text-headline font-semibold">Resonance Engine</h1>
        <p className="text-body text-muted-foreground mt-1">
          Human Design alignment scoring with Ra Uru Hu canonical math
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="h-4 w-4" />
              Birth Data
            </CardTitle>
            <CardDescription>
              Enter birth information to calculate resonance score
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="date">
                    <Calendar className="h-3 w-3 inline mr-1" />
                    Date
                  </Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    data-testid="input-birth-date"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="time">
                    <Clock className="h-3 w-3 inline mr-1" />
                    Time
                  </Label>
                  <Input
                    id="time"
                    type="time"
                    value={formData.time}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                    data-testid="input-birth-time"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">
                  <MapPin className="h-3 w-3 inline mr-1" />
                  Location
                </Label>
                <Input
                  id="location"
                  placeholder="City, Country"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  data-testid="input-birth-location"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="latitude">Latitude</Label>
                  <Input
                    id="latitude"
                    type="number"
                    step="0.0001"
                    value={formData.latitude}
                    onChange={(e) => setFormData({ ...formData, latitude: parseFloat(e.target.value) })}
                    data-testid="input-latitude"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="longitude">Longitude</Label>
                  <Input
                    id="longitude"
                    type="number"
                    step="0.0001"
                    value={formData.longitude}
                    onChange={(e) => setFormData({ ...formData, longitude: parseFloat(e.target.value) })}
                    data-testid="input-longitude"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone</Label>
                <Input
                  id="timezone"
                  placeholder="America/Los_Angeles"
                  value={formData.timezone}
                  onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                  data-testid="input-timezone"
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={scoreMutation.isPending}
                data-testid="button-calculate-resonance"
              >
                {scoreMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Calculating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Calculate Resonance Score
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {result && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="h-4 w-4" />
                Resonance Score Result
              </CardTitle>
              <CardDescription>
                Human Design alignment analysis
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="p-4 rounded-lg bg-muted/50 text-center">
                  <p className="text-caption text-muted-foreground mb-1">Resonance Score</p>
                  <p className={`text-3xl font-bold ${getScoreColor(result.diagnosis.resonanceScore)}`} data-testid="text-resonance-score">
                    {result.diagnosis.resonanceScore.toFixed(3)}
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50 text-center">
                  <p className="text-caption text-muted-foreground mb-1">Coherence Score</p>
                  <p className={`text-3xl font-bold ${getCoherenceColor(result.diagnosis.coherenceScore)}`} data-testid="text-coherence-score">
                    {result.diagnosis.coherenceScore.toFixed(1)}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-center gap-2">
                {result.diagnosis.approved ? (
                  <Badge className="bg-chart-2/10 text-chart-2 border-chart-2/30">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Approved
                  </Badge>
                ) : (
                  <Badge className="bg-destructive/10 text-destructive border-destructive/30">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Not Approved
                  </Badge>
                )}
                <Badge variant="outline">{result.blueprint.hdType}</Badge>
                <Badge variant="outline">{result.blueprint.definition}</Badge>
              </div>

              <Separator />

              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium mb-2">Composite Sentence</h4>
                  <p className="text-sm text-muted-foreground italic">
                    "{result.compositeSentence}"
                  </p>
                </div>

                {result.correctionSentence && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Correction Sentence</h4>
                    <p className="text-sm text-muted-foreground italic">
                      "{result.correctionSentence}"
                    </p>
                  </div>
                )}

                <div>
                  <h4 className="text-sm font-medium mb-2">Diagnosis</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">HD Alignment:</span>
                      <span>{(result.diagnosis.hdAlignment * 100).toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">I Ching Probability:</span>
                      <span>{(result.diagnosis.iChingProbability * 100).toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Friction Factor:</span>
                      <span>{result.diagnosis.frictionFactor.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {result.diagnosis.missingNodes.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3 text-chart-4" />
                      Missing Harmonic Nodes ({result.diagnosis.missingNodes.length})
                    </h4>
                  </div>
                )}

                {result.recommendations.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
                      <Info className="h-3 w-3" />
                      Recommendations
                    </h4>
                    <ul className="space-y-1">
                      {result.recommendations.map((rec, i) => (
                        <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                          <span className="text-primary">•</span>
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium">Chart Layers</CardTitle>
            <CardDescription>
              Three-layer Human Design chart (Tropical, Sidereal, Draconic)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              {["body", "mind", "heart"].map((layer) => {
                const data = result.blueprint[layer as keyof typeof result.blueprint];
                if (typeof data !== "object" || !("sun" in data)) return null;
                return (
                  <div key={layer} className="p-4 rounded-lg border">
                    <h4 className="font-medium capitalize mb-3">{layer} Chart</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Sun:</span>
                        <span>Gate {data.sun.gate}.{data.sun.line}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Moon:</span>
                        <span>Gate {data.moon.gate}.{data.moon.line}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Mars:</span>
                        <span>Gate {data.mars.gate}.{data.mars.line}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Venus:</span>
                        <span>Gate {data.venus.gate}.{data.venus.line}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
