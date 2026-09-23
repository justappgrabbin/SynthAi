import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { QualityBadge } from "@/components/quality-badge";
import { GlyphId } from "@/components/glyph-id";
import { Shield, ArrowRight } from "lucide-react";
import type { Glyph, QualityState } from "@shared/schema";

interface PromotionModalProps {
  glyph: Glyph | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPromote: (glyphId: string, toQuality: QualityState, evidenceUri: string) => void;
  isPending?: boolean;
}

export function PromotionModal({
  glyph,
  open,
  onOpenChange,
  onPromote,
  isPending,
}: PromotionModalProps) {
  const [targetQuality, setTargetQuality] = useState<QualityState>("tested");
  const [evidenceUri, setEvidenceUri] = useState("");

  if (!glyph) return null;

  const availableTargets: QualityState[] = 
    glyph.quality === "draft" ? ["tested", "production"] : 
    glyph.quality === "tested" ? ["production"] : [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onPromote(glyph.id, targetQuality, evidenceUri);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-chart-1" />
            Promote Glyph
          </DialogTitle>
          <DialogDescription>
            Promote this glyph to a higher quality state. This action requires attestation.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-muted-foreground">Glyph</Label>
              <div className="flex items-center gap-2">
                <span className="font-medium">{glyph.name}</span>
                <GlyphId id={glyph.id} />
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex-1 space-y-2">
                <Label className="text-muted-foreground">Current State</Label>
                <div className="pt-1">
                  <QualityBadge quality={glyph.quality} />
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground mt-6" />
              <div className="flex-1 space-y-2">
                <Label htmlFor="target-quality">Target State</Label>
                <Select
                  value={targetQuality}
                  onValueChange={(v) => setTargetQuality(v as QualityState)}
                >
                  <SelectTrigger id="target-quality" data-testid="select-target-quality">
                    <SelectValue placeholder="Select target" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableTargets.map((q) => (
                      <SelectItem key={q} value={q}>
                        <span className="capitalize">{q}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="evidence-uri">Evidence URI</Label>
              <Input
                id="evidence-uri"
                placeholder="https://ci.example.com/build/123"
                value={evidenceUri}
                onChange={(e) => setEvidenceUri(e.target.value)}
                data-testid="input-evidence-uri"
              />
              <p className="text-caption text-muted-foreground">
                Link to test results, CI pipeline, or approval document
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending} data-testid="button-confirm-promote">
              {isPending ? "Promoting..." : "Promote"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
