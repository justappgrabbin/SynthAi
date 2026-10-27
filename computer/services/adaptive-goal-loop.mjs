/**
 * Proposal-only adaptive decision cycle based on the user's
 * adaptive-agent-main.zip architecture: observe -> evaluate -> select ->
 * explicit owner feedback. Deliberately NO executor or destructive actions.
 */
const KEY = 'computer.adaptive.goal-feedback.v1';
const copy = x => JSON.parse(JSON.stringify(x));
const numeric = (x, name) => {
  if (typeof x !== 'number' || !Number.isFinite(x) || Math.abs(x) > 1e9)
    throw new TypeError(name + ' must be a bounded finite number');
  return x;
};
function validateMetrics(metrics) {
  if (!metrics || typeof metrics !== 'object' || Array.isArray(metrics)) throw new TypeError('Metrics object required');
  const entries = Object.entries(metrics);
  if (entries.length > 32) throw new RangeError('Too many metrics');
  for (const [k, v] of entries) {
    if (!/^[a-z][a-z0-9_.-]{0,63}$/.test(k)) throw new TypeError('Invalid metric name');
    numeric(v, k);
  }
  return copy(metrics);
}
function distance(metrics, goals) {
  let sum = 0, weights = 0;
  for (const g of goals) {
    if (!(g.metric in metrics) || !['maximize', 'minimize', 'target'].includes(g.direction))
      throw new TypeError('Invalid goal metric or direction');
    const x = metrics[g.metric];
    const delta = g.direction === 'maximize' ? Math.max(0, g.target - x)
      : g.direction === 'minimize' ? Math.max(0, x - g.target) : Math.abs(x - g.target);
    sum += g.weight * delta / Math.max(1, Math.abs(g.target));
    weights += g.weight;
  }
  return sum / weights;
}
function satisfies(metrics, rule) {
  const x = metrics[rule.metric];
  if (x === undefined) return false;
  return rule.op === 'lte' ? x <= rule.limit : rule.op === 'gte' ? x >= rule.limit
    : rule.op === 'eq' ? x === rule.limit : false;
}
const validId = v => typeof v === 'string' && /^[a-z][a-z0-9-]{0,63}$/.test(v);
export class AdaptiveGoalLoop {
  constructor({ state = null, bus = null } = {}) {
    this.state = state;
    this.bus = bus;
    this.feedback = Array.isArray(state?.get?.(KEY, [])) ? state.get(KEY, []) : [];
  }
  propose({ metrics, goals, constraints = [], actions } = {}) {
    const before = validateMetrics(metrics);
    if (!Array.isArray(goals) || !goals.length || goals.length > 16
      || !Array.isArray(constraints) || constraints.length > 32
      || !Array.isArray(actions) || !actions.length || actions.length > 32)
      throw new RangeError('Use 1-16 goals, 0-32 constraints, and 1-32 candidate actions');
    for (const g of goals) {
      if (!g || !Object.hasOwn(before, g.metric)) throw new TypeError('Unknown goal metric');
      numeric(g.target, 'goal target'); numeric(g.weight, 'goal weight');
      if (g.weight <= 0) throw new RangeError('Goal weight must be positive');
    }
    for (const rule of constraints) {
      if (!rule || !Object.hasOwn(before, rule.metric) || !['lte','gte','eq'].includes(rule.op))
        throw new TypeError('Unknown constraint metric/operator');
      numeric(rule.limit, 'constraint limit');
    }
    const prior = distance(before, goals);
    const proposals = actions.map(action => {
      if (!action || !validId(action.id) || !action.effects
          || typeof action.effects !== 'object' || Array.isArray(action.effects))
        throw new TypeError('Action needs a valid id and declared numeric effects');
      const cost = numeric(action.cost ?? 0, 'cost');
      const risk = numeric(action.risk ?? 0, 'risk');
      if (cost < 0 || risk < 0 || cost > 100 || risk > 100) throw new RangeError('Action cost/risk out of range');
      const projected = { ...before };
      for (const [key, change] of Object.entries(action.effects)) {
        if (!Object.hasOwn(before, key)) throw new TypeError('Unknown action-effect metric');
        projected[key] = numeric(before[key] + numeric(change, 'effect'), 'projected metric');
      }
      const violations = constraints.filter(rule => !satisfies(projected, rule))
        .map(rule => ({ metric: rule.metric, op: rule.op, limit: rule.limit }));
      const improvement = prior - distance(projected, goals);
      const historical = this.feedback.filter(x => x.actionId === action.id);
      const bonus = historical.length
        ? historical.reduce((sum, x) => sum + x.improvement, 0) / historical.length : 0;
      return { id: action.id, eligible: violations.length === 0, violations,
        predictedImprovement: improvement,
        score: improvement + 0.1 * bonus - 0.005 * cost - 0.01 * risk
          + (action.reversible === true ? 0.005 : 0),
        projectedMetrics: projected };
    }).sort((a,b) => b.score - a.score || a.id.localeCompare(b.id));
    const chosen = proposals.find(x => x.eligible && x.predictedImprovement > 0) ?? null;
    const result = { phase: 'proposal', executed: false, metrics: before,
      distanceBefore: prior, constraintsSatisfied: constraints.every(rule => satisfies(before, rule)),
      selected: chosen, candidates: proposals,
      caution: 'Predicted effects are caller-provided estimates, not observations. No action was executed.' };
    this.bus?.emit('adaptive:proposal', { selected: chosen?.id ?? null, executed: false });
    return copy(result);
  }
  async recordFeedback({ actionId, improvement, ownerApproved = false } = {}) {
    if (!ownerApproved) throw new Error('Authenticated owner approval is required for feedback');
    if (!validId(actionId)) throw new TypeError('Invalid action identifier');
    numeric(improvement, 'actual improvement');
    const receipt = { actionId, improvement, at: new Date().toISOString(),
      source: 'explicit-owner-feedback' };
    this.feedback = [...this.feedback, receipt].slice(-128);
    if (this.state) await this.state.set(KEY, this.feedback, { source: 'adaptive-goal-loop' });
    this.bus?.emit('adaptive:feedback', { actionId, improvement });
    return copy(receipt);
  }
  status() {
    return { mode: 'proposal-only', automaticExecution: false, feedbackExamples: this.feedback.length };
  }
}
export default AdaptiveGoalLoop;
