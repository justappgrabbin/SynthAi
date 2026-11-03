import { promises as fs } from "node:fs";
import path from "node:path";
import { KleinMeshRuntime } from "../mesh/KleinMeshRuntime";
import { SourceRAG, RAGHit } from "../rag/SourceRAG";

export interface SynthiaAssignment {
  id: string;
  title: string;
  objective: string;
  instructions: string[];
  requiredEvidenceKinds: Array<"book" | "repository" | "github" | "instruction">;
  acceptanceTests: string[];
  outputDirectory: string;
}

export interface BuildProposal {
  assignmentId: string;
  createdAt: string;
  status: "proposal";
  retrievedEvidence: Array<{
    sourceId: string;
    location: string;
    checksum: string;
    score: number;
  }>;
  findings: string[];
  buildSteps: string[];
  acceptanceTests: string[];
  warning: string;
}

export class SynthiaMeshBuilder {
  constructor(
    readonly runtime: KleinMeshRuntime,
    readonly rag: SourceRAG
  ) {}

  async acceptAssignment(assignment: SynthiaAssignment): Promise<BuildProposal> {
    const queries = [
      assignment.objective,
      "generative mesh semantic triples ATO binary tools",
      "AUTOLING DISEMINER grammar paraphrase narrative validation",
      "shared learning provenance correction rollback",
    ];
    const evidence = deduplicate(
      queries.flatMap((query) => this.rag.search(query, 8))
    ).slice(0, 24);
    const kinds = new Set(evidence.map((hit) => hit.source.kind));
    const absent = assignment.requiredEvidenceKinds.filter((kind) => !kinds.has(kind));

    for (const hit of evidence) {
      await this.runtime.learn(
        "diseminer",
        "observation",
        summarize(hit.text),
        Math.min(0.95, 0.55 + hit.score / 100),
        [{
          sourceId: hit.sourceId,
          location: hit.location,
          checksum: hit.checksum,
          text: hit.text,
        }]
      );
    }

    const proposal: BuildProposal = {
      assignmentId: assignment.id,
      createdAt: new Date().toISOString(),
      status: "proposal",
      retrievedEvidence: evidence.map((hit) => ({
        sourceId: hit.sourceId,
        location: hit.location,
        checksum: hit.checksum,
        score: hit.score,
      })),
      findings: [
        `${evidence.length} source-grounded passages were retrieved.`,
        `${this.runtime.mesh.snapshot().tools.length} Klein organs share the learning mesh.`,
        absent.length
          ? `Required evidence still missing: ${absent.join(", ")}.`
          : "Every required evidence kind is represented.",
      ],
      buildSteps: [
        "Retrieve evidence for the requested capability.",
        "Let AUTOLING and Control of Grammar learn language and structural constraints.",
        "Let DISEMINER extract candidate semantic triples.",
        "Map accepted triples and transformations through ATO onto the mesh.",
        "Compose compatible input, transform, and output organs.",
        "Generate prose with AutoNovel and Paraphraser.",
        "Validate claims and generated modules against cited evidence.",
        "Run acceptance tests; preserve failed attempts and reversible revisions.",
      ],
      acceptanceTests: [...assignment.acceptanceTests],
      warning:
        "This proposal does not authorize silent source rewriting or untested promotion. Generated code must pass its tests before becoming an active mesh organ.",
    };

    await fs.mkdir(assignment.outputDirectory, { recursive: true });
    await fs.writeFile(
      path.join(assignment.outputDirectory, "build-proposal.json"),
      JSON.stringify(proposal, null, 2),
      "utf8"
    );
    await this.runtime.mesh.save(
      path.join(assignment.outputDirectory, "learning-mesh.json")
    );
    return proposal;
  }
}

function deduplicate(hits: RAGHit[]): RAGHit[] {
  return [...new Map(hits.map((hit) => [hit.id, hit])).values()].sort(
    (a, b) => b.score - a.score
  );
}

function summarize(text: string): string {
  const sentence = text.replace(/\s+/g, " ").trim().split(/(?<=[.!?])\s+/)[0];
  return sentence.slice(0, 500);
}
