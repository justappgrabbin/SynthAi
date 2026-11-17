import { SynthiaProcess } from 'synthia/vendor/processes-cleaned/src/runtime/SynthiaProcess.js';
import {
  CODON_MATRIX,
  GATE_TO_CODON,
  ELEMENTAL_BEHAVIOR,
  CLASSICAL_ELEMENTS,
  SUCCESS_CONTRIBUTIONS,
} from 'synthia/vendor/processes-cleaned/src/engine/CodonMatrix.js';

export class CodonProcess extends SynthiaProcess {
  constructor() {
    super({
      id: 'codon',
      kind: 'reference-computation',
      capabilities: ['codon.by-gate', 'codon.by-name', 'codon.coverage'],
      metadata: {
        authority: 'candidate-reference',
        warning: 'The inherited CodonMatrix is incomplete; coverage is exposed explicitly.',
      },
    });

    this.register('codon.by-gate', ({ gate }) => {
      const codonName = GATE_TO_CODON[gate] || null;
      return {
        gate,
        codonName,
        codon: codonName ? CODON_MATRIX[codonName] || null : null,
      };
    });

    this.register('codon.by-name', ({ name }) => ({
      name,
      codon: CODON_MATRIX[name] || null,
    }));

    this.register('codon.coverage', () => {
      const mapped = Object.keys(GATE_TO_CODON).map(Number).sort((a, b) => a - b);
      const missing = Array.from({ length: 64 }, (_, i) => i + 1).filter(g => !mapped.includes(g));
      return {
        mappedCount: mapped.length,
        mapped,
        missing,
        elementalBehavior: ELEMENTAL_BEHAVIOR,
        classicalElements: CLASSICAL_ELEMENTS,
        successContributions: SUCCESS_CONTRIBUTIONS,
      };
    });
  }
}

export default CodonProcess;
