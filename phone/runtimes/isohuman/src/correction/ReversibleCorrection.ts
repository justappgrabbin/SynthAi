import {
  KnowledgeCandidate,
  LearningRevision,
  SharedLearningMemory,
} from "../memory/SharedLearningMemory";

export type CorrectionDecision = "approve" | "reject" | "supersede";

export interface CorrectionRequest {
  candidateId: string;
  decision: CorrectionDecision;
  reason: string;
  replacement?: KnowledgeCandidate;
}

export class ReversibleCorrection {
  constructor(private readonly memory: SharedLearningMemory) {}

  apply(request: CorrectionRequest): LearningRevision {
    const previous = this.requireCandidate(request.candidateId);
    const next: KnowledgeCandidate = request.replacement
      ? {
          ...structuredClone(request.replacement),
          id: previous.id,
          revision: previous.revision + 1,
        }
      : {
          ...previous,
          status:
            request.decision === "approve"
              ? "approved"
              : request.decision === "reject"
                ? "rejected"
                : "superseded",
          revision: previous.revision + 1,
        };

    const revision: LearningRevision = {
      id: `revision:${previous.id}:${next.revision}`,
      candidateId: previous.id,
      previous,
      next,
      reason: request.reason,
      createdAt: new Date().toISOString(),
    };
    this.memory.replaceCandidate(next);
    this.memory.recordRevision(revision);
    return revision;
  }

  rollback(revisionId: string, reason: string): LearningRevision {
    const original = this.memory.getRevision(revisionId);
    if (!original) throw new Error(`Unknown revision ${revisionId}`);
    const current = this.requireCandidate(original.candidateId);
    const restored: KnowledgeCandidate = {
      ...structuredClone(original.previous),
      revision: current.revision + 1,
    };
    const rollback: LearningRevision = {
      id: `revision:${current.id}:${restored.revision}`,
      candidateId: current.id,
      previous: current,
      next: restored,
      reason,
      createdAt: new Date().toISOString(),
      reversedRevisionId: revisionId,
    };
    this.memory.replaceCandidate(restored);
    this.memory.recordRevision(rollback);
    return rollback;
  }

  private requireCandidate(id: string): KnowledgeCandidate {
    const candidate = this.memory.getCandidate(id);
    if (!candidate) throw new Error(`Unknown candidate ${id}`);
    return candidate;
  }
}

