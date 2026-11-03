/**
 * Goal -> candidate -> real executor -> evaluator -> feedback -> retry.
 * Adapted from the user's Prompt-based-Evolutionary-Neural-Iteration-System
 * archive (2026-10-27); deliberately separates this reusable mechanism from
 * the donor's adult video-specific prompts, model providers and media assets.
 * This is an optimization loop, NOT a neural network or autonomous tool agent.
 * No model/API/process is invoked except explicit caller-supplied callbacks.
 * Evaluator claims are recorded as observations, not proven hypotheses.
 */
const copy = value => structuredClone(value);
const runIdRule = /^[a-zA-Z0-9][\w-]{0,79}$/;

export class EvolutionaryIteration {
  constructor({ bus = null, state = null } = {}) {
    this.bus = bus;
    this.state = state;
    this.runs = new Map();
  }

  async optimize({ id, goal, requirements, propose, execute, evaluate,
                   maxIterations = 5, successThreshold = 1 } = {}) {
    if (typeof id !== 'string' || !runIdRule.test(id)) throw new TypeError('An explicit safe run ID is required.');
    if (this.runs.has(id)) throw new Error('Run ID already exists: ' + id);
    if (typeof goal !== 'string' || !goal.trim() || goal.length > 12000) throw new TypeError('A bounded goal is required.');
    if (!Array.isArray(requirements) || !requirements.length || requirements.length > 64 ||
        requirements.some(r => !r || typeof r.id !== 'string' || !runIdRule.test(r.id) ||
          typeof r.description !== 'string' || !r.description.trim()) ||
        new Set(requirements.map(r => r.id)).size !== requirements.length)
      throw new TypeError('Requirements must have unique IDs and descriptions.');
    if (![propose, execute, evaluate].every(f => typeof f === 'function'))
      throw new TypeError('Explicit propose, execute, and evaluate callbacks are required.');
    if (!Number.isInteger(maxIterations) || maxIterations < 1 || maxIterations > 20)
      throw new RangeError('maxIterations must be 1..20.');
    if (typeof successThreshold !== 'number' || !Number.isFinite(successThreshold) ||
        successThreshold <= 0 || successThreshold > 1)
      throw new RangeError('successThreshold must be in (0,1].');

    const job = { id, goal, requirements: copy(requirements), status: 'running',
      success: false, iterations: [], createdAt: new Date().toISOString() };
    this.runs.set(id, job);
    this.bus?.emit('evolutionary:started', { id, goal });
    try {
      for (let attempt = 1; attempt <= maxIterations; attempt++) {
        const context = { id, goal, requirements: copy(job.requirements),
          iteration: attempt, history: copy(job.iterations) };
        const candidate = await propose(context);
        if (candidate === undefined || candidate === null) throw new Error('Proposer returned no candidate');
        // The caller's executor owns all side-effect authorization and resource limits.
        const output = await execute(copy(candidate), { id, iteration: attempt, goal });
        const rating = await evaluate({ ...context, candidate: copy(candidate), output: copy(output) });
        if (!rating || typeof rating !== 'object' || !rating.checks || typeof rating.checks !== 'object')
          throw new TypeError('Evaluator must return checks for each requirement');
        const checks = {};
        for (const requirement of requirements) {
          const value = rating.checks[requirement.id];
          if (typeof value !== 'boolean') throw new TypeError('Evaluator omitted a boolean check: ' + requirement.id);
          checks[requirement.id] = value;
        }
        const computed = Object.values(checks).filter(Boolean).length / requirements.length;
        const score = rating.score === undefined ? computed : rating.score;
        if (typeof score !== 'number' || !Number.isFinite(score) || score < 0 || score > 1)
          throw new TypeError('Evaluation score must be between 0 and 1');
        const passed = Object.values(checks).every(Boolean) && score >= successThreshold;
        const entry = { iteration: attempt, candidate: copy(candidate),
          output: copy(output), score, checks, notes: String(rating.notes ?? '').slice(0, 4000),
          passed, evidenceClass: 'observation' };
        job.iterations.push(entry);
        job.success = passed;
        this.bus?.emit('evolutionary:observed', { id, iteration: attempt, passed, score });
        if (this.state) await this.state.set(`computer.evolutionary.${id}`, copy(job), { source: 'evolutionary-iteration' });
        if (passed) break;
      }
      job.status = job.success ? 'accepted-by-evaluator' : 'iteration-limit-reached';
      this.bus?.emit('evolutionary:finished', { id, status: job.status, iterations: job.iterations.length });
      if (this.state) await this.state.set(`computer.evolutionary.${id}`, copy(job), { source: 'evolutionary-iteration' });
      return copy(job);
    } catch (error) {
      job.status = 'failed';
      job.error = String(error?.message ?? error);
      this.bus?.emit('evolutionary:failed', { id, error: job.error });
      if (this.state) await this.state.set(`computer.evolutionary.${id}`, copy(job), { source: 'evolutionary-iteration' });
      throw error;
    }
  }

  get(id) { return this.runs.has(id) ? copy(this.runs.get(id)) : null; }
}
