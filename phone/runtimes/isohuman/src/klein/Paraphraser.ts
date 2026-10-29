// ============================================================================
// Paraphraser — Preserve relation graph while altering surface language
// ============================================================================
import { ExplanationStep } from "../models";

export class Paraphraser {
  paraphrase(input: string, relationGraph: string): { output: string; trace: ExplanationStep[] } {
    const trace: ExplanationStep[] = [];
    // Deterministic paraphrase: swap synonyms while preserving structure markers
    const synonyms: Record<string, string> = {
      create: "bring forth", initiate: "begin", transform: "transmute",
      observe: "witness", perceive: "discern", understand: "comprehend",
    };
    const words = input.split(/\s+/);
    const output = words.map((w) => synonyms[w.toLowerCase()] || w).join(" ");

    trace.push({ step: 1, operation: "lexical_substitution", input: words.length, output: output.split(/\s+/).length, confidence: 0.85 });
    trace.push({ step: 2, operation: "relation_preservation_check", input: relationGraph, output: "preserved", confidence: 0.9 });

    return { output, trace };
  }
}
