import { createHash } from 'node:crypto';

const copy = value => value === undefined ? undefined : structuredClone(value);
const upstream = ['intention', 'conversation', 'klein', 'eventAddress', 'knownRouting'];
const routeKinds = new Set(['support', 'adjacent', 'parallel', 'decomposed', 'delegated', 'complementary']);
const keyFor = (personId, taskId) => `taskFit.science.${encodeURIComponent(personId)}.${encodeURIComponent(taskId)}`;
const identifier = value => typeof value === 'string' && value.trim() ? value.trim() : null;
const evidenceIds = value => Array.isArray(value) ? value.filter(identifier) : [];

export class TaskFitCapabilityService {
  constructor({ state, bus = null, clock = () => Date.now() } = {}) {
    if (!state?.get || !state?.set) throw new TypeError('TaskFit needs a state store');
    this.state = state;
    this.bus = bus;
    this.clock = clock;
  }

  async assess({ task = {}, person = {}, resolution = {}, evidence = [], context = {}, hypothesis = null } = {}) {
    const taskId = identifier(task.id);
    const personId = identifier(person.id);
    if (!taskId || !personId) throw new TypeError('TaskFit needs task.id and person.id');

    const resolved = upstream.find(stage => resolution[stage] === 'resolved');
    if (resolved) return { status: 'already-resolved', resolvedBy: resolved, taskId, personId };
    const pending = upstream.filter(stage => resolution[stage] !== 'unresolved');
    if (pending.length) return { status: 'awaiting-upstream-resolution', pending, taskId, personId };

    const ids = new Set(evidence.map(item => identifier(item?.id)).filter(Boolean));
    const substantiated = item => evidenceIds(item?.evidenceIds).some(id => ids.has(id));
    const capabilities = new Set((person.capabilities ?? [])
      .filter(item => identifier(item?.id) && substantiated(item))
      .map(item => item.id));
    const constraints = (person.constraints ?? []).filter(item =>
      identifier(item?.actionId) && identifier(item?.reason) && substantiated(item)
    );
    const routes = (context.routes ?? []).filter(item =>
      routeKinds.has(item?.kind) && item?.available === true
      && identifier(item?.description) && substantiated(item)
      && (item.requiresCapabilities ?? []).every(id => capabilities.has(id))
    );
    const actions = (task.actions ?? []).filter(item => identifier(item?.id));
    if (!actions.length) return {
      status: 'needs-task-actions', taskId, personId,
      openQuestions: ['Describe the concrete actions required by this task.'],
    };

    const findings = actions.map(action => {
      const required = (action.requiresCapabilities ?? []).filter(identifier);
      const missing = required.filter(id => !capabilities.has(id));
      const observedConstraints = constraints.filter(item => item.actionId === action.id);
      const alternatives = routes.filter(route =>
        (route.actionIds ?? []).includes(action.id)
      ).map(route => ({
        kind: route.kind, description: route.description,
        evidenceIds: evidenceIds(route.evidenceIds).filter(id => ids.has(id)),
      }));
      const canNow = missing.length === 0 && observedConstraints.length === 0;
      const canWith = !canNow && alternatives.length > 0;
      return {
        actionId: action.id, canNow, canWith, status: canNow ? 'can-now' :
          canWith ? 'can-with-route' : observedConstraints.length ? 'cannot-now-with-current-conditions' : 'unknown',
        why: [
          ...required.filter(id => capabilities.has(id)).map(id => `Observed capability: ${id}`),
          ...observedConstraints.map(item => item.reason),
        ],
        evidenceIds: [
          ...new Set([
            ...(person.capabilities ?? []).filter(item => required.includes(item?.id) && substantiated(item))
              .flatMap(item => evidenceIds(item.evidenceIds).filter(id => ids.has(id))),
            ...observedConstraints.flatMap(item => evidenceIds(item.evidenceIds).filter(id => ids.has(id))),
          ]),
        ],
        openQuestions: missing.map(id => `What observed evidence establishes capability ${id}?`),
        alternatives,
      };
    });

    const recordKey = keyFor(personId, taskId);
    const log = this.state.get(recordKey, { hypotheses: [], observations: [] });
    let frozenHypothesis = null;
    if (hypothesis) {
      if (!identifier(hypothesis.statement)) throw new TypeError('hypothesis.statement is required');
      const snapshot = {
        statement: hypothesis.statement,
        chartPerspectives: copy(hypothesis.chartPerspectives ?? {}),
        derivedData: copy(hypothesis.derivedData ?? {}),
        context: copy(context.hypothesisContext ?? {}),
      };
      const id = createHash('sha256').update(JSON.stringify(snapshot)).digest('hex');
      frozenHypothesis = { id, ...snapshot };
      if (!log.hypotheses.some(item => item.id === id)) {
        log.hypotheses.push(copy(frozenHypothesis));
        await this.state.set(recordKey, log, { source: 'task-fit-hypothesis' });
      }
    }

    const result = {
      status: 'assessed', taskId, personId,
      workableQualities: copy(person.workableQualities ?? []),
      findings, frozenHypothesis,
      recommendation: findings.filter(item => item.canNow || item.canWith)
        .map(item => ({
          actionId: item.actionId,
          path: item.canNow ? 'direct' : item.alternatives[0].kind,
          description: item.canNow ? 'Use the observed direct capability.' : item.alternatives[0].description,
        })),
      scienceLog: { hypothesisCount: log.hypotheses.length, observationCount: log.observations.length },
      principle: 'Continuing the attempt remains progress; a blocked action is not a failed person.',
    };
    this.bus?.emit('task-fit:assessed', copy(result));
    return result;
  }

  async recordObservation({ personId, taskId, hypothesisId, observation, evidenceIds: cited = [] } = {}) {
    if (![personId, taskId, hypothesisId, observation].every(identifier)) {
      throw new TypeError('TaskFit observation needs personId, taskId, hypothesisId, and observation');
    }
    const key = keyFor(personId, taskId);
    const log = this.state.get(key, { hypotheses: [], observations: [] });
    if (!log.hypotheses.some(item => item.id === hypothesisId)) throw new Error('unknown frozen hypothesis');
    const entry = {
      hypothesisId, observation, evidenceIds: evidenceIds(cited),
      at: new Date(this.clock()).toISOString(),
    };
    log.observations.push(copy(entry));
    await this.state.set(key, log, { source: 'task-fit-observation' });
    this.bus?.emit('task-fit:observed', copy(entry));
    return { entry, log: copy(log) };
  }

  scienceLog(personId, taskId) {
    return copy(this.state.get(keyFor(personId, taskId), { hypotheses: [], observations: [] }));
  }
}

export default TaskFitCapabilityService;
