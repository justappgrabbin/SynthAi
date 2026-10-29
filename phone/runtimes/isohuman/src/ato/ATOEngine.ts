import { FuxiEncoder } from "../topology/FuxiEncoder";
import { DimensionPerspective } from "../state/FiveSpaceState";
import { operatorBetween } from "./KleinStrongEquivalence";

export interface SemanticTerm {
  id: string;
  value: string;
  perspective: DimensionPerspective;
  statePattern: string;
}

export interface SemanticTriple {
  id: string;
  subject: SemanticTerm;
  relation: string;
  object: SemanticTerm;
}

export interface ATOOperation {
  id: string;
  triple: SemanticTriple;
  rootPattern: string;
  changedLines: Array<1 | 2 | 3 | 4 | 5 | 6>;
  preservedDimensions: string[];
  provenanceIds: string[];
}

export interface ATOResult {
  operationId: string;
  rootPattern: string;
  resultantPattern: string;
  operatorPattern: string;
  triple: SemanticTriple;
  changedLines: Array<1 | 2 | 3 | 4 | 5 | 6>;
  preservedDimensions: string[];
  reciprocal: ATOOperation;
}

export class ATOEngine {
  transform(operation: ATOOperation): ATOResult {
    FuxiEncoder.decodePattern(operation.rootPattern);
    const uniqueLines = [...new Set(operation.changedLines)].sort() as Array<
      1 | 2 | 3 | 4 | 5 | 6
    >;
    let resultantPattern = operation.rootPattern;
    for (const line of uniqueLines) {
      resultantPattern = FuxiEncoder.flipLine(
        resultantPattern,
        (line - 1) as 0 | 1 | 2 | 3 | 4 | 5
      );
    }

    const reciprocalTriple: SemanticTriple = {
      id: `${operation.triple.id}:reciprocal`,
      subject: operation.triple.object,
      relation: operation.triple.relation,
      object: operation.triple.subject,
    };
    const reciprocal: ATOOperation = {
      id: `${operation.id}:reciprocal`,
      triple: reciprocalTriple,
      rootPattern: resultantPattern,
      changedLines: uniqueLines,
      preservedDimensions: [...operation.preservedDimensions],
      provenanceIds: [...operation.provenanceIds],
    };

    return {
      operationId: operation.id,
      rootPattern: operation.rootPattern,
      resultantPattern,
      operatorPattern: operatorBetween(
        operation.rootPattern,
        resultantPattern
      ).code,
      triple: operation.triple,
      changedLines: uniqueLines,
      preservedDimensions: [...operation.preservedDimensions],
      reciprocal,
    };
  }

  reverse(result: ATOResult): ATOResult {
    return this.transform(result.reciprocal);
  }
}
