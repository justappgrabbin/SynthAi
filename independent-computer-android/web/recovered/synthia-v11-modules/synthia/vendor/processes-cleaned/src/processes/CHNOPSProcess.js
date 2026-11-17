import { SynthiaProcess } from 'synthia/vendor/processes-cleaned/src/runtime/SynthiaProcess.js';
import {
  computeCHNOPS,
  computeResonance,
  computePurposeVector,
  detectDeviation,
} from 'synthia/vendor/processes-cleaned/src/engine/CHNOPS.js';

export class CHNOPSProcess extends SynthiaProcess {
  constructor() {
    super({
      id: 'chnops',
      kind: 'computation',
      capabilities: [
        'chnops.compute',
        'chnops.resonance',
        'chnops.purpose',
        'chnops.deviation',
      ],
      metadata: {
        authority: 'local-process',
        note: 'Owns CHNOPS calculations only; it is not a global brain.',
      },
    });

    this.register('chnops.compute', ({ gates, normalization = 'softmax' }) => {
      const result = computeCHNOPS(gates, normalization);
      this.mind.remember(`compute:${this.mind.history.length}`, { gates, result }, 'chnops.compute');
      return result;
    });

    this.register('chnops.resonance', ({ vectorA, vectorB }) =>
      computeResonance(vectorA, vectorB));

    this.register('chnops.purpose', ({ triadA, triadB }) =>
      computePurposeVector(triadA, triadB));

    this.register('chnops.deviation', ({ currentVector, purposeVector }) =>
      detectDeviation(currentVector, purposeVector));
  }
}

export default CHNOPSProcess;
