import { ProcessMesh } from 'synthia/vendor/processes-cleaned/src/runtime/ProcessMesh.js';

// Public façade over a field of autonomous processes.
// It intentionally contains no semantic/cognitive model of its own.
export class SynthiaProcessField {
  constructor({ mesh = null } = {}) {
    this.mesh = mesh || new ProcessMesh();
  }

  register(process) {
    this.mesh.register(process);
    return this;
  }

  getProcess(id) {
    return this.mesh.get(id);
  }

  listProcesses() {
    return this.mesh.list();
  }

  async request(to, type, payload = {}) {
    return this.mesh.request({ from: 'interface', to, type, payload });
  }

  // Compatibility surface for the inherited React UI. These methods route to a process;
  // they are not evidence of a single central agent.
  get dyadProcess() {
    const process = this.getProcess('dyad-resonance');
    if (!process) throw new Error('dyad-resonance process is not registered.');
    return process;
  }

  get aspiration() {
    return this.dyadProcess.engine.aspiration;
  }

  get meta() {
    return this.dyadProcess.engine.meta;
  }

  get ephemeris() {
    return this.dyadProcess.engine.ephemeris;
  }

  async awaken() {
    return this.request('dyad-resonance', 'dyad.awaken');
  }

  async calculateDyad(personA, personB, currentDate = new Date()) {
    return this.request('dyad-resonance', 'dyad.calculate', { personA, personB, currentDate });
  }

  async teach(text, source) {
    return this.request('dyad-resonance', 'dyad.teach', { text, source });
  }

  recordDyadSuccess(event) {
    return this.request('dyad-resonance', 'dyad.success', { event });
  }

  updateComplementaryNeeds(person, need, value) {
    return this.request('dyad-resonance', 'dyad.complementarity.update', { person, need, value });
  }

  getScienceModeData() {
    return this.dyadProcess.engine.getScienceModeData();
  }

  generateSciencePaper() {
    return this.dyadProcess.engine.generateSciencePaper();
  }

  recordExperimentResults(hypothesisId, results) {
    return this.dyadProcess.engine.recordExperimentResults(hypothesisId, results);
  }

  getComplementaryRecommendations() {
    return this.dyadProcess.engine.getComplementaryRecommendations();
  }

  exportState() {
    return {
      architecture: 'process-of-processes',
      exportedAt: Date.now(),
      processStates: [...this.mesh.processes.values()].map(process => process.snapshot()),
      dyadLegacyState: this.dyadProcess.engine.exportState(),
    };
  }

  importState(state) {
    if (state?.dyadLegacyState) {
      this.dyadProcess.engine.importState(state.dyadLegacyState);
    } else if (state?.aspiration || state?.ephemeris || state?.meta) {
      // Accept an older AutopoeticTriad export without forcing migration first.
      this.dyadProcess.engine.importState(state);
    }

    for (const processState of state?.processStates || []) {
      const process = this.getProcess(processState.id);
      if (process?.mind && processState.mind) process.mind.restore(processState.mind);
    }
  }
}

export default SynthiaProcessField;
