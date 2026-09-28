import { deterministicId, safe } from '../util.mjs';

export const SYNTHIA_ROLES = Object.freeze({
  'relational-organism': Object.freeze({
    id: 'relational-organism',
    identity: 'Synthia',
    purpose: 'cultivation',
    packages: Object.freeze(['Pure-Synthia-Trainable-Assembly-v0.4.2', 'Pure-Synthia-v0.4.0-FINISHED-BASELINE']),
    localMesh: 'organism',
    capabilities: Object.freeze(['chat', 'feel', 'relate', 'physiology', 'remember']),
  }),
  'execution-organ': Object.freeze({
    id: 'execution-organ',
    identity: 'Synthia',
    purpose: 'cultivation',
    packages: Object.freeze(['Synthia-Universal-Execution-Spine-v0.4.0', 'Synthia-Codex-Provider-Runtime-v0.1.1']),
    localMesh: 'execution',
    capabilities: Object.freeze(['execute', 'reconstruct', 'run-registered-app', 'bridge-runtime']),
  }),
  'cultivation-learning': Object.freeze({
    id: 'cultivation-learning',
    identity: 'Synthia',
    purpose: 'cultivation',
    packages: Object.freeze(['synthia-core-v1.0.0', 'Pure-Synthia-Trainable-Assembly-v0.4.2']),
    localMesh: 'learning',
    capabilities: Object.freeze(['water', 'admit', 'contact', 'ingest', 'train', 'self-cultivate']),
  }),
  'state-space-browser': Object.freeze({
    id: 'state-space-browser',
    identity: 'Synthia',
    purpose: 'cultivation',
    packages: Object.freeze(['Kimi_Agent_Automata State Space Merge(1)']),
    localMesh: 'nine-centers',
    capabilities: Object.freeze(['browse-state-space', 'five-levels', 'nine-centers', 'predict', 'chart', 'living-loop']),
  }),
});

const ALIASES = Object.freeze({
  organism: 'relational-organism',
  relational: 'relational-organism',
  chat: 'relational-organism',
  execution: 'execution-organ',
  executor: 'execution-organ',
  compute: 'execution-organ',
  cultivation: 'cultivation-learning',
  learning: 'cultivation-learning',
  training: 'cultivation-learning',
  sovereign: 'state-space-browser',
  browser: 'state-space-browser',
  'state-space': 'state-space-browser',
});

function normalizeExplicit(value) {
  const candidate = String(value ?? '').toLowerCase();
  return SYNTHIA_ROLES[candidate]?.id ?? ALIASES[candidate] ?? null;
}

function surface(task) {
  if (typeof task === 'string') return task.toLowerCase();
  try { return JSON.stringify(task ?? {}).toLowerCase(); }
  catch { return String(task ?? '').toLowerCase(); }
}

/**
 * Selects which package-role should lead a task without splitting Synthia's
 * identity. Every role has cultivation as its purpose; the resolver changes
 * foreground configuration while shared state, centers, and memory continue.
 */
export class SynthiaRoleResolver {
  constructor() {
    this.history = [];
    this.activeByPerson = new Map();
  }

  forms() {
    return Object.freeze(Object.values(SYNTHIA_ROLES));
  }

  inferIntent(task, context = {}) {
    return this.resolve(task, context);
  }

  resolve(task, context = {}) {
    const text = surface(task);
    const operation = String(task?.operation ?? context.operation ?? '').toLowerCase();
    const explicit = normalizeExplicit(
      context.synthiaRole ?? context.synthiaForm ?? context.role ?? task?.synthiaRole ?? task?.synthiaForm,
    );
    const matches = new Set();
    if (task?.appId || task?.registeredApp || task?.bytes instanceof Uint8Array
      || /(^|\W)(execute|execution|run app|gamegan|runtime|artifact|file)(\W|$)/.test(`${operation} ${text}`)) {
      matches.add('execution-organ');
    }
    if (/^(water|admit|contact|ingest-book|training|training-snapshot)$/.test(operation)
      || /(^|\W)(water|watering|admit|ingest book|training journal|self cultivate)(\W|$)/.test(text)) {
      matches.add('cultivation-learning');
    }
    if (/^(browse|chart|predict|lattice|grid|reading-path|tick|living-state|five-levels|knowledge-search|module|tool|media)$/.test(operation)
      || /(^|\W)(state space|state-space|five levels|five-level|nine centers|chart|predict|gate|hexagram|living loop|sovereign)(\W|$)/.test(text)) {
      matches.add('state-space-browser');
    }
    if (typeof task === 'string' || /(^|\W)(chat|talk|say|communicate|conversation|feel)(\W|$)/.test(text)) {
      matches.add('relational-organism');
    }

    let primary = explicit;
    if (!primary) {
      if (matches.has('execution-organ')) primary = 'execution-organ';
      else if (matches.has('cultivation-learning')) primary = 'cultivation-learning';
      else if (matches.has('state-space-browser')) primary = 'state-space-browser';
      else primary = 'relational-organism';
    }

    // These are continuous organs, not discarded personas. The relational
    // body feels every task, the five-level state space locates it, and the
    // cultivation learner retains the outcome. Execution joins when needed.
    const contributors = new Set(['relational-organism', 'state-space-browser', 'cultivation-learning', ...matches]);
    contributors.delete(primary);
    const personId = context.personId ?? 'default-person';
    const record = Object.freeze({
      id: deterministicId('synthia-role', { task: safe(task), primary, personId }, this.history.length + 1),
      sequence: this.history.length + 1,
      personId,
      identity: 'Synthia',
      purpose: 'cultivation',
      primary,
      primaryRole: SYNTHIA_ROLES[primary],
      contributors: Object.freeze([...contributors]),
      contributorRoles: Object.freeze([...contributors].map((id) => SYNTHIA_ROLES[id])),
      explicit: Boolean(explicit),
      reason: explicit
        ? `explicit role request: ${primary}`
        : matches.size > 1
          ? `compound task matched ${[...matches].join(', ')}; ${primary} leads`
          : `surface features select ${primary}`,
    });
    this.history.push(record);
    this.activeByPerson.set(personId, record);
    return record;
  }

  activeFor(personId = 'default-person') {
    return this.activeByPerson.get(personId) ?? null;
  }

  snapshot() {
    return Object.freeze({
      identity: 'Synthia',
      purpose: 'cultivation',
      roles: this.forms(),
      selections: this.history.length,
      active: safe(Object.fromEntries(this.activeByPerson)),
    });
  }
}

export const SynthiaFormResolver = SynthiaRoleResolver;
export default SynthiaRoleResolver;
