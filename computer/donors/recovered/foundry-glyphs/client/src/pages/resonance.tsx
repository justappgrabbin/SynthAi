import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Zap,
  Brain,
  Heart,
  Sun,
  Moon,
  Activity,
  Target,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  Compass,
  Layers,
} from "lucide-react";
import {
  getHDActivation,
  formatActivation,
  formatActivationShort,
  getGateMeaning,
  diagnoseField,
  generateCompositeSentence,
  generateCorrectionSentence,
  calculateFaganBradleyAyanamsa,
  tropicalToSidereal,
  tropicalToDraconic,
  degreeToSign,
  DEMO_ACTIVATIONS,
} from "@/lib/resonance-engine";
import type { HDActivation, FieldDiagnosis, ZodiacSign } from "@shared/schema";
import { zodiacSigns, MANDALA_CONSTANTS } from "@shared/schema";

function ActivationCard({
  label,
  activation,
  icon: Icon,
}: {
  label: string;
  activation: HDActivation;
  icon: typeof Sun;
}) {
  const meaning = getGateMeaning(activation.gate);

  return (
    <Card className="overflow-visible">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm font-medium">{label}</CardTitle>
          </div>
          <Badge variant="outline" className="font-mono text-xs">
            {formatActivation(activation)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-2xl font-bold">Gate {activation.gate}</span>
            <Badge variant="secondary">{meaning.center}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">{meaning.name}</p>
          <p className="text-xs italic text-muted-foreground capitalize">
            {meaning.theme}
          </p>
          <Separator />
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-muted-foreground">Sign:</span>{" "}
              <span className="font-medium">{activation.sign}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Position:</span>{" "}
              <span className="font-mono">
                {activation.degree}°{activation.minute}'{Math.round(activation.second)}"
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Line:</span>{" "}
              <span className="font-medium">{activation.line}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Color/Tone/Base:</span>{" "}
              <span className="font-mono">
                {activation.color}.{activation.tone}.{activation.base}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function DiagnosisPanel({ diagnosis }: { diagnosis: FieldDiagnosis }) {
  const pairNames = ["Body-Mind", "Mind-Heart", "Body-Heart"];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Field Diagnosis
          </CardTitle>
          {diagnosis.approved ? (
            <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Approved
            </Badge>
          ) : (
            <Badge variant="destructive">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Needs Correction
            </Badge>
          )}
        </div>
        <CardDescription>
          Resonance Engine alignment analysis using canonical HD math
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label className="text-sm">Coherence Score</Label>
              <span className="font-mono text-sm font-medium">
                {diagnosis.coherenceScore.toFixed(1)}/100
              </span>
            </div>
            <Progress value={diagnosis.coherenceScore} className="h-2" />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label className="text-sm">HD Alignment</Label>
              <span className="font-mono text-sm font-medium">
                {(diagnosis.hdAlignment * 100).toFixed(1)}%
              </span>
            </div>
            <Progress value={diagnosis.hdAlignment * 100} className="h-2" />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label className="text-sm">I Ching Probability</Label>
              <span className="font-mono text-sm font-medium">
                {(diagnosis.iChingProbability * 100).toFixed(1)}%
              </span>
            </div>
            <Progress value={diagnosis.iChingProbability * 100} className="h-2" />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label className="text-sm">Friction Factor</Label>
              <span className="font-mono text-sm font-medium">
                {diagnosis.frictionFactor.toFixed(3)}
              </span>
            </div>
            <Progress value={diagnosis.frictionFactor * 100} className="h-2" />
          </div>
        </div>

        <Separator />

        <div className="rounded-lg bg-muted/50 p-4">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-sm font-medium">Resonance Score</span>
            <span className="text-2xl font-bold font-mono">
              {diagnosis.resonanceScore.toFixed(3)}
            </span>
          </div>
          <p className="text-xs text-muted-foreground font-mono">
            Score = (HD Alignment × I Ching Probability) / Friction Factor
          </p>
        </div>

        {(diagnosis.missingNodes.length > 0 ||
          diagnosis.chargeImbalance.length > 0 ||
          diagnosis.chartDisorder.length > 0) && (
          <>
            <Separator />
            <div className="space-y-3">
              <Label className="text-sm font-medium">Field Misalignment Details</Label>

              {diagnosis.missingNodes.length > 0 && (
                <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3">
                  <p className="text-xs font-medium text-red-600 dark:text-red-400 mb-2">
                    Missing Harmonic Nodes
                  </p>
                  {diagnosis.missingNodes.map((node, idx) => (
                    <div key={idx} className="text-xs text-muted-foreground">
                      {pairNames[node.pairIdx]}: expected {node.expected.toFixed(1)}%, 
                      actual {node.actual.toFixed(1)}% (gap: {node.gap.toFixed(1)}%)
                    </div>
                  ))}
                </div>
              )}

              {diagnosis.chargeImbalance.length > 0 && (
                <div className="rounded-lg bg-orange-500/10 border border-orange-500/20 p-3">
                  <p className="text-xs font-medium text-orange-600 dark:text-orange-400 mb-2">
                    Resonance Imbalances
                  </p>
                  {diagnosis.chargeImbalance.map((imb, idx) => (
                    <div key={idx} className="text-xs text-muted-foreground">
                      {imb.bodies[0]} ↔ {imb.bodies[1]}: deviation {imb.deviation.toFixed(1)}°
                    </div>
                  ))}
                </div>
              )}

              {diagnosis.chartDisorder.length > 0 && (
                <div className="rounded-lg bg-yellow-500/10 border border-yellow-500/20 p-3">
                  <p className="text-xs font-medium text-yellow-600 dark:text-yellow-400 mb-2">
                    Chart Disorder
                  </p>
                  {diagnosis.chartDisorder.map((dis, idx) => (
                    <div key={idx} className="text-xs text-muted-foreground">
                      {dis.body}: variance {dis.variance.toFixed(1)}° 
                      (dominant: {dis.dominant || "none"})
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function CalculatorPanel() {
  const [sign, setSign] = useState<ZodiacSign>("Virgo");
  const [degree, setDegree] = useState("25");
  const [minute, setMinute] = useState("59");
  const [second, setSecond] = useState("31.92");
  const [result, setResult] = useState<HDActivation | null>(null);

  const calculate = () => {
    const activation = getHDActivation(
      sign,
      parseFloat(degree) || 0,
      parseFloat(minute) || 0,
      parseFloat(second) || 0
    );
    setResult(activation);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          HD Activation Calculator
        </CardTitle>
        <CardDescription>
          Calculate Gate.Line.Color.Tone.Base from zodiac position (5°37'30" per gate)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="space-y-2">
            <Label htmlFor="sign">Sign</Label>
            <select
              id="sign"
              value={sign}
              onChange={(e) => setSign(e.target.value as ZodiacSign)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              data-testid="select-sign"
            >
              {zodiacSigns.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="degree">Degree</Label>
            <Input
              id="degree"
              type="number"
              min="0"
              max="29"
              value={degree}
              onChange={(e) => setDegree(e.target.value)}
              data-testid="input-degree"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="minute">Minute</Label>
            <Input
              id="minute"
              type="number"
              min="0"
              max="59"
              value={minute}
              onChange={(e) => setMinute(e.target.value)}
              data-testid="input-minute"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="second">Second</Label>
            <Input
              id="second"
              type="number"
              step="0.01"
              min="0"
              max="59.99"
              value={second}
              onChange={(e) => setSecond(e.target.value)}
              data-testid="input-second"
            />
          </div>
        </div>

        <Button onClick={calculate} className="w-full" data-testid="button-calculate">
          <Sparkles className="h-4 w-4 mr-2" />
          Calculate Activation
        </Button>

        {result && (
          <div className="rounded-lg border bg-card p-4 space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="text-sm text-muted-foreground">Result:</span>
              <Badge variant="outline" className="font-mono text-lg px-3 py-1">
                {formatActivation(result)}
              </Badge>
            </div>
            <Separator />
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">Gate:</span>{" "}
                <span className="font-bold">{result.gate}</span> -{" "}
                {getGateMeaning(result.gate).name}
              </div>
              <div>
                <span className="text-muted-foreground">Line:</span>{" "}
                <span className="font-bold">{result.line}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Color:</span>{" "}
                <span className="font-bold">{result.color}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Tone:</span>{" "}
                <span className="font-bold">{result.tone}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Base:</span>{" "}
                <span className="font-bold">{result.base}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Ecliptic:</span>{" "}
                <span className="font-mono">{result.eclipticDeg.toFixed(4)}°</span>
              </div>
            </div>
            <Separator />
            <p className="text-sm italic text-muted-foreground capitalize">
              Theme: {getGateMeaning(result.gate).theme}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MandalaConstantsCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Compass className="h-5 w-5" />
          Mandala Constants
        </CardTitle>
        <CardDescription>Ra Uru Hu's canonical Human Design mathematics</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between gap-2">
            <span className="text-muted-foreground">Gate Arc:</span>
            <span className="font-mono">5°37'30" ({MANDALA_CONSTANTS.GATE_ARC.toFixed(6)}°)</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-muted-foreground">Line Arc:</span>
            <span className="font-mono">{MANDALA_CONSTANTS.LINE_ARC.toFixed(6)}°</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-muted-foreground">Color Arc:</span>
            <span className="font-mono">{MANDALA_CONSTANTS.COLOR_ARC.toFixed(6)}°</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-muted-foreground">Tone Arc:</span>
            <span className="font-mono">{MANDALA_CONSTANTS.TONE_ARC.toFixed(6)}°</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-muted-foreground">Base Arc:</span>
            <span className="font-mono">{MANDALA_CONSTANTS.BASE_ARC.toFixed(6)}°</span>
          </div>
          <Separator />
          <div className="flex justify-between gap-2">
            <span className="text-muted-foreground">Fagan-Bradley Base:</span>
            <span className="font-mono">24°02'31"</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-muted-foreground">Precession Rate:</span>
            <span className="font-mono">50.2388"/year</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Resonance() {
  const [activeTab, setActiveTab] = useState("demo");

  const bodySun = DEMO_ACTIVATIONS.body.sun;
  const mindSun = DEMO_ACTIVATIONS.mind.sun;
  const heartSun = DEMO_ACTIVATIONS.heart.sun;

  const diagnosis = diagnoseField([bodySun], [mindSun], [heartSun]);
  const compositeSentence = generateCompositeSentence(bodySun, mindSun, heartSun);
  const correctionSentence = generateCorrectionSentence(diagnosis);

  return (
    <ScrollArea className="h-full">
      <div className="container max-w-7xl py-6 space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Zap className="h-8 w-8 text-primary" />
            Resonance Engine
          </h1>
          <p className="text-muted-foreground">
            Precise alignment scoring using Human Design (64 gates, 6 lines, Color-Tone-Base), 
            I Ching hexagrams, and multi-dimensional astrological charts
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="flex flex-wrap">
            <TabsTrigger value="demo" data-testid="tab-demo">
              <Layers className="h-4 w-4 mr-2" />
              Demo Analysis
            </TabsTrigger>
            <TabsTrigger value="calculator" data-testid="tab-calculator">
              <Target className="h-4 w-4 mr-2" />
              Calculator
            </TabsTrigger>
            <TabsTrigger value="constants" data-testid="tab-constants">
              <Compass className="h-4 w-4 mr-2" />
              Constants
            </TabsTrigger>
          </TabsList>

          <TabsContent value="demo" className="space-y-6 mt-6">
            <div className="grid gap-6 md:grid-cols-3">
              <ActivationCard
                label="Body Sun (Tropical)"
                activation={bodySun}
                icon={Sun}
              />
              <ActivationCard
                label="Mind Sun (Sidereal)"
                activation={mindSun}
                icon={Brain}
              />
              <ActivationCard
                label="Heart Sun (Draconic)"
                activation={heartSun}
                icon={Heart}
              />
            </div>

            <DiagnosisPanel diagnosis={diagnosis} />

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  Composite Life Theme
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <blockquote className="border-l-4 border-primary pl-4 italic text-muted-foreground">
                  "{compositeSentence}"
                </blockquote>
                {!diagnosis.approved && (
                  <>
                    <Separator />
                    <div className="rounded-lg bg-yellow-500/10 border border-yellow-500/20 p-4">
                      <p className="text-sm font-medium text-yellow-600 dark:text-yellow-400">
                        {correctionSentence}
                      </p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="calculator" className="mt-6">
            <CalculatorPanel />
          </TabsContent>

          <TabsContent value="constants" className="mt-6">
            <div className="grid gap-6 md:grid-cols-2">
              <MandalaConstantsCard />
              <Card>
                <CardHeader>
                  <CardTitle>Alignment Correction Formulas</CardTitle>
                  <CardDescription>
                    Convert between tropical, sidereal, and draconic charts
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-lg bg-muted p-3 font-mono text-xs">
                    <p className="font-medium mb-2">Fagan-Bradley Ayanamsa:</p>
                    <p className="text-muted-foreground">
                      24°02'31" + (50.2388"/year × (Year - 1950))
                    </p>
                  </div>
                  <div className="rounded-lg bg-muted p-3 font-mono text-xs">
                    <p className="font-medium mb-2">Sidereal Longitude:</p>
                    <p className="text-muted-foreground">
                      Tropical Longitude - Ayanamsa
                    </p>
                  </div>
                  <div className="rounded-lg bg-muted p-3 font-mono text-xs">
                    <p className="font-medium mb-2">Draconic Longitude:</p>
                    <p className="text-muted-foreground">
                      Tropical Longitude - North Node Longitude
                    </p>
                  </div>
                  <div className="rounded-lg bg-muted p-3 font-mono text-xs">
                    <p className="font-medium mb-2">Resonance Score:</p>
                    <p className="text-muted-foreground">
                      (HD Alignment × I Ching Probability) / Friction Factor
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </ScrollArea>
  );
}
