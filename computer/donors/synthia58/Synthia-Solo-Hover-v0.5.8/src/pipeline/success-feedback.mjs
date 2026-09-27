import { safe } from '../util.mjs';

export class SuccessFeedbackLoop {
  constructor({ engine, orchestrator, proposalLedger = null, toolSynthesizer = null, interval = 10 } = {}) {
    this.engine = engine;
    this.orchestrator = orchestrator;
    this.proposalLedger = proposalLedger;
    this.toolSynthesizer = toolSynthesizer;
    this.interval = interval;
    this.tasks = new Map();
    this.awayIntervals = new Map();
    this.history = [];
  }

  bindToolSynthesizer(toolSynthesizer) { this.toolSynthesizer = toolSynthesizer; return this; }

  #success() { return this.engine.mesh.get('success'); }

  #ensure(personId) {
    const success = this.#success();
    const existing = success.ownedState.people.get(personId);
    const required = ['goal_alignment', 'engagement', 'task_completion'];
    if (!existing || !required.every((id) => existing.purpose.indicators.some((indicator) => indicator.id === id))) {
      success.run({ operation: 'define', personId, purpose: {
        statement: 'Advance useful engagement and task completion.',
        indicators: [
          { id: 'goal_alignment', name: 'Goal alignment', direction: 'increase' },
          { id: 'engagement', name: 'Engagement', direction: 'increase' },
          { id: 'task_completion', name: 'Task completion', direction: 'increase' },
        ],
      } });
    }
  }

  inferChatScore(nextMessage) {
    const text = String(nextMessage ?? '');
    if (!text.trim()) return 0;
    if (/\b(confused|what do you mean|doesn't answer|wrong)\b/i.test(text)) return 0.2;
    if (/\?$/.test(text) && /\b(clarify|explain again)\b/i.test(text)) return 0.35;
    return 1;
  }

  async observe({ personId = 'default-person', indicatorId, score, pipeline, outcome = null } = {}) {
    this.#ensure(personId);
    const success = this.#success();
    const run = success.run({
      operation: 'observe', personId, indicatorId, value: Number(score),
      context: { source: 'success-feedback', pipeline, outcome: safe(outcome) },
    });
    const tasks = this.tasks.get(personId) ?? [];
    tasks.push({ indicatorId, score: Number(score), pipeline, progress: safe(run.output) });
    this.tasks.set(personId, tasks);
    const record = { personId, indicatorId, score: Number(score), pipeline, progress: safe(run.output), optimized: null };
    if (tasks.length % this.interval === 0) record.optimized = await this.optimize(personId, indicatorId);
    this.history.push(Object.freeze(safe(record)));
    return record;
  }

  async optimize(personId, indicatorId) {
    const success = this.#success();
    const progress = success.ownedState.progress(personId, indicatorId);
    const recent = (this.tasks.get(personId) ?? []).slice(-this.interval);
    const variants = {};
    for (const item of recent) {
      const key = Array.isArray(item.pipeline) ? item.pipeline.join('>') : String(item.pipeline ?? 'unknown');
      const value = progress.direction === 'away' ? Math.max(0.05, item.score) : Math.max(0.05, 0.5 + item.score);
      variants[key] = (variants[key] ?? 0) + value;
    }
    const monteCarlo = this.engine.mesh.get('historical-monte-carlo').run({
      variants,
      seed: recent.length + personId.length,
      mutationScale: 0.12,
      generations: 20,
    }).output;
    const successPatterns = recent.filter((item) => item.score >= 0.7).map((item) => ({ operands: [item.pipeline] }));
    const failurePatterns = recent.filter((item) => item.score < 0.7).map((item) => ({ operands: [item.pipeline] }));
    if (!this.proposalLedger) throw new Error('SuccessFeedbackLoop requires the governed self-modification outbox');
    const routingProposal = this.proposalLedger.append({
      flow: 'self',
      personId: null,
      kind: 'routing',
      observation: {
        source: 'success',
        chartContext: null,
        successSignal: { indicatorId, direction: progress.direction, rate: progress.rate },
        gapRecord: null,
      },
      proposedChange: {
        description: `Apply per-person routing weights learned for ${personId}`,
        target: 'o_sequence',
        editType: 'evolve_operator',
        spec: { operatorId: 'o_sequence', personId, weights: monteCarlo.finalWeights, successPatterns, failurePatterns },
      },
      reasoning: `The ${indicatorId} success trend is ${progress.direction}; preserve the learned pipeline preference as a reversible edit.`,
      confidence: 0.8,
      chartTiming: { appropriate: true, heldUntil: null, context: 'success feedback interval; no conflicting chart state supplied' },
    });
    const evolved = this.proposalLedger.accept(routingProposal.id, { actor: 'self', execute: true });
    const awayCount = progress.direction === 'away' ? (this.awayIntervals.get(`${personId}:${indicatorId}`) ?? 0) + 1 : 0;
    this.awayIntervals.set(`${personId}:${indicatorId}`, awayCount);
    let synthesis = null;
    if (awayCount >= 2) {
      const observed = this.engine.intent.observe({
        id: `success-away-${this.history.length + 1}`,
        primitives: [personId, indicatorId],
        operators: [],
        output: { ok: false },
        evaluation: { accepted: false },
      }, { source: 'success-feedback', direction: 'away' });
      synthesis = await this.toolSynthesizer?.checkTrigger({ intentType: observed.intent?.type ?? 'resolve_error' });
    }
    return { progress, variants, monteCarlo, evolved, routingProposal: evolved.proposal, awayCount, synthesis };
  }
}

export default SuccessFeedbackLoop;
