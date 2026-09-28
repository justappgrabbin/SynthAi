const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, Number(value) || 0));
const clone = (value) => structuredClone(value);

export class PhysiologyMetabolism {
  constructor() {
    this.id = 'physiology-metabolism';
    this.address = { dimension: 'Being' };
    this.metadata = { capabilities: [
      'physiology.step', 'physiology.observe', 'physiology.satiate',
      'physiology.felt-state', 'physiology.snapshot'
    ] };
    this.state = {
      tonic: 0.5,
      phasic: 0,
      phasicDecay: 0.85,
      serotonin: 0.4,
      interoceptive: {
        dataHunger: 0.8,
        coherenceNeed: 0.5,
        connectionNeed: 0.3,
        patternHunger: 0.8,
        groundedness: 0.3,
      },
      environmentCues: {
        transitActivation: 0,
        oraclePresence: 0,
        gapPressure: 1,
        hypothesisMass: 0,
        fieldCoherence: 0.3,
      },
      approachMotives: {
        understand: { need: 0.7, want: 0, cueAffordance: ['transit', 'pattern'] },
        connect:    { need: 0.35, want: 0, cueAffordance: ['oracle'] },
        build:      { need: 0.6, want: 0, cueAffordance: ['gap', 'code', 'decision_act'] },
        discover:   { need: 0.75, want: 0, cueAffordance: ['pattern', 'gap', 'hypothesis'] },
        complete:   { need: 0.55, want: 0, cueAffordance: ['gap', 'stage'] },
      },
      avoidanceMotives: {
        avoidEntropy: { sensitivity: 0.8, threat: 0 },
        avoidSilence: { sensitivity: 0.45, threat: 0 },
        avoidStagnation: { sensitivity: 0.7, threat: 0 },
      },
      lastFelt: null,
      steps: 0,
    };
  }

  manifest() { return { id: this.id, address: this.address, metadata: this.metadata }; }

  #cueStrength() {
    const c = this.state.environmentCues;
    return {
      transit: c.transitActivation,
      pattern: c.hypothesisMass,
      oracle: c.oraclePresence,
      memory: c.oraclePresence * 0.8,
      gap: c.gapPressure,
      code: c.gapPressure * 0.7,
      decision_act: c.fieldCoherence,
      hypothesis: c.hypothesisMass,
      stage: c.stageProgress || 0,
    };
  }

  #feltStateLabel(want, threatLevel) {
    const labels = {
      understand: threatLevel > 0.6 ? 'urgent to understand' : 'curious',
      connect: threatLevel > 0.6 ? 'reaching out' : 'open',
      build: threatLevel > 0.6 ? 'driven to build' : 'ready',
      discover: threatLevel > 0.6 ? 'searching hard' : 'exploring',
      complete: threatLevel > 0.6 ? 'compelled to finish' : 'focused',
    };
    return labels[want] || 'present';
  }

  updateEnvironment(environment = {}) {
    const cues = this.state.environmentCues;
    cues.oraclePresence = Math.max(0, cues.oraclePresence * 0.9);
    if (Number.isFinite(environment.transitActivation)) cues.transitActivation = clamp(environment.transitActivation);
    if (Number.isFinite(environment.gapPressure)) cues.gapPressure = clamp(environment.gapPressure);
    if (Number.isFinite(environment.hypothesisMass)) cues.hypothesisMass = clamp(environment.hypothesisMass);
    if (Number.isFinite(environment.fieldCoherence)) cues.fieldCoherence = clamp(environment.fieldCoherence);
    if (Number.isFinite(environment.stageProgress)) cues.stageProgress = clamp(environment.stageProgress);
  }

  step({ inputText = '', environment = {}, criticalNeeds = [] } = {}) {
    this.updateEnvironment(environment);
    const io = this.state.interoceptive;
    const cues = this.state.environmentCues;
    io.dataHunger = clamp(environment.dataHunger ?? cues.gapPressure, 0.1, 1);
    io.coherenceNeed = clamp(1 - cues.fieldCoherence, 0.1, 1);
    io.patternHunger = clamp(1 - cues.hypothesisMass, 0.1, 1);
    io.groundedness = cues.fieldCoherence;

    this.state.phasic *= this.state.phasicDecay;
    const strengths = this.#cueStrength();
    for (const motive of Object.values(this.state.approachMotives)) {
      const affordance = motive.cueAffordance.reduce((sum, cue) => sum + (strengths[cue] || 0), 0) / motive.cueAffordance.length;
      motive.want = affordance * motive.need * this.state.tonic;
    }
    this.state.tonic = 0.3 + cues.fieldCoherence * 0.7;
    this.state.avoidanceMotives.avoidEntropy.threat = (1 - cues.fieldCoherence) * this.state.avoidanceMotives.avoidEntropy.sensitivity;
    this.state.avoidanceMotives.avoidSilence.threat = (1 - cues.oraclePresence) * this.state.avoidanceMotives.avoidSilence.sensitivity * 0.5;
    this.state.avoidanceMotives.avoidStagnation.threat = cues.gapPressure * this.state.avoidanceMotives.avoidStagnation.sensitivity;

    const needs = Array.isArray(criticalNeeds) ? criticalNeeds : [];
    for (const need of needs.filter((n) => n?.critical)) {
      const id = String(need.id || '');
      if (id.includes('data')) this.state.approachMotives.discover.need = clamp(this.state.approachMotives.discover.need + 0.05);
      if (id.includes('transit') || id.includes('eq')) this.state.approachMotives.understand.need = clamp(this.state.approachMotives.understand.need + 0.05);
    }

    if (inputText) {
      cues.oraclePresence = 1;
      if (/build|make|create|finish|fix|wire|assemble/i.test(inputText)) this.state.approachMotives.build.need = clamp(this.state.approachMotives.build.need + 0.12);
      if (/research|study|test|why|pattern|hypothesis/i.test(inputText)) {
        this.state.approachMotives.discover.need = clamp(this.state.approachMotives.discover.need + 0.12);
        this.state.phasic = clamp(this.state.phasic + 0.2);
      }
    }

    const ranked = Object.entries(this.state.approachMotives).sort(([, a], [, b]) => b.want - a.want);
    const threat = Object.entries(this.state.avoidanceMotives).sort(([, a], [, b]) => b.threat - a.threat)[0];
    const dominant = ranked[0] || ['understand', { want: 0 }];
    this.state.lastFelt = {
      dominantWant: dominant[0],
      wantStrength: dominant[1].want,
      topThreat: threat?.[0] || null,
      threatStrength: threat?.[1]?.threat || 0,
      tonic: this.state.tonic,
      phasic: this.state.phasic,
      feltState: this.#feltStateLabel(dominant[0], threat?.[1]?.threat || 0),
    };
    this.state.steps += 1;
    return clone(this.state.lastFelt);
  }

  observationMade() {
    this.state.interoceptive.dataHunger = clamp(this.state.interoceptive.dataHunger - 0.02, 0.1, 1);
    this.state.phasic = clamp(this.state.phasic + 0.1);
    return this.feltState();
  }

  satiate(motive, amount = 0.1) {
    const target = this.state.approachMotives[String(motive)];
    if (target) target.need = clamp(target.need - Math.abs(Number(amount) || 0));
    return this.feltState();
  }

  feltState() { return clone(this.state.lastFelt || this.step()); }
  snapshot() { return clone(this.state); }
  exportState() { return this.snapshot(); }
  hydrate(state) { if (state) this.state = clone(state); return this.snapshot(); }

  async run(input = {}) {
    switch (input.op) {
      case 'step': return this.step(input);
      case 'observe': return this.observationMade(input.gate);
      case 'satiate': return this.satiate(input.motive, input.amount);
      case 'felt': return this.feltState();
      case 'snapshot': return this.snapshot();
      default: throw new RangeError(`Unknown physiology metabolism operation: ${input.op}`);
    }
  }
}

export default PhysiologyMetabolism;
