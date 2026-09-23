const clone = value => value === undefined ? undefined : structuredClone(value);

const normalizeText = value => String(value ?? '').trim();
const lower = value => normalizeText(value).toLowerCase();

function unique(values = []) {
  return [...new Set(values.filter(Boolean).map(String))];
}

function uiText(observation = {}) {
  const parts = [];
  for (const node of observation.ui ?? []) {
    for (const key of ['text', 'label', 'contentDescription', 'hint', 'role']) {
      if (node?.[key]) parts.push(String(node[key]));
    }
  }
  return parts.join(' ').toLowerCase();
}

function genericEntities(observation = {}) {
  return (observation.ui ?? []).map((node, index) => ({
    id: node.id ?? `ui:${index}`,
    kind: node.role ?? node.className ?? 'interface-object',
    label: node.text ?? node.label ?? node.contentDescription ?? null,
    enabled: node.enabled !== false,
    clickable: Boolean(node.clickable),
    editable: Boolean(node.editable),
    sourceNodeId: node.id ?? null,
  }));
}

export class ExperienceCompiler {
  constructor({ adapters = [] } = {}) {
    this.adapters = [];
    for (const adapter of adapters) this.register(adapter);
  }

  register(adapter = {}) {
    if (!adapter.id || typeof adapter.compile !== 'function') {
      throw new Error('experience adapter requires id and compile(observation, helpers)');
    }
    this.adapters = this.adapters.filter(item => item.id !== adapter.id);
    this.adapters.push(adapter);
    return adapter;
  }

  adapterFor(observation = {}) {
    return this.adapters.find(adapter => {
      if (typeof adapter.matches === 'function' && adapter.matches(observation)) return true;
      const packages = adapter.packages ?? [];
      if (observation.packageName && packages.includes(observation.packageName)) return true;
      const labels = adapter.labels ?? [];
      return labels.some(label => lower(label) === lower(observation.appLabel));
    }) ?? null;
  }

  compile(observation = {}, context = {}) {
    if (!observation.packageName && !observation.appLabel) {
      throw new Error('application observation requires packageName or appLabel');
    }

    const normalized = {
      packageName: observation.packageName ?? null,
      appLabel: observation.appLabel ?? observation.packageName ?? 'Unknown app',
      activity: observation.activity ?? null,
      screenType: observation.screenType ?? null,
      eventType: observation.eventType ?? 'application_observation',
      observedAt: observation.observedAt ?? Date.now(),
      source: observation.source ?? 'unknown',
      ui: clone(observation.ui ?? []),
      metadata: clone(observation.metadata ?? {}),
    };

    const adapter = this.adapterFor(normalized);
    const helpers = {
      clone,
      lower,
      uiText: () => uiText(normalized),
      genericEntities: () => genericEntities(normalized),
      unique,
    };
    const adapted = adapter?.compile(normalized, helpers, context) ?? {};

    const environment = adapted.environment ?? {
      type: 'application_place',
      name: normalized.appLabel,
      district: 'applications',
    };

    return {
      id: adapted.id ?? `experience:${normalized.packageName ?? lower(normalized.appLabel).replace(/[^a-z0-9]+/g, '-')}`,
      adapterId: adapter?.id ?? 'generic',
      application: {
        packageName: normalized.packageName,
        label: normalized.appLabel,
        activity: normalized.activity,
      },
      observation: {
        eventType: normalized.eventType,
        observedAt: normalized.observedAt,
        source: normalized.source,
        screenType: normalized.screenType,
      },
      environment: clone(environment),
      scene: clone(adapted.scene ?? { type: 'room', state: normalized.screenType ?? 'unknown' }),
      entities: clone(adapted.entities ?? helpers.genericEntities()),
      affordances: unique(adapted.affordances ?? []),
      transitions: clone(adapted.transitions ?? []),
      evidence: {
        packageName: normalized.packageName,
        activity: normalized.activity,
        source: normalized.source,
        observedUiNodes: normalized.ui.length,
      },
      metadata: clone(adapted.metadata ?? {}),
    };
  }
}

export default ExperienceCompiler;
