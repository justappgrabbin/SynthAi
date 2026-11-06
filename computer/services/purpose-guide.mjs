const clone = value => value === undefined ? undefined : structuredClone(value);
const uniq = values => [...new Set((values ?? []).filter(Boolean).map(String))];
const safeId = value => String(value).replace(/[^A-Za-z0-9_-]/g, '_');

function normalizeList(value) {
  if (Array.isArray(value)) return value.filter(v => v !== null && v !== undefined).map(v => String(v));
  if (value === null || value === undefined || value === '') return [];
  return [String(value)];
}

/**
 * Pathways-to-Purpose runtime adapter.
 *
 * Donor provenance preserved rather than copied wholesale:
 * - Cynthia-Insight-v2: explicit route/next-step coaching surface.
 * - cynthia_wisdom: persistent journal/memory + Mind/Heart/Body context pattern.
 * - SynthUniverse: Computer-hosted coaching service boundary.
 *
 * This service stays deterministic and host-backed. It does not fabricate a Human Design
 * profile, resonance state, opportunity, project, resource, or outcome. Those are accepted
 * only from real caller/runtime state and are persisted with the resulting roadmap.
 */
export class PurposeGuideService {
  constructor({
    bus = null,
    state,
    projects = null,
    listCapabilities = () => [],
    emitEvent = null,
    clock = () => Date.now(),
  } = {}) {
    if (!state?.get || !state?.set) throw new TypeError('PurposeGuideService requires a StateStore-like state service');
    Object.assign(this, { bus, state, projects, listCapabilities, emitEvent, clock });
  }

  _base(userId) { return `purpose.users.${safeId(userId)}`; }

  async buildRoadmap({
    userId,
    goal,
    currentState = {},
    profile = {},
    preferences = {},
    horizonWeeks = 6,
  } = {}) {
    const id = String(userId ?? '').trim();
    const target = String(goal ?? '').trim();
    if (!id) throw new Error('purpose roadmap requires userId');
    if (!target) throw new Error('purpose roadmap requires goal');

    const weeks = Number.isFinite(Number(horizonWeeks)) ? Math.max(1, Math.min(52, Number(horizonWeeks))) : 6;
    const allProjects = this.projects?.list?.() ?? [];
    const requestedProjectId = currentState.projectId ? String(currentState.projectId) : null;
    const focusProject = requestedProjectId
      ? allProjects.find(p => p.id === requestedProjectId) ?? null
      : allProjects[0] ?? null;

    const capabilities = (this.listCapabilities?.() ?? []).map(item => typeof item === 'string' ? item : item?.id).filter(Boolean);
    const requiredCapabilities = uniq(currentState.requiredCapabilities);
    const availableRequired = requiredCapabilities.filter(id => capabilities.includes(id));
    const missingRequired = requiredCapabilities.filter(id => !capabilities.includes(id));

    const strengths = normalizeList(currentState.strengths);
    const needs = normalizeList(currentState.needs);
    const resources = normalizeList(currentState.resources);
    const constraints = normalizeList(currentState.constraints);
    const opportunities = Array.isArray(currentState.opportunities) ? clone(currentState.opportunities) : [];

    const decisionContext = {
      strategy: profile.strategy ?? null,
      authority: profile.authority ?? null,
      type: profile.type ?? null,
      profile: profile.profile ?? null,
      fieldState: clone(currentState.fieldState ?? null),
      resonance: clone(currentState.resonance ?? null),
    };

    const phases = [
      {
        index: 1,
        name: 'Discover',
        objective: 'Turn the user-defined goal into an observable target without replacing it.',
        actions: [
          `Define the observable result for: ${target}`,
          ...(strengths.length ? [`Use stated strengths: ${strengths.join(', ')}`] : []),
          ...(constraints.length ? [`Keep stated constraints visible: ${constraints.join(', ')}`] : []),
        ],
      },
      {
        index: 2,
        name: 'Map',
        objective: 'Map the person, environment, needs, projects and available Computer capabilities.',
        actions: [
          ...(decisionContext.strategy || decisionContext.authority
            ? [`Respect supplied decision context${decisionContext.strategy ? `, strategy=${decisionContext.strategy}` : ''}${decisionContext.authority ? `, authority=${decisionContext.authority}` : ''}.`]
            : ['Use the user-defined decision process; no profile data was supplied.']),
          ...(focusProject ? [`Use current project node ${focusProject.id} (${focusProject.name}) as the working container.`] : [`Create a project node for: ${target}`]),
          ...(needs.length ? [`Track stated needs: ${needs.join(', ')}`] : []),
        ],
      },
      {
        index: 3,
        name: 'Prepare',
        objective: 'Assemble the capabilities and relationships needed before activation.',
        actions: [
          ...(availableRequired.length ? [`Route available host capabilities: ${availableRequired.join(', ')}`] : []),
          ...(missingRequired.length ? [`Route missing capabilities through the network: ${missingRequired.join(', ')}`] : []),
          ...(resources.length ? [`Use declared resources: ${resources.join(', ')}`] : []),
          ...(!requiredCapabilities.length ? ['Identify required capabilities from the next concrete project action.'] : []),
        ],
      },
      {
        index: 4,
        name: 'Activate',
        objective: 'Perform real work and capture receipts instead of treating advice as completion.',
        actions: [
          opportunities.length
            ? `Choose from ${opportunities.length} supplied opportunity candidate${opportunities.length === 1 ? '' : 's'} using current resonance/context.`
            : 'Execute the next project action and record the result as a real-world outcome.',
          'Persist the action, actor, provider, observable effect and trajectory.',
        ],
      },
      {
        index: 5,
        name: 'Optimize',
        objective: 'Use outcome feedback, interference and resonance changes to adapt the route.',
        actions: [
          'Compare the observed result with the intended result.',
          'Treat friction/transition as state information and update the next action rather than rewriting the user goal.',
        ],
      },
      {
        index: 6,
        name: 'Sustain',
        objective: 'Continue, scale, hand off or exit from evidence rather than inertia.',
        actions: [
          `Review the ${weeks}-week route using persisted outcomes and project state.`,
          'Export or continue the route with the user retaining control of projects, data and decisions.',
        ],
      },
    ];

    const roadmapId = `roadmap-${this.clock()}-${Math.random().toString(36).slice(2, 8)}`;
    const roadmap = {
      id: roadmapId,
      userId: id,
      goal: target,
      horizonWeeks: weeks,
      createdAt: this.clock(),
      status: 'active',
      focusProject: focusProject ? { id: focusProject.id, name: focusProject.name, status: focusProject.status } : null,
      currentState: clone(currentState),
      profile: clone(profile),
      preferences: clone(preferences),
      decisionContext,
      capabilityContext: {
        required: requiredCapabilities,
        available: availableRequired,
        missing: missingRequired,
        hostCapabilityCount: capabilities.length,
      },
      opportunities,
      phases,
      outcomes: [],
    };

    await this.state.set(`${this._base(id)}.roadmaps.${roadmapId}`, roadmap, { source: 'purpose-guide' });
    await this.state.set(`${this._base(id)}.currentRoadmapId`, roadmapId, { source: 'purpose-guide' });
    this.bus?.emit('purpose:roadmap-created', clone(roadmap));

    if (typeof this.emitEvent === 'function') {
      await this.emitEvent({
        actor_id: id,
        actor_type: 'user',
        event_type: 'project_action',
        input: { goal: target, roadmapId },
        context: { source: 'purpose-guide', decisionContext: clone(decisionContext) },
        result: { phases: phases.map(p => p.name), focusProject: roadmap.focusProject },
        result_status: 'success',
        post_state: { currentRoadmapId: roadmapId, status: 'active' },
        observable_effect: 'Pathways-to-Purpose roadmap persisted from live user/runtime context',
        evidence: { kind: 'runtime_service', ref: 'computer/services/purpose-guide.mjs' },
      });
    }

    return clone(roadmap);
  }

  getRoadmap(userId, roadmapId = null) {
    const id = String(userId ?? '').trim();
    if (!id) return null;
    const chosen = roadmapId ?? this.state.get(`${this._base(id)}.currentRoadmapId`, null);
    return chosen ? clone(this.state.get(`${this._base(id)}.roadmaps.${chosen}`, null)) : null;
  }

  async recordOutcome({ userId, roadmapId = null, outcome } = {}) {
    const id = String(userId ?? '').trim();
    if (!id) throw new Error('purpose outcome requires userId');
    if (!outcome || typeof outcome !== 'object') throw new Error('purpose outcome requires an outcome object');
    const roadmap = this.getRoadmap(id, roadmapId);
    if (!roadmap) throw new Error('purpose outcome requires an existing roadmap');

    const record = {
      id: outcome.id ?? `outcome-${this.clock()}-${Math.random().toString(36).slice(2, 8)}`,
      at: outcome.at ?? this.clock(),
      action: outcome.action ?? null,
      result: clone(outcome.result ?? null),
      observableEffect: outcome.observableEffect ?? null,
      resonance: clone(outcome.resonance ?? null),
      interference: clone(outcome.interference ?? null),
      evidence: clone(outcome.evidence ?? null),
    };
    roadmap.outcomes = [...(roadmap.outcomes ?? []), record];
    roadmap.updatedAt = this.clock();
    roadmap.lastOutcomeId = record.id;
    await this.state.set(`${this._base(id)}.roadmaps.${roadmap.id}`, roadmap, { source: 'purpose-guide' });
    this.bus?.emit('purpose:outcome-recorded', { userId: id, roadmapId: roadmap.id, outcome: clone(record) });

    if (typeof this.emitEvent === 'function') {
      await this.emitEvent({
        actor_id: id,
        actor_type: 'user',
        event_type: 'observation',
        input: { roadmapId: roadmap.id, action: record.action },
        context: { source: 'purpose-guide' },
        result: clone(record.result),
        result_status: 'success',
        post_state: { roadmapId: roadmap.id, lastOutcomeId: record.id, outcomeCount: roadmap.outcomes.length },
        observable_effect: record.observableEffect,
        evidence: record.evidence,
      });
    }
    return clone(record);
  }
}

export default PurposeGuideService;
