// Each Synthia process owns its own local state, memory, evidence, and history.
// There is intentionally no global semantic brain.

export class ProcessMind {
  constructor(processId, { initialState = {}, metadata = {} } = {}) {
    if (!processId) throw new TypeError('ProcessMind requires a processId.');
    this.processId = processId;
    this.state = { ...initialState };
    this.memory = new Map();
    this.evidence = [];
    this.history = [];
    this.goals = [];
    this.metadata = { ...metadata };
  }

  setState(patch = {}, reason = 'update') {
    const previous = { ...this.state };
    this.state = { ...this.state, ...patch };
    this.history.push({
      kind: 'state-change',
      timestamp: Date.now(),
      reason,
      previous,
      next: { ...this.state },
    });
    return this.state;
  }

  remember(key, value, provenance = 'runtime') {
    if (!key) throw new TypeError('remember() requires a key.');
    const record = {
      key,
      value,
      provenance,
      timestamp: Date.now(),
    };
    this.memory.set(key, record);
    this.history.push({ kind: 'memory', ...record });
    return record;
  }

  recall(key) {
    return this.memory.get(key)?.value;
  }

  observe(observation) {
    const record = {
      ...observation,
      timestamp: observation?.timestamp ?? Date.now(),
    };
    this.evidence.push(record);
    this.history.push({ kind: 'observation', ...record });
    return record;
  }

  addGoal(goal) {
    const record = {
      id: goal?.id ?? `${this.processId}:goal:${this.goals.length + 1}`,
      ...goal,
      createdAt: goal?.createdAt ?? Date.now(),
    };
    this.goals.push(record);
    return record;
  }

  snapshot() {
    return {
      processId: this.processId,
      state: { ...this.state },
      memory: Array.from(this.memory.entries()),
      evidence: [...this.evidence],
      history: [...this.history],
      goals: [...this.goals],
      metadata: { ...this.metadata },
    };
  }

  restore(snapshot = {}) {
    if (snapshot.processId && snapshot.processId !== this.processId) {
      throw new Error(`Cannot restore ${snapshot.processId} into ${this.processId}.`);
    }
    this.state = { ...(snapshot.state || {}) };
    this.memory = new Map(snapshot.memory || []);
    this.evidence = [...(snapshot.evidence || [])];
    this.history = [...(snapshot.history || [])];
    this.goals = [...(snapshot.goals || [])];
    this.metadata = { ...(snapshot.metadata || {}) };
  }
}

export default ProcessMind;
