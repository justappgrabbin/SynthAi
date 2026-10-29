import { ATOResult, SemanticTriple } from "../ato/ATOEngine";

export interface SourceObservation {
  id: string;
  sourceId: string;
  sourceLocation: string;
  originalText: string;
  checksum: string;
  observedAt: string;
}

export interface NormalizationProposal {
  id: string;
  observationId: string;
  normalizedText: string;
  confidence: number;
  reason: string;
  autolingVersion: string;
  status: "proposed" | "approved" | "rejected" | "superseded";
}

export interface KnowledgeCandidate {
  id: string;
  triple: SemanticTriple;
  observationIds: string[];
  normalizationIds: string[];
  confidence: number;
  status: "candidate" | "approved" | "rejected" | "superseded";
  atoResult?: ATOResult;
  revision: number;
}

export interface LearningRevision {
  id: string;
  candidateId: string;
  previous: KnowledgeCandidate;
  next: KnowledgeCandidate;
  reason: string;
  createdAt: string;
  reversedRevisionId?: string;
}

export interface LearningSnapshot {
  observations: SourceObservation[];
  normalizations: NormalizationProposal[];
  candidates: KnowledgeCandidate[];
  revisions: LearningRevision[];
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

export class SharedLearningMemory {
  private observations = new Map<string, SourceObservation>();
  private normalizations = new Map<string, NormalizationProposal>();
  private candidates = new Map<string, KnowledgeCandidate>();
  private revisions: LearningRevision[] = [];

  recordObservation(observation: SourceObservation): void {
    const existing = this.observations.get(observation.id);
    if (existing && JSON.stringify(existing) !== JSON.stringify(observation)) {
      throw new Error(`Source observation ${observation.id} is immutable`);
    }
    this.observations.set(observation.id, clone(observation));
  }

  proposeNormalization(proposal: NormalizationProposal): void {
    if (!this.observations.has(proposal.observationId)) {
      throw new Error(`Unknown observation ${proposal.observationId}`);
    }
    this.normalizations.set(proposal.id, clone(proposal));
  }

  addCandidate(candidate: KnowledgeCandidate): void {
    for (const observationId of candidate.observationIds) {
      if (!this.observations.has(observationId)) {
        throw new Error(`Unknown observation ${observationId}`);
      }
    }
    this.candidates.set(candidate.id, clone(candidate));
  }

  getCandidate(id: string): KnowledgeCandidate | undefined {
    const candidate = this.candidates.get(id);
    return candidate ? clone(candidate) : undefined;
  }

  replaceCandidate(candidate: KnowledgeCandidate): void {
    if (!this.candidates.has(candidate.id)) {
      throw new Error(`Unknown candidate ${candidate.id}`);
    }
    this.candidates.set(candidate.id, clone(candidate));
  }

  recordRevision(revision: LearningRevision): void {
    this.revisions.push(clone(revision));
  }

  getRevision(id: string): LearningRevision | undefined {
    const revision = this.revisions.find((item) => item.id === id);
    return revision ? clone(revision) : undefined;
  }

  approvedKnowledge(): KnowledgeCandidate[] {
    return [...this.candidates.values()]
      .filter((candidate) => candidate.status === "approved")
      .map(clone);
  }

  snapshot(): LearningSnapshot {
    return {
      observations: [...this.observations.values()].map(clone),
      normalizations: [...this.normalizations.values()].map(clone),
      candidates: [...this.candidates.values()].map(clone),
      revisions: this.revisions.map(clone),
    };
  }

  restore(snapshot: LearningSnapshot): void {
    this.observations = new Map(
      snapshot.observations.map((item) => [item.id, clone(item)])
    );
    this.normalizations = new Map(
      snapshot.normalizations.map((item) => [item.id, clone(item)])
    );
    this.candidates = new Map(
      snapshot.candidates.map((item) => [item.id, clone(item)])
    );
    this.revisions = snapshot.revisions.map(clone);
  }
}

