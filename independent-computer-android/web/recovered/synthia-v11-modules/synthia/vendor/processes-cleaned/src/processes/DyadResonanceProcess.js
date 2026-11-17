import { SynthiaProcess } from 'synthia/vendor/processes-cleaned/src/runtime/SynthiaProcess.js';
import { AutopoeticTriad } from 'synthia/vendor/processes-cleaned/src/engine/AutopoeticTriad.js';

export class DyadResonanceProcess extends SynthiaProcess {
  constructor({ dyadProfile = null, layerMapping = null } = {}) {
    super({
      id: 'dyad-resonance',
      kind: 'composite-process',
      capabilities: [
        'dyad.awaken',
        'dyad.calculate',
        'dyad.teach',
        'dyad.success',
        'dyad.complementarity.update',
        'dyad.science.data',
        'dyad.science.paper',
        'dyad.science.record',
        'dyad.complementarity.recommend',
        'dyad.state.export',
        'dyad.state.import',
      ],
      metadata: {
        authority: 'local-composite-process',
        warning: 'Composite donor process; not the Synthia brain and not authoritative over peer processes.',
      },
    });

    this.engine = new AutopoeticTriad(dyadProfile, { layerMapping });

    this.register('dyad.awaken', () => this.engine.awaken());
    this.register('dyad.calculate', ({ personA, personB, currentDate }) =>
      this.engine.calculateDyad(personA, personB, currentDate ? new Date(currentDate) : new Date()));
    this.register('dyad.teach', ({ text, source }) => this.engine.teach(text, source));
    this.register('dyad.success', ({ event }) => this.engine.recordDyadSuccess(event));
    this.register('dyad.complementarity.update', ({ person, need, value }) =>
      this.engine.updateComplementaryNeeds(person, need, value));
    this.register('dyad.science.data', () => this.engine.getScienceModeData());
    this.register('dyad.science.paper', () => this.engine.generateSciencePaper());
    this.register('dyad.science.record', ({ hypothesisId, results }) =>
      this.engine.recordExperimentResults(hypothesisId, results));
    this.register('dyad.complementarity.recommend', () => this.engine.getComplementaryRecommendations());
    this.register('dyad.state.export', () => this.engine.exportState());
    this.register('dyad.state.import', ({ state }) => this.engine.importState(state));
  }
}

export default DyadResonanceProcess;
