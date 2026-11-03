// ============================================================================
// Meaning Pruner — Remove weak or conflicting associations
// ============================================================================
import { SemanticItem, SemanticField, SemanticRevision } from "../models";

export class MeaningPruner {
  prune(field: SemanticField, threshold: number = 0.15): { field: SemanticField; revisions: SemanticRevision[] } {
    const revisions: SemanticRevision[] = [];
    const allArrays: Array<SemanticItem[]> = [field.center, field.central, field.peripheral];

    for (const arr of allArrays) {
      for (let i = arr.length - 1; i >= 0; i--) {
        const item = arr[i];
        if (item.confidence < threshold) {
          const prevWeight = item.weight;
          item.weight = 0;
          item.status = "rejected";
          field.rejected.push(item);
          arr.splice(i, 1);
          revisions.push({
            id: `rev-${Date.now()}-${Math.random().toString(36).slice(2)}`,
            semanticItemId: item.id,
            previousWeight: prevWeight,
            newWeight: 0,
            reason: `Confidence ${item.confidence.toFixed(3)} below threshold ${threshold}`,
            evidenceIds: item.sourceIds,
            timestamp: new Date().toISOString(),
          });
        }
      }
    }
    return { field, revisions };
  }
}
