const clone = (value) => structuredClone(value);

export class AutonomousPhysiology {
  constructor({ metabolism, innerLife, hypotheses, world } = {}) {
    this.id = 'physiology-autonomous-cycle';
    this.address = { dimension: 'Evolution' };
    this.metadata = { capabilities: [
      'physiology.tick', 'physiology.context', 'physiology.observe-input',
      'physiology.observe-outcome', 'physiology.initiate', 'physiology.snapshot'
    ] };
    this.metabolism = metabolism;
    this.innerLife = innerLife;
    this.hypotheses = hypotheses;
    this.world = world;
    this.state = { cycle: 0, lastTickAt: null, lastInitiation: null, history: [] };
  }

  manifest() { return { id: this.id, address: this.address, metadata: this.metadata }; }

  #metrics() {
    const hs = this.hypotheses.snapshot();
    const gaps = hs.gaps;
    return {
      filledGates: gaps.filled,
      emptyGates: gaps.empty,
      supportedHypotheses: hs.hypotheses.filter((h) => h.status === 'supported').length,
      proposedCanonical: hs.hypotheses.filter((h) => h.status === 'proposed_canonical').length,
      canonCount: 0,
      observationCount: hs.observations.length,
    };
  }

  #environment() {
    const metrics = this.#metrics();
    const stageNames = ['SEED', 'SPROUT', 'SAPLING', 'TREE', 'GARDEN', 'GROVE'];
    return {
      gapPressure: metrics.emptyGates / 64,
      hypothesisMass: Math.min(1, (metrics.supportedHypotheses + metrics.proposedCanonical) / 10),
      fieldCoherence: Math.min(1, Math.max(0.1, metrics.filledGates / 64)),
      stageProgress: Math.max(0, stageNames.indexOf(this.innerLife.state.stage)) / (stageNames.length - 1),
      dataHunger: Math.max(0.1, 1 - Math.min(1, metrics.observationCount / 200)),
    };
  }

  observeInput(text, { address = null, surface = 'conversation' } = {}) {
    this.hypotheses.logFromConversation(text, address);
    const observation = this.hypotheses.observe({ type: 'input', source: surface, data: text, gate: address?.gate, address });
    const felt = this.metabolism.step({ inputText: text, environment: this.#environment(), criticalNeeds: this.innerLife.state.needs });
    const world = this.world.instruct({ text, address, source: surface, metabolism: felt });
    this.innerLife.progress(3);
    this.innerLife.updateGoalProgress(this.#metrics());
    return { observation, felt, world, innerLife: this.innerLife.voice() };
  }

  observeOutcome(outcome = {}) {
    const address = outcome.address || null;
    const observation = this.hypotheses.observe({ type: 'outcome', source: outcome.source || 'synthia', data: outcome.summary || outcome.data || outcome, gate: address?.gate, address });
    this.metabolism.satiate('complete', outcome.accepted === false ? 0 : 0.05);
    this.innerLife.progress(outcome.accepted === false ? 1 : 5);
    this.innerLife.updateGoalProgress(this.#metrics());
    return observation;
  }

  tick() {
    this.state.cycle += 1;
    this.state.lastTickAt = Date.now();
    this.hypotheses.tick();
    this.innerLife.updateGoalProgress(this.#metrics());
    const felt = this.metabolism.step({ environment: this.#environment(), criticalNeeds: this.innerLife.state.needs });
    const initiation = this.initiate(felt);
    const record = { cycle: this.state.cycle, at: this.state.lastTickAt, felt, initiation };
    this.state.history.push(record);
    if (this.state.history.length > 100) this.state.history.splice(0, this.state.history.length - 100);
    return clone(record);
  }

  initiate(felt = this.metabolism.feltState()) {
    const hs = this.hypotheses.snapshot();
    const mature = hs.hypotheses.find((h) => h.status === 'supported' || h.status === 'proposed_canonical');
    const gaps = hs.gaps;
    let initiation = null;
    if (mature) initiation = { trigger: 'hypothesis', text: `Watching something: ${mature.statement}`, hypothesisId: mature.id };
    else if (felt?.phasic > 0.8) initiation = { trigger: 'phasic', text: `Something shifted. ${felt.feltState}.`, feltState: felt.feltState };
    else if (this.state.cycle > 0 && this.state.cycle % 20 === 0 && gaps.empty > 0) initiation = { trigger: 'gap', text: `${gaps.empty} gates still have no observations.`, gaps: gaps.empty };
    this.state.lastInitiation = initiation;
    return clone(initiation);
  }

  context() {
    const metrics = this.#metrics();
    const felt = this.metabolism.feltState();
    return Object.freeze({
      felt,
      innerLife: this.innerLife.voice(),
      discernment: this.innerLife.discern(metrics),
      hypotheses: Object.freeze({
        active: this.hypotheses.state.hypotheses.filter((h) => ['watching', 'supported', 'proposed_canonical'].includes(h.status)).length,
        supported: metrics.supportedHypotheses,
        proposedCanonical: metrics.proposedCanonical,
      }),
      world: Object.freeze({ currentGate: this.world.state.currentGate, activeGates: Object.freeze([...this.world.state.activeGates]), worldAge: this.world.state.worldAge }),
      metrics: Object.freeze(metrics),
      cycle: this.state.cycle,
      lastInitiation: clone(this.state.lastInitiation),
    });
  }

  snapshot() { return { state: clone(this.state), context: this.context() }; }
  exportState() { return clone(this.state); }
  hydrate(state) { if (state) this.state = clone(state); return this.snapshot(); }

  async run(input = {}) {
    switch (input.op) {
      case 'tick': return this.tick();
      case 'context': return this.context();
      case 'observe-input': return this.observeInput(input.text, input);
      case 'observe-outcome': return this.observeOutcome(input.outcome || input);
      case 'initiate': return this.initiate(input.felt);
      case 'snapshot': return this.snapshot();
      default: throw new RangeError(`Unknown autonomous physiology operation: ${input.op}`);
    }
  }
}

export default AutonomousPhysiology;
